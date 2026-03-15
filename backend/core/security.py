from datetime import datetime, timedelta
from typing import Any, Union
import asyncio
from jose import jwt
import bcrypt
from backend.core.config import settings

def create_access_token(subject: Union[str, Any], role: str = "ranger", expires_delta: timedelta = None) -> str:
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    
    to_encode = {"exp": expire, "sub": str(subject), "role": role}
    encoded_jwt = jwt.encode(to_encode, settings.JWT_SECRET, algorithm=settings.ALGORITHM)
    return encoded_jwt

def _verify_password_sync(plain_password: str, hashed_password: str) -> bool:
    """Synchronous bcrypt password verification (CPU-bound)."""
    try:
        password_bytes = plain_password.encode('utf-8')
        hashed_bytes = hashed_password.encode('utf-8')
        return bcrypt.checkpw(password_bytes, hashed_bytes)
    except Exception as e:
        print(f"Password verification failed: {e}")
        return False

async def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verify password using bcrypt in a thread pool to avoid blocking the event loop."""
    return await asyncio.to_thread(_verify_password_sync, plain_password, hashed_password)

def _get_password_hash_sync(password: str) -> str:
    """Synchronous bcrypt hashing (CPU-bound)."""
    password_bytes = password.encode('utf-8')
    salt = bcrypt.gensalt()
    hashed = bcrypt.hashpw(password_bytes, salt)
    return hashed.decode('utf-8')

async def get_password_hash(password: str) -> str:
    """Hash password using bcrypt in a thread pool to avoid blocking the event loop."""
    return await asyncio.to_thread(_get_password_hash_sync, password)
