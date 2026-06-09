import pytest
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)


def test_health():
    """L'endpoint /health doit toujours répondre 200."""
    res = client.get("/health")
    assert res.status_code == 200
    data = res.json()
    assert data["status"] == "ok"


def test_root():
    """La route racine doit retourner le nom de l'app."""
    res = client.get("/")
    assert res.status_code == 200
    assert "DataMind" in res.json()["app"] or "Text-to-SQL" in res.json()["app"]


def test_login_success():
    """Login admin doit retourner un token JWT."""
    res = client.post("/auth/login", json={
        "username": "admin",
        "password": "admin123"
    })
    assert res.status_code == 200
    assert "access_token" in res.json()
    assert res.json()["token_type"] == "bearer"


def test_login_failure():
    """Mauvais credentials doivent retourner 401."""
    res = client.post("/auth/login", json={
        "username": "hacker",
        "password": "wrongpassword"
    })
    assert res.status_code == 401


def test_query_without_token():
    """Query sans token doit retourner 403."""
    res = client.post("/query", json={
        "question": "test",
        "generate_visual": False
    })
    assert res.status_code in [401, 403]