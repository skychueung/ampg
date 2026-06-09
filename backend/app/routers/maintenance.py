import os
import shutil
import zipfile
import csv
import json
from datetime import datetime, timedelta
from pathlib import Path
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import func

from app.db import get_db
from app.models.peptide import PeptideCandidate
from app.models.task import Task
from app.schemas.maintenance import (
    StorageSummaryOut, BackupOut, BackupsOut, BackupListItem,
    RestorePayload, RestoreOut,
    CleanupPayload, CleanupOut,
    ResetDemoPayload, ResetDemoOut,
    SnapshotOut,
)
from app.config import BASE_DIR, DATABASE_URL, ARTIFACT_DIR, DISCLAIMER

router = APIRouter(prefix="/maintenance")

# Resolve paths
PROJECT_ROOT = BASE_DIR.parent
BACKUP_DIR = PROJECT_ROOT / "backups"
DB_BACKUP_DIR = BACKUP_DIR / "db"
ARTIFACT_BACKUP_DIR = BACKUP_DIR / "artifacts"
SNAPSHOT_DIR = BACKUP_DIR / "snapshots"

# Resolve database file path from DATABASE_URL
# DATABASE_URL is like "sqlite:///./data/ampgen_platform.db"
_db_path: Optional[Path] = None


def _resolve_db_path() -> Path:
    global _db_path
    if _db_path is not None:
        return _db_path
    url = DATABASE_URL
    if url.startswith("sqlite:///"):
        path_str = url[len("sqlite:///"):]
        if path_str.startswith("./"):
            _db_path = BASE_DIR / path_str[2:]
        elif path_str.startswith("/"):
            _db_path = Path(path_str)
        else:
            _db_path = BASE_DIR / path_str
    else:
        _db_path = BASE_DIR / "data" / "ampgen_platform.db"
    return _db_path


def _ensure_backup_dirs():
    DB_BACKUP_DIR.mkdir(parents=True, exist_ok=True)
    ARTIFACT_BACKUP_DIR.mkdir(parents=True, exist_ok=True)
    SNAPSHOT_DIR.mkdir(parents=True, exist_ok=True)


def _get_dir_size(path: Path) -> float:
    """Return size in MB."""
    total = 0
    if not path.exists():
        return 0.0
    for entry in path.rglob("*"):
        if entry.is_file():
            total += entry.stat().st_size
    return round(total / (1024 * 1024), 2)


def _get_file_count(path: Path) -> int:
    if not path.exists():
        return 0
    return sum(1 for _ in path.rglob("*") if _.is_file())


def _list_backups_in_dir(directory: Path) -> list:
    items = []
    if not directory.exists():
        return items
    for f in sorted(directory.iterdir(), key=lambda x: x.stat().st_mtime, reverse=True):
        if f.is_file():
            items.append(BackupListItem(
                filename=f.name,
                path=str(f),
                size_mb=round(f.stat().st_size / (1024 * 1024), 2),
                created_at=datetime.fromtimestamp(f.stat().st_mtime).isoformat(),
            ))
    return items


