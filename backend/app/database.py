"""
Database configuration and initialization.
Uses SQLite by default; switch DATABASE_URL to PostgreSQL/MySQL for production.
"""

import sqlite3
import os
import json

DB_PATH = os.getenv("DATABASE_PATH", "medcrm.db")


def get_connection():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn


def init_db():
    conn = get_connection()
    cursor = conn.cursor()

    cursor.execute("""
        CREATE TABLE IF NOT EXISTS hcps (
            id TEXT PRIMARY KEY,
            name TEXT NOT NULL,
            specialty TEXT NOT NULL,
            organization TEXT NOT NULL,
            tier TEXT NOT NULL,
            city TEXT,
            state TEXT,
            email TEXT,
            phone TEXT,
            npi TEXT,
            last_interaction_date TEXT,
            total_interactions INTEGER DEFAULT 0,
            avatar_color TEXT DEFAULT 'from-blue-500 to-cyan-500'
        )
    """)

    cursor.execute("""
        CREATE TABLE IF NOT EXISTS interactions (
            id TEXT PRIMARY KEY,
            hcp_id TEXT NOT NULL,
            hcp_name TEXT NOT NULL,
            date TEXT NOT NULL,
            channel TEXT NOT NULL,
            type TEXT NOT NULL,
            status TEXT NOT NULL,
            priority TEXT NOT NULL,
            products TEXT NOT NULL,
            summary TEXT NOT NULL,
            key_outcomes TEXT NOT NULL,
            follow_up_actions TEXT NOT NULL,
            sentiment TEXT NOT NULL,
            duration_minutes INTEGER DEFAULT 30,
            location TEXT,
            rep_name TEXT DEFAULT 'Alex Morgan',
            created_at TEXT NOT NULL,
            updated_at TEXT NOT NULL,
            FOREIGN KEY (hcp_id) REFERENCES hcps(id)
        )
    """)

    conn.commit()

    # Seed data if empty
    cursor.execute("SELECT COUNT(*) as c FROM hcps")
    if cursor.fetchone()["c"] == 0:
        _seed_data(cursor)
        conn.commit()

    conn.close()


def _seed_data(cursor):
    seed_path = os.path.join(os.path.dirname(__file__), "..", "seed", "seed_data.json")
    if os.path.exists(seed_path):
        with open(seed_path, "r") as f:
            data = json.load(f)

        for hcp in data.get("hcps", []):
            cursor.execute(
                """INSERT INTO hcps (id, name, specialty, organization, tier, city, state,
                   email, phone, npi, last_interaction_date, total_interactions, avatar_color)
                   VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)""",
                (
                    hcp["id"], hcp["name"], hcp["specialty"], hcp["organization"],
                    hcp["tier"], hcp["city"], hcp["state"], hcp["email"],
                    hcp["phone"], hcp["npi"], hcp.get("lastInteractionDate"),
                    hcp.get("totalInteractions", 0), hcp.get("avatarColor", "from-blue-500 to-cyan-500"),
                ),
            )

        for inter in data.get("interactions", []):
            cursor.execute(
                """INSERT INTO interactions (id, hcp_id, hcp_name, date, channel, type,
                   status, priority, products, summary, key_outcomes, follow_up_actions,
                   sentiment, duration_minutes, location, rep_name, created_at, updated_at)
                   VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)""",
                (
                    inter["id"], inter["hcpId"], inter["hcpName"], inter["date"],
                    inter["channel"], inter["type"], inter["status"], inter["priority"],
                    json.dumps(inter["products"]), inter["summary"],
                    json.dumps(inter["keyOutcomes"]),
                    json.dumps(inter["followUpActions"]),
                    inter["sentiment"], inter["durationMinutes"],
                    inter["location"], inter["repName"],
                    inter["createdAt"], inter["updatedAt"],
                ),
            )
