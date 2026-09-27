import { API_ORIGIN } from "./api-client";

/** Public URL of an uploaded picture. Keys come from the API and are never reused. */
export function mediaUrl(key: string | null | undefined) {
  return key ? `${API_ORIGIN}/api/v1/media/files/${encodeURIComponent(key)}` : undefined;
}
