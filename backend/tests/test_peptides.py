def test_list_peptides_empty(client):
    response = client.get("/api/v1/peptides")
    assert response.status_code == 200
    assert response.json() == []


def test_get_peptide_not_found(client):
    response = client.get("/api/v1/peptides/999")
    assert response.status_code == 404


def test_patch_peptide_not_found(client):
    response = client.patch("/api/v1/peptides/999", json={"status": "CANDIDATE"})
    assert response.status_code == 404


def test_delete_peptide_not_found(client):
    response = client.delete("/api/v1/peptides/999")
    assert response.status_code == 404
