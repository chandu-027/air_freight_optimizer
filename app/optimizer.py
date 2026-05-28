from typing import List, Tuple
from app.models import CargoItem, ContainerULD, OptimizationResult, PackedItemInfo, UnpackedItemInfo, CenterOfGravityInfo

def calculate_cog(packed_items: List[PackedItemInfo], container: ContainerULD) -> CenterOfGravityInfo:
    """
    Computes the 3D Center of Gravity (CoG) of the packed cargo items
    and determines whether it falls within the safety threshold limits of the ULD.
    """
    center_x = container.length / 2.0
    center_y = container.width / 2.0
    center_z = container.height / 2.0

    if not packed_items:
        return CenterOfGravityInfo(
            cog_x=center_x,
            cog_y=center_y,
            cog_z=0.0,
            center_x=center_x,
            center_y=center_y,
            center_z=center_z,
            deviation_x_pct=0.0,
            deviation_y_pct=0.0,
            is_safe=True
        )

    total_weight = 0.0
    sum_w_x = 0.0
    sum_w_y = 0.0
    sum_w_z = 0.0

    for item in packed_items:
        # Centroid of the individual box
        centroid_x = item.x + (item.length / 2.0)
        centroid_y = item.y + (item.width / 2.0)
        centroid_z = item.z + (item.height / 2.0)

        sum_w_x += item.weight * centroid_x
        sum_w_y += item.weight * centroid_y
        sum_w_z += item.weight * centroid_z
        total_weight += item.weight

    if total_weight == 0.0:
        cog_x, cog_y, cog_z = center_x, center_y, 0.0
    else:
        cog_x = sum_w_x / total_weight
        cog_y = sum_w_y / total_weight
        cog_z = sum_w_z / total_weight

    # Deviation as a percentage of the container dimensions
    dev_x_pct = (abs(cog_x - center_x) / container.length) * 100.0 if container.length > 0 else 0.0
    dev_y_pct = (abs(cog_y - center_y) / container.width) * 100.0 if container.width > 0 else 0.0

    is_safe = (dev_x_pct <= container.max_cog_deviation_pct) and (dev_y_pct <= container.max_cog_deviation_pct)

    return CenterOfGravityInfo(
        cog_x=round(cog_x, 2),
        cog_y=round(cog_y, 2),
        cog_z=round(cog_z, 2),
        center_x=round(center_x, 2),
        center_y=round(center_y, 2),
        center_z=round(center_z, 2),
        deviation_x_pct=round(dev_x_pct, 2),
        deviation_y_pct=round(dev_y_pct, 2),
        is_safe=is_safe
    )


def overlaps(
    x1: float, y1: float, z1: float, l1: float, w1: float, h1: float,
    x2: float, y2: float, z2: float, l2: float, w2: float, h2: float
) -> bool:
    """
    Checks if two 3D boxes overlap.
    """
    return not (
        x1 + l1 <= x2 or x2 + l2 <= x1 or
        y1 + w1 <= y2 or y2 + w2 <= y1 or
        z1 + h1 <= z2 or z2 + h2 <= z1
    )


def is_supported(
    x: float, y: float, z: float, length: float, width: float, height: float,
    packed_items: List[PackedItemInfo]
) -> Tuple[bool, str]:
    """
    Checks if the item is physically stable.
    - Must sit on the floor (z = 0) OR rest on the top surfaces of existing packed boxes.
    - Crucial Aviation Safety Rule: We cannot stack anything on top of a fragile box.
    """
    if z == 0:
        return True, ""

    # Must find supporting packed items directly underneath
    supported_by_solid = False
    underneath_height_epsilon = 0.01  # Small tolerance for floats
    
    for item in packed_items:
        # Check if item's top surface is at z coordinate (approximately)
        if abs((item.z + item.height) - z) <= underneath_height_epsilon:
            # Check for horizontal overlap
            x_overlap = (item.x < x + length) and (item.x + item.length > x)
            y_overlap = (item.y < y + width) and (item.y + item.width > y)
            
            if x_overlap and y_overlap:
                if item.is_fragile:
                    return False, f"Crush prevention: cannot stack on fragile item '{item.id}'"
                supported_by_solid = True

    if not supported_by_solid:
        return False, "Stability failure: item must rest on floor or be supported"
    
    return True, ""


