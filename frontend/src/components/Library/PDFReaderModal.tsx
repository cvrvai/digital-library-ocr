import React from "react";
import { X, Download, ExternalLink, BookOpen } from "lucide-react";
import type { LibraryBook } from "../../types";
import { libraryApi } from "../../api";

interface PDFReaderModalProps {
  book: LibraryBook | null;
  isOpen: boolean;
  onClose: () => void;
}

export const PDFReaderModal: React.FC<PDFReaderModalProps> = ({ book, isOpen, onClose }) => {
  if (!isOpen || !book) return null;

  const pdfUrl = libraryApi.getPdfUrl(book.id, false);
  const downloadPdfUrl = libraryApi.getPdfUrl(book.id, true);

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-2 sm:p-4">
      <div className="relative w-full max-w-6xl h-[92vh] bg-slate-900 border border-slate-800 rounded-2xl sm:rounded-3xl shadow-2xl flex flex-col overflow-hidden">
        {/* Header */}
        <div className="px-5 py-3.5 border-b border-slate-800 flex items-center justify-between bg-slate-950/80">
          <div className="flex items-center space-x-3 overflow-hidden">
            <div className="w-8 h-8 rounded-lg bg-indigo-600/20 text-indigo-400 flex items-center justify-center shrink-0">
              <BookOpen className="w-4 h-4" />
            </div>
            <div className="truncate">
              <h3 className="text-sm font-bold text-white truncate font-khmer">{book.title}</h3>
              <p className="text-xs text-slate-400 truncate font-khmer">
                {book.author} &bull; {book.page_count} Pages (Searchable Invisible Text Layer)
              </p>
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex items-center space-x-2 shrink-0">
            <a
              href={pdfUrl}
              target="_blank"
              rel="noreferrer"
              className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium border border-slate-700 transition"
              title="Open in new browser tab"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">New Tab</span>
            </a>

            <a
              href={downloadPdfUrl}
              download
              className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-medium shadow-sm transition"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Download PDF</span>
            </a>

            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Embedded PDF Viewer */}
        <div className="flex-1 bg-slate-950 w-full h-full">
          <iframe
            src={`${pdfUrl}#toolbar=1&navpanes=1`}
            title={book.title}
            className="w-full h-full border-0"
          />
        </div>
      </div>
    </div>
  );
};
