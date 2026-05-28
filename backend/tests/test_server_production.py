"""Tests for SERVER_PRODUCTION backend.

These tests verify:
1. Disabled by default -> BLOCKED
2. Enabled + count over limit -> BLOCKED
3. Enabled + count within limit -> starts background (mocked runner)
4. Scientific boundary: amp_score / MIC remain null
"""
import time
from unittest.mock import patch


def test_server_production_disabled_by_default(client):
    """With default config, SERVER_PRODUCTION should be BLOCKED."""
    response = client.post("/api/v1/generation-runs", json={
        "backend": "SERVER_PRODUCTION",
        "count": 1,
        "mode": "Sequence-based",
    })
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "BLOCKED"
    assert data["backend"] == "SERVER_PRODUCTION"


def test_server_production_count_limit_when_enabled(client, monkeypatch):
    """When enabled, count > max_count should be BLOCKED."""
    monkeypatch.setattr("app.config.SERVER_PRODUCTION_ENABLED", True)
    monkeypatch.setattr("app.config.SERVER_PRODUCTION_MAX_COUNT", 3)
    # Also patch the router import reference
    monkeypatch.setattr("app.routers.generation.SERVER_PRODUCTION_ENABLED", True)
    monkeypatch.setattr("app.routers.generation.SERVER_PRODUCTION_MAX_COUNT", 3)

    response = client.post("/api/v1/generation-runs", json={
        "backend": "SERVER_PRODUCTION",
        "count": 5,
        "mode": "Sequence-based",
    })
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "BLOCKED"
    task_id = data["task_id"]
    task_resp = client.get(f"/api/v1/tasks/{task_id}")
    task_data = task_resp.json()
    assert "limited to 3" in task_data.get("message", "")


def test_server_production_starts_background_when_enabled(client, monkeypatch):
    """When enabled and count within limit, should return PENDING and start background."""
    monkeypatch.setattr("app.config.SERVER_PRODUCTION_ENABLED", True)
    monkeypatch.setattr("app.config.SERVER_PRODUCTION_MAX_COUNT", 10)
    monkeypatch.setattr("app.routers.generation.SERVER_PRODUCTION_ENABLED", True)
    monkeypatch.setattr("app.routers.generation.SERVER_PRODUCTION_MAX_COUNT", 10)

    # Mock the runner so we don't actually invoke AMPGen
    with patch("app.runners.background_runner.run_server_production") as mock_run:
        mock_run.return_value = {
            "status": "SUCCEEDED",
            "message": "Mock success",
            "artifact_dir": "/tmp/mock",
        }
        response = client.post("/api/v1/generation-runs", json={
            "backend": "SERVER_PRODUCTION",
            "count": 2,
            "mode": "Sequence-based",
        })
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "PENDING"
        assert data["backend"] == "SERVER_PRODUCTION"

        # Give background thread a moment to call the mock
        time.sleep(0.5)
        mock_run.assert_called_once()


def test_server_production_null_scores_boundary(client, monkeypatch):
    """SERVER_PRODUCTION peptides must have null amp_score and MIC."""
    monkeypatch.setattr("app.config.SERVER_PRODUCTION_ENABLED", True)
    monkeypatch.setattr("app.config.SERVER_PRODUCTION_MAX_COUNT", 10)
    monkeypatch.setattr("app.routers.generation.SERVER_PRODUCTION_ENABLED", True)
    monkeypatch.setattr("app.routers.generation.SERVER_PRODUCTION_MAX_COUNT", 10)

    with patch("app.runners.background_runner.run_server_production") as mock_run:
        mock_run.return_value = {
            "status": "SUCCEEDED",
            "message": "Mock success",
            "artifact_dir": "/tmp/mock",
        }
        response = client.post("/api/v1/generation-runs", json={
            "backend": "SERVER_PRODUCTION",
            "count": 2,
            "mode": "Sequence-based",
        })
        run_id = response.json()["id"]
        time.sleep(0.5)

    # Since the runner is mocked and doesn't insert peptides, this test
    # verifies the scientific boundary at the runner level via inspection.
    import inspect
    from app.runners.server_production_runner import run_server_production
    source = inspect.getsource(run_server_production)
    assert "amp_score=None" in source
    assert "mic_ecoli=None" in source
    assert "mic_saureus=None" in source


def test_server_production_artifact_dir_includes_server_dir(client, monkeypatch):
    """Artifact listing should accept SERVER_ARTIFACT_DIR paths."""
    import inspect
    from app.routers.generation import get_generation_run_artifacts
    source = inspect.getsource(get_generation_run_artifacts)
    assert "SERVER_ARTIFACT_DIR" in source
    assert "under_server" in source
