"""
HCP (Healthcare Professional) CRUD routes.
"""

import uuid as uuid_mod
from fastapi import APIRouter, HTTPException, Query
from typing import List, Optional
from app.database import get_connection
from app.models.schemas import HCPCreate, HCPResponse

router = APIRouter()


@router.get("/", response_model=List[HCPResponse])
def list_hcps(
    search: Optional[str] = Query(None),
    specialty: Optional[str] = Query(None),
    tier: Optional[str] = Query(None),
):
    conn = get_connection()
    query = "SELECT * FROM hcps WHERE 1=1"
    params = []

    if search:
        query += " AND (name LIKE ? OR organization LIKE ? OR specialty LIKE ?)"
        params.extend([f"%{search}%", f"%{search}%", f"%{search}%"])
    if specialty:
        query += " AND specialty = ?"
        params.append(specialty)
    if tier:
        query += " AND tier = ?"
        params.append(tier)

    rows = conn.execute(query, params).fetchall()
    conn.close()
    return [dict(r) for r in rows]


@router.get("/{hcp_id}", response_model=HCPResponse)
def get_hcp(hcp_id: str):
    conn = get_connection()
    row = conn.execute("SELECT * FROM hcps WHERE id = ?", (hcp_id,)).fetchone()
    conn.close()
    if not row:
        raise HTTPException(status_code=404, detail="HCP not found")
    return dict(row)


@router.post("/", response_model=HCPResponse)
def create_hcp(hcp: HCPCreate):
    conn = get_connection()
    hcp_id = hcp.id or f"hcp-{uuid_mod.uuid4().hex[:8]}"
    conn.execute(
        """INSERT INTO hcps (id, name, specialty, organization, tier, city, state,
           email, phone, npi, total_interactions, avatar_color)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, 'from-blue-500 to-cyan-500')""",
        (hcp_id, hcp.name, hcp.specialty, hcp.organization, hcp.tier,
         hcp.city, hcp.state, hcp.email, hcp.phone, hcp.npi),
    )
    conn.commit()
    row = conn.execute("SELECT * FROM hcps WHERE id = ?", (hcp_id,)).fetchone()
    conn.close()
    return dict(row)


@router.put("/{hcp_id}", response_model=HCPResponse)
def update_hcp(hcp_id: str, updates: dict):
    conn = get_connection()
    existing = conn.execute("SELECT * FROM hcps WHERE id = ?", (hcp_id,)).fetchone()
    if not existing:
        conn.close()
        raise HTTPException(status_code=404, detail="HCP not found")

    allowed = {"name", "specialty", "organization", "tier", "city", "state", "email", "phone", "npi"}
    set_clauses = []
    params = []
    for key, value in updates.items():
        if key in allowed:
            set_clauses.append(f"{key} = ?")
            params.append(value)

    if set_clauses:
        params.append(hcp_id)
        conn.execute(f"UPDATE hcps SET {', '.join(set_clauses)} WHERE id = ?", params)
        conn.commit()

    row = conn.execute("SELECT * FROM hcps WHERE id = ?", (hcp_id,)).fetchone()
    conn.close()
    return dict(row)


@router.delete("/{hcp_id}")
def delete_hcp(hcp_id: str):
    conn = get_connection()
    conn.execute("DELETE FROM hcps WHERE id = ?", (hcp_id,))
    conn.commit()
    conn.close()
    return {"status": "deleted", "id": hcp_id}
