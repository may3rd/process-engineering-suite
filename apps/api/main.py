from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from engsuite.hydraulics.src.single_edge import calculate_single_edge
from engsuite.hydraulics.src.propagation import propagate

app = FastAPI(title="Process Engineering Suite API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.post("/hydraulics/edge/{edge_id}")
async def recalc_edge(edge_id: str, payload: dict):
    edge = payload["edge"]
    inlet_p = payload.get("inletPressurePa")          # from upstream node
    inlet_t = payload.get("inletTemperatureC", 25)

    result = calculate_single_edge(edge, inlet_p, inlet_t)

    if not result.valid:
        return {"edge_id": edge_id, "result": None}

    # Propagate instantly
    propagated = propagate(payload["fullState"], edge_id)
    propagated = propagate(payload["fullState"], edge_id)

    return {
        "edge_id": edge_id,
        "result": result.__dict__,
        "propagated": propagated
    }