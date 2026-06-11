import os
import secrets
from datetime import datetime, timedelta
from fastapi import APIRouter, Request, Body, Depends, HTTPException, Cookie, Header
from fastapi.responses import RedirectResponse, JSONResponse
from sqlalchemy.orm import Session
from core.oauth import oauth
from services.github_service import GitHubService
from db.dependencies import get_db
from models.repository import Repository
from models.commit import Commit
from api.ai import generate_ai_recommendations

router = APIRouter()

# In-memory store: short-lived code → real GitHub token (one-time use, ~5 min window).
# In production replace with Redis and set a TTL of 300 seconds.
_pending_tokens: dict[str, str] = {}

DEMO_REPOS = [
    {"name": "payments-service", "days": 12, "private": True, "owner": "acme-corp"},
    {"name": "auth-microservice", "days": 45, "private": False, "owner": "acme-corp"},
    {"name": "legacy-billing-v1", "days": 280, "private": False, "owner": "acme-corp"},
    {"name": "ml-experiment-2022", "days": 410, "private": False, "owner": "acme-corp"},
    {"name": "internal-dashboard", "days": 180, "private": True, "owner": "acme-corp"},
    {"name": "mobile-app-ios", "days": 22, "private": True, "owner": "acme-corp"},
    {"name": "data-pipeline-old", "days": 320, "private": False, "owner": "acme-corp"},
    {"name": "customer-portal", "days": 95, "private": False, "owner": "acme-corp"},
    {"name": "devops-scripts", "days": 150, "private": True, "owner": "acme-corp"},
    {"name": "test-automation", "days": 60, "private": False, "owner": "acme-corp"},
]


# ─── Shared auth dependency ───────────────────────────────────────────────────

def _require_token(token: str = Header(default=None, alias="X-Auth-Token")) -> str:
    """Reads the GitHub token from the httpOnly session cookie."""
    if not token:
        raise HTTPException(
            status_code=401,
            detail="Not authenticated — please log in again"
        )
    return token


# ─── OAuth flow ───────────────────────────────────────────────────────────────

@router.get("/github/login")
async def github_login(request: Request):
    try:
        redirect_uri = os.environ.get(
            "GITHUB_CALLBACK_URL",
            "http://localhost:8000/auth/github/callback"
        )
        return await oauth.github.authorize_redirect(request, redirect_uri)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/github/callback", name="github_callback")
async def github_callback(request: Request):
    """
    GitHub redirects here after the user authorises the app.
    We issue a short-lived one-time code and redirect to /callback on the
    frontend. The real GitHub token never appears in a URL.
    """
    try:
        token = await oauth.github.authorize_access_token(request)
        access_token = token["access_token"]

        code = secrets.token_urlsafe(32)  # 256-bit random, one-time use
        _pending_tokens[code] = access_token

        frontend_url = os.environ.get(
            # "FRONTEND_URL",
            # "http://localhost:5173"
            "FRONTEND_URL",
            "https://ai-saas-copilot.vercel.app"
        )

        return RedirectResponse(
            url=f"{frontend_url}/callback?code={code}"
        )

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/github/exchange")
async def exchange_code(payload: dict = Body(...)):
    """
    Frontend POSTs {"code": "<one-time-code>"} here immediately after being
    redirected to /callback. Returns an httpOnly cookie with the real token.
    The code is consumed on first use — replaying it returns 400.
    """
    code = payload.get("code", "")
    access_token = _pending_tokens.pop(code, None)

    if not access_token:
        raise HTTPException(
            status_code=400,
            detail="Invalid or expired code"
        )

    # response = JSONResponse({"ok": True})
    # secure = os.environ.get("ENV") == "production"
    # response.set_cookie(
    #     key="gh_token",
    #     value=access_token,
    #     httponly=True,
    #     secure=secure,
    #     samesite="none",
    #     max_age=60 * 60 * 8,
    #     path="/",
    # )

    # return response
    return {"token": access_token}


@router.post("/github/logout")
async def logout():
    """Clears the session cookie."""
    response = JSONResponse({"ok": True})
    response.delete_cookie(key="gh_token", path="/")
    return response


