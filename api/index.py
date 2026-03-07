from fastapi import FastAPI, Depends, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy import (
    create_engine, Column, Integer, String, Text,
    Boolean, DateTime, ForeignKey, UniqueConstraint, or_
)
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker, Session, relationship
from sqlalchemy.sql import func
from pydantic import BaseModel, EmailStr, field_validator
from typing import Optional, List
from datetime import datetime, timedelta, timezone
from jose import JWTError, jwt
from passlib.context import CryptContext
from dotenv import load_dotenv
import os

load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL", "")
SECRET_KEY   = os.getenv("SECRET_KEY", "change-me-please")
ALGORITHM    = "HS256"
TOKEN_EXPIRE = 10080

if DATABASE_URL.startswith("postgres://"):
    DATABASE_URL = DATABASE_URL.replace("postgres://", "postgresql://", 1)

engine       = create_engine(DATABASE_URL, pool_pre_ping=True)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base         = declarative_base()

class User(Base):
    __tablename__ = "users"
    id            = Column(Integer, primary_key=True, index=True)
    email         = Column(String(255), unique=True, index=True, nullable=False)
    username      = Column(String(100), unique=True, index=True, nullable=False)
    password_hash = Column(String(255), nullable=False)
    bio           = Column(Text, nullable=True)
    avatar_url    = Column(String(500), nullable=True)
    created_at    = Column(DateTime(timezone=True), server_default=func.now())
    destinations  = relationship("Destination", back_populates="owner",  cascade="all, delete-orphan")
    comments      = relationship("Comment",     back_populates="author", cascade="all, delete-orphan")
    likes         = relationship("Like",        back_populates="user",   cascade="all, delete-orphan")

class Destination(Base):
    __tablename__ = "destinations"
    id          = Column(Integer, primary_key=True, index=True)
    user_id     = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    place_name  = Column(String(255), nullable=False, index=True)
    country     = Column(String(100), nullable=False, index=True)
    city        = Column(String(100), nullable=True)
    description = Column(Text, nullable=True)
    notes       = Column(Text, nullable=True)
    image_url   = Column(String(500), nullable=True)
    is_visited  = Column(Boolean, default=False)
    is_public   = Column(Boolean, default=True)
    created_at  = Column(DateTime(timezone=True), server_default=func.now())
    updated_at  = Column(DateTime(timezone=True), onupdate=func.now())
    owner       = relationship("User",    back_populates="destinations")
    comments    = relationship("Comment", back_populates="destination", cascade="all, delete-orphan")
    likes       = relationship("Like",    back_populates="destination", cascade="all, delete-orphan")

class Comment(Base):
    __tablename__ = "comments"
    id             = Column(Integer, primary_key=True, index=True)
    destination_id = Column(Integer, ForeignKey("destinations.id", ondelete="CASCADE"), nullable=False)
    user_id        = Column(Integer, ForeignKey("users.id",         ondelete="CASCADE"), nullable=False)
    content        = Column(Text, nullable=False)
    created_at     = Column(DateTime(timezone=True), server_default=func.now())
    destination    = relationship("Destination", back_populates="comments")
    author         = relationship("User",        back_populates="comments")

class Like(Base):
    __tablename__  = "likes"
    __table_args__ = (UniqueConstraint("destination_id", "user_id", name="unique_like"),)
    id             = Column(Integer, primary_key=True, index=True)
    destination_id = Column(Integer, ForeignKey("destinations.id", ondelete="CASCADE"), nullable=False)
    user_id        = Column(Integer, ForeignKey("users.id",         ondelete="CASCADE"), nullable=False)
    created_at     = Column(DateTime(timezone=True), server_default=func.now())
    destination    = relationship("Destination", back_populates="likes")
    user           = relationship("User",        back_populates="likes")

Base.metadata.create_all(bind=engine)

class UserRegister(BaseModel):
    email: EmailStr
    username: str
    password: str
    @field_validator("username")
    @classmethod
    def username_valid(cls, v):
        if len(v) < 3:  raise ValueError("Username must be at least 3 characters")
        if len(v) > 30: raise ValueError("Username must be under 30 characters")
        return v
    @field_validator("password")
    @classmethod
    def password_strength(cls, v):
        if len(v) < 8: raise ValueError("Password must be at least 8 characters")
        return v

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class Token(BaseModel):
    access_token: str
    token_type:   str

class UserPublic(BaseModel):
    id: int; username: str; avatar_url: Optional[str] = None
    bio: Optional[str] = None; created_at: datetime
    model_config = {"from_attributes": True}

class UserMe(BaseModel):
    id: int; email: str; username: str
    bio: Optional[str] = None; avatar_url: Optional[str] = None; created_at: datetime
    model_config = {"from_attributes": True}

class UserUpdate(BaseModel):
    username: Optional[str] = None; bio: Optional[str] = None; avatar_url: Optional[str] = None

class DestinationCreate(BaseModel):
    place_name: str; country: str; city: Optional[str] = None
    description: Optional[str] = None; notes: Optional[str] = None
    image_url: Optional[str] = None; is_visited: bool = False; is_public: bool = True

