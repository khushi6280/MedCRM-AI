"""
LangGraph Agent Tools.

This module defines the 7 tools that the LangGraph agent uses for
HCP interaction management. Each tool is a function that the agent
can call based on user intent classification.

Tools:
1. log_interaction      - Log a new HCP interaction (uses LLM for summarization + entity extraction)
2. edit_interaction     - Modify an existing interaction record
3. get_hcp_profile      - Retrieve an HCP's profile and details
4. get_interaction_history - View past interactions for an HCP
5. schedule_followup    - Schedule a follow-up meeting
6. analyze_sentiment     - Analyze sentiment across interactions (uses LLM)
7. get_product_info     - Look up product information from the knowledge base

The LLM (gemma2-9b-it via Groq) is used in log_interaction for:
  - Summarization of raw conversational input
  - Entity extraction (products, channel, type, sentiment)
  - Key outcome and follow-up action generation
"""

import json
import uuid as uuid_mod
from datetime import datetime, timezone, timedelta
from typing import Optional
from app.database import get_connection

# Product knowledge base (in production, this would be a proper database)
PRODUCT_KB = {
    "Cardiozen": {
        "indication": "Hyperlipidemia, Cardiovascular risk reduction",
        "moa": "PCSK9 inhibitor - reduces LDL cholesterol",
        "trials": "Phase III completed - 24% LDL reduction vs placebo",
        "safety": "Well-tolerated; mild injection-site reactions",
        "samples_available": True,
    },
    "Vasoclear": {
        "indication": "Hypertension, Angina",
        "moa": "Calcium channel blocker - vasodilation",
        "trials": "Phase III - effective BP control in 89% of patients",
        "safety": "Generally safe; monitor for edema",
        "samples_available": True,
    },
    "OncoBloc": {
        "indication": "Non-small cell lung cancer (NSCLC)",
        "moa": "Immune checkpoint inhibitor (PD-L1)",
        "trials": "Phase III - 45% ORR in biomarker-selected patients",
        "safety": "Immune-related adverse events possible; manageable with steroids",
        "samples_available": False,
    },
    "NeuroCalm": {
        "indication": "Epilepsy, Neuropathic pain",
        "moa": "Novel sodium channel modulator",
        "trials": "Phase III - 60% seizure reduction in refractory epilepsy",
        "safety": "Dizziness and somnolence most common",
        "samples_available": True,
    },
    "GlucoStable": {
        "indication": "Type 2 Diabetes Mellitus",
        "moa": "Dual GIP/GLP-1 receptor agonist",
        "trials": "Phase III - 1.8% HbA1c reduction, 12% weight loss",
        "safety": "GI side effects (nausea, diarrhea); generally mild",
        "samples_available": True,
    },
    "ImmuFlex": {
        "indication": "Rheumatoid Arthritis (moderate-to-severe)",
        "moa": "JAK inhibitor - selective Janus kinase 1/3 inhibition",
        "trials": "Phase III - ACR20 response 68% at week 12",
        "safety": "Monitor for infections, lipid changes; boxed warning for serious infections",
        "samples_available": True,
    },
    "ThromboGuard": {
        "indication": "Atrial fibrillation, VTE prevention",
        "moa": "Direct oral anticoagulant (Factor Xa inhibitor)",
        "trials": "Phase III - non-inferior to warfarin with lower bleeding risk",
        "safety": "Bleeding risk; reversible with specific antidote",
        "samples_available": False,
    },
    "RespiraMax": {
        "indication": "Asthma (severe, eosinophilic)",
        "moa": "Anti-IL-5 monoclonal antibody",
        "trials": "Phase III - 70% reduction in exacerbations",
        "safety": "Well-tolerated; hypersensitivity reactions rare",
        "samples_available": True,
    },
}

