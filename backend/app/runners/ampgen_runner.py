"""Server Production placeholder.

Real AMPGen GPU cluster invocation will be implemented in a later phase.
"""
from app.config import SERVER_PRODUCTION_ENABLED


def placeholder_ampgen_run() -> dict:
    if SERVER_PRODUCTION_ENABLED:
        return {
            "status": "BLOCKED",
            "message": (
                "Server Production backend is configured but heavy pipeline execution "
                "is not yet implemented in this release."
            ),
        }
    return {
        "status": "BLOCKED",
        "message": (
            "Server production backend is not configured. "
            "Local machine only supports 1–2 real smoke runs."
        ),
    }
