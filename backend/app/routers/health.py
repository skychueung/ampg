from sqlalchemy import text
from fastapi import APIRouter
from app.config import ARTIFACT_DIR
from app.db import engine

router = APIRouter()


def _db_ok() -> bool:
    try:
        with engine.connect() as conn:
            conn.execute(text("SELECT 1"))
        return True
    except Exception:
        return False


@router.get("/health")
def health_check():
    db_status = "ok" if _db_ok() else "error"
    artifact_status = "ok" if ARTIFACT_DIR.exists() else "missing"
    return {
        "status": "ok" if db_status == "ok" else "degraded",
        "backend": "ok",
        "database": db_status,
        "artifact_dir": artifact_status,
        "artifact_dir_path": str(ARTIFACT_DIR.resolve()),
    }
