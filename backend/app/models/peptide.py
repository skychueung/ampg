from sqlalchemy import Column, Integer, String, Float, DateTime, ForeignKey, Text
from sqlalchemy.sql import func
from app.db import Base


class PeptideCandidate(Base):
    __tablename__ = "peptide_candidates"

    id = Column(Integer, primary_key=True, index=True)
    sequence = Column(String(500), nullable=False)
    length = Column(Integer, nullable=False)
    net_charge = Column(Float, nullable=True)
    hydrophobic_fraction = Column(Float, nullable=True)
    hydrophobicity = Column(Float, nullable=True)
    valid_aa = Column(Integer, nullable=True)
    amp_score = Column(Float, nullable=True)
    mic_ecoli = Column(Float, nullable=True)
    mic_saureus = Column(Float, nullable=True)
    toxicity_risk = Column(Float, nullable=True)
    hemolysis_risk = Column(Float, nullable=True)
    status = Column(String(50), default="GENERATED", nullable=False)
    source = Column(String(200), nullable=True)
    generation_run_id = Column(Integer, ForeignKey("generation_runs.id"), nullable=True)
    notes = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
