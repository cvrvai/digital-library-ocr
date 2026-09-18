import React, { useRef, useState } from "react";
import { UploadCloud, CheckCircle2, Wand2, Image as ImageIcon } from "lucide-react";

interface DropzoneProps {
  onUpload: (files: File[], autoOcr: boolean, autoCrop: boolean) => Promise<void>;
  isUploading: boolean;
}

export const Dropzone: React.FC<DropzoneProps> = ({ onUpload, isUploading }) => {
  const [isDragOver, setIsDragOver] = useState(false);
  const [autoOcr, setAutoOcr] = useState(true);
  const [autoCrop, setAutoCrop] = useState(true);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const validFiles = Array.from(e.dataTransfer.files).filter((f) =>
        f.type.startsWith("image/")
      );
      if (validFiles.length > 0) {
        onUpload(validFiles, autoOcr, autoCrop);
      }
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const validFiles = Array.from(e.target.files).filter((f) =>
        f.type.startsWith("image/")
      );
      if (validFiles.length > 0) {
        onUpload(validFiles, autoOcr, autoCrop);
      }
    }
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  return (
    <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-6 backdrop-blur-sm shadow-xl">
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
        className={`relative border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all ${
          isDragOver
            ? "border-indigo-500 bg-indigo-500/10 scale-[1.005]"
            : "border-slate-700/80 hover:border-slate-600 bg-slate-950/40 hover:bg-slate-950/60"
        } ${isUploading ? "opacity-50 pointer-events-none" : ""}`}
      >
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept="image/*"
          className="hidden"
          onChange={handleFileChange}
        />

        <div className="flex flex-col items-center justify-center space-y-3">
          <div className="w-16 h-16 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400 group-hover:scale-110 transition-transform">
            <UploadCloud className="w-8 h-8" />
          </div>

          <div>
            <h3 className="text-base font-semibold text-slate-200">
              Drop book scans or photos here, or <span className="text-indigo-400 underline decoration-indigo-500/40 underline-offset-4">browse</span>
            </h3>
            <p className="text-xs text-slate-400 mt-1">
              Supports JPG, PNG, WEBP, TIFF (batch multi-page upload supported)
            </p>
          </div>
        </div>
      </div>

      {/* Pre-processing options */}
      <div className="mt-4 flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-slate-800/80 text-xs text-slate-300">
        <div className="flex items-center space-x-4">
          <label className="flex items-center space-x-2 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={autoCrop}
              onChange={(e) => setAutoCrop(e.target.checked)}
              className="w-4 h-4 rounded border-slate-700 text-indigo-600 focus:ring-indigo-500 bg-slate-950"
            />
            <span className="flex items-center space-x-1.5 font-medium text-slate-300">
              <Wand2 className="w-3.5 h-3.5 text-teal-400" />
              <span>Auto-Deskew & Edge Straighten</span>
            </span>
          </label>

          <label className="flex items-center space-x-2 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={autoOcr}
              onChange={(e) => setAutoOcr(e.target.checked)}
              className="w-4 h-4 rounded border-slate-700 text-indigo-600 focus:ring-indigo-500 bg-slate-950"
            />
            <span className="flex items-center space-x-1.5 font-medium text-slate-300">
              <CheckCircle2 className="w-3.5 h-3.5 text-indigo-400" />
              <span>Instant AI OCR on Upload</span>
            </span>
          </label>
        </div>

        <div className="text-slate-400 text-[11px] flex items-center space-x-1">
          <ImageIcon className="w-3.5 h-3.5 text-slate-500" />
          <span>Upload pages in order (Page 1 = Cover)</span>
        </div>
      </div>
    </div>
  );
};
