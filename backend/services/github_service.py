# import httpx


# class GitHubService:

#     BASE_URL = "https://api.github.com"

#     def __init__(self, token: str):
#         self.token = token

#     @property
#     def headers(self):
#         return {
#             "Authorization": f"Bearer {self.token}",
#             "Accept": "application/vnd.github+json"
#         }

#     async def get_me(self):
#         async with httpx.AsyncClient() as client:
#             response = await client.get(
#                 f"{self.BASE_URL}/user",
#                 headers=self.headers
#             )

#             response.raise_for_status()
#             return response.json()

#     async def get_orgs(self):
#         async with httpx.AsyncClient() as client:
#             response = await client.get(
#                 f"{self.BASE_URL}/user/orgs",
#                 headers=self.headers
#             )

#             response.raise_for_status()
#             return response.json()

#     async def get_user_repos(self):
#         async with httpx.AsyncClient() as client:
#             response = await client.get(
#                 f"{self.BASE_URL}/user/repos",
#                 headers=self.headers
#             )

#             response.raise_for_status()
#             return response.json()

#     async def get_repositories(self, org_name: str):
#         async with httpx.AsyncClient() as client:
#             response = await client.get(
#                 f"{self.BASE_URL}/orgs/{org_name}/repos",
#                 headers=self.headers
#             )

#             response.raise_for_status()
#             return response.json()

#     async def get_members(self, org_name: str):
#         async with httpx.AsyncClient() as client:
#             response = await client.get(
#                 f"{self.BASE_URL}/orgs/{org_name}/members",
#                 headers=self.headers
#             )

#             response.raise_for_status()
#             return response.json()

#     async def get_commits(self, owner: str, repo: str):
#         async with httpx.AsyncClient() as client:
#             response = await client.get(
#                 f"{self.BASE_URL}/repos/{owner}/{repo}/commits",
#                 headers=self.headers
#             )

#             response.raise_for_status()
#             return response.json()
import httpx

class GitHubService:

    BASE_URL = "https://api.github.com"

    def __init__(self, token: str):
        self.token = token

    @property
    def headers(self):
        return {
            "Authorization": f"Bearer {self.token}",
            "Accept": "application/vnd.github+json"
        }

    async def get_me(self):
        async with httpx.AsyncClient() as client:
            response = await client.get(f"{self.BASE_URL}/user", headers=self.headers)
            response.raise_for_status()
            return response.json()

    async def get_orgs(self):
        async with httpx.AsyncClient() as client:
            response = await client.get(f"{self.BASE_URL}/user/orgs", headers=self.headers)
            response.raise_for_status()
            return response.json()

    async def get_user_repos(self):
        all_repos = []
        page = 1
        async with httpx.AsyncClient() as client:
            while True:
                response = await client.get(
                    f"{self.BASE_URL}/user/repos",
                    headers=self.headers,
                    params={"per_page": 100, "page": page, "sort": "pushed"}
                )
                response.raise_for_status()
                batch = response.json()
                if not batch:
                    break
                all_repos.extend(batch)
                if len(batch) < 100:
                    break
                page += 1
        return all_repos

    async def get_org_repos(self, org_name: str):
        all_repos = []
        page = 1
        async with httpx.AsyncClient() as client:
            while True:
                response = await client.get(
                    f"{self.BASE_URL}/orgs/{org_name}/repos",
                    headers=self.headers,
                    params={"per_page": 100, "page": page, "sort": "pushed", "type": "all"}
                )
                response.raise_for_status()
                batch = response.json()
                if not batch:
                    break
                all_repos.extend(batch)
                if len(batch) < 100:
                    break
                page += 1
        return all_repos

    async def get_commits(self, owner: str, repo: str):
        async with httpx.AsyncClient(timeout=10.0) as client:
            response = await client.get(
                f"{self.BASE_URL}/repos/{owner}/{repo}/commits",
                headers=self.headers,
                params={"per_page": 1}
            )
            response.raise_for_status()
            return response.json()

    async def archive_repository(self, owner: str, repo: str, token: str):
        async with httpx.AsyncClient() as client:
            response = await client.patch(
                f"{self.BASE_URL}/repos/{owner}/{repo}",
                headers={**self.headers, "Authorization": f"Bearer {token}"},
                json={"archived": True}
            )
            response.raise_for_status()
            return response.json()
