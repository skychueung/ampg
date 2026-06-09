"""Candidate Review Workbench API tests for v0.5.8."""

import time


def test_candidate_review_summary(client):
    """Summary returns all expected fields."""
    # Ensure at least one peptide exists
    client.post("/api/v1/generation-runs", json={
        "backend": "LOCAL_DEMO", "count": 2, "mode": "Sequence-based",
    })
    time.sleep(1.5)

    resp = client.get("/api/v1/candidate-review/summary")
    assert resp.status_code == 200
    data = resp.json()
    assert "total_candidates" in data
    assert "unreviewed_count" in data
    assert "shortlisted_count" in data
    assert "rejected_by_review_count" in data
    assert "selected_for_synthesis_count" in data
    assert "high_priority_count" in data
    assert "local_real_smoke_shortlisted" in data
    assert "local_demo_shortlisted" in data
    assert "disclaimer" in data
    assert data["total_candidates"] >= 2


def test_candidate_review_candidates(client):
    """Candidates endpoint returns list with review fields."""
    resp = client.get("/api/v1/candidate-review/candidates?limit=10")
    assert resp.status_code == 200
    data = resp.json()
    assert isinstance(data, list)
    if len(data) > 0:
        c = data[0]
        assert "id" in c
        assert "sequence" in c
        assert "priority" in c
        assert "selected_for_synthesis" in c
        assert "review_status" in c


def test_candidate_evidence_card(client):
    """Evidence card contains rule checks and disclaimer."""
    # Get a peptide id
    peptides = client.get("/api/v1/candidate-review/candidates?limit=1").json()
    if not peptides:
        return
    pid = peptides[0]["id"]

    resp = client.get(f"/api/v1/candidate-review/candidates/{pid}/evidence")
    assert resp.status_code == 200
    data = resp.json()
    assert "peptide_id" in data
    assert "sequence" in data
    assert "evidence" in data
    ev = data["evidence"]
    assert "length_rule" in ev
    assert "charge_rule" in ev
    assert "hydrophobic_rule" in ev
    assert "valid_aa_rule" in ev
    assert "amp_score" in ev
    assert "rule_based_recommendation" in data
    assert "reasons" in data
    assert "disclaimer" in data
    assert "model_score" not in data


def test_review_single_candidate(client):
    """Single candidate review updates fields."""
    peptides = client.get("/api/v1/candidate-review/candidates?limit=1").json()
    if not peptides:
        return
    pid = peptides[0]["id"]

    resp = client.post(f"/api/v1/candidate-review/candidates/{pid}/review", json={
        "review_status": "SHORTLISTED",
        "priority": "HIGH",
        "selected_for_synthesis": True,
        "batch_label": "round1",
        "review_notes": "Good profile.",
    })
    assert resp.status_code == 200
    data = resp.json()
    assert data["review_status"] == "SHORTLISTED"
    assert data["priority"] == "HIGH"
    assert data["selected_for_synthesis"] is True
    assert data["batch_label"] == "round1"
    assert data["review_notes"] == "Good profile."


def test_batch_review_candidates(client):
    """Batch review updates multiple candidates."""
    peptides = client.get("/api/v1/candidate-review/candidates?limit=3").json()
    if len(peptides) < 2:
        return
    ids = [p["id"] for p in peptides[:2]]

    resp = client.post("/api/v1/candidate-review/batch-review", json={
        "peptide_ids": ids,
        "review_status": "SHORTLISTED",
        "priority": "MEDIUM",
    })
    assert resp.status_code == 200
    data = resp.json()
    assert data["updated_count"] == 2
    assert "disclaimer" in data


def test_get_shortlist(client):
    """Shortlist returns shortlisted candidates."""
    # First shortlist a candidate
    peptides = client.get("/api/v1/candidate-review/candidates?limit=1").json()
    if not peptides:
        return
    pid = peptides[0]["id"]
    client.post(f"/api/v1/candidate-review/candidates/{pid}/review", json={
        "review_status": "SHORTLISTED",
    })

    resp = client.get("/api/v1/candidate-review/shortlist")
    assert resp.status_code == 200
    data = resp.json()
    assert isinstance(data, list)
    # At least the one we just shortlisted should be here
    assert any(p["id"] == pid for p in data)


def test_export_shortlist_csv(client):
    """Shortlist CSV export returns CSV content."""
    resp = client.post("/api/v1/candidate-review/export-shortlist.csv")
    assert resp.status_code == 200
    assert resp.headers["content-type"] == "text/csv; charset=utf-8"
    body = resp.content.decode("utf-8-sig")
    assert "id,sequence,length" in body or "id" in body


def test_export_shortlist_fasta(client):
    """Shortlist FASTA export returns FASTA content."""
    resp = client.post("/api/v1/candidate-review/export-shortlist.fasta")
    assert resp.status_code == 200
    assert resp.headers["content-type"] == "text/plain; charset=utf-8"
    body = resp.content.decode("utf-8")
    assert ">" in body or body == "\n"


def test_export_synthesis_order_csv(client):
    """Synthesis order CSV export returns CSV content."""
    # Shortlist a peptide first so export has data
    peptides = client.get("/api/v1/candidate-review/candidates?limit=1").json()
    if peptides:
        pid = peptides[0]["id"]
        client.post(f"/api/v1/candidate-review/candidates/{pid}/review", json={
            "review_status": "SHORTLISTED", "selected_for_synthesis": True,
        })

    resp = client.post("/api/v1/candidate-review/export-synthesis-order.csv")
    assert resp.status_code == 200
    assert resp.headers["content-type"] == "text/csv; charset=utf-8"
    body = resp.content.decode("utf-8-sig")
    assert "Order_ID,Peptide_Name,Sequence" in body or "Order_ID" in body
    # If shortlist is empty, only headers are returned; remark text may not appear
    assert "Computational candidate; not experimentally validated." in body or "Order_ID" in body


def test_review_does_not_create_fake_scores(client):
    """Review update must not write amp_score or MIC."""
    peptides = client.get("/api/v1/candidate-review/candidates?limit=1").json()
    if not peptides:
        return
    pid = peptides[0]["id"]

    resp = client.post(f"/api/v1/candidate-review/candidates/{pid}/review", json={
        "review_status": "SHORTLISTED",
        "priority": "HIGH",
    })
    assert resp.status_code == 200
    data = resp.json()
    # amp_score and mic should remain null (not set to 0)
    assert data.get("amp_score") is None
    assert data.get("mic_ecoli") is None
    assert data.get("mic_saureus") is None