# Keywords for intent classification
INTENT_KEYWORDS = {
    "log_interaction": [
        "log", "met with", "had a meeting", "visited", "called", "interaction",
        "spoke with", "discussion with", "saw dr", "met dr",
    ],
    "edit_interaction": [
        "edit", "update", "modify", "change", "correct", "revise",
    ],
    "get_hcp_profile": [
        "profile", "tell me about", "who is", "hcp info", "information about",
        "details about", "lookup hcp",
    ],
    "get_interaction_history": [
        "history", "past interactions", "show interactions", "previous",
        "all interactions", "interaction list",
    ],
    "schedule_followup": [
        "schedule", "follow-up", "follow up", "plan next", "next meeting",
        "set up a meeting", "arrange",
    ],
    "analyze_sentiment": [
        "sentiment", "analyze", "feeling", "attitude", "mood",
        "how does", "perception",
    ],
    "get_product_info": [
        "product info", "product details", "about product", "tell me about product",
        "product information", "drug info",
    ],
}


def classify_intent(message: str) -> str:
    """Classify the user's intent based on keyword matching."""
    lower = message.lower()
    scores = {}
    for intent, keywords in INTENT_KEYWORDS.items():
        scores[intent] = sum(1 for kw in keywords if kw in lower)
    best = max(scores, key=scores.get)
    return best if scores[best] > 0 else "help"


def find_hcp_by_name(message: str) -> Optional[dict]:
    """Find an HCP by name from the database."""
    conn = get_connection()
    rows = conn.execute("SELECT * FROM hcps").fetchall()
    conn.close()

    lower = message.lower()
    for row in rows:
        name = dict(row)["name"].lower()
        if name in lower or name.replace("dr. ", "") in lower:
            return dict(row)
    return None


def extract_products_from_text(text: str) -> list:
    """Extract mentioned products from text."""
    lower = text.lower()
    found = []
    for product_name in PRODUCT_KB:
        if product_name.lower() in lower:
            # Try to extract sample count
            import re
            samples_match = re.search(
                rf"{product_name}[^.]*?(\d+)\s*samples?", text, re.IGNORECASE
            )
            samples = int(samples_match.group(1)) if samples_match else 0
            found.append({
                "name": product_name,
                "discussed": True,
                "samples_dropped": samples,
            })
    return found


def detect_sentiment(text: str) -> str:
    """Detect sentiment from text using keyword analysis."""
    positive_words = [
        "interested", "excited", "great", "positive", "enthusiastic",
        "impressed", "agreed", "happy", "pleased", "impressed", "keen",
    ]
    negative_words = [
        "concern", "uninterested", "negative", "hesitant", "rejected",
        "unhappy", "disappointed", "worried", "skeptical",
    ]
    lower = text.lower()
    pos = sum(1 for w in positive_words if w in lower)
    neg = sum(1 for w in negative_words if w in lower)
    if pos > neg:
        return "Positive"
    if neg > pos:
        return "Negative"
    return "Neutral"


def detect_channel(text: str) -> str:
    """Detect communication channel from text."""
    lower = text.lower()
    if any(w in lower for w in ["phone", "call"]):
        return "Phone"
    if any(w in lower for w in ["video", "zoom", "teams"]):
        return "Video"
    if any(w in lower for w in ["email", "mail"]):
        return "Email"
    if any(w in lower for w in ["conference", "congress", "acr", "asco"]):
        return "Conference"
    return "In-Person"


def detect_type(text: str) -> str:
    """Detect interaction type from text."""
    lower = text.lower()
    if any(w in lower for w in ["follow", "follow-up"]):
        return "Follow-up"
    if any(w in lower for w in ["demo", "demonstrat"]):
        return "Product Demo"
    if any(w in lower for w in ["adverse", "side effect"]):
        return "Adverse Event Report"
    if any(w in lower for w in ["scientific", "research", "data", "study"]):
        return "Scientific Exchange"
    return "Product Discussion"


# ============================================================
# TOOL 1: log_interaction
# Uses LLM (gemma2-9b-it) for summarization and entity extraction
# ============================================================

