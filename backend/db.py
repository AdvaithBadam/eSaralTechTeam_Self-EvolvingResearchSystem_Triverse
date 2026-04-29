import math

# Simple in-memory storage simulating a database
db_state = {
    "total_votes": 0,
    "total_queries": 0,
    "evolution_level": 1,
    "preference_vector": {
        "academic_papers": 87,
        "tech_blogs": 62,
        "stack_overflow": 45,
        "github_repos": 73,
        "documentation": 91,
    },
}

def update_preference_vector(result_id: str, vote: int, source_type: str = None, category: str = None) -> dict:
    global db_state
    
    # Increment total votes
    db_state["total_votes"] += 1
    
    # Map source type to preference keys
    source_map = {
        "Academic": "academic_papers",
        "Tech Blog": "tech_blogs",
        "Stack Overflow": "stack_overflow",
        "GitHub": "github_repos",
        "Documentation": "documentation",
        "Journal": "academic_papers",
        "Preprint": "academic_papers",
        "Conference": "academic_papers",
        "Report": "academic_papers"
    }
    
    # Prioritize category if explicitly passed, fallback to source_type
    pref_key = source_map.get(category, source_map.get(source_type))
    
    if pref_key and pref_key in db_state["preference_vector"]:
        current = db_state["preference_vector"][pref_key]
        # Adjust preference score, keeping it between 0 and 100
        db_state["preference_vector"][pref_key] = max(0, min(100, current + (vote * 5)))

    # Calculate Evolution Level L = min(100, floor(log2(Total Votes + 1) * 25))
    L = min(100, int(math.log2(db_state["total_votes"] + 1) * 25))
    db_state["evolution_level"] = max(db_state["evolution_level"], L)
    
    return db_state

def get_evolution_stats() -> dict:
    return db_state

def increment_query_count():
    global db_state
    db_state["total_queries"] += 1
    return db_state["total_queries"]