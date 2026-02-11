"""
ScheduleBox AI Service Configuration

Uses pydantic-settings for environment variable management with .env file support.
"""

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """AI service configuration loaded from environment variables."""

    ENVIRONMENT: str = "development"
    AI_SERVICE_PORT: int = 8000
    REDIS_URL: str = "redis://localhost:6379"
    SCHEDULEBOX_API_URL: str = "http://localhost:3000"
    MODEL_DIR: str = "./models"
    ALLOWED_ORIGINS: list[str] = ["http://localhost:3000"]
    LOG_LEVEL: str = "info"

    model_config = SettingsConfigDict(env_file=".env")


settings = Settings()
