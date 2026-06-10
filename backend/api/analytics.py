from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException   # HTTPException
from sqlalchemy.orm import Session
from db.dependencies import get_db
from models.commit import Commit
from models.repository import Repository

router = APIRouter()


@router.get("/repository-summary")
def repository_summary(db: Session = Depends(get_db)):
    try:                                                           # ← added try/except
        commits = db.query(Commit).all()
        now = datetime.now()
        total = len(commits)
        dormant = sum(1 for c in commits if (now - c.commit_date).days > 30)
        critical = sum(1 for c in commits if (now - c.commit_date).days > 90)

        repos = db.query(Repository).all()
        public_count = sum(1 for r in repos if not r.private)

        total_waste = 0
        for c in commits:
            days = (now - c.commit_date).days
            if days > 30:
                repo = next((r for r in repos if r.name == c.repository_name), None)
                is_public = repo and not repo.private
                rate = 12.50 if is_public else 8.00
                total_waste += rate * 30

        return {
            "total_repositories": total,
            "dormant_repositories": dormant,
            "active_repositories": total - dormant,
            "critical_repositories": critical,
            "public_repositories": public_count,
            "estimated_monthly_waste": round(total_waste, 2)
        }
    except Exception as e:                                         # ← added
        raise HTTPException(status_code=500, detail=str(e))       # ← added


@router.get("/dormant-repositories")
def dormant_repositories(db: Session = Depends(get_db)):
    try:                                                           # ← added try/except
        commits = db.query(Commit).all()
        now = datetime.now()
        results = []
        for commit in commits:
            days_inactive = (now - commit.commit_date).days
            if days_inactive > 30:
                results.append({
                    "repository": commit.repository_name,
                    "days_inactive": days_inactive,
                    "author": commit.author
                })
        return sorted(results, key=lambda x: x["days_inactive"], reverse=True)
    except Exception as e:                                         # ← added
        raise HTTPException(status_code=500, detail=str(e))       # ← added


@router.get("/risk-scores")
def risk_scores(db: Session = Depends(get_db)):
    try:                                                           # ← added try/except
        commits = db.query(Commit).all()
        repos = db.query(Repository).all()
        now = datetime.now()
        repo_map = {r.name: r for r in repos}
        results = []

        for commit in commits:
            days = (now - commit.commit_date).days
            repo = repo_map.get(commit.repository_name)
            is_public = bool(repo and not repo.private)

            score = 0
            if days > 365:   score += 50
            elif days > 180: score += 35
            elif days > 90:  score += 20
            elif days > 30:  score += 10

            if is_public:               score += 25
            if is_public and days > 180: score += 15
            if days > 365 and is_public: score += 10

            results.append({
                "repository": commit.repository_name,
                "risk_score": min(score, 100),
                "days_inactive": days,
                "is_public": is_public,
                "author": commit.author
            })

        return sorted(results, key=lambda x: x["risk_score"], reverse=True)
    except Exception as e:                                         # ← added
        raise HTTPException(status_code=500, detail=str(e))       # ← added


@router.get("/cost-waste")
def cost_waste(db: Session = Depends(get_db)):
    try:                                                           # ← added try/except
        commits = db.query(Commit).all()
        repos = db.query(Repository).all()
        now = datetime.now()
        repo_map = {r.name: r for r in repos}
        results = []

        for commit in commits:
            days = (now - commit.commit_date).days
            if days < 30:
                continue
            repo = repo_map.get(commit.repository_name)
            is_public = bool(repo and not repo.private)
            rate = 12.50 if is_public else 8.00
            monthly_waste = round(rate * 30, 2)
            annual_waste = round(monthly_waste * 12, 2)

            results.append({
                "repository": commit.repository_name,
                "days_inactive": days,
                "is_public": is_public,
                "monthly_waste_usd": monthly_waste,
                "annual_waste_usd": annual_waste
            })

        total_monthly = round(sum(r["monthly_waste_usd"] for r in results), 2)
        total_annual = round(total_monthly * 12, 2)

        return {
            "repositories": results,
            "total_monthly_waste_usd": total_monthly,
            "total_annual_waste_usd": total_annual,
            "repo_count": len(results)
        }
    except Exception as e:                                         # ← added
        raise HTTPException(status_code=500, detail=str(e))       # ← added
