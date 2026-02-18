/**
 * OCR backend client — used in Phase 2.
 * Stub for now.
 */

const getApiUrl = () =>
  process.env.EXPO_PUBLIC_API_URL ?? "http://localhost:8000";

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
  method: "tesseract" | "vision";
}

export async function postOcr(_imageUri: string): Promise<OcrResponse> {
  const base = getApiUrl();
  const res = await fetch(`${base}/api/ocr`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ image_uri: _imageUri }),
  });
  if (!res.ok) throw new Error(`OCR failed: ${res.status}`);
  return res.json();
}
