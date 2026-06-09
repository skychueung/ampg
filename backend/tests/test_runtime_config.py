"""Tests for /api/v1/system/runtime-config endpoint.

Verifies:
- Field completeness
- No secret leakage
- Default local mode returns server_production_enabled=false
"""


def test_runtime_config_endpoint(client):
    """runtime-config returns all expected fields."""
    response = client.get("/api/v1/system/runtime-config")
    assert response.status_code == 200
    data = response.json()

    expected_keys = [
        "server_production_enabled",
        "server_production_max_count",
        "server_production_device",
        "server_artifact_dir",
        "local_real_smoke_device",
        "ampgen_root",
        "visualization_root",
        "mode",
        "disclaimer",
    ]
    for key in expected_keys:
        assert key in data, f"Missing key: {key}"

    assert isinstance(data["server_production_enabled"], bool)
    assert isinstance(data["server_production_max_count"], int)
    assert isinstance(data["server_production_device"], str)
    assert isinstance(data["server_artifact_dir"], str)
    assert isinstance(data["local_real_smoke_device"], str)
    assert isinstance(data["ampgen_root"], str)
    assert isinstance(data["visualization_root"], str)
    assert data["mode"] in ("server", "local")


def test_runtime_config_does_not_expose_secrets(client):
    """runtime-config must not expose raw .env, passwords, tokens, secrets."""
    response = client.get("/api/v1/system/runtime-config")
    assert response.status_code == 200
    data = response.json()

    text = str(data)
    forbidden = ["password", "token", "secret", "api_key", "DATABASE_URL"]
    for word in forbidden:
        assert word.lower() not in text.lower(), f"Potentially leaked: {word}"

    # Should not contain the literal .env file contents
    assert ".env" not in text


def test_server_production_runtime_config_disabled_default(client):
    """With default config (no .env override), server_production_enabled is false."""
    response = client.get("/api/v1/system/runtime-config")
    assert response.status_code == 200
    data = response.json()
    assert data["server_production_enabled"] is False
    assert data["mode"] == "local"


def test_server_production_max_count_visible(client):
    """max_count is returned as an integer."""
    response = client.get("/api/v1/system/runtime-config")
    assert response.status_code == 200
    data = response.json()
    assert "server_production_max_count" in data
    assert isinstance(data["server_production_max_count"], int)


def test_server_production_device_visible(client):
    """device is returned as a safe string summary."""
    response = client.get("/api/v1/system/runtime-config")
    assert response.status_code == 200
    data = response.json()
    assert "server_production_device" in data
    assert isinstance(data["server_production_device"], str)