@router.get("/storage-summary", response_model=StorageSummaryOut)
def storage_summary(db: Session = Depends(get_db)):
    db_path = _resolve_db_path()
    artifact_dir = ARTIFACT_DIR if isinstance(ARTIFACT_DIR, Path) else Path(ARTIFACT_DIR)
    _ensure_backup_dirs()

    db_exists = db_path.exists()
    db_size = round(db_path.stat().st_size / (1024 * 1024), 2) if db_exists else 0.0
    art_exists = artifact_dir.exists()
    art_size = _get_dir_size(artifact_dir) if art_exists else 0.0
    art_count = _get_file_count(artifact_dir) if art_exists else 0

    backup_count = sum(1 for d in [DB_BACKUP_DIR, ARTIFACT_BACKUP_DIR, SNAPSHOT_DIR]
                       if d.exists() for _ in d.iterdir() if _.is_file())

    all_backups = []
    for d in [DB_BACKUP_DIR, ARTIFACT_BACKUP_DIR, SNAPSHOT_DIR]:
        if d.exists():
            all_backups.extend(sorted(d.iterdir(), key=lambda x: x.stat().st_mtime, reverse=True))
    latest = all_backups[0].name if all_backups else None

    peptide_count = db.query(PeptideCandidate).count()
    task_count = db.query(Task).count()
    reviewed_count = db.query(PeptideCandidate).filter(PeptideCandidate.reviewed_at.isnot(None)).count()
    shortlisted_count = db.query(PeptideCandidate).filter(PeptideCandidate.review_status == "SHORTLISTED").count()
    selected_count = db.query(PeptideCandidate).filter(PeptideCandidate.selected_for_synthesis == True).count()

    return {
        "database_path": str(db_path),
        "database_exists": db_exists,
        "database_size_mb": db_size,
        "artifact_dir": str(artifact_dir),
        "artifact_dir_exists": art_exists,
        "artifact_size_mb": art_size,
        "artifact_file_count": art_count,
        "backup_dir": str(BACKUP_DIR),
        "backup_count": backup_count,
        "latest_backup": latest,
        "peptide_count": peptide_count,
        "task_count": task_count,
        "reviewed_count": reviewed_count,
        "shortlisted_count": shortlisted_count,
        "selected_for_synthesis_count": selected_count,
        "disclaimer": "Local maintenance only. No experimental validation is implied.",
    }


@router.post("/backup-database", response_model=BackupOut)
def backup_database():
    db_path = _resolve_db_path()
    if not db_path.exists():
        raise HTTPException(status_code=400, detail="Database file not found. Cannot backup.")

    _ensure_backup_dirs()
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    backup_name = f"ampgen_platform_{timestamp}.db"
    backup_path = DB_BACKUP_DIR / backup_name

    shutil.copy2(db_path, backup_path)
    size_mb = round(backup_path.stat().st_size / (1024 * 1024), 2)

    return {
        "backup_path": str(backup_path),
        "size_mb": size_mb,
        "created_at": datetime.now().isoformat(),
    }


@router.post("/backup-artifacts", response_model=BackupOut)
def backup_artifacts():
    artifact_dir = ARTIFACT_DIR if isinstance(ARTIFACT_DIR, Path) else Path(ARTIFACT_DIR)
    _ensure_backup_dirs()
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    backup_name = f"ampgen_artifacts_{timestamp}.zip"
    backup_path = ARTIFACT_BACKUP_DIR / backup_name

    if not artifact_dir.exists():
        # Create empty zip as a placeholder
        with zipfile.ZipFile(backup_path, "w") as zf:
            pass
        return {
            "backup_path": str(backup_path),
            "size_mb": 0.0,
            "created_at": datetime.now().isoformat(),
        }

    with zipfile.ZipFile(backup_path, "w", zipfile.ZIP_DEFLATED) as zf:
        for file_path in artifact_dir.rglob("*"):
            if file_path.is_file():
                arcname = file_path.relative_to(artifact_dir)
                zf.write(file_path, arcname)

    size_mb = round(backup_path.stat().st_size / (1024 * 1024), 2)
    return {
        "backup_path": str(backup_path),
        "size_mb": size_mb,
        "created_at": datetime.now().isoformat(),
    }


