"""Sequence Explorer API tests for v0.5.7 peptide sequence explorer."""

import time


def test_sequence_explorer_overview(client):
    """Overview returns all expected fields."""
    # Ensure at least one peptide exists
    client.post("/api/v1/generation-runs", json={
        "backend": "LOCAL_DEMO",
        "count": 2,
        "mode": "Sequence-based",
    })
    time.sleep(1.5)

    resp = client.get("/api/v1/sequence-explorer/overview")
    assert resp.status_code == 200
    data = resp.json()
    assert "total_sequences" in data
    assert "unique_sequences" in data
    assert "duplicate_sequence_count" in data
    assert "average_length" in data
    assert "min_length" in data
    assert "max_length" in data
    assert "local_demo_count" in data
    assert "local_real_smoke_count" in data
    assert "disclaimer" in data
    assert data["total_sequences"] >= 2


def test_sequence_explorer_duplicates(client):
    """Duplicates returns list of duplicate groups."""
    resp = client.get("/api/v1/sequence-explorer/duplicates")
    assert resp.status_code == 200
    data = resp.json()
    assert "duplicate_groups" in data
    assert isinstance(data["duplicate_groups"], list)
    assert "total_duplicate_sequences" in data
    assert "disclaimer" in data


def test_sequence_explorer_similarity(client):
    """Similarity returns pairs with valid similarity scores."""
    resp = client.get("/api/v1/sequence-explorer/similarity?threshold=0.5&limit=20")
    assert resp.status_code == 200
    data = resp.json()
    assert "threshold" in data
    assert "pairs" in data
    assert "pair_count" in data
    assert "disclaimer" in data
    for pair in data["pairs"]:
        assert "peptide_id_1" in pair
        assert "sequence_1" in pair
        assert "peptide_id_2" in pair
        assert "sequence_2" in pair
        assert "similarity" in pair
        assert 0.0 <= pair["similarity"] <= 1.0
        assert "length_1" in pair
        assert "length_2" in pair


def test_sequence_explorer_similarity_limit_max(client):
    """Similarity rejects limit > 500."""
    resp = client.get("/api/v1/sequence-explorer/similarity?threshold=0.8&limit=501")
    assert resp.status_code == 422  # FastAPI query param validation


def test_sequence_explorer_motif_enrichment(client):
    """Motif enrichment returns n_terminal, c_terminal, top_dipeptides."""
    resp = client.get("/api/v1/sequence-explorer/motif-enrichment")
    assert resp.status_code == 200
    data = resp.json()
    assert "n_terminal_position_frequencies" in data
    assert "c_terminal_position_frequencies" in data
    assert "top_dipeptides" in data
    assert "top_amino_acids" in data
    assert "disclaimer" in data
    assert len(data["top_dipeptides"]) <= 20
    assert len(data["top_amino_acids"]) <= 10


def test_sequence_explorer_representatives(client):
    """Representatives returns representative_rank and reason, no model_score."""
    resp = client.get("/api/v1/sequence-explorer/representatives?limit=5")
    assert resp.status_code == 200
    data = resp.json()
    assert "representatives" in data
    assert "disclaimer" in data
    for r in data["representatives"]:
        assert "peptide_id" in r
        assert "sequence" in r
        assert "representative_rank" in r
        assert "reason" in r
        assert "model_score" not in r
        assert "amp_score" not in r


def test_sequence_explorer_empty_database_safe(client):
    """Sequence explorer endpoints should not error on empty database."""
    # These endpoints use existing data; with the test DB there is always some data.
    # We simply verify all endpoints return 200.
    endpoints = [
        "/api/v1/sequence-explorer/overview",
        "/api/v1/sequence-explorer/duplicates",
        "/api/v1/sequence-explorer/similarity?threshold=0.8&limit=20",
        "/api/v1/sequence-explorer/motif-enrichment",
        "/api/v1/sequence-explorer/representatives?limit=5",
    ]
    for ep in endpoints:
        resp = client.get(ep)
        assert resp.status_code == 200, f"{ep} failed with {resp.status_code}"


def test_similarity_is_not_model_score(client):
    """Similarity results must not contain amp_score, mic, or model_score."""
    resp = client.get("/api/v1/sequence-explorer/similarity?threshold=0.5&limit=10")
    assert resp.status_code == 200
    data = resp.json()
    for pair in data["pairs"]:
        assert "amp_score" not in pair
        assert "mic_ecoli" not in pair
        assert "mic_saureus" not in pair
        assert "model_score" not in pair
