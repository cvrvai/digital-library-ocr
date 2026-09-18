"""
FastAPI Server for PaddleOCR Digital Library & Searchable PDF Book Builder.
"""
import os
import shutil
import uuid
import time
from typing import List, Optional
from fastapi import FastAPI, File, UploadFile, Form, HTTPException, Query
from fastapi.responses import FileResponse, JSONResponse
from fastapi.staticfiles import StaticFiles
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from ocr_engine import OCREngine
from pdf_builder import PDFBookBuilder
from library_manager import LibraryManager
import doc_scanner

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DATA_DIR = os.path.join(BASE_DIR, "data")
TEMP_DIR = os.path.join(DATA_DIR, "temp_sessions")
LIBRARY_DIR = os.path.join(DATA_DIR, "library")

os.makedirs(TEMP_DIR, exist_ok=True)
os.makedirs(LIBRARY_DIR, exist_ok=True)

app = FastAPI(title="PaddleOCR Digital Library", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Static and Templates
STATIC_DIR = os.path.join(BASE_DIR, "static")
TEMPLATES_DIR = os.path.join(BASE_DIR, "templates")
os.makedirs(STATIC_DIR, exist_ok=True)
os.makedirs(TEMPLATES_DIR, exist_ok=True)

app.mount("/static", StaticFiles(directory=STATIC_DIR), name="static")

library_mgr = LibraryManager(storage_dir=LIBRARY_DIR)
ocr_engine = OCREngine.get_instance()

# In-memory sessions store session state:
# sessions[session_id] = { "pages": [ {"id": ..., "image_path": ..., "ocr": ...} ] }
sessions = {}


class PageReorderRequest(BaseModel):
    page_ids: List[str]


class PageCropRequest(BaseModel):
    corners: List[List[float]]


class PageOCREditRequest(BaseModel):
    full_text: Optional[str] = None
    lines: Optional[List[dict]] = None


class CompileBookRequest(BaseModel):
    title: str = "Untitled Book"
    author: str = "Unknown Author"
    description: Optional[str] = ""
    tags: Optional[List[str]] = []


@app.get("/")
def get_index():
    index_file = os.path.join(TEMPLATES_DIR, "index.html")
    if os.path.exists(index_file):
        return FileResponse(index_file)
    return {"message": "Digital Library API running. Index template pending creation."}


# ---------------- Session & Page Management ----------------

@app.post("/api/session/create")
def create_session():
    session_id = str(uuid.uuid4())[:8]
    session_path = os.path.join(TEMP_DIR, session_id)
    os.makedirs(os.path.join(session_path, "images"), exist_ok=True)
    sessions[session_id] = {
        "id": session_id,
        "path": session_path,
        "pages": []  # ordered list of page dicts
    }
    return {"session_id": session_id}


@app.post("/api/session/{session_id}/upload")
async def upload_images(
    session_id: str,
    files: List[UploadFile] = File(...),
    auto_ocr: bool = Form(True),
    auto_crop: bool = Form(True),
    lang: str = Form("en")
):
    if session_id not in sessions:
        session_path = os.path.join(TEMP_DIR, session_id)
        os.makedirs(os.path.join(session_path, "images"), exist_ok=True)
        sessions[session_id] = {
            "id": session_id,
            "path": session_path,
            "pages": []
        }

    session = sessions[session_id]
    uploaded_pages = []

    for file in files:
        if not file.filename:
            continue
        ext = os.path.splitext(file.filename)[1].lower()
        if ext not in [".jpg", ".jpeg", ".png", ".webp", ".bmp", ".tif", ".tiff"]:
            continue

        page_id = str(uuid.uuid4())[:8]
        filename = f"page_{len(session['pages']) + 1:03d}_{page_id}{ext}"
        file_path = os.path.join(session["path"], "images", filename)

        with open(file_path, "wb") as f:
            content = await file.read()
            f.write(content)

        original_file_path = file_path
        active_image_path = file_path
        was_flattened = False

        if auto_crop:
            try:
                # First check for dominant tilt/skew angle
                deskewed_filename = f"deskewed_{filename}"
                deskewed_path = os.path.join(session["path"], "images", deskewed_filename)
                _, deskew_angle = doc_scanner.auto_deskew_image(file_path, deskewed_path)
                if abs(deskew_angle) >= 2.0:
                    active_image_path = deskewed_path
                    was_flattened = True
                else:
                    corners, is_book = doc_scanner.detect_document_corners(file_path, return_is_found=True)
                    if is_book:
                        cropped_filename = f"cropped_{filename}"
                        cropped_path = os.path.join(session["path"], "images", cropped_filename)
                        doc_scanner.warp_perspective_document(file_path, corners, cropped_path)
                        active_image_path = cropped_path
                        was_flattened = True
            except Exception as e:
                print(f"[AUTO-CROP ERROR] {e}")

        ocr_res = None
        ocr_status = "pending"

        if auto_ocr:
            try:
                ocr_res = ocr_engine.process_image(active_image_path, lang=lang)
                ocr_status = "completed"
            except Exception as e:
                print(f"[OCR ERROR] {e}")
                ocr_status = "failed"

        now_ts = time.time()
        page_info = {
            "id": page_id,
            "filename": file.filename,
            "stored_filename": filename,
            "original_image_path": original_file_path,
            "image_path": active_image_path,
            "is_flattened": was_flattened,
            "ocr_status": ocr_status,
            "ocr_result": ocr_res,
            "updated_at": now_ts,
        }
        session["pages"].append(page_info)
        uploaded_pages.append({
            "id": page_id,
            "filename": file.filename,
            "ocr_status": ocr_status,
            "preview_url": f"/api/session/{session_id}/page/{page_id}/preview",
            "is_flattened": was_flattened,
            "ocr_result": ocr_res,
            "updated_at": now_ts
        })

    return {
        "session_id": session_id,
        "total_pages": len(session["pages"]),
        "uploaded_pages": uploaded_pages
    }


@app.get("/api/session/{session_id}/pages")
def get_session_pages(session_id: str):
    if session_id not in sessions:
        raise HTTPException(status_code=404, detail="Session not found")
    session = sessions[session_id]
    result = []
    for p in session["pages"]:
        result.append({
            "id": p["id"],
            "filename": p["filename"],
            "ocr_status": p["ocr_status"],
            "preview_url": f"/api/session/{session_id}/page/{p['id']}/preview",
            "has_ocr": p["ocr_result"] is not None,
            "ocr_result": p["ocr_result"],
            "is_flattened": p.get("is_flattened", False),
            "updated_at": p.get("updated_at", 0)
        })
    return {"session_id": session_id, "pages": result}


@app.get("/api/session/{session_id}/page/{page_id}/preview")
def get_page_preview(session_id: str, page_id: str, orig: bool = False):
    if session_id not in sessions:
        raise HTTPException(status_code=404, detail="Session not found")
    page = next((p for p in sessions[session_id]["pages"] if p["id"] == page_id), None)
    if not page:
        raise HTTPException(status_code=404, detail="Page not found")
    target_path = page.get("original_image_path", page["image_path"]) if orig else page["image_path"]
    if not os.path.exists(target_path):
        raise HTTPException(status_code=404, detail="Page image not found")
    return FileResponse(target_path)


@app.get("/api/session/{session_id}/page/{page_id}/corners")
def get_page_corners(session_id: str, page_id: str):
    if session_id not in sessions:
        raise HTTPException(status_code=404, detail="Session not found")
    page = next((p for p in sessions[session_id]["pages"] if p["id"] == page_id), None)
    if not page or not os.path.exists(page["image_path"]):
        raise HTTPException(status_code=404, detail="Page image not found")

    orig_path = page.get("original_image_path", page["image_path"])
    corners = doc_scanner.detect_document_corners(orig_path)
    from PIL import Image as PILImage
    with PILImage.open(orig_path) as im:
        orig_w, orig_h = im.size
    return {
        "page_id": page_id,
        "corners": corners,
        "width": orig_w,
        "height": orig_h,
        "preview_url": f"/api/session/{session_id}/page/{page_id}/preview?orig=1" if "original_image_path" in page else f"/api/session/{session_id}/page/{page_id}/preview"
    }


@app.post("/api/session/{session_id}/page/{page_id}/crop")
def apply_page_crop(session_id: str, page_id: str, req: PageCropRequest):
    if session_id not in sessions:
        raise HTTPException(status_code=404, detail="Session not found")
    session = sessions[session_id]
    page = next((p for p in session["pages"] if p["id"] == page_id), None)
    if not page or not os.path.exists(page["image_path"]):
        raise HTTPException(status_code=404, detail="Page not found")

    if "original_image_path" not in page:
        page["original_image_path"] = page["image_path"]

    orig_path = page["original_image_path"]
    cropped_filename = f"cropped_{page['stored_filename']}"
    cropped_path = os.path.join(session["path"], "images", cropped_filename)

    doc_scanner.warp_perspective_document(orig_path, req.corners, cropped_path)
    page["image_path"] = cropped_path
    page["is_flattened"] = True
    now_ts = time.time()
    page["updated_at"] = now_ts

    # Immediately re-run OCR on the flattened page
    try:
        ocr_res = ocr_engine.process_image(cropped_path, lang="en")
        page["ocr_status"] = "completed"
        page["ocr_result"] = ocr_res
    except Exception as e:
        print(f"[CROP OCR ERROR] {e}")
        page["ocr_status"] = "failed"
        ocr_res = None

    return {
        "message": "Perspective flattening applied and OCR re-scanned",
        "page_id": page_id,
        "preview_url": f"/api/session/{session_id}/page/{page_id}/preview",
        "ocr_result": page["ocr_result"],
        "is_flattened": True,
        "updated_at": now_ts
    }


@app.post("/api/session/{session_id}/page/{page_id}/auto_flatten")
def auto_flatten_page(session_id: str, page_id: str):
    if session_id not in sessions:
        raise HTTPException(status_code=404, detail="Session not found")
    session = sessions[session_id]
    page = next((p for p in session["pages"] if p["id"] == page_id), None)
    if not page or not os.path.exists(page["image_path"]):
        raise HTTPException(status_code=404, detail="Page not found")

    if "original_image_path" not in page:
        page["original_image_path"] = page["image_path"]

    orig_path = page["original_image_path"]
    deskewed_filename = f"deskewed_{page['stored_filename']}"
    deskewed_path = os.path.join(session["path"], "images", deskewed_filename)
    _, deskew_angle = doc_scanner.auto_deskew_image(orig_path, deskewed_path)
    if abs(deskew_angle) >= 2.0:
        page["image_path"] = deskewed_path
    else:
        corners = doc_scanner.detect_document_corners(orig_path)
        cropped_filename = f"cropped_{page['stored_filename']}"
        cropped_path = os.path.join(session["path"], "images", cropped_filename)
        doc_scanner.warp_perspective_document(orig_path, corners, cropped_path)
        page["image_path"] = cropped_path
    page["is_flattened"] = True
    now_ts = time.time()
    page["updated_at"] = now_ts

    try:
        ocr_res = ocr_engine.process_image(cropped_path, lang="en")
        page["ocr_status"] = "completed"
        page["ocr_result"] = ocr_res
    except Exception as e:
        print(f"[AUTO FLATTEN OCR ERROR] {e}")
        page["ocr_status"] = "failed"
        ocr_res = None

    return {
        "message": "Document automatically detected, straightened, and OCR scanned!",
        "page_id": page_id,
        "preview_url": f"/api/session/{session_id}/page/{page_id}/preview",
        "ocr_result": page["ocr_result"],
        "is_flattened": True,
        "updated_at": now_ts
    }


@app.post("/api/session/{session_id}/reorder")
def reorder_pages(session_id: str, req: PageReorderRequest):
    if session_id not in sessions:
        raise HTTPException(status_code=404, detail="Session not found")
    session = sessions[session_id]
    page_map = {p["id"]: p for p in session["pages"]}
    new_pages = []
    for pid in req.page_ids:
        if pid in page_map:
            new_pages.append(page_map[pid])
    # Append any remaining pages that were not mentioned
    for p in session["pages"]:
        if p["id"] not in req.page_ids:
            new_pages.append(p)
    session["pages"] = new_pages
    return {"message": "Pages reordered successfully", "total_pages": len(new_pages)}


@app.delete("/api/session/{session_id}/page/{page_id}")
def delete_page(session_id: str, page_id: str):
    if session_id not in sessions:
        raise HTTPException(status_code=404, detail="Session not found")
    session = sessions[session_id]
    idx = next((i for i, p in enumerate(session["pages"]) if p["id"] == page_id), None)
    if idx is not None:
        p = session["pages"].pop(idx)
        if os.path.exists(p["image_path"]):
            try:
                os.remove(p["image_path"])
            except Exception:
                pass
        return {"message": "Page deleted", "total_pages": len(session["pages"])}
    raise HTTPException(status_code=404, detail="Page not found")


# ---------------- OCR Processing ----------------

@app.post("/api/session/{session_id}/ocr")
def run_ocr(
    session_id: str,
    page_id: Optional[str] = Query(None),
    lang: str = Query("en")
):
    if session_id not in sessions:
        raise HTTPException(status_code=404, detail="Session not found")
    session = sessions[session_id]

    target_pages = []
    if page_id:
        p = next((x for x in session["pages"] if x["id"] == page_id), None)
        if not p:
            raise HTTPException(status_code=404, detail="Page not found")
        target_pages.append(p)
    else:
        # All pages
        target_pages = session["pages"]

    results = []
    for p in target_pages:
        try:
            res = ocr_engine.process_image(p["image_path"], lang=lang)
            p["ocr_status"] = "completed"
            p["ocr_result"] = res
            results.append({
                "page_id": p["id"],
                "status": "completed",
                "line_count": res["line_count"],
                "ocr_result": res
            })
        except Exception as e:
            p["ocr_status"] = "failed"
            results.append({
                "page_id": p["id"],
                "status": "failed",
                "error": str(e)
            })

    return {
        "session_id": session_id,
        "processed_count": len(results),
        "results": results
    }


@app.put("/api/session/{session_id}/page/{page_id}/ocr")
def update_page_ocr(session_id: str, page_id: str, req: PageOCREditRequest):
    if session_id not in sessions:
        raise HTTPException(status_code=404, detail="Session not found")
    page = next((p for p in sessions[session_id]["pages"] if p["id"] == page_id), None)
    if not page:
        raise HTTPException(status_code=404, detail="Page not found")

    if page.get("ocr_result") is None:
        page["ocr_result"] = {"lines": [], "full_text": ""}

    if req.full_text is not None:
        page["ocr_result"]["full_text"] = req.full_text

    if req.lines is not None:
        page["ocr_result"]["lines"] = req.lines
        page["ocr_result"]["line_count"] = len(req.lines)

    return {"message": "OCR text updated", "ocr_result": page["ocr_result"]}


# ---------------- Compile to PDF Book & Digital Library ----------------

@app.post("/api/session/{session_id}/compile")
def compile_book(session_id: str, req: CompileBookRequest):
    if session_id not in sessions:
        raise HTTPException(status_code=404, detail="Session not found")
    session = sessions[session_id]
    if not session["pages"]:
        raise HTTPException(status_code=400, detail="No pages uploaded in this session")

    # Ensure OCR is run on all pages if not run already
    pages_data = []
    for p in session["pages"]:
        if p.get("ocr_result") is None:
            try:
                res = ocr_engine.process_image(p["image_path"], lang="en")
                p["ocr_status"] = "completed"
                p["ocr_result"] = res
            except Exception:
                p["ocr_result"] = {"lines": [], "full_text": "", "image_path": p["image_path"]}

        pages_data.append({
            "image_path": p["image_path"],
            "lines": p["ocr_result"].get("lines", []),
            "full_text": p["ocr_result"].get("full_text", "")
        })

    # Output paths for temporary compiled PDF
    temp_pdf_name = f"compiled_{session_id}.pdf"
    temp_cover_name = f"cover_{session_id}.jpg"
    temp_pdf_path = os.path.join(session["path"], temp_pdf_name)
    temp_cover_path = os.path.join(session["path"], temp_cover_name)

    build_res = PDFBookBuilder.create_searchable_pdf(
        pages_data=pages_data,
        output_pdf_path=temp_pdf_path,
        title=req.title,
        author=req.author,
        subject=req.description,
        keywords=", ".join(req.tags) if req.tags else "",
        cover_output_path=temp_cover_path
    )

    # Save to Digital Library
    book_meta = library_mgr.add_book(
        title=req.title,
        author=req.author,
        description=req.description or "",
        tags=req.tags or [],
        temp_pdf_path=temp_pdf_path,
        temp_cover_path=temp_cover_path,
        pages_ocr_data=pages_data
    )

    return {
        "message": "PDF Book compiled and added to Digital Library!",
        "book": book_meta,
        "download_url": f"/api/library/{book_meta['id']}/pdf",
        "cover_url": f"/api/library/{book_meta['id']}/cover" if book_meta["has_cover"] else None
    }


# ---------------- Digital Library Endpoints ----------------

@app.get("/api/library")
def list_library_books(q: Optional[str] = Query(None)):
    books = library_mgr.list_books(search_query=q)
    return {"count": len(books), "books": books}


@app.get("/api/library/{book_id}")
def get_book_details(book_id: str):
    book = library_mgr.get_book(book_id)
    if not book:
        raise HTTPException(status_code=404, detail="Book not found")
    return book


@app.get("/api/library/{book_id}/pdf")
def get_book_pdf(book_id: str, download: bool = Query(False)):
    files = library_mgr.get_book_files(book_id)
    if not files.get("pdf"):
        raise HTTPException(status_code=404, detail="PDF not found")

    book = library_mgr.get_book(book_id)
    safe_title = (book.get("title", "book") if book else "book").replace(" ", "_")
    filename = f"{safe_title}.pdf"

    disposition = "attachment" if download else "inline"
    return FileResponse(
        files["pdf"],
        media_type="application/pdf",
        headers={"Content-Disposition": f'{disposition}; filename="{filename}"'}
    )


@app.get("/api/library/{book_id}/cover")
def get_book_cover(book_id: str):
    files = library_mgr.get_book_files(book_id)
    if not files.get("cover"):
        raise HTTPException(status_code=404, detail="Cover not found")
    return FileResponse(files["cover"], media_type="image/jpeg")


@app.get("/api/library/{book_id}/transcript")
def get_book_transcript(book_id: str, download: bool = Query(False)):
    files = library_mgr.get_book_files(book_id)
    if not files.get("transcript"):
        raise HTTPException(status_code=404, detail="Transcript not found")
    book = library_mgr.get_book(book_id)
    safe_title = (book.get("title", "transcript") if book else "transcript").replace(" ", "_")
    filename = f"{safe_title}_transcript.txt"
    disposition = "attachment" if download else "inline"
    return FileResponse(
        files["transcript"],
        media_type="text/plain; charset=utf-8",
        headers={"Content-Disposition": f'{disposition}; filename="{filename}"'}
    )


@app.get("/api/library/{book_id}/ocr_data")
def get_book_ocr_data(book_id: str):
    files = library_mgr.get_book_files(book_id)
    if not files.get("ocr"):
        raise HTTPException(status_code=404, detail="OCR data not found")
    return FileResponse(files["ocr"], media_type="application/json")


@app.delete("/api/library/{book_id}")
def delete_library_book(book_id: str):
    success = library_mgr.delete_book(book_id)
    if not success:
        raise HTTPException(status_code=404, detail="Book not found")
    return {"message": "Book deleted from library"}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app:app", host="127.0.0.1", port=8000, reload=True)
