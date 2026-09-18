import React, { useState, useRef } from "react";
import { Sparkles, Copy, Check, UploadCloud, Loader2, Volume2, Globe, Cpu } from "lucide-react";
import { sessionApi } from "../api";

interface QuickOCRModalProps {
  lang: string;
  engine: string;
}

export const QuickOCRModal: React.FC<QuickOCRModalProps> = ({ lang, engine }) => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [extractedText, setExtractedText] = useState("");
  const [lineCount, setLineCount] = useState(0);
  const [copied, setCopied] = useState(false);
  const [isTtsPlaying, setIsTtsPlaying] = useState(false);
  const [activeEngine, setActiveEngine] = useState(engine);
  const [activeLang, setActiveLang] = useState(lang);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = async (file: File) => {
    setSelectedFile(file);
    const url = URL.createObjectURL(file);
    setPreviewUrl(url);
    await processOcr(file, activeLang, activeEngine);
  };

  const processOcr = async (file: File, language: string, eng: string) => {
    setIsLoading(true);
    try {
      const res = await sessionApi.directOcr(file, language, eng);
      setExtractedText(res.text || "");
      setLineCount(res.line_count || 0);
    } catch (err: any) {
      alert("OCR failed: " + (err.message || "Unknown error"));
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopy = () => {
    if (!extractedText) return;
    navigator.clipboard.writeText(extractedText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSpeak = () => {
    if (!extractedText.trim()) return;
    if (isTtsPlaying) {
      window.speechSynthesis.cancel();
      setIsTtsPlaying(false);
      return;
    }

    const utterance = new SpeechSynthesisUtterance(extractedText);
    utterance.lang = activeLang === "km" ? "km-KH" : "en-US";
    utterance.onend = () => setIsTtsPlaying(false);
    utterance.onerror = () => setIsTtsPlaying(false);

    setIsTtsPlaying(true);
    window.speechSynthesis.speak(utterance);
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="bg-slate-900/60 border border-slate-800 rounded-3xl p-6 backdrop-blur-sm shadow-xl">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between pb-5 border-b border-slate-800 gap-4">
          <div>
            <div className="flex items-center space-x-2">
              <span className="w-8 h-8 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center font-bold">
                <Sparkles className="w-4 h-4" />
              </span>
              <h2 className="text-lg font-bold text-white tracking-tight">Instant Text OCR Tool</h2>
            </div>
            <p className="text-xs text-slate-400 mt-1">
              Drop any document or image for immediate Khmer/English transcription without creating a book session
            </p>
          </div>

          {/* Engine & Lang overrides */}
          <div className="flex items-center space-x-2">
            <div className="flex items-center space-x-1.5 bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1 text-xs text-slate-300">
              <Cpu className="w-3.5 h-3.5 text-indigo-400" />
              <select
                value={activeEngine}
                onChange={(e) => {
                  setActiveEngine(e.target.value);
                  if (selectedFile) processOcr(selectedFile, activeLang, e.target.value);
                }}
                className="bg-transparent text-slate-200 focus:outline-none cursor-pointer text-xs"
              >
                <option value="auto" className="bg-slate-900 text-white">Auto (Gemini Vision)</option>
                <option value="gemini" className="bg-slate-900 text-white">Gemini 3.5 Flash</option>
                <option value="paddle" className="bg-slate-900 text-white">PaddleOCR Local</option>
              </select>
            </div>

            <div className="flex items-center space-x-1.5 bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1 text-xs text-slate-300">
              <Globe className="w-3.5 h-3.5 text-teal-400" />
              <select
                value={activeLang}
                onChange={(e) => {
                  setActiveLang(e.target.value);
                  if (selectedFile) processOcr(selectedFile, e.target.value, activeEngine);
                }}
                className="bg-transparent text-slate-200 focus:outline-none cursor-pointer text-xs"
              >
                <option value="km" className="bg-slate-900 text-white">Khmer (ភាសាខ្មែរ)</option>
                <option value="en" className="bg-slate-900 text-white">English</option>
              </select>
            </div>
          </div>
        </div>

        {/* Upload & Results Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
          {/* Left: Input Image */}
          <div className="flex flex-col space-y-3">
            <div
              onClick={() => fileInputRef.current?.click()}
              className="relative aspect-[4/3] rounded-2xl border-2 border-dashed border-slate-700 hover:border-indigo-500 bg-slate-950/60 hover:bg-slate-950/80 transition-all flex flex-col items-center justify-center p-4 cursor-pointer overflow-hidden group"
            >
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => {
                  if (e.target.files && e.target.files[0]) {
                    handleFileSelect(e.target.files[0]);
                  }
                }}
              />

              {previewUrl ? (
                <img
                  src={previewUrl}
                  alt="Uploaded target"
                  className="w-full h-full object-contain rounded-lg"
                />
              ) : (
                <div className="flex flex-col items-center justify-center text-center space-y-2">
                  <div className="w-12 h-12 rounded-xl bg-indigo-500/10 text-indigo-400 flex items-center justify-center group-hover:scale-110 transition-transform">
                    <UploadCloud className="w-6 h-6" />
                  </div>
                  <span className="text-xs font-semibold text-slate-200">
                    Click to choose or drop an image
                  </span>
                  <span className="text-[11px] text-slate-500">Supports Khmer books, stylized titles, signage</span>
                </div>
              )}

              {isLoading && (
                <div className="absolute inset-0 bg-black/70 backdrop-blur-xs flex flex-col items-center justify-center text-white space-y-2">
                  <Loader2 className="w-8 h-8 animate-spin text-indigo-400" />
                  <span className="text-xs font-medium">Scanning with AI OCR...</span>
                </div>
              )}
            </div>

            {selectedFile && (
              <div className="flex items-center justify-between text-xs text-slate-400 px-1">
                <span className="truncate max-w-[200px]">{selectedFile.name}</span>
                <span>{(selectedFile.size / 1024).toFixed(1)} KB</span>
              </div>
            )}
          </div>

          {/* Right: Output Text */}
          <div className="flex flex-col space-y-3">
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold text-slate-300">
                Transcription Output ({lineCount} lines)
              </span>
              <div className="flex items-center space-x-2">
                <button
                  onClick={handleSpeak}
                  disabled={!extractedText}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-teal-400 hover:bg-slate-800 transition disabled:opacity-40"
                  title="Speech synthesis"
                >
                  <Volume2 className={`w-4 h-4 ${isTtsPlaying ? "text-teal-400 animate-pulse" : ""}`} />
                </button>
                <button
                  onClick={handleCopy}
                  disabled={!extractedText}
                  className="flex items-center space-x-1 px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium border border-slate-700 transition disabled:opacity-40"
                >
                  {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copied ? "Copied!" : "Copy"}</span>
                </button>
              </div>
            </div>

            <textarea
              readOnly
              value={extractedText}
              placeholder="Extracted text will appear here immediately after image upload..."
              rows={12}
              className="w-full flex-1 p-4 rounded-2xl bg-slate-950 border border-slate-800 text-slate-200 text-sm leading-relaxed focus:outline-none font-khmer resize-none"
              style={{ fontFamily: "'Noto Sans Khmer', system-ui, sans-serif" }}
            />
          </div>
        </div>
      </div>
    </div>
  );
};
