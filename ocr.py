"""
Simple CLI for Text OCR (Khmer, English, Multilingual).
Extracts clean text directly from any document or book image.

Usage:
    python ocr.py <image_path> [--lang km] [--output result.txt]
"""
import sys
import os
import argparse

# Enable utf-8 printing on Windows
sys.stdout.reconfigure(encoding="utf-8")

from ocr_engine import OCREngine


def main():
    parser = argparse.ArgumentParser(description="Quick Text OCR with Gemini AI Vision & PaddleOCR")
    parser.add_argument("image", help="Path to image file (jpg, png, webp, etc.)")
    parser.add_argument("--lang", default="km", help="Language code (km for Khmer, en for English, etc.)")
    parser.add_argument("--engine", default="auto", choices=["auto", "gemini", "paddleocr"], help="OCR engine to use")
    parser.add_argument("--output", "-o", help="Optional path to save extracted text to a .txt file")

    args = parser.parse_args()

    if not os.path.exists(args.image):
        print(f"Error: Image not found at '{args.image}'")
        sys.exit(1)

    print(f"Scanning '{args.image}' (engine: {args.engine}, lang: {args.lang})...\n")
    engine = OCREngine.get_instance()
    res = engine.process_image(args.image, lang=args.lang, engine=args.engine)

    full_text = res.get("full_text", "").strip()
    print("=" * 50)
    print("EXTRACTED TEXT:")
    print("=" * 50)
    print(full_text)
    print("=" * 50)

    if args.output:
        with open(args.output, "w", encoding="utf-8") as f:
            f.write(full_text)
        print(f"\n[OK] Saved extracted text to '{args.output}'")


if __name__ == "__main__":
    main()
