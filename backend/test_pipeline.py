"""
End-to-end verification script for PaddleOCR Digital Library pipeline:
1. Generates test book page images.
2. Runs PaddleOCR inference.
3. Compiles a Searchable 'Sandwich' PDF.
4. Validates that the text layer is extractable and searchable via pypdf.
5. Tests LibraryManager indexing and full-text search.
"""
import os
import sys
from PIL import Image, ImageDraw, ImageFont
import pypdf

def create_sample_page(output_path: str, page_num: int, title: str, paragraphs: list):
    width, height = 800, 1100
    img = Image.new("RGB", (width, height), color=(250, 249, 246))  # Book paper color
    draw = ImageDraw.Draw(img)

    try:
        font_title = ImageFont.truetype("arial.ttf", 32)
        font_body = ImageFont.truetype("arial.ttf", 20)
        font_small = ImageFont.truetype("arial.ttf", 14)
    except Exception:
        font_title = ImageFont.load_default()
        font_body = ImageFont.load_default()
        font_small = ImageFont.load_default()

    # Header
    draw.text((60, 60), "Digital Library Collection", fill=(120, 120, 120), font=font_small)
    draw.line([(60, 85), (740, 85)], fill=(200, 200, 200), width=1)
    
    # Title
    draw.text((60, 120), title, fill=(20, 20, 20), font=font_title)

    # Paragraphs
    y = 190
    for para in paragraphs:
        draw.text((60, y), para, fill=(40, 40, 40), font=font_body)
        y += 45

    # Footer
    draw.line([(60, 1020), (740, 1020)], fill=(200, 200, 200), width=1)
    draw.text((380, 1040), f"- Page {page_num} -", fill=(120, 120, 120), font=font_small)

    os.makedirs(os.path.dirname(output_path), exist_ok=True)
    img.save(output_path, quality=95)
    print(f"Created sample page at: {output_path}")


def main():
    print("=== Testing PaddleOCR Digital Library Pipeline ===")
    
    # 1. Create sample pages
    test_dir = "data/test_samples"
    page1_path = os.path.join(test_dir, "sample_page_1.png")
    page2_path = os.path.join(test_dir, "sample_page_2.png")

    create_sample_page(
        page1_path,
        page_num=1,
        title="The Art of Digital Preservation",
        paragraphs=[
            "Digital libraries enable timeless preservation of human knowledge.",
            "Using PaddleOCR, document scans are transformed into searchable volumes.",
            "Every printed word is recognized with high precision.",
            "Archival materials gain new life in the digital universe."
        ]
    )

    create_sample_page(
        page2_path,
        page_num=2,
        title="Searchable Sandwich PDF Technology",
        paragraphs=[
            "A sandwich PDF combines original scans with an invisible text layer.",
            "The reader perceives the authentic texture of the paper.",
            "Simultaneously, full-text searching and selection function seamlessly.",
            "Keywords like Preservation, Heritage, and Archives are instantly located."
        ]
    )

    # 2. Test OCR Engine
    print("\n--- Running PaddleOCR Inference ---")
    from ocr_engine import OCREngine
    engine = OCREngine.get_instance()
    
    res1 = engine.process_image(page1_path, lang="en")
    print(f"Page 1 OCR Lines detected: {res1['line_count']}")
    for line in res1["lines"][:3]:
        print(f"  Detected: '{line['text']}' (confidence: {line['confidence']})")

    res2 = engine.process_image(page2_path, lang="en")
    print(f"Page 2 OCR Lines detected: {res2['line_count']}")

    # 3. Test Searchable PDF Builder
    print("\n--- Building Searchable PDF Book ---")
    from pdf_builder import PDFBookBuilder
    test_pdf_path = "data/test_output/sample_book.pdf"
    test_cover_path = "data/test_output/cover.jpg"

    pages_data = [
        {"image_path": page1_path, "lines": res1["lines"], "full_text": res1["full_text"]},
        {"image_path": page2_path, "lines": res2["lines"], "full_text": res2["full_text"]},
    ]

    pdf_res = PDFBookBuilder.create_searchable_pdf(
        pages_data=pages_data,
        output_pdf_path=test_pdf_path,
        title="Preservation Chronicles",
        author="Archival Society",
        subject="Digital Preservation and OCR",
        keywords="Preservation, Heritage, Archives",
        cover_output_path=test_cover_path
    )
    print(f"Searchable PDF generated at: {pdf_res['pdf_path']}")
    print(f"Page count: {pdf_res['page_count']}")

    # 4. Verify PDF has searchable text layer using pypdf
    print("\n--- Verifying Invisible Text Layer with pypdf ---")
    reader = pypdf.PdfReader(test_pdf_path)
    assert len(reader.pages) == 2, f"Expected 2 pages, got {len(reader.pages)}"
    
    page1_text = reader.pages[0].extract_text()
    print("Page 1 Extracted Text Sample:")
    print(page1_text[:200] if len(page1_text) > 200 else page1_text)
    assert "preservation" in page1_text.lower() or "digital" in page1_text.lower(), "Text layer verification failed!"
    print("SUCCESS: Text layer verified searchable in PDF!")

    # 5. Test Digital Library Manager
    print("\n--- Testing Digital Library Catalog & Full-Text Search ---")
    from library_manager import LibraryManager
    lib = LibraryManager(storage_dir="data/library")
    book_meta = lib.add_book(
        title="Preservation Chronicles",
        author="Archival Society",
        description="A demonstration volume on OCR and digital archives",
        tags=["preservation", "ocr", "digital library"],
        temp_pdf_path=test_pdf_path,
        temp_cover_path=test_cover_path,
        pages_ocr_data=pages_data
    )
    print(f"Book added to library with ID: {book_meta['id']}")

    # Search by title
    matches = lib.list_books(search_query="Chronicles")
    print(f"Search 'Chronicles': found {len(matches)} match(es)")
    assert len(matches) > 0

    # Full-text search inside OCR transcript
    ocr_matches = lib.list_books(search_query="Sandwich")
    print(f"Search OCR content 'Sandwich': found {len(ocr_matches)} match(es)")
    assert len(ocr_matches) > 0

    print("\n=========================================================")
    print("ALL VERIFICATION TESTS PASSED SUCCESSFULLY! 100% WORKING")
    print("=========================================================")

if __name__ == "__main__":
    main()
