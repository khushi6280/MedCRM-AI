# MedCRM AI — HCP Module: Log Interaction Screen

An AI-first Customer Relationship Management (CRM) system designed for life sciences field representatives, focused on the Healthcare Professional (HCP) module. The centerpiece is the **Log Interaction Screen**, which offers users the flexibility to log interactions with HCPs via either a **structured form** or a **conversational AI chat interface** powered by **LangGraph** and **Groq's gemma2-9b-it** LLM.

## Tech Stack

| Layer | Technology |
|-------|-----------|
| **Frontend** | React + TypeScript + Vite |
| **State Management** | Redux Toolkit + React-Redux |
| **UI** | Tailwind CSS, Lucide React icons |
| **Font** | Google Inter |
| **Backend** | Python + FastAPI |
| **AI Agent Framework** | LangGraph (StateGraph) |
| **LLM** | Groq — `gemma2-9b-it` (primary), `llama-3.3-70b-versatile` (context) |
| **Database** | SQLite (default, for easy setup), PostgreSQL/MySQL compatible |

## Project Structure

```
.
├── src/                          # Frontend (React + Redux)
│   ├── App.tsx                   # Root app with routing & Redux Provider
│   ├── main.tsx                  # Entry point
│   ├── index.css                 # Tailwind + Inter font + design system
│   ├── types/                    # TypeScript type definitions
│   │   └── index.ts
│   ├── data/                     # Mock/seed data
│   │   └── mockData.ts
│   ├── store/                    # Redux store
│   │   ├── index.ts              # Store configuration
│   │   └── slices/
│   │       ├── hcpSlice.ts       # HCP state management
│   │       ├── interactionSlice.ts # Interaction CRUD
│   │       ├── chatSlice.ts      # Chat/agent state
│   │       └── uiSlice.ts        # UI state (sidebar, view mode, toasts)
│   ├── services/
│   │   ├── agentService.ts       # Frontend agent simulation (mirrors backend)
│   │   └── uuid.ts               # UUID generator
│   ├── components/
│   │   ├── Sidebar.tsx           # Navigation sidebar
│   │   ├── Header.tsx            # Top header bar
│   │   ├── Toast.tsx             # Toast notifications
│   │   └── LogInteraction/
│   │       ├── StructuredForm.tsx # Structured form for logging interactions
│   │       └── ChatInterface.tsx  # AI conversational chat interface
│   └── pages/
│       ├── Dashboard.tsx         # Dashboard with metrics & charts
│       ├── LogInteraction.tsx    # Log Interaction screen (form/chat toggle)
│       ├── HCPDirectory.tsx      # HCP directory with search & filters
│       └── InteractionHistory.tsx # Interaction history with edit/delete
│
└── backend/                      # Backend (Python + FastAPI + LangGraph)
    ├── requirements.txt
    ├── .env.example
    ├── seed/
    │   └── seed_data.json         # Seed HCP and interaction data
    └── app/
        ├── main.py                # FastAPI entry point
        ├── database.py            # SQLite DB init & seeding
        ├── models/
        │   └── schemas.py         # Pydantic models
        ├── routers/
        │   ├── hcps.py            # HCP CRUD endpoints
        │   ├── interactions.py    # Interaction CRUD endpoints
        │   └── agent.py           # LangGraph agent endpoint
        └── agent/
            ├── state.py           # LangGraph AgentState definition
            ├── tools.py           # 7 LangGraph agent tools
            └── graph.py           # LangGraph StateGraph definition
```

## LangGraph Agent Architecture

The AI agent is built using **LangGraph's StateGraph**, which orchestrates a three-node workflow:

```
START → classify_intent → execute_tool → generate_response → END
```

### Agent State

The `AgentState` (defined in `backend/app/agent/state.py`) flows through the graph carrying:
- `user_message` — the field rep's natural language input
- `intent` — classified intent (which tool to call)
- `tool_calls` — results of tool execution
- `response` — the final natural language response
- `new_interaction` / `updated_interaction` — any data mutations

### LangGraph Tools (7 total)

The agent has access to 7 tools for sales-related activities:

