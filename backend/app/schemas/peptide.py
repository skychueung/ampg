from datetime import datetime
from typing import Optional
from pydantic import BaseModel, ConfigDict


class PeptideCandidateBase(BaseModel):
    sequence: str
    length: int
    net_charge: Optional[float] = None
    hydrophobic_fraction: Optional[float] = None
    hydrophobicity: Optional[float] = None
    valid_aa: Optional[int] = None
    amp_score: Optional[float] = None
    mic_ecoli: Optional[float] = None
    mic_saureus: Optional[float] = None
    toxicity_risk: Optional[float] = None
    hemolysis_risk: Optional[float] = None
    status: str = "GENERATED"
    source: Optional[str] = None
    generation_run_id: Optional[int] = None
    notes: Optional[str] = None
    priority: Optional[str] = None
    selected_for_synthesis: bool = False
    batch_label: Optional[str] = None
    review_status: Optional[str] = None
    review_notes: Optional[str] = None
    reviewed_at: Optional[datetime] = None


class PeptideCandidateCreate(PeptideCandidateBase):
    pass


class PeptideCandidateUpdate(BaseModel):
    sequence: Optional[str] = None
    status: Optional[str] = None
    notes: Optional[str] = None
    amp_score: Optional[float] = None
    mic_ecoli: Optional[float] = None
    mic_saureus: Optional[float] = None
    toxicity_risk: Optional[float] = None
    hemolysis_risk: Optional[float] = None
    priority: Optional[str] = None
    selected_for_synthesis: Optional[bool] = None
    batch_label: Optional[str] = None
    review_status: Optional[str] = None
    review_notes: Optional[str] = None
    reviewed_at: Optional[datetime] = None


class PeptideCandidateOut(PeptideCandidateBase):
    id: int
    created_at: datetime
    updated_at: Optional[datetime] = None
    model_config = ConfigDict(from_attributes=True)
