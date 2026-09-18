"""
PDF Book Builder using ReportLab and PIL.
Generates Searchable 'Sandwich' PDFs where the original scanned image is displayed,
and an invisible text layer (PDF render_mode=3) is placed at exact coordinates,
enabling text selection, copying, and Ctrl+F searching in any PDF viewer.
Includes full support for Khmer Unicode and multilingual scripts.
"""
import os
from typing import List, Dict, Any, Optional
from PIL import Image
from reportlab.pdfgen import canvas
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont

# Register Unicode & Khmer TrueType Font
UNICODE_FONT_NAME = "Helvetica"
_font_candidates = [
    os.path.join(os.path.dirname(os.path.abspath(__file__)), "static", "fonts", "NotoSansKhmer-Regular.ttf"),
    os.path.join(os.path.dirname(os.path.abspath(__file__)), "static", "fonts", "KhmerOSBattambang.ttf"),
    "C:/Windows/Fonts/LeelawUI.ttf",
    "C:/Windows/Fonts/Nirmala.ttf",
    "C:/Windows/Fonts/arial.ttf",
]

for fp in _font_candidates:
    if os.path.exists(fp):
        try:
            pdfmetrics.registerFont(TTFont("UniversalUnicodeFont", fp))
            UNICODE_FONT_NAME = "UniversalUnicodeFont"
            break
        except Exception as e:
            print(f"[PDF FONT REGISTRATION] Could not register {fp}: {e}")


class PDFBookBuilder:
    @staticmethod
    def create_searchable_pdf(
        pages_data: List[Dict[str, Any]],
        output_pdf_path: str,
        title: str = "Untitled Book",
        author: str = "Unknown Author",
        subject: str = "",
        keywords: str = "",
        cover_output_path: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        pages_data is a list of dicts, each containing:
          - "image_path": str (path to image)
          - "lines": list of dicts:
              - "text": str
              - "box": [[x1, y1], [x2, y2], [x3, y3], [x4, y4]]
              - "confidence": float (optional)
          - "full_text": str (optional)
        """
        os.makedirs(os.path.dirname(os.path.abspath(output_pdf_path)), exist_ok=True)
        canv = canvas.Canvas(output_pdf_path)

        # Set PDF metadata
        canv.setTitle(title or "Untitled Book")
        canv.setAuthor(author or "Unknown Author")
        canv.setSubject(subject or "Digitized by AI Digital Library Studio")
        canv.setCreator("AI Digital Library Studio")

        page_count = 0
        first_image_path = None

        for page_idx, page_item in enumerate(pages_data):
            img_path = page_item.get("image_path")
            if not img_path or not os.path.exists(img_path):
                continue

            if first_image_path is None:
                first_image_path = img_path

            # Open image to get dimensions
            with Image.open(img_path) as pil_img:
                img_w, img_h = pil_img.size

            # Set PDF canvas page size to match image pixels precisely
            canv.setPageSize((img_w, img_h))

            # Draw the original crisp scanned image across the entire page
            canv.drawImage(img_path, 0, 0, width=img_w, height=img_h)

            # Create invisible text layer (render_mode = 3: "Neither fill nor stroke text")
            textobject = canv.beginText()
            textobject.setTextRenderMode(3)

            lines = page_item.get("lines", [])
            for line in lines:
                text = str(line.get("text", "")).strip()
                if not text:
                    continue

                box = line.get("box")
                if box and len(box) == 4:
                    xs = [float(p[0]) for p in box]
                    ys = [float(p[1]) for p in box]
                    x0, x1 = min(xs), max(xs)
                    y0, y1 = min(ys), max(ys)
                    box_h = max(1.0, y1 - y0)
                    box_w = max(1.0, x1 - x0)

                    # Baseline in PDF coordinates (origin at bottom-left)
                    pdf_x = max(0.0, x0)
                    pdf_y = max(0.0, img_h - (y0 + box_h * 0.82))

                    # Font size approximated to line box height
                    fontsize = max(6.0, min(box_h * 0.85, 120.0))

                    # Select appropriate font (Khmer / Unicode vs Latin)
                    has_unicode = any(ord(c) > 127 for c in text)
                    font_to_use = UNICODE_FONT_NAME if (has_unicode and UNICODE_FONT_NAME != "Helvetica") else "Helvetica"

                    try:
                        textobject.setFont(font_to_use, fontsize)
                        textobject.setTextOrigin(pdf_x, pdf_y)
                        textobject.textLine(text)
                    except Exception as font_err:
                        # Fallback attempt
                        try:
                            textobject.setFont("Helvetica", fontsize)
                            textobject.setTextOrigin(pdf_x, pdf_y)
                            textobject.textLine(text)
                        except Exception:
                            pass

            canv.drawText(textobject)
            canv.showPage()
            page_count += 1

        canv.save()

        # Generate cover thumbnail using PIL from the first page image
        if cover_output_path and first_image_path and os.path.exists(first_image_path):
            os.makedirs(os.path.dirname(os.path.abspath(cover_output_path)), exist_ok=True)
            try:
                with Image.open(first_image_path) as im:
                    im_rgb = im.convert("RGB")
                    im_rgb.thumbnail((400, 560), Image.Resampling.LANCZOS)
                    im_rgb.save(cover_output_path, "JPEG", quality=85)
            except Exception as e:
                print(f"Cover thumbnail generation error: {e}")

        return {
            "pdf_path": output_pdf_path,
            "page_count": page_count,
            "cover_path": cover_output_path
        }
