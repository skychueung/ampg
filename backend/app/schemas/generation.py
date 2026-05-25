from datetime import datetime
from typing import Optional, List
from pydantic import BaseModel, ConfigDict, Field
from app.schemas.peptide import PeptideCandidateOut


class GenerationRunBase(BaseModel):
    task_id: Optional[int] = None
    mode: Optional[str] = None
    backend: Optional[str] = None
    count: int = 0
    min_length: Optional[int] = None
    max_length: Optional[int] = None
    temperature: Optional[float] = None
    top_p: Optional[float] = None
    status: str = "PENDING"


class GenerationRunCreate(BaseModel):
    mode: str = "Sequence-based"
    backend: str = Field(default="LOCAL_DEMO", pattern="^(LOCAL_DEMO|LOCAL_REAL_SMOKE|SERVER_PRODUCTION)$")
    count: int = 5
    min_length: Optional[int] = 15
    max_length: Optional[int] = 35
    temperature: Optional[float] = 1.0
    top_p: Optional[float] = 0.95


class GenerationRunOut(GenerationRunBase):
    id: int
    created_at: datetime
    completed_at: Optional[datetime] = None
    model_config = ConfigDict(from_attributes=True)


class GenerationRunDetailOut(GenerationRunOut):
    peptides: List[PeptideCandidateOut] = []
    disclaimer: str = ""
