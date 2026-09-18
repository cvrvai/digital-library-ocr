export const API_BASE = "/api";

export async function apiFetch<T>(
  endpoint: string,
  options?: RequestInit
): Promise<T> {
  const url = endpoint.startsWith("http") ? endpoint : `${API_BASE}${endpoint}`;
  const response = await fetch(url, options);

  if (!response.ok) {
    let errorMessage = `HTTP ${response.status} ${response.statusText}`;
    try {
      const errJson = await response.json();
      if (errJson && errJson.detail) {
        errorMessage = typeof errJson.detail === "string" ? errJson.detail : JSON.stringify(errJson.detail);
      }
    } catch {
      // Not JSON
    }
    throw new Error(errorMessage);
  }

  return response.json() as Promise<T>;
}