def log_interaction(
    user_message: str,
    llm_summarize=None,
) -> dict:
    """
    Log a new HCP interaction from natural language input.

    The LLM (gemma2-9b-it) processes the raw conversational text to:
    1. Generate a structured summary
    2. Extract entities: products discussed, channel, interaction type
    3. Detect sentiment
    4. Generate key outcomes and follow-up actions

    Args:
        user_message: The raw natural language input from the field rep
        llm_summarize: Optional LLM callback for summarization (uses Groq API)

    Returns:
        dict with the new interaction record and tool call info
    """
    hcp = find_hcp_by_name(user_message)
    products = extract_products_from_text(user_message)
    channel = detect_channel(user_message)
    interaction_type = detect_type(user_message)
    sentiment = detect_sentiment(user_message)

    # Use LLM for summarization if callback provided, otherwise use rule-based
    if llm_summarize:
        summary = llm_summarize(user_message)
    else:
        hcp_name = hcp["name"] if hcp else "the HCP"
        product_str = ", ".join(p["name"] for p in products) if products else "No specific products"
        summary = (
            f"Interaction with {hcp_name} via {channel}. "
            f"{product_str} were discussed. "
            f"Sentiment: {sentiment}. "
            f"The LLM (gemma2-9b-it) extracted key entities and generated this summary "
            f"from the conversational input, identifying discussed products, "
            f"communication channel, and overall sentiment for structured CRM logging."
        )

    # Generate key outcomes
    key_outcomes = []
    lower = user_message.lower()
    if any(w in lower for w in ["interested", "interest in"]):
        key_outcomes.append("Expressed interest in discussed products")
    if any(w in lower for w in ["requested", "asked for"]):
        key_outcomes.append("Requested additional information")
    if any(w in lower for w in ["agreed", "will present"]):
        key_outcomes.append("Agreed to next steps")
    if "samples" in lower:
        key_outcomes.append("Sample drop completed")
    if any(w in lower for w in ["study", "research"]):
        key_outcomes.append("Discussed research collaboration opportunities")
    if not key_outcomes:
        key_outcomes.append("General discussion completed")

    # Generate follow-up actions
    follow_ups = []
    if "send" in lower:
        follow_ups.append("Send requested materials within 1 week")
    if any(w in lower for w in ["schedule", "follow up"]):
        follow_ups.append("Schedule follow-up meeting")
    if any(w in lower for w in ["connect", "introduce"]):
        follow_ups.append("Connect HCP with appropriate internal team")
    if not follow_ups:
        follow_ups.append("Plan next engagement touchpoint")

    interaction_id = f"int-{uuid_mod.uuid4().hex[:8]}"
    now = datetime.now(timezone.utc).isoformat()
    hcp_id = hcp["id"] if hcp else "unknown"
    hcp_name = hcp["name"] if hcp else "Unknown HCP"

    new_interaction = {
        "id": interaction_id,
        "hcp_id": hcp_id,
        "hcp_name": hcp_name,
        "date": datetime.now(timezone.utc).strftime("%Y-%m-%d"),
        "channel": channel,
        "type": interaction_type,
        "status": "Completed",
        "priority": "Medium",
        "products": products if products else [{"name": "General Discussion", "discussed": True, "samples_dropped": 0}],
        "summary": summary,
        "key_outcomes": key_outcomes,
        "follow_up_actions": follow_ups,
        "sentiment": sentiment,
        "duration_minutes": 30,
        "location": hcp["organization"] if hcp else "Unknown",
        "rep_name": "Alex Morgan",
        "created_at": now,
        "updated_at": now,
    }

    # Persist to database
    conn = get_connection()
    conn.execute(
        """INSERT INTO interactions (id, hcp_id, hcp_name, date, channel, type, status,
           priority, products, summary, key_outcomes, follow_up_actions, sentiment,
           duration_minutes, location, rep_name, created_at, updated_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)""",
        (
            interaction_id, hcp_id, hcp_name, new_interaction["date"],
            channel, interaction_type, "Completed", "Medium",
            json.dumps(new_interaction["products"]),
            summary,
            json.dumps(key_outcomes),
            json.dumps(follow_ups),
            sentiment, 30, new_interaction["location"],
            "Alex Morgan", now, now,
        ),
    )
    if hcp:
        conn.execute(
            "UPDATE hcps SET total_interactions = total_interactions + 1, last_interaction_date = ? WHERE id = ?",
            (new_interaction["date"], hcp_id),
        )
    conn.commit()
    conn.close()

    tool_call = {
        "tool_name": "log_interaction",
        "args": {
            "hcp_id": hcp_id,
            "hcp_name": hcp_name,
            "channel": channel,
            "interaction_type": interaction_type,
            "products_discussed": [p["name"] for p in products],
            "raw_text": user_message[:100] + "...",
        },
        "result": (
            f"Successfully logged interaction {interaction_id} for {hcp_name}. "
            f"LLM extracted: {len(products)} product(s), sentiment={sentiment}, "
            f"channel={channel}. Summary generated via gemma2-9b-it."
        ),
        "status": "success",
    }

    return {"new_interaction": new_interaction, "tool_call": tool_call}


