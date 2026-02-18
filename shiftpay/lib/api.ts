/**
 * OCR backend client — used in Phase 2.
 * POST multipart/form-data with image file. EXPO_PUBLIC_API_URL = full OCR endpoint URL
 * (e.g. https://shiftpay-xxx.onrender.com/api/ocr or https://xxx.supabase.co/functions/v1/ocr).
 */

const getOcrUrl = (): string => {
  const url = process.env.EXPO_PUBLIC_API_URL;
  if (url) return url;
  return "http://localhost:8000/api/ocr";
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
  method: "tesseract" | "vision";
}

export async function postOcr(imageUri: string): Promise<OcrResponse> {
  const formData = new FormData();
  formData.append("file", {
    uri: imageUri,
    name: "photo.jpg",
    type: "image/jpeg",
  } as unknown as Blob);

  const res = await fetch(getOcrUrl(), {
    method: "POST",
    body: formData,
    headers: {},
  });

  if (!res.ok) {
    let detail = `OCR failed: ${res.status}`;
    try {
      const body = await res.json();
      if (body.detail) detail = body.detail;
    } catch {
      // ignore
    }
    throw new Error(detail);
  }

  return res.json();
}
