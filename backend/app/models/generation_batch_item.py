from sqlalchemy import Column, Integer, String, DateTime, Text
from sqlalchemy.sql import func
from app.db import Base


class GenerationBatchItem(Base):
    __tablename__ = "generation_batch_items"

    id = Column(Integer, primary_key=True, index=True)
    batch_id = Column(Integer, nullable=False, index=True)
    chunk_index = Column(Integer, nullable=False, default=0)
    generation_run_id = Column(Integer, nullable=True)
    task_id = Column(Integer, nullable=True)
    requested_count = Column(Integer, nullable=False, default=0)
    generated_count = Column(Integer, nullable=False, default=0)
    status = Column(String(50), default="PENDING", nullable=False)
    artifact_dir = Column(String(500), nullable=True)
    message = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    completed_at = Column(DateTime(timezone=True), nullable=True)
