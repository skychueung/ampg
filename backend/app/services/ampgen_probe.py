"""Probe AMPGEN_ROOT directory structure."""
from pathlib import Path
from app.config import AMPGEN_ROOT

REQUIRED_ITEMS = [
    "AMP_generator",
    "AMP_discriminator",
    "MIC_scorer",
    "data",
    "results",
    "requirements.txt",
    "setup.py",
    "test.py",
]


def probe_ampgen() -> dict:
    root = Path(AMPGEN_ROOT)
    exists = root.exists() and root.is_dir()
    items = {}
    if exists:
        for item in REQUIRED_ITEMS:
            items[item] = (root / item).exists()
    else:
        for item in REQUIRED_ITEMS:
            items[item] = False
    return {
        "ampgen_root": str(root),
        "exists": exists,
        "items": items,
        "all_present": all(items.values()) if exists else False,
    }