class DestinationUpdate(BaseModel):
    place_name: Optional[str] = None; country: Optional[str] = None
    city: Optional[str] = None; description: Optional[str] = None
    notes: Optional[str] = None; image_url: Optional[str] = None
    is_visited: Optional[bool] = None; is_public: Optional[bool] = None

class DestinationOut(BaseModel):
    id: int; user_id: int; place_name: str; country: str
    city: Optional[str] = None; description: Optional[str] = None
    notes: Optional[str] = None; image_url: Optional[str] = None
    is_visited: bool; is_public: bool; created_at: datetime
    updated_at: Optional[datetime] = None; owner: UserPublic
    likes_count: int = 0; comments_count: int = 0; is_liked_by_me: bool = False
    model_config = {"from_attributes": True}

class CommentCreate(BaseModel):
    content: str
    @field_validator("content")
    @classmethod
    def not_empty(cls, v):
        if not v.strip(): raise ValueError("Comment cannot be empty")
        if len(v) > 1000: raise ValueError("Comment too long")
        return v

class CommentOut(BaseModel):
    id: int; destination_id: int; user_id: int
    content: str; created_at: datetime; author: UserPublic
    model_config = {"from_attributes": True}

class LikeOut(BaseModel):
    destination_id: int; liked: bool; likes_count: int

class Msg(BaseModel):
    message: str

pwd_context   = CryptContext(schemes=["bcrypt"], deprecated="auto")
bearer_scheme = HTTPBearer()

def hash_password(p): return pwd_context.hash(p)
def verify_password(plain, hashed): return pwd_context.verify(plain, hashed)

def create_token(user_id: int) -> str:
    expire  = datetime.now(timezone.utc) + timedelta(minutes=TOKEN_EXPIRE)
    return jwt.encode({"sub": str(user_id), "exp": expire}, SECRET_KEY, algorithm=ALGORITHM)

def decode_token(token: str):
    try: return jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
    except JWTError: return None

def get_db():
    db = SessionLocal()
    try: yield db
    finally: db.close()

def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(bearer_scheme), db: Session = Depends(get_db)) -> User:
    payload = decode_token(credentials.credentials)
    if not payload: raise HTTPException(401, "Invalid or expired token")
    user = db.query(User).filter(User.id == int(payload.get("sub", 0))).first()
    if not user: raise HTTPException(401, "User not found")
    return user

def get_optional_user(db: Session = Depends(get_db), credentials: HTTPAuthorizationCredentials = Depends(HTTPBearer(auto_error=False))) -> Optional[User]:
    if not credentials: return None
    payload = decode_token(credentials.credentials)
    if not payload: return None
    return db.query(User).filter(User.id == int(payload.get("sub", 0))).first()

def enrich(dest, db, current_user):
    lc = db.query(Like).filter(Like.destination_id == dest.id).count()
    cc = db.query(Comment).filter(Comment.destination_id == dest.id).count()
    il = False
    if current_user:
        il = db.query(Like).filter(Like.destination_id == dest.id, Like.user_id == current_user.id).first() is not None
    d = {col.name: getattr(dest, col.name) for col in dest.__table__.columns}
    d["owner"] = dest.owner; d["likes_count"] = lc; d["comments_count"] = cc; d["is_liked_by_me"] = il
    return d

app = FastAPI(title="Wanderlist API", version="1.0.0", docs_url="/api/docs")
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_credentials=True, allow_methods=["*"], allow_headers=["*"])

@app.get("/api")
def root(): return {"status": "Wanderlist API running"}

@app.get("/api/health")
def health(): return {"status": "ok"}

@app.post("/api/auth/register", response_model=Token, status_code=201)
def register(payload: UserRegister, db: Session = Depends(get_db)):
    if db.query(User).filter(User.email    == payload.email).first():    raise HTTPException(400, "Email already registered")
    if db.query(User).filter(User.username == payload.username).first(): raise HTTPException(400, "Username already taken")
    user = User(email=payload.email, username=payload.username, password_hash=hash_password(payload.password))
    db.add(user); db.commit(); db.refresh(user)
    return {"access_token": create_token(user.id), "token_type": "bearer"}

@app.post("/api/auth/login", response_model=Token)
def login(payload: UserLogin, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == payload.email).first()
    if not user or not verify_password(payload.password, user.password_hash): raise HTTPException(401, "Invalid email or password")
    return {"access_token": create_token(user.id), "token_type": "bearer"}

@app.get("/api/auth/me", response_model=UserMe)
def get_me(current_user: User = Depends(get_current_user)): return current_user

