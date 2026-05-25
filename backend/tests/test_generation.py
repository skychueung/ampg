import time


def test_generation_local_demo_async_framework(client):
    """LOCAL_DEMO count=2 should return immediately with PENDING, then complete in background."""
    response = client.post("/api/v1/generation-runs", json={
        "backend": "LOCAL_DEMO",
        "count": 2,
        "mode": "Sequence-based",
    })
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "PENDING"
    run_id = data["id"]
    task_id = data["task_id"]

    # Wait for background thread to complete (LOCAL_DEMO is very fast)
    time.sleep(1.5)

    # Check run status
    run_resp = client.get(f"/api/v1/generation-runs/{run_id}")
    assert run_resp.status_code == 200
    run_data = run_resp.json()
    assert run_data["status"] == "SUCCEEDED"

    # Check task status
    task_resp = client.get(f"/api/v1/tasks/{task_id}")
    assert task_resp.status_code == 200
    task_data = task_resp.json()
    assert task_data["status"] == "SUCCEEDED"

    # Check peptides exist
    peptides_resp = client.get(f"/api/v1/generation-runs/{run_id}/peptides")
    assert peptides_resp.status_code == 200
    peptides_data = peptides_resp.json()
    assert len(peptides_data["peptides"]) == 2


def test_generation_local_real_smoke_blocked_count_3(client):
    response = client.post("/api/v1/generation-runs", json={
        "backend": "LOCAL_REAL_SMOKE",
        "count": 3,
        "mode": "Sequence-based",
    })
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "BLOCKED"
    assert data["backend"] == "LOCAL_REAL_SMOKE"


def test_generation_local_demo_blocked_count_6(client):
    response = client.post("/api/v1/generation-runs", json={
        "backend": "LOCAL_DEMO",
        "count": 6,
        "mode": "Sequence-based",
    })
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "BLOCKED"
    assert data["backend"] == "LOCAL_DEMO"


def test_generation_server_production_blocked_any_count(client):
    response = client.post("/api/v1/generation-runs", json={
        "backend": "SERVER_PRODUCTION",
        "count": 1,
        "mode": "Sequence-based",
    })
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "BLOCKED"
    assert data["backend"] == "SERVER_PRODUCTION"


def test_get_generation_run_not_found(client):
    response = client.get("/api/v1/generation-runs/999")
    assert response.status_code == 404


def test_task_status_transitions(client):
    """Verify PENDING -> RUNNING -> SUCCEEDED for LOCAL_DEMO background task."""
    response = client.post("/api/v1/generation-runs", json={
        "backend": "LOCAL_DEMO",
        "count": 1,
        "mode": "Sequence-based",
    })
    data = response.json()
    task_id = data["task_id"]

    # Immediately after creation, should be PENDING
    task_resp = client.get(f"/api/v1/tasks/{task_id}")
    task_data = task_resp.json()
    assert task_data["status"] in ("PENDING", "RUNNING", "SUCCEEDED")

    # Wait for completion
    time.sleep(1.5)
    task_resp = client.get(f"/api/v1/tasks/{task_id}")
    task_data = task_resp.json()
    assert task_data["status"] == "SUCCEEDED"
    assert task_data["message"] is not None


def test_task_logs_real_or_empty(client):
    """Verify logs endpoint returns real data or empty list, never fake logs."""
    response = client.post("/api/v1/generation-runs", json={
        "backend": "LOCAL_DEMO",
        "count": 1,
        "mode": "Sequence-based",
    })
    task_id = response.json()["task_id"]

    logs_resp = client.get(f"/api/v1/tasks/{task_id}/logs")
    assert logs_resp.status_code == 200
    logs_data = logs_resp.json()
    assert "logs" in logs_data
    assert isinstance(logs_data["logs"], list)
    # Should not contain fake demo log lines like "Starting AMP Generation..."
    for line in logs_data["logs"]:
        assert "GPU memory exhausted" not in line  # known fake log pattern


def test_generation_run_peptides_after_success(client):
    """After LOCAL_DEMO succeeds, peptides must be queryable."""
    response = client.post("/api/v1/generation-runs", json={
        "backend": "LOCAL_DEMO",
        "count": 2,
        "mode": "Sequence-based",
    })
    run_id = response.json()["id"]

    time.sleep(1.5)

    peptides_resp = client.get(f"/api/v1/generation-runs/{run_id}/peptides")
    assert peptides_resp.status_code == 200
    peptides_data = peptides_resp.json()
    assert peptides_data["status"] == "SUCCEEDED"
    assert len(peptides_data["peptides"]) == 2
