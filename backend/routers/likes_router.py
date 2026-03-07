from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from database import get_db
from dependencies import get_current_user
import models, schemas

router = APIRouter(prefix="/likes", tags=["Likes"])


@router.post("/{destination_id}", response_model=schemas.LikeOut)
def toggle_like(
    destination_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    dest = db.query(models.Destination).filter(models.Destination.id == destination_id).first()
    if not dest:
        raise HTTPException(status_code=404, detail="Destination not found")

    existing = db.query(models.Like).filter(
        models.Like.destination_id == destination_id,
        models.Like.user_id == current_user.id
    ).first()

    if existing:
        db.delete(existing)
        db.commit()
        liked = False
    else:
        like = models.Like(destination_id=destination_id, user_id=current_user.id)
        db.add(like)
        db.commit()
        liked = True

    count = db.query(models.Like).filter(models.Like.destination_id == destination_id).count()
    return {"destination_id": destination_id, "liked": liked, "likes_count": count}
