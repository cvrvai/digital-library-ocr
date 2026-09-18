# PaddleOCR Digital Library & Searchable PDF Book Studio

A complete, high-performance platform to digitize book pages and document scans using [PaddleOCR](https://github.com/PaddlePaddle/PaddleOCR.git), compile them into professional **Searchable "Sandwich" PDF Books**, and manage them inside a searchable **Digital Library** backed by **Docker PostgreSQL** and accessible globally via **Cloudflare Tunnel**.

---

## 🌟 Key Features

1. **PaddleOCR Engine**:
   - High-accuracy text detection and recognition.
   - Text angle classification (`use_angle_cls=True`) for automatic orientation correction.
   - Multilingual support: English, Chinese, French, German, Japanese, Korean, Latin.

2. **Interactive Book Studio**:
   - Batch drag-and-drop upload of scanned pages / photos (`PNG`, `JPG`, `WEBP`, `TIFF`).
   - Page Sequencer: Drag or use arrow controls to reorder book pages before PDF creation.
   - Page Inspector: Side-by-side view with visual bounding-box overlay and editable OCR text for quick corrections.

3. **Searchable "Sandwich" PDF Generation**:
   - Preserves 100% of the original scan resolution and visual aesthetics.
   - Overlays an invisible, selectable text layer (`render_mode=3` in PDF specification) directly aligned with PaddleOCR bounding box coordinates.
   - Fully searchable (`Ctrl + F`) and selectable in any standard PDF reader (Adobe Acrobat, Chrome, Edge, Safari).
   - Generates cover thumbnails and embeds document metadata.

4. **Docker Database (PostgreSQL)**:
   - Full persistence using PostgreSQL 16 Alpine running in Docker.
   - Automatic schema creation and indexation of metadata and full-text OCR transcripts.
   - Graceful fallback to local SQLite if Docker is temporarily offline.

5. **Cloudflare Public HTTPS Domain**:
   - Generate an instant public HTTPS domain on `*.trycloudflare.com` with one command.
   - Access your digital library securely from your phone, tablet, or external networks without opening router ports or static IPs.

---

## 🚀 How to Run

### 1. Start the Digital Library Server (with Docker Database)
In **PowerShell**:
```powershell
docker compose up -d
.\.venv\Scripts\python.exe app.py
```
*(Or double-click `start.bat`)*

Open your browser at: `http://127.0.0.1:8000`

---

### 2. Generate a Cloudflare Public HTTPS Domain
To make your library accessible from anywhere over the internet:

In **PowerShell**:
```powershell
& "C:\Program Files (x86)\cloudflared\cloudflared.exe" tunnel --url http://127.0.0.1:8000
```
*(Or double-click `start_cloudflare.bat`)*

Cloudflare will instantly print a public HTTPS URL, for example:
```
https://xxxx-xxxx-xxxx.trycloudflare.com
```
You can open this URL from any device anywhere in the world!

---

## 📁 Project Structure

```
digital library/
├── PaddleOCR/           # Cloned official PaddlePaddle/PaddleOCR repository
├── docker-compose.yml   # PostgreSQL container configuration
├── db.py                # Database connection & SQLAlchemy models
├── data/
│   ├── library/         # Permanent digital library books
│   │   └── {book_id}/
│   │       ├── book.pdf         # The compiled Searchable PDF
│   │       ├── metadata.json    # Book metadata backup
│   │       ├── cover.jpg        # Cover thumbnail
│   │       └── transcript.txt   # Plain-text OCR transcript
│   └── temp_sessions/   # Working directories for active upload sessions
├── static/
│   ├── app.js           # Interactive UI logic & bounding box rendering
│   └── style.css        # UI styling & animations
├── templates/
│   └── index.html       # Single-page web application
├── app.py               # FastAPI backend & REST endpoints
├── ocr_engine.py        # PaddleOCR wrapper & inference handler
├── pdf_builder.py       # Searchable PDF compiler
├── library_manager.py   # Catalog indexing & database queries
├── start.bat            # Windows one-click batch launcher
├── start.ps1            # PowerShell launcher
├── start_cloudflare.bat # Cloudflare public domain generator (Batch)
└── start_cloudflare.ps1 # Cloudflare public domain generator (PowerShell)
```
