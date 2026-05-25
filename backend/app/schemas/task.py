from datetime import datetime
from typing import Optional
from pydantic import BaseModel, ConfigDict


class TaskBase(BaseModel):
    type: str
    status: str = "PENDING"
    progress: int = 0
    total: int = 0
    message: Optional[str] = None
    log_text: Optional[str] = None
    artifact_dir: Optional[str] = None


class TaskCreate(TaskBase):
    pass


class TaskUpdate(BaseModel):
    status: Optional[str] = None
    progress: Optional[int] = None
    message: Optional[str] = None
    log_text: Optional[str] = None
    completed_at: Optional[datetime] = None
    error_message: Optional[str] = None


class TaskOut(TaskBase):
    id: int
    created_at: datetime
    updated_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None
    error_message: Optional[str] = None
    model_config = ConfigDict(from_attributes=True)
