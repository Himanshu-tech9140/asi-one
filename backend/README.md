# CrisisFlow AI — Backend

An AI coordination agent backend with real Google Maps and ASI:One integration. CrisisFlow accepts a user's natural-language real-world request, understands the intent via ASI:One, plans the required steps, uses specialized tools/agents, and returns an actionable result.

> **Current phase: Phase 8 — CrisisFlow Agent + ACP.** Phase 8 exposes CrisisFlow as a proper healthcare coordination agent over the Agent Communication Protocol (ACP). ASI:One remains the intelligence/orchestration layer; CrisisFlow is the specialized agent; ACP provides agent-to-agent communication; Google Places/Routes remain real-world execution tools reached only through the tool registry. Agentverse discovery/publishing is intentionally NOT implemented (Phase 9).

## Phase 8: CrisisFlow Agent + ACP

`POST /api/acp` exposes CrisisFlow as a proper **agent** that can participate in agent-to-agent communication using the Agent Communication Protocol (ACP). ACP is a JSON-RPC 2.0 protocol; this implementation follows the official ACP message envelope (`jsonrpc`, `id`, `method`, `params`, `result`, `error`) and JSON-RPC 2.0 error codes while remaining transport-agnostic over HTTP.

**Role separation (the core principle of Phase 8):**

- **ASI:One** provides intelligence/orchestration.
- **CrisisFlow** is the specialized healthcare coordination agent.
- **ACP** provides agent-to-agent communication.
- **Google Places and Routes** provide real-world data/execution (via the tool registry).

```
User → ASI:One → CrisisFlow Agent → ACP
   → CrisisFlow Agent → Planner/Tool Registry
   → findFacilities / calculateRoute → Google Places / Routes
   → CrisisFlow Agent → ASI:One → User
```

### Architecture

```
ACP Request (JSON-RPC 2.0 @ POST /api/acp)
    ↓
CrisisFlow Agent           src/agents/crisisflow/crisisflow.agent.js
    ↓
Capability validation      src/agents/crisisflow/crisisflow.manifest.js (allow-list)
    ↓
Handler                    src/agents/crisisflow/crisisflow.handler.js
    ↓
Tool Registry              src/tools/toolRegistry.js
    ↓
findFacilities / calculateRoute → Google Places / Routes
    ↓
Result normalization + MongoDB logging → ACP Response
```

### Capability manifest

Declared in `src/agents/crisisflow/crisisflow.manifest.js`. Every capability is an allow-listed entry and maps to verified backend tools:

| Capability | Tool(s) used |
| --- | --- |
| `find_emergency_facility` | `findFacilities` (serviceType `emergency`) |
| `find_healthcare_service` | `findFacilities` (serviceType from allow-list) |
| `find_pharmacy` | `findFacilities` (serviceType `pharmacy`) |
| `find_blood_bank` | `findFacilities` (serviceType `blood_bank`) |
| `calculate_route` | `calculateRoute` |
| `find_emergency_facility_and_route` | `findFacilities` + `calculateRoute` (multi-step) |

`initialize` returns the agent identity and the full capability manifest.

### Request / response flow

An ACP request is a JSON-RPC 2.0 method call; the `method` is a capability name and `params` carries the capability arguments. For example:

```bash
curl -X POST http://localhost:5000/api/acp \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","id":1,"method":"find_emergency_facility","params":{"location":{"lat":28.62,"lng":77.36}}}'
```

Response:

```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "result": {
    "facilityType": "emergency",
    "facilities": [ /* real facilities from Google Places */ ],
    "radius": 5000,
    "coordinationId": "..."
  }
}
```

Errors return standard JSON-RPC error codes (`-32600` invalid request, `-32601` method not found / unknown capability, `-32602` invalid params, `-32603` internal error). Internal details, stack traces and provider credentials are never exposed.

### Security

- **Capability allow-list:** only manifest capabilities may be dispatched.
- **Param allow-list:** only allowed keys are accepted per capability; unknown keys (e.g. `apiKey`, `tool`) are rejected.
- **Coordinated validation:** coordinates, serviceType and radius are strictly validated; invalid service types and coordinates are rejected.
- **No arbitrary execution:** ACP input can never invoke arbitrary functions, URLs, shell commands or arbitrary backend tools. Every capability only reaches the registered tool registry.

### Logging

