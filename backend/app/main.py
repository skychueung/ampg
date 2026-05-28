from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.db import Base, engine, run_migrations
from app.routers import health, system, tasks, generation, peptides, filters, reports, dashboard, analytics, sequence_explorer, candidate_review, maintenance, server_batch

Base.metadata.create_all(bind=engine)
run_migrations()

app = FastAPI(
    title="AMPGen Agent Platform API",
    description="First-phase FastAPI backend for AMPGen Agent Platform.",
    version="0.1.0",
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
app.include_router(maintenance.router, prefix="/api/v1")
app.include_router(server_batch.router, prefix="/api/v1")


@app.get("/")
def root():
    return {"message": "AMPGen Agent Platform API", "docs": "/docs"}