| # | Tool | Description |
|---|------|-------------|
| 1 | **log_interaction** | Logs a new HCP interaction from natural language. Uses the LLM (gemma2-9b-it) for **summarization**, **entity extraction** (products, channel, type, sentiment), and **key outcome/follow-up generation**. |
| 2 | **edit_interaction** | Modifies an existing interaction record. Parses edit instructions and applies changes (sentiment, priority, status, etc.) to the matching interaction in the database. |
| 3 | **get_hcp_profile** | Retrieves an HCP's profile including specialty, organization, tier, location, contact info, and interaction statistics. |
| 4 | **get_interaction_history** | Views past interactions, optionally filtered by HCP. Returns recent interactions with summaries and metadata. |
| 5 | **schedule_followup** | Schedules a follow-up meeting with an HCP. Creates a planned interaction record in the database with a suggested date. |
| 6 | **analyze_sentiment** | Analyzes sentiment across interactions for an HCP or all HCPs. Uses the LLM to evaluate interaction summaries and generate a sentiment breakdown. |
| 7 | **get_product_info** | Looks up product information from the knowledge base, including indication, mechanism of action, clinical trial data, and safety profile. |

### How the LLM is Used

The **gemma2-9b-it** model (via Groq) is used in the `log_interaction` tool for:
1. **Summarization** — converts raw conversational input into a structured CRM summary
2. **Entity Extraction** — identifies products discussed, communication channel, interaction type
3. **Sentiment Detection** — evaluates the HCP's sentiment from the conversation
4. **Outcome & Follow-up Generation** — generates key outcomes and follow-up actions

The **llama-3.3-70b-versatile** model is available as a fallback for more complex reasoning tasks.

## How to Run

### Frontend

```bash
# Install dependencies
npm install

# Start the dev server (runs on http://localhost:5173)
npm run dev

# Build for production
npm run build
```

### Backend

```bash
cd backend

# Create a virtual environment
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Copy and configure environment variables
cp .env.example .env
# Edit .env and add your Groq API key from https://console.groq.com/keys

# Start the server (runs on http://localhost:8000)
python -m app.main
# Or: uvicorn app.main:app --reload
```

### API Documentation

Once the backend is running, visit:
- **Swagger UI**: http://localhost:8000/docs
- **ReDoc**: http://localhost:8000/redoc

## Key Features

### Log Interaction Screen
- **Dual Mode**: Toggle between a structured form and an AI-powered conversational chat interface
- **Structured Form**: Step-by-step form with HCP selection, interaction details, product tracking, summary, outcomes, and follow-up actions
- **AI Chat**: Natural language interface where the LangGraph agent processes conversational input, extracts structured data using the LLM, and logs interactions automatically

### Dashboard
- Key metrics: total HCPs, interactions logged, positive sentiment rate, active engagement
- Recent interactions feed
- Most engaged HCPs leaderboard
- Interaction channel distribution
- Sentiment breakdown visualization

### HCP Directory
- Searchable, filterable directory of healthcare professionals
- Filter by specialty and tier (KOL, High-Volume, Standard)
- Quick-log button to jump directly to the Log Interaction screen with the HCP pre-selected

### Interaction History
- Timeline view of all logged interactions
- Inline edit mode for modifying interaction records
- Delete capability
- Filter by HCP and status

## Frontend-Backend Integration

The frontend includes a built-in agent simulation (`src/services/agentService.ts`) that mirrors the backend LangGraph agent's behavior, allowing the UI to be fully functional without the backend running. When the backend is deployed, the frontend can be connected to the real LangGraph agent via the `/api/agent/chat` endpoint.

To connect the frontend to the backend, replace the simulation calls in `ChatInterface.tsx` with API calls to `http://localhost:8000/api/agent/chat`.

## Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `GROQ_API_KEY` | Groq API key (required for LLM) | — |
| `GROQ_MODEL` | Primary LLM model | `gemma2-9b-it` |
| `GROQ_FALLBACK_MODEL` | Fallback LLM model | `llama-3.3-70b-versatile` |
| `DATABASE_PATH` | SQLite database path | `medcrm.db` |

## License

This project is built as a technical assignment for an AI-First CRM HCP Module.