Each ACP capability execution creates a `Coordination` and every tool execution is recorded in MongoDB `ToolExecution` (agent capability, toolName, status, coordinates, timestamps, normalized result). API keys, authorization headers and secrets are never logged.

### Testing

`npm test` includes `tests/crisisflow.agent.test.js`, which mocks all external providers (Google Places/Routes via stubbed tool registry, MongoDB via mongodb-memory-server) and covers: valid/invalid requests, unknown capability, all facilities + route capabilities, the multi-step capability, invalid coordinates, missing location, tool/Google/planner failures, secret protection, arbitrary tool rejection, and ACP response normalization. No real API quota is consumed by automated tests.

### Limitations

- No Agentverse discovery/publishing (Phase 9).
- No streaming / WebSockets (out of scope).
- `calculate_route` requires a facility already discovered in the agent context; a standalone route request without prior discovery is safely rejected (no fabricated destinations).
- Agent identity is configurable via `ACP_AGENT_ID` (default `crisisflow-agent`).

## Phase 7: ASI:One Planner + Tool Execution

`POST /api/ai/plan` runs a controlled ASI:One planning loop. ASI:One is the reasoning/orchestration layer and may select only `findFacilities` and `calculateRoute` from the backend tool registry. Google Places and Google Routes remain execution/data tools. Tool arguments are backend-validated, user/facility coordinates are never fabricated, each execution is logged, and the loop stops after five steps. Agentverse, ACP and streaming are not implemented.

## 1. Project Overview

This repository contains the Express + MongoDB backend API for CrisisFlow AI. In this phase:

- The API exposes a coherent set of REST endpoints.
- User messages are sent to **ASI:One** for intent understanding (new in Phase 6).
- Coordination requests are processed by a **mock service** and persisted to MongoDB.
- Facility lookups query **real Google Places API** (or mock data if API key is not configured).
- Route calculations query **real Google Routes API** (or error if API key is not configured).
- A centralized error-handling and response contract is in place.

The frontend lives in the repository root (Vite + React).

> The backend is **not coupled** to any frontend component. It returns clean JSON responses.

**Phase 6 Important:** ASI:One performs intent understanding only. Automatic tool selection and execution are Phase 7.

## 2. Backend Architecture

```
Frontend
    ↓
Express API            (src/app.js, src/routes/*)
    ↓
ASI:One                (src/services/asiOne.service.js) → Intent Understanding
    ↓
    ├→ Coordination Service   (src/services/coordination.service.js) → MongoDB
    ├→ Facility Service       (src/services/facility.service.js) → Google Places API
    └→ Routes Service         (src/services/maps.service.js) → Google Routes API
    ↓
Frontend
```

**Phase 7 will add:**
```
ASI:One
    ↓
Planner
    ↓
Tool Selection
    ↓
    ├→ findFacilities()
    └→ calculateRoute()
```

```
Frontend → Express API → Coordination Service → ASI:One Planner → Tool Selection
   → { findFacilities, calculateRoute, searchWeb, externalAgent }
   → External APIs / Agentverse → ASI:One → Recommendation → MongoDB → Frontend
```

## 3. Tech Stack

- **Node.js** + **Express.js**
- **MongoDB** + **Mongoose**
- **dotenv** for configuration
- **cors**, **helmet**, **morgan**, **express-rate-limit** for security/logging
- **nodemon** (dev)

## 4. Folder Structure

```
backend/
├── src/
│   ├── agents/crisisflow/  crisisflow.agent.js, crisisflow.manifest.js,
│   │                      crisisflow.handler.js (Phase 8)
│   ├── config/        db.js, env.js
│   ├── controllers/   coordination, facility, history
│   ├── routes/        coordination, facility, history, health
│   ├── services/      coordination, facility, history (business logic)
│   ├── models/        Coordination.js, ToolExecution.js
│   ├── middleware/    errorHandler, notFound, requestLogger
│   ├── utils/         ApiError, asyncHandler
│   ├── data/          mockFacilities.js
│   ├── app.js         Express app configuration
│   └── server.js      Server bootstrap
├── docs/API.md        API documentation
├── .env.example
├── .gitignore
└── package.json
```

Responsibilities are separated:

- **Routes** — declare HTTP endpoints only; no business logic.
- **Controllers** — validate request shape; call services.
- **Services** — business logic and orchestration.
- **Models** — Mongoose schemas.

## 5. Environment Setup

