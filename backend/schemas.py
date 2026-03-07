from pydantic import BaseModel, EmailStr, field_validator
from typing import Optional, List
from datetime import datetime


# ─── AUTH SCHEMAS ────────────────────────────────────────────────────────────

class UserRegister(BaseModel):
    email: EmailStr
    username: str
    password: str

    @field_validator("username")
    @classmethod
    def username_valid(cls, v):
        if len(v) < 3:
            raise ValueError("Username must be at least 3 characters")
        if len(v) > 30:
            raise ValueError("Username must be under 30 characters")
        if not v.replace("_", "").replace("-", "").isalnum():
            raise ValueError("Username can only contain letters, numbers, underscores, hyphens")
        return v

    @field_validator("password")
    @classmethod
    def password_strength(cls, v):
        if len(v) < 8:
            raise ValueError("Password must be at least 8 characters")
        return v


class UserLogin(BaseModel):
    email: EmailStr
    password: str


class Token(BaseModel):
    access_token: str
    token_type: str


class TokenData(BaseModel):
    user_id: Optional[int] = None


# ─── USER SCHEMAS ─────────────────────────────────────────────────────────────

class UserPublic(BaseModel):
    id: int
    username: str
    avatar_url: Optional[str] = None
    bio: Optional[str] = None
    created_at: datetime

    model_config = {"from_attributes": True}


class UserMe(BaseModel):
    id: int
    email: str
    username: str
    bio: Optional[str] = None
    avatar_url: Optional[str] = None
    created_at: datetime

    model_config = {"from_attributes": True}


class UserUpdate(BaseModel):
    username: Optional[str] = None
    bio: Optional[str] = None
    avatar_url: Optional[str] = None


# ─── DESTINATION SCHEMAS ──────────────────────────────────────────────────────

class DestinationCreate(BaseModel):
    place_name: str
    country: str
    city: Optional[str] = None
    description: Optional[str] = None
    notes: Optional[str] = None
    image_url: Optional[str] = None
    is_visited: bool = False
    is_public: bool = True


class DestinationUpdate(BaseModel):
    place_name: Optional[str] = None
    country: Optional[str] = None
    city: Optional[str] = None
    description: Optional[str] = None
    notes: Optional[str] = None
    image_url: Optional[str] = None
    is_visited: Optional[bool] = None
    is_public: Optional[bool] = None


class DestinationOut(BaseModel):
    id: int
    user_id: int
    place_name: str
    country: str
    city: Optional[str] = None
    description: Optional[str] = None
    notes: Optional[str] = None
    image_url: Optional[str] = None
    is_visited: bool
    is_public: bool
    created_at: datetime
    updated_at: Optional[datetime] = None
    owner: UserPublic
    likes_count: int = 0
    comments_count: int = 0
    is_liked_by_me: bool = False

    model_config = {"from_attributes": True}


# ─── COMMENT SCHEMAS ──────────────────────────────────────────────────────────

class CommentCreate(BaseModel):
    content: str

    @field_validator("content")
    @classmethod
    def content_not_empty(cls, v):
        if not v.strip():
            raise ValueError("Comment cannot be empty")
        if len(v) > 1000:
            raise ValueError("Comment must be under 1000 characters")
        return v


class CommentOut(BaseModel):
    id: int
    destination_id: int
    user_id: int
    content: str
    created_at: datetime
    author: UserPublic

    model_config = {"from_attributes": True}


# ─── LIKE SCHEMAS ─────────────────────────────────────────────────────────────

class LikeOut(BaseModel):
    destination_id: int
    liked: bool
    likes_count: int


# ─── GENERIC ─────────────────────────────────────────────────────────────────

class MessageOut(BaseModel):
    message: str
