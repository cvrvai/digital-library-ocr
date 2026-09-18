/**
 * PaddleOCR Digital Library - Simple & Streamlined Client
 */

let currentSessionId = null;
let sessionPages = [];
let libraryBooks = [];

document.addEventListener("DOMContentLoaded", () => {
  initSession();
  loadLibrary();

  // Global drag & drop support anywhere in window
  window.addEventListener("dragover", (e) => e.preventDefault());
  window.addEventListener("drop", (e) => {
    e.preventDefault();
    if (e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      uploadAndOCRFiles(e.dataTransfer.files);
    }
  });
});

// ---------------- Session ----------------

async function initSession() {
  try {
    const res = await fetch("/api/session/create", { method: "POST" });
    const data = await res.json();
    currentSessionId = data.session_id;
  } catch (err) {
    showToast("Failed to connect to server", "error");
  }
}

// ---------------- Navigation ----------------

function switchTab(tab) {
  const studioTab = document.getElementById("tab-studio");
  const libraryTab = document.getElementById("tab-library");
  const studioBtn = document.getElementById("tab-studio-btn");
  const libraryBtn = document.getElementById("tab-library-btn");

  if (tab === "studio") {
    studioTab.classList.remove("hidden");
    libraryTab.classList.add("hidden");

    studioBtn.className = "px-4 py-2 rounded-lg text-sm font-semibold transition-all duration-200 bg-indigo-600 text-white shadow";
    libraryBtn.className = "px-4 py-2 rounded-lg text-sm font-semibold transition-all duration-200 text-slate-400 hover:text-white hover:bg-slate-700/50";
  } else {
    studioTab.classList.add("hidden");
    libraryTab.classList.remove("hidden");

    studioBtn.className = "px-4 py-2 rounded-lg text-sm font-semibold transition-all duration-200 text-slate-400 hover:text-white hover:bg-slate-700/50";
    libraryBtn.className = "px-4 py-2 rounded-lg text-sm font-semibold transition-all duration-200 bg-indigo-600 text-white shadow";
    loadLibrary();
  }
}

// ---------------- Upload & Auto-OCR ----------------

function handleDragOver(e) {
  e.preventDefault();
  document.getElementById("dropzone").classList.add("border-indigo-500", "bg-indigo-950/20");
}

function handleDragLeave(e) {
  e.preventDefault();
  document.getElementById("dropzone").classList.remove("border-indigo-500", "bg-indigo-950/20");
}

function handleDrop(e) {
  e.preventDefault();
  document.getElementById("dropzone").classList.remove("border-indigo-500", "bg-indigo-950/20");
  if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
    uploadAndOCRFiles(e.dataTransfer.files);
  }
}

function handleFileSelect(e) {
  if (e.target.files && e.target.files.length > 0) {
    uploadAndOCRFiles(e.target.files);
  }
}

async function uploadAndOCRFiles(files) {
  if (!currentSessionId) {
    await initSession();
  }

  const lang = document.getElementById("ocr-lang").value;
  const banner = document.getElementById("processing-banner");
  const hero = document.getElementById("hero-upload-box");
  const workspace = document.getElementById("pages-workspace");

  // Show processing animation
  banner.classList.remove("hidden");
  const procTitle = document.getElementById("processing-title");
  if (procTitle) procTitle.textContent = "Processing...";

  const autoCrop = document.getElementById("auto-crop-toggle")?.checked ?? true;
  const engine = document.getElementById("ocr-engine") ? document.getElementById("ocr-engine").value : "auto";
  const formData = new FormData();
  for (let i = 0; i < files.length; i++) {
    formData.append("files", files[i]);
  }
  formData.append("auto_ocr", "true");
  formData.append("auto_crop", autoCrop ? "true" : "false");
  formData.append("lang", lang);
  formData.append("engine", engine);

  try {
    const res = await fetch(`/api/session/${currentSessionId}/upload`, {
      method: "POST",
      body: formData
    });
    const data = await res.json();

    banner.classList.add("hidden");
    hero.classList.add("hidden");
    workspace.classList.remove("hidden");

    showToast(`Processed ${data.uploaded_pages.length} pages with AI OCR!`, "success");
    await refreshPages();

    // Auto-suggest title if empty
    const titleInput = document.getElementById("book-title");
    if (!titleInput.value.trim() && sessionPages.length > 0) {
      const p1 = sessionPages[0];
      if (p1.ocr_result && p1.ocr_result.lines && p1.ocr_result.lines.length > 0) {
        // Use first detected prominent line
        titleInput.value = p1.ocr_result.lines[0].text;
      } else {
        titleInput.value = p1.filename.replace(/\.[^/.]+$/, "");
      }
    }
  } catch (err) {
    banner.classList.add("hidden");
    showToast("Upload/OCR failed: " + err.message, "error");
  }
}

