from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from pydantic import BaseModel
from app.db import get_db
from app.models.peptide import PeptideCandidate
from app.services.physicochemical import apply_amp_filter
from app.config import DISCLAIMER

router = APIRouter(prefix="/filters")


class PhysicochemicalFilterRequest(BaseModel):
    sequences: list[str]


@router.post("/physicochemical")
def filter_physicochemical(payload: PhysicochemicalFilterRequest, db: Session = Depends(get_db)):
    results = []
    for seq in payload.sequences:
        result = apply_amp_filter(seq)
        results.append({
            "sequence": seq,
            "passed": result["passed"],
            "reasons": result["reasons"],
            "length": result["length"],
            "net_charge": result["net_charge"],
            "hydrophobic_fraction": result["hydrophobic_fraction"],
            "hydrophobicity": result["hydrophobicity"],
            "valid_aa": result["valid_aa"],
        })
    return {
        "results": results,
        "disclaimer": DISCLAIMER,
    }
