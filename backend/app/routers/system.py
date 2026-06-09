from fastapi import APIRouter
from app.services.ampgen_probe import probe_ampgen
from app.config import (
    DISCLAIMER,
    SERVER_PRODUCTION_ENABLED,
    SERVER_PRODUCTION_MAX_COUNT,
    AMPGEN_SERVER_PRODUCTION_DEVICE,
    SERVER_ARTIFACT_DIR,
    AMPGEN_ROOT,
    AMPGEN_VISUALIZATION_ROOT,
    SERVER_BATCH_ENABLED,
    SERVER_BATCH_MAX_TOTAL_COUNT,
    SERVER_BATCH_CHUNK_SIZE,
    SERVER_BATCH_MAX_CONCURRENCY,
    SERVER_PRODUCTION_SINGLE_RUN_LIMIT,
)

router = APIRouter(prefix="/system")


@router.get("/ampgen-probe")
def ampgen_probe():
    result = probe_ampgen()
    return {
        **result,
        "disclaimer": DISCLAIMER,
    }


@router.get("/runtime-config")
def runtime_config():
    """Return safe runtime configuration summary.

    Does NOT expose .env raw contents, secrets, passwords, or API keys.
    """
    return {
        "server_production_enabled": SERVER_PRODUCTION_ENABLED,
        "server_production_max_count": SERVER_PRODUCTION_MAX_COUNT,
        "server_production_device": AMPGEN_SERVER_PRODUCTION_DEVICE,
        "server_artifact_dir": str(SERVER_ARTIFACT_DIR),
        "disabled_modes": ["LOCAL_DEMO", "LOCAL_REAL_SMOKE", "demo", "mock", "local"],
        "ampgen_root": str(AMPGEN_ROOT),
        "visualization_root": str(AMPGEN_VISUALIZATION_ROOT),
        "server_batch_enabled": SERVER_BATCH_ENABLED,
        "server_batch_max_total_count": SERVER_BATCH_MAX_TOTAL_COUNT,
        "server_batch_chunk_size": SERVER_BATCH_CHUNK_SIZE,
        "server_batch_max_concurrency": SERVER_BATCH_MAX_CONCURRENCY,
        "server_production_single_run_limit": SERVER_PRODUCTION_SINGLE_RUN_LIMIT,
        "mode": "server" if SERVER_PRODUCTION_ENABLED else "local",
        "disclaimer": (
            "AMPGen Server-Only accepts only SERVER_PRODUCTION. "
            "Single-run limit: {SERVER_PRODUCTION_SINGLE_RUN_LIMIT}. Use batch API for larger counts. Scores are shown only when returned by connected computational scorers; "
            "toxicity and hemolysis remain null until real scorers are connected."
            if SERVER_PRODUCTION_ENABLED
            else "Local mode. Server production is not enabled."
        ),
    }
