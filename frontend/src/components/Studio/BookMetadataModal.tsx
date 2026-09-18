import React, { useState, useEffect } from "react";
import { X, BookCheck, Sparkles, Tag, User, BookOpen, FileText, Loader2 } from "lucide-react";
import type { PageItem, BookCompilePayload } from "../../types";
import { sessionApi } from "../../api";

interface BookMetadataModalProps {
  isOpen: boolean;
  onClose: () => void;
  pages: PageItem[];
  sessionId: string;
  onCompile: (payload: BookCompilePayload) => Promise<void>;
  isCompiling: boolean;
}

export const BookMetadataModal: React.FC<BookMetadataModalProps> = ({
  isOpen,
  onClose,
  pages,
  sessionId,
  onCompile,
  isCompiling,
}) => {
  const [title, setTitle] = useState("");
  const [author, setAuthor] = useState("");
  const [description, setDescription] = useState("");
  const [tagInput, setTagInput] = useState("");
  const [tags, setTags] = useState<string[]>(["Digital Library"]);

  // Auto-detect title from page 1 first line if available
  useEffect(() => {
    if (pages.length > 0 && !title) {
      const p1Text = pages[0].ocr_result?.full_text || "";
      const firstLine = p1Text.split("\n")[0]?.trim();
      if (firstLine && firstLine.length < 80) {
        setTitle(firstLine);
      } else {
        setTitle("Untitled Book");
      }
    }
  }, [pages, title]);

  if (!isOpen) return null;

  const handleAddTag = () => {
    const trimmed = tagInput.trim();
    if (trimmed && !tags.includes(trimmed)) {
      setTags([...tags, trimmed]);
      setTagInput("");
    }
  };

  const handleRemoveTag = (tagToRemove: string) => {
    setTags(tags.filter((t) => t !== tagToRemove));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onCompile({
      title: title.trim() || "Untitled Book",
      author: author.trim() || "Unknown Author",
      description: description.trim(),
      tags: tags,
    });
  };

  const coverUrl = pages.length > 0 ? sessionApi.getPagePreviewUrl(sessionId, pages[0].id) : null;

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
      <div className="relative w-full max-w-2xl bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl overflow-hidden my-8">
        {/* Modal Header */}
        <div className="px-6 py-5 border-b border-slate-800 flex items-center justify-between bg-slate-950/60">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
              <BookCheck className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-white tracking-tight">Add Book to Digital Library</h3>
              <p className="text-xs text-slate-400">
                Compile {pages.length} scanned pages into a searchable sandwich PDF & archive in library
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            disabled={isCompiling}
            className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {/* Left Column: Cover Preview & Page Count */}
            <div className="flex flex-col items-center justify-start space-y-3 bg-slate-950/60 p-4 rounded-2xl border border-slate-800/80">
              <span className="text-xs font-semibold text-slate-400">Cover Preview (Page 1)</span>
              {coverUrl ? (
                <div className="w-36 aspect-[3/4] rounded-lg overflow-hidden border border-slate-700 bg-slate-900 shadow-md">
                  <img src={coverUrl} alt="Cover Preview" className="w-full h-full object-cover" />
                </div>
              ) : (
                <div className="w-36 aspect-[3/4] rounded-lg border border-dashed border-slate-700 flex items-center justify-center text-xs text-slate-500">
                  No Cover
                </div>
              )}
              <div className="text-center text-xs text-slate-300">
                <span className="font-bold text-indigo-400">{pages.length}</span> Pages Ready
              </div>
            </div>

            {/* Right Column: Book Metadata Fields */}
            <div className="md:col-span-2 space-y-4">
              {/* Title */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1 flex items-center justify-between">
                  <span className="flex items-center space-x-1.5">
                    <BookOpen className="w-3.5 h-3.5 text-indigo-400" />
                    <span>Book Title *</span>
                  </span>
                  <span className="text-[11px] text-slate-400">Khmer / English</span>
                </label>
                <input
                  type="text"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. រឿងក្រៃថោង (Story of Kraithaong)"
                  className="w-full px-3.5 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white text-sm focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 font-khmer"
                />
              </div>

              {/* Author */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1 flex items-center space-x-1.5">
                  <User className="w-3.5 h-3.5 text-indigo-400" />
                  <span>Author / Publisher</span>
                </label>
                <input
                  type="text"
                  value={author}
                  onChange={(e) => setAuthor(e.target.value)}
                  placeholder="e.g. ក្រសួងអប់រំ យុវជន និងកីឡា / Ministry of Education"
                  className="w-full px-3.5 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white text-sm focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 font-khmer"
                />
              </div>

              {/* Description / Summary */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1 flex items-center space-x-1.5">
                  <FileText className="w-3.5 h-3.5 text-indigo-400" />
                  <span>Description / Abstract</span>
                </label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Short summary of this book or document..."
                  rows={3}
                  className="w-full px-3.5 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs leading-relaxed focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 resize-none font-khmer"
                />
              </div>

              {/* Tags / Categories */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1 flex items-center space-x-1.5">
                  <Tag className="w-3.5 h-3.5 text-indigo-400" />
                  <span>Categories & Tags</span>
                </label>
                <div className="flex space-x-2 mb-2">
                  <input
                    type="text"
                    value={tagInput}
                    onChange={(e) => setTagInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        handleAddTag();
                      }
                    }}
                    placeholder="Add category (e.g. Literature, History)"
                    className="flex-1 px-3 py-1.5 rounded-lg bg-slate-950 border border-slate-800 text-xs text-white focus:outline-none focus:border-indigo-500"
                  />
                  <button
                    type="button"
                    onClick={handleAddTag}
                    className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs text-slate-200 border border-slate-700"
                  >
                    Add
                  </button>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {tags.map((t) => (
                    <span
                      key={t}
                      className="inline-flex items-center space-x-1 text-[11px] px-2.5 py-0.5 rounded-md bg-indigo-500/10 text-indigo-300 border border-indigo-500/30"
                    >
                      <span>{t}</span>
                      <button
                        type="button"
                        onClick={() => handleRemoveTag(t)}
                        className="hover:text-rose-400 ml-1"
                      >
                        &times;
                      </button>
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Footer Actions */}
          <div className="pt-4 border-t border-slate-800 flex items-center justify-end space-x-3">
            <button
              type="button"
              onClick={onClose}
              disabled={isCompiling}
              className="px-4 py-2 rounded-xl text-sm font-medium text-slate-400 hover:text-white"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isCompiling || !title.trim()}
              className="flex items-center space-x-2 px-6 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-500 hover:to-blue-500 text-white font-medium text-sm shadow-lg shadow-indigo-500/25 transition disabled:opacity-50"
            >
              {isCompiling ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Compiling Searchable PDF...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  <span>Compile & Add to Library</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
