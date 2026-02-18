# ShiftPay OCR backend — Railway/Fly.io
FROM python:3.12-slim

# Tesseract OCR
RUN apt-get update && apt-get install -y --no-install-recommends \
    tesseract-ocr \
    tesseract-ocr-nor \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY app/ ./app/

ENV PYTHONUNBUFFERED=1
ENV PORT=8000
EXPOSE 8000

# Render setter PORT=10000; lokalt brukes 8000
CMD ["sh", "-c", "uvicorn app.main:app --host 0.0.0.0 --port ${PORT:-8000}"]
