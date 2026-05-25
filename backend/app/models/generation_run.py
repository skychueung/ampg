from sqlalchemy import Column, Integer, String, Float, DateTime
from sqlalchemy.sql import func
from app.db import Base


class GenerationRun(Base):
    __tablename__ = "generation_runs"

    id = Column(Integer, primary_key=True, index=True)
    task_id = Column(Integer, nullable=True)
    mode = Column(String(100), nullable=True)
    backend = Column(String(100), nullable=True)
    count = Column(Integer, default=0, nullable=False)
    min_length = Column(Integer, nullable=True)
    max_length = Column(Integer, nullable=True)
    temperature = Column(Float, nullable=True)
    top_p = Column(Float, nullable=True)
    status = Column(String(50), default="PENDING", nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    completed_at = Column(DateTime(timezone=True), nullable=True)
