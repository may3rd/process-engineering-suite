"""Application configuration from environment variables."""
import os
from functools import lru_cache
from typing import Optional

class Settings:
    """Application settings loaded from environment."""
    
    # Database
    DATABASE_URL: Optional[str] = os.getenv("DATABASE_URL")
    
    # Fallback behavior
    USE_MOCK_DATA: bool = os.getenv("USE_MOCK_DATA", "false").lower() == "true"
    
    # API Settings
    API_HOST: str = os.getenv("API_HOST", "0.0.0.0")
    API_PORT: int = int(os.getenv("API_PORT", "8000"))
    
    # Security
    SECRET_KEY: str = os.getenv("SECRET_KEY", "dev-secret-key-change-in-production")
    ACCESS_TOKEN_EXPIRE_MINUTES: int = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", "60"))
    
    # CORS
    ALLOWED_ORIGINS: list[str] = [
        "http://localhost:3000",
        "http://localhost:3002",
        "http://localhost:3003",
    ]
    
    @property
    def is_db_configured(self) -> bool:
        """Check if database is configured."""
        return self.DATABASE_URL is not None and not self.USE_MOCK_DATA


@lru_cache
def get_settings() -> Settings:
    """Get cached settings instance."""
    return Settings()
