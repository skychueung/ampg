def test_health(client):
    response = client.get("/api/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] in ("ok", "degraded")
    assert data["backend"] == "ok"
    assert "database" in data
    assert "artifact_dir" in data
