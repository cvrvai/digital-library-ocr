import { apiFetch, API_BASE } from "./client";
import type { PageItem, SessionInfo, BookCompilePayload, OCRResult } from "../types";

export const sessionApi = {
  async createSession(): Promise<string> {
    const res = await apiFetch<{ session_id: string }>("/session/create", {
      method: "POST",
    });
    return res.session_id;
  },

  async getPages(sessionId: string): Promise<PageItem[]> {
    const res = await apiFetch<SessionInfo>(`/session/${sessionId}/pages`);
    return res.pages || [];
  },

  async uploadPages(
    sessionId: string,
    files: File[],
    autoOcr: boolean = true,
    autoCrop: boolean = true,
    lang: string = "km",
    engine: string = "auto"
  ): Promise<PageItem[]> {
    const formData = new FormData();
    files.forEach((f) => formData.append("files", f));
    formData.append("auto_ocr", autoOcr.toString());
    formData.append("auto_crop", autoCrop.toString());
    formData.append("lang", lang);
    formData.append("engine", engine);

    const res = await apiFetch<{ uploaded_pages: PageItem[] }>(
      `/session/${sessionId}/upload`,
      {
        method: "POST",
        body: formData,
      }
    );
    return res.uploaded_pages;
  },

  async runPageOcr(
    sessionId: string,
    pageId: string,
    lang: string = "km",
    engine: string = "auto"
  ): Promise<OCRResult> {
    const query = new URLSearchParams({
      page_id: pageId,
      lang,
      engine,
    });
    const res = await apiFetch<{ results: Array<{ ocr_result: OCRResult }> }>(
      `/session/${sessionId}/ocr?${query.toString()}`,
      { method: "POST" }
    );
    return res.results[0]?.ocr_result;
  },

  async updatePageOcr(
    sessionId: string,
    pageId: string,
    fullText: string
  ): Promise<OCRResult> {
    const res = await apiFetch<{ ocr_result: OCRResult }>(
      `/session/${sessionId}/page/${pageId}/ocr`,
      {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ full_text: fullText }),
      }
    );
    return res.ocr_result;
  },

  async autoFlattenPage(sessionId: string, pageId: string): Promise<PageItem> {
    const res = await apiFetch<PageItem>(
      `/session/${sessionId}/page/${pageId}/auto_flatten`,
      { method: "POST" }
    );
    return res;
  },

  async deletePage(sessionId: string, pageId: string): Promise<void> {
    await apiFetch(`/session/${sessionId}/page/${pageId}`, {
      method: "DELETE",
    });
  },

  async reorderPages(sessionId: string, pageIds: string[]): Promise<void> {
    await apiFetch(`/session/${sessionId}/reorder`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ page_ids: pageIds }),
    });
  },

  async compileBook(
    sessionId: string,
    payload: BookCompilePayload
  ): Promise<{ book: any; download_url: string; cover_url?: string }> {
    return apiFetch(`/session/${sessionId}/compile`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
  },

  getPagePreviewUrl(sessionId: string, pageId: string, orig = false): string {
    return `${API_BASE}/session/${sessionId}/page/${pageId}/preview${orig ? "?orig=1" : ""}`;
  },

  getTTSAudioUrl(sessionId: string, pageId: string): string {
    return `${API_BASE}/session/${sessionId}/page/${pageId}/tts`;
  },

  async directOcr(file: File, lang = "km", engine = "auto"): Promise<{
    text: string;
    line_count: number;
    lines: string[];
    engine: string;
  }> {
    const formData = new FormData();
    formData.append("file", file);
    formData.append("lang", lang);
    formData.append("engine", engine);

    return apiFetch("/ocr", {
      method: "POST",
      body: formData,
    });
  }
};
