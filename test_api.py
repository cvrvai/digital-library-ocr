"""
Verify FastAPI endpoints and web UI serving.
"""
from fastapi.testclient import TestClient
from app import app

def test_endpoints():
    client = TestClient(app)
    
    # 1. Test index page
    res = client.get("/")
    assert res.status_code == 200
    assert "PaddleOCR" in res.text
    print("GET / -> 200 OK (HTML UI served)")

    # 2. Test library listing
    res = client.get("/api/library")
    assert res.status_code == 200
    data = res.json()
    assert "books" in data
    print(f"GET /api/library -> 200 OK ({data['count']} book(s) in catalog)")

    # 3. Test library search
    res = client.get("/api/library?q=Chronicles")
    assert res.status_code == 200
    data = res.json()
    assert data["count"] >= 1
    print(f"GET /api/library?q=Chronicles -> 200 OK ({data['count']} match)")

    # 4. Test session creation
    res = client.post("/api/session/create")
    assert res.status_code == 200
    session_id = res.json()["session_id"]
    print(f"POST /api/session/create -> 200 OK (Session: {session_id})")

    # 5. Test PDF and Cover endpoints for existing book in library
    if data["books"]:
        book_id = data["books"][0]["id"]
        res_pdf = client.get(f"/api/library/{book_id}/pdf")
        assert res_pdf.status_code == 200
        print(f"GET /api/library/{book_id}/pdf -> 200 OK ({len(res_pdf.content)} bytes)")

        res_cover = client.get(f"/api/library/{book_id}/cover")
        assert res_cover.status_code == 200
        print(f"GET /api/library/{book_id}/cover -> 200 OK ({len(res_cover.content)} bytes)")

    print("\nALL API ENDPOINTS VERIFIED AND HEALTHY!")

if __name__ == "__main__":
    test_endpoints()