// ---------------- Workspace & Pages Rendering ----------------

async function refreshPages() {
  if (!currentSessionId) return;

  try {
    const res = await fetch(`/api/session/${currentSessionId}/pages`);
    const data = await res.json();
    sessionPages = data.pages || [];

    const badge = document.getElementById("page-count-badge");
    badge.textContent = `${sessionPages.length} ${sessionPages.length === 1 ? 'page' : 'pages'}`;

    renderPagesList();
  } catch (err) {
    console.error("Failed to refresh pages", err);
  }
}

function renderPagesList() {
  const container = document.getElementById("pages-list");
  container.innerHTML = "";

  if (sessionPages.length === 0) {
    document.getElementById("hero-upload-box").classList.remove("hidden");
    document.getElementById("pages-workspace").classList.add("hidden");
    return;
  }

  sessionPages.forEach((page, index) => {
    const card = document.createElement("div");
    card.className = "bg-slate-900 border border-slate-800 hover:border-slate-700 rounded-2xl p-4 sm:p-5 transition space-y-3";

    const linesCount = (page.ocr_result && page.ocr_result.lines) ? page.ocr_result.lines.length : 0;
    const fullText = (page.ocr_result && page.ocr_result.full_text) ? page.ocr_result.full_text : "";
    const isFlattened = page.is_flattened;
    const previewSrc = `${page.preview_url}?t=${page.updated_at || Date.now()}`;

    card.innerHTML = `
      <!-- Card Header -->
      <div class="flex items-center justify-between pb-3 border-b border-slate-800">
        <div class="flex flex-wrap items-center gap-2">
          <span class="px-2.5 py-1 rounded-lg bg-indigo-600/20 text-indigo-400 font-bold text-xs border border-indigo-500/30">
            Page ${index + 1}
          </span>
          <span class="text-xs text-slate-300 font-medium truncate max-w-xs" title="${page.filename}">
            ${page.filename}
          </span>
          ${isFlattened ? `<span class="text-[11px] px-2 py-0.5 rounded-full bg-violet-500/20 text-violet-300 border border-violet-500/30 flex items-center gap-1"><i class="fa-solid fa-wand-magic-sparkles"></i>Flattened</span>` : ''}
          <span class="text-[11px] px-2 py-0.5 rounded-full ${linesCount > 0 ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/25' : 'bg-amber-500/15 text-amber-400'}">
            ${linesCount > 0 ? `<i class="fa-solid fa-check mr-1"></i>${linesCount} lines recognized` : 'No text'}
          </span>
        </div>

        <!-- Page Controls (Auto-Straighten, Crop & Flatten, Re-scan, Move up, Move down, Delete) -->
        <div class="flex items-center space-x-1.5">
          <button onclick="autoStraightenPage('${page.id}')" title="Automatically detect book, straighten angle, and re-scan" class="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold transition mr-0.5 shadow flex items-center gap-1.5">
            <i class="fa-solid fa-wand-magic-sparkles"></i> Auto-Straighten
          </button>
          <button onclick="openCropModal('${page.id}')" title="Crop & Flatten Document" class="px-2.5 py-1 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold transition mr-1 shadow flex items-center gap-1.5">
            <i class="fa-solid fa-crop-simple"></i> Crop & Flatten
          </button>
          <button onclick="reRunPageOCR('${page.id}')" title="Re-scan this page with PaddleOCR" class="px-2 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-xs font-medium transition border border-slate-700">
            <i class="fa-solid fa-rotate"></i>
          </button>
          <button onclick="movePage(${index}, -1)" ${index === 0 ? 'disabled' : ''} title="Move up" class="w-7 h-7 rounded-lg bg-slate-800 hover:bg-slate-700 disabled:opacity-30 text-slate-300 text-xs flex items-center justify-center transition">
            <i class="fa-solid fa-arrow-up"></i>
          </button>
          <button onclick="movePage(${index}, 1)" ${index === sessionPages.length - 1 ? 'disabled' : ''} title="Move down" class="w-7 h-7 rounded-lg bg-slate-800 hover:bg-slate-700 disabled:opacity-30 text-slate-300 text-xs flex items-center justify-center transition">
            <i class="fa-solid fa-arrow-down"></i>
          </button>
          <button onclick="deletePage('${page.id}')" title="Remove page" class="w-7 h-7 rounded-lg bg-rose-500/15 hover:bg-rose-600 text-rose-300 hover:text-white text-xs flex items-center justify-center transition ml-1">
            <i class="fa-solid fa-trash-can"></i>
          </button>
        </div>
      </div>

      <!-- Card Body: Left Image & Right Extracted Text -->
      <div class="grid grid-cols-1 md:grid-cols-12 gap-4 items-start pt-1">
        
        <!-- Left: Image Preview with interactive canvas overlay -->
        <div onclick="openCropModal('${page.id}')" title="Click to Crop & Flatten" class="md:col-span-4 relative bg-slate-950 rounded-xl overflow-hidden border border-slate-800 aspect-[3/4] flex items-center justify-center group cursor-pointer">
          <img id="img-${page.id}" src="${previewSrc}" alt="Page ${index + 1}" class="max-h-full max-w-full object-contain">
          <canvas id="canvas-${page.id}" class="absolute inset-0 pointer-events-none w-full h-full"></canvas>
          <div class="absolute bottom-2 inset-x-2 py-1 bg-black/80 rounded text-[11px] text-center text-slate-300 backdrop-blur opacity-0 group-hover:opacity-100 transition shadow">
            <i class="fa-solid fa-crop-simple mr-1 text-indigo-400"></i> Click to Crop & Flatten
          </div>
        </div>

        <!-- Right: Extracted OCR Text Area -->
        <div class="md:col-span-8 flex flex-col space-y-2">
          <div class="flex items-center justify-between">
            <label class="text-xs font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
              <i class="fa-solid fa-align-left text-indigo-400"></i> Recognized Text
            </label>
            <div class="flex items-center space-x-2">
              <button onclick="playPageTTS('${page.id}')" id="tts-btn-${page.id}" title="Read aloud with Gemini TTS" class="px-2.5 py-1 rounded bg-violet-600/20 hover:bg-violet-600 text-violet-300 hover:text-white text-xs font-medium transition flex items-center gap-1.5 border border-violet-500/30">
                <i class="fa-solid fa-volume-high"></i> <span id="tts-label-${page.id}">Listen</span>
              </button>
              <button onclick="copyText('textarea-${page.id}')" class="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-xs font-medium transition">
                <i class="fa-regular fa-copy mr-1"></i>Copy Text
              </button>
              <button onclick="saveSinglePageText('${page.id}')" class="px-2.5 py-1 rounded bg-indigo-600/30 hover:bg-indigo-600 text-indigo-300 hover:text-white text-xs font-medium transition">
                <i class="fa-solid fa-check mr-1"></i>Save
              </button>
            </div>
          </div>

          <textarea id="textarea-${page.id}" rows="10" oninput="markPageEdited('${page.id}')" class="w-full bg-slate-950 border border-slate-800 rounded-xl p-3.5 text-xs sm:text-sm text-slate-200 font-mono leading-relaxed focus:outline-none focus:border-indigo-500 resize-y" placeholder="Extracted text...">${escapeHtml(fullText)}</textarea>
        </div>

      </div>
    `;

    container.appendChild(card);

    // Draw bounding boxes on canvas once image is loaded
    const imgEl = document.getElementById(`img-${page.id}`);
    const canvasEl = document.getElementById(`canvas-${page.id}`);
    if (imgEl && canvasEl) {
      imgEl.onload = () => drawPageCanvas(page.ocr_result, imgEl, canvasEl);
      if (imgEl.complete) {
        drawPageCanvas(page.ocr_result, imgEl, canvasEl);
      }
    }
  });

  // Append an Add More Pages card at the bottom of the list
  const addMoreCard = document.createElement("div");
  addMoreCard.className = "border-2 border-dashed border-slate-700/80 hover:border-indigo-500 bg-slate-900/40 hover:bg-indigo-950/20 rounded-2xl p-6 text-center cursor-pointer transition flex items-center justify-center gap-3 group";
  addMoreCard.onclick = () => document.getElementById("file-upload-input").click();
  addMoreCard.ondragover = (e) => {
    e.preventDefault();
    addMoreCard.classList.add("border-indigo-500", "bg-indigo-950/40");
  };
  addMoreCard.ondragleave = (e) => {
    e.preventDefault();
    addMoreCard.classList.remove("border-indigo-500", "bg-indigo-950/40");
  };
  addMoreCard.ondrop = (e) => {
    e.preventDefault();
    addMoreCard.classList.remove("border-indigo-500", "bg-indigo-950/40");
    if (e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      uploadAndOCRFiles(e.dataTransfer.files);
    }
  };
  addMoreCard.innerHTML = `
    <div class="w-10 h-10 rounded-xl bg-indigo-500/10 text-indigo-400 group-hover:scale-110 flex items-center justify-center text-lg border border-indigo-500/20 transition-transform">
      <i class="fa-solid fa-plus"></i>
    </div>
    <div class="text-left">
      <h4 class="text-sm font-bold text-white group-hover:text-indigo-300 transition">+ Add Page ${sessionPages.length + 1}</h4>
      <p class="text-xs text-slate-400">Click to upload or drag & drop next book image here</p>
    </div>
  `;
  container.appendChild(addMoreCard);
}

