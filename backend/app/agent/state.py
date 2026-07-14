"""
LangGraph Agent State Definition.

Defines the state that flows through the LangGraph agent graph.
This state is passed between nodes and tracks the conversation,
tool calls, and any data mutations.
"""

from typing import TypedDict, List, Optional, Any


class ToolCallInfo(TypedDict):
    tool_name: str
    args: dict
    result: str
    status: str  # "success" | "error" | "pending"


class AgentState(TypedDict):
    """State that flows through the LangGraph agent graph."""
    # The user's original message
    user_message: str
    # Conversation history (list of messages)
    messages: List[dict]
    # The LLM's classification of intent
    intent: Optional[str]
    # Tool calls made during this turn
    tool_calls: List[ToolCallInfo]
    # The final response message to the user
    response: str
    # Any new interaction created by a tool
    new_interaction: Optional[dict]
    # Any interaction updated by a tool
    updated_interaction: Optional[dict]
    # Any interaction ID deleted by a tool
    deleted_interaction_id: Optional[str]
    # Session ID for tracking conversations
    session_id: Optional[str]
    # Error flag
    error: Optional[str]
    # Metadata for the LLM model used
    model: str
