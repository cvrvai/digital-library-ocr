import sys
import os

sys.stdout.reconfigure(encoding="utf-8")
from ocr_engine import OCREngine

images = [
    r"C:\Users\Administrator\.gemini\antigravity\brain\4dab90cd-9ff0-4f3d-b539-250e1787ad3e\.user_uploaded\media_1789732042689.jpg",
    r"C:\Users\Administrator\.gemini\antigravity\brain\4dab90cd-9ff0-4f3d-b539-250e1787ad3e\.user_uploaded\media_1789732042692.jpg",
    r"C:\Users\Administrator\.gemini\antigravity\brain\4dab90cd-9ff0-4f3d-b539-250e1787ad3e\.user_uploaded\media_1789732042699.jpg",
    r"C:\Users\Administrator\.gemini\antigravity\brain\4dab90cd-9ff0-4f3d-b539-250e1787ad3e\.user_uploaded\media_1789732042701.jpg",
    r"C:\Users\Administrator\.gemini\antigravity\brain\4dab90cd-9ff0-4f3d-b539-250e1787ad3e\.user_uploaded\media_1789732042865.jpg"
]

engine = OCREngine.get_instance()
for i, path in enumerate(images, 1):
    print(f"==================== IMAGE {i} ====================")
    print(f"Path: {os.path.basename(path)}")
    try:
        res = engine.process_image(path, lang="km", engine="gemini")
        print("--- EXTRACTED TEXT ---")
        print(res.get("full_text", "").strip())
        print("\n--- DETECTED SEGMENTS ---")
        for line in res.get("lines", []):
            print(f"• {line.get('text')} [box: {line.get('rect')}]")
    except Exception as e:
        print(f"Error: {e}")
    print()
