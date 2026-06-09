from datetime import datetime
from typing import Optional, List
from pydantic import BaseModel, ConfigDict, Field


class ServerBatchCreate(BaseModel):
    batch_name: str = "batch"
    total_count: int = Field(..., ge=1, le=100000)
    backend: str = "SERVER_PRODUCTION"
    mode: str = "Sequence-based"
    min_length: Optional[int] = 15
    max_length: Optional[int] = 35
    temperature: Optional[float] = 1.0
    top_p: Optional[float] = 0.95


class ServerBatchItemOut(BaseModel):
    id: int
    batch_id: int
    chunk_index: int
    generation_run_id: Optional[int] = None
    task_id: Optional[int] = None
    requested_count: int
    generated_count: int
    status: str
    artifact_dir: Optional[str] = None
    message: Optional[str] = None
    created_at: datetime
    completed_at: Optional[datetime] = None
    model_config = ConfigDict(from_attributes=True)


class ServerBatchOut(BaseModel):
    id: int
    batch_name: Optional[str] = None
    backend: str
    total_count: int
    chunk_size: int
    total_chunks: int
    completed_chunks: int
    failed_chunks: int
    status: str
    message: Optional[str] = None
    artifact_root: Optional[str] = None
    mode: Optional[str] = None
    min_length: Optional[int] = None
    max_length: Optional[int] = None
    temperature: Optional[float] = None
    top_p: Optional[float] = None
    created_at: datetime
    started_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None
    model_config = ConfigDict(from_attributes=True)


class ServerBatchDetailOut(ServerBatchOut):
    items: List[ServerBatchItemOut] = []


class ServerBatchPeptidesOut(BaseModel):
    batch_id: int
    total_peptides: int
    peptides: List[dict] = []
    disclaimer: str = ""


class ServerBatchArtifactsOut(BaseModel):
    batch_id: int
    artifact_root: Optional[str] = None
    chunks: List[dict] = []
    message: str = ""
