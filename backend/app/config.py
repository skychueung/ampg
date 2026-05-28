import os
from pathlib import Path
from dotenv import load_dotenv

env_path = Path(__file__).resolve().parent.parent / ".env"
load_dotenv(dotenv_path=env_path)

BASE_DIR = Path(__file__).resolve().parent.parent

AMPGEN_ROOT = Path(os.getenv("AMPGEN_ROOT", "D:\\Desktop\\ampg\\AMPGen"))
DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./data/ampgen_platform.db")
ARTIFACT_DIR = Path(os.getenv("ARTIFACT_DIR", "./data/artifacts"))
LOCAL_REAL_SMOKE_MAX_COUNT = int(os.getenv("LOCAL_REAL_SMOKE_MAX_COUNT", "2"))
LOCAL_DEMO_MAX_COUNT = int(os.getenv("LOCAL_DEMO_MAX_COUNT", "5"))
SERVER_PRODUCTION_ENABLED = os.getenv("SERVER_PRODUCTION_ENABLED", "false").lower() == "true"

DISCLAIMER = "Computational prediction only. Not experimentally validated."
AMPGEN_LOCAL_REAL_SMOKE_DEVICE = os.getenv('AMPGEN_LOCAL_REAL_SMOKE_DEVICE', 'cpu')
