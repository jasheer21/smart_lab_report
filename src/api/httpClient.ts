export interface ApiResponse<T> {
  success: boolean;
  message?: string;
  data?: T;
}

const API_BASE_URL = (import.meta.env.VITE_API_URL || '').replace(/\/$/, '');

export function toErrorMessage(err: unknown, fallback: string): string {
  if (!err) return fallback;
  const e = err as { response?: { data?: { message?: string } }; message?: string };
  return e?.response?.data?.message || e?.message || fallback;
}

/** Calls the Smart Report API. Never throws for HTTP or network errors; aborts still reject. */
export async function apiRequest<T>(path: string, init: RequestInit = {}): Promise<ApiResponse<T>> {
  let res: Response;
  try {
    res = await fetch(`${API_BASE_URL}${path}`, init);
  } catch (err) {
    if (err instanceof DOMException && err.name === 'AbortError') throw err;
    return { success: false, message: 'Cannot reach the Smart Report server. Is it running (npm run dev:server)?' };
  }

  const body = (await res.json().catch(() => null)) as ApiResponse<T> | null;
  if (!body) return { success: false, message: `Server responded with ${res.status} ${res.statusText}` };
  return body;
}
