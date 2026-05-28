from fastapi import APIRouter
from app.services.ampgen_probe import probe_ampgen
from app.config import (
    DISCLAIMER,
    SERVER_PRODUCTION_ENABLED,
    SERVER_PRODUCTION_MAX_COUNT,
    AMPGEN_SERVER_PRODUCTION_DEVICE,
    SERVER_ARTIFACT_DIR,
    AMPGEN_LOCAL_REAL_SMOKE_DEVICE,
    AMPGEN_ROOT,
    AMPGEN_VISUALIZATION_ROOT,
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
        "local_real_smoke_device": AMPGEN_LOCAL_REAL_SMOKE_DEVICE,
        "ampgen_root": str(AMPGEN_ROOT),
        "visualization_root": str(AMPGEN_VISUALIZATION_ROOT),
        "mode": "server" if SERVER_PRODUCTION_ENABLED else "local",
        "disclaimer": (
            "Server production generates sequences only. "
            "AMP score and MIC are not computed."
            if SERVER_PRODUCTION_ENABLED
            else "Local mode. Server production is not enabled."
        ),
    }
