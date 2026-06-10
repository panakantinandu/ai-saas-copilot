from agents.repository_agent import (
    analyze_repository
)

result = analyze_repository(
    repo_name="hoen-scanner",
    days_inactive=1293,
    status="Critical",
    is_public=True
)

print(result)