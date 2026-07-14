"""
Pydantic models for request/response validation.
"""

from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime


class InteractionProduct(BaseModel):
    name: str
    discussed: bool = True
    samples_dropped: int = 0


class HCPBase(BaseModel):
    name: str
    specialty: str
    organization: str
    tier: str = "Standard"
    city: Optional[str] = None
    state: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None
    npi: Optional[str] = None


class HCPCreate(HCPBase):
    id: Optional[str] = None


class HCPResponse(HCPBase):
    id: str
    last_interaction_date: Optional[str] = None
    total_interactions: int = 0
    avatar_color: str = "from-blue-500 to-cyan-500"

    class Config:
        from_attributes = True


class InteractionBase(BaseModel):
    hcp_id: str
    date: str
    channel: str
    type: str
    status: str = "Completed"
    priority: str = "Medium"
    products: List[InteractionProduct] = []
    summary: str
    key_outcomes: List[str] = []
    follow_up_actions: List[str] = []
    sentiment: str = "Neutral"
    duration_minutes: int = 30
    location: str = ""


class InteractionCreate(InteractionBase):
    id: Optional[str] = None


class InteractionUpdate(BaseModel):
    summary: Optional[str] = None
    sentiment: Optional[str] = None
    priority: Optional[str] = None
    status: Optional[str] = None
    channel: Optional[str] = None
    type: Optional[str] = None
    key_outcomes: Optional[List[str]] = None
    follow_up_actions: Optional[List[str]] = None


class InteractionResponse(InteractionBase):
    id: str
    hcp_name: str
    rep_name: str = "Alex Morgan"
    created_at: str
    updated_at: str


class AgentRequest(BaseModel):
    message: str = Field(..., description="User's natural language message to the AI agent")
    session_id: Optional[str] = None


class ToolCallResult(BaseModel):
    tool_name: str
    args: dict
    result: str
    status: str = "success"


class AgentResponse(BaseModel):
    message: str
    tool_calls: List[ToolCallResult] = []
    new_interaction: Optional[InteractionResponse] = None
    updated_interaction: Optional[InteractionResponse] = None
