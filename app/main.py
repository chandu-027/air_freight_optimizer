import os
from fastapi import FastAPI, HTTPException, status
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from typing import List, Dict

from app.models import CargoItem, ContainerULD, OptimizationResult
from app.optimizer import pack_cargo

app = FastAPI(
    title="Lufthansa Cargo Space & Weight Optimization Service",
    description="Production-ready REST API for 3D cargo bin packing with aviation Center of Gravity constraints.",
    version="1.0.0"
)

# Standard Aviation ULD (Unit Load Device) presets
ULD_PRESETS: Dict[str, Dict] = {
    "LD3": {
        "id": "AKE-LD3-Standard",
        "max_weight_capacity": 1588.0, # kg
        "length": 156.0, # cm
        "width": 153.0, # cm
        "height": 160.0, # cm
        "max_cog_deviation_pct": 15.0
    },
    "LD7": {
        "id": "P1P-LD7-Pallet",
        "max_weight_capacity": 4626.0, # kg
        "length": 318.0, # cm
        "width": 224.0, # cm
        "height": 162.0, # cm
        "max_cog_deviation_pct": 12.0
    },
    "LD11": {
        "id": "PLA-LD11-Pallet",
        "max_weight_capacity": 3175.0, # kg
        "length": 318.0, # cm
        "width": 153.0, # cm
        "height": 162.0, # cm
        "max_cog_deviation_pct": 15.0
    }
}

@app.get("/api/presets", response_model=Dict[str, Dict])
def get_presets():
    """
    Returns pre-configured standard aviation Unit Load Devices (ULDs).
    """
    return ULD_PRESETS

@app.post("/api/optimize", response_model=OptimizationResult)
def run_optimization(container: ContainerULD, items: List[CargoItem]):
    """
    Solves the 3D packing problem for the given container and list of cargo items,
    respecting volume limits, overlaps, vertical stability, fragility stacking rules,
    and the Center of Gravity flight safety limits.
    """
    if not items:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, 
            detail="Cargo item manifest cannot be empty."
        )
    
    try:
        result = pack_cargo(container, items)
        return result
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Optimization algorithm failure: {str(e)}"
        )

# Serve static web dashboard assets
static_dir = os.path.join(os.path.dirname(os.path.abspath(__file__)), "static")

# If the static directory exists, mount it and serve index.html at root
if os.path.exists(static_dir):
    app.mount("/static", StaticFiles(directory=static_dir), name="static")

    @app.get("/")
    def read_root():
        return FileResponse(os.path.join(static_dir, "index.html"))
else:
    @app.get("/")
    def read_root():
        return {
            "message": "Lufthansa Cargo Space & Weight Optimization Service API is active.",
            "documentation": "/docs"
        }
