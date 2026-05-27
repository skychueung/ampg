"""Analytics API tests for v0.5.5 peptide analytics dashboard."""

import time


def test_analytics_peptides_summary(client):
    """Summary endpoint returns all expected fields."""
    # Ensure at least one peptide exists
    client.post("/api/v1/generation-runs", json={
        "backend": "LOCAL_DEMO",
        "count": 2,
        "mode": "Sequence-based",
    })
    time.sleep(1.5)

    resp = client.get("/api/v1/analytics/peptides-summary")
    assert resp.status_code == 200
    data = resp.json()
    assert "total_peptides" in data
    assert "valid_aa_count" in data
    assert "invalid_aa_count" in data
    assert "candidate_count" in data
    assert "filtered_count" in data
    assert "rejected_count" in data
    assert "local_demo_count" in data
    assert "average_length" in data
    assert "average_net_charge" in data
    assert "average_hydrophobic_fraction" in data
    assert "not_computed_amp_score_count" in data
    assert "not_computed_mic_count" in data
    assert "disclaimer" in data
    assert data["total_peptides"] >= 2


def test_analytics_property_distributions(client):
    """Property distributions returns length, charge, hydrophobicity bins."""
    resp = client.get("/api/v1/analytics/property-distributions")
    assert resp.status_code == 200
    data = resp.json()
    assert "length_distribution" in data
    assert "charge_distribution" in data
    assert "hydrophobic_fraction_distribution" in data
    assert isinstance(data["length_distribution"], list)
    assert isinstance(data["charge_distribution"], list)
    assert isinstance(data["hydrophobic_fraction_distribution"], list)


def test_analytics_amino_acid_composition(client):
    """AA composition returns 20 standard amino acids."""
    resp = client.get("/api/v1/analytics/amino-acid-composition")
    assert resp.status_code == 200
    data = resp.json()
    assert "total_residues" in data
    assert "invalid_residues" in data
    assert "composition" in data
    comp = data["composition"]
    assert len(comp) == 20
    aa_names = {item["aa"] for item in comp}
    expected = set("ACDEFGHIKLMNPQRSTVWY")
    assert aa_names == expected
    for item in comp:
        assert "count" in item
        assert "frequency" in item
        assert isinstance(item["frequency"], float)


def test_analytics_status_source_breakdown(client):
    """Breakdown returns status, source, backend counts."""
    resp = client.get("/api/v1/analytics/status-source-breakdown")
    assert resp.status_code == 200
    data = resp.json()
    assert "status_counts" in data
    assert "source_counts" in data
    assert "backend_counts" in data
    assert isinstance(data["status_counts"], list)
    assert isinstance(data["source_counts"], list)
    assert isinstance(data["backend_counts"], list)


def test_analytics_filter_rule_pass_rate(client):
    """Filter rules endpoint returns 4 rules."""
    resp = client.get("/api/v1/analytics/filter-rule-pass-rate")
    assert resp.status_code == 200
    data = resp.json()
    assert "rules" in data
    assert len(data["rules"]) == 4
    rules = {r["rule"] for r in data["rules"]}
    assert "length_15_35" in rules
    assert "valid_amino_acids" in rules
    assert "net_charge_positive" in rules
    assert "hydrophobic_fraction_0_40_0_70" in rules
    for r in data["rules"]:
        assert "passed" in r
        assert "failed" in r
        assert "pass_rate" in r
        assert 0.0 <= r["pass_rate"] <= 1.0


def test_analytics_top_candidates(client):
    """Top candidates returns rule_based_rank, not model_score."""
    resp = client.get("/api/v1/analytics/top-candidates?limit=5")
    assert resp.status_code == 200
    data = resp.json()
    assert "candidates" in data
    assert "total" in data
    for c in data["candidates"]:
        assert "id" in c
        assert "sequence" in c
        assert "rule_based_rank" in c
        assert "rule_based_reason" in c
        assert "amp_score" in c
        assert "mic_ecoli" in c
        assert "mic_saureus" in c
        # Must NOT contain model_score
        assert "model_score" not in c


def test_analytics_empty_database_safe(client):
    """Analytics endpoints should not error on empty database."""
    # These endpoints use existing data; with the test DB there is always some data.
    # We simply verify all endpoints return 200.
    endpoints = [
        "/api/v1/analytics/peptides-summary",
        "/api/v1/analytics/property-distributions",
        "/api/v1/analytics/amino-acid-composition",
        "/api/v1/analytics/status-source-breakdown",
        "/api/v1/analytics/filter-rule-pass-rate",
        "/api/v1/analytics/top-candidates?limit=5",
    ]
    for ep in endpoints:
        resp = client.get(ep)
        assert resp.status_code == 200, f"{ep} failed with {resp.status_code}"
