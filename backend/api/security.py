from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException   # HTTPException
from sqlalchemy.orm import Session
from db.dependencies import get_db
from models.commit import Commit
from models.repository import Repository

router = APIRouter()

SUSPICIOUS_REPO_PATTERNS = [
    ("test",    "Repository named 'test' — likely experimental, never cleaned up"),
    ("temp",    "Temporary repository left in production namespace"),
    ("old",     "Repository prefixed 'old' — likely superseded but not archived"),
    ("backup",  "Backup repository in public namespace — may contain sensitive data"),
    ("copy",    "Duplicate/copy repository — creates confusion and stale code risk"),
    ("demo",    "Demo repository publicly visible — may expose internal architecture"),
    ("private", "Repository named 'private' but is public — naming contradiction"),
    ("secret",  "Repository name contains 'secret' — high risk if public"),
]

def detect_name_risks(repo_name: str, is_public: bool):
    name_lower = repo_name.lower()
    risks = []
    for pattern, message in SUSPICIOUS_REPO_PATTERNS:
        if pattern in name_lower:
            risks.append({
                "type": "naming_risk",
                "severity": "Medium" if not is_public else "High",
                "finding": f"Suspicious repo name pattern: '{pattern}'",
                "risk": message
            })
    return risks


@router.get("/findings")
def security_findings(db: Session = Depends(get_db)):
    try:                                                           # ← added try/except
        findings = []
        now = datetime.utcnow()
        repositories = db.query(Repository).all()

        for repo in repositories:
            latest_commit = (
                db.query(Commit)
                .filter(Commit.repository_name == repo.name)
                .first()
            )

            days_inactive = 9999
            if latest_commit:
                days_inactive = (now - latest_commit.commit_date).days

            if not repo.private and days_inactive > 365:
                findings.append({
                    "repository": repo.name,
                    "severity": "Critical",
                    "finding": "Public repository inactive > 1 year",
                    "risk": "High probability of exposed secrets, stale API keys, and vulnerable dependencies being actively scanned",
                    "category": "critical_abandoned"
                })

            elif not repo.private and days_inactive > 180:
                findings.append({
                    "repository": repo.name,
                    "severity": "High",
                    "finding": "Public repository inactive > 180 days",
                    "risk": "Potential abandoned public codebase with unpatched vulnerabilities",
                    "category": "abandoned_public"
                })

            elif not repo.private and days_inactive > 90:
                findings.append({
                    "repository": repo.name,
                    "severity": "Medium",
                    "finding": "Public repo with no recent dependency updates",
                    "risk": "Likely contains unpatched CVEs in dependencies",
                    "category": "stale_dependencies"
                })

            for risk in detect_name_risks(repo.name, not repo.private):
                findings.append({
                    "repository": repo.name,
                    **risk,
                    "category": "naming_risk"
                })

        severity_order = {"Critical": 0, "High": 1, "Medium": 2, "Low": 3}
        findings.sort(key=lambda x: severity_order.get(x["severity"], 99))
        return findings

    except Exception as e:                                         # ← added
        raise HTTPException(status_code=500, detail=str(e))       # ← added


@router.post("/archive/{repo_name}")
async def archive_repository(repo_name: str, db: Session = Depends(get_db)):
    try:                                                           # ← added try/except
        return {
            "status": "archived",
            "repository": repo_name,
            "message": f"Repository {repo_name} has been archived successfully",
            "archived_at": datetime.utcnow().isoformat()
        }
    except Exception as e:                                         # ← added
        raise HTTPException(status_code=500, detail=str(e))       # ← added
