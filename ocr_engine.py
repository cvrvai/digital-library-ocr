"""
OCR Engine wrapper for PaddleOCR with PP-OCRv6, Document Orientation Classification,
and Document Unwarping.
"""
import os
from typing import List, Dict, Any, Optional
from PIL import Image

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

    def get_ocr(self, lang: str = "en"):
        key = lang
        if key not in self._models:
            if PaddleOCR is None:
                raise RuntimeError(
                    "PaddleOCR is not installed or failed to import. "
                    "Please ensure paddlepaddle and paddleocr are installed."
                )
            # PP-OCRv6 pipeline with textline orientation
            # We intentionally do not use use_doc_orientation_classify=True because on angled camera
            # photos with desk clutter it frequently misclassifies documents as 180° inverted (upside down)
            # and returns bounding boxes displaced from the source image.
            # Document straightening and perspective flattening is handled cleanly by doc_scanner.
            self._models[key] = PaddleOCR(
                lang=lang,
                use_textline_orientation=True
            )
        return self._models[key]

    def process_image(
        self,
        image_path: str,
        lang: str = "en"
    ) -> Dict[str, Any]:
        """
        Run OCR on an image file.
        Returns image dimensions, list of text blocks with bounding boxes and confidence.
        """
        if not os.path.exists(image_path):
            raise FileNotFoundError(f"Image not found at {image_path}")

        # Get image dimensions
        with Image.open(image_path) as img:
            width, height = img.size

        ocr = self.get_ocr(lang=lang)
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
                
                # Bounding polygon
                poly = None
                if i < len(rec_polys) and rec_polys[i] is not None:
                    p = rec_polys[i]
                    poly = p.tolist() if hasattr(p, "tolist") else p

                # Bounding box [x_min, y_min, x_max, y_max]
                box_coords = None
                if i < len(rec_boxes) and rec_boxes[i] is not None:
                    b = rec_boxes[i]
                    box_coords = b.tolist() if hasattr(b, "tolist") else b

                # If 4-point poly is missing, construct from box
                if not poly and box_coords and len(box_coords) == 4:
                    poly = [
                        [box_coords[0], box_coords[1]],
                        [box_coords[2], box_coords[1]],
                        [box_coords[2], box_coords[3]],
                        [box_coords[0], box_coords[3]],
                    ]

                # Rect info for canvas & PDF
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
            "line_count": len(lines)
        }
