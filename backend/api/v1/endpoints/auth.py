from datetime import timedelta
from typing import Any
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from backend.api import deps
from backend.core import security
from backend.core.config import settings
from backend.db.mongodb import get_database
from backend.schemas.token import Token
from backend.schemas.user import User

router = APIRouter()

@router.post("/login/access-token", response_model=Token)
async def login_access_token(form_data: OAuth2PasswordRequestForm = Depends()) -> Any:
    """
    OAuth2 compatible token login, get an access token for future requests
    """
    db = get_database()
    user = await db.users.find_one({"email": form_data.username})
    
    if not user or not security.verify_password(form_data.password, user["hashed_password"]):
        raise HTTPException(status_code=400, detail="Incorrect email or password")
    
    access_token_expires = timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    return {
        "access_token": security.create_access_token(
            user["email"], expires_delta=access_token_expires
        ),
        "token_type": "bearer",
    }
