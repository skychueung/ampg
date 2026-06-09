import os
import json
import zipfile
from datetime import datetime
from pathlib import Path
from unittest.mock import patch

import pytest
from sqlalchemy.orm import Session

from app.models.peptide import PeptideCandidate
from app.models.task import Task

# Helper to get test db session
@pytest.fixture
def db_session():
    from app.db import SessionLocal
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


# ---------------------------------------------------------------------------
# 1. Storage summary field completeness
# ---------------------------------------------------------------------------
def test_storage_summary(client):
    r = client.get("/api/v1/maintenance/storage-summary")
    assert r.status_code == 200
    data = r.json()
    required = [
        "database_path", "database_exists", "database_size_mb",
        "artifact_dir", "artifact_dir_exists", "artifact_size_mb", "artifact_file_count",
        "backup_dir", "backup_count", "latest_backup",
        "peptide_count", "task_count", "reviewed_count",
        "shortlisted_count", "selected_for_synthesis_count",
        "disclaimer",
    ]
    for key in required:
        assert key in data, f"Missing key: {key}"
    assert "Local maintenance only" in data["disclaimer"]


# ---------------------------------------------------------------------------
# 2. Backup database success / missing handled gracefully
# ---------------------------------------------------------------------------
def test_backup_database_success(client):
    r = client.post("/api/v1/maintenance/backup-database")
    assert r.status_code == 200
    data = r.json()
    assert "backup_path" in data
    assert "size_mb" in data
    assert "created_at" in data
    # Cleanup
    if os.path.exists(data["backup_path"]):
        os.remove(data["backup_path"])


def test_backup_database_missing_returns_error(client):
    # Monkeypatch _resolve_db_path to a non-existent file
    from app.routers import maintenance as maint_mod
    fake_path = Path("/nonexistent/path/to/ampgen_platform_missing.db")
    maint_mod._db_path = fake_path
    try:
        r = client.post("/api/v1/maintenance/backup-database")
        assert r.status_code == 400
        assert "not found" in r.json()["detail"].lower()
    finally:
        maint_mod._db_path = None  # reset so next call re-resolves


# ---------------------------------------------------------------------------
# 3. Backup artifacts returns 200
# ---------------------------------------------------------------------------
def test_backup_artifacts(client):
    r = client.post("/api/v1/maintenance/backup-artifacts")
    assert r.status_code == 200
    data = r.json()
    assert "backup_path" in data
    if os.path.exists(data["backup_path"]):
        os.remove(data["backup_path"])


# ---------------------------------------------------------------------------
# 4. Create project snapshot success
# ---------------------------------------------------------------------------
def test_create_project_snapshot(client):
    r = client.post("/api/v1/maintenance/create-project-snapshot")
    assert r.status_code == 200
    data = r.json()
    assert "snapshot_path" in data
    assert "size_mb" in data
    assert "manifest" in data
    assert "git_commit" in data["manifest"]
    if os.path.exists(data["snapshot_path"]):
        os.remove(data["snapshot_path"])


# ---------------------------------------------------------------------------
# 5. Snapshot excludes sensitive files
# ---------------------------------------------------------------------------
def test_project_snapshot_excludes_sensitive_files(client):
    r = client.post("/api/v1/maintenance/create-project-snapshot")
    assert r.status_code == 200
    data = r.json()
    snap_path = data["snapshot_path"]
    assert os.path.exists(snap_path)

    with zipfile.ZipFile(snap_path, "r") as zf:
        names = zf.namelist()
        # Must NOT contain these
        for bad in [".git", ".env", "node_modules", "__pycache__", ".pytest_cache"]:
            matches = [n for n in names if bad in n]
            assert len(matches) == 0, f"Snapshot should not contain {bad}, found {matches}"
        # Must contain manifest
        assert "snapshot_manifest.json" in names
        # Must contain README.md or docs/
        assert any("README.md" in n or n.startswith("docs/") for n in names)

    os.remove(snap_path)