def pack_cargo(container: ContainerULD, items: List[CargoItem]) -> OptimizationResult:
    """
    Executes a 3D Corner-Point packing heuristic with CoG envelope check.
    
    Sorting Heuristic:
    1. Sort by Fragility ASCENDING (pack non-fragile items first so they can support others, fragile items are placed last on top).
    2. Sort by Weight DESCENDING (heavier boxes are placed lower down to ensure low CoG).
    3. Sort by Value Density DESCENDING (maximizing commercial cargo value yield).
    """
    # Sort items based on our optimal packing stability and economic rules
    sorted_items = sorted(
        items,
        key=lambda x: (
            x.is_fragile,                  # Non-fragile first (False < True)
            -x.weight,                     # Heavy first
            -(x.value / (x.length * x.width * x.height))  # Value density descending
        )
    )

    packed: List[PackedItemInfo] = []
    unpacked: List[UnpackedItemInfo] = []

    current_weight = 0.0
    total_value = 0.0

    # List of candidate starting coordinates (x, y, z) for packing
    candidate_points: List[Tuple[float, float, float]] = [(0.0, 0.0, 0.0)]

    for item in sorted_items:
        # 1. Weight capacity check
        if current_weight + item.weight > container.max_weight_capacity:
            unpacked.append(UnpackedItemInfo(
                id=item.id,
                weight=item.weight,
                value=item.value,
                reason="Weight capacity exceeded"
            ))
            continue

        placed = False
        
        # Sort candidate points: pack lowest height Z first, then closest X, then Y
        candidate_points.sort(key=lambda pt: (pt[2], pt[0], pt[1]))

        # Track failure reasons for candidates to pick the most informative one
        failed_reasons = []

        for pt in candidate_points:
            x, y, z = pt

            # A. Boundary check
            if (x + item.length > container.length or
                y + item.width > container.width or
                z + item.height > container.height):
                failed_reasons.append("Boundary limits exceeded")
                continue

            # B. Collision/Overlap check with already packed items
            overlap_detected = False
            for packed_item in packed:
                if overlaps(x, y, z, item.length, item.width, item.height,
                            packed_item.x, packed_item.y, packed_item.z,
                            packed_item.length, packed_item.width, packed_item.height):
                    overlap_detected = True
                    break
            
            if overlap_detected:
                failed_reasons.append("Space collision with another item")
                continue

            # C. Support/Stability check
            supported, support_reason = is_supported(x, y, z, item.length, item.width, item.height, packed)
            if not supported:
                failed_reasons.append(support_reason)
                continue

            # D. Vertical support and physical checking complete
            # If all checks pass, commit placement!
            temp_packed_item = PackedItemInfo(
                id=item.id,
                x=x, y=y, z=z,
                length=item.length,
                width=item.width,
                height=item.height,
                weight=item.weight,
                value=item.value,
                is_fragile=item.is_fragile
            )
            packed.append(temp_packed_item)
            current_weight += item.weight
            total_value += item.value
            placed = True



            # Generate new potential corner points from this box
            # 1. Right corner point
            new_pt1 = (x + item.length, y, z)
            # 2. Front corner point
            new_pt2 = (x, y + item.width, z)
            # 3. Top corner point
            new_pt3 = (x, y, z + item.height)

            for new_pt in [new_pt1, new_pt2, new_pt3]:
                # Ensure they are within ULD borders and not already in candidate points list
                if (new_pt[0] < container.length and 
                    new_pt[1] < container.width and 
                    new_pt[2] < container.height and 
                    new_pt not in candidate_points):
                    candidate_points.append(new_pt)
            
            # Remove the point we just packed onto
            if pt in candidate_points:
                candidate_points.remove(pt)

            break

        if not placed:
            # Pick a representative failure reason or default to spatial constraint
            reason = "No suitable spatial placement (fits boundaries but collides or unsupported)"
            if failed_reasons:
                # Prioritize high importance errors like CoG or Fragile checks
                specialized_reasons = [r for r in failed_reasons if "Crush" in r or "Gravity" in r]
                if specialized_reasons:
                    reason = specialized_reasons[0]
                else:
                    reason = failed_reasons[0]

            unpacked.append(UnpackedItemInfo(
                id=item.id,
                weight=item.weight,
                value=item.value,
                reason=reason
            ))

    # Calculate final volume utilization
    max_volume = container.length * container.width * container.height
    packed_volume = sum(item.length * item.width * item.height for item in packed)
    volume_pct = (packed_volume / max_volume) * 100.0 if max_volume > 0 else 0.0
    
    weight_pct = (current_weight / container.max_weight_capacity) * 100.0 if container.max_weight_capacity > 0 else 0.0

    final_cog = calculate_cog(packed, container)

    return OptimizationResult(
        container_id=container.id,
        packed_items=packed,
        unpacked_items=unpacked,
        total_weight=round(current_weight, 2),
        total_value=round(total_value, 2),
        volume_utilization_pct=round(volume_pct, 2),
        weight_utilization_pct=round(weight_pct, 2),
        center_of_gravity=final_cog
    )
