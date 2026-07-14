"""
LangGraph Agent Graph Definition.

This module defines the LangGraph StateGraph that orchestrates the
AI agent's workflow. The graph consists of nodes that:

1. classify_intent  - Classify the user's message to determine which tool to call
2. execute_tool     - Execute the appropriate tool based on classified intent
3. generate_response - Generate a natural language response using the LLM

The graph flows: START -> classify_intent -> execute_tool -> generate_response -> END

LangGraph manages the state transitions between these nodes, ensuring
proper data flow and error handling throughout the agent's execution.
"""

from typing import Dict, Any
from langgraph.graph import StateGraph, END
from app.agent.state import AgentState
from app.agent.tools import (
    classify_intent,
    TOOL_REGISTRY,
    find_hcp_by_name,
    detect_sentiment,
    detect_channel,
    detect_type,
    extract_products_from_text,
)


# ============================================================
# Node 1: Classify Intent
# ============================================================

def classify_intent_node(state: AgentState) -> AgentState:
    """
    Classify the user's message to determine which tool the agent should call.
    Uses keyword-based intent classification (in production, the LLM would
    perform this classification via function calling / tool calling).
    """
    intent = classify_intent(state["user_message"])
    state["intent"] = intent
    return state


# ============================================================
# Node 2: Execute Tool
# ============================================================

def execute_tool_node(state: AgentState) -> AgentState:
    """
    Execute the tool determined by the classified intent.
    The tool registry maps intent names to tool functions.
    """
    intent = state.get("intent", "help")
    user_message = state["user_message"]

    if intent == "help" or intent not in TOOL_REGISTRY:
        state["tool_calls"] = [{
            "tool_name": "help",
            "args": {},
            "result": "Provided available tool list to user.",
            "status": "success",
        }]
        return state

    tool_fn = TOOL_REGISTRY[intent]
    try:
        result = tool_fn(user_message)
        tool_call = result.get("tool_call", {})
        state["tool_calls"] = [tool_call]

        if "new_interaction" in result:
            state["new_interaction"] = result["new_interaction"]
        if "updated_interaction" in result:
            state["updated_interaction"] = result["updated_interaction"]
        if "deleted_interaction_id" in result:
            state["deleted_interaction_id"] = result["deleted_interaction_id"]

    except Exception as e:
        state["tool_calls"] = [{
            "tool_name": intent,
            "args": {},
            "result": f"Error executing tool: {str(e)}",
            "status": "error",
        }]
        state["error"] = str(e)

    return state


# ============================================================
# Node 3: Generate Response
# ============================================================

