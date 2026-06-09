from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.db import Base, engine, run_migrations
from app.routers import health, system, tasks, generation, peptides, filters, reports, dashboard, analytics, sequence_explorer, candidate_review, server_batch

Base.metadata.create_all(bind=engine)
run_migrations()

# --- Stale batch reconcile on startup ---
from datetime import datetime
try:
    from app.db import SessionLocal
    from app.models.generation_batch import GenerationBatch
    _db = SessionLocal()
    _stale = _db.query(GenerationBatch).filter(
        GenerationBatch.status.in_(["RUNNING", "PENDING", "CANCEL_REQUESTED"])
    ).all()
    for _batch in _stale:
        _old_status = _batch.status
        if _batch.status == "CANCEL_REQUESTED":
            _batch.status = "CANCELLED"
        else:
            _batch.status = "FAILED"
        _batch.message = f"Stale job reconciled on backend startup: previous status={_old_status}, no active runner process."
        _batch.completed_at = datetime.utcnow()
    if _stale:
        _db.commit()
        print(f"[STARTUP] Reconciled {len(_stale)} stale batch job(s) to terminal status.")
    _db.close()
except Exception as _e:
    print(f"[STARTUP] Batch reconcile warning (non-blocking): {_e}")
# --- End stale batch reconcile ---


app = FastAPI(
    title="AMPGen Server-Only API",
    description="Server-only production API for AMPGen generation and run tracking.",
    version="0.8.0-server-only",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(health.router, prefix="/api")
app.include_router(system.router, prefix="/api/v1")
app.include_router(tasks.router, prefix="/api/v1")
app.include_router(generation.router, prefix="/api/v1")
app.include_router(peptides.router, prefix="/api/v1")
app.include_router(filters.router, prefix="/api/v1")
app.include_router(reports.router, prefix="/api/v1")
app.include_router(dashboard.router, prefix="/api/v1")
app.include_router(analytics.router, prefix="/api/v1")
app.include_router(sequence_explorer.router, prefix="/api/v1")
app.include_router(candidate_review.router, prefix="/api/v1")
app.include_router(server_batch.router, prefix="/api/v1")


@app.get("/")
def root():
    return {
        "message": "AMPGen Server-Only API",
        "mode": "SERVER_PRODUCTION",
        "docs": "/docs",
    }
