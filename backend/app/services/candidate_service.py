"""Candidate peptide CRUD helpers."""
from typing import Optional
from sqlalchemy.orm import Session
from app.models.peptide import PeptideCandidate
from app.schemas.peptide import PeptideCandidateCreate, PeptideCandidateUpdate


def list_peptides(db: Session, skip: int = 0, limit: int = 100, status: Optional[str] = None):
    q = db.query(PeptideCandidate)
    if status:
        q = q.filter(PeptideCandidate.status == status)
    return q.order_by(PeptideCandidate.id.desc()).offset(skip).limit(limit).all()


def get_peptide(db: Session, peptide_id: int):
    return db.query(PeptideCandidate).filter(PeptideCandidate.id == peptide_id).first()


def create_peptide(db: Session, data: PeptideCandidateCreate):
    obj = PeptideCandidate(**data.model_dump())
    db.add(obj)
    db.commit()
    db.refresh(obj)
    return obj


def update_peptide(db: Session, peptide_id: int, data: PeptideCandidateUpdate):
    obj = get_peptide(db, peptide_id)
    if not obj:
        return None
    for field, value in data.model_dump(exclude_unset=True).items():
        setattr(obj, field, value)
    db.commit()
    db.refresh(obj)
    return obj


def delete_peptide(db: Session, peptide_id: int):
    obj = get_peptide(db, peptide_id)
    if not obj:
        return False
    db.delete(obj)
    db.commit()
    return True
