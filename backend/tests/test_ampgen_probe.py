def test_ampgen_probe(client):
    response = client.get("/api/v1/system/ampgen-probe")
    assert response.status_code == 200
    data = response.json()
    assert "ampgen_root" in data
    assert "exists" in data
    assert "items" in data
    assert "all_present" in data
    assert isinstance(data["items"], dict)
    assert "AMP_generator" in data["items"]
