from fastapi import APIRouter
from backend.api.v1.endpoints import auth, users, video, password_reset

api_router = APIRouter()
api_router.include_router(auth.router, tags=["login"])
api_router.include_router(users.router, prefix="/users", tags=["users"])
api_router.include_router(video.router, prefix="/video", tags=["video"])
api_router.include_router(password_reset.router, tags=["password-reset"])
