from sqlalchemy import (
    Column, Integer, String, Text, Boolean,
    DateTime, ForeignKey, UniqueConstraint
)
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from database import Base


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String(255), unique=True, index=True, nullable=False)
    username = Column(String(100), unique=True, index=True, nullable=False)
    password_hash = Column(String(255), nullable=False)
    bio = Column(Text, nullable=True)
    avatar_url = Column(String(500), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    # Relationships
    destinations = relationship("Destination", back_populates="owner", cascade="all, delete-orphan")
    comments = relationship("Comment", back_populates="author", cascade="all, delete-orphan")
    likes = relationship("Like", back_populates="user", cascade="all, delete-orphan")


class Destination(Base):
    __tablename__ = "destinations"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    place_name = Column(String(255), nullable=False, index=True)
    country = Column(String(100), nullable=False, index=True)
    city = Column(String(100), nullable=True)
    description = Column(Text, nullable=True)
    notes = Column(Text, nullable=True)
    image_url = Column(String(500), nullable=True)
    is_visited = Column(Boolean, default=False, nullable=False)
    is_public = Column(Boolean, default=True, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    # Relationships
    owner = relationship("User", back_populates="destinations")
    comments = relationship("Comment", back_populates="destination", cascade="all, delete-orphan")
    likes = relationship("Like", back_populates="destination", cascade="all, delete-orphan")


class Comment(Base):
    __tablename__ = "comments"

    id = Column(Integer, primary_key=True, index=True)
    destination_id = Column(Integer, ForeignKey("destinations.id", ondelete="CASCADE"), nullable=False)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    content = Column(Text, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    # Relationships
    destination = relationship("Destination", back_populates="comments")
    author = relationship("User", back_populates="comments")


class Like(Base):
    __tablename__ = "likes"

    id = Column(Integer, primary_key=True, index=True)
    destination_id = Column(Integer, ForeignKey("destinations.id", ondelete="CASCADE"), nullable=False)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    __table_args__ = (
        UniqueConstraint("destination_id", "user_id", name="unique_like"),
    )

    # Relationships
    destination = relationship("Destination", back_populates="likes")
    user = relationship("User", back_populates="likes")