# ---------------------------------------------------------------------------
# 6. List backups returns structured data
# ---------------------------------------------------------------------------
def test_list_backups(client):
    # Ensure at least one backup exists
    client.post("/api/v1/maintenance/backup-database")
    r = client.get("/api/v1/maintenance/backups")
    assert r.status_code == 200
    data = r.json()
    assert "db_backups" in data
    assert "artifact_backups" in data
    assert "snapshots" in data
    assert isinstance(data["db_backups"], list)


# ---------------------------------------------------------------------------
# 7. Restore requires confirm
# ---------------------------------------------------------------------------
def test_restore_database_requires_confirm(client):
    r = client.post("/api/v1/maintenance/restore-database", json={
        "backup_filename": "foo.db",
        "confirm": False,
    })
    assert r.status_code == 200
    data = r.json()
    assert data["status"] == "BLOCKED"
    assert "confirm" in data["message"].lower()


# ---------------------------------------------------------------------------
# 8. Restore rejects path traversal
# ---------------------------------------------------------------------------
def test_restore_database_rejects_path_traversal(client):
    r = client.post("/api/v1/maintenance/restore-database", json={
        "backup_filename": "../../../etc/passwd",
        "confirm": True,
    })
    # Should be 404 because the sanitized filename won't exist
    assert r.status_code == 404


# ---------------------------------------------------------------------------
# 9. Cleanup dry_run does not delete files
# ---------------------------------------------------------------------------
def test_cleanup_artifacts_dry_run(client):
    r = client.post("/api/v1/maintenance/cleanup-artifacts", json={
        "older_than_days": 1,
        "dry_run": True,
    })
    assert r.status_code == 200
    data = r.json()
    assert data["dry_run"] is True
    assert "files_to_delete" in data


# ---------------------------------------------------------------------------
# 10. Reset demo requires confirm
# ---------------------------------------------------------------------------
def test_reset_demo_data_requires_confirm(client):
    r = client.post("/api/v1/maintenance/reset-demo-data", json={
        "confirm": False,
        "include_real_runs": False,
        "include_review_data": False,
    })
    assert r.status_code == 200
    data = r.json()
    assert data["status"] == "BLOCKED"
    assert "confirm" in data["message"].lower()


# ---------------------------------------------------------------------------
# 11. Reset demo default keeps real and review data
# ---------------------------------------------------------------------------
def test_reset_demo_data_default_keeps_real_and_review_data(client, db_session: Session):
    db = db_session
    # Count before
    before = db.query(PeptideCandidate).count()

    # Add a LOCAL_DEMO peptide with review data
    demo_reviewed = PeptideCandidate(
        sequence="TESTDEMOREVIEW",
        length=16,
        source="LOCAL_DEMO",
        review_status="SHORTLISTED",
        selected_for_synthesis=True,
    )
    db.add(demo_reviewed)
    db.commit()

    # Add a LOCAL_REAL_SMOKE peptide
    real = PeptideCandidate(
        sequence="TESTREAL",
        length=16,
        source="LOCAL_REAL_SMOKE",
    )
    db.add(real)
    db.commit()

    r = client.post("/api/v1/maintenance/reset-demo-data", json={
        "confirm": True,
        "include_real_runs": False,
        "include_review_data": False,
    })
    assert r.status_code == 200
    data = r.json()
    assert data["status"] == "SUCCESS"

    # Both should still exist because:
    # - real has source LOCAL_REAL_SMOKE (excluded by include_real_runs=false)
    # - demo_reviewed has review_status/selected_for_synthesis (excluded by include_review_data=false)
    assert db.query(PeptideCandidate).filter(PeptideCandidate.sequence == "TESTDEMOREVIEW").first() is not None
    assert db.query(PeptideCandidate).filter(PeptideCandidate.sequence == "TESTREAL").first() is not None

    # Cleanup test peptides
    db.query(PeptideCandidate).filter(PeptideCandidate.sequence.in_(["TESTDEMOREVIEW", "TESTREAL"])).delete(synchronize_session=False)
    db.commit()
