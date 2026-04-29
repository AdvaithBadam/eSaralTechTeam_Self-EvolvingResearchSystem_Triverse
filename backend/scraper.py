import asyncio
import os
import requests
from bs4 import BeautifulSoup
from google import genai
from tenacity import retry, stop_after_attempt, wait_exponential

# Configure Gemini from environment variable
_GEMINI_KEY = os.getenv("GEMINI_API_KEY", "")
_genai_client = genai.Client(api_key=_GEMINI_KEY) if _GEMINI_KEY else None

async def scrape_content(url: str) -> str:
    """Fetch and extract clean text from a URL using BeautifulSoup."""
    if not url or url == "N/A":
        return ""
    def _fetch():
        try:
            headers = {"User-Agent": "Mozilla/5.0 (InsightStream Research Bot)"}
            resp = requests.get(url, headers=headers, timeout=8)
            resp.raise_for_status()
            soup = BeautifulSoup(resp.text, "html.parser")
            # Remove script/style noise
            for tag in soup(["script", "style", "nav", "footer", "header"]):
                tag.decompose()
            text = soup.get_text(separator=" ", strip=True)
            # Limit to first 3000 chars to keep Gemini prompt small
            return text[:3000]
        except Exception:
            return ""
    return await asyncio.to_thread(_fetch)

async def summarize_text(text: str, query: str) -> dict:
    """Summarize scraped text with Gemini. Falls back gracefully if no API key."""
    if not text.strip():
        return {"summary": "Could not extract content from this source.", "credibility": 30}

    if not _GEMINI_KEY:
        # Graceful fallback: return a trimmed excerpt instead of crashing
        excerpt = text[:200].strip()
        return {"summary": f"{excerpt}...", "credibility": 50}

    @retry(stop=stop_after_attempt(3), wait=wait_exponential(multiplier=1, min=2, max=10))
    def _call_gemini():
        try:
            prompt = (
                f"You are a research assistant. Summarize the following content in 2–3 concise sentences "
                f"as it relates to the query: '{query}'.\n\nContent:\n{text}"
            )
            response = _genai_client.models.generate_content(
                model="gemini-2.0-flash",
                contents=prompt,
            )
            summary = response.text.strip()
            # Heuristic credibility: longer, richer content = higher score
            credibility = min(95, 60 + len(text) // 100)
            return {"summary": summary, "credibility": credibility}
        except Exception as e:
            # If we exhaust retries or get another error, raise it so main.py can catch it and return 429/500
            raise e

    try:
        return await asyncio.to_thread(_call_gemini)
    except Exception as e:
        return {"summary": "Content synthesis failed due to system load.", "credibility": 40, "error": str(e)}