import React, { useState, useEffect, useRef } from "react";
import {
  Volume2,
  Wand2,
  Trash2,
  Check,
  RefreshCw,
  Maximize2,
  AlertCircle,
  FileText,
  Loader2,
  X,
} from "lucide-react";
import type { PageItem } from "../../types";
import { sessionApi } from "../../api";

interface PageCardProps {
  page: PageItem;
  pageNumber: number;
  sessionId: string;
  engine: string;
  onDelete: (pageId: string) => Promise<void>;
  onUpdateText: (pageId: string, text: string) => Promise<void>;
  onReRunOcr: (pageId: string) => Promise<void>;
  onAutoFlatten: (pageId: string) => Promise<void>;
}

export const PageCard: React.FC<PageCardProps> = ({
  page,
  pageNumber,
  sessionId,
  engine,
  onDelete,
  onUpdateText,
  onReRunOcr,
  onAutoFlatten,
}) => {
  const [text, setText] = useState(page.ocr_result?.full_text || "");
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isTtsPlaying, setIsTtsPlaying] = useState(false);
  const [isTtsLoading, setIsTtsLoading] = useState(false);
  const [isActionLoading, setIsActionLoading] = useState(false);
  const [showImageModal, setShowImageModal] = useState(false);

  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    setText(page.ocr_result?.full_text || "");
  }, [page.ocr_result?.full_text]);

  const handleSaveText = async () => {
    setIsSaving(true);
    try {
      await onUpdateText(page.id, text);
      setIsEditing(false);
    } catch (err) {
      console.error("Failed to update OCR text:", err);
    } finally {
      setIsSaving(false);
    }
  };

  const handlePlayTts = () => {
    if (isTtsPlaying && audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
      setIsTtsPlaying(false);
      return;
    }

    setIsTtsLoading(true);
    const audioUrl = sessionApi.getTTSAudioUrl(sessionId, page.id);
    const audio = new Audio(audioUrl);
    audioRef.current = audio;

    audio.oncanplaythrough = () => {
      setIsTtsLoading(false);
      setIsTtsPlaying(true);
      audio.play();
    };

    audio.onended = () => {
      setIsTtsPlaying(false);
    };

    audio.onerror = (e) => {
      console.error("Audio playback error:", e);
      setIsTtsLoading(false);
      setIsTtsPlaying(false);
      alert("TTS generation failed or text is empty.");
    };
  };

  const handleFlatten = async () => {
    setIsActionLoading(true);
    try {
      await onAutoFlatten(page.id);
    } finally {
      setIsActionLoading(false);
    }
  };

  const handleOcr = async () => {
    setIsActionLoading(true);
    try {
      await onReRunOcr(page.id);
    } finally {
      setIsActionLoading(false);
    }
  };

  const previewUrl = `${sessionApi.getPagePreviewUrl(sessionId, page.id)}?t=${page.updated_at || Date.now()}`;

  return (
    <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 shadow-lg hover:border-slate-700/80 transition-all flex flex-col lg:flex-row gap-5">
      {/* Left Column: Image Thumbnail & Visual Controls */}
      <div className="w-full lg:w-72 shrink-0 flex flex-col space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <span className="w-7 h-7 rounded-lg bg-indigo-600/30 border border-indigo-500/40 text-indigo-300 font-bold text-xs flex items-center justify-center">
              #{pageNumber}
            </span>
            <span className="text-xs text-slate-300 font-medium truncate max-w-[170px]" title={page.filename}>
              {page.filename}
            </span>
          </div>

          {page.is_flattened && (
            <span className="text-[10px] uppercase font-semibold px-2 py-0.5 rounded-md bg-teal-500/20 text-teal-300 border border-teal-500/30">
              Deskewed
            </span>
          )}
        </div>

        {/* Thumbnail with overlay buttons */}
        <div className="relative group rounded-xl overflow-hidden bg-slate-950 border border-slate-800 aspect-[3/4] flex items-center justify-center">
          <img
            src={previewUrl}
            alt={`Page ${pageNumber}`}
            className="w-full h-full object-contain cursor-pointer transition-transform duration-300 group-hover:scale-105"
            onClick={() => setShowImageModal(true)}
          />

          <button
            onClick={() => setShowImageModal(true)}
            className="absolute top-2 right-2 p-1.5 rounded-lg bg-slate-900/80 text-slate-300 hover:text-white backdrop-blur-sm opacity-0 group-hover:opacity-100 transition-opacity"
            title="Enlarge view"
          >
            <Maximize2 className="w-4 h-4" />
          </button>
        </div>

        {/* Action buttons under thumbnail */}
        <div className="grid grid-cols-2 gap-2">
          <button
            onClick={handleFlatten}
            disabled={isActionLoading}
            className="flex items-center justify-center space-x-1 px-2.5 py-1.5 rounded-lg bg-slate-800/80 hover:bg-slate-700 text-slate-200 text-xs font-medium border border-slate-700 transition disabled:opacity-50"
            title="Auto deskew & straighten perspective"
          >
            <Wand2 className="w-3.5 h-3.5 text-teal-400" />
            <span>Deskew</span>
          </button>

          <button
            onClick={handleOcr}
            disabled={isActionLoading}
            className="flex items-center justify-center space-x-1 px-2.5 py-1.5 rounded-lg bg-indigo-900/40 hover:bg-indigo-800/50 text-indigo-200 text-xs font-medium border border-indigo-700/50 transition disabled:opacity-50"
            title="Re-run AI OCR on this page"
          >
            <RefreshCw className={`w-3.5 h-3.5 text-indigo-400 ${isActionLoading ? "animate-spin" : ""}`} />
            <span>Re-OCR</span>
          </button>
        </div>
      </div>

      {/* Right Column: Transcription & Editing */}
      <div className="flex-1 flex flex-col space-y-3">
        {/* Status Header */}
        <div className="flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-slate-800">
          <div className="flex items-center space-x-2">
            <span
              className={`text-xs px-2.5 py-1 rounded-full font-medium flex items-center space-x-1.5 ${
                page.ocr_status === "completed"
                  ? "bg-emerald-500/15 text-emerald-300 border border-emerald-500/30"
                  : page.ocr_status === "processing"
                  ? "bg-amber-500/15 text-amber-300 border border-amber-500/30"
                  : page.ocr_status === "failed"
                  ? "bg-rose-500/15 text-rose-300 border border-rose-500/30"
                  : "bg-slate-800 text-slate-400 border border-slate-700"
              }`}
            >
              {page.ocr_status === "completed" && <Check className="w-3 h-3" />}
              {page.ocr_status === "processing" && <Loader2 className="w-3 h-3 animate-spin" />}
              {page.ocr_status === "failed" && <AlertCircle className="w-3 h-3" />}
              <span className="capitalize">{page.ocr_status}</span>
            </span>

            {page.ocr_result && (
              <span className="text-xs text-slate-400">
                {page.ocr_result.line_count || 0} lines &bull; Engine:{" "}
                <span className="text-slate-300 font-mono font-medium">
                  {page.ocr_result.engine || engine}
                </span>
              </span>
            )}
          </div>

          <div className="flex items-center space-x-2">
            {/* Gemini TTS Button */}
            <button
              onClick={handlePlayTts}
              disabled={isTtsLoading || !text.trim()}
              className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition ${
                isTtsPlaying
                  ? "bg-teal-500/20 text-teal-300 border-teal-500/40 animate-pulse"
                  : "bg-slate-800/80 hover:bg-slate-700 text-slate-300 border-slate-700"
              } disabled:opacity-40`}
              title="Listen to page read aloud with Gemini TTS Kore Voice"
            >
              {isTtsLoading ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin text-teal-400" />
              ) : (
                <Volume2 className="w-3.5 h-3.5 text-teal-400" />
              )}
              <span>{isTtsPlaying ? "Stop Audio" : "Listen (TTS)"}</span>
            </button>

            {/* Delete Page */}
            <button
              onClick={() => onDelete(page.id)}
              className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition border border-transparent hover:border-rose-500/30"
              title="Delete this page"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Text Transcription Box */}
        <div className="flex-1 flex flex-col">
          <div className="flex items-center justify-between mb-1.5 text-xs text-slate-400">
            <span className="flex items-center space-x-1">
              <FileText className="w-3.5 h-3.5 text-indigo-400" />
              <span>Transcribed Text (Searchable layer)</span>
            </span>
            {isEditing ? (
              <span className="text-amber-400 text-[11px]">Unsaved modifications</span>
            ) : (
              <span className="text-[11px] text-slate-500">Click to edit</span>
            )}
          </div>

          <textarea
            value={text}
            onChange={(e) => {
              setText(e.target.value);
              setIsEditing(true);
            }}
            placeholder={
              page.ocr_status === "completed"
                ? "No text detected on this page."
                : "OCR transcription will appear here..."
            }
            rows={8}
            className="w-full flex-1 p-3.5 rounded-xl bg-slate-950/80 border border-slate-800 text-slate-200 text-sm leading-relaxed focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 resize-y font-khmer"
            style={{ fontFamily: "'Noto Sans Khmer', system-ui, sans-serif" }}
          />

          {isEditing && (
            <div className="mt-2 flex items-center justify-end space-x-2">
              <button
                onClick={() => {
                  setText(page.ocr_result?.full_text || "");
                  setIsEditing(false);
                }}
                className="px-3 py-1 rounded-lg text-xs text-slate-400 hover:text-white"
              >
                Discard
              </button>
              <button
                onClick={handleSaveText}
                disabled={isSaving}
                className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-medium shadow-sm transition disabled:opacity-50"
              >
                {isSaving ? <Loader2 className="w-3 h-3 animate-spin" /> : <Check className="w-3 h-3" />}
                <span>Save Correction</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Full Image Modal */}
      {showImageModal && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="relative max-w-4xl max-h-[90vh] bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden p-2 flex flex-col">
            <div className="flex items-center justify-between p-3 border-b border-slate-800">
              <h4 className="text-sm font-semibold text-slate-200">
                Page #{pageNumber} Preview: {page.filename}
              </h4>
              <button
                onClick={() => setShowImageModal(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="flex-1 overflow-auto p-4 flex items-center justify-center">
              <img
                src={previewUrl}
                alt={`Page ${pageNumber}`}
                className="max-h-[75vh] object-contain rounded-lg shadow-2xl"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
