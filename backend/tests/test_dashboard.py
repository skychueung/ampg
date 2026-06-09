"""Dashboard API tests."""


def test_dashboard_summary(client):
    response = client.get("/api/v1/dashboard/summary")
    assert response.status_code == 200
    data = response.json()
    assert "peptides_total" in data
    assert "peptides_candidate" in data
    assert "peptides_filtered" in data
    assert "peptides_rejected" in data
    assert "tasks_total" in data
    assert "tasks_succeeded" in data
    assert "tasks_failed" in data
    assert "tasks_blocked" in data
    assert "tasks_running" in data
    assert "generation_runs_total" in data
    assert "local_demo_runs" in data
    assert "local_real_smoke_runs" in data
    assert "server_production_runs" in data
    assert "disclaimer" in data


def test_dashboard_recent_runs(client):
    response = client.get("/api/v1/dashboard/recent-runs?limit=5")
    assert response.status_code == 200
    data = response.json()
    assert isinstance(data, list)
    if len(data) > 0:
        run = data[0]
        assert "run_id" in run
        assert "task_id" in run
        assert "backend" in run
        assert "status" in run
        assert "peptide_count" in run


def test_dashboard_recent_runs_limit_max(client):
    response = client.get("/api/v1/dashboard/recent-runs?limit=25")
    assert response.status_code == 422  # should reject > 20


def test_get_peptide_detail(client):
    # First create a peptide via LOCAL_DEMO
    run_resp = client.post("/api/v1/generation-runs", json={
        "backend": "LOCAL_DEMO",
        "count": 1,
        "mode": "Sequence-based",
    })
    run_id = run_resp.json()["id"]
    import time
    time.sleep(1.5)

    peptides_resp = client.get(f"/api/v1/generation-runs/{run_id}/peptides")
    peptides = peptides_resp.json()["peptides"]
    assert len(peptides) > 0
    peptide_id = peptides[0]["id"]

    detail_resp = client.get(f"/api/v1/peptides/{peptide_id}")
    assert detail_resp.status_code == 200
    data = detail_resp.json()
    assert data["id"] == peptide_id
    assert "sequence" in data
    assert "length" in data
    assert "status" in data
    assert "source" in data


def test_get_peptide_detail_not_found(client):
    response = client.get("/api/v1/peptides/99999")
    assert response.status_code == 404


def test_reports_csv_utf8_sig_decodable(client):
    response = client.get("/api/v1/reports/candidates.csv")
    assert response.status_code == 200
    content = response.content
    # Should start with UTF-8 BOM (EF BB BF)
    assert content[:3] == b"\xef\xbb\xbf"
    # Should be decodable as utf-8-sig
    text = content.decode("utf-8-sig")
    assert "amp_score" in text
