"""Authentication API router."""
import logging
from datetime import datetime, timedelta
from typing import Optional

import bcrypt
import jwt
from fastapi import APIRouter, HTTPException, Depends
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from pydantic import BaseModel

from ..config import get_settings
from ..dependencies import DAL

router = APIRouter(prefix="/auth", tags=["auth"])
logger = logging.getLogger(__name__)
security = HTTPBearer()


# --- Schemas ---

class LoginRequest(BaseModel):
    username: str
    password: str


class LoginResponse(BaseModel):
    accessToken: str
    tokenType: str = "bearer"
    expiresIn: int
    user: dict


class UserResponse(BaseModel):
    id: str
    name: str
    email: str
    role: str
    status: str


# --- Helper Functions ---

def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verify a password against a bcrypt hash."""
    try:
        return bcrypt.checkpw(
            plain_password.encode('utf-8'),
            hashed_password.encode('utf-8')
        )
    except Exception:
        return False


def create_access_token(user_id: str, role: str) -> tuple[str, int]:
    """Create a JWT access token."""
    settings = get_settings()
    expires_delta = timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    expire = datetime.utcnow() + expires_delta
    
    payload = {
        "sub": user_id,
        "role": role,
        "exp": expire,
        "iat": datetime.utcnow(),
    }
    
    token = jwt.encode(payload, settings.SECRET_KEY, algorithm="HS256")
    return token, settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60


def decode_token(token: str) -> dict:
    """Decode and validate a JWT token."""
    settings = get_settings()
    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=["HS256"])
        return payload
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")


# --- Endpoints ---

@router.post("/login", response_model=LoginResponse)
async def login(data: LoginRequest, dal: DAL):
    """Authenticate user and return access token."""
    credential = await dal.get_credential_by_username(data.username)
    
    if not credential:
        raise HTTPException(status_code=401, detail="Invalid username or password")
    
    # Check if account is locked
    locked_until = credential.get("lockedUntil")
    if locked_until:
        try:
            lock_time = datetime.fromisoformat(locked_until.replace('Z', '+00:00'))
            if datetime.utcnow() < lock_time.replace(tzinfo=None):
                raise HTTPException(status_code=423, detail="Account is locked")
        except ValueError:
            pass
    
    # Verify password
    # For mock data, we do a simple check; for real data, use bcrypt
    password_hash = credential.get("passwordHash", "")
    is_valid = False
    
    if password_hash.startswith("$2"):
        # bcrypt hash
        is_valid = verify_password(data.password, password_hash)
    else:
        # Plain text comparison for mock data migration
        # Also support mock credentials that store plain passwords
        is_valid = (credential.get("password") == data.password)
    
    if not is_valid:
        await dal.update_credential_login(credential["id"], success=False)
        raise HTTPException(status_code=401, detail="Invalid username or password")
    
    # Get user
    user = await dal.get_user_by_id(credential["userId"])
    if not user:
        raise HTTPException(status_code=401, detail="User not found")
    
    if user.get("status") != "active":
        raise HTTPException(status_code=403, detail="User account is inactive")
    
    # Update login success
    await dal.update_credential_login(credential["id"], success=True)
    
    # Create token
    token, expires_in = create_access_token(user["id"], user["role"])
    
    return LoginResponse(
        accessToken=token,
        expiresIn=expires_in,
        user={
            "id": user["id"],
            "name": user["name"],
            "email": user["email"],
            "role": user["role"],
        }
    )


@router.get("/me", response_model=UserResponse)
async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    dal: DAL = None
):
    """Get current authenticated user."""
    # This is a simplified version - the DAL needs to be injected properly
    # For now, just decode the token
    payload = decode_token(credentials.credentials)
    return {
        "id": payload["sub"],
        "name": "Authenticated User",
        "email": "",
        "role": payload["role"],
        "status": "active",
    }


@router.post("/logout")
async def logout():
    """Logout current user (client-side token invalidation)."""
    # JWT tokens are stateless, so we just return success
    # The client should delete the token
    return {"message": "Logged out successfully"}