function drawPageCanvas(ocrResult, imgElement, canvasElement) {
  if (!ocrResult || !ocrResult.lines || !imgElement.naturalWidth) return;

  const parent = imgElement.parentElement;
  const containerW = parent.clientWidth;
  const containerH = parent.clientHeight;
  const naturalW = imgElement.naturalWidth;
  const naturalH = imgElement.naturalHeight;

  canvasElement.width = containerW;
  canvasElement.height = containerH;

  const ctx = canvasElement.getContext("2d");
  ctx.clearRect(0, 0, canvasElement.width, canvasElement.height);

  // Compute exact position and scale of the image rendered with object-contain
  const imageAspect = naturalW / naturalH;
  const containerAspect = containerW / containerH;

  let renderedW, renderedH, offsetX, offsetY;
  if (imageAspect > containerAspect) {
    // Width fits container, vertical letterbox bars on top/bottom
    renderedW = containerW;
    renderedH = containerW / imageAspect;
    offsetX = 0;
    offsetY = (containerH - renderedH) / 2;
  } else {
    // Height fits container, horizontal pillarbox bars on left/right
    renderedH = containerH;
    renderedW = containerH * imageAspect;
    offsetX = (containerW - renderedW) / 2;
    offsetY = 0;
  }

  const ocrW = (ocrResult && ocrResult.width) ? ocrResult.width : naturalW;
  const ocrH = (ocrResult && ocrResult.height) ? ocrResult.height : naturalH;

  const scaleX = renderedW / ocrW;
  const scaleY = renderedH / ocrH;

  ctx.strokeStyle = "rgba(99, 102, 241, 0.95)";
  ctx.lineWidth = 2;
  ctx.fillStyle = "rgba(99, 102, 241, 0.18)";

  ocrResult.lines.forEach(line => {
    const box = line.box;
    if (box && box.length === 4) {
      ctx.beginPath();
      ctx.moveTo(offsetX + box[0][0] * scaleX, offsetY + box[0][1] * scaleY);
      ctx.lineTo(offsetX + box[1][0] * scaleX, offsetY + box[1][1] * scaleY);
      ctx.lineTo(offsetX + box[2][0] * scaleX, offsetY + box[2][1] * scaleY);
      ctx.lineTo(offsetX + box[3][0] * scaleX, offsetY + box[3][1] * scaleY);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
    }
  });
}

