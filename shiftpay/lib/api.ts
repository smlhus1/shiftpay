/**
 * OCR backend client — Supabase Edge Function or local backend.
 * Client-side resize (expo-image-manipulator) will be re-enabled after next dev build.
 * EXPO_PUBLIC_API_URL = full OCR endpoint URL (e.g. https://xxx.supabase.co/functions/v1/ocr).
 * EXPO_PUBLIC_OCR_API_KEY = shared secret for OCR endpoint authentication.
 */

import { getTranslation } from "./i18n";

const getOcrUrl = (): string => {
  const url = process.env.EXPO_PUBLIC_API_URL;
  if (!url) throw new Error(getTranslation("api.ocrNotConfigured"));
  return url;
};

const getOcrApiKey = (): string | undefined => {
  return process.env.EXPO_PUBLIC_OCR_API_KEY || undefined;
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

const DATE_RE = /^\d{1,2}\.\d{1,2}\.\d{4}$/;
const TIME_RE = /^\d{1,2}:\d{2}$/;

/** Validate and sanitize OCR response from server. */
function validateOcrResponse(data: unknown): OcrResponse {
  if (!data || typeof data !== "object") {
    throw new Error("Invalid OCR response format");
  }
  const obj = data as Record<string, unknown>;
  if (!Array.isArray(obj.shifts)) {
    throw new Error("Invalid OCR response: missing shifts array");
  }
  const shifts: OcrShift[] = obj.shifts
    .filter(
      (s: unknown) =>
        s &&
        typeof s === "object" &&
        typeof (s as Record<string, unknown>).date === "string" &&
        typeof (s as Record<string, unknown>).start_time === "string" &&
        typeof (s as Record<string, unknown>).end_time === "string" &&
        DATE_RE.test((s as Record<string, unknown>).date as string) &&
        TIME_RE.test((s as Record<string, unknown>).start_time as string) &&
        TIME_RE.test((s as Record<string, unknown>).end_time as string)
    )
    .map((s: unknown) => {
      const shift = s as Record<string, unknown>;
      return {
        date: shift.date as string,
        start_time: shift.start_time as string,
        end_time: shift.end_time as string,
        shift_type: typeof shift.shift_type === "string" ? shift.shift_type : "tidlig",
        confidence: typeof shift.confidence === "number" ? shift.confidence : undefined,
      };
    });
  return {
    shifts,
    confidence: typeof obj.confidence === "number" ? obj.confidence : 0,
    method: (obj.method as OcrResponse["method"]) ?? "claude-vision",
  };
}

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

  const headers: Record<string, string> = {};
  const apiKey = getOcrApiKey();
  if (apiKey) {
    headers["X-API-Key"] = apiKey;
  }

  try {
    const res = await fetch(getOcrUrl(), {
      method: "POST",
      body: formData,
      headers,
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

    const raw = await res.json();
    return validateOcrResponse(raw);
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
