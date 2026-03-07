from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from database import get_db
from dependencies import get_current_user
import models, schemas

router = APIRouter(prefix="/comments", tags=["Comments"])


@router.post("/{destination_id}", response_model=schemas.CommentOut, status_code=201)
def add_comment(
    destination_id: int,
    payload: schemas.CommentCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    dest = db.query(models.Destination).filter(
        models.Destination.id == destination_id,
        models.Destination.is_public == True
    ).first()
    if not dest:
        raise HTTPException(status_code=404, detail="Destination not found")

    comment = models.Comment(
        destination_id=destination_id,
        user_id=current_user.id,
        content=payload.content.strip()
    )
    db.add(comment)
    db.commit()
    db.refresh(comment)
    return comment


@router.get("/{destination_id}", response_model=List[schemas.CommentOut])
def get_comments(
    destination_id: int,
    db: Session = Depends(get_db)
):
    dest = db.query(models.Destination).filter(models.Destination.id == destination_id).first()
    if not dest:
        raise HTTPException(status_code=404, detail="Destination not found")

    return (
        db.query(models.Comment)
        .filter(models.Comment.destination_id == destination_id)
        .order_by(models.Comment.created_at.desc())
        .all()
    )


@router.delete("/{comment_id}", response_model=schemas.MessageOut)
def delete_comment(
    comment_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    comment = db.query(models.Comment).filter(models.Comment.id == comment_id).first()
    if not comment:
        raise HTTPException(status_code=404, detail="Comment not found")
    if comment.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not your comment")

    db.delete(comment)
    db.commit()
    return {"message": "Comment deleted"}
