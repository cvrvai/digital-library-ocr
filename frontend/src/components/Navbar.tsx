import React from "react";
import { BookOpen, Sparkles, Library, Layers, Globe, Cpu } from "lucide-react";

interface NavbarProps {
  currentTab: "studio" | "library" | "quick-ocr";
  onTabChange: (tab: "studio" | "library" | "quick-ocr") => void;
  libraryCount: number;
  engine: string;
  onEngineChange: (engine: string) => void;
  lang: string;
  onLangChange: (lang: string) => void;
  isBackendConnected: boolean;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentTab,
  onTabChange,
  libraryCount,
  engine,
  onEngineChange,
  lang,
  onLangChange,
  isBackendConnected,
}) => {
  return (
    <header className="sticky top-0 z-40 bg-slate-900/90 backdrop-blur-md border-b border-slate-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Brand */}
          <div className="flex items-center space-x-3 cursor-pointer" onClick={() => onTabChange("studio")}>
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-600 via-blue-500 to-teal-400 p-0.5 shadow-lg shadow-indigo-500/20 flex items-center justify-center">
              <div className="w-full h-full bg-slate-950 rounded-[10px] flex items-center justify-center">
                <BookOpen className="w-5 h-5 text-indigo-400" />
              </div>
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="font-bold text-lg text-white tracking-tight">Digital Library OCR</span>
                <span className="text-[11px] px-1.5 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 font-semibold border border-indigo-500/30">
                  v2.0
                </span>
              </div>
              <p className="text-xs text-slate-400 hidden sm:block">AI Khmer & Multi-language Book Archiving</p>
            </div>
          </div>

          {/* Nav Tabs */}
          <nav className="flex items-center space-x-1 bg-slate-950/60 p-1 rounded-xl border border-slate-800/80">
            <button
              onClick={() => onTabChange("studio")}
              className={`flex items-center space-x-2 px-3.5 py-1.5 rounded-lg text-sm font-medium transition-all ${
                currentTab === "studio"
                  ? "bg-indigo-600 text-white shadow-sm"
                  : "text-slate-300 hover:text-white hover:bg-slate-800/50"
              }`}
            >
              <Layers className="w-4 h-4" />
              <span>Studio</span>
            </button>

            <button
              onClick={() => onTabChange("library")}
              className={`flex items-center space-x-2 px-3.5 py-1.5 rounded-lg text-sm font-medium transition-all ${
                currentTab === "library"
                  ? "bg-indigo-600 text-white shadow-sm"
                  : "text-slate-300 hover:text-white hover:bg-slate-800/50"
              }`}
            >
              <Library className="w-4 h-4" />
              <span>Library</span>
              {libraryCount > 0 && (
                <span className="ml-1 text-xs px-1.5 py-0.2 rounded-full bg-slate-800 text-indigo-300 font-semibold">
                  {libraryCount}
                </span>
              )}
            </button>

            <button
              onClick={() => onTabChange("quick-ocr")}
              className={`flex items-center space-x-2 px-3.5 py-1.5 rounded-lg text-sm font-medium transition-all ${
                currentTab === "quick-ocr"
                  ? "bg-indigo-600 text-white shadow-sm"
                  : "text-slate-300 hover:text-white hover:bg-slate-800/50"
              }`}
            >
              <Sparkles className="w-4 h-4 text-amber-400" />
              <span>Instant OCR</span>
            </button>
          </nav>

          {/* Controls: Engine, Language, Backend Health */}
          <div className="flex items-center space-x-3">
            {/* Engine Selector */}
            <div className="hidden md:flex items-center space-x-1.5 bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1 text-xs text-slate-300">
              <Cpu className="w-3.5 h-3.5 text-indigo-400" />
              <select
                value={engine}
                onChange={(e) => onEngineChange(e.target.value)}
                className="bg-transparent text-slate-200 focus:outline-none cursor-pointer text-xs"
              >
                <option value="auto" className="bg-slate-900 text-white">Auto (Gemini Vision)</option>
                <option value="gemini" className="bg-slate-900 text-white">Gemini 3.5 Flash</option>
                <option value="paddle" className="bg-slate-900 text-white">PaddleOCR Local</option>
              </select>
            </div>

            {/* Language Selector */}
            <div className="flex items-center space-x-1.5 bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1 text-xs text-slate-300">
              <Globe className="w-3.5 h-3.5 text-teal-400" />
              <select
                value={lang}
                onChange={(e) => onLangChange(e.target.value)}
                className="bg-transparent text-slate-200 focus:outline-none cursor-pointer text-xs"
              >
                <option value="km" className="bg-slate-900 text-white">ភាសាខ្មែរ (Khmer)</option>
                <option value="en" className="bg-slate-900 text-white">English</option>
              </select>
            </div>

            {/* Backend connection indicator */}
            <div
              className="flex items-center space-x-1.5 px-2 py-1 rounded-md text-xs bg-slate-950/80 border border-slate-800"
              title={isBackendConnected ? "Backend online on :8080" : "Backend offline"}
            >
              <span
                className={`w-2 h-2 rounded-full ${
                  isBackendConnected ? "bg-emerald-500 shadow-sm shadow-emerald-500/50" : "bg-rose-500"
                }`}
              />
              <span className="text-[11px] text-slate-400 hidden xl:inline">
                {isBackendConnected ? "API :8080" : "Offline"}
              </span>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};
