from fastapi import APIRouter, Depends, Response
from sqlalchemy.orm import Session
from app.db import get_db
from app.models.peptide import PeptideCandidate
from app.services.artifact_service import export_candidates_csv, export_candidates_fasta
from app.config import DISCLAIMER

router = APIRouter(prefix="/reports")


@router.get("/candidates.csv")
def report_csv(db: Session = Depends(get_db)):
    peptides = db.query(PeptideCandidate).all()
    content = export_candidates_csv(peptides)
    return Response(
        content=content,
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=candidates.csv"},
    )


@router.get("/candidates.fasta")
def report_fasta(db: Session = Depends(get_db)):
    peptides = db.query(PeptideCandidate).all()
    content = export_candidates_fasta(peptides)
    return Response(
        content=content,
        media_type="text/plain",
        headers={"Content-Disposition": "attachment; filename=candidates.fasta"},
    )
