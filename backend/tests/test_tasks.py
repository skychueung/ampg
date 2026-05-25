from datetime import datetime
from app.db import SessionLocal
from app.models.task import Task


def _create_task(status: str = "PENDING") -> int:
    db = SessionLocal()
    task = Task(type="AMP Generation", status=status, progress=0, total=1)
    db.add(task)
    db.commit()
    db.refresh(task)
    db.close()
    return task.id


def test_list_tasks_empty(client):
    response = client.get("/api/v1/tasks")
    assert response.status_code == 200
    assert response.json() == []


def test_get_task_not_found(client):
    response = client.get("/api/v1/tasks/999")
    assert response.status_code == 404


def test_task_logs_not_found(client):
    response = client.get("/api/v1/tasks/999/logs")
    assert response.status_code == 404


# ── Cancel tests ──────────────────────────────────────────────────────────

def test_cancel_nonexistent_task_404(client):
    response = client.post("/api/v1/tasks/999/cancel")
    assert response.status_code == 404


def test_cancel_pending_task(client):
    task_id = _create_task("PENDING")
    response = client.post(f"/api/v1/tasks/{task_id}/cancel")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "CANCEL_REQUESTED"

    task = client.get(f"/api/v1/tasks/{task_id}").json()
    assert task["cancel_requested"] is True
    assert task["cancel_requested_at"] is not None


def test_cancel_running_task_sets_cancel_requested(client):
    task_id = _create_task("RUNNING")
    response = client.post(f"/api/v1/tasks/{task_id}/cancel")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "CANCEL_REQUESTED"

    task = client.get(f"/api/v1/tasks/{task_id}").json()
    assert task["cancel_requested"] is True


def test_cancel_terminal_task_noop(client):
    for terminal_status in ("SUCCEEDED", "FAILED", "BLOCKED", "CANCELLED"):
        task_id = _create_task(terminal_status)
        response = client.post(f"/api/v1/tasks/{task_id}/cancel")
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == terminal_status
        assert "No action taken" in data["message"]


def test_cancel_status_enum_supported(client):
    """Ensure CANCELLED status is accepted by the API schema."""
    task_id = _create_task("CANCELLED")
    response = client.get(f"/api/v1/tasks/{task_id}")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "CANCELLED"
    assert "cancel_requested" in data