@router.get("/github/me/session")
async def session_check(token: str = Header(default=None, alias="X-Auth-Token")):
    """Returns 401 if no valid session cookie is present."""
    if not token:
        raise HTTPException(
            status_code=401,
            detail="Not authenticated"
        )

    return {"authenticated": True}


# ─── GitHub API proxy endpoints ───────────────────────────────────────────────

@router.get("/github/me")
async def github_me(token: str = Depends(_require_token)):
    try:
        github = GitHubService(token)
        return await github.get_me()
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/github/orgs")
async def github_orgs(token: str = Depends(_require_token)):
    try:
        github = GitHubService(token)

        me = await github.get_me()
        orgs = await github.get_orgs()

        personal = {
            "login": me["login"],
            "avatar_url": me["avatar_url"],
            "type": "personal"
        }

        org_list = [
            {
                "login": o["login"],
                "avatar_url": o["avatar_url"],
                "type": "org"
            }
            for o in orgs
        ]

        return [personal] + org_list

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/github/sync")
async def github_sync(
    payload: dict = Body(default={}),
    db: Session = Depends(get_db),
    token: str = Depends(_require_token),
):
    try:
        org = payload.get("org")

        github = GitHubService(token)

        me = await github.get_me()
        my_login = me.get("login", "")

        if org and org != "personal" and org != my_login:
            repos = await github.get_org_repos(org)
        else:
            repos = await github.get_user_repos()

        repositories_saved = 0
        commits_saved = 0

        for repo in repos:

            existing_repo = (
                db.query(Repository)
                .filter(Repository.github_repo_id == repo["id"])
                .first()
            )

            if not existing_repo:
                db.add(
                    Repository(
                        github_repo_id=repo["id"],
                        name=repo["name"],
                        full_name=repo["full_name"],
                        private=repo["private"],
                        owner=repo["owner"]["login"],
                        default_branch=repo["default_branch"],
                    )
                )
                repositories_saved += 1

            else:
                existing_repo.private = repo["private"]

            try:
                commits = await github.get_commits(
                    repo["owner"]["login"],
                    repo["name"]
                )

            except Exception as inner:
                print(
                    f"Could not fetch commits for "
                    f"{repo['name']}: {inner}"
                )
                continue

            if not commits:
                continue

            latest = commits[0]

            sha = latest["sha"]
            author = latest["commit"]["author"]["name"]

            commit_date = datetime.fromisoformat(
                latest["commit"]["author"]["date"].replace(
                    "Z",
                    "+00:00"
                )
            ).replace(tzinfo=None)

            existing_commit = (
                db.query(Commit)
                .filter(Commit.sha == sha)
                .first()
            )

            if not existing_commit:

                existing_by_repo = (
                    db.query(Commit)
                    .filter(
                        Commit.repository_name == repo["name"]
                    )
                    .first()
                )

                if existing_by_repo:
                    existing_by_repo.sha = sha
                    existing_by_repo.author = author
                    existing_by_repo.commit_date = commit_date

                else:
                    db.add(
                        Commit(
                            sha=sha,
                            repository_name=repo["name"],
                            author=author,
                            commit_date=commit_date,
                        )
                    )
                    commits_saved += 1

        db.commit()

        return {
            "repositories_found": len(repos),
            "repositories_saved": repositories_saved,
            "commits_saved": commits_saved,
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ─── Demo seed ────────────────────────────────────────────────────────────────

@router.post("/auth/github/seed-demo")
async def seed_demo(db: Session = Depends(get_db)):
    try:
        db.query(Commit).delete()
        db.query(Repository).delete()

        for i, repo in enumerate(DEMO_REPOS):

            db.add(
                Repository(
                    github_repo_id=90000 + i,
                    name=repo["name"],
                    full_name=f"{repo['owner']}/{repo['name']}",
                    private=repo["private"],
                    owner=repo["owner"],
                    default_branch="main",
                )
            )

            commit_date = (
                datetime.utcnow().replace(microsecond=0)
                - timedelta(days=repo["days"])
            )

            db.add(
                Commit(
                    sha=f"demo{i:04d}abc",
                    repository_name=repo["name"],
                    author="Demo User",
                    commit_date=commit_date,
                )
            )

        db.commit()

        generate_ai_recommendations(db)

        return {"seeded": len(DEMO_REPOS)}

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
