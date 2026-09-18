import { apiFetch, API_BASE } from "./client";
import type { LibraryBook } from "../types";

export const libraryApi = {
  async getBooks(query?: string): Promise<LibraryBook[]> {
    const q = query ? `?q=${encodeURIComponent(query)}` : "";
    const res = await apiFetch<{ count: number; books: LibraryBook[] }>(`/library${q}`);
    return res.books || [];
  },

  async getBook(bookId: string): Promise<LibraryBook> {
    return apiFetch<LibraryBook>(`/library/${bookId}`);
  },

  async deleteBook(bookId: string): Promise<void> {
    await apiFetch(`/library/${bookId}`, {
      method: "DELETE",
    });
  },

  getPdfUrl(bookId: string, download = false): string {
    return `${API_BASE}/library/${bookId}/pdf${download ? "?download=true" : ""}`;
  },

  getCoverUrl(bookId: string): string {
    return `${API_BASE}/library/${bookId}/cover`;
  },

  getTranscriptUrl(bookId: string, download = false): string {
    return `${API_BASE}/library/${bookId}/transcript${download ? "?download=true" : ""}`;
  },
};
