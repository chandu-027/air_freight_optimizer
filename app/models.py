from pydantic import BaseModel, Field
from typing import List, Optional

class CargoItem(BaseModel):
    id: str = Field(..., description="Unique cargo reference identifier")
    weight: float = Field(..., gt=0, description="Weight of the shipment in kg")
    length: float = Field(..., gt=0, description="Length in cm")
    width: float = Field(..., gt=0, description="Width in cm")
    height: float = Field(..., gt=0, description="Height in cm")
    value: float = Field(..., gt=0, description="Financial priority/declared value in USD")
    is_fragile: bool = Field(default=False, description="Whether the cargo is delicate and should be packed carefully")

class ContainerULD(BaseModel):
    id: str = Field(..., description="Standardized Unit Load Device (ULD) container code")
    max_weight_capacity: float = Field(..., gt=0, description="Maximum allowable payload weight in kg")
    length: float = Field(..., gt=0, description="Container internal length in cm")
    width: float = Field(..., gt=0, description="Container internal width in cm")
    height: float = Field(..., gt=0, description="Container internal height in cm")
    max_cog_deviation_pct: float = Field(default=15.0, ge=0, le=50, description="Maximum allowed Center of Gravity deviation from geometric center (percentage of axis length)")

class PackedItemInfo(BaseModel):
    id: str
    x: float = Field(..., description="Placement coordinate X (length axis) in cm")
    y: float = Field(..., description="Placement coordinate Y (width axis) in cm")
    z: float = Field(..., description="Placement coordinate Z (height axis/vertical stack) in cm")
    length: float
    width: float
    height: float
    weight: float
    value: float
    is_fragile: bool

class UnpackedItemInfo(BaseModel):
    id: str
    weight: float
    value: float
    reason: str

class CenterOfGravityInfo(BaseModel):
    cog_x: float = Field(..., description="Calculated Center of Gravity coordinate along X (length) in cm")
    cog_y: float = Field(..., description="Calculated Center of Gravity coordinate along Y (width) in cm")
    cog_z: float = Field(..., description="Calculated Center of Gravity coordinate along Z (height) in cm")
    center_x: float = Field(..., description="Container geometric center along X in cm")
    center_y: float = Field(..., description="Container geometric center along Y in cm")
    center_z: float = Field(..., description="Container geometric center along Z in cm")
    deviation_x_pct: float = Field(..., description="Deviation percentage from center along X axis")
    deviation_y_pct: float = Field(..., description="Deviation percentage from center along Y axis")
    is_safe: bool = Field(..., description="Whether the Center of Gravity falls inside safety threshold limits")

class OptimizationResult(BaseModel):
    container_id: str
    packed_items: List[PackedItemInfo]
    unpacked_items: List[UnpackedItemInfo]
    total_weight: float
    total_value: float
    volume_utilization_pct: float
    weight_utilization_pct: float
    center_of_gravity: CenterOfGravityInfo