Copy `.env.example` to `.env` and adjust if needed:

```bash
cp .env.example .env
```

### MongoDB Requirement

Phase 4 **requires MongoDB**. If MongoDB is not reachable, the API still boots and reports
`database: disconnected` via `/api/health`, but read/write endpoints that need persistence will
fail. The API never silently falls back to fake in-memory database behavior.

### Option A — Mix with a Local MongoDB

Install MongoDB Community locally (see below) and use the default URI:

```
MONGODB_URI=mongodb://localhost:27017/crisisflow
```

### Option B — MongoDB Atlas (cloud)

1. Create a free cluster at https://www.mongodb.com/atlas.
2. Add a database user and allowlist your IP.
3. Copy the connection string into `.env`. The database name must **not** contain spaces or
   URL-encoded characters (use a plain name such as `crisisflow`):
   ```
   MONGODB_URI=mongodb+srv://<user>:<password>@<cluster>.mongodb.net/crisisflow
   ```

> Never commit real credentials. `.env` is git-ignored. The MongoDB URI is **not** printed to logs.

### Starting a Local MongoDB (Windows / macOS / Linux)

```bash
# macOS (Homebrew)
brew tap mongodb/brew
brew install mongodb-community
brew services start mongodb-community

# Ubuntu / Debian (mongod service)
sudo systemctl start mongod

# Windows — run mongod directly
mongod --dbpath C:\data\db
```

After MongoDB is running the backend health check will report `database: connected`.

### Configured Variables

| Variable       | Default                            | Description                        |
| -------------- | ---------------------------------- | ---------------------------------- |
| `PORT`         | `5000` (dev)                       | Server port (Render provides PORT automatically) |
| `NODE_ENV`     | `development`                      | Environment mode                   |
| `MONGODB_URI`  | `mongodb://localhost:27017/crisisflow` (dev) | MongoDB connection string. **Required in production** (no localhost fallback). |
| `FRONTEND_URL` | `http://localhost:5173` (dev)      | Allowed CORS origin (frontend). **Required in production** (no localhost fallback, never a wildcard). |
| `GOOGLE_MAPS_API_KEY` | (empty)                     | Google Cloud API key. Enables real facility/route data. **Required in production** (no mock fallback). |
| `ASI_ONE_API_KEY` | (empty)                     | ASI:One API key. Enables intent understanding. **Required in production** (no simulated fallback). |
| `ASI_ONE_BASE_URL` | `https://api.asi1.ai/v1`     | ASI:One OpenAI-compatible base URL |
| `ASI_ONE_MODEL` | `asi1`                       | ASI:One model id (`asi1`, `asi1-mini`, `asi1-ultra`) |
| `ACP_AGENT_ID` | `crisisflow-agent`           | Stable agent identifier presented over ACP (Phase 8) |

**Future integration variables** (not yet used):

- `TAVILY_API_KEY` — Phase 7+ (web search, not implemented)
- `AGENTVERSE_API_KEY` — Phase 9 (Agentverse discovery/publishing)

## 5.5 Google Cloud Setup (Phase 5)

### Enable Google APIs

Phase 5 requires Google Places API (New) and Google Routes API for facility search and route calculation.

#### Step 1: Create a Google Cloud Project

1. Go to [Google Cloud Console](https://console.cloud.google.com/).
2. Create a new project or select an existing one.
3. Note the **Project ID**.

#### Step 2: Enable Required APIs

1. In the Cloud Console, go to **APIs & Services** > **Enabled APIs & Services**.
2. Click **+ ENABLE APIS AND SERVICES**.
3. Search for and enable:
   - **Places API (New)** (not the legacy Places API)
   - **Routes API**

#### Step 3: Create an API Key

1. Go to **APIs & Services** > **Credentials**.
2. Click **+ CREATE CREDENTIALS** > **API Key**.
3. Copy the generated key.

#### Step 4: Restrict the API Key (Recommended)

1. On the credentials page, click the API key to edit it.
2. Under **API restrictions**, select:
   - Places API (New)
   - Routes API
3. Under **Application restrictions**, select **HTTP referrers** and add your backend domain.
4. Click **Save**.

#### Step 5: Add to .env

```
GOOGLE_MAPS_API_KEY=<your-api-key>
```

**⚠️ IMPORTANT:**

- The API key must remain in the backend `.env` file only.
- The API key must **never** be sent to the React frontend.
- The API key is never logged or printed to console.
- `.env` is git-ignored and never committed.

### Billing & Quotas

Google Cloud APIs may incur costs depending on your project's billing configuration:

- **Places API (New)**: Billing is enabled per request. Free tier includes a monthly credit.
- **Routes API**: Billing is enabled per request. Free tier includes a monthly credit.

Check your [Google Cloud Billing](https://console.cloud.google.com/billing) dashboard to view usage and costs.

### Fallback Behavior

If `GOOGLE_MAPS_API_KEY` is not configured:

- **Development only** — **GET /api/facilities** returns mock data (useful for testing without Google API); **POST /api/routes/calculate** returns a `500` error with message "Maps service is not configured".
- **Production (`NODE_ENV=production`)** — facility search fails clearly with an internal error instead of returning mock facilities. Configure `GOOGLE_MAPS_API_KEY` in the deployment environment.

The backend still boots and serves other endpoints normally.

## 5.6 ASI:One Setup (Phase 6)

Phase 6 requires ASI:One for intent understanding. Configure the API key to enable the `/api/ai/understand` endpoint.

### How ASI:One is used

ASI:One exposes an **OpenAI-compatible Chat Completions endpoint**:

```
POST {ASI_ONE_BASE_URL}/chat/completions      (default: https://api.asi1.ai/v1/chat/completions)
```

The intent-understanding code (in `src/services/asiOne.service.js`) sends the user's message, plus a system prompt that forces ASI:One to reply with a single JSON object describing the intent. No planner, no Agentverse, no tool calls are used in this phase.

#### Step 1: Get ASI:One API Key

1. Log into your ASI:One workspace or portal.
2. Navigate to **API Keys** or **Settings** > **Integrations**.
3. Generate a new API key.
4. Copy the key.

#### Step 2: Add to .env

```
ASI_ONE_API_KEY=<your-asi-one-api-key>
```

Optional overrides (defaults match the live API):

```
ASI_ONE_BASE_URL=https://api.asi1.ai/v1
ASI_ONE_MODEL=asi1
```

**⚠️ IMPORTANT:**

- The API key must remain in the backend `.env` file only.
- The API key must **never** be sent to the React frontend.
- The API key is never logged or printed to console.
- `.env` is git-ignored and never committed.

#### Intent Understanding

When configured, the `/api/ai/understand` endpoint accepts user messages and returns structured intent:

```bash
curl -X POST http://localhost:5000/api/ai/understand \
  -H "Content-Type: application/json" \
  -d '{"message":"Find hospitals near me"}'
```

Response:
```json
{
  "success": true,
  "data": {
    "intent": "find_facility",
    "serviceType": "hospital",
    "needsRoute": false,
    "locationRequired": true,
    "confidence": 0.95
  }
}
```

#### Fallback Behavior

If `ASI_ONE_API_KEY` is not configured:

- **POST /api/ai/understand** returns a `500` error with message "AI service is not configured". ASI:One responses are never simulated in any environment.
- **Production (`NODE_ENV=production`)** — configure `ASI_ONE_API_KEY` in the deployment environment; without it AI endpoints fail clearly rather than simulate data.

The backend still boots and serves other endpoints normally.

**Phase 6 Important:** ASI:One performs intent understanding only. Automatic tool selection and execution (e.g., calling findFacilities or calculateRoute) are implemented in Phase 7.

## 6. Installation

```bash
cd backend
npm install
```

Ensure MongoDB is configured and reachable — see [Section 5 (MongoDB)](#5-environment-setup).

For Phase 5 features (facility search with real data, route calculation), configure a Google Cloud API key — see [Section 5.5 (Google Cloud Setup)](#55-google-cloud-setup-phase-5).

For Phase 6 features (intent understanding), configure an ASI:One API key — see [Section 5.6 (ASI:One Setup)](#56-asiOne-setup-phase-6).

## 7. Running Development Server

```bash
npm run dev
```

Uses `nodemon` for auto-restart. The app boots even if MongoDB is unavailable (the health endpoint will report `disconnected`).

## 8. Running Production Server

```bash
npm start
```

Runs `node src/server.js`. `npm run build` is a Vite (frontend) command and does not apply to the backend; the backend runs directly with Node.

## 9. API Endpoints

| Method | Endpoint                    | Description                              |
| ------ | --------------------------- | ---------------------------------------- |
| GET    | `/api/health`               | Health check                             |
| POST   | `/api/ai/understand`        | ASI:One intent understanding (Phase 6)   |
| POST   | `/api/coordination`         | Create a coordination (mock result)      |
| GET    | `/api/coordination/:id`     | Get a stored coordination                |
| GET    | `/api/facilities`           | Search facilities (real Google Places)   |
| GET    | `/api/facilities/:id`       | Facility details (real Google Places)    |
| POST   | `/api/routes/calculate`     | Calculate route (real Google Routes)     |
| GET    | `/api/history`              | Paginated coordination history           |
| POST   | `/api/acp`                  | CrisisFlow Agent ACP (JSON-RPC 2.0) request (Phase 8) |

Full request/response documentation: see [`docs/API.md`](docs/API.md).

## 10. Example Requests

Understand intent (ASI:One intent understanding):

```bash
curl -X POST http://localhost:5000/api/ai/understand \
  -H "Content-Type: application/json" \
  -d '{"message":"Find hospitals near me"}'
```

Response:
```json
{
  "success": true,
  "data": {
    "intent": "find_facility",
    "serviceType": "hospital",
    "needsRoute": false,
    "locationRequired": true,
    "confidence": 0.95
  }
}
```

Search facilities (real Google Places API with valid key):

```bash
curl "http://localhost:5000/api/facilities?lat=28.62&lng=77.36&radius=5000&serviceType=hospital"
```

Calculate a route (real Google Routes API with valid key):

```bash
curl -X POST http://localhost:5000/api/routes/calculate \
  -H "Content-Type: application/json" \
  -d '{
    "origin": { "lat": 28.62, "lng": 77.36 },
    "destination": { "lat": 28.63, "lng": 77.37 }
  }'
```

Create a coordination:

```bash
curl -X POST http://localhost:5000/api/coordination \
  -H "Content-Type: application/json" \
  -d '{"message":"Find the best emergency facility near me","location":{"lat":28.62,"lng":77.36}}'
```

Get a coordination:

```bash
curl http://localhost:5000/api/coordination/<id>
```

## 11. Example Response

```json
{
  "success": true,
  "data": {
    "id": "675000000000000000000001",
    "request": "Find the best emergency facility near me",
    "status": "completed",
    "steps": [
      { "name": "Request received", "status": "completed" }
    ],
    "recommendation": null
  }
}
```

## 12. Current Capabilities (Phase 6)

- **Intent understanding** uses ASI:One API when configured (with valid `ASI_ONE_API_KEY`).
- **Intent extraction** maps user messages to structured intents (find_facility, find_route, etc.).
- **Service type recognition** identifies healthcare types (hospital, pharmacy, emergency, etc.).
- **Route requirement detection** identifies when a user needs route/travel information.
- **Facility search** uses real Google Places API when configured (with valid `GOOGLE_MAPS_API_KEY`).
- **Route calculation** uses real Google Routes API when configured (with valid `GOOGLE_MAPS_API_KEY`).
- **Coordination results** are still **mock**; the coordination planner logic is not connected to ASI:One planner yet (Phase 7+).
- **Tool execution logging** is implemented in MongoDB `ToolExecution` model for future use.
- **Error handling** maps API errors to safe, generic messages (API keys and internal details never exposed to the client).
- **Rate limiting** is applied to route requests (max 30 per 15 minutes) to control Google API costs.
- **No authentication** implemented yet.
- MongoDB must be reachable for read/write endpoints; the API still boots and reports `disconnected` otherwise.
- The MongoDB connection string (including credentials) is never logged; only a redacted host/name is printed.

**Phase 6 Important:** ASI:One performs intent understanding only. Automatic tool selection and execution are Phase 7.

## 13. Future ASI:One Integration Plan (Phase 7+)

Phase 7 will add automatic tool selection and execution:

1. Take the structured intent from Phase 6.
2. Call ASI:One Planner to select appropriate tools.
3. Execute selected tools:
   - `findFacilities()` for facility discovery
   - `calculateRoute()` for route information
   - `searchWeb()` for general healthcare information (future API)
4. Persist detailed tool executions in `ToolExecution` with logs.
5. Feed the final recommendation back and return it to the frontend.

The service layer and tool architecture were intentionally written so Phase 7 can drop real tool execution into existing functions without restructuring the API contract.
