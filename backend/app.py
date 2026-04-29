from fastapi import FastAPI
from agents import run_agents

app = FastAPI()

@app.get("/")
def home():
    return {"status": "Backend running 🚀"}

@app.get("/search")
def search(query: str):
    return run_agents(query)