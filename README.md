# 🚀 SaaS Ops Copilot


<p align="center">

<img src="https://img.shields.io/badge/AI-Powered-blue?style=for-the-badge"/>
<img src="https://img.shields.io/badge/FastAPI-Backend-green?style=for-the-badge"/>
<img src="https://img.shields.io/badge/React-Frontend-61dafb?style=for-the-badge"/>
<img src="https://img.shields.io/badge/PostgreSQL-Database-blue?style=for-the-badge"/>
<img src="https://img.shields.io/badge/GitHub-OAuth-black?style=for-the-badge"/>

</p>

<p align="center">
AI-powered GitHub Repository Intelligence Platform
</p>

<p align="center">
Detect dormant repositories, estimate CI/CD waste, surface security risks, and generate AI-powered remediation plans in seconds.
</p>

---

#  Demo
<Opening Page
<img width="726" height="906" alt="image" src="https://github.com/user-attachments/assets/55a2126c-8464-4f49-80dc-170e1b7837ae" />

> Dashboard
<img width="1092" height="910" alt="image" src="https://github.com/user-attachments/assets/c524e812-c63d-4087-bd14-7c9e15749265" />

>Risk Scores
<img width="1056" height="887" alt="image" src="https://github.com/user-attachments/assets/53b5c7e0-e900-4a48-8372-63ebd6ae4133" />

> Security
<img width="1067" height="910" alt="image" src="https://github.com/user-attachments/assets/79650cbb-4b88-413c-b1ca-01ef42b343e1" />

> AI Insights
<img width="1070" height="915" alt="image" src="https://github.com/user-attachments/assets/7c861358-57dc-48d0-925b-ee351faa1783" />

> Cost Waste
<img width="1053" height="902" alt="image" src="https://github.com/user-attachments/assets/6554e2d9-ca1d-4c8f-8a12-01040670e4a9" />

> Repo Health
<img width="1062" height="902" alt="image" src="https://github.com/user-attachments/assets/7e7d8763-61c9-4744-886d-b6a75b067127" />

> AI Copilot
<img width="425" height="890" alt="image" src="https://github.com/user-attachments/assets/6ba59b8f-c921-4874-b724-627f9329a036" />





![Demo](docs/demo.gif)

---

# ⚡ Problem

Engineering organizations accumulate:

* Abandoned repositories
* Forgotten experiments
* Public repositories with stale code
* Unused CI/CD pipelines
* Unknown maintenance ownership

These create:

🔴 Security exposure

🔴 Infrastructure waste

🔴 Compliance risks

🔴 Operational blind spots

---

# 💡 Solution

SaaS Ops Copilot automatically analyzes GitHub repositories and generates actionable operational intelligence.

### Features

✅ Dormant Repository Detection

✅ Repository Risk Scoring

✅ Security Findings

✅ Cost Waste Analysis

✅ AI Recommendations

✅ Natural Language Copilot

✅ Action Center (Jira / Slack / Email)

---

# 🏗️ System Architecture

```mermaid
flowchart LR

A[GitHub OAuth]
B[FastAPI Backend]
C[GitHub API]
D[PostgreSQL]
E[Analytics Engine]
F[AI Recommendation Engine]
G[React Dashboard]

A --> B
B --> C
B --> D
D --> E
E --> F
F --> G
```

---

# 🔐 Secure OAuth Architecture

```mermaid
sequenceDiagram

participant User
participant Frontend
participant Backend
participant GitHub

User->>Frontend: Login
Frontend->>Backend: /github/login

Backend->>GitHub: OAuth Request

GitHub-->>Backend: Access Token

Backend->>Backend: Generate One-Time Code

Backend-->>Frontend: /callback?code=xyz

Frontend->>Backend: Exchange Code

Backend->>Backend: Validate + Delete Code

Backend-->>Frontend: Set HttpOnly Cookie

Frontend->>Backend: Authenticated Requests
```

---

# 🤖 AI Recommendation Pipeline

```mermaid
flowchart TD

A[Repositories]
B[Commit History]
C[Security Analysis]

A --> D[Risk Engine]
B --> D
C --> D

D --> E[Risk Score]

E --> F[AI Recommendation Generator]

F --> G[Archive Repo]
F --> H[Review Repo]
F --> I[Assign Owner]
F --> J[Investigate Security]
```

---

# 📊 Dashboard Overview

## Repository Health

| Metric            | Description             |
| ----------------- | ----------------------- |
| Risk Score        | 0-100 severity          |
| Dormancy          | Days inactive           |
| Security Findings | Critical issues         |
| Cost Waste        | Estimated monthly spend |
| Recommendations   | AI-generated actions    |

---

# 🎯 User Workflow

```mermaid
flowchart LR

A[Connect GitHub]
--> B[Sync Repositories]
--> C[Analyze Metadata]
--> D[Generate Scores]
--> E[Run AI Engine]
--> F[Display Dashboard]
--> G[Take Action]
```

---

# 📈 Business Impact

Example analysis:

| Metric                      | Value  |
| --------------------------- | ------ |
| Repositories Scanned        | 128    |
| Dormant Repositories        | 42     |
| Public Dormant Repositories | 9      |
| Monthly Waste               | $1,150 |
| Critical Findings           | 6      |

Potential yearly savings:

# 💰 $13,800+

---

# 🧠 AI Copilot

Ask natural language questions:

```text
Which repository is most at risk?

How much CI/CD spend is wasted?

Show top 3 actions I should take.

Which public repositories are inactive?
```

---

# ⚙️ Tech Stack

## Frontend

* React 19
* TypeScript
* Vite
* React Router
* Recharts

## Backend

* FastAPI
* Python 3.12
* SQLAlchemy
* PostgreSQL
* Authlib

## Security

* GitHub OAuth
* One-Time Code Exchange
* HttpOnly Cookies
* Secure Sessions

---

# 📂 Project Structure

```text
ai-saas-copilot

backend/
├── api/
├── agents/
├── services/
├── db/
├── models/

frontend/
├── pages/
├── services/
├── components/
├── assets/
```

---

# 🚀 Future Roadmap

### Phase 1

* Redis Token Storage
* Scheduled Sync Jobs
* Organization Selector

### Phase 2

* Slack Integration
* Jira Integration
* Email Notifications

### Phase 3

* Multi-Agent Analysis
* Repository Ownership Detection
* Compliance Monitoring

### Phase 4

* Autonomous AI Operations Agent

---

# ⭐ Why This Project Stands Out

Unlike traditional repository dashboards, SaaS Ops Copilot focuses on:

* Operational Intelligence
* Security Exposure Detection
* Cost Optimization
* AI-Powered Recommendations

Turning GitHub from a source-code platform into an operational decision engine.

---

# 📜 License

MIT
