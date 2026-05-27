"""Analytics API tests for v0.5.6 run comparison and run-level analytics."""

import time


def test_generation_runs_summary_empty(client):
    """Summary returns empty list when no generation runs exist."""
    resp = client.get("/api/v1/analytics/generation-runs-summary")
    assert resp.status_code == 200
    data = resp.json()
    assert "runs" in data
    assert data["runs"] == []
    assert data["total"] == 0
    assert "disclaimer" in data


def test_generation_runs_summary_with_runs(client):
    """Summary returns created generation runs in descending order."""
    # Create two LOCAL_DEMO runs
    r1 = client.post("/api/v1/generation-runs", json={
        "backend": "LOCAL_DEMO", "count": 1, "mode": "Sequence-based",
    })
    assert r1.status_code == 200
    time.sleep(1.0)

    r2 = client.post("/api/v1/generation-runs", json={
        "backend": "LOCAL_DEMO", "count": 1, "mode": "Structure-based",
    })
    assert r2.status_code == 200
    time.sleep(1.0)

    resp = client.get("/api/v1/analytics/generation-runs-summary")
    assert resp.status_code == 200
    data = resp.json()
    assert data["total"] >= 2
    runs = data["runs"]
    assert len(runs) >= 2
    # Descending by id
    assert runs[0]["id"] > runs[1]["id"]
    for run in runs:
        assert "id" in run
        assert "backend" in run
        assert "status" in run
        assert "count" in run
        assert "created_at" in run


def test_generation_run_analytics_not_found(client):
    """Analytics for non-existent run returns 404."""
    resp = client.get("/api/v1/analytics/generation-runs/99999/analytics")
    assert resp.status_code == 404
    assert "not found" in resp.json()["detail"].lower()


def test_generation_run_analytics_with_peptides(client):
    """Run analytics correctly aggregates peptides belonging to that run."""
    # Create a LOCAL_DEMO run
    r = client.post("/api/v1/generation-runs", json={
        "backend": "LOCAL_DEMO", "count": 3, "mode": "Sequence-based",
    })
    assert r.status_code == 200
    run_id = r.json()["id"]
    time.sleep(1.5)

    resp = client.get(f"/api/v1/analytics/generation-runs/{run_id}/analytics")
    assert resp.status_code == 200
    data = resp.json()
    assert data["run_id"] == run_id
    assert data["total_peptides"] >= 1
    assert "avg_length" in data
    assert "avg_net_charge" in data
    assert "avg_hydrophobic_fraction" in data
    assert "status_counts" in data
    assert isinstance(data["status_counts"], list)
    assert "amino_acid_composition" in data
    assert len(data["amino_acid_composition"]) == 20
    assert "filter_rule_pass_rate" in data
    assert len(data["filter_rule_pass_rate"]) == 4
    assert "disclaimer" in data


def test_compare_generation_runs_min_2(client):
    """Compare endpoint rejects fewer than 2 runs."""
    resp = client.post("/api/v1/analytics/generation-runs/compare", json={
        "run_ids": [1]
    })
    assert resp.status_code == 400
    assert "at least 2" in resp.json()["detail"].lower()


def test_compare_generation_runs_max_4(client):
    """Compare endpoint rejects more than 4 runs."""
    resp = client.post("/api/v1/analytics/generation-runs/compare", json={
        "run_ids": [1, 2, 3, 4, 5]
    })
    assert resp.status_code == 400
    assert "maximum 4" in resp.json()["detail"].lower()


def test_compare_generation_runs_success(client):
    """Compare 2 runs side-by-side returns aggregated metrics."""
    # Create two runs
    r1 = client.post("/api/v1/generation-runs", json={
        "backend": "LOCAL_DEMO", "count": 2, "mode": "Sequence-based",
    })
    assert r1.status_code == 200
    run1_id = r1.json()["id"]
    time.sleep(1.0)

    r2 = client.post("/api/v1/generation-runs", json={
        "backend": "LOCAL_DEMO", "count": 2, "mode": "Structure-based",
    })
    assert r2.status_code == 200
    run2_id = r2.json()["id"]
    time.sleep(1.0)

    resp = client.post("/api/v1/analytics/generation-runs/compare", json={
        "run_ids": [run1_id, run2_id]
    })
    assert resp.status_code == 200
    data = resp.json()
    assert "compared_runs" in data
    assert len(data["compared_runs"]) == 2
    assert "disclaimer" in data

    for item in data["compared_runs"]:
        assert "run_id" in item
        assert "run_info" in item
        assert "total_peptides" in item
        assert "avg_length" in item
        assert "avg_net_charge" in item
        assert "avg_hydrophobic_fraction" in item
        assert "candidate_count" in item
        assert "filtered_count" in item
        assert "rejected_count" in item
        assert "length_distribution" in item
        assert "status_counts" in item
        # Verify length_distribution has expected bins
        bins = {d["bin"] for d in item["length_distribution"]}
        expected_bins = {"10-14", "15-19", "20-24", "25-29", "30-35", ">35"}
        assert bins == expected_bins