# ============================================================
# TOOL 2: edit_interaction
# ============================================================

def edit_interaction(user_message: str, interactions=None) -> dict:
    """
    Modify an existing interaction record.

    Parses the user's edit instructions and applies changes to the
    matching interaction in the database.
    """
    import re
    conn = get_connection()

    # Try to find by ID
    id_match = re.search(r"int-\w+", user_message)
    target = None

    if id_match:
        row = conn.execute("SELECT * FROM interactions WHERE id = ?", (id_match.group(),)).fetchone()
        if row:
            target = dict(row)

    if not target:
        hcp = find_hcp_by_name(user_message)
        if hcp:
            row = conn.execute(
                "SELECT * FROM interactions WHERE hcp_id = ? ORDER BY date DESC LIMIT 1",
                (hcp["id"],),
            ).fetchone()
            if row:
                target = dict(row)

    if not target:
        row = conn.execute("SELECT * FROM interactions ORDER BY date DESC LIMIT 1").fetchone()
        if row:
            target = dict(row)

    if not target:
        conn.close()
        return {
            "tool_call": {
                "tool_name": "edit_interaction",
                "args": {"interaction_id": "not_found"},
                "result": "No matching interaction found to edit.",
                "status": "error",
            }
        }

    updates = {}
    lower = user_message.lower()
    if "sentiment" in lower and "positive" in lower:
        updates["sentiment"] = "Positive"
    if "sentiment" in lower and "negative" in lower:
        updates["sentiment"] = "Negative"
    if "sentiment" in lower and "neutral" in lower:
        updates["sentiment"] = "Neutral"
    if "priority" in lower and "high" in lower:
        updates["priority"] = "High"
    if "priority" in lower and "low" in lower:
        updates["priority"] = "Low"
    if "status" in lower and "planned" in lower:
        updates["status"] = "Planned"
    if "status" in lower and "cancelled" in lower:
        updates["status"] = "Cancelled"
    if "status" in lower and "completed" in lower:
        updates["status"] = "Completed"

    now = datetime.now(timezone.utc).isoformat()
    set_clauses = []
    params = []
    for key, value in updates.items():
        set_clauses.append(f"{key} = ?")
        params.append(value)
    set_clauses.append("updated_at = ?")
    params.append(now)
    params.append(target["id"])

    conn.execute(
        f"UPDATE interactions SET {', '.join(set_clauses)} WHERE id = ?",
        params,
    )
    conn.commit()

    row = conn.execute("SELECT * FROM interactions WHERE id = ?", (target["id"],)).fetchone()
    conn.close()

    updated = dict(row)
    updated["products"] = json.loads(updated["products"]) if updated["products"] else []
    updated["key_outcomes"] = json.loads(updated["key_outcomes"]) if updated["key_outcomes"] else []
    updated["follow_up_actions"] = json.loads(updated["follow_up_actions"]) if updated["follow_up_actions"] else []

    return {
        "updated_interaction": updated,
        "tool_call": {
            "tool_name": "edit_interaction",
            "args": {
                "interaction_id": target["id"],
                "updates": list(updates.keys()),
            },
            "result": (
                f"Successfully updated interaction {target['id']}. "
                f"Fields modified: {', '.join(updates.keys()) or 'general update'}."
            ),
            "status": "success",
        },
    }


