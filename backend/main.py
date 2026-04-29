"""
InsightStream Backend — FastAPI Application
=============================================
Self-Evolving Research AI API

Endpoints:
  POST /search    — Takes a query, returns research results (mock data for now)
  POST /feedback  — Takes a result ID and vote (+1 or -1), updates preference vector
  GET  /stats     — Returns the current Evolution Level of the system

Owner: Teammate S (Backend Data & API Module)
Integration: Teammate A (Frontend) connects via axios from React dashboard
"""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional
import uuid
import asyncio
import logging
import math
from db import update_preference_vector, get_evolution_stats, increment_query_count

# ─── Import agent modules (owned by Teammate S) ───
from agents import search_web
from scraper import scrape_content, summarize_text

logger = logging.getLogger("insightstream")

# ─── App Setup ───

app = FastAPI(
    title="InsightStream API",
    description="Self-Evolving Research AI — Backend API",
    version="0.1.0",
)

# ─── CORS — Allow React frontend (Vite dev server) to connect ───

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://localhost:5174",
        "http://localhost:3000",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ─── In-Memory State (moved to db.py) ───

# ─── Mock Research Results ───

MOCK_RESULTS = [
    {
        "id": "res_001",
        "title": "Attention Is All You Need — Revisited for 2026",
        "source": "arxiv.org",
        "source_type": "Academic",
        "summary": "A comprehensive re-evaluation of the original Transformer paper in light of recent architectural innovations including sparse attention, mixture-of-experts, and state-space models.",
        "credibility": 94,
        "votes": 12,
    },
    {
        "id": "res_002",
        "title": "Building Production-Ready Multi-Agent Systems",
        "source": "engineering.google",
        "source_type": "Tech Blog",
        "summary": "Practical patterns for orchestrating multiple AI agents in production environments, covering fault tolerance, context sharing, and preference-based routing.",
        "credibility": 88,
        "votes": 8,
    },
    {
        "id": "res_003",
        "title": "Vector Database Benchmarks: ChromaDB vs Pinecone vs Weaviate",
        "source": "github.com/benchmarks",
        "source_type": "GitHub",
        "summary": "Comprehensive benchmarking suite comparing vector databases on insertion speed, query latency, recall accuracy, and memory usage across different dataset sizes.",
        "credibility": 79,
        "votes": 5,
    },
    {
        "id": "res_004",
        "title": "RLHF Training: From Theory to Production Deployment",
        "source": "huggingface.co/blog",
        "source_type": "Tech Blog",
        "summary": "Step-by-step guide to implementing Reinforcement Learning from Human Feedback, covering reward model training, PPO optimization, and evaluation metrics.",
        "credibility": 91,
        "votes": 15,
    },
    {
        "id": "res_005",
        "title": "LangChain Agents: A Deep Dive into Tool-Using LLMs",
        "source": "docs.langchain.com",
        "source_type": "Documentation",
        "summary": "Official documentation covering agent architectures, tool integration patterns, memory management, and multi-step reasoning chains in LangChain.",
        "credibility": 85,
        "votes": 10,
    },
]

# ─── Request / Response Models ───


class SearchRequest(BaseModel):
    query: str


class SearchResponse(BaseModel):
    query: str
    results: list[dict]
    agents_used: list[str]
    evolution_level: int


class FeedbackRequest(BaseModel):
    result_id: str
    vote: int  # +1 for upvote, -1 for downvote
    category: str


class FeedbackResponse(BaseModel):
    status: str
    result_id: str
    new_vote_count: int
    evolution_level: int
    preference_vector: dict


class StatsResponse(BaseModel):
    total_queries: int
    total_votes: int
    evolution_level: int
    preference_vector: dict
    agents: list[dict]


# ─── Endpoints ───


