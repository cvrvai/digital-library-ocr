"""
Database management with SQLAlchemy for PostgreSQL (in Docker) and SQLite fallback.
"""
import os
import json
from sqlalchemy import create_engine, Column, String, Integer, Float, Boolean, Text, JSON
from sqlalchemy.orm import declarative_base, sessionmaker, scoped_session

DATABASE_URL = os.environ.get(
    "DATABASE_URL",
    "postgresql://postgres:postgrespassword@localhost:5432/digital_library"
)

Base = declarative_base()


class BookModel(Base):
    __tablename__ = "books"

    id = Column(String(36), primary_key=True)
    title = Column(String(255), nullable=False)
    author = Column(String(255), default="Unknown Author")
    description = Column(Text, default="")
    tags = Column(JSON, default=list)
    page_count = Column(Integer, default=0)
    file_size_mb = Column(Float, default=0.0)
    has_cover = Column(Boolean, default=False)
    created_at = Column(String(50), nullable=False)
    full_transcript = Column(Text, default="")
    ocr_data = Column(JSON, default=list)

    def to_dict(self):
        return {
            "id": self.id,
            "title": self.title,
            "author": self.author,
            "description": self.description,
            "tags": self.tags if isinstance(self.tags, list) else [],
            "page_count": self.page_count,
            "file_size_mb": self.file_size_mb,
            "has_cover": self.has_cover,
            "created_at": self.created_at
        }


def get_engine():
    try:
        # Try connecting to PostgreSQL
        engine = create_engine(DATABASE_URL, pool_pre_ping=True)
        with engine.connect() as conn:
            pass
        return engine, "PostgreSQL (Docker)"
    except Exception as e:
        print(f"[DB] PostgreSQL unavailable ({e}), falling back to SQLite.")
        sqlite_path = os.path.abspath("data/digital_library.db")
        os.makedirs(os.path.dirname(sqlite_path), exist_ok=True)
        sqlite_url = f"sqlite:///{sqlite_path}"
        engine = create_engine(sqlite_url, connect_args={"check_same_thread": False})
        return engine, "SQLite (Local Fallback)"


engine, db_type = get_engine()
Base.metadata.create_all(bind=engine)
SessionLocal = scoped_session(sessionmaker(autocommit=False, autoflush=False, bind=engine))
