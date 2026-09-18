import React, { useState } from "react";
import { Search, Library, PlusCircle, BookOpen, Layers, Loader2 } from "lucide-react";
import type { LibraryBook } from "../../types";
import { BookCard } from "./BookCard";

interface BookGridProps {
  books: LibraryBook[];
  isLoading: boolean;
  onReadBook: (book: LibraryBook) => void;
  onDeleteBook: (bookId: string) => Promise<void>;
  onGoToStudio: () => void;
  searchQuery: string;
  onSearchChange: (query: string) => void;
}

export const BookGrid: React.FC<BookGridProps> = ({
  books,
  isLoading,
  onReadBook,
  onDeleteBook,
  onGoToStudio,
  searchQuery,
  onSearchChange,
}) => {
  const [selectedTag, setSelectedTag] = useState<string | null>(null);

  // Extract all unique tags
  const allTags = Array.from(
    new Set(books.flatMap((b) => b.tags || []))
  ).filter(Boolean);

  const filteredBooks = books.filter((b) => {
    const matchesSearch =
      !searchQuery ||
      b.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      b.author.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (b.description && b.description.toLowerCase().includes(searchQuery.toLowerCase()));

    const matchesTag = !selectedTag || (b.tags && b.tags.includes(selectedTag));

    return matchesSearch && matchesTag;
  });

  const totalPages = books.reduce((acc, b) => acc + (b.page_count || 0), 0);

  if (isLoading && books.length === 0) {
    return (
      <div className="py-20 flex flex-col items-center justify-center space-y-3">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-400" />
        <span className="text-xs text-slate-400">Loading library archive...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Top Controls Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 bg-slate-900/60 p-4 rounded-2xl border border-slate-800 backdrop-blur-sm">
        {/* Search */}
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Search books by title, author, or keyword..."
            className="w-full pl-10 pr-4 py-2 rounded-xl bg-slate-950 border border-slate-800 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 font-khmer"
          />
        </div>

        {/* Stats summary & Add book CTA */}
        <div className="flex items-center space-x-4 shrink-0">
          <div className="hidden lg:flex items-center space-x-3 text-xs text-slate-400">
            <span className="flex items-center space-x-1">
              <Library className="w-3.5 h-3.5 text-indigo-400" />
              <strong className="text-slate-200">{books.length}</strong> books
            </span>
            <span>&bull;</span>
            <span className="flex items-center space-x-1">
              <Layers className="w-3.5 h-3.5 text-teal-400" />
              <strong className="text-slate-200">{totalPages}</strong> pages
            </span>
          </div>

          <button
            onClick={onGoToStudio}
            className="flex items-center justify-center space-x-2 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-md shadow-indigo-500/20 transition"
          >
            <PlusCircle className="w-4 h-4" />
            <span>Digitize New Book</span>
          </button>
        </div>
      </div>

      {/* Tag pills filter */}
      {allTags.length > 0 && (
        <div className="flex items-center space-x-1.5 overflow-x-auto pb-1 text-xs">
          <span className="text-slate-500 text-[11px] uppercase font-semibold mr-1">Categories:</span>
          <button
            onClick={() => setSelectedTag(null)}
            className={`px-3 py-1 rounded-lg transition ${
              selectedTag === null
                ? "bg-indigo-600 text-white font-medium shadow-sm"
                : "bg-slate-900 text-slate-400 hover:text-slate-200 border border-slate-800"
            }`}
          >
            All
          </button>
          {allTags.map((tag) => (
            <button
              key={tag}
              onClick={() => setSelectedTag(selectedTag === tag ? null : tag)}
              className={`px-3 py-1 rounded-lg transition whitespace-nowrap ${
                selectedTag === tag
                  ? "bg-indigo-600 text-white font-medium shadow-sm"
                  : "bg-slate-900 text-slate-400 hover:text-slate-200 border border-slate-800"
              }`}
            >
              {tag}
            </button>
          ))}
        </div>
      )}

      {/* Grid */}
      {filteredBooks.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-5">
          {filteredBooks.map((book) => (
            <BookCard
              key={book.id}
              book={book}
              onRead={onReadBook}
              onDelete={onDeleteBook}
            />
          ))}
        </div>
      ) : (
        /* Empty State */
        <div className="bg-slate-900/40 border border-slate-850 rounded-3xl p-12 text-center flex flex-col items-center justify-center max-w-md mx-auto my-12">
          <div className="w-16 h-16 rounded-2xl bg-slate-800/60 border border-slate-700/50 flex items-center justify-center text-slate-400 mb-4">
            <BookOpen className="w-8 h-8 text-indigo-400" />
          </div>
          <h3 className="text-base font-bold text-slate-200">
            {searchQuery || selectedTag ? "No matching books found" : "Your Digital Library is Empty"}
          </h3>
          <p className="text-xs text-slate-400 mt-1.5 leading-relaxed">
            {searchQuery || selectedTag
              ? "Try adjusting your search keywords or removing selected category filters."
              : "Upload scanned book pages in Studio to automatically run AI Vision OCR and compile your first searchable PDF!"}
          </p>
          <button
            onClick={onGoToStudio}
            className="mt-5 flex items-center space-x-2 px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-lg shadow-indigo-500/25 transition"
          >
            <PlusCircle className="w-4 h-4" />
            <span>Scan & Create Book</span>
          </button>
        </div>
      )}
    </div>
  );
};
