from sqlalchemy import Column, Integer, String, Float, DateTime, Text
from sqlalchemy.sql import func
from app.db import Base


class GenerationBatch(Base):
    __tablename__ = "generation_batches"

    id = Column(Integer, primary_key=True, index=True)
    batch_name = Column(String(200), nullable=True)
    backend = Column(String(100), nullable=False, default="SERVER_PRODUCTION")
    total_count = Column(Integer, nullable=False, default=0)
    chunk_size = Column(Integer, nullable=False, default=10)
    total_chunks = Column(Integer, nullable=False, default=0)
    completed_chunks = Column(Integer, nullable=False, default=0)
    failed_chunks = Column(Integer, nullable=False, default=0)
    status = Column(String(50), default="PENDING", nullable=False)
    message = Column(Text, nullable=True)
    artifact_root = Column(String(500), nullable=True)
    mode = Column(String(100), nullable=True)
    min_length = Column(Integer, nullable=True)
    max_length = Column(Integer, nullable=True)
    temperature = Column(Float, nullable=True)
    top_p = Column(Float, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    started_at = Column(DateTime(timezone=True), nullable=True)
    completed_at = Column(DateTime(timezone=True), nullable=True)