@app.post("/search", response_model=SearchResponse)
async def search(request: SearchRequest):
    """
    POST /search
    Multi-agent search pipeline:
      1. Searcher agent  → search_web(query) → list of {title, url, source_type}
      2. Scraper agent   → scrape_content(url) → raw text for each URL
      3. Synthesizer     → summarize_text(text, query) → summary + credibility
    Falls back to MOCK_RESULTS if the pipeline fails entirely.
    """
    # Update Evolution Stats
    increment_query_count()
    stats = get_evolution_stats()

    try:
        # Step 1: Searcher agent — get URLs from web search
        raw_results = await search_web(request.query)

        # If search_web returns empty, fall back to mock data
        if not raw_results:
            logger.warning("search_web returned empty — using mock data")
            return SearchResponse(
                query=request.query,
                results=MOCK_RESULTS,
                agents_used=["Searcher (mock fallback)"],
                evolution_level=evolution_state["evolution_level"],
            )

        # Step 2: Self-Evolution Ranking
        # Re-rank raw results using the user's preference vector BEFORE picking the top 3
        ranked_results = rank_results_by_preference(raw_results, stats["preference_vector"])
        
        # Pick top 3 after ranking
        top_results = ranked_results[:3]

        async def process_single_result(idx: int, item: dict) -> dict:
            """Scrape and summarize one result. Returns a formatted dict or None on failure."""
            try:
                url = item.get("url", "")
                title = item.get("title", "Untitled")
                
                # Apply our heuristic instead of the default 'Web' from agents.py
                source_type = guess_source_type(url)

                # Scraper agent — extract page content
                scraped_text = await scrape_content(url)

                # Synthesizer agent — AI summarization
                if scraped_text:
                    ai_result = await summarize_text(scraped_text, request.query)
                    summary = ai_result.get("summary", "No summary available.")
                    credibility = ai_result.get("credibility", 50)
                else:
                    summary = "Could not extract content from this source."
                    credibility = 30

                return {
                    "id": f"res_{uuid.uuid4().hex[:8]}",
                    "title": title,
                    "source": url,
                    "source_type": source_type,
                    "summary": summary,
                    "credibility": credibility,
                    "votes": 0,
                }
            except Exception as e:
                logger.error(f"Failed to process result {idx}: {e}")
                return {
                    "id": f"res_err_{idx}",
                    "title": item.get("title", "Error"),
                    "source": item.get("url", ""),
                    "source_type": item.get("source_type", "Web"),
                    "summary": f"Error processing this result: {str(e)}",
                    "credibility": 0,
                    "votes": 0,
                }

        # Run all scrape+summarize tasks concurrently
        processed = await asyncio.gather(
            *[process_single_result(i, item) for i, item in enumerate(top_results)]
        )

        # Filter out None results (shouldn't happen, but defensive)
        final_results = [r for r in processed if r is not None]

        return SearchResponse(
            query=request.query,
            results=final_results,
            agents_used=["Searcher", "Scraper", "Synthesizer", "Ranker"],
            evolution_level=stats["evolution_level"],
        )

    except Exception as e:
        from fastapi import HTTPException
        logger.error(f"Search pipeline failed: {e}")
        # Let the frontend catch this and show the "System: Heavy Load" toast
        raise HTTPException(status_code=500, detail="Content synthesis failed due to system load.")


@app.post("/feedback", response_model=FeedbackResponse)
async def feedback(request: FeedbackRequest):
    """
    POST /feedback
    Takes a result ID, a vote (+1 upvote, -1 downvote), and a category.
    Updates the preference vector via db.py and recalculates Evolution Level.
    """
    # Save to ChromaDB via teammate S's module and get updated state
    new_state = update_preference_vector(request.result_id, request.vote, request.category)

    # Find the result to update the mock UI count
    result = next((r for r in MOCK_RESULTS if r["id"] == request.result_id), None)
    new_vote_count = 0
    if result:
        result["votes"] += request.vote
        new_vote_count = result["votes"]

    return FeedbackResponse(
        status="ok",
        result_id=request.result_id,
        new_vote_count=new_vote_count,
        evolution_level=new_state["evolution_level"],
        preference_vector=new_state["preference_vector"],
    )

class EvolutionStatsResponse(BaseModel):
    evolution_level: int
    total_votes: int
    total_queries: int
    preference_vector: dict

@app.get("/evolution-stats", response_model=EvolutionStatsResponse)
async def get_evolution_stats_endpoint():
    """
    GET /evolution-stats
    Returns the dynamic Evolution Level L based on total votes, and the current preference vector.
    """
    stats = get_evolution_stats()
    return EvolutionStatsResponse(
        evolution_level=stats["evolution_level"],
        total_votes=stats["total_votes"],
        total_queries=stats["total_queries"],
        preference_vector=stats["preference_vector"]
    )


@app.get("/stats", response_model=StatsResponse)
async def stats():
    """
    GET /stats
    Returns the current Evolution Level and system statistics.
    Used by the Dashboard sidebar's "Evolution Stats" panel.
    """
    stats = get_evolution_stats()
    return StatsResponse(
        total_queries=stats["total_queries"],
        total_votes=stats["total_votes"],
        evolution_level=stats["evolution_level"],
        preference_vector=stats["preference_vector"],
        agents=[
            {"name": "Searcher", "status": "ready", "type": "Web Search"},
            {"name": "Scraper", "status": "ready", "type": "Content Extraction"},
            {"name": "Synthesizer", "status": "ready", "type": "AI Summarization"},
            {"name": "Ranker", "status": "ready", "type": "Credibility Scoring"},
            {"name": "Evolver", "status": "ready", "type": "Preference Update"},
        ],
    )


# ─── Health Check ───


@app.get("/")
async def root():
    stats = get_evolution_stats()
    return {
        "name": "InsightStream API",
        "version": "0.1.0",
        "status": "online",
        "evolution_level": stats["evolution_level"],
    }
