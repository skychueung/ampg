from typing import Optional, List
from pydantic import BaseModel, Field
from datetime import datetime


class StorageSummaryOut(BaseModel):
    database_path: str
    database_exists: bool
    database_size_mb: float
    artifact_dir: str
    artifact_dir_exists: bool
    artifact_size_mb: float
    artifact_file_count: int
    backup_dir: str
    backup_count: int
    latest_backup: Optional[str] = None
    peptide_count: int
    task_count: int
    reviewed_count: int
    shortlisted_count: int
    selected_for_synthesis_count: int
    disclaimer: str


class BackupOut(BaseModel):
    backup_path: str
    size_mb: float
    created_at: str


class BackupListItem(BaseModel):
    filename: str
    path: str
    size_mb: float
    created_at: str


class BackupsOut(BaseModel):
    db_backups: List[BackupListItem]
    artifact_backups: List[BackupListItem]
    snapshots: List[BackupListItem]


class RestorePayload(BaseModel):
    backup_filename: str
    confirm: bool = False


class RestoreOut(BaseModel):
    status: str
    message: str
    backup_path: Optional[str] = None
    pre_restore_backup: Optional[str] = None


class CleanupPayload(BaseModel):
    older_than_days: int = Field(default=30, ge=1)
    dry_run: bool = True


class CleanupOut(BaseModel):
    dry_run: bool
    files_to_delete: int
    total_size_mb: float
    older_than_days: int
    message: str


class ResetDemoPayload(BaseModel):
    confirm: bool = False
    include_real_runs: bool = False
    include_review_data: bool = False


class ResetDemoOut(BaseModel):
    status: str
    message: str
    deleted_count: int
    pre_reset_backup: Optional[str] = None


class SnapshotOut(BaseModel):
    snapshot_path: str
    size_mb: float
    created_at: str
    manifest: dict