@router.post("/create-project-snapshot", response_model=SnapshotOut)
def create_project_snapshot():
    _ensure_backup_dirs()
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    snapshot_name = f"ampgen_platform_snapshot_{timestamp}.zip"
    snapshot_path = SNAPSHOT_DIR / snapshot_name

    # Gather git info
    git_commit = "unknown"
    git_tag = "unknown"
    try:
        import subprocess
        result = subprocess.run(["git", "rev-parse", "--short", "HEAD"],
                                cwd=PROJECT_ROOT, capture_output=True, text=True)
        if result.returncode == 0:
            git_commit = result.stdout.strip()
        result2 = subprocess.run(["git", "describe", "--tags", "--abbrev=0"],
                                 cwd=PROJECT_ROOT, capture_output=True, text=True)
        if result2.returncode == 0:
            git_tag = result2.stdout.strip()
    except Exception:
        pass

    # Database backup copy
    db_path = _resolve_db_path()
    db_backup_in_snapshot = None
    if db_path.exists():
        db_backup_in_snapshot = f"db/ampgen_platform_{timestamp}.db"

    # Artifacts zip copy
    artifact_dir = ARTIFACT_DIR if isinstance(ARTIFACT_DIR, Path) else Path(ARTIFACT_DIR)
    art_backup_in_snapshot = None
    if artifact_dir.exists() and any(artifact_dir.iterdir()):
        art_backup_in_snapshot = f"artifacts/ampgen_artifacts_{timestamp}.zip"

    manifest = {
        "snapshot_name": snapshot_name,
        "created_at": datetime.now().isoformat(),
        "git_commit": git_commit,
        "git_tag": git_tag,
        "includes_database": db_backup_in_snapshot is not None,
        "includes_artifacts": art_backup_in_snapshot is not None,
        "excluded_items": [
            ".git", ".env", "node_modules", "dist",
            "__pycache__", ".pytest_cache",
            "AMPGen original model weights",
            "backend/data/artifacts raw directory (replaced by zip)",
        ],
    }

    with zipfile.ZipFile(snapshot_path, "w", zipfile.ZIP_DEFLATED) as zf:
        # Add manifest
        zf.writestr("snapshot_manifest.json", json.dumps(manifest, indent=2, ensure_ascii=False))

        # Add selected docs / scripts / root files
        for rel_path in ["README.md", "VERSION.md", "CHANGELOG.md"]:
            src = PROJECT_ROOT / rel_path
            if src.exists():
                zf.write(src, rel_path)

        for dir_name in ["docs", "scripts"]:
            src_dir = PROJECT_ROOT / dir_name
            if src_dir.exists():
                for file_path in src_dir.rglob("*"):
                    if file_path.is_file():
                        arcname = file_path.relative_to(PROJECT_ROOT)
                        zf.write(file_path, arcname)

        # Add database copy
        if db_path.exists() and db_backup_in_snapshot:
            zf.write(db_path, db_backup_in_snapshot)

        # Add artifacts zip if we create it inline
        if artifact_dir.exists() and art_backup_in_snapshot:
            art_zip_bytes = _zip_directory_to_bytes(artifact_dir)
            zf.writestr(art_backup_in_snapshot, art_zip_bytes)

    size_mb = round(snapshot_path.stat().st_size / (1024 * 1024), 2)
    return {
        "snapshot_path": str(snapshot_path),
        "size_mb": size_mb,
        "created_at": datetime.now().isoformat(),
        "manifest": manifest,
    }


def _zip_directory_to_bytes(directory: Path) -> bytes:
    import io
    buf = io.BytesIO()
    with zipfile.ZipFile(buf, "w", zipfile.ZIP_DEFLATED) as zf:
        for file_path in directory.rglob("*"):
            if file_path.is_file():
                arcname = file_path.relative_to(directory)
                zf.write(file_path, arcname)
    return buf.getvalue()


@router.get("/backups", response_model=BackupsOut)
def list_backups():
    _ensure_backup_dirs()
    return {
        "db_backups": _list_backups_in_dir(DB_BACKUP_DIR),
        "artifact_backups": _list_backups_in_dir(ARTIFACT_BACKUP_DIR),
        "snapshots": _list_backups_in_dir(SNAPSHOT_DIR),
    }