function markPageEdited(pageId) {
  // Can give subtle visual cue
}

async function saveSinglePageText(pageId) {
  const textarea = document.getElementById(`textarea-${pageId}`);
  if (!textarea) return;

  try {
    await fetch(`/api/session/${currentSessionId}/page/${pageId}/ocr`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ full_text: textarea.value })
    });
    showToast("Text saved for this page!", "success");
  } catch (err) {
    showToast("Failed to save text", "error");
  }
}

function copyText(textareaId) {
  const el = document.getElementById(textareaId);
  if (!el) return;
  navigator.clipboard.writeText(el.value);
  showToast("Text copied to clipboard!", "success");
}

let activeAudioPlayer = null;

async function playPageTTS(pageId) {
  const btn = document.getElementById(`tts-btn-${pageId}`);
  const label = document.getElementById(`tts-label-${pageId}`);
  if (!btn) return;

  // If already playing this audio, stop it
  if (activeAudioPlayer && !activeAudioPlayer.paused && activeAudioPlayer.dataset.pageId === pageId) {
    activeAudioPlayer.pause();
    activeAudioPlayer = null;
    if (label) label.textContent = "Listen";
    btn.classList.remove("bg-violet-600", "text-white");
    return;
  }

  // Stop any previous audio
  if (activeAudioPlayer) {
    activeAudioPlayer.pause();
    document.querySelectorAll('[id^="tts-label-"]').forEach(l => l.textContent = "Listen");
  }

  const prevText = label ? label.textContent : "Listen";
  if (label) label.textContent = "Synthesizing...";
  btn.disabled = true;

  try {
    const res = await fetch(`/api/session/${currentSessionId}/page/${pageId}/tts`);
    if (!res.ok) {
      let errMsg = "Failed to generate audio";
      try {
        const errJson = await res.json();
        errMsg = errJson.detail || errMsg;
      } catch (_) {}
      throw new Error(errMsg);
    }

    const blob = await res.blob();
    const audioUrl = URL.createObjectURL(blob);
    const audio = new Audio(audioUrl);
    audio.dataset.pageId = pageId;
    activeAudioPlayer = audio;

    audio.onplay = () => {
      if (label) label.textContent = "Playing...";
      btn.classList.add("bg-violet-600", "text-white");
      btn.disabled = false;
    };

    audio.onended = () => {
      if (label) label.textContent = "Listen";
      btn.classList.remove("bg-violet-600", "text-white");
      activeAudioPlayer = null;
    };

    audio.onerror = () => {
      if (label) label.textContent = "Listen";
      btn.classList.remove("bg-violet-600", "text-white");
      activeAudioPlayer = null;
      showToast("Audio playback error", "error");
    };

    await audio.play();
  } catch (err) {
    showToast(err.message, "error");
    if (label) label.textContent = "Listen";
    btn.disabled = false;
  }
}

async function movePage(fromIndex, direction) {
  const toIndex = fromIndex + direction;
  if (toIndex < 0 || toIndex >= sessionPages.length) return;

  const reordered = [...sessionPages];
  const item = reordered.splice(fromIndex, 1)[0];
  reordered.splice(toIndex, 0, item);

  const pageIds = reordered.map(p => p.id);

  try {
    await fetch(`/api/session/${currentSessionId}/reorder`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ page_ids: pageIds })
    });
    await refreshPages();
  } catch (err) {
    showToast("Failed to reorder pages", "error");
  }
}

async function deletePage(pageId) {
  try {
    await fetch(`/api/session/${currentSessionId}/page/${pageId}`, { method: "DELETE" });
    showToast("Page deleted", "info");
    await refreshPages();
  } catch (err) {
    showToast("Failed to delete page", "error");
  }
}

async function autoStraightenPage(pageId) {
  if (!currentSessionId) return;
  showToast("Auto-detecting book, straightening angle, and scanning with PaddleOCR...", "info");

  try {
    const res = await fetch(`/api/session/${currentSessionId}/page/${pageId}/auto_flatten`, {
      method: "POST"
    });
    const data = await res.json();
    showToast("Book automatically straightened and scanned!", "success");
    await refreshPages();
  } catch (err) {
    showToast("Auto-straighten failed: " + err.message, "error");
  }
}

async function reRunPageOCR(pageId) {
  if (!currentSessionId) return;
  const lang = document.getElementById("ocr-lang").value;
  const engine = document.getElementById("ocr-engine") ? document.getElementById("ocr-engine").value : "auto";
  showToast("Re-scanning page with AI OCR...", "info");

  try {
    const res = await fetch(`/api/session/${currentSessionId}/ocr?page_id=${pageId}&lang=${lang}&engine=${engine}`, {
      method: "POST"
    });
    const data = await res.json();
    showToast("Page re-scanned with updated OCR engine!", "success");
    await refreshPages();
  } catch (err) {
    showToast("Re-scan failed: " + err.message, "error");
  }
}

// ---------------- Compile PDF Book ----------------

async function compileBook() {
  if (!currentSessionId || sessionPages.length === 0) {
    showToast("Please upload at least one page first!", "error");
    return;
  }

  const titleInput = document.getElementById("book-title");
  const authorInput = document.getElementById("book-author");
  const title = titleInput.value.trim() || "Untitled Book";
  const author = authorInput.value.trim() || "Unknown Author";

  const btn = document.getElementById("compile-btn");
  btn.disabled = true;
  btn.innerHTML = `<i class="fa-solid fa-circle-notch fa-spin"></i> Creating PDF...`;
  showToast("Compiling Searchable PDF Book and saving to database...", "info");

  // Sync any edited textareas
  for (const p of sessionPages) {
    const textarea = document.getElementById(`textarea-${p.id}`);
    if (textarea && p.ocr_result) {
      p.ocr_result.full_text = textarea.value;
    }
  }

  try {
    const res = await fetch(`/api/session/${currentSessionId}/compile`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: title,
        author: author,
        description: `Digitized book (${sessionPages.length} pages)`,
        tags: ["ocr", "scanned"]
      })
    });
    const data = await res.json();
    showToast("PDF Book created successfully!", "success");

    // Clear inputs & refresh library
    titleInput.value = "";
    authorInput.value = "";
    switchTab("library");
    await loadLibrary();

    // Immediately open PDF Reader modal with Download button!
    if (data.book && data.book.id) {
      openPDFReader(data.book.id, data.book.title);
    }
  } catch (err) {
    showToast("Compilation failed: " + err.message, "error");
  } finally {
    btn.disabled = false;
    btn.innerHTML = `<i class="fa-solid fa-file-pdf"></i> Create PDF Book`;
  }
}

// ---------------- Digital Library ----------------

let searchTimer = null;
function handleLibrarySearch(e) {
  clearTimeout(searchTimer);
  searchTimer = setTimeout(() => {
    loadLibrary(e.target.value.trim());
  }, 300);
}

async function loadLibrary(searchQuery = "") {
  try {
    const url = searchQuery ? `/api/library?q=${encodeURIComponent(searchQuery)}` : `/api/library`;
    const res = await fetch(url);
    const data = await res.json();
    libraryBooks = data.books || [];

    document.getElementById("library-count-badge").textContent = data.count || 0;
    renderLibraryGrid();
  } catch (err) {
    console.error("Failed to load library", err);
  }
}

function renderLibraryGrid() {
  const grid = document.getElementById("library-grid");
  const emptyState = document.getElementById("library-empty-state");

  grid.innerHTML = "";

  if (libraryBooks.length === 0) {
    emptyState.classList.remove("hidden");
    return;
  }
  emptyState.classList.add("hidden");

  libraryBooks.forEach(book => {
    const card = document.createElement("div");
    card.className = "book-card bg-slate-900 border border-slate-800 rounded-2xl p-4 flex flex-col justify-between group";

    const coverSrc = book.has_cover ? `/api/library/${book.id}/cover` : null;

    card.innerHTML = `
      <div>
        <div class="relative w-full aspect-[3/4] bg-slate-950 rounded-xl overflow-hidden mb-3 border border-slate-800 flex items-center justify-center">
          ${coverSrc 
            ? `<img src="${coverSrc}" alt="${book.title}" class="w-full h-full object-cover">` 
            : `<div class="text-center text-slate-600"><i class="fa-solid fa-book text-4xl mb-2"></i><p class="text-xs">No Cover</p></div>`}

          ${book.ocr_match ? `<span class="absolute bottom-2 left-2 bg-indigo-600/90 text-white text-[10px] font-semibold px-2 py-0.5 rounded shadow">Match in text</span>` : ''}

          <div class="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition flex items-center justify-center gap-2 backdrop-blur-sm">
            <button onclick="openPDFReader('${book.id}', '${escapeHtml(book.title)}')" class="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-bold shadow transition">
              <i class="fa-solid fa-book-open mr-1"></i>Read
            </button>
            <a href="/api/library/${book.id}/pdf?download=true" class="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-lg text-xs font-bold transition">
              <i class="fa-solid fa-download mr-1"></i>PDF
            </a>
          </div>
        </div>

        <h3 class="text-sm font-bold text-white truncate" title="${book.title}">${book.title}</h3>
        <p class="text-xs text-slate-400 truncate mt-0.5">${book.author || "Unknown"}</p>

        <div class="flex items-center gap-2 mt-2 text-[11px] text-slate-500">
          <span><i class="fa-regular fa-file mr-1"></i>${book.page_count} pages</span>
          <span>•</span>
          <span>${book.file_size_mb} MB</span>
        </div>
      </div>

      <div class="flex items-center justify-between border-t border-slate-800/80 pt-3 mt-4 text-xs">
        <a href="/api/library/${book.id}/transcript?download=true" class="text-slate-400 hover:text-indigo-400 transition" title="Export raw text transcript">
          <i class="fa-solid fa-file-lines mr-1"></i>Text
        </a>
        <button onclick="deleteBook('${book.id}')" class="text-slate-500 hover:text-rose-400 transition" title="Delete book">
          <i class="fa-solid fa-trash-can"></i>
        </button>
      </div>
    `;

    grid.appendChild(card);
  });
}

function escapeHtml(str) {
  if (!str) return '';
  return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#039;");
}

function openPDFReader(bookId, title) {
  const modal = document.getElementById("reader-modal");
  const iframe = document.getElementById("reader-iframe");
  const titleEl = document.getElementById("reader-title");
  const dlBtn = document.getElementById("reader-download-btn");

  titleEl.textContent = title;
  dlBtn.href = `/api/library/${bookId}/pdf?download=true`;
  iframe.src = `/api/library/${bookId}/pdf`;

  modal.classList.remove("hidden");
  document.body.style.overflow = "hidden";
}

function closePDFReader() {
  const modal = document.getElementById("reader-modal");
  const iframe = document.getElementById("reader-iframe");
  iframe.src = "";
  modal.classList.add("hidden");
  document.body.style.overflow = "auto";
}

async function deleteBook(bookId) {
  if (!confirm("Delete this book from your digital library?")) return;

  try {
    await fetch(`/api/library/${bookId}`, { method: "DELETE" });
    showToast("Book deleted", "info");
    await loadLibrary();
  } catch (err) {
    showToast("Failed to delete", "error");
  }
}

// ---------------- Toast ----------------

let toastTimeout = null;
function showToast(message, type = "info") {
  const toast = document.getElementById("toast");
  const msgEl = document.getElementById("toast-message");
  const iconEl = document.getElementById("toast-icon");

  msgEl.textContent = message;
  toast.className = "fixed bottom-6 right-6 z-50 px-4 py-3 rounded-xl shadow-2xl border text-sm flex items-center space-x-3 transition-all";

  if (type === "success") {
    toast.classList.add("bg-emerald-950", "border-emerald-700", "text-emerald-200");
    iconEl.className = "fa-solid fa-circle-check text-emerald-400";
  } else if (type === "error") {
    toast.classList.add("bg-rose-950", "border-rose-700", "text-rose-200");
    iconEl.className = "fa-solid fa-circle-exclamation text-rose-400";
  } else {
    toast.classList.add("bg-slate-900", "border-slate-700", "text-slate-200");
    iconEl.className = "fa-solid fa-circle-info text-indigo-400";
  }

  toast.classList.remove("hidden");
  clearTimeout(toastTimeout);
  toastTimeout = setTimeout(() => {
    toast.classList.add("hidden");
  }, 4000);
}

