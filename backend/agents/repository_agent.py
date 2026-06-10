import random

def analyze_repository(
    repo_name: str,
    days_inactive: int,
    status: str,
    is_public: bool
):
    if days_inactive > 365:
        recommendation = "Immediately archive — repo has been dead for over a year"
        impact = f"Consuming CI/CD resources and cluttering team namespace with zero ROI for {days_inactive} days"
        action = f"Run: gh repo archive {repo_name} — notify team leads, remove from active monitoring"
    elif days_inactive > 180:
        recommendation = "Archive within 2 weeks — critically dormant"
        impact = "Potential orphaned dependencies and outdated security patches pose increasing risk"
        action = "Assign DRI (Directly Responsible Individual), schedule review, archive if no response in 14 days"
    elif days_inactive > 90:
        recommendation = "Schedule team review this sprint"
        impact = "Unclear ownership may cause knowledge loss and block future onboarding"
        action = "Ping last committer, add CODEOWNERS file, decide: continue or deprecate"
    else:
        recommendation = "Monitor — approaching dormancy threshold"
        impact = "Low risk now, but trending toward inactive status without intervention"
        action = "Set automated reminder in 30 days. No immediate action required."

    if is_public and days_inactive > 180:
        security_risk = "CRITICAL: Public abandoned repo may expose hardcoded secrets, stale API keys, or vulnerable dependencies to internet scanners"
    elif is_public and days_inactive > 90:
        security_risk = "HIGH: Public repo with no recent patches — unaddressed CVEs likely in dependencies"
    elif is_public:
        security_risk = "MEDIUM: Public visibility requires active maintenance and secret scanning"
    elif days_inactive > 180:
        security_risk = "MEDIUM: Private but stale — outdated auth tokens or internal credentials may be committed"
    else:
        security_risk = "LOW: Private repo within acceptable activity window"

    waste_per_day = 12.50 if is_public else 8.00
    estimated_monthly_waste = round((waste_per_day * 30), 2)

    return {
        "recommendation": recommendation,
        "business_impact": impact,
        "security_risk": security_risk,
        "suggested_action": action,
        "estimated_monthly_waste": estimated_monthly_waste
    }


# # import os
# # import json

# # from dotenv import load_dotenv
# # from openai import OpenAI

# # load_dotenv()

# # client = OpenAI(
# #     api_key=os.getenv("GITHUB_TOKEN"),
# #     base_url="https://models.github.ai/inference"
# # )


# # def analyze_repository(
# #     repo_name: str,
# #     days_inactive: int,
# #     status: str,
# #     is_public: bool
# # ):

# #     prompt = f"""
# # You are an enterprise SaaS Operations Copilot.

# # Repository Name:
# # {repo_name}

# # Days Inactive:
# # {days_inactive}

# # Status:
# # {status}

# # Public Repository:
# # {is_public}

# # Return ONLY valid JSON.

# # Required format:

# # {{
# #     "recommendation":"",
# #     "business_impact":"",
# #     "security_risk":"",
# #     "suggested_action":""
# # }}

# # Rules:
# # - Archive repositories inactive over 180 days.
# # - Review repositories inactive between 30 and 180 days.
# # - Consider public inactive repositories a higher security risk.
# # - Keep responses concise.
# # """

# #     response = client.chat.completions.create(
# #         model="openai/gpt-4.1",
# #         messages=[
# #             {
# #                 "role": "system",
# #                 "content": "You are a SaaS Operations Copilot."
# #             },
# #             {
# #                 "role": "user",
# #                 "content": prompt
# #             }
# #         ],
# #         temperature=0.2,
# #         max_tokens=300
# #     )

# #     content = (
# #         response.choices[0]
# #         .message.content
# #     )

# #     try:
# #         return json.loads(content)

# #     except Exception:

# #         return {
# #             "recommendation": "Review",
# #             "business_impact": "Unknown",
# #             "security_risk": "Unknown",
# #             "suggested_action": content
# #         }

# import os
# import json
# import google.generativeai as genai
# from dotenv import load_dotenv

# load_dotenv()

# # genai.configure(api_key=os.getenv("GEMINI_API_KEY"))
# # model = genai.GenerativeModel("gemini-2.0-flash")

# # def analyze_repository(repo_name, days_inactive, status, is_public):

# #     prompt = f"""You are an enterprise SaaS Operations Copilot.

# # Repository Name: {repo_name}
# # Days Inactive: {days_inactive}
# # Status: {status}
# # Public Repository: {is_public}

# # Return ONLY valid JSON, no markdown, no backticks:
# # {{
# #     "recommendation": "",
# #     "business_impact": "",
# #     "security_risk": "",
# #     "suggested_action": ""
# # }}

# # Rules:
# # - Archive repositories inactive over 180 days.
# # - Review repositories inactive between 30 and 180 days.
# # - Consider public inactive repositories a higher security risk.
# # - Keep responses concise."""

# #     response = model.generate_content(prompt)
# #     content = response.text.strip()

# #     # strip markdown code fences if model adds them
# #     if content.startswith("```"):
# #         content = content.split("```")[1]
# #         if content.startswith("json"):
# #             content = content[4:]

# #     try:
# #         return json.loads(content)
# #     except Exception:
# #         return {
# #             "recommendation": "Review",
# #             "business_impact": "Unknown",
# #             "security_risk": "Unknown",
# #             "suggested_action": content
# #         }
# # backend/agents/repository_agent.py

# def analyze_repository(repo_name, days_inactive, status, is_public):

#     if days_inactive > 365:
#         recommendation = "Immediately archive"
#         impact = "High maintenance burden with zero business value"
#         action = "Run: gh repo archive " + repo_name
#     elif days_inactive > 180:
#         recommendation = "Archive within 30 days"
#         impact = "Consuming CI/CD resources with no active development"
#         action = "Notify owner, archive if no response in 2 weeks"
#     elif days_inactive > 90:
#         recommendation = "Schedule team review"
#         impact = "Unclear ownership may cause knowledge loss"
#         action = "Assign DRI (Directly Responsible Individual)"
#     else:
#         recommendation = "Monitor monthly"
#         impact = "Low risk, approaching dormancy threshold"
#         action = "Set reminder to review in 30 days"

#     if is_public and days_inactive > 180:
#         risk = "CRITICAL: Public repo may expose secrets or outdated dependencies"
#     elif is_public:
#         risk = "Medium: Public visibility requires active maintenance"
#     else:
#         risk = "Low: Private repo, internal exposure only"

#     return {
#         "recommendation": recommendation,
#         "business_impact": impact,
#         "security_risk": risk,
#         "suggested_action": action
#     }