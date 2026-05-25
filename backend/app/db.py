from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base
from app.config import DATABASE_URL, BASE_DIR

# Convert relative SQLite path to absolute path based on BASE_DIR
if DATABASE_URL.startswith("sqlite:///./"):
    db_path = BASE_DIR / DATABASE_URL.replace("sqlite:///./", "")
    db_url = f"sqlite:///{db_path.resolve()}"
else:
    db_url = DATABASE_URL

engine = create_engine(db_url, connect_args={"check_same_thread": False} if "sqlite" in db_url else {})
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