// ---------------- Interactive Crop & Perspective Flattening ----------------

let activeCropPageId = null;
let cropCorners = []; // [[x0, y0], [x1, y1], [x2, y2], [x3, y3]] in natural image coordinates
let dragPointIdx = -1;
let cropImgNaturalW = 0;
let cropImgNaturalH = 0;

async function openCropModal(pageId) {
  activeCropPageId = pageId;
  const modal = document.getElementById("crop-modal");
  const cropImg = document.getElementById("crop-img");
  const cropCanvas = document.getElementById("crop-canvas");

  modal.classList.remove("hidden");
  document.body.style.overflow = "hidden";

  showToast("Detecting book page boundaries...", "info");

  try {
    const res = await fetch(`/api/session/${currentSessionId}/page/${pageId}/corners`);
    const data = await res.json();
    cropCorners = data.corners;
    cropImgNaturalW = data.width;
    cropImgNaturalH = data.height;

    const sep = data.preview_url.includes("?") ? "&" : "?";
    cropImg.src = `${data.preview_url}${sep}t=${Date.now()}`;
    cropImg.onload = () => {
      requestAnimationFrame(initCropCanvas);
    };
    if (cropImg.complete) {
      requestAnimationFrame(initCropCanvas);
    }
  } catch (err) {
    showToast("Failed to load page corners: " + err.message, "error");
  }
}

function closeCropModal() {
  const modal = document.getElementById("crop-modal");
  modal.classList.add("hidden");
  document.body.style.overflow = "auto";
  activeCropPageId = null;
}

function initCropCanvas() {
  const cropImg = document.getElementById("crop-img");
  const canvas = document.getElementById("crop-canvas");

  canvas.width = cropImg.clientWidth;
  canvas.height = cropImg.clientHeight;

  drawCropCanvas();

  // Attach mouse & touch handlers
  canvas.onmousedown = onCropMouseDown;
  canvas.onmousemove = onCropMouseMove;
  window.onmouseup = onCropMouseUp;

  canvas.ontouchstart = onCropTouchStart;
  canvas.ontouchmove = onCropTouchMove;
  window.ontouchend = onCropTouchEnd;
}

function getCanvasScaleAndOffset() {
  const cropImg = document.getElementById("crop-img");
  const canvas = document.getElementById("crop-canvas");

  const scaleX = canvas.width / cropImgNaturalW;
  const scaleY = canvas.height / cropImgNaturalH;

  return { scaleX, scaleY };
}

function drawCropCanvas() {
  const canvas = document.getElementById("crop-canvas");
  if (!canvas || cropCorners.length !== 4) return;

  const ctx = canvas.getContext("2d");
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  const { scaleX, scaleY } = getCanvasScaleAndOffset();

  // Convert corners to canvas display coordinates
  const pts = cropCorners.map(p => ({
    x: p[0] * scaleX,
    y: p[1] * scaleY
  }));

  // Draw semi-transparent darkened background mask outside quadrilateral
  ctx.save();
  ctx.beginPath();
  ctx.rect(0, 0, canvas.width, canvas.height);
  ctx.moveTo(pts[0].x, pts[0].y);
  ctx.lineTo(pts[1].x, pts[1].y);
  ctx.lineTo(pts[2].x, pts[2].y);
  ctx.lineTo(pts[3].x, pts[3].y);
  ctx.closePath();
  ctx.fillStyle = "rgba(0, 0, 0, 0.45)";
  ctx.fill("evenodd");
  ctx.restore();

  // Draw quadrilateral boundary lines
  ctx.beginPath();
  ctx.moveTo(pts[0].x, pts[0].y);
  ctx.lineTo(pts[1].x, pts[1].y);
  ctx.lineTo(pts[2].x, pts[2].y);
  ctx.lineTo(pts[3].x, pts[3].y);
  ctx.closePath();
  ctx.strokeStyle = "#6366f1";
  ctx.lineWidth = 2.5;
  ctx.stroke();

  // Draw 4 interactive corner handles
  const labels = ["TL", "TR", "BR", "BL"];
  pts.forEach((pt, i) => {
    // Outer glow
    ctx.beginPath();
    ctx.arc(pt.x, pt.y, 14, 0, 2 * Math.PI);
    ctx.fillStyle = "rgba(99, 102, 241, 0.3)";
    ctx.fill();

    // Solid handle
    ctx.beginPath();
    ctx.arc(pt.x, pt.y, 8, 0, 2 * Math.PI);
    ctx.fillStyle = (i === dragPointIdx) ? "#38bdf8" : "#ffffff";
    ctx.fill();
    ctx.strokeStyle = "#4f46e5";
    ctx.lineWidth = 2.5;
    ctx.stroke();

    // Label tag
    ctx.font = "bold 10px sans-serif";
    ctx.fillStyle = "#ffffff";
    ctx.fillText(labels[i], pt.x - 6, pt.y - 14);
  });
}

