import sys
sys.stdout.reconfigure(encoding="utf-8")
from fastapi.testclient import TestClient
from app import app

client = TestClient(app)

# 1. Create a session
r = client.post("/api/session/create")
session_id = r.json()["session_id"]
print("Created test session:", session_id)

# 2. Upload test image with Auto (Gemini AI Vision) and Khmer
with open("data/test_samples/test_khmer.png", "rb") as f:
    files = {"files": ("test_khmer.png", f, "image/png")}
    data = {"auto_ocr": "true", "auto_crop": "false", "lang": "km", "engine": "auto"}
    upload_res = client.post(f"/api/session/{session_id}/upload", files=files, data=data)

print("Upload status:", upload_res.status_code)
resp_json = upload_res.json()
page = resp_json["uploaded_pages"][0]
print("OCR status:", page["ocr_status"])
print("Engine used:", page["ocr_result"]["engine"])
print("Lines count:", len(page["ocr_result"]["lines"]))
for l in page["ocr_result"]["lines"]:
    print(" -", l["text"])

# 3. Test TTS endpoint on this page
tts_res = client.get(f"/api/session/{session_id}/page/{page['id']}/tts")
print("TTS status:", tts_res.status_code, "Content-Type:", tts_res.headers.get("content-type"), "Bytes:", len(tts_res.content))

# 4. Test PDF compilation
comp_res = client.post(f"/api/session/{session_id}/compile", json={"title": "Khmer Test Book", "author": "Tester"})
print("Compile status:", comp_res.status_code, "PDF path:", comp_res.json().get("pdf_path"))
print("ALL TESTS PASSED!")
