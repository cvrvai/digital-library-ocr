"""
Digital Library Manager.
Stores book metadata and full OCR transcripts in PostgreSQL (Docker),
and manages binary PDF files and cover thumbnails on disk.
Provides fast full-text searching across database records.
"""
import os
import json
import shutil
import uuid
import datetime
from typing import List, Dict, Any, Optional

from db import SessionLocal, BookModel


class LibraryManager:
    def __init__(self, storage_dir: str = "data/library"):
        self.storage_dir = os.path.abspath(storage_dir)
        os.makedirs(self.storage_dir, exist_ok=True)

    def _get_book_dir(self, book_id: str) -> str:
        return os.path.join(self.storage_dir, book_id)

    def add_book(
        self,
        title: str,
        author: str,
        description: str,
        tags: List[str],
        temp_pdf_path: str,
        temp_cover_path: Optional[str],
        pages_ocr_data: List[Dict[str, Any]]
    ) -> Dict[str, Any]:
        """
        Commit a compiled PDF book into the permanent library storage and database.
        """
        book_id = str(uuid.uuid4())[:8]
        book_dir = self._get_book_dir(book_id)
        os.makedirs(book_dir, exist_ok=True)

        # Move or copy PDF
        final_pdf_path = os.path.join(book_dir, "book.pdf")
        shutil.copy2(temp_pdf_path, final_pdf_path)

        # Move or copy Cover
        final_cover_path = os.path.join(book_dir, "cover.jpg")
        has_cover = False
        if temp_cover_path and os.path.exists(temp_cover_path):
            shutil.copy2(temp_cover_path, final_cover_path)
            has_cover = True

        # Generate Plaintext Transcript
        transcript_lines = []
        for idx, page in enumerate(pages_ocr_data):
            transcript_lines.append(f"--- Page {idx + 1} ---")
            lines = page.get("lines", [])
            for line in lines:
                transcript_lines.append(line.get("text", ""))
            transcript_lines.append("")

        full_transcript = "\n".join(transcript_lines)
        transcript_path = os.path.join(book_dir, "transcript.txt")
        with open(transcript_path, "w", encoding="utf-8") as f:
            f.write(full_transcript)

        # Calculate file size
        file_size_bytes = os.path.getsize(final_pdf_path)
        file_size_mb = round(file_size_bytes / (1024 * 1024), 2)
        created_at = datetime.datetime.now().isoformat()

        # Save to Database (PostgreSQL / SQLite fallback)
        session = SessionLocal()
        try:
            db_book = BookModel(
                id=book_id,
                title=title or "Untitled Book",
                author=author or "Unknown Author",
                description=description or "",
                tags=tags or [],
                page_count=len(pages_ocr_data),
                file_size_mb=file_size_mb,
                has_cover=has_cover,
                created_at=created_at,
                full_transcript=full_transcript,
                ocr_data=pages_ocr_data
            )
            session.add(db_book)
            session.commit()
            meta = db_book.to_dict()
        finally:
            session.close()

        # Also write local metadata.json as backup
        meta_path = os.path.join(book_dir, "metadata.json")
        with open(meta_path, "w", encoding="utf-8") as f:
            json.dump(meta, f, ensure_ascii=False, indent=2)

        return meta

    def list_books(self, search_query: Optional[str] = None) -> List[Dict[str, Any]]:
        """
        List books from database, with optional full-text search across
        title, author, description, tags, and full OCR page transcripts.
        """
        session = SessionLocal()
        try:
            query = session.query(BookModel)
            if not search_query:
                books = query.order_by(BookModel.created_at.desc()).all()
                return [b.to_dict() for b in books]

            q = f"%{search_query.strip()}%"
            # Search metadata and full OCR transcripts
            matched = query.filter(
                (BookModel.title.ilike(q)) |
                (BookModel.author.ilike(q)) |
                (BookModel.description.ilike(q)) |
                (BookModel.full_transcript.ilike(q))
            ).order_by(BookModel.created_at.desc()).all()

            results = []
            for b in matched:
                item = b.to_dict()
                if search_query.lower() in (b.full_transcript or "").lower():
                    item["ocr_match"] = True
                results.append(item)
            return results
        finally:
            session.close()

    def get_book(self, book_id: str) -> Optional[Dict[str, Any]]:
        session = SessionLocal()
        try:
            book = session.query(BookModel).filter(BookModel.id == book_id).first()
            return book.to_dict() if book else None
        finally:
            session.close()

    def get_book_files(self, book_id: str) -> Dict[str, Optional[str]]:
        book_dir = self._get_book_dir(book_id)
        pdf_path = os.path.join(book_dir, "book.pdf")
        cover_path = os.path.join(book_dir, "cover.jpg")
        transcript_path = os.path.join(book_dir, "transcript.txt")

        return {
            "pdf": pdf_path if os.path.exists(pdf_path) else None,
            "cover": cover_path if os.path.exists(cover_path) else None,
            "transcript": transcript_path if os.path.exists(transcript_path) else None,
        }

    def delete_book(self, book_id: str) -> bool:
        session = SessionLocal()
        try:
            book = session.query(BookModel).filter(BookModel.id == book_id).first()
            if book:
                session.delete(book)
                session.commit()
        finally:
            session.close()

        book_dir = self._get_book_dir(book_id)
        if os.path.exists(book_dir):
            shutil.rmtree(book_dir)
            return True
        return False
