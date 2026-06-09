from sqlalchemy import create_engine, inspect, text
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


def _sqlite_add_column_if_missing(table_name: str, column_name: str, column_def: str):
    """Add a column to a SQLite table if it does not already exist."""
    if "sqlite" not in db_url:
        return
    with engine.connect() as conn:
        columns = [c["name"] for c in inspect(engine).get_columns(table_name)]
        if column_name not in columns:
            conn.execute(text(f"ALTER TABLE {table_name} ADD COLUMN {column_name} {column_def}"))
            conn.commit()


def run_migrations():
    """Lightweight on-startup migrations for SQLite (no Alembic)."""
    _sqlite_add_column_if_missing("tasks", "cancel_requested", "BOOLEAN DEFAULT 0")
    _sqlite_add_column_if_missing("tasks", "cancel_requested_at", "DATETIME")
    _sqlite_add_column_if_missing("tasks", "cancelled_at", "DATETIME")
    _sqlite_add_column_if_missing("tasks", "process_pid", "INTEGER")