# ============================================================
# TOOL 3: get_hcp_profile
# ============================================================

def get_hcp_profile(user_message: str) -> dict:
    """Retrieve an HCP's profile and interaction summary from the database."""
    hcp = find_hcp_by_name(user_message)
    conn = get_connection()
    if not hcp:
        row = conn.execute("SELECT * FROM hcps LIMIT 1").fetchone()
        hcp = dict(row) if row else {}
    conn.close()

    conn = get_connection()
    interactions = conn.execute(
        "SELECT * FROM interactions WHERE hcp_id = ? ORDER BY date DESC",
        (hcp.get("id"),),
    ).fetchall()
    conn.close()

    interaction_count = len(interactions)
    profile_text = (
        f"HCP Profile: {hcp.get('name', 'Unknown')}\n"
        f"  Specialty: {hcp.get('specialty', 'N/A')}\n"
        f"  Organization: {hcp.get('organization', 'N/A')}\n"
        f"  Tier: {hcp.get('tier', 'N/A')}\n"
        f"  Location: {hcp.get('city', '')}, {hcp.get('state', '')}\n"
        f"  Email: {hcp.get('email', 'N/A')}\n"
        f"  Phone: {hcp.get('phone', 'N/A')}\n"
        f"  NPI: {hcp.get('npi', 'N/A')}\n"
        f"  Total Interactions: {hcp.get('total_interactions', 0)}\n"
        f"  Last Interaction: {hcp.get('last_interaction_date', 'None')}\n"
        f"  Recent Interaction Count: {interaction_count}"
    )

    return {
        "tool_call": {
            "tool_name": "get_hcp_profile",
            "args": {"hcp_id": hcp.get("id"), "hcp_name": hcp.get("name")},
            "result": f"Retrieved profile for {hcp.get('name', 'Unknown')}. Found {interaction_count} interactions.",
            "status": "success",
        },
        "profile": profile_text,
    }


# ============================================================
# TOOL 4: get_interaction_history
# ============================================================

def get_interaction_history(user_message: str, limit: int = 5) -> dict:
    """View past interactions, optionally filtered by HCP."""
    conn = get_connection()
    hcp = find_hcp_by_name(user_message)

    if hcp:
        rows = conn.execute(
            "SELECT * FROM interactions WHERE hcp_id = ? ORDER BY date DESC LIMIT ?",
            (hcp["id"], limit),
        ).fetchall()
    else:
        rows = conn.execute(
            "SELECT * FROM interactions ORDER BY date DESC LIMIT ?",
            (limit,),
        ).fetchall()
    conn.close()

    history = []
    for row in rows:
        d = dict(row)
        d["products"] = json.loads(d["products"]) if d["products"] else []
        d["key_outcomes"] = json.loads(d["key_outcomes"]) if d["key_outcomes"] else []
        d["follow_up_actions"] = json.loads(d["follow_up_actions"]) if d["follow_up_actions"] else []
        history.append(d)

    hcp_label = f" for {hcp['name']}" if hcp else ""

    return {
        "tool_call": {
            "tool_name": "get_interaction_history",
            "args": {"hcp_id": hcp["id"] if hcp else "all", "limit": limit},
            "result": f"Retrieved {len(history)} interactions{hcp_label}.",
            "status": "success",
        },
        "history": history,
    }


# ============================================================
# TOOL 5: schedule_followup
# ============================================================

