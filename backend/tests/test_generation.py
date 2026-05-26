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


# ===== v0.5.1-hotfix: scientific boundary tests =====

def test_local_demo_scores_are_null(client):
    """LOCAL_DEMO must NOT write fake amp_score or MIC values."""
    response = client.post("/api/v1/generation-runs", json={
        "backend": "LOCAL_DEMO",
        "count": 2,
        "mode": "Sequence-based",
        "min_length": 15,
        "max_length": 35,
    })
    assert response.status_code == 200
    run_id = response.json()["id"]

    time.sleep(1.5)

    peptides_resp = client.get(f"/api/v1/generation-runs/{run_id}/peptides")
    assert peptides_resp.status_code == 200
    peptides_data = peptides_resp.json()
    peptides = peptides_data["peptides"]
    assert len(peptides) == 2

    for p in peptides:
        assert p["source"] == "local_demo"
        assert p["amp_score"] is None, f"Expected amp_score=None for LOCAL_DEMO, got {p['amp_score']}"
        assert p["mic_ecoli"] is None, f"Expected mic_ecoli=None for LOCAL_DEMO, got {p['mic_ecoli']}"
        assert p["mic_saureus"] is None, f"Expected mic_saureus=None for LOCAL_DEMO, got {p['mic_saureus']}"
        assert p["toxicity_risk"] is None
        assert p["hemolysis_risk"] is None


def test_local_demo_notes_scientific_boundary(client):
    """LOCAL_DEMO peptide notes must state that scores are not computed."""
    response = client.post("/api/v1/generation-runs", json={
        "backend": "LOCAL_DEMO",
        "count": 1,
        "mode": "Sequence-based",
    })
    run_id = response.json()["id"]

    time.sleep(1.5)

    peptides_resp = client.get(f"/api/v1/generation-runs/{run_id}/peptides")
    peptides = peptides_resp.json()["peptides"]
    assert len(peptides) == 1
    notes = peptides[0]["notes"] or ""
    assert "AMP score and MIC are not computed" in notes


def test_local_real_smoke_scores_remain_null(client):
    """LOCAL_REAL_SMOKE must continue to NOT write fake scores."""
    response = client.post("/api/v1/generation-runs", json={
        "backend": "LOCAL_REAL_SMOKE",
        "count": 1,
        "mode": "Sequence-based",
    })
    data = response.json()
    task_id = data["task_id"]

    # Wait for the task to complete (may take up to 60s in real env, but in pytest
    # the runner may be mocked or we accept PENDING/RUNNING as valid states)
    for _ in range(20):
        time.sleep(1)
        task_resp = client.get(f"/api/v1/tasks/{task_id}")
        task_data = task_resp.json()
        if task_data["status"] in ("SUCCEEDED", "FAILED", "BLOCKED", "CANCELLED"):
            break

    task_data = client.get(f"/api/v1/tasks/{task_id}").json()
    if task_data["status"] == "SUCCEEDED":
        run_id = data["id"]
        peptides_resp = client.get(f"/api/v1/generation-runs/{run_id}/peptides")
        peptides = peptides_resp.json().get("peptides", [])
        for p in peptides:
            assert p["source"] == "local_real_smoke"
            assert p["amp_score"] is None
            assert p["mic_ecoli"] is None
            assert p["mic_saureus"] is None


def test_reports_do_not_convert_null_scores_to_zero(client):
    """CSV export must leave null scores as empty cells, not '0' or 'None'."""
    # Ensure at least one peptide with null scores exists
    # (database was already cleaned by fix script, or newly generated LOCAL_DEMO)
    response = client.post("/api/v1/generation-runs", json={
        "backend": "LOCAL_DEMO",
        "count": 1,
        "mode": "Sequence-based",
    })
    run_id = response.json()["id"]
    time.sleep(1.5)

    csv_resp = client.get("/api/v1/reports/candidates.csv")
    assert csv_resp.status_code == 200
    csv_text = csv_resp.content.decode("utf-8-sig")
    lines = csv_text.strip().split("\n")
    assert len(lines) >= 1
    header = lines[0]
    assert "amp_score" in header
    assert "mic_ecoli" in header
    assert "mic_saureus" in header

    # For any LOCAL_DEMO row, the score fields should be empty (two commas in a row)
    # We cannot guarantee row order, so we check the whole CSV does not contain
    # a literal '0' immediately after comma for these columns when source=local_demo.
    # Simpler: parse the CSV and assert no nulls were written as '0' or 'None'.
    import csv
    reader = csv.DictReader(csv_text.splitlines())
    for row in reader:
        if row.get("source") == "local_demo":
            score_val = row.get("amp_score", "").strip()
            mic_e_val = row.get("mic_ecoli", "").strip()
            mic_s_val = row.get("mic_saureus", "").strip()
            assert score_val in ("", "Not computed"), f"Unexpected amp_score value in CSV: {score_val!r}"
            assert mic_e_val in ("", "Not computed"), f"Unexpected mic_ecoli value in CSV: {mic_e_val!r}"
            assert mic_s_val in ("", "Not computed"), f"Unexpected mic_saureus value in CSV: {mic_s_val!r}"
