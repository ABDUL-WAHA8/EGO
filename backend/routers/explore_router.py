from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from sqlalchemy import or_
from typing import List, Optional
from database import get_db
from dependencies import get_optional_user
import models, schemas

router = APIRouter(prefix="/explore", tags=["Explore"])


def enrich(dest: models.Destination, db: Session, current_user) -> dict:
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


@router.get("/", response_model=List[schemas.DestinationOut])
def explore(
    search: Optional[str] = Query(None),
    country: Optional[str] = Query(None),
    visited: Optional[bool] = Query(None),
    skip: int = Query(0, ge=0),
    limit: int = Query(20, ge=1, le=100),
    db: Session = Depends(get_db),
    current_user=Depends(get_optional_user)
):
    query = db.query(models.Destination).filter(models.Destination.is_public == True)

    if search:
        query = query.filter(
            or_(
                models.Destination.place_name.ilike(f"%{search}%"),
                models.Destination.country.ilike(f"%{search}%"),
                models.Destination.city.ilike(f"%{search}%"),
            )
        )

    if country:
        query = query.filter(models.Destination.country.ilike(f"%{country}%"))

    if visited is not None:
        query = query.filter(models.Destination.is_visited == visited)

    destinations = (
        query
        .order_by(models.Destination.created_at.desc())
        .offset(skip)
        .limit(limit)
        .all()
    )

    return [enrich(d, db, current_user) for d in destinations]


@router.get("/featured", response_model=List[schemas.DestinationOut])
def featured(
    db: Session = Depends(get_db),
    current_user=Depends(get_optional_user)
):
    """Top 6 most liked public destinations."""
    all_public = (
        db.query(models.Destination)
        .filter(models.Destination.is_public == True)
        .all()
    )

    scored = sorted(
        all_public,
        key=lambda d: db.query(models.Like).filter(models.Like.destination_id == d.id).count(),
        reverse=True
    )[:6]

    return [enrich(d, db, current_user) for d in scored]


@router.get("/destination/{destination_id}", response_model=schemas.DestinationOut)
def get_public_destination(
    destination_id: int,
    db: Session = Depends(get_db),
    current_user=Depends(get_optional_user)
):
    dest = db.query(models.Destination).filter(
        models.Destination.id == destination_id,
        models.Destination.is_public == True
    ).first()

    if not dest:
        from fastapi import HTTPException
        raise HTTPException(status_code=404, detail="Destination not found")

    return enrich(dest, db, current_user)