function findNearestCorner(mouseX, mouseY) {
  const { scaleX, scaleY } = getCanvasScaleAndOffset();
  for (let i = 0; i < cropCorners.length; i++) {
    const cx = cropCorners[i][0] * scaleX;
    const cy = cropCorners[i][1] * scaleY;
    const dist = Math.hypot(mouseX - cx, mouseY - cy);
    if (dist <= 24) {
      return i;
    }
  }
  return -1;
}

function onCropMouseDown(e) {
  const rect = e.target.getBoundingClientRect();
  const mouseX = e.clientX - rect.left;
  const mouseY = e.clientY - rect.top;

  dragPointIdx = findNearestCorner(mouseX, mouseY);
  if (dragPointIdx !== -1) {
    drawCropCanvas();
  }
}

function onCropMouseMove(e) {
  if (dragPointIdx === -1) return;

  const canvas = document.getElementById("crop-canvas");
  const rect = canvas.getBoundingClientRect();
  const mouseX = Math.max(0, Math.min(e.clientX - rect.left, canvas.width));
  const mouseY = Math.max(0, Math.min(e.clientY - rect.top, canvas.height));

  const { scaleX, scaleY } = getCanvasScaleAndOffset();

  cropCorners[dragPointIdx][0] = mouseX / scaleX;
  cropCorners[dragPointIdx][1] = mouseY / scaleY;

  drawCropCanvas();
}

function onCropMouseUp() {
  if (dragPointIdx !== -1) {
    dragPointIdx = -1;
    drawCropCanvas();
  }
}

function onCropTouchStart(e) {
  if (e.touches.length > 0) {
    const touch = e.touches[0];
    const rect = e.target.getBoundingClientRect();
    dragPointIdx = findNearestCorner(touch.clientX - rect.left, touch.clientY - rect.top);
    if (dragPointIdx !== -1) drawCropCanvas();
  }
}

function onCropTouchMove(e) {
  if (dragPointIdx === -1 || e.touches.length === 0) return;
  e.preventDefault();
  const touch = e.touches[0];
  const canvas = document.getElementById("crop-canvas");
  const rect = canvas.getBoundingClientRect();
  const mouseX = Math.max(0, Math.min(touch.clientX - rect.left, canvas.width));
  const mouseY = Math.max(0, Math.min(touch.clientY - rect.top, canvas.height));

  const { scaleX, scaleY } = getCanvasScaleAndOffset();
  cropCorners[dragPointIdx][0] = mouseX / scaleX;
  cropCorners[dragPointIdx][1] = mouseY / scaleY;
  drawCropCanvas();
}

function onCropTouchEnd() {
  dragPointIdx = -1;
  drawCropCanvas();
}

async function autoDetectModalCorners() {
  if (!activeCropPageId) return;
  showToast("Re-detecting document edges with OpenCV...", "info");
  try {
    const res = await fetch(`/api/session/${currentSessionId}/page/${activeCropPageId}/corners`);
    const data = await res.json();
    cropCorners = data.corners;
    drawCropCanvas();
    showToast("Corners auto-detected!", "success");
  } catch (err) {
    showToast("Auto-detection failed: " + err.message, "error");
  }
}

async function applyPerspectiveCrop() {
  if (!activeCropPageId || cropCorners.length !== 4) return;

  const btn = document.getElementById("apply-crop-btn");
  btn.disabled = true;
  btn.innerHTML = `<i class="fa-solid fa-circle-notch fa-spin"></i> Flattening & Scanning...`;

  showToast("Flattening book page and running PaddleOCR...", "info");

  try {
    const res = await fetch(`/api/session/${currentSessionId}/page/${activeCropPageId}/crop`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ corners: cropCorners })
    });
    const data = await res.json();
    showToast("Page flattened and re-scanned successfully!", "success");
    closeCropModal();
    await refreshPages();
  } catch (err) {
    showToast("Crop failed: " + err.message, "error");
  } finally {
    btn.disabled = false;
    btn.innerHTML = `<i class="fa-solid fa-check"></i> Flatten & Run OCR`;
  }
}
