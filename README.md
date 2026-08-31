<div align="center">

# 🚑 **ASI:One** — CrisisFlow AI

### *AI-Powered Healthcare Emergency Coordination System*

---

**ASI:One** is an AI-powered healthcare emergency coordination system that converts natural-language user requests into real, actionable plans — **hospitals, ambulances, blood banks, and pharmacies** all in one place.

> 🎯 **"Find the nearest emergency hospital near me"** — just say it, **ASI:One** handles the rest.

[Live Demo](#getting-started) · [Report Bug](https://github.com/Himanshu-tech9140/asi-one/issues) · [Request Feature](https://github.com/Himanshu-tech9140/asi-one/issues)

</div>

---

## 📑 Table of Contents

- [Key Highlights](#-key-highlights)
- [Features](#-features)
- [Architecture](#-architecture)
- [Tech Stack](#-tech-stack)
- [Project Structure](#-project-structure)
- [Getting Started](#-getting-started)
- [API Overview](#-api-overview)
- [Deployment](#-deployment-render)
- [Testing](#-testing)
- [Security](#-security)
- [Roadmap](#-roadmap)

---

## 🌟 Key Highlights

<table>
<tr>
<td width="50%" valign="top">

### 🤖 **ASI:One Intelligence**
- Natural language intent detection
- Multi-step planning & tool orchestration
- Agent Communication Protocol (ACP)
- Real-time SSE streaming

</td>
<td width="50%" valign="top">

### 🚑 **Smart Ambulance Finder**
- Nearby ambulances search
- Distance-based nearest ambulance
- Phone / contact info
- One-tap contact & route

</td>
</tr>
<tr>
<td width="50%" valign="top">

### 📍 **Live Navigation**
- Real browser GPS tracking
- Moving user marker
- Live route with distance/ETA
- Off-route detection & recalculation

</td>
<td width="50%" valign="top">

### 🏥 **Healthcare Facilities**
- Hospitals, Pharmacies, Blood Banks
- Google Places real-time data
- Ranked recommendations
- Facility details & directions

</td>
</tr>
</table>

---

## 🎯 Features

### 🖥️ Frontend (React + Vite + Tailwind)

| Feature | Description |
|---------|-------------|
| **Dashboard** | Natural-language task input, live agent activity, facility recommendations, quick actions |
| **Smart Ambulance** | Emergency ambulance finder with nearest badge, contact, route & live nav |
| **New Coordination** | 5-step wizard with browser GPS, service type selector, live SSE streaming |
| **Live Navigation** | Real-time GPS tracking, moving marker, ETA, off-route detection, arrival notification |
| **History** | Paginated, searchable coordination history with status filters |
| **Agent Network** | Visual overview of agents in the coordination loop |
| **Task Details** | Deep-dive view of individual coordination results |
| **Settings** | Application configuration panel |

### ⚙️ Backend (Express + MongoDB)

| Feature | Description |
|---------|-------------|
| **ASI:One Integration** | Intent understanding + controlled planning loop via OpenAI-compatible API |
| **CrisisFlow Agent + ACP** | Agent Communication Protocol (JSON-RPC 2.0) with capability allow-list |
| **Smart Ambulance Tool** | `findAmbulances` — real Google Places ambulance search pipeline |
| **Google Places API** | `findFacilities` — hospitals, pharmacies, blood banks |
| **Google Routes API** | `calculateRoute` — multi-target route calculation |
| **SSE Streaming** | Real-time agent activity via `/api/ai/stream` |
| **MongoDB Persistence** | Coordination & ToolExecution models with full auditing |
| **Security Hardening** | Helmet, CORS, rate-limiting, capability allow-lists, safe errors |

---

## 🧠 Architecture

```
                            ┌─────────────────────────────┐
                            │      React Frontend         │
                            │  Dashboard · Wizard · Nav   │
                            └──────────────┬──────────────┘
                                           │ REST + SSE
                            ┌──────────────▼──────────────┐
                            │      Express API            │
                            │   Routes · Controllers      │
                            └──────────────┬──────────────┘
                                           │
            ┌──────────────────────────────┼──────────────────────────────┐
            │                              │                              │
   ┌────────▼────────┐          ┌─────────▼─────────┐         ┌─────────▼─────────┐
   │    ASI:One       │          │  CrisisFlow Agent  │         │   ACP Protocol    │
   │  Intent · Plan   │          │  Tool Allow-list   │         │   JSON-RPC 2.0    │
   └────────┬────────┘          └─────────┬─────────┘         └───────────────────┘
            │                             │
            │                ┌────────────▼────────────┐
            │                │     Tool Registry       │
            │                │  findFacilities         │
            │                │  findAmbulances         │
            │                │  calculateRoute         │
            │                └────────────┬────────────┘
            │                             │
   ┌────────▼────────┐          ┌─────────▼─────────┐
   │    MongoDB       │          │  Google APIs       │
   │  Coordination    │          │  Places · Routes   │
   └─────────────────┘          └───────────────────┘
```

```
User → "Find nearby ambulance"
  ↓
ASI:One → Intent Detection
  ↓
┌────────────────┬────────────────┐
↓                ↓                ↓
findAmbulances  findFacilities  calculateRoute
↓                ↓                ↓
Google Places   Google Places   Google Routes
└────────────────┴────────────────┘
  ↓
Nearest Ambulance → Route → Live Navigation
  ↓
MongoDB History
```

---

## 🛠️ Tech Stack

| Layer | Technology |
|-------|-----------|
| **Frontend** | React 18, Vite 5, React Router 6, Tailwind CSS 3, Lucide Icons |
| **Backend** | Node.js 20, Express 4, Mongoose (MongoDB 8) |
| **AI Engine** | **ASI:One** (OpenAI-compatible chat completions) |
| **Protocol** | ACP — Agent Communication Protocol (JSON-RPC 2.0) |
| **APIs** | Google Places API (New), Google Routes API |
| **Streaming** | Server-Sent Events (SSE) |
| **Testing** | Node built-in assertions, mongodb-memory-server |
| **Deploy** | Render.com (Static Site + Web Service) |

---

## 📁 Project Structure

```
asi-one/
├── index.html                    # Vite HTML entry
├── package.json                  # Frontend dependencies
├── vite.config.js                # Vite config + /api proxy
├── tailwind.config.js            # Custom healthcare theme
├── postcss.config.js
├── render.yaml                   # Render deployment blueprint
├── src/                          # React frontend
│   ├── App.jsx                   # Routes
│   ├── pages/                    # Dashboard, NewCoordination, History, etc.
│   ├── components/
│   │   ├── dashboard/            # AmbulanceCard, LiveNavigationPanel
│   │   ├── common/               # Reusable UI
│   │   └── layout/               # Header, Sidebar
│   ├── hooks/                    # useLiveNavigation, useBrowserLocation
│   ├── services/api.js           # API client + SSE
│   └── utils/geo.js              # Geo utilities
├── backend/                      # Express + MongoDB API
│   ├── package.json
│   ├── src/
│   │   ├── server.js             # Bootstrap + graceful shutdown
│   │   ├── app.js                # Express configuration
│   │   ├── controllers/          # Coordination, AI, Facility
│   │   ├── routes/               # REST endpoints
│   │   ├── services/             # asiOne, coordination, facility, maps
│   │   ├── agents/crisisflow/    # Agent manifest + handler
│   │   ├── tools/                # toolRegistry + findAmbulances
│   │   ├── models/               # Coordination, ToolExecution
│   │   └── middleware/           # Rate limit, error handler
│   ├── tests/                    # 9 test suites
│   └── docs/                     # API docs, phase docs
└── tests/                        # Frontend tests
```

---

## 🚀 Getting Started

### Prerequisites

- **Node.js** 18+ with npm
- **MongoDB** (local or Atlas)
- **Google Cloud** project with Places API + Routes API
- **ASI:One** API key

### Installation

```bash
# Clone the repo
git clone https://github.com/Himanshu-tech9140/asi-one.git
cd asi-one

# Frontend setup
npm install
cp .env.example .env
# Edit .env → add VITE_API_BASE_URL

# Backend setup
cd backend
npm install
cp .env.example .env
# Edit .env → add MONGODB_URI, GOOGLE_MAPS_API_KEY, ASI_ONE_API_KEY
```

### Run

```bash
# Terminal 1 — Backend
cd backend && npm run dev

# Terminal 2 — Frontend
npm run dev
```

Open **http://localhost:5173** 🎉

---

## 📡 API Overview

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/health` | Health check |
| POST | `/api/ai/understand` | ASI:One intent understanding |
| POST | `/api/ai/plan` | ASI:One planner + tool execution |
| GET | `/api/ai/stream` | SSE live agent activity |
| POST | `/api/acp` | ACP (JSON-RPC 2.0) request |
| POST | `/api/coordination` | Create coordination |
| GET | `/api/coordination/:id` | Get coordination |
| GET | `/api/facilities` | Search facilities (Google Places) |
| GET | `/api/facilities/:id` | Facility details |
| POST | `/api/routes/calculate` | Calculate route (Google Routes) |
| GET | `/api/history` | Paginated history |

---

## 🌐 Deployment (Render)

| Service | Type | Root Dir | Build | Start |
|---------|------|----------|-------|-------|
| **crisisflow-web** | Static Site | `.` | `npm ci && npm run build` | — |
| **crisisflow-api** | Web Service | `backend` | `npm ci` | `npm start` |

Set environment variables in Render Dashboard. Never commit secrets.

---

## 🧪 Testing

```bash
# Backend tests (9 suites, no real API calls)
cd backend && npm test

# Frontend tests
npm test
```

Uses `mongodb-memory-server` and stubbed providers — zero API quota consumed.

---

## 🔒 Security

- **Capability allow-list** — only declared ACP capabilities can execute
- **Param allow-list** — unknown keys rejected
- **Coordinate validation** — strict validation, nothing fabricated
- **No arbitrary execution** — no shell commands, URLs, or unregistered tools
- **Secrets server-side only** — API keys never reach frontend
- **Safe errors** — no stacks, credentials, or internals leaked

---

## 🗺️ Roadmap

- [x] **Phase 1–3** — Core agent, ACP protocol, tool registry
- [x] **Phase 4–5** — Google Places/Routes integration
- [x] **Phase 6** — Coordination persistence, MongoDB
- [x] **Phase 7** — Security hardening, rate limiting
- [x] **Phase 8** — CrisisFlow agent over ACP
- [x] **Phase 9** — Agentverse discovery/publishing
- [x] **Phase 11** — SSE activity streaming
- [x] **Phase 12** — 🚑 Smart Ambulance Finder + 📍 Live Navigation
- [ ] **Future** — Auth, streaming chat, expanded agent network

---

<div align="center">

### Built with ❤️ using **ASI:One** · React · Express · Google Maps · MongoDB

[⬆ Back to Top](#-asi-one--crisisflow-ai)

</div>
