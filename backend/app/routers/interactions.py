"""
Interaction CRUD routes.
"""

import json
import uuid as uuid_mod
from datetime import datetime, timezone
from fastapi import APIRouter, HTTPException, Query
from typing import List, Optional
from app.database import get_connection
from app.models.schemas import InteractionCreate, InteractionUpdate, InteractionResponse

router = APIRouter()


def _row_to_response(row) -> dict:
    d = dict(row)
    d["products"] = json.loads(d["products"]) if d["products"] else []
    d["key_outcomes"] = json.loads(d["key_outcomes"]) if d["key_outcomes"] else []
    d["follow_up_actions"] = json.loads(d["follow_up_actions"]) if d["follow_up_actions"] else []
    return d


@router.get("/", response_model=List[InteractionResponse])
def list_interactions(
    hcp_id: Optional[str] = Query(None),
    status: Optional[str] = Query(None),
    limit: int = Query(100),
):
    conn = get_connection()
    query = "SELECT * FROM interactions WHERE 1=1"
    params = []

    if hcp_id:
        query += " AND hcp_id = ?"
        params.append(hcp_id)
    if status:
        query += " AND status = ?"
        params.append(status)

    query += " ORDER BY date DESC LIMIT ?"
    params.append(limit)

    rows = conn.execute(query, params).fetchall()
    conn.close()
    return [_row_to_response(r) for r in rows]


@router.get("/{interaction_id}", response_model=InteractionResponse)
def get_interaction(interaction_id: str):
    conn = get_connection()
    row = conn.execute("SELECT * FROM interactions WHERE id = ?", (interaction_id,)).fetchone()
    conn.close()
    if not row:
        raise HTTPException(status_code=404, detail="Interaction not found")
    return _row_to_response(row)


@router.post("/", response_model=InteractionResponse)
def create_interaction(interaction: InteractionCreate):
    conn = get_connection()

    hcp = conn.execute("SELECT * FROM hcps WHERE id = ?", (interaction.hcp_id,)).fetchone()
    if not hcp:
        conn.close()
        raise HTTPException(status_code=404, detail="HCP not found")

    interaction_id = interaction.id or f"int-{uuid_mod.uuid4().hex[:8]}"
    now = datetime.now(timezone.utc).isoformat()

    conn.execute(
        """INSERT INTO interactions (id, hcp_id, hcp_name, date, channel, type, status,
           priority, products, summary, key_outcomes, follow_up_actions, sentiment,
           duration_minutes, location, rep_name, created_at, updated_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)""",
        (
            interaction_id, interaction.hcp_id, dict(hcp)["name"],
            interaction.date, interaction.channel, interaction.type,
            interaction.status, interaction.priority,
            json.dumps([p.model_dump() for p in interaction.products]),
            interaction.summary,
            json.dumps(interaction.key_outcomes),
            json.dumps(interaction.follow_up_actions),
            interaction.sentiment, interaction.duration_minutes,
            interaction.location, "Alex Morgan", now, now,
        ),
    )

    conn.execute(
        "UPDATE hcps SET total_interactions = total_interactions + 1, last_interaction_date = ? WHERE id = ?",
        (interaction.date, interaction.hcp_id),
    )
    conn.commit()

    row = conn.execute("SELECT * FROM interactions WHERE id = ?", (interaction_id,)).fetchone()
    conn.close()
    return _row_to_response(row)


@router.put("/{interaction_id}", response_model=InteractionResponse)
def update_interaction(interaction_id: str, updates: InteractionUpdate):
    conn = get_connection()
    existing = conn.execute("SELECT * FROM interactions WHERE id = ?", (interaction_id,)).fetchone()
    if not existing:
        conn.close()
        raise HTTPException(status_code=404, detail="Interaction not found")

    now = datetime.now(timezone.utc).isoformat()
    update_data = updates.model_dump(exclude_unset=True)

    allowed = {
        "summary", "sentiment", "priority", "status", "channel", "type",
        "key_outcomes", "follow_up_actions",
    }
    set_clauses = []
    params = []
    for key, value in update_data.items():
        if key in allowed:
            if key in ("key_outcomes", "follow_up_actions"):
                value = json.dumps(value)
            set_clauses.append(f"{key} = ?")
            params.append(value)

    set_clauses.append("updated_at = ?")
    params.append(now)
    params.append(interaction_id)

    conn.execute(f"UPDATE interactions SET {', '.join(set_clauses)} WHERE id = ?", params)
    conn.commit()

    row = conn.execute("SELECT * FROM interactions WHERE id = ?", (interaction_id,)).fetchone()
    conn.close()
    return _row_to_response(row)


@router.delete("/{interaction_id}")
def delete_interaction(interaction_id: str):
    conn = get_connection()
    conn.execute("DELETE FROM interactions WHERE id = ?", (interaction_id,))
    conn.commit()
    conn.close()
    return {"status": "deleted", "id": interaction_id}
