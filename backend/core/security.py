import logging
import asyncio
from datetime import datetime, timedelta
from typing import Any, Union, Optional

from jose import jwt
import bcrypt
from core.config import settings

logger = logging.getLogger(__name__)

def create_access_token(subject: Union[str, Any], role: str = "ranger", expires_delta: Optional[timedelta] = None) -> str:
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    
    to_encode = {"exp": expire, "sub": str(subject), "role": role, "iss": "poaching-detection-api"}
    encoded_jwt = jwt.encode(to_encode, settings.JWT_SECRET, algorithm=settings.ALGORITHM)
    return encoded_jwt

def _verify_password_sync(plain_password: str, hashed_password: str) -> bool:
    """Synchronous bcrypt password verification (CPU-bound)."""
    try:
        password_bytes = plain_password.encode('utf-8')
        hashed_bytes = hashed_password.encode('utf-8')
        return bcrypt.checkpw(password_bytes, hashed_bytes)
    except Exception as e:
        logger.warning("Password verification error: %s", e)
        return False

async def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verify password asynchronously using a thread pool."""
    return await asyncio.to_thread(_verify_password_sync, plain_password, hashed_password)

def _get_password_hash_sync(password: str) -> str:
    """Synchronous bcrypt hashing (CPU-bound)."""
    password_bytes = password.encode('utf-8')
    salt = bcrypt.gensalt()
    hashed = bcrypt.hashpw(password_bytes, salt)
    return hashed.decode('utf-8')

async def get_password_hash(password: str) -> str:
    """Hash password asynchronously using a thread pool."""
    return await asyncio.to_thread(_get_password_hash_sync, password)
