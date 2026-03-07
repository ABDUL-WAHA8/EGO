from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from database import get_db
from dependencies import get_current_user
import models, schemas

router = APIRouter(prefix="/profile", tags=["Profile"])


@router.get("/me", response_model=schemas.UserMe)
def get_my_profile(current_user: models.User = Depends(get_current_user)):
    return current_user


@router.put("/me", response_model=schemas.UserMe)
def update_my_profile(
    payload: schemas.UserUpdate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    if payload.username and payload.username != current_user.username:
        exists = db.query(models.User).filter(
            models.User.username == payload.username,
            models.User.id != current_user.id
        ).first()
        if exists:
            raise HTTPException(status_code=400, detail="Username already taken")

    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(current_user, field, value)

    db.commit()
    db.refresh(current_user)
    return current_user


@router.get("/{username}", response_model=schemas.UserPublic)
def get_user_profile(username: str, db: Session = Depends(get_db)):
    user = db.query(models.User).filter(models.User.username == username).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return user
