from duckduckgo_search import DDGS
import asyncio

async def search_web(query: str) -> list[dict]:
    def fetch():
        with DDGS() as ddgs:
            return list(ddgs.text(query, max_results=5))

    search_results = await asyncio.to_thread(fetch)

    results = []
    for r in search_results:
        results.append({
            "title": r.get("title", ""),
            "url": r.get("href", ""),
            "source_type": "Web"
        })

    return results


# TEMP bridge for your current app.py
async def run_agents(query: str):
    return await search_web(query)