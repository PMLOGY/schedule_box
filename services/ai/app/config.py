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

    # OpenAI settings (Phase 14 - Voice/Follow-up features)
    OPENAI_API_KEY: str = ""  # Required for voice/follow-up features
    OPENAI_MODEL: str = "gpt-4-turbo"  # Default model for NLU
    OPENAI_FOLLOWUP_MODEL: str = "gpt-4o-mini"  # Cost-effective for email generation
    GOOGLE_PLACES_API_KEY: str = ""  # Optional, for competitor reviews
    MAX_AUDIO_SIZE_MB: int = 10  # Max audio upload size
    MAX_FOLLOWUP_PER_DAY: int = 50  # Rate limit per company
    MAX_COMPETITORS_PER_COMPANY: int = 5  # Competitor monitor limit

    model_config = SettingsConfigDict(env_file=".env")


settings = Settings()
