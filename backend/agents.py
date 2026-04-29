import asyncio

async def search_web(query: str) -> list[dict]:
    await asyncio.sleep(0.1)
    return []

# bridge for current app.py (DO NOT REMOVE)
async def run_agents(query: str):
    return await search_web(query)