# ASI One — CrisisFlow AI

> An AI coordination agent that turns natural-language, real-world emergency requests into actionable plans using ASI:One intelligence, a specialized CrisisFlow agent, the Agent Communication Protocol (ACP), and real Google Places / Google Routes data.

**CrisisFlow AI** (project codename: **ASI One**) is a full-stack healthcare emergency coordination system. Users describe a situation in plain language (for example, *"Find an emergency facility near me"*), and CrisisFlow understands the intent, plans the required steps, coordinates its tools and agents, and returns a ranked, actionable result with live facility data, routes, and coordination history.

---

## Table of Contents

- [Features](#features)
- [Tech Stack](#tech-stack)
- [Architecture](#architecture)
- [Repository Structure](#repository-structure)
- [Getting Started](#getting-started)
  - [Prerequisites](#prerequisites)
  - [Frontend Setup](#frontend-setup)
  - [Backend Setup](#backend-setup)
  - [Environment Variables](#environment-variables)
- [Running the App](#running-the-app)
- [API Overview](#api-overview)
- [Testing](#testing)
- [Security](#security)
- [Roadmap](#roadmap)
- [License](#license)

---

## Features

### Frontend (Vite + React + Tailwind)

- **Dashboard** — natural-language task input, live agent activity timeline, mock map, facility recommendations, alternatives, quick actions, and an agent-network preview.
- **New Coordination** — a guided 5-step wizard (*Describe → Location → Preferences → Coordinate → Result*) with:
  - Browser geolocation or manual coordinates.
  - Service type, travel preference, and maximum distance selectors.
  - Live **SSE** streaming of agent activity (`/api/ai/stream`) while coordination runs.
  - Result view with facility cards, a route calculation, and facility details.
- **History** — paginated, searchable coordination history with status filters.
- **Agent Network** — visual overview of the agents involved in the coordination loop.
- **Task Details** — deep-dive view of an individual coordination.
- **Settings** — application configuration surface.
- Dark, accessible UI with a custom Tailwind theme (Inter + JetBrains Mono).

### Backend (Node.js + Express + MongoDB)

- **ASI:One integration** — intent understanding (`/api/ai/understand`) and a controlled planning loop (`/api/ai/plan`) over an OpenAI-compatible chat-completions API.
- **CrisisFlow Agent + ACP** — exposes CrisisFlow as a proper agent over the **Agent Communication Protocol (ACP)**, a JSON-RPC 2.0 envelope at `POST /api/acp`, with a capability allow-list (`find_emergency_facility`, `find_healthcare_service`, `find_pharmacy`, `find_blood_bank`, `calculate_route`, `find_emergency_facility_and_route`).
- **Real-world tool execution** — `findFacilities` queries the **Google Places API (New)**; `calculateRoute` queries the **Google Routes API**. Mock facility data is returned when Maps is not configured.
- **Persistence** — MongoDB (Mongoose) models for `Coordination` and `ToolExecution` with full execution auditing.
- **Security hardening** — helmet, CORS, morgan, express-rate-limit (30 route requests / 15 min), capability + param allow-lists, coordinated validation, and safe error responses (no internal details, stacks, or credentials are ever leaked).
- **Graceful degradation** — the API boots even if MongoDB, Google Maps, or ASI:One are unreachable; the health endpoint reports status.

---

## Tech Stack

| Layer      | Technology                                                                    |
| ---------- | ----------------------------------------------------------------------------- |
| Frontend   | React 18, Vite 5, React Router 6, Tailwind CSS 3, lucide-react icons           |
| Backend    | Node.js, Express 4, Mongoose (MongoDB)                                         |
| AI         | ASI:One (OpenAI-compatible chat completions), ACP (Agent Communication Protocol) |
| APIs       | Google Places API (New), Google Routes API                                     |
| Streaming  | Server-Sent Events (SSE)                                                      |
| Tests      | Node built-in test assertions + `mongodb-memory-server`                        |

---

## Architecture

```
                     ┌──────────────────────────────┐
                     │   React Frontend (Vite)      │
                     │   Dashboard / Wizard / Hist. │
                     └──────────────┬───────────────┘
                                    │ REST + SSE (/api)
                     ┌──────────────▼───────────────┐
                     │   Express API (backend)      │
                     │   src/app.js / src/routes/*  │
                     └──────────────┬───────────────┘
                                    │
        ┌───────────────────────────┼───────────────────────────┐
        │                           │                           │
┌───────▼───────┐          ┌────────▼────────┐        ┌─────────▼──────────┐
│ ASI:One        │          │ CrisisFlow Agent │        │ ACP (JSON-RPC 2.0) │
│ intent/plan   │          │ capability allow-│        │ agent-to-agent     │
│ orchestration │          │ list + handler    │        │ communication      │
└───────┬───────┘          └────────┬────────┘        └─────────────────────┘
        │                           │
        │              ┌────────────▼────────────┐
        │              │   Tool Registry         │
        │              │   findFacilities        │
        │              │   calculateRoute        │
        │              └────────────┬────────────┘
        │                           │
┌───────▼───────┐          ┌────────▼────────┐
│   MongoDB      │          │ Google Places / │
│ Coordination & │          │ Routes APIs     │
│ ToolExecution  │          │ (real-world)    │
└────────────────┘          └─────────────────┘
```

```
User → ASI:One → CrisisFlow Agent → ACP
   → CrisisFlow Agent → Planner / Tool Registry
   → findFacilities / calculateRoute → Google Places / Routes
   → CrisisFlow Agent → ASI:One → User
```

---

## Repository Structure

```
asi-one/
├── index.html                 # Vite HTML entry
├── package.json               # Frontend package (root)
├── vite.config.js             # Vite config + /api proxy → :5100
├── tailwind.config.js         # Tailwind theme
├── postcss.config.js
├── .env.example               # Frontend env example
├── .gitignore
├── src/                       # React frontend
│   ├── main.jsx               # ReactDOM entry
│   ├── App.jsx                # React Router routes
│   ├── index.css              # Global styles / theme
│   ├── pages/                 # Dashboard, NewCoordination, History,
│   │                          # AgentNetwork, TaskDetails, Settings, NotFound
│   ├── components/            # agents/, common/, dashboard/, layout/, task/
│   ├── hooks/                 # useAgentSimulation, useBrowserLocation
│   ├── services/api.js        # API client + SSE stream + normalizers
│   └── data/mockData.js        # Mock facilities / quick actions
└── backend/                   # Express + MongoDB API
    ├── package.json
    ├── .env.example
    ├── README.md              # Detailed backend docs (phases 1–8)
    ├── src/
    │   ├── server.js          # Server bootstrap + graceful shutdown
    │   ├── app.js             # Express app configuration
    │   ├── config/            # db.js, env.js
    │   ├── controllers/       # Coordination, facility, history, ai
    │   ├── routes/            # REST route definitions
    │   ├── services/          # asiOne, asiPlanner, coordination, facility, maps
    │   ├── agents/crisisflow/ # crisisflow.agent/manifest/handler
    │   ├── agentverse/        # ACP chat protocol, crisisflow bridge
    │   ├── models/            # Coordination, ToolExecution
    │   ├── middleware/        # errorHandler, notFound, requestLogger, rateLimit
    │   ├── tools/             # toolRegistry
    │   ├── utils/             # ApiError, asyncHandler, acp
    │   └── data/              # mockFacilities
    ├── scripts/               # agentverse-register.js
    ├── docs/                  # API.md, PHASE_9_STATUS.md, PHASE_11_STREAMING.md
    ├── agentverse_adapter/    # FastAPI adapter for Agentverse (Phase 9)
    └── tests/                 # Service + agent + ACP + SSE test suites
```

---

## Getting Started

### Prerequisites

- **Node.js** 18+ (with npm)
- **MongoDB** (local install or MongoDB Atlas cluster)
- Optional for real integrations:
  - **Google Cloud** project with **Places API (New)** and **Routes API** enabled
  - **ASI:One** API key for intent understanding / planning

### Frontend Setup

```bash
# From the repository root
npm install
npm run dev
```

The frontend runs on `http://localhost:5173` and proxies `/api` requests to the backend at `http://127.0.0.1:5100` (configurable via `VITE_API_PROXY_TARGET`).

### Backend Setup

```bash
cd backend
npm install
cp .env.example .env
```

### Environment Variables

> Never commit real credentials. `.env` files are git-ignored.

**Root (frontend):**

| Variable              | Default | Description                            |
| --------------------- | ------- | -------------------------------------- |
| `VITE_API_BASE_URL`   | `/api`  | Public API base the browser calls. Keep `/api` in dev so Vite proxies to port 5100. |

**Backend (`backend/.env`):**

| Variable                  | Default                                  | Description                                      |
| ------------------------- | ---------------------------------------- | ------------------------------------------------ |
| `PORT`                    | `5000`                                   | Backend server port                              |
| `NODE_ENV`                | `development`                            | Environment mode                                 |
| `MONGODB_URI`             | `mongodb://localhost:27017/crisisflow`   | MongoDB connection string                        |
| `FRONTEND_URL`            | `http://localhost:5173`                  | Allowed CORS origin                              |
| `GOOGLE_MAPS_API_KEY`     | *(empty)*                                | Enables real Google Places + Routes (server only) |
| `ASI_ONE_API_KEY`         | *(empty)*                                | Enables ASI:One intelligence (server only)       |
| `ASI_ONE_BASE_URL`        | `https://api.asi1.ai/v1`                 | ASI:One OpenAI-compatible base URL               |
| `ASI_ONE_MODEL`           | `asi1`                                   | ASI:One model id (`asi1`, `asi1-mini`, `asi1-ultra`) |
| `ACP_AGENT_ID`            | `crisisflow-agent`                       | Stable agent identifier presented over ACP       |
| `AGENTVERSE_API_KEY`      | *(empty)*                                | Agentverse (Phase 9, optional)                   |
| `AGENT_URI` / `AGENT_SEED_PHRASE` / `AGENT_EXTERNAL_ENDPOINT` / `CRISISFLOW_BACKEND_URL` | — | Optional Agentverse adapter settings |

If `GOOGLE_MAPS_API_KEY` is not set, facility search returns mock data and route calculation returns a safe `500` ("Maps service is not configured"). If `ASI_ONE_API_KEY` is not set, AI endpoints return a safe `500` ("AI service is not configured"). The backend still boots and serves the rest normally.

---

## Running the App

**Terminal 1 — backend:**

```bash
cd backend
npm run dev        # nodemon, auto-restart on change
```

or production:

```bash
cd backend
npm start
```

**Terminal 2 — frontend:**

```bash
npm run dev        # Vite dev server on :5173
```

Open http://localhost:5173, describe a request (e.g. "Find the closest emergency facility near me"), pick a location, and start the coordination to watch the CrisisFlow agent work in real time.

---

## API Overview

All endpoints are prefixed with `/api`. Base URL (development): `http://localhost:5000`.

| Method | Endpoint                    | Description                                       |
| ------ | --------------------------- | ------------------------------------------------- |
| GET    | `/api/health`               | Health check (`database: connected`)              |
| POST   | `/api/ai/understand`        | ASI:One intent understanding                      |
| POST   | `/api/ai/plan`              | ASI:One planner + tool execution                  |
| GET    | `/api/ai/stream`            | SSE stream of live agent activity                 |
| POST   | `/api/acp`                  | CrisisFlow Agent ACP (JSON-RPC 2.0) request       |
| POST   | `/api/coordination`         | Create a coordination                             |
| GET    | `/api/coordination/:id`     | Get a stored coordination                         |
| GET    | `/api/facilities`           | Search facilities (Google Places)                 |
| GET    | `/api/facilities/:id`       | Facility details                                  |
| POST   | `/api/routes/calculate`     | Calculate route (Google Routes)                   |
| GET    | `/api/history`              | Paginated coordination history                    |

Full request/response documentation: [`backend/docs/API.md`](backend/docs/API.md).

**Example — ACP capability call:**

```bash
curl -X POST http://localhost:5000/api/acp \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","id":1,"method":"find_emergency_facility","params":{"location":{"lat":28.62,"lng":77.36}}}'
```

**Example — SSE live activity:**

```bash
curl -N "http://localhost:5000/api/ai/stream?message=Find%20an%20emergency%20facility&location=%7B%22lat%22%3A28.62%2C%22lng%22%3A77.36%7D"
```

---

## Testing

```bash
cd backend
npm test
```

The suite runs service, agent, ACP, and SSE streaming tests using `mongodb-memory-server` and stubbed external providers — no real API quota is consumed. Includes coverage for valid/invalid requests, unknown capabilities, planner/tool failures, arbitrary-tool rejection, input validation, and secret protection.

---
snapshots
<img width="1904" height="862" alt="Screenshot 2026-08-31 165551" src="https://github.com/user-attachments/assets/828bcf94-06bd-431d-9da9-850dc51abadb" />
<img width="1907" height="867" alt="Screenshot 2026-08-31 165616" src="https://github.com/user-attachments/assets/60f3df70-ab7d-45dd-8f05-8a240e228a2c" />


<img width="1905" height="856" alt="Screenshot 2026-08-31 165452" src="https://github.com/user-attachments/assets/118cedf6-df0f-4edd-9c6e-71754d5d9d50" />

## Security

- **Capability allow-list** — only declared ACP capabilities may be dispatched (`src/agents/crisisflow/crisisflow.manifest.js`).
- **Param allow-list** — unknown keys (e.g. `apiKey`, `tool`) are rejected.
- **Coordinated validation** — coordinates, service types, and radius are strictly validated; nothing is fabricated.
- **No arbitrary execution** — ACP input can never invoke arbitrary functions, URLs, shell commands, or unregistered tools.
- **Secrets stay server-side** — API keys never reach the React frontend, are never logged, and `.env` is git-ignored.
- **Safe errors** — stacks, provider details, and credentials are never exposed to clients.

---

## Roadmap

- **Phase 8 (current)** — CrisisFlow agent exposed over ACP; Google Places/Routes as real-world tools via the tool registry.
- **Phase 9** — Agentverse discovery/publishing (a FastAPI adapter skeleton already exists in `backend/agentverse_adapter/`).
- **Phase 11** — SSE activity streaming for live agent coordination (documented in `backend/docs/PHASE_11_STREAMING.md`).
- **Future** — Web search (Tavily), auth, streaming chat, and expanded agent network.

---

## License

This project is licensed under the **MIT License**.

Built with React, Express, ASI:One, and the Agent Communication Protocol.
