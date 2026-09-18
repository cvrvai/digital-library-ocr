import React from "react";
import { BookOpen, Download, FileText, Trash2, Calendar, Layers } from "lucide-react";
import type { LibraryBook } from "../../types";
import { libraryApi } from "../../api";

interface BookCardProps {
  book: LibraryBook;
  onRead: (book: LibraryBook) => void;
  onDelete: (bookId: string) => Promise<void>;
}

export const BookCard: React.FC<BookCardProps> = ({ book, onRead, onDelete }) => {
  const coverUrl = libraryApi.getCoverUrl(book.id);
  const pdfDownloadUrl = libraryApi.getPdfUrl(book.id, true);
  const transcriptUrl = libraryApi.getTranscriptUrl(book.id, true);

  const formattedDate = book.created_at
    ? new Date(book.created_at).toLocaleDateString(undefined, {
        year: "numeric",
        month: "short",
        day: "numeric",
      })
    : "Recently added";

  return (
    <div className="group bg-slate-900/70 border border-slate-800 hover:border-slate-700/80 rounded-2xl overflow-hidden shadow-lg hover:shadow-indigo-500/5 transition-all flex flex-col">
      {/* Top Half: Book Cover Image & Quick Action */}
      <div
        className="relative aspect-[3/4] bg-slate-950 overflow-hidden cursor-pointer flex items-center justify-center"
        onClick={() => onRead(book)}
      >
        <img
          src={coverUrl}
          alt={book.title}
          onError={(e) => {
            (e.target as HTMLElement).style.display = "none";
          }}
          className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
        />

        {/* Read overlay button */}
        <div className="absolute inset-0 bg-slate-950/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
          <span className="flex items-center space-x-2 px-4 py-2 rounded-xl bg-indigo-600 text-white text-xs font-semibold shadow-lg">
            <BookOpen className="w-4 h-4" />
            <span>Read PDF</span>
          </span>
        </div>

        {/* Page count badge */}
        <div className="absolute top-2.5 right-2.5 px-2 py-0.5 rounded-md bg-slate-900/85 backdrop-blur-sm border border-slate-700/60 text-[11px] font-medium text-slate-300 flex items-center space-x-1">
          <Layers className="w-3 h-3 text-indigo-400" />
          <span>{book.page_count} p.</span>
        </div>
      </div>

      {/* Bottom Half: Book Details */}
      <div className="p-4 flex-1 flex flex-col justify-between space-y-3">
        <div>
          <h4
            className="font-bold text-slate-100 text-sm leading-snug line-clamp-2 hover:text-indigo-400 cursor-pointer font-khmer transition"
            onClick={() => onRead(book)}
            title={book.title}
          >
            {book.title}
          </h4>

          <p className="text-xs text-slate-400 mt-1 truncate font-khmer">
            {book.author || "Unknown Author"}
          </p>

          {book.description && (
            <p className="text-[11px] text-slate-500 mt-2 line-clamp-2 leading-relaxed font-khmer">
              {book.description}
            </p>
          )}

          {/* Tags */}
          {book.tags && book.tags.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-2.5">
              {book.tags.slice(0, 3).map((tag, i) => (
                <span
                  key={i}
                  className="text-[10px] px-2 py-0.5 rounded bg-slate-800/90 text-indigo-300 border border-slate-700/50"
                >
                  {tag}
                </span>
              ))}
              {book.tags.length > 3 && (
                <span className="text-[10px] px-1.5 py-0.5 text-slate-500">
                  +{book.tags.length - 3}
                </span>
              )}
            </div>
          )}
        </div>

        {/* Footer info & download icons */}
        <div className="pt-3 border-t border-slate-800/80 flex items-center justify-between text-xs text-slate-500">
          <span className="flex items-center space-x-1 text-[11px]">
            <Calendar className="w-3 h-3 text-slate-500" />
            <span>{formattedDate}</span>
          </span>

          <div className="flex items-center space-x-1">
            <a
              href={pdfDownloadUrl}
              download
              className="p-1.5 rounded-lg text-slate-400 hover:text-indigo-400 hover:bg-slate-800 transition"
              title="Download Searchable Sandwich PDF"
            >
              <Download className="w-4 h-4" />
            </a>

            <a
              href={transcriptUrl}
              download
              className="p-1.5 rounded-lg text-slate-400 hover:text-teal-400 hover:bg-slate-800 transition"
              title="Download OCR Text Transcript (.txt)"
            >
              <FileText className="w-4 h-4" />
            </a>

            <button
              onClick={() => onDelete(book.id)}
              className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition"
              title="Delete Book from Library"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
