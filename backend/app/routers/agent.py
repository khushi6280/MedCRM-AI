"""
AI Agent router - exposes the LangGraph agent via REST API.

This endpoint receives a natural language message, runs it through
the LangGraph agent graph, and returns the response with tool call details.
"""

from fastapi import APIRouter
from app.agent.graph import agent_graph
from app.models.schemas import AgentRequest, AgentResponse, ToolCallResult, InteractionResponse

router = APIRouter()


@router.post("/chat", response_model=AgentResponse)
def chat(request: AgentRequest):
    """
    Send a message to the LangGraph AI agent.

    The agent:
    1. Classifies the user's intent
    2. Executes the appropriate tool (log, edit, get profile, etc.)
    3. Generates a natural language response

    The response includes the agent's message, any tool calls made,
    and any new/updated interaction records.
    """
    initial_state = {
        "user_message": request.message,
        "messages": [],
        "intent": None,
        "tool_calls": [],
        "response": "",
        "new_interaction": None,
        "updated_interaction": None,
        "deleted_interaction_id": None,
        "session_id": request.session_id,
        "error": None,
        "model": "gemma2-9b-it",
    }

    result = agent_graph.invoke(initial_state)

    return AgentResponse(
        message=result.get("response", ""),
        tool_calls=[
            ToolCallResult(**tc) for tc in result.get("tool_calls", [])
        ],
        new_interaction=InteractionResponse(**result["new_interaction"]) if result.get("new_interaction") else None,
        updated_interaction=InteractionResponse(**result["updated_interaction"]) if result.get("updated_interaction") else None,
    )


@router.get("/tools")
def list_tools():
    """List all available LangGraph agent tools."""
    return {
        "tools": [
            {
                "name": "log_interaction",
                "description": "Log a new HCP interaction from natural language. Uses LLM (gemma2-9b-it) for summarization, entity extraction (products, channel, type, sentiment), and key outcome/follow-up generation.",
            },
            {
                "name": "edit_interaction",
                "description": "Modify an existing interaction record. Parses edit instructions and applies changes to the matching interaction in the database.",
            },
            {
                "name": "get_hcp_profile",
                "description": "Retrieve an HCP's profile including specialty, organization, tier, location, and interaction statistics.",
            },
            {
                "name": "get_interaction_history",
                "description": "View past interactions, optionally filtered by HCP. Returns recent interactions with summaries and metadata.",
            },
            {
                "name": "schedule_followup",
                "description": "Schedule a follow-up meeting with an HCP. Creates a planned interaction record in the database.",
            },
            {
                "name": "analyze_sentiment",
                "description": "Analyze sentiment across interactions for an HCP or all HCPs. Uses LLM to evaluate interaction summaries and generate sentiment breakdown.",
            },
            {
                "name": "get_product_info",
                "description": "Look up product information from the knowledge base, including indication, mechanism of action, clinical trial data, and safety profile.",
            },
        ],
        "framework": "LangGraph",
        "llm": "gemma2-9b-it (Groq)",
        "graph_structure": "classify_intent -> execute_tool -> generate_response",
    }