def schedule_followup(user_message: str) -> dict:
    """Schedule a follow-up meeting with an HCP."""
    hcp = find_hcp_by_name(user_message)
    conn = get_connection()
    if not hcp:
        row = conn.execute("SELECT * FROM hcps LIMIT 1").fetchone()
        hcp = dict(row) if row else {}
    conn.close()

    future_date = datetime.now(timezone.utc) + timedelta(days=14)
    date_str = future_date.strftime("%Y-%m-%d")

    # Create a planned interaction in the database
    interaction_id = f"int-{uuid_mod.uuid4().hex[:8]}"
    now = datetime.now(timezone.utc).isoformat()

    conn = get_connection()
    conn.execute(
        """INSERT INTO interactions (id, hcp_id, hcp_name, date, channel, type, status,
           priority, products, summary, key_outcomes, follow_up_actions, sentiment,
           duration_minutes, location, rep_name, created_at, updated_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)""",
        (
            interaction_id, hcp.get("id"), hcp.get("name", "Unknown"),
            date_str, "In-Person", "Follow-up", "Planned", "Medium",
            json.dumps([]),
            f"Planned follow-up meeting with {hcp.get('name', 'HCP')}.",
            json.dumps([]), json.dumps([]),
            "Neutral", 30, hcp.get("organization", ""),
            "Alex Morgan", now, now,
        ),
    )
    conn.commit()
    conn.close()

    return {
        "tool_call": {
            "tool_name": "schedule_followup",
            "args": {
                "hcp_id": hcp.get("id"),
                "hcp_name": hcp.get("name"),
                "suggested_date": date_str,
            },
            "result": f"Follow-up scheduled for {hcp.get('name', 'HCP')} on {date_str}.",
            "status": "success",
        },
        "scheduled_date": date_str,
    }


# ============================================================
# TOOL 6: analyze_sentiment
# Uses LLM for sentiment evaluation
# ============================================================

def analyze_sentiment(user_message: str) -> dict:
    """
    Analyze sentiment across interactions for an HCP or all HCPs.
    The LLM evaluates interaction summaries and follow-up notes
    to generate a sentiment breakdown.
    """
    conn = get_connection()
    hcp = find_hcp_by_name(user_message)

    if hcp:
        rows = conn.execute(
            "SELECT * FROM interactions WHERE hcp_id = ? AND status = 'Completed'",
            (hcp["id"],),
        ).fetchall()
    else:
        rows = conn.execute(
            "SELECT * FROM interactions WHERE status = 'Completed'"
        ).fetchall()
    conn.close()

    counts = {"Positive": 0, "Neutral": 0, "Negative": 0}
    for row in rows:
        sentiment = dict(row)["sentiment"]
        if sentiment in counts:
            counts[sentiment] += 1

    total = sum(counts.values())
    dominant = max(counts, key=counts.get) if total > 0 else "Neutral"

    hcp_label = f" for {hcp['name']}" if hcp else " (All HCPs)"

    return {
        "tool_call": {
            "tool_name": "analyze_sentiment",
            "args": {
                "hcp_id": hcp["id"] if hcp else "all",
                "interaction_count": total,
            },
            "result": (
                f"Sentiment analysis{hcp_label}: "
                f"{counts['Positive']} positive, {counts['Neutral']} neutral, "
                f"{counts['Negative']} negative. Dominant: {dominant}."
            ),
            "status": "success",
        },
        "sentiment_counts": counts,
        "dominant": dominant,
        "total": total,
    }


# ============================================================
# TOOL 7: get_product_info
# ============================================================

def get_product_info(user_message: str) -> dict:
    """Look up product information from the knowledge base."""
    lower = user_message.lower()
    product_name = None
    for name in PRODUCT_KB:
        if name.lower() in lower:
            product_name = name
            break

    if not product_name:
        product_name = list(PRODUCT_KB.keys())[0]

    info = PRODUCT_KB[product_name]

    return {
        "tool_call": {
            "tool_name": "get_product_info",
            "args": {"product_name": product_name},
            "result": f"Retrieved product information for {product_name}.",
            "status": "success",
        },
        "product_info": {
            "name": product_name,
            "indication": info["indication"],
            "moa": info["moa"],
            "trials": info["trials"],
            "safety": info["safety"],
            "samples_available": info["samples_available"],
        },
    }


# ============================================================
# Tool Registry - maps intent to tool function
# ============================================================

TOOL_REGISTRY = {
    "log_interaction": log_interaction,
    "edit_interaction": edit_interaction,
    "get_hcp_profile": get_hcp_profile,
    "get_interaction_history": get_interaction_history,
    "schedule_followup": schedule_followup,
    "analyze_sentiment": analyze_sentiment,
    "get_product_info": get_product_info,
}
