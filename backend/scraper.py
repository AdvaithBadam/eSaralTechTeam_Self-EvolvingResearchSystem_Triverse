import asyncio

async def scrape_content(url: str) -> str:
    await asyncio.sleep(0.1)
    return ""

async def summarize_text(text: str, query: str) -> dict:
    await asyncio.sleep(0.1)
    return {
        "summary": "",
        "credibility": 0
    }