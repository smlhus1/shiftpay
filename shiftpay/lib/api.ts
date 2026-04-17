/**
 * OCR backend client — Supabase Edge Function.
 *
 * EXPO_PUBLIC_API_URL = full OCR endpoint URL (e.g. https://xxx.supabase.co/functions/v1/ocr).
 * EXPO_PUBLIC_OCR_API_KEY = shared secret for OCR endpoint authentication.
 *
 * Response shape validated with Valibot at the boundary (lib/ocr-schema.ts).
 * Any shape drift between server and client throws a visible error instead
 * of corrupting imported shifts. Same schema lives in
 * supabase/functions/ocr/schema.ts; update both files together.
 */

import * as v from "valibot";
import { manipulateAsync, SaveFormat } from "expo-image-manipulator";
import { getTranslation } from "./i18n";
import { OcrResponseSchema, type OcrResponse, type OcrShift } from "./ocr-schema";

export type { OcrResponse, OcrShift };

const getOcrUrl = (): string => {
  const url = process.env.EXPO_PUBLIC_API_URL;
  if (!url) throw new Error(getTranslation("api.ocrNotConfigured"));
  return url;
};

const getOcrApiKey = (): string | undefined => {
  return process.env.EXPO_PUBLIC_OCR_API_KEY || undefined;
};

const OCR_TIMEOUT_MS = 30_000;

// Resize cap chosen so Claude Haiku Vision still sees timesheet cell text
// clearly but we cut common phone photos (12-48 MP) down to ~2 MB and,
// crucially, drop GPS/EXIF metadata. manipulateAsync re-encodes the image
// as JPEG which removes the EXIF block as a side effect.
const RESIZE_MAX_DIMENSION = 2048;
const RESIZE_JPEG_QUALITY = 0.85;

/**
 * Re-encode the image to a capped JPEG. The re-encode is the point — it
 * strips EXIF metadata (GPS coordinates that often point straight at a
 * hospital or care home) before the photo ever leaves the device.
 */
async function resizeAndStripExif(imageUri: string): Promise<string> {
  try {
    const result = await manipulateAsync(imageUri, [{ resize: { width: RESIZE_MAX_DIMENSION } }], {
      compress: RESIZE_JPEG_QUALITY,
      format: SaveFormat.JPEG,
    });
    return result.uri;
  } catch {
    // Manipulation failure is not fatal — we still prefer a potentially-
    // EXIF-bearing upload to blocking the user's only OCR path. The
    // server-side magic-number probe + no-storage guarantee bounds the
    // worst case.
    return imageUri;
  }
}

export async function postOcr(imageUri: string): Promise<OcrResponse> {
  // Always resize before upload — the re-encode strips EXIF (GPS/time
  // metadata) that can leak the user's workplace location. See the
  // research for Pass 3 §7.
  const uriToSend = await resizeAndStripExif(imageUri);

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
    const parsed = v.safeParse(OcrResponseSchema, raw);
    if (!parsed.success) {
      if (__DEV__) {
        console.warn("[ShiftPay] OCR response shape mismatch:", parsed.issues);
      }
      throw new Error(getTranslation("api.ocrError", { status: 502 }));
    }
    return parsed.output;
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
