from sqlalchemy import Column, Integer, String, Float, DateTime, Text, Boolean
from sqlalchemy.sql import func
from app.db import Base


class Task(Base):
    __tablename__ = "tasks"

    id = Column(Integer, primary_key=True, index=True)
    type = Column(String(200), nullable=False)
    status = Column(String(50), default="PENDING", nullable=False)
    progress = Column(Integer, default=0, nullable=False)
    total = Column(Integer, default=0, nullable=False)
    message = Column(Text, nullable=True)
    log_text = Column(Text, nullable=True)
    artifact_dir = Column(String(500), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    completed_at = Column(DateTime(timezone=True), nullable=True)
    error_message = Column(Text, nullable=True)
    cancel_requested = Column(Boolean, default=False, nullable=False)
    cancel_requested_at = Column(DateTime(timezone=True), nullable=True)
    cancelled_at = Column(DateTime(timezone=True), nullable=True)
    process_pid = Column(Integer, nullable=True)
