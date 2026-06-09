from typing import Optional
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.db import get_db
from app.schemas.peptide import PeptideCandidateOut, PeptideCandidateUpdate
from app.services.candidate_service import (
    list_peptides,
    get_peptide,
    update_peptide,
    delete_peptide,
)
from app.config import DISCLAIMER

router = APIRouter(prefix="/peptides")


@router.get("", response_model=list[PeptideCandidateOut])
def read_peptides(
    status: Optional[str] = None,
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db),
):
    return list_peptides(db, skip=skip, limit=limit, status=status)


@router.get("/{peptide_id}", response_model=PeptideCandidateOut)
def read_peptide(peptide_id: int, db: Session = Depends(get_db)):
    obj = get_peptide(db, peptide_id)
    if not obj:
        raise HTTPException(status_code=404, detail="Peptide not found")
    return obj


@router.patch("/{peptide_id}", response_model=PeptideCandidateOut)
def patch_peptide(peptide_id: int, payload: PeptideCandidateUpdate, db: Session = Depends(get_db)):
    obj = update_peptide(db, peptide_id, payload)
    if not obj:
        raise HTTPException(status_code=404, detail="Peptide not found")
    return obj


@router.delete("/{peptide_id}")
def remove_peptide(peptide_id: int, db: Session = Depends(get_db)):
    ok = delete_peptide(db, peptide_id)
    if not ok:
        raise HTTPException(status_code=404, detail="Peptide not found")
    return {"ok": True, "disclaimer": DISCLAIMER}
