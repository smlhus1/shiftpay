/**
 * OCR backend client — Supabase Edge Function or local backend.
 * Client-side resize (expo-image-manipulator) will be re-enabled after next dev build.
 * EXPO_PUBLIC_API_URL = full OCR endpoint URL (e.g. https://xxx.supabase.co/functions/v1/ocr).
 */

import { getTranslation } from "./i18n";

const getOcrUrl = (): string => {
  const url = process.env.EXPO_PUBLIC_API_URL;
  if (!url) throw new Error(getTranslation("api.ocrNotConfigured"));
  return url;
};

export interface OcrShift {
  date: string;
  start_time: string;
  end_time: string;
  shift_type: string;
  confidence?: number;
}

export interface OcrResponse {
  shifts: OcrShift[];
  confidence: number;
  method: "tesseract" | "vision" | "claude-vision";
}

const OCR_TIMEOUT_MS = 30_000;

export async function postOcr(imageUri: string): Promise<OcrResponse> {
  const uriToSend = imageUri;

  const formData = new FormData();
  formData.append("file", {
    uri: uriToSend,
    name: "photo.jpg",
    type: "image/jpeg",
  } as unknown as Blob);

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), OCR_TIMEOUT_MS);

  try {
    const res = await fetch(getOcrUrl(), {
      method: "POST",
      body: formData,
      headers: {},
      signal: controller.signal,
    });
    clearTimeout(timeoutId);

    if (!res.ok) {
      let detail = getTranslation("api.ocrError", { status: res.status });
      try {
        const body = await res.json();
        if (body.detail) detail = body.detail;
      } catch {
        // ignore
      }
      throw new Error(detail);
    }

    return res.json();
  } catch (e) {
    clearTimeout(timeoutId);
    if (e instanceof Error) {
      if (e.name === "AbortError") {
        throw new Error(getTranslation("api.ocrTimeout"));
      }
      throw e;
    }
    throw e;
  }
}