@router.post("/restore-database", response_model=RestoreOut)
def restore_database(payload: RestorePayload, db: Session = Depends(get_db)):
    if not payload.confirm:
        return {
            "status": "BLOCKED",
            "message": "confirm must be true to restore database.",
            "backup_path": None,
            "pre_restore_backup": None,
        }

    # Path traversal protection
    requested = Path(payload.backup_filename).name
    backup_path = DB_BACKUP_DIR / requested
    if not backup_path.exists():
        raise HTTPException(status_code=404, detail=f"Backup not found: {requested}")

    # Block if any RUNNING or PENDING tasks
    active_tasks = db.query(Task).filter(Task.status.in_(["RUNNING", "PENDING"])).count()
    if active_tasks > 0:
        return {
            "status": "BLOCKED",
            "message": f"Cannot restore while {active_tasks} task(s) are RUNNING or PENDING. Cancel them first.",
            "backup_path": str(backup_path),
            "pre_restore_backup": None,
        }

    # Pre-restore backup of current DB
    db_path = _resolve_db_path()
    pre_timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    pre_backup = DB_BACKUP_DIR / f"ampgen_platform_before_restore_{pre_timestamp}.db"
    if db_path.exists():
        shutil.copy2(db_path, pre_backup)

    shutil.copy2(backup_path, db_path)

    return {
        "status": "SUCCESS",
        "message": f"Database restored from {requested}.",
        "backup_path": str(backup_path),
        "pre_restore_backup": str(pre_backup) if pre_backup.exists() else None,
    }


@router.post("/cleanup-artifacts", response_model=CleanupOut)
def cleanup_artifacts(payload: CleanupPayload):
    artifact_dir = ARTIFACT_DIR if isinstance(ARTIFACT_DIR, Path) else Path(ARTIFACT_DIR)
    cutoff = datetime.now() - timedelta(days=payload.older_than_days)
    files_to_delete = []
    total_size = 0

    if artifact_dir.exists():
        for file_path in artifact_dir.rglob("*"):
            if file_path.is_file():
                mtime = datetime.fromtimestamp(file_path.stat().st_mtime)
                if mtime < cutoff:
                    files_to_delete.append(file_path)
                    total_size += file_path.stat().st_size

    if not payload.dry_run:
        for fp in files_to_delete:
            try:
                fp.unlink()
            except Exception:
                pass
        # Clean empty dirs
        if artifact_dir.exists():
            for dir_path in sorted(artifact_dir.rglob("*"), key=lambda x: len(str(x)), reverse=True):
                if dir_path.is_dir() and not any(dir_path.iterdir()):
                    try:
                        dir_path.rmdir()
                    except Exception:
                        pass

    total_mb = round(total_size / (1024 * 1024), 2)
    return {
        "dry_run": payload.dry_run,
        "files_to_delete": len(files_to_delete),
        "total_size_mb": total_mb,
        "older_than_days": payload.older_than_days,
        "message": f"{'Would delete' if payload.dry_run else 'Deleted'} {len(files_to_delete)} file(s) ({total_mb} MB) older than {payload.older_than_days} days.",
    }


@router.post("/reset-demo-data", response_model=ResetDemoOut)
def reset_demo_data(payload: ResetDemoPayload, db: Session = Depends(get_db)):
    if not payload.confirm:
        return {
            "status": "BLOCKED",
            "message": "confirm must be true to reset demo data.",
            "deleted_count": 0,
            "pre_reset_backup": None,
        }

    # Pre-reset backup
    db_path = _resolve_db_path()
    _ensure_backup_dirs()
    pre_timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    pre_backup = DB_BACKUP_DIR / f"ampgen_platform_before_reset_{pre_timestamp}.db"
    if db_path.exists():
        shutil.copy2(db_path, pre_backup)

    query = db.query(PeptideCandidate)

    # Default: only LOCAL_DEMO peptides
    if not payload.include_real_runs:
        query = query.filter(PeptideCandidate.source == "LOCAL_DEMO")

    # Default: preserve review/shortlist data
    if not payload.include_review_data:
        query = query.filter(
            PeptideCandidate.review_status.is_(None),
            PeptideCandidate.selected_for_synthesis.isnot(True),
        )

    deleted = query.delete(synchronize_session=False)
    db.commit()

    return {
        "status": "SUCCESS",
        "message": f"Deleted {deleted} demo peptide(s).",
        "deleted_count": deleted,
        "pre_reset_backup": str(pre_backup) if pre_backup.exists() else None,
    }
