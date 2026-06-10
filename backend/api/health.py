from datetime import datetime, timezone

from fastapi import APIRouter
from fastapi import Depends
from sqlalchemy.orm import Session

from db.dependencies import get_db
from models.commit import Commit

router = APIRouter()


@router.get("/repository-health")
def repository_health(
    db: Session = Depends(get_db)
):

    commits = db.query(Commit).all()

    now = datetime.utcnow()

    results = []

    for commit in commits:

        days_inactive = (
            now - commit.commit_date
        ).days

        if days_inactive < 30:
            status = "Healthy"

        elif days_inactive < 90:
            status = "Warning"

        else:
            status = "Critical"

        results.append({
            "repository":
                commit.repository_name,

            "author":
                commit.author,

            "days_inactive":
                days_inactive,

            "status":
                status
        })

    return results