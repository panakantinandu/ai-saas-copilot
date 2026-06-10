
# import time
# from datetime import datetime
# from fastapi import APIRouter, Depends
# from sqlalchemy.orm import Session
# from db.dependencies import get_db
# from models.commit import Commit
# from models.repository import Repository
# from models.ai_recommendation import AIRecommendation
# from agents.repository_agent import analyze_repository

# router = APIRouter()

# @router.post("/generate")  # ← only ONE definition
# def generate_ai_recommendations(db: Session = Depends(get_db)):
#     repositories = db.query(Repository).limit(5).all()
#     now = datetime.utcnow()
#     generated = 0

#     for repo in repositories:
#         commit = (
#             db.query(Commit)
#             .filter(Commit.repository_name == repo.name)
#             .first()
#         )
#         if not commit:
#             continue

#         days_inactive = (now - commit.commit_date).days
#         if days_inactive < 30:
#             continue

#         existing = (
#             db.query(AIRecommendation)
#             .filter(AIRecommendation.repository_name == repo.name)
#             .first()
#         )
#         if existing:
#             continue

#         status = "Critical" if days_inactive > 90 else "Warning"
#         try:
#             result = analyze_repository(
#                 repo_name=repo.name,
#                 days_inactive=days_inactive,
#                 status=status,
#                 is_public=not repo.private
#             )
#         except Exception as e:
#             print(f"Skipping {repo.name}: {e}")
#             time.sleep(15)  # back off on error
#             continue

#         #after call
#         time.sleep(5)

#         db.add(AIRecommendation(
#             repository_name=repo.name,
#             recommendation=result.get("recommendation", ""),
#             business_impact=result.get("business_impact", ""),
#             security_risk=result.get("security_risk", ""),
#             suggested_action=result.get("suggested_action", "")
#         ))
#         generated += 1

#     db.commit()
#     return {"generated": generated}

# @router.get("/recommendations")
# def get_ai_recommendations(db: Session = Depends(get_db)):

#     recommendations = (
#         db.query(AIRecommendation)
#         .all()
#     )

#     return [
#         {
#             "repository":
#                 item.repository_name,

#             "recommendation":
#                 item.recommendation,

#             "business_impact":
#                 item.business_impact,

#             "security_risk":
#                 item.security_risk,

#             "suggested_action":
#                 item.suggested_action
#         }

#         for item in recommendations
#     ]

# @router.post("/generate")
# def generate_ai_recommendations(
#     db: Session = Depends(get_db)
# ):
#     repositories = (
#     db.query(Repository)
#     .limit(2)
#     .all()
#     )

#     now = datetime.utcnow()

#     generated = 0
#     for repo in repositories:
#         commit = (
#             db.query(Commit)
#             .filter(
#                 Commit.repository_name ==
#                 repo.name
#             )
#             .first()
#         )
#         result = analyze_repository(...)
#         db.add(AIRecommendation(...))
#         generated += 1
        
#         time.sleep(2)

#         if not commit:
#             continue


import time
from datetime import datetime
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from db.dependencies import get_db
from models.commit import Commit
from models.repository import Repository
from models.ai_recommendation import AIRecommendation
from agents.repository_agent import analyze_repository

router = APIRouter()


@router.post("/generate")
def generate_ai_recommendations(db: Session = Depends(get_db)):

    repositories = db.query(Repository).all()
    now = datetime.utcnow()
    generated = 0

    for repo in repositories:
        commit = (
            db.query(Commit)
            .filter(Commit.repository_name == repo.name)
            .first()
        )

        if not commit:
            continue

        days_inactive = (now - commit.commit_date).days

        if days_inactive < 30:
            continue

        existing = (
            db.query(AIRecommendation)
            .filter(AIRecommendation.repository_name == repo.name)
            .first()
        )

        if existing:
            db.delete(existing)

        status = "Critical" if days_inactive > 90 else "Warning"

        try:
            result = analyze_repository(
                repo_name=repo.name,
                days_inactive=days_inactive,
                status=status,
                is_public=not repo.private
            )
        except Exception as e:
            print(f"Skipping {repo.name}: {e}")
            time.sleep(5)
            continue

        db.add(AIRecommendation(
            repository_name=repo.name,
            recommendation=result.get("recommendation", ""),
            business_impact=result.get("business_impact", ""),
            security_risk=result.get("security_risk", ""),
            suggested_action=result.get("suggested_action", "")
        ))
        generated += 1

    db.commit()
    return {"generated": generated}


@router.get("/recommendations")
def get_ai_recommendations(db: Session = Depends(get_db)):
    recommendations = db.query(AIRecommendation).all()
    return [
        {
            "repository": item.repository_name,
            "recommendation": item.recommendation,
            "business_impact": item.business_impact,
            "security_risk": item.security_risk,
            "suggested_action": item.suggested_action,
            "generated_at": item.generated_at
        }
        for item in recommendations
    ]