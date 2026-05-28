"""Tests for server batch API.

Verifies:
- Disabled returns blocked
- Create success with chunking
- Total count limit
- Chunking 12 -> 10+2
- Chunking 30 -> 3 chunks
- Items created
- Detail endpoint
- Peptides endpoint
- Artifacts endpoint
- Cancel pending
- Scores remain null
- Only SERVER_PRODUCTION allowed
- Runtime config includes batch limits
"""
import time
from unittest.mock import patch


def test_server_batch_disabled_returns_blocked(client):
    """When SERVER_BATCH_ENABLED=false, create should return 403."""
    response = client.post("/api/v1/server-batches", json={
        "batch_name": "test_batch",
        "total_count": 12,
        "backend": "SERVER_PRODUCTION",
    })
    assert response.status_code == 403
    data = response.json()
    assert "not enabled" in data.get("detail", "").lower()


def test_server_batch_create_success(client, monkeypatch):
    """Create batch with total_count=12, verify 2 items 10+2."""
    monkeypatch.setattr("app.config.SERVER_BATCH_ENABLED", True)
    monkeypatch.setattr("app.config.SERVER_BATCH_MAX_TOTAL_COUNT", 50)
    monkeypatch.setattr("app.config.SERVER_BATCH_CHUNK_SIZE", 10)
    monkeypatch.setattr("app.routers.server_batch.SERVER_BATCH_ENABLED", True)
    monkeypatch.setattr("app.routers.server_batch.SERVER_BATCH_MAX_TOTAL_COUNT", 50)
    monkeypatch.setattr("app.routers.server_batch.SERVER_BATCH_CHUNK_SIZE", 10)

    with patch("app.routers.server_batch.start_server_batch"):
        response = client.post("/api/v1/server-batches", json={
            "batch_name": "batch_12",
            "total_count": 12,
            "backend": "SERVER_PRODUCTION",
            "mode": "Sequence-based",
        })
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "PENDING"
    assert data["total_count"] == 12
    assert data["total_chunks"] == 2
    assert data["chunk_size"] == 10
    batch_id = data["id"]

    # Verify items
    detail = client.get(f"/api/v1/server-batches/{batch_id}").json()
    items = detail["items"]
    assert len(items) == 2
    assert items[0]["requested_count"] == 10
    assert items[1]["requested_count"] == 2
    assert items[0]["chunk_index"] == 0
    assert items[1]["chunk_index"] == 1


def test_server_batch_total_count_limit(client, monkeypatch):
    """total_count > max_total_count should return 400."""
    monkeypatch.setattr("app.config.SERVER_BATCH_ENABLED", True)
    monkeypatch.setattr("app.config.SERVER_BATCH_MAX_TOTAL_COUNT", 50)
    monkeypatch.setattr("app.routers.server_batch.SERVER_BATCH_ENABLED", True)
    monkeypatch.setattr("app.routers.server_batch.SERVER_BATCH_MAX_TOTAL_COUNT", 50)

    response = client.post("/api/v1/server-batches", json={
        "batch_name": "batch_51",
        "total_count": 51,
        "backend": "SERVER_PRODUCTION",
    })
    assert response.status_code == 400
    assert "exceeds batch limit" in response.json()["detail"]


def test_server_batch_chunking_30_to_3_chunks(client, monkeypatch):
    """total_count=30 with chunk_size=10 -> 3 chunks."""
    monkeypatch.setattr("app.config.SERVER_BATCH_ENABLED", True)
    monkeypatch.setattr("app.config.SERVER_BATCH_CHUNK_SIZE", 10)
    monkeypatch.setattr("app.routers.server_batch.SERVER_BATCH_ENABLED", True)
    monkeypatch.setattr("app.routers.server_batch.SERVER_BATCH_CHUNK_SIZE", 10)

    with patch("app.routers.server_batch.start_server_batch"):
        response = client.post("/api/v1/server-batches", json={
            "batch_name": "batch_30",
            "total_count": 30,
            "backend": "SERVER_PRODUCTION",
        })
    assert response.status_code == 200
    data = response.json()
    assert data["total_chunks"] == 3
    batch_id = data["id"]

    detail = client.get(f"/api/v1/server-batches/{batch_id}").json()
    items = detail["items"]
    assert len(items) == 3
    assert items[0]["requested_count"] == 10
    assert items[1]["requested_count"] == 10
    assert items[2]["requested_count"] == 10


def test_server_batch_items_created(client, monkeypatch):
    """Batch creation creates the correct number of items."""
    monkeypatch.setattr("app.config.SERVER_BATCH_ENABLED", True)
    monkeypatch.setattr("app.routers.server_batch.SERVER_BATCH_ENABLED", True)

    with patch("app.routers.server_batch.start_server_batch"):
        response = client.post("/api/v1/server-batches", json={
            "batch_name": "batch_5",
            "total_count": 5,
            "backend": "SERVER_PRODUCTION",
        })
    batch_id = response.json()["id"]
    detail = client.get(f"/api/v1/server-batches/{batch_id}").json()
    assert len(detail["items"]) == 1
    assert detail["items"][0]["requested_count"] == 5


def test_server_batch_detail(client, monkeypatch):
    """Detail endpoint returns batch with items."""
    monkeypatch.setattr("app.config.SERVER_BATCH_ENABLED", True)
    monkeypatch.setattr("app.routers.server_batch.SERVER_BATCH_ENABLED", True)

    with patch("app.routers.server_batch.start_server_batch"):
        response = client.post("/api/v1/server-batches", json={
            "batch_name": "batch_detail",
            "total_count": 7,
            "backend": "SERVER_PRODUCTION",
        })
    batch_id = response.json()["id"]
    detail = client.get(f"/api/v1/server-batches/{batch_id}").json()
    assert detail["batch_name"] == "batch_detail"
    assert detail["total_count"] == 7
    assert "items" in detail


def test_server_batch_peptides_endpoint(client, monkeypatch):
    """Peptides endpoint returns list (empty if no runs yet)."""
    monkeypatch.setattr("app.config.SERVER_BATCH_ENABLED", True)
    monkeypatch.setattr("app.routers.server_batch.SERVER_BATCH_ENABLED", True)

    with patch("app.routers.server_batch.start_server_batch"):
        response = client.post("/api/v1/server-batches", json={
            "batch_name": "batch_pep",
            "total_count": 3,
            "backend": "SERVER_PRODUCTION",
        })
    batch_id = response.json()["id"]
    pep_resp = client.get(f"/api/v1/server-batches/{batch_id}/peptides")
    assert pep_resp.status_code == 200
    data = pep_resp.json()
    assert data["batch_id"] == batch_id
    assert "total_peptides" in data
    assert "peptides" in data


def test_server_batch_artifacts_endpoint(client, monkeypatch):
    """Artifacts endpoint returns chunk info."""
    monkeypatch.setattr("app.config.SERVER_BATCH_ENABLED", True)
    monkeypatch.setattr("app.routers.server_batch.SERVER_BATCH_ENABLED", True)

    with patch("app.routers.server_batch.start_server_batch"):
        response = client.post("/api/v1/server-batches", json={
            "batch_name": "batch_art",
            "total_count": 3,
            "backend": "SERVER_PRODUCTION",
        })
    batch_id = response.json()["id"]
    art_resp = client.get(f"/api/v1/server-batches/{batch_id}/artifacts")
    assert art_resp.status_code == 200
    data = art_resp.json()
    assert data["batch_id"] == batch_id
    assert "chunks" in data


def test_server_batch_cancel_pending(client, monkeypatch):
    """Cancel a pending batch."""
    monkeypatch.setattr("app.config.SERVER_BATCH_ENABLED", True)
    monkeypatch.setattr("app.routers.server_batch.SERVER_BATCH_ENABLED", True)

    with patch("app.routers.server_batch.start_server_batch"):
        response = client.post("/api/v1/server-batches", json={
            "batch_name": "batch_cancel",
            "total_count": 3,
            "backend": "SERVER_PRODUCTION",
        })
    batch_id = response.json()["id"]
    cancel_resp = client.post(f"/api/v1/server-batches/{batch_id}/cancel")
    assert cancel_resp.status_code == 200
    assert cancel_resp.json()["status"] == "CANCELLED"

    # Verify batch status
    detail = client.get(f"/api/v1/server-batches/{batch_id}").json()
    assert detail["status"] == "CANCELLED"


def test_server_batch_cancel_running_not_supported(client, monkeypatch):
    """Cancel a running batch should fail."""
    monkeypatch.setattr("app.config.SERVER_BATCH_ENABLED", True)
    monkeypatch.setattr("app.routers.server_batch.SERVER_BATCH_ENABLED", True)

    import threading
    import time

    def mock_start(batch_id: int):
        def _inner():
            from sqlalchemy import create_engine
            from sqlalchemy.orm import sessionmaker
            from app.models.generation_batch import GenerationBatch
            engine = create_engine("sqlite:///./test.db", connect_args={"check_same_thread": False})
            Session = sessionmaker(autocommit=False, autoflush=False, bind=engine)
            db = Session()
            batch = db.query(GenerationBatch).filter(GenerationBatch.id == batch_id).first()
            if batch:
                batch.status = "RUNNING"
                db.commit()
            db.close()
        t = threading.Thread(target=_inner, daemon=True)
        t.start()
        time.sleep(0.2)

    with patch("app.routers.server_batch.start_server_batch", side_effect=mock_start):
        response = client.post("/api/v1/server-batches", json={
            "batch_name": "batch_run",
            "total_count": 3,
            "backend": "SERVER_PRODUCTION",
        })
    batch_id = response.json()["id"]

    cancel_resp = client.post(f"/api/v1/server-batches/{batch_id}/cancel")
    assert cancel_resp.status_code == 400
    assert "not supported yet" in cancel_resp.json()["detail"]


def test_server_batch_uses_server_production_only(client, monkeypatch):
    """Only SERVER_PRODUCTION backend is allowed."""
    monkeypatch.setattr("app.config.SERVER_BATCH_ENABLED", True)
    monkeypatch.setattr("app.routers.server_batch.SERVER_BATCH_ENABLED", True)

    response = client.post("/api/v1/server-batches", json={
        "batch_name": "batch_bad",
        "total_count": 3,
        "backend": "LOCAL_DEMO",
    })
    assert response.status_code == 400
    assert "Only SERVER_PRODUCTION" in response.json()["detail"]


def test_runtime_config_includes_batch_limits(client, monkeypatch):
    """runtime-config includes batch configuration fields."""
    monkeypatch.setattr("app.routers.system.SERVER_BATCH_ENABLED", True)
    monkeypatch.setattr("app.routers.system.SERVER_BATCH_MAX_TOTAL_COUNT", 50)
    monkeypatch.setattr("app.routers.system.SERVER_BATCH_CHUNK_SIZE", 10)
    monkeypatch.setattr("app.routers.system.SERVER_BATCH_MAX_CONCURRENCY", 1)

    response = client.get("/api/v1/system/runtime-config")
    assert response.status_code == 200
    data = response.json()
    assert "server_batch_enabled" in data
    assert "server_batch_max_total_count" in data
    assert "server_batch_chunk_size" in data
    assert "server_batch_max_concurrency" in data
    assert data["server_batch_enabled"] is True
    assert data["server_batch_max_total_count"] == 50
    assert data["server_batch_chunk_size"] == 10
    assert data["server_batch_max_concurrency"] == 1
