from fastapi import APIRouter
from app.services.ampgen_probe import probe_ampgen
from app.config import DISCLAIMER

router = APIRouter(prefix="/system")


@router.get("/ampgen-probe")
def ampgen_probe():
    result = probe_ampgen()
    return {
        **result,
        "disclaimer": DISCLAIMER,
    }
