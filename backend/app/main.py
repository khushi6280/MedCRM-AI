"""
AI-First CRM HCP Module - Backend Application
FastAPI + LangGraph + Groq (gemma2-9b-it)

Entry point for the backend server.
"""

import uvicorn
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.routers import hcps, interactions, agent
from app.database import init_db

app = FastAPI(
    title="MedCRM AI - HCP Module",
    description="AI-First CRM for Healthcare Professional interactions, powered by LangGraph and Groq LLMs.",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(hcps.router, prefix="/api/hcps", tags=["HCPs"])
app.include_router(interactions.router, prefix="/api/interactions", tags=["Interactions"])
app.include_router(agent.router, prefix="/api/agent", tags=["AI Agent"])


@app.on_event("startup")
def startup():
    init_db()


@app.get("/")
def root():
    return {
        "service": "MedCRM AI - HCP Module",
        "status": "running",
        "ai_agent": "LangGraph + gemma2-9b-it (Groq)",
        "docs": "/docs",
    }


@app.get("/health")
def health():
    return {"status": "healthy"}


if __name__ == "__main__":
    uvicorn.run("app.main:app", host="0.0.0.0", port=8000, reload=True)
