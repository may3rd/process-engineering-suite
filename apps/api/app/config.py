"""Application configuration from environment variables."""
import os
from functools import lru_cache
from typing import Optional

class Settings:
    """Application settings loaded from environment."""

    # Deployment Environment
    DEPLOYMENT_ENV: str = os.getenv("DEPLOYMENT_ENV", "local")

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

    # AWS Configuration
    AWS_REGION: Optional[str] = os.getenv("AWS_REGION")
    AWS_SECRETS_ARN: Optional[str] = os.getenv("AWS_SECRETS_ARN")

    @property
    def is_production(self) -> bool:
        """Check if running in production environment."""
        return self.DEPLOYMENT_ENV in ["aws", "vercel"]

    @property
    def allowed_origins(self) -> list[str]:
        """Get CORS allowed origins based on deployment environment."""
        if self.DEPLOYMENT_ENV == "local":
            # Local development: allow all localhost ports
            return [
                "http://localhost:3000",
                "http://localhost:3001",
                "http://localhost:3002",
                "http://localhost:3003",
                "http://localhost:3004",
            ]

        # AWS/Production: read from environment variable
        origins_str = os.getenv("ALLOWED_ORIGINS", "")
        if not origins_str:
            raise ValueError(
                f"ALLOWED_ORIGINS environment variable must be set for {self.DEPLOYMENT_ENV} deployment. "
                "Provide a comma-separated list of allowed origins."
            )

        # Parse comma-separated list and strip whitespace
        return [origin.strip() for origin in origins_str.split(",") if origin.strip()]

    @property
    def is_db_configured(self) -> bool:
        """Check if database is configured."""
        return self.DATABASE_URL is not None and not self.USE_MOCK_DATA


@lru_cache
def get_settings() -> Settings:
    """Get cached settings instance."""
    return Settings()
