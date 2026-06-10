import os                                          
import random
import string
from datetime import datetime, timedelta           
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel
from db.dependencies import get_db
from models.repository import Repository

router = APIRouter()


# ─── Request Models ──────────────────────────────────────────────────────────

class RepoActionRequest(BaseModel):
    repository: str
    priority: str = "High"
    message: str = ""


# ─── Create Jira Ticket ───────────────────────────────────────────────────────

@router.post("/jira")
def create_jira_ticket(req: RepoActionRequest, db: Session = Depends(get_db)):
    """
    Mocked: Creates a Jira ticket for the given repository action.
    In production, replace with:
        jira_client.create_issue(project="OPS", summary=..., description=...)
    """
    try:                                                               # ← added try/except (was missing)
        ticket_id = "OPS-" + "".join(random.choices(string.digits, k=4))

        repo = db.query(Repository).filter(Repository.name == req.repository).first()
        is_public = repo and not repo.private

        return {
            "status": "created",
            "ticket_id": ticket_id,
            "project": "OPS — SaaS Operations",
            "summary": f"Archive dormant repository: {req.repository}",
            "priority": req.priority,
            "assignee": "Platform Engineering",
            "reporter": "SaaS Ops Copilot (AI)",
            "due_date": (datetime.utcnow() + timedelta(days=14)).strftime("%Y-%m-%d"),  # LINE 42 — was .replace(day=day+14), crashes mid-month
            "description": req.message or f"AI Copilot flagged {req.repository} for archival.",
            "labels": ["ops-copilot", "dormant-repo", "auto-generated"],
            "url": f"https://your-jira.atlassian.net/browse/{ticket_id}",
            "created_at": datetime.utcnow().isoformat(),
            "mocked": True,
        }
    except Exception as e:                                             # ← added
        raise HTTPException(status_code=500, detail=str(e))           # ← added


# ─── Generate & Send Email ────────────────────────────────────────────────────

@router.post("/email")
def send_email_notification(req: RepoActionRequest):
    """
    Mocked: Sends an email alert to team leads and security team.
    In production, replace with:
        sendgrid_client.send(to=[...], subject=..., html=...)
    """
    try:                                                               
        # Now reads from environment variable; falls back to safe defaults
        raw = os.getenv("ALERT_RECIPIENTS", "security@company.com,ops@company.com")
        recipients = [r.strip() for r in raw.split(",") if r.strip()]

        return {
            "status": "sent",
            "to": recipients,
            "subject": f"[Action Required] Archive Repository: {req.repository}",
            "priority": req.priority,
            "recipients_count": len(recipients),
            "body_preview": (
                f"AI Ops Copilot has flagged {req.repository} for immediate action. "
                f"Priority: {req.priority}. "
                f"{req.message or 'Please review and archive this repository.'}"
            ),
            "sent_at": datetime.utcnow().isoformat(),
            "message_id": f"msg_{int(datetime.utcnow().timestamp())}@saas-copilot",
            "mocked": True,
        }
    except Exception as e:                                             # ← added
        raise HTTPException(status_code=500, detail=str(e))           # ← added


# ─── Notify Slack ─────────────────────────────────────────────────────────────

@router.post("/slack")
def notify_slack(req: RepoActionRequest):
    """
    Mocked: Posts a Slack alert to #ops-alerts.
    In production, replace with:
        slack_client.chat_postMessage(channel="#ops-alerts", text=..., blocks=[...])
    """
    try:                                                               # ← added try/except (was missing)
        emoji = "🚨" if req.priority == "Critical" else "⚠️"
        return {
            "status": "sent",
            "channel": "#ops-alerts",
            "also_notified": ["@platform-eng", "@security-team"],
            "message": f"{emoji} *{req.repository}* flagged by AI Copilot — {req.message or 'Requires immediate action.'}",
            "thread_created": True,
            "thread_ts": f"{int(datetime.utcnow().timestamp())}.000000",
            "permalink": f"https://your-slack.com/archives/C0123456/p{int(datetime.utcnow().timestamp())}",
            "sent_at": datetime.utcnow().isoformat(),
            "mocked": True,
        }
    except Exception as e:                                             # ← added
        raise HTTPException(status_code=500, detail=str(e))           # ← added


# ─── Archive Repository ───────────────────────────────────────────────────────

@router.post("/archive/{repo_name}")
def archive_repository(repo_name: str, db: Session = Depends(get_db)):
    """
    Archives a repository in the database and returns savings estimate.
    In production also call: github_client.repos.update(repo_name, archived=True)
    """
    try:                                                               # ← added try/except (was missing)
        repo = db.query(Repository).filter(Repository.name == repo_name).first()
        monthly_savings = 375.0 if (repo and not repo.private) else 240.0

        # LINES 114-115 — was commented out; now actually updates the DB
        if repo:
            db.query(Repository).filter(Repository.name == repo_name).update({"private": True})
            db.commit()

        return {
            "status": "archived",
            "repository": repo_name,
            "message": f"Repository {repo_name} has been archived successfully",
            "archived_at": datetime.utcnow().isoformat(),
            "visibility": "read_only",
            "workflows_disabled": True,
            "monthly_savings_usd": monthly_savings,
            "annual_savings_usd": monthly_savings * 12,
            "github_url": f"https://github.com/org/{repo_name}",
            "mocked": True,
        }
    except Exception as e:                                             # ← added
        raise HTTPException(status_code=500, detail=str(e))           # ← added
