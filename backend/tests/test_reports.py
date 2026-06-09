import pytest
from app.db import SessionLocal
from app.models.peptide import PeptideCandidate
from app.models.task import Task
from app.models.generation_run import GenerationRun


def _seed_peptide(db):
    p = PeptideCandidate(
        sequence="MKKLVKK",
        length=7,
        net_charge=3.0,
        hydrophobic_fraction=0.4,
        status="CANDIDATE",
        source="local_demo",
    )
    db.add(p)
    db.commit()
    db.refresh(p)
    return p


def _seed_task_and_run(db):
    task = Task(type="AMP Generation", status="SUCCEEDED", progress=1, total=1)
    db.add(task)
    db.commit()
    db.refresh(task)
    run = GenerationRun(
        task_id=task.id,
        backend="LOCAL_DEMO",
        mode="Sequence-based",
        count=1,
        status="SUCCEEDED",
    )
    db.add(run)
    db.commit()
    db.refresh(run)
    return task, run


def test_export_candidates_csv(client):
    db = SessionLocal()
    _seed_peptide(db)
    db.close()

    response = client.get("/api/v1/reports/candidates.csv")
    assert response.status_code == 200
    assert "text/csv" in response.headers["content-type"]
    body = response.content.decode("utf-8-sig")
    assert "sequence" in body
    assert "MKKLVKK" in body


def test_export_candidates_fasta(client):
    db = SessionLocal()
    _seed_peptide(db)
    db.close()

    response = client.get("/api/v1/reports/candidates.fasta")
    assert response.status_code == 200
    body = response.text
    assert ">peptide_" in body
    assert "MKKLVKK" in body


def test_export_tasks_json(client):
    db = SessionLocal()
    task = Task(type="AMP Generation", status="SUCCEEDED", progress=1, total=1)
    db.add(task)
    db.commit()
    db.close()

    response = client.get("/api/v1/reports/tasks.json")
    assert response.status_code == 200
    data = response.json()
    assert "tasks" in data
    assert data["total"] >= 1
    assert data["tasks"][0]["status"] == "SUCCEEDED"
    assert "cancel_requested" in data["tasks"][0]


def test_export_generation_run_json(client):
    db = SessionLocal()
    task, run = _seed_task_and_run(db)
    pep = _seed_peptide(db)
    pep.generation_run_id = run.id
    db.commit()
    run_id = run.id
    task_id = task.id
    db.close()

    response = client.get(f"/api/v1/reports/generation-runs/{run_id}.json")
    assert response.status_code == 200
    data = response.json()
    assert data["generation_run"]["id"] == run_id
    assert data["task"]["id"] == task_id
    assert len(data["peptides"]) >= 1
    assert "scientific_boundary" in data
    assert data["scientific_boundary"]["computational_only"] is True


def test_export_generation_run_markdown(client):
    db = SessionLocal()
    task, run = _seed_task_and_run(db)
    run_id = run.id
    db.close()

    response = client.get(f"/api/v1/reports/generation-runs/{run_id}.md")
    assert response.status_code == 200
    body = response.text
    assert "AMPGen Generation Run Report" in body
    assert "Scientific Boundary" in body
    assert "Not experimentally validated" in body


def test_export_nonexistent_generation_run_404(client):
    response = client.get("/api/v1/reports/generation-runs/9999.json")
    assert response.status_code == 404

    response = client.get("/api/v1/reports/generation-runs/9999.md")
    assert response.status_code == 404


def test_list_generation_runs(client):
    db = SessionLocal()
    _seed_task_and_run(db)
    db.close()

    response = client.get("/api/v1/generation-runs")
    assert response.status_code == 200
    data = response.json()
    assert isinstance(data, list)
    assert len(data) >= 1
