import { useState, useEffect, useCallback } from "react";
import { Navbar } from "./components/Navbar";
import { Dropzone } from "./components/Studio/Dropzone";
import { PageCard } from "./components/Studio/PageCard";
import { BookMetadataModal } from "./components/Studio/BookMetadataModal";
import { BookGrid } from "./components/Library/BookGrid";
import { PDFReaderModal } from "./components/Library/PDFReaderModal";
import { QuickOCRModal } from "./components/QuickOCRModal";
import { sessionApi, libraryApi } from "./api";
import type { PageItem, LibraryBook, BookCompilePayload } from "./types";
import {
  BookCheck,
  RefreshCw,
  AlertCircle,
  CheckCircle2,
  Sparkles,
  Layers,
} from "lucide-react";

export function App() {
  const [currentTab, setCurrentTab] = useState<"studio" | "library" | "quick-ocr">("studio");
  const [engine, setEngine] = useState<string>("auto");
  const [lang, setLang] = useState<string>("km");
  const [isBackendConnected, setIsBackendConnected] = useState<boolean>(false);

  // Studio State
  const [sessionId, setSessionId] = useState<string>("");
  const [pages, setPages] = useState<PageItem[]>([]);
  const [isUploading, setIsUploading] = useState<boolean>(false);
  const [isCompiling, setIsCompiling] = useState<boolean>(false);
  const [isMetadataModalOpen, setIsMetadataModalOpen] = useState<boolean>(false);

  // Library State
  const [books, setBooks] = useState<LibraryBook[]>([]);
  const [isLoadingBooks, setIsLoadingBooks] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [selectedBookForReading, setSelectedBookForReading] = useState<LibraryBook | null>(null);

  // Notification Toast
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);

  const showToast = (message: string, type: "success" | "error" = "success") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  // Initialize session
  useEffect(() => {
    async function initSession() {
      try {
        const id = await sessionApi.createSession();
        setSessionId(id);
        setIsBackendConnected(true);
      } catch (err) {
        console.warn("Backend connection check:", err);
        setIsBackendConnected(false);
      }
    }
    initSession();
  }, []);

  // Fetch library books
  const loadBooks = useCallback(async () => {
    setIsLoadingBooks(true);
    try {
      const data = await libraryApi.getBooks(searchQuery);
      setBooks(data);
      setIsBackendConnected(true);
    } catch (err) {
      console.warn("Failed to load library books:", err);
      setIsBackendConnected(false);
    } finally {
      setIsLoadingBooks(false);
    }
  }, [searchQuery]);

  useEffect(() => {
    loadBooks();
  }, [loadBooks]);

  // Handle uploading files in Studio
  const handleUpload = async (files: File[], autoOcr: boolean, autoCrop: boolean) => {
    let activeSession = sessionId;
    if (!activeSession) {
      try {
        activeSession = await sessionApi.createSession();
        setSessionId(activeSession);
      } catch (err: any) {
        showToast("Backend offline: Cannot create session", "error");
        return;
      }
    }

    setIsUploading(true);
    try {
      const uploaded = await sessionApi.uploadPages(
        activeSession,
        files,
        autoOcr,
        autoCrop,
        lang,
        engine
      );
      // Refresh pages list from server
      const updatedPages = await sessionApi.getPages(activeSession);
      setPages(updatedPages);
      showToast(`Uploaded ${uploaded.length} page(s) successfully!`);
    } catch (err: any) {
      showToast(`Upload failed: ${err.message}`, "error");
    } finally {
      setIsUploading(false);
    }
  };

  // Studio actions
  const handleDeletePage = async (pageId: string) => {
    if (!sessionId) return;
    try {
      await sessionApi.deletePage(sessionId, pageId);
      setPages(pages.filter((p) => p.id !== pageId));
      showToast("Page removed");
    } catch (err: any) {
      showToast(`Failed to delete page: ${err.message}`, "error");
    }
  };

  const handleUpdateText = async (pageId: string, text: string) => {
    if (!sessionId) return;
    try {
      const updatedOcr = await sessionApi.updatePageOcr(sessionId, pageId, text);
      setPages(
        pages.map((p) =>
          p.id === pageId ? { ...p, ocr_result: updatedOcr, has_ocr: true } : p
        )
      );
      showToast("OCR text updated");
    } catch (err: any) {
      showToast(`Failed to update text: ${err.message}`, "error");
    }
  };

  const handleReRunOcr = async (pageId: string) => {
    if (!sessionId) return;
    try {
      setPages(
        pages.map((p) =>
          p.id === pageId ? { ...p, ocr_status: "processing" } : p
        )
      );
      const res = await sessionApi.runPageOcr(sessionId, pageId, lang, engine);
      setPages(
        pages.map((p) =>
          p.id === pageId
            ? { ...p, ocr_result: res, ocr_status: "completed", has_ocr: true }
            : p
        )
      );
      showToast("Page re-scanned with AI Vision OCR!");
    } catch (err: any) {
      setPages(
        pages.map((p) =>
          p.id === pageId ? { ...p, ocr_status: "failed" } : p
        )
      );
      showToast(`OCR failed: ${err.message}`, "error");
    }
  };

  const handleAutoFlatten = async (pageId: string) => {
    if (!sessionId) return;
    try {
      await sessionApi.autoFlattenPage(sessionId, pageId);
      const updatedPages = await sessionApi.getPages(sessionId);
      setPages(updatedPages);
      showToast("Document automatically deskewed and straightened!");
    } catch (err: any) {
      showToast(`Deskew failed: ${err.message}`, "error");
    }
  };

  const handleCompileBook = async (payload: BookCompilePayload) => {
    if (!sessionId || pages.length === 0) return;
    setIsCompiling(true);
    try {
      await sessionApi.compileBook(sessionId, payload);
      setIsMetadataModalOpen(false);
      showToast(`Book "${payload.title}" successfully added to Library!`);

      // Refresh library & switch to Library tab
      await loadBooks();
      setCurrentTab("library");

      // Auto start new empty session
      const newSession = await sessionApi.createSession();
      setSessionId(newSession);
      setPages([]);
    } catch (err: any) {
      showToast(`Compilation failed: ${err.message}`, "error");
    } finally {
      setIsCompiling(false);
    }
  };

  const handleDeleteBook = async (bookId: string) => {
    if (!window.confirm("Are you sure you want to delete this book from your digital library?")) {
      return;
    }
    try {
      await libraryApi.deleteBook(bookId);
      setBooks(books.filter((b) => b.id !== bookId));
      showToast("Book deleted from library");
    } catch (err: any) {
      showToast(`Delete failed: ${err.message}`, "error");
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col selection:bg-indigo-500 selection:text-white">
      {/* Toast notification */}
      {toast && (
        <div
          className={`fixed bottom-5 right-5 z-50 flex items-center space-x-2 px-4 py-3 rounded-xl shadow-2xl backdrop-blur-md text-xs font-medium border transition-all animate-bounce ${
            toast.type === "success"
              ? "bg-emerald-950/90 text-emerald-200 border-emerald-500/40"
              : "bg-rose-950/90 text-rose-200 border-rose-500/40"
          }`}
        >
          {toast.type === "success" ? (
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          ) : (
            <AlertCircle className="w-4 h-4 text-rose-400" />
          )}
          <span>{toast.message}</span>
        </div>
      )}

      {/* Top Navbar */}
      <Navbar
        currentTab={currentTab}
        onTabChange={setCurrentTab}
        libraryCount={books.length}
        engine={engine}
        onEngineChange={setEngine}
        lang={lang}
        onLangChange={setLang}
        isBackendConnected={isBackendConnected}
      />

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* TAB 1: STUDIO (OCR & BOOK BUILDER) */}
        {currentTab === "studio" && (
          <div className="space-y-8">
            {/* Studio Header */}
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
              <div>
                <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight flex items-center space-x-2">
                  <span>Digitization Studio</span>
                  <span className="text-xs px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 font-semibold border border-indigo-500/30">
                    Gemini 3.5 Flash Vision
                  </span>
                </h1>
                <p className="text-xs sm:text-sm text-slate-400 mt-1">
                  Upload book photos or scans &bull; Auto-straighten &bull; Edit OCR text &bull; Listen with AI TTS &bull; Compile searchable PDF
                </p>
              </div>

              {pages.length > 0 && (
                <div className="flex items-center space-x-3">
                  <button
                    onClick={() => {
                      if (window.confirm("Clear all current pages and start a fresh session?")) {
                        setPages([]);
                      }
                    }}
                    className="px-3.5 py-2 rounded-xl text-xs font-medium text-slate-400 hover:text-white hover:bg-slate-900 border border-slate-800 transition"
                  >
                    Clear All
                  </button>

                  <button
                    onClick={() => setIsMetadataModalOpen(true)}
                    className="flex items-center space-x-2 px-5 py-2 rounded-xl bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-500 hover:to-blue-500 text-white font-semibold text-xs shadow-lg shadow-indigo-500/25 transition"
                  >
                    <BookCheck className="w-4 h-4" />
                    <span>Add to Library ({pages.length} Pages)</span>
                  </button>
                </div>
              )}
            </div>

            {/* Dropzone Upload */}
            <Dropzone onUpload={handleUpload} isUploading={isUploading} />

            {/* Pages Stream */}
            {pages.length > 0 ? (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-semibold text-slate-300 flex items-center space-x-2">
                    <Layers className="w-4 h-4 text-indigo-400" />
                    <span>Scanned Pages ({pages.length})</span>
                  </h3>
                  <span className="text-xs text-slate-500">Page 1 acts as default cover</span>
                </div>

                <div className="grid grid-cols-1 gap-4">
                  {pages.map((page, index) => (
                    <PageCard
                      key={page.id}
                      page={page}
                      pageNumber={index + 1}
                      sessionId={sessionId}
                      engine={engine}
                      onDelete={handleDeletePage}
                      onUpdateText={handleUpdateText}
                      onReRunOcr={handleReRunOcr}
                      onAutoFlatten={handleAutoFlatten}
                    />
                  ))}
                </div>

                {/* Bottom CTA to compile */}
                <div className="pt-6 border-t border-slate-850 flex justify-end">
                  <button
                    onClick={() => setIsMetadataModalOpen(true)}
                    className="flex items-center space-x-2 px-6 py-3 rounded-2xl bg-gradient-to-r from-indigo-600 via-blue-600 to-teal-500 hover:opacity-95 text-white font-bold text-sm shadow-xl shadow-indigo-500/30 transition"
                  >
                    <Sparkles className="w-4 h-4" />
                    <span>Compile Searchable PDF & Add to Library</span>
                  </button>
                </div>
              </div>
            ) : null}
          </div>
        )}

        {/* TAB 2: DIGITAL LIBRARY */}
        {currentTab === "library" && (
          <div className="space-y-8">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div>
                <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
                  Archived Digital Library
                </h1>
                <p className="text-xs sm:text-sm text-slate-400 mt-1">
                  Browse digitized books with invisible OCR text layer (ReportLab + Google NotoSansKhmer)
                </p>
              </div>
              <button
                onClick={loadBooks}
                disabled={isLoadingBooks}
                className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-900 border border-slate-800 transition"
                title="Refresh library"
              >
                <RefreshCw className={`w-4 h-4 ${isLoadingBooks ? "animate-spin" : ""}`} />
              </button>
            </div>

            <BookGrid
              books={books}
              isLoading={isLoadingBooks}
              onReadBook={(book) => setSelectedBookForReading(book)}
              onDeleteBook={handleDeleteBook}
              onGoToStudio={() => setCurrentTab("studio")}
              searchQuery={searchQuery}
              onSearchChange={setSearchQuery}
            />
          </div>
        )}

        {/* TAB 3: INSTANT TEXT OCR */}
        {currentTab === "quick-ocr" && (
          <QuickOCRModal lang={lang} engine={engine} />
        )}
      </main>

      {/* Book Metadata Compilation Modal ("Add Book to Library") */}
      <BookMetadataModal
        isOpen={isMetadataModalOpen}
        onClose={() => setIsMetadataModalOpen(false)}
        pages={pages}
        sessionId={sessionId}
        onCompile={handleCompileBook}
        isCompiling={isCompiling}
      />

      {/* PDF Reader Modal */}
      <PDFReaderModal
        book={selectedBookForReading}
        isOpen={Boolean(selectedBookForReading)}
        onClose={() => setSelectedBookForReading(null)}
      />
    </div>
  );
}
export default App;
