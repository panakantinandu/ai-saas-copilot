from datetime import datetime, timezone

from fastapi import APIRouter
from fastapi import Depends

from sqlalchemy.orm import Session

from db.dependencies import get_db

from models.commit import Commit
from models.repository import Repository
from models.ai_recommendation import AIRecommendation

from agents.repository_agent import (
    analyze_repository
)

router = APIRouter()

@router.post("/generate")
def generate_ai_recommendations(
    db: Session = Depends(get_db)
):

    repositories = (
        db.query(Repository)
        .limit(2)
        .all()
    )

    now = datetime.utcnow()

    generated = 0

    for repo in repositories:

        commit = (
            db.query(Commit)
            .filter(
                Commit.repository_name == repo.name
            )
            .first()
        )

        if not commit:
            continue

        days_inactive = (
            now - commit.commit_date
        ).days

        if days_inactive < 30:
            continue

        existing = (
            db.query(AIRecommendation)
            .filter(
                AIRecommendation.repository_name == repo.name
            )
            .first()
        )

        if existing:
            continue

        status = (
            "Critical"
            if days_inactive > 90
            else "Warning"
        )

        result = analyze_repository(
            repo_name=repo.name,
            days_inactive=days_inactive,
            status=status,
            is_public=not repo.private
        )

        recommendation = AIRecommendation(
            repository_name=repo.name,
            recommendation=result.get(
                "recommendation", ""
            ),
            business_impact=result.get(
                "business_impact", ""
            ),
            security_risk=result.get(
                "security_risk", ""
            ),
            suggested_action=result.get(
                "suggested_action", ""
            )
        )

        db.add(recommendation)

        generated += 1

    db.commit()

    return {
        "generated": generated
    }


@router.get("/recommendations")
def get_ai_recommendations(
    db: Session = Depends(get_db)
):

    recommendations = (
        db.query(AIRecommendation)
        .all()
    )

    return [
        {
            "repository":
                item.repository_name,

            "recommendation":
                item.recommendation,

            "business_impact":
                item.business_impact,

            "security_risk":
                item.security_risk,

            "suggested_action":
                item.suggested_action,

            "generated_at":
                item.generated_at
        }
        for item in recommendations
    ]