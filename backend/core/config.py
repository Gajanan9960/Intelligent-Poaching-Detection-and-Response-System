from typing import List, Union
from pydantic import AnyHttpUrl, EmailStr, validator
from pydantic_settings import BaseSettings

import os
from pathlib import Path

# Get the directory where config.py is located
current_dir = Path(__file__).resolve().parent
# Navigate up to the backend directory
env_path = current_dir.parent / ".env"

class Settings(BaseSettings):
    API_V1_STR: str = "/api/v1"
    PROJECT_NAME: str = "Intelligent Poaching Detection System"
    ENV: str = "dev"  # "dev" or "production"
    
    # CORS — use plain strings to avoid AnyHttpUrl parsing issues with .env format
    BACKEND_CORS_ORIGINS: List[str] = []

    @validator("BACKEND_CORS_ORIGINS", pre=True)
    def assemble_cors_origins(cls, v: Union[str, List[str]]) -> Union[List[str], str]:
        if isinstance(v, str):
            # Handle both JSON-style ["http://..."] and comma-separated formats
            import json
            try:
                parsed = json.loads(v)
                if isinstance(parsed, list):
                    return parsed
            except (json.JSONDecodeError, TypeError):
                pass
            return [i.strip() for i in v.split(",")]
        elif isinstance(v, list):
            return v
        raise ValueError(v)

    # Database
    MONGO_URI: str
    DATABASE_NAME: str = "poaching_detection_db"

    # JWT
    JWT_SECRET: str
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30

    @validator("JWT_SECRET")
    def validate_jwt_secret(cls, v: str) -> str:
        if len(v) < 32:
            raise ValueError("JWT_SECRET must be at least 32 characters long")
        return v

    EMAIL_ADDRESS: str = ""
    EMAIL_APP_PASSWORD: str = ""
    OFFICER_EMAIL: str = ""
    EMAILS_FROM_EMAIL: str = "alerts@poachingdetection.com"
    EMAILS_FROM_NAME: str = "Poaching Detection Alert"

    SMTP_HOST: str = ""
    SMTP_PORT: int = 587
    SMTP_USER: str = ""
    SMTP_PASSWORD: str = ""

    class Config:
        case_sensitive = True
        env_file = str(env_path)
        env_file_encoding = 'utf-8'

settings = Settings()
