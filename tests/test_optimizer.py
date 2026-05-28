import pytest
from app.models import CargoItem, ContainerULD
from app.optimizer import pack_cargo, calculate_cog, overlaps, is_supported

def test_overlaps_check():
    # Overlapping boxes
    assert overlaps(0, 0, 0, 10, 10, 10, 5, 5, 5, 10, 10, 10) is True
    # Non-overlapping adjacent boxes
    assert overlaps(0, 0, 0, 10, 10, 10, 10, 0, 0, 10, 10, 10) is False
    assert overlaps(0, 0, 0, 10, 10, 10, 0, 10, 0, 10, 10, 10) is False
    assert overlaps(0, 0, 0, 10, 10, 10, 0, 0, 10, 10, 10, 10) is False


def test_basic_packing_within_boundaries():
    container = ContainerULD(
        id="test-uld",
        max_weight_capacity=1000.0,
        length=100.0,
        width=100.0,
        height=100.0,
        max_cog_deviation_pct=15.0
    )
    items = [
        CargoItem(id="box1", weight=100, length=50, width=100, height=50, value=1000, is_fragile=False),
        CargoItem(id="box2", weight=100, length=50, width=100, height=50, value=1000, is_fragile=False)

    ]
    
    result = pack_cargo(container, items)
    
    assert len(result.packed_items) == 2
    assert result.total_weight == 200.0
    assert result.total_value == 2000.0
    assert result.volume_utilization_pct == 50.0  # (50*100*50 * 2) / (100*100*100) * 100

    assert result.weight_utilization_pct == 20.0
    assert result.center_of_gravity.is_safe is True


def test_packing_exceeding_weight_capacity():
    container = ContainerULD(
        id="test-uld",
        max_weight_capacity=150.0,
        length=100.0,
        width=100.0,
        height=100.0,
        max_cog_deviation_pct=15.0
    )
    items = [
        CargoItem(id="heavy1", weight=100.0, length=30, width=30, height=30, value=1000, is_fragile=False),
        CargoItem(id="heavy2", weight=100.0, length=30, width=30, height=30, value=1000, is_fragile=False)
    ]
    
    result = pack_cargo(container, items)
    
    assert len(result.packed_items) == 1
    assert len(result.unpacked_items) == 1
    assert result.unpacked_items[0].reason == "Weight capacity exceeded"


def test_crush_prevention_fragile_stacking():
    container = ContainerULD(
        id="test-uld",
        max_weight_capacity=1000.0,
        length=100.0,
        width=100.0,
        height=100.0,
        max_cog_deviation_pct=15.0
    )
    # box1 is fragile. If we place box2, we cannot place it on top of box1!
    items = [
        CargoItem(id="fragile-box", weight=50.0, length=50, width=50, height=50, value=5000, is_fragile=True),
        CargoItem(id="heavy-box", weight=200.0, length=50, width=50, height=50, value=1000, is_fragile=False)
    ]
    
    result = pack_cargo(container, items)
    
    # Sorting will order heavy-box first (index 0) and fragile-box second (index 1)
    # Heavy box will be placed on floor at (0, 0, 0).
    # Fragile box will be placed at another candidate spot (e.g. (50, 0, 0) or (0, 50, 0) or on top (0, 0, 50)).
    # Since heavy box is not fragile, fragile box CAN be placed on top of it, but heavy box cannot be placed on top of fragile box.
    # Let's verify both are packed successfully since fragile-box sits on top of non-fragile heavy box.
    assert len(result.packed_items) == 2
    
    # Now let's try a case where a fragile item is packed first (due to sorting, but wait, sorting puts non-fragile first!).
    # If we have only fragile items, can we stack on them?
    # Let's test `is_supported` directly to verify crush prevention.
    from app.models import PackedItemInfo
    packed_fragile = [PackedItemInfo(
        id="fragile-1", x=0, y=0, z=0, length=50, width=50, height=50, weight=50, value=100, is_fragile=True
    )]
    
    # Try to support a new box at z=50 directly above the fragile box (0, 0, 50)
    supported, reason = is_supported(0, 0, 50, 50, 50, 50, packed_fragile)
    assert supported is False
    assert "Crush prevention" in reason


def test_center_of_gravity_envelope_rejection():
    # Create a small ULD to amplify weight shifting
    container = ContainerULD(
        id="test-uld",
        max_weight_capacity=2000.0,
        length=100.0,
        width=100.0,
        height=100.0,
        max_cog_deviation_pct=5.0  # Very tight 5% envelope
    )
    
    # A single heavy box placed right at the far corner (e.g. centroid at x=85, y=85)
    # Geometric center is 50, 50. Centroid 85, 85 is (35 / 100) = 35% deviation!
    # This should be flagged as unbalanced if packed.
    items = [
        # This box has to start at (70, 70, 0) to have centroid (85, 85, 15).
        # We can force the optimizer to look at corner by placing a tiny item at (0,0,0) first,
        # but let's test the `calculate_cog` function directly to prove the math.
        CargoItem(id="far-heavy-box", weight=500.0, length=30, width=30, height=30, value=1000, is_fragile=False)
    ]
    
    # Let's test direct CoG calculation
    from app.models import PackedItemInfo
    packed_offset = [PackedItemInfo(
        id="offset-box", x=70, y=70, z=0, length=30, width=30, height=30, weight=500, value=1000, is_fragile=False
    )]
    
    cog_info = calculate_cog(packed_offset, container)
    assert cog_info.cog_x == 85.0  # 70 + 15
    assert cog_info.cog_y == 85.0  # 70 + 15
    assert cog_info.deviation_x_pct == 35.0  # |85 - 50|/100 * 100
    assert cog_info.is_safe is False  # 35% > 5% limit
