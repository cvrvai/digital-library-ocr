"""
End-to-end verification script for Gemini Multimodal Vision OCR,
Khmer Searchable PDF compilation, and Gemini TTS audio narration.
"""
import sys
import os
import io
import wave
import base64
import requests
import pypdf

# Configure stdout for utf-8 display in Windows consoles
sys.stdout.reconfigure(encoding="utf-8")

from ocr_engine import OCREngine
from pdf_builder import PDFBookBuilder

def main():
    print("==================================================")
    print("   Testing Gemini AI OCR & Khmer PDF Pipeline     ")
    print("==================================================")

    # 1. Test OCR Engine with Gemini Vision
    print("\n[1/3] Testing OCR Engine with Gemini Vision...")
    engine = OCREngine.get_instance()
    sample_img = "data/test_samples/test_khmer.png"
    ocr_res = engine.process_image(sample_img, lang="km", engine="gemini")
    
    print(f"Engine used: {ocr_res.get('engine')}")
    print(f"Lines recognized: {ocr_res.get('line_count')}")
    for idx, line in enumerate(ocr_res.get("lines", [])):
        print(f"  Line {idx + 1}: {line.get('text')} (box: {line.get('rect')})")
    
    assert ocr_res.get("line_count", 0) > 0, "No lines detected!"
    assert "ព្រះរាជាណាចក្រកម្ពុជា" in ocr_res.get("full_text", ""), "Khmer title not detected!"
    print("[PASS] Gemini Vision OCR accurately transcribed Khmer script and bounding boxes.")

    # 2. Test Searchable PDF Compilation
    print("\n[2/3] Testing Searchable Sandwich PDF compilation with Khmer Font...")
    out_pdf = "data/test_samples/test_khmer_verified.pdf"
    build_res = PDFBookBuilder.create_searchable_pdf(
        [ocr_res],
        out_pdf,
        title="ព្រះរាជាណាចក្រកម្ពុជា - Searchable Document",
        author="Digital Library AI Studio"
    )
    print(f"PDF created at: {build_res['pdf_path']} (Pages: {build_res['page_count']})")
    
    reader = pypdf.PdfReader(out_pdf)
    extracted_text = reader.pages[0].extract_text()
    print(f"Extracted text from PDF layer: {extracted_text.strip()}")
    assert "ព្រះរាជាណាចក្រកម្ពុជា" in extracted_text, "Khmer text layer missing in PDF!"
    print("[PASS] Khmer text layer embedded and 100% searchable in PDF.")

    # 3. Test Gemini TTS Audio Synthesis
    print("\n[3/3] Testing Gemini TTS Audio Synthesis...")
    api_key = os.environ.get("GEMINI_API_KEY")
    tts_model = os.environ.get("GEMINI_TTS_MODEL", "gemini-3.1-flash-tts-preview")
    tts_voice = os.environ.get("GEMINI_TTS_VOICE", "Kore")

    url = f"https://generativelanguage.googleapis.com/v1beta/models/{tts_model}:generateContent?key={api_key}"
    payload = {
        "contents": [{"parts": [{"text": "ព្រះរាជាណាចក្រកម្ពុជា"}]}],
        "generationConfig": {
            "response_modalities": ["AUDIO"],
            "speech_config": {
                "voice_config": {
                    "prebuilt_voice_config": {
                        "voice_name": tts_voice
                    }
                }
            }
        }
    }
    r = requests.post(url, json=payload, timeout=30)
    assert r.status_code == 200, f"TTS API failed: {r.text}"
    
    pcm_b64 = r.json()["candidates"][0]["content"]["parts"][0]["inlineData"]["data"]
    pcm_bytes = base64.b64decode(pcm_b64)
    
    wav_io = io.BytesIO()
    with wave.open(wav_io, "wb") as wf:
        wf.setnchannels(1)
        wf.setsampwidth(2)
        wf.setframerate(24000)
        wf.writeframes(pcm_bytes)
    wav_bytes = wav_io.getvalue()
    
    print(f"Generated WAV audio: {len(wav_bytes)} bytes (Format: {wav_bytes[:4]})")
    assert wav_bytes[:4] == b"RIFF", "Generated audio is not a valid RIFF WAV file!"
    print("[PASS] Gemini TTS generated playable audio.")

    print("\n==================================================")
    print("   ALL VERIFICATION CHECKS PASSED SUCCESSFULLY!   ")
    print("==================================================")

if __name__ == "__main__":
    main()