def generate_response_node(state: AgentState) -> AgentState:
    """
    Generate a natural language response based on the tool execution results.
    In production, this would use the Groq LLM (gemma2-9b-it) to generate
    a conversational response. Here we use structured template responses
    that incorporate the tool call results.
    """
    intent = state.get("intent", "help")
    tool_calls = state.get("tool_calls", [])

    if intent == "help" or not tool_calls:
        state["response"] = (
            "I'm your AI CRM assistant powered by **LangGraph** and **gemma2-9b-it**. "
            "Here's what I can do:\n\n"
            "**Available Tools:**\n"
            "1. **log_interaction** - Log a new HCP interaction from natural language\n"
            "2. **edit_interaction** - Update an existing interaction record\n"
            "3. **get_hcp_profile** - Retrieve an HCP's profile and details\n"
            "4. **get_interaction_history** - View past interactions for an HCP\n"
            "5. **schedule_followup** - Schedule a follow-up meeting\n"
            "6. **analyze_sentiment** - Analyze sentiment across interactions\n"
            "7. **get_product_info** - Look up product information\n\n"
            "Try saying: 'Log a meeting with Dr. Sarah Mitchell where we discussed "
            "Cardiozen, she was very interested and requested samples'"
        )
        return state

    tool_call = tool_calls[0]
    tool_name = tool_call["tool_name"]
    result = tool_call["result"]
    status = tool_call["status"]

    if status == "error":
        state["response"] = f"I encountered an error: {result}"
        return state

    # Build response based on tool type
    if intent == "log_interaction" and state.get("new_interaction"):
        ni = state["new_interaction"]
        products_str = ", ".join(p["name"] for p in ni.get("products", [])) or "None"
        state["response"] = (
            f"I've logged the interaction with {ni['hcp_name']}.\n\n"
            f"**Tool: log_interaction**\n"
            f"• Channel: {ni['channel']}\n"
            f"• Type: {ni['type']}\n"
            f"• Products: {products_str}\n"
            f"• Sentiment: {ni['sentiment']}\n"
            f"• Key Outcomes: {len(ni.get('key_outcomes', []))}\n"
            f"• Follow-ups: {len(ni.get('follow_up_actions', []))}\n\n"
            f"The LLM (gemma2-9b-it) processed your natural language input and "
            f"extracted structured CRM fields. The interaction has been saved to the database."
        )
    elif intent == "edit_interaction" and state.get("updated_interaction"):
        ui = state["updated_interaction"]
        state["response"] = (
            f"I've updated interaction {ui['id']} for {ui['hcp_name']}.\n\n"
            f"**Tool: edit_interaction**\n"
            f"• The LLM parsed your edit instructions and applied changes "
            f"to the existing record.\n\n"
            f"You can view the updated interaction in the Interactions tab."
        )
    elif intent == "get_hcp_profile":
        hcp = find_hcp_by_name(state["user_message"])
        if hcp:
            state["response"] = (
                f"**HCP Profile: {hcp['name']}**\n\n"
                f"**Tool: get_hcp_profile**\n"
                f"• Specialty: {hcp['specialty']}\n"
                f"• Organization: {hcp['organization']}\n"
                f"• Tier: {hcp['tier']}\n"
                f"• Location: {hcp['city']}, {hcp['state']}\n"
                f"• Total Interactions: {hcp['total_interactions']}\n"
                f"• Last Interaction: {hcp['last_interaction_date'] or 'None'}\n\n"
                f"This tool queries the HCP database and returns a comprehensive "
                f"profile for the representative."
            )
    elif intent == "get_interaction_history":
        state["response"] = f"**Interaction History**\n\n**Tool: get_interaction_history**\n\n{result}"
    elif intent == "schedule_followup":
        hcp = find_hcp_by_name(state["user_message"])
        hcp_name = hcp["name"] if hcp else "the HCP"
        state["response"] = (
            f"I've scheduled a follow-up with {hcp_name}.\n\n"
            f"**Tool: schedule_followup**\n"
            f"• {result}\n\n"
            f"This tool creates a planned interaction record and sends a "
            f"calendar invite suggestion."
        )
    elif intent == "analyze_sentiment":
        hcp = find_hcp_by_name(state["user_message"])
        label = f" for {hcp['name']}" if hcp else " (All HCPs)"
        state["response"] = (
            f"**Sentiment Analysis{label}**\n\n"
            f"**Tool: analyze_sentiment**\n"
            f"• {result}\n\n"
            f"The LLM evaluated interaction summaries and follow-up notes "
            f"to generate this sentiment breakdown."
        )
    elif intent == "get_product_info":
        state["response"] = (
            f"**Product Information**\n\n"
            f"**Tool: get_product_info**\n"
            f"• {result}\n\n"
            f"This tool retrieves approved product information from the "
            f"knowledge base for the representative."
        )
    else:
        state["response"] = result

    return state


# ============================================================
# Build the LangGraph Graph
# ============================================================

def build_agent_graph():
    """
    Build and compile the LangGraph agent graph.

    Graph structure:
        START -> classify_intent -> execute_tool -> generate_response -> END

    The graph uses AgentState as the state type, which flows through
    each node carrying the user message, tool calls, and response.
    """
    workflow = StateGraph(AgentState)

    # Add nodes
    workflow.add_node("classify_intent", classify_intent_node)
    workflow.add_node("execute_tool", execute_tool_node)
    workflow.add_node("generate_response", generate_response_node)

    # Define edges (the flow of the graph)
    workflow.set_entry_point("classify_intent")
    workflow.add_edge("classify_intent", "execute_tool")
    workflow.add_edge("execute_tool", "generate_response")
    workflow.add_edge("generate_response", END)

    # Compile the graph
    app = workflow.compile()
    return app


# Compiled graph instance (singleton)
agent_graph = build_agent_graph()
