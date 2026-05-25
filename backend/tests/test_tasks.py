def test_list_tasks_empty(client):
    response = client.get("/api/v1/tasks")
    assert response.status_code == 200
    assert response.json() == []


def test_get_task_not_found(client):
    response = client.get("/api/v1/tasks/999")
    assert response.status_code == 404


def test_task_logs_not_found(client):
    response = client.get("/api/v1/tasks/999/logs")
    assert response.status_code == 404
