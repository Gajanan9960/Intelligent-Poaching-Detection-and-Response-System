from typing import Optional
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from jose import jwt, JWTError
from pydantic import ValidationError
from backend.core.config import settings
from backend.db.mongodb import get_database
from backend.schemas.token import TokenPayload
from backend.schemas.user import User

reusable_oauth2 = OAuth2PasswordBearer(
    tokenUrl=f"{settings.API_V1_STR}/login/access-token"
)

async def get_current_user(token: str = Depends(reusable_oauth2)) -> User:
    try:
        payload = jwt.decode(
            token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM]
        )
        token_data = TokenPayload(**payload)
    except (JWTError, ValidationError):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Could not validate credentials",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    db = get_database()
    user = await db.users.find_one({"email": token_data.sub})
    
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    if not user.get("is_active", True):
        raise HTTPException(status_code=400, detail="Inactive user")
    
    return User(**user, id=str(user["_id"]))
