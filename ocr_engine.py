"""
OCR Engine wrapper supporting:
1. Google Gemini Multimodal Vision AI (State-of-the-art for Khmer, dense book pages, mixed font sizes)
2. Local PaddleOCR (Fast offline OCR for Latin, Chinese, etc.)
"""
import os
import json
import base64
import time
from typing import List, Dict, Any, Optional
from PIL import Image
import requests

# Load .env configuration if present
_env_file = os.path.join(os.path.dirname(os.path.abspath(__file__)), ".env")
if os.path.exists(_env_file):
    with open(_env_file, "r", encoding="utf-8") as f:
        for line in f:
            line = line.strip()
            if line and not line.startswith("#") and "=" in line:
                k, v = line.split("=", 1)
                os.environ.setdefault(k.strip(), v.strip())

try:
    from paddleocr import PaddleOCR
except ImportError:
    PaddleOCR = None


class OCREngine:
    _instance: Optional["OCREngine"] = None

    @classmethod
    def get_instance(cls) -> "OCREngine":
        if cls._instance is None:
            cls._instance = cls()
        return cls._instance

    def __init__(self):
        self.default_lang = "en"
        self._models: Dict[str, Any] = {}
        self.gemini_api_key = os.environ.get("GEMINI_API_KEY", "").strip()
        self.gemini_model = os.environ.get("GEMINI_TEXT_MODEL", "gemini-3.5-flash-lite").strip()

    def get_paddle_ocr(self, lang: str = "en"):
        key = lang
        if key not in self._models:
            if PaddleOCR is None:
                raise RuntimeError(
                    "PaddleOCR is not installed or failed to import. "
                    "Please ensure paddlepaddle and paddleocr are installed."
                )
            # PP-OCR pipeline with textline orientation and high-resolution detection limits
            self._models[key] = PaddleOCR(
                lang=lang,
                use_textline_orientation=True,
                det_limit_side_len=2400,
                det_limit_type='max',
                det_db_thresh=0.25,
                det_db_box_thresh=0.50,
                det_db_unclip_ratio=1.8
            )
        return self._models[key]

    def process_with_gemini(
        self,
        image_path: str,
        lang: str = "en"
    ) -> Dict[str, Any]:
        """
        Runs Gemini Multimodal Vision OCR.
        Preserves complex scripts (Khmer ជើង/vowels), dense book pages, and huge titles.
        Returns line-level text, exact bounding boxes, and full transcript.
        """
        if not self.gemini_api_key:
            raise ValueError("GEMINI_API_KEY is not configured in .env or environment")

        with Image.open(image_path) as img:
            width, height = img.size
            img_format = img.format.lower() if img.format else "jpeg"
            mime_type = "image/png" if img_format == "png" else "image/jpeg"

        with open(image_path, "rb") as f:
            image_b64 = base64.b64encode(f.read()).decode("utf-8")

        prompt = (
            "You are a master Khmer linguist and state-of-the-art document OCR engine. Transcribe all text in this image with highest precision.\n"
            "Important guidelines:\n"
            "1. Pay meticulous attention to scripts like Khmer: transcribe base consonants, subscript feet/ជើង, "
            "upper/lower vowels, and diacritics accurately, as well as English words, digits, and punctuation.\n"
            "2. Carefully read stylized, artistic, 3D, perspective, shaded, and decorative book/movie/comic title fonts. "
            "Use visual glyph structure combined with Khmer linguistic context to accurately recognize complete title words.\n"
            "3. Transcribe both large titles/headings and small footnotes/captions without skipping any content.\n"
            "4. Follow natural reading order (in multi-column layouts, read column 1 top-to-bottom then column 2).\n"
            "5. Return a JSON object with two keys:\n"
            "   - 'lines': an array of line objects, each having:\n"
            "       'text': exact transcribed text string\n"
            "       'box_2d': [ymin, xmin, ymax, xmax] coordinates normalized from 0 to 1000\n"
            "       'confidence': estimated confidence between 0.0 and 1.0\n"
            "   - 'full_text': full text of the document formatted with natural paragraph breaks\n"
        )

        url = f"https://generativelanguage.googleapis.com/v1beta/models/{self.gemini_model}:generateContent?key={self.gemini_api_key}"
        payload = {
            "contents": [
                {
                    "parts": [
                        {"text": prompt},
                        {
                            "inline_data": {
                                "mime_type": mime_type,
                                "data": image_b64
                            }
                        }
                    ]
                }
            ],
            "generationConfig": {
                "response_mime_type": "application/json",
                "temperature": 0.1
            }
        }

        response = requests.post(url, json=payload, timeout=60)
        if response.status_code != 200:
            raise RuntimeError(f"Gemini API error ({response.status_code}): {response.text}")

        data = response.json()
        raw_text = data["candidates"][0]["content"]["parts"][0]["text"]
        parsed = json.loads(raw_text)

        raw_lines = parsed.get("lines", [])
        lines: List[Dict[str, Any]] = []
        full_text_list: List[str] = []

        for item in raw_lines:
            text = str(item.get("text", "")).strip()
            if not text:
                continue

            raw_box = item.get("box_2d")
            # Handle possible nested list [[ymin, xmin, ymax, xmax]]
            if isinstance(raw_box, list) and len(raw_box) > 0 and isinstance(raw_box[0], list):
                raw_box = raw_box[0]

            if isinstance(raw_box, (list, tuple)) and len(raw_box) == 4:
                ymin, xmin, ymax, xmax = [float(v) for v in raw_box]
                # Scale from 0..1000 to actual image width and height
                x0 = round((xmin / 1000.0) * width, 1)
                y0 = round((ymin / 1000.0) * height, 1)
                x1 = round((xmax / 1000.0) * width, 1)
                y1 = round((ymax / 1000.0) * height, 1)
                
                # Bounding polygon: [top-left, top-right, bottom-right, bottom-left]
                poly = [
                    [x0, y0],
                    [x1, y0],
                    [x1, y1],
                    [x0, y1]
                ]
                rect = {
                    "x": min(x0, x1),
                    "y": min(y0, y1),
                    "width": abs(x1 - x0),
                    "height": abs(y1 - y0)
                }
            else:
                poly = [[0, 0], [width, 0], [width, 20], [0, 20]]
                rect = {"x": 0, "y": 0, "width": width, "height": 20}

            conf = float(item.get("confidence", 0.98))
            lines.append({
                "text": text,
                "confidence": round(conf, 4),
                "box": poly,
                "rect": rect
            })
            full_text_list.append(text)

        full_text = parsed.get("full_text")
        if not full_text or not full_text.strip():
            full_text = "\n".join(full_text_list)

        return {
            "image_path": image_path,
            "width": width,
            "height": height,
            "lines": lines,
            "full_text": full_text,
            "line_count": len(lines),
            "engine": "gemini"
        }

    def process_with_paddle(
        self,
        image_path: str,
        lang: str = "en"
    ) -> Dict[str, Any]:
        """
        Runs local PaddleOCR inference with tuned detection thresholds.
        """
        with Image.open(image_path) as img:
            width, height = img.size

        ocr = self.get_paddle_ocr(lang=lang)
        results = ocr.predict(image_path)

        lines: List[Dict[str, Any]] = []
        full_text_list: List[str] = []

        for result in results:
            data = getattr(result, "json", {})
            res = data.get("res", {})
            rec_texts = res.get("rec_texts", [])
            rec_scores = res.get("rec_scores", [])
            rec_boxes = res.get("rec_boxes", [])
            rec_polys = res.get("rec_polys", [])

            for i, text in enumerate(rec_texts):
                score = float(rec_scores[i]) if i < len(rec_scores) else 1.0

                poly = None
                if i < len(rec_polys) and rec_polys[i] is not None:
                    p = rec_polys[i]
                    poly = p.tolist() if hasattr(p, "tolist") else p

                box_coords = None
                if i < len(rec_boxes) and rec_boxes[i] is not None:
                    b = rec_boxes[i]
                    box_coords = b.tolist() if hasattr(b, "tolist") else b

                if not poly and box_coords and len(box_coords) == 4:
                    poly = [
                        [box_coords[0], box_coords[1]],
                        [box_coords[2], box_coords[1]],
                        [box_coords[2], box_coords[3]],
                        [box_coords[0], box_coords[3]],
                    ]

                if poly and len(poly) == 4:
                    xs = [p[0] for p in poly]
                    ys = [p[1] for p in poly]
                    rect = {
                        "x": min(xs),
                        "y": min(ys),
                        "width": max(xs) - min(xs),
                        "height": max(ys) - min(ys)
                    }
                elif box_coords and len(box_coords) == 4:
                    rect = {
                        "x": box_coords[0],
                        "y": box_coords[1],
                        "width": box_coords[2] - box_coords[0],
                        "height": box_coords[3] - box_coords[1]
                    }
                else:
                    rect = {"x": 0, "y": 0, "width": width, "height": 20}

                lines.append({
                    "text": text,
                    "confidence": round(score, 4),
                    "box": poly,
                    "rect": rect
                })
                full_text_list.append(text)

        full_text = "\n".join(full_text_list)

        return {
            "image_path": image_path,
            "width": width,
            "height": height,
            "lines": lines,
            "full_text": full_text,
            "line_count": len(lines),
            "engine": "paddleocr"
        }

    def process_image(
        self,
        image_path: str,
        lang: str = "en",
        engine: str = "auto"
    ) -> Dict[str, Any]:
        """
        Unified OCR entry point.
        engine: "auto", "gemini", or "paddleocr"
        """
        if not os.path.exists(image_path):
            raise FileNotFoundError(f"Image not found at {image_path}")

        # Auto selection logic
        use_gemini = False
        if engine == "gemini":
            use_gemini = True
        elif engine == "paddleocr":
            use_gemini = False
        else:  # "auto"
            # Prefer Gemini if key is present or if language is Khmer
            if lang in ["km", "khmer"] or bool(self.gemini_api_key):
                use_gemini = True

        if use_gemini and self.gemini_api_key:
            try:
                return self.process_with_gemini(image_path, lang=lang)
            except Exception as e:
                print(f"[GEMINI OCR ERROR] {e}. Falling back to PaddleOCR if supported.")
                if lang in ["km", "khmer"]:
                    raise  # PaddleOCR doesn't support Khmer, re-raise exception

        return self.process_with_paddle(image_path, lang=lang)
