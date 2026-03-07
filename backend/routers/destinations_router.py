from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
from database import get_db
from dependencies import get_current_user
import models, schemas

router = APIRouter(prefix="/destinations", tags=["Destinations"])


def enrich(dest: models.Destination, db: Session, current_user: models.User | None) -> dict:
    likes_count = db.query(models.Like).filter(models.Like.destination_id == dest.id).count()
    comments_count = db.query(models.Comment).filter(models.Comment.destination_id == dest.id).count()
    is_liked = False
    if current_user:
        is_liked = db.query(models.Like).filter(
            models.Like.destination_id == dest.id,
            models.Like.user_id == current_user.id
        ).first() is not None

    d = {c.name: getattr(dest, c.name) for c in dest.__table__.columns}
    d["owner"] = dest.owner
    d["likes_count"] = likes_count
    d["comments_count"] = comments_count
    d["is_liked_by_me"] = is_liked
    return d


@router.post("/", response_model=schemas.DestinationOut, status_code=201)
def create_destination(
    payload: schemas.DestinationCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    dest = models.Destination(**payload.model_dump(), user_id=current_user.id)
    db.add(dest)
    db.commit()
    db.refresh(dest)
    return enrich(dest, db, current_user)


@router.get("/my", response_model=List[schemas.DestinationOut])
def get_my_destinations(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    destinations = (
        db.query(models.Destination)
        .filter(models.Destination.user_id == current_user.id)
        .order_by(models.Destination.created_at.desc())
        .all()
    )
    return [enrich(d, db, current_user) for d in destinations]


@router.get("/{destination_id}", response_model=schemas.DestinationOut)
def get_destination(
    destination_id: int,
    db: Session = Depends(get_db),
    current_user: models.User | None = Depends(lambda db=Depends(get_db): None)
):
    dest = db.query(models.Destination).filter(models.Destination.id == destination_id).first()
    if not dest:
        raise HTTPException(status_code=404, detail="Destination not found")
    if not dest.is_public:
        raise HTTPException(status_code=403, detail="This destination is private")
    return enrich(dest, db, None)


@router.put("/{destination_id}", response_model=schemas.DestinationOut)
def update_destination(
    destination_id: int,
    payload: schemas.DestinationUpdate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    dest = db.query(models.Destination).filter(models.Destination.id == destination_id).first()
    if not dest:
        raise HTTPException(status_code=404, detail="Destination not found")
    if dest.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not your destination")

    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(dest, field, value)

    db.commit()
    db.refresh(dest)
    return enrich(dest, db, current_user)


@router.delete("/{destination_id}", response_model=schemas.MessageOut)
def delete_destination(
    destination_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    dest = db.query(models.Destination).filter(models.Destination.id == destination_id).first()
    if not dest:
        raise HTTPException(status_code=404, detail="Destination not found")
    if dest.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not your destination")

    db.delete(dest)
    db.commit()
    return {"message": "Destination deleted successfully"}