@app.post("/api/destinations", response_model=DestinationOut, status_code=201)
def create_destination(payload: DestinationCreate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    dest = Destination(**payload.model_dump(), user_id=current_user.id)
    db.add(dest); db.commit(); db.refresh(dest)
    return enrich(dest, db, current_user)

@app.get("/api/destinations/my", response_model=List[DestinationOut])
def get_my_destinations(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    dests = db.query(Destination).filter(Destination.user_id == current_user.id).order_by(Destination.created_at.desc()).all()
    return [enrich(d, db, current_user) for d in dests]

@app.get("/api/destinations/{destination_id}", response_model=DestinationOut)
def get_destination(destination_id: int, db: Session = Depends(get_db), current_user: Optional[User] = Depends(get_optional_user)):
    dest = db.query(Destination).filter(Destination.id == destination_id).first()
    if not dest: raise HTTPException(404, "Destination not found")
    if not dest.is_public and (not current_user or dest.user_id != current_user.id): raise HTTPException(403, "Private")
    return enrich(dest, db, current_user)

@app.put("/api/destinations/{destination_id}", response_model=DestinationOut)
def update_destination(destination_id: int, payload: DestinationUpdate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    dest = db.query(Destination).filter(Destination.id == destination_id).first()
    if not dest: raise HTTPException(404, "Not found")
    if dest.user_id != current_user.id: raise HTTPException(403, "Not yours")
    for k, v in payload.model_dump(exclude_unset=True).items(): setattr(dest, k, v)
    db.commit(); db.refresh(dest)
    return enrich(dest, db, current_user)

@app.delete("/api/destinations/{destination_id}", response_model=Msg)
def delete_destination(destination_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    dest = db.query(Destination).filter(Destination.id == destination_id).first()
    if not dest: raise HTTPException(404, "Not found")
    if dest.user_id != current_user.id: raise HTTPException(403, "Not yours")
    db.delete(dest); db.commit()
    return {"message": "Deleted"}

@app.get("/api/explore", response_model=List[DestinationOut])
def explore(search: Optional[str] = Query(None), country: Optional[str] = Query(None), skip: int = Query(0, ge=0), limit: int = Query(20, ge=1, le=100), db: Session = Depends(get_db), current_user: Optional[User] = Depends(get_optional_user)):
    q = db.query(Destination).filter(Destination.is_public == True)
    if search: q = q.filter(or_(Destination.place_name.ilike(f"%{search}%"), Destination.country.ilike(f"%{search}%"), Destination.city.ilike(f"%{search}%")))
    if country: q = q.filter(Destination.country.ilike(f"%{country}%"))
    return [enrich(d, db, current_user) for d in q.order_by(Destination.created_at.desc()).offset(skip).limit(limit).all()]

@app.get("/api/explore/featured", response_model=List[DestinationOut])
def featured(db: Session = Depends(get_db), current_user: Optional[User] = Depends(get_optional_user)):
    all_public = db.query(Destination).filter(Destination.is_public == True).all()
    top6 = sorted(all_public, key=lambda d: db.query(Like).filter(Like.destination_id == d.id).count(), reverse=True)[:6]
    return [enrich(d, db, current_user) for d in top6]

@app.post("/api/comments/{destination_id}", response_model=CommentOut, status_code=201)
def add_comment(destination_id: int, payload: CommentCreate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    if not db.query(Destination).filter(Destination.id == destination_id).first(): raise HTTPException(404, "Not found")
    comment = Comment(destination_id=destination_id, user_id=current_user.id, content=payload.content.strip())
    db.add(comment); db.commit(); db.refresh(comment)
    return comment

@app.get("/api/comments/{destination_id}", response_model=List[CommentOut])
def get_comments(destination_id: int, db: Session = Depends(get_db)):
    return db.query(Comment).filter(Comment.destination_id == destination_id).order_by(Comment.created_at.desc()).all()

@app.delete("/api/comments/{comment_id}", response_model=Msg)
def delete_comment(comment_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    comment = db.query(Comment).filter(Comment.id == comment_id).first()
    if not comment: raise HTTPException(404, "Not found")
    if comment.user_id != current_user.id: raise HTTPException(403, "Not yours")
    db.delete(comment); db.commit()
    return {"message": "Deleted"}

@app.post("/api/likes/{destination_id}", response_model=LikeOut)
def toggle_like(destination_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    if not db.query(Destination).filter(Destination.id == destination_id).first(): raise HTTPException(404, "Not found")
    existing = db.query(Like).filter(Like.destination_id == destination_id, Like.user_id == current_user.id).first()
    if existing: db.delete(existing); db.commit(); liked = False
    else: db.add(Like(destination_id=destination_id, user_id=current_user.id)); db.commit(); liked = True
    count = db.query(Like).filter(Like.destination_id == destination_id).count()
    return {"destination_id": destination_id, "liked": liked, "likes_count": count}

@app.get("/api/profile/me", response_model=UserMe)
def get_my_profile(current_user: User = Depends(get_current_user)): return current_user

@app.put("/api/profile/me", response_model=UserMe)
def update_my_profile(payload: UserUpdate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    if payload.username and payload.username != current_user.username:
        if db.query(User).filter(User.username == payload.username, User.id != current_user.id).first(): raise HTTPException(400, "Username taken")
    for k, v in payload.model_dump(exclude_unset=True).items(): setattr(current_user, k, v)
    db.commit(); db.refresh(current_user)
    return current_user

@app.get("/api/profile/{username}", response_model=UserPublic)
def get_user_profile(username: str, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.username == username).first()
    if not user: raise HTTPException(404, "User not found")
    return user