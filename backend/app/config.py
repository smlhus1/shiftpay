"""Configuration via environment."""
from typing import Optional
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    environment: str = "development"
    api_host: str = "0.0.0.0"
    api_port: int = 8000
    secret_salt: str = "change-me-min-32-chars-required-for-security"
    tesseract_path: str = "/usr/bin/tesseract"
    ocr_language: str = "nor"
    openai_api_key: Optional[str] = None
    openai_model: str = "gpt-4o"
    max_file_size_mb: int = 10
    allowed_origins: str = "http://localhost:8081"

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore",
    )

    @property
    def cors_origins(self) -> list[str]:
        return [o.strip() for o in self.allowed_origins.split(",") if o.strip()]


settings = Settings()
