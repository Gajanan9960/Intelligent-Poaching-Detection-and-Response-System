from typing import Any
from fastapi import APIRouter, Depends, HTTPException
from fastapi.encoders import jsonable_encoder
from backend.api import deps
from backend.core import security
from backend.db.mongodb import get_database
from backend.schemas.user import User, UserCreate

router = APIRouter()

@router.post("/", response_model=User)
async def create_user(
    *,
    user_in: UserCreate,
) -> Any:
    """
    Create new user.
    """
    db = get_database()
    user = await db.users.find_one({"email": user_in.email})
    if user:
        raise HTTPException(
            status_code=400,
            detail="The user with this username already exists in the system.",
        )
    
    user_data = jsonable_encoder(user_in)
    hashed_password = security.get_password_hash(user_in.password)
    del user_data["password"]
    user_data["hashed_password"] = hashed_password
    
    result = await db.users.insert_one(user_data)
    created_user = await db.users.find_one({"_id": result.inserted_id})
    
    return User(**created_user, id=str(created_user["_id"]))

@router.get("/me", response_model=User)
async def read_user_me(
    current_user: User = Depends(deps.get_current_user),
) -> Any:
    """
    Get current user.
    """
    return current_user
