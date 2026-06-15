"""Runtime configuration, loaded from environment variables (prefix ``SALES_MCP_``).

Example:
    SALES_MCP_PORT=3978
    SALES_MCP_CORS_ORIGINS=*
"""

from __future__ import annotations

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_prefix="SALES_MCP_",
        env_file=".env",
        extra="ignore",
    )

    # Host/port the Streamable HTTP app binds to.
    host: str = "0.0.0.0"
    port: int = 3978

    # Comma-separated CORS allow-list. "*" is fine for local development; lock it
    # down for production deployments.
    cors_origins: str = "*"


def get_settings() -> Settings:
    return Settings()
