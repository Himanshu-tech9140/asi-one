# CrisisFlow AI — API Documentation

**Phase 6: ASI:One Basic Integration**

Base URL (development): `http://localhost:5000`

All endpoints are prefixed with `/api`.

## Overview

Phase 6 adds ASI:One intent understanding above the existing Google Places and Routes integrations. It classifies healthcare discovery and route requests only; it does not select or execute tools.

## Response Envelope

**Success**

```json
{
  "success": true,
  "data": {}
}
```

**Error**

```json
{
  "success": false,
  "message": "Something went wrong",
  "message": "A safe error message"
}
```

HTTP status codes: `400` validation, `404` not found, `500` internal, `413` payload too large.

---

## POST /api/ai/understand

### Purpose

Classify a healthcare coordination request using ASI:One. This endpoint does **not** call `findFacilities()` or `calculateRoute()`; automatic tool execution belongs to Phase 7.

### Request Body

```json
{
  "message": "Find an emergency hospital and tell me how to reach it"
}
```

`message` is required, must be a non-empty string, and has a 2,000-character maximum.

### Success Response — `200`

```json
{
  "success": true,
  "data": {
    "intent": "find_facility",
    "serviceType": "emergency",
    "needsRoute": true,
    "locationRequired": true,
    "confidence": 0.92,
    "originalMessage": "Find an emergency hospital and tell me how to reach it"
  }
}
```

Supported intents: `find_facility`, `find_route`, `healthcare_search`, `emergency_help`, `general_healthcare_query`, and `unsupported`.

Supported service types: `emergency`, `hospital`, `clinic`, `pharmacy`, `blood_bank`, and `specialist`.

### Error Responses

- `400` — missing, empty, non-string, or too-long `message`.
- `500` — ASI:One is not configured, unavailable, timed out, or returned an invalid response.

Provider details, request headers, stack traces, and API keys are never returned.

---

## GET /api/health

### Purpose
Health check for the API and database connectivity.

### Request
No body or query parameters.

### Success Response — `200`
```json
{
  "success": true,
  "message": "CrisisFlow API is running",
  "timestamp": "2026-08-29T12:00:00.000Z",
  "services": {
    "api": "healthy",
    "database": "connected"
  }
}
```

If MongoDB is unavailable, `database` is `"disconnected"` and the API still responds `200`.

### Error Response
None (this endpoint never throws by design).

---

## POST /api/coordination

### Purpose
Create a new coordination run. This is the main endpoint served to the frontend. In this phase, coordination logic returns a **mock** result (ASI:One planner is not called yet; see Phase 6). However, facility searches within the coordination pipeline use real Google Places data.

### Request Body
```json
{
  "message": "Find the best emergency facility near me",
  "location": { "lat": 28.62, "lng": 77.36 },
  "preferences": {
    "maxDistance": 10000,
    "serviceType": "emergency"
  }
}
```

| Field         | Type     | Required | Notes                                        |
| ------------- | -------- | -------- | -------------------------------------------- |
| `message`     | string   | yes      | Max 4000 characters, non-empty               |
| `location`    | object   | no       | `lat` (-90..90), `lng` (-180..180)           |
| `preferences` | object   | no       | `maxDistance` positive number                 |

### Success Response — `201`
```json
{
  "success": true,
  "data": {
    "id": "675000000000000000000001",
    "request": "Find the best emergency facility near me",
    "status": "completed",
    "intent": { "type": "facility_search", "confidence": 0.95 },
    "steps": [
      { "name": "Request received", "status": "completed" },
      { "name": "Intent understood", "status": "completed" }
    ],
    "recommendation": {
      "facilityId": "facility-001",
      "name": "CityCare Emergency Center",
      "distance": 2.4,
      "estimatedTime": 8
    },
    "alternatives": [],
    "createdAt": "2026-08-29T12:00:00.000Z"
  }
}
```

### Error Responses
- `400` — `message` missing, empty, too long, or invalid `location`/`preferences`.
- `413` — body larger than the configured limit (100kb).

---

## GET /api/coordination/:id

### Purpose
Retrieve a stored coordination record.

### Request
Path parameter `id` — a MongoDB ObjectId.

### Success Response — `200`
```json
{
  "success": true,
  "data": {
    "id": "675000000000000000000001",
    "request": "Find the best emergency facility near me",
    "status": "completed",
    "steps": [],
    "recommendation": null,
    "createdAt": "2026-08-29T12:00:00.000Z"
  }
}
```

### Error Responses
- `404` — `{ "success": false, "message": "Coordination not found" }` (also for malformed id)

---

## GET /api/facilities

### Purpose
Search nearby healthcare facilities using real Google Places API. Returns normalized data from real places (or mock data if Google API key is not configured).

### Query Parameters
| Parameter     | Type   | Required | Notes                                    |
| ------------- | ------ | -------- | ---------------------------------------- |
| `lat`         | number | no       | Latitude (-90..90)                       |
| `lng`         | number | no       | Longitude (-180..180)                    |
| `radius`      | number | no       | Search radius in metres (default 10000)  |
| `serviceType` | string | no       | Filter by service (e.g. `emergency`)     |

### Success Response — `200`
```json
{
  "success": true,
  "data": {
    "facilities": [
      {
        "id": "ChIJN1blbAK8j4AR4PXaoaP88KM",
        "placeId": "ChIJN1blbAK8j4AR4PXaoaP88KM",
        "name": "CityCare Emergency Center",
        "address": "221 Skyline Avenue, Sector 62, New Delhi",
        "location": { "lat": 28.625, "lng": 77.36 },
        "types": ["hospital", "health"],
        "rating": 4.5,
        "userRatingsTotal": 120
      }
    ]
  }
}
```

### Error Responses
- `400` — invalid `lat`, `lng`, `radius`, or `serviceType`.
- `500` — Google API error or Maps service not configured.

---

## GET /api/facilities/:id

### Purpose
Return real details for a single facility from Google Places API.

### Request
Path parameter `id` — a Google Place ID (e.g. `ChIJN1blbAK8j4AR4PXaoaP88KM`).

### Success Response — `200`
```json
{
  "success": true,
  "data": {
    "facility": {
      "id": "ChIJN1blbAK8j4AR4PXaoaP88KM",
      "placeId": "ChIJN1blbAK8j4AR4PXaoaP88KM",
      "name": "CityCare Emergency Center",
      "address": "221 Skyline Avenue, Sector 62, New Delhi",
      "location": { "lat": 28.625, "lng": 77.36 },
      "types": ["hospital", "health"],
      "rating": 4.5,
      "userRatingsTotal": 120,
      "phone": "+91-11-1234-5678",
      "website": "https://citycare-hospital.example"
    }
  }
}
```

> Fields like `phone` and `website` are only included if provided by Google Places API.

### Error Responses
- `404` — `{ "success": false, "message": "Facility not found" }`
- `500` — Google API error or Maps service not configured.

---

## POST /api/routes/calculate

### Purpose
Calculate the fastest driving route between two locations using Google Routes API.

### Request Body
```json
{
  "origin": { "lat": 28.62, "lng": 77.36 },
  "destination": { "lat": 28.63, "lng": 77.37 }
}
```

| Field         | Type     | Required | Notes                                    |
| ------------- | -------- | -------- | ---------------------------------------- |
| `origin`      | object   | yes      | `lat` (-90..90), `lng` (-180..180)       |
| `destination` | object   | yes      | `lat` (-90..90), `lng` (-180..180)       |

### Success Response — `200`
```json
{
  "success": true,
  "data": {
    "distanceMeters": 2400,
    "durationSeconds": 480,
    "distanceText": "2.4 km",
    "durationText": "8 min",
    "polyline": "enc:gfo}EtohhU"
  }
}
```

| Field            | Type   | Description                              |
| ---------------- | ------ | ---------------------------------------- |
| `distanceMeters` | number | Distance in meters                       |
| `durationSeconds`| number | Estimated travel time in seconds         |
| `distanceText`   | string | Formatted distance (e.g., "2.4 km")     |
| `durationText`   | string | Formatted duration (e.g., "8 min")      |
| `polyline`       | string | Encoded polyline for map rendering       |

### Error Responses
- `400` — invalid origin or destination coordinates.
- `429` — rate limit exceeded (too many route requests).
- `500` — Google Routes API error or Maps service not configured.

---

## POST /api/acp (Phase 8 — CrisisFlow Agent over ACP)

### Purpose
Expose the CrisisFlow agent as a healthcare coordination agent that can participate in agent-to-agent communication using the Agent Communication Protocol (ACP) — a JSON-RPC 2.0 protocol.

### Request — `200`
Body is a JSON-RPC 2.0 envelope. The `method` is either `initialize` or a capability name; `params` carries the capability arguments.

```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "method": "find_emergency_facility",
  "params": { "location": { "lat": 28.62, "lng": 77.36 } }
}
```

Available capability methods:

| Method | Required params | Notes |
| --- | --- | --- |
| `initialize` | — | Returns agent identity + capability manifest |
| `find_emergency_facility` | `location` | Emergency facilities |
| `find_healthcare_service` | `location`, `serviceType` | serviceType from allow-list |
| `find_pharmacy` | `location` | Pharmacies |
| `find_blood_bank` | `location` | Blood banks |
| `calculate_route` | `origin`, `facilityId` | Requires prior discovery |
| `find_emergency_facility_and_route` | `location` | Multi-step facility + route |

### Success Response — `200`
```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "result": {
    "facilityType": "emergency",
    "facilities": [
      { "id": "ChIJ...", "placeId": "ChIJ...", "name": "Real Hospital", "address": "...", "location": { "lat": 28.6, "lng": 77.3 }, "rating": 4.5 }
    ],
    "radius": 5000,
    "coordinationId": "6a92b01956c4f3a64abdf87b"
  }
}
```

### Error Responses
Errors follow JSON-RPC 2.0 codes inside the `error` field. HTTP status is always `200` (the error is carried in the ACP envelope):

- `-32600` Invalid Request — malformed envelope or missing `id`.
- `-32601` Method Not Found — unknown capability.
- `-32602` Invalid Params — missing/invalid coordinates, serviceType or unsupported fields.
- `-32603` Internal Error — tool/provider/planner failure (safe message, no internals leaked).

---

## Agentverse adapter (Phase 9)

Agentverse access is provided by the separate `agentverse_adapter` FastAPI /
`uagents_core` process, following the current official Agentverse FastAPI
integration. The Express service remains the private backend and continues to
own `POST /api/acp`.

The adapter exposes public `GET /status` and `POST /chat` endpoints. It
forwards chat text internally to `POST /api/agent/chat`, which dispatches only
the existing allow-listed CrisisFlow capabilities through the Phase 8 tool
registry. Do not register the Express endpoint itself with Agentverse.

---

## Supported Service Types

When searching facilities with `GET /api/facilities?serviceType=...`, the following types are supported:

| Internal Type | Description                  | Google Places Mapping |
| ------------- | ---------------------------- | --------------------- |
| `emergency`   | Emergency healthcare         | hospital, emergency_room |
| `hospital`    | General hospitals            | hospital              |
| `clinic`      | Medical clinics              | medical_clinic        |
| `pharmacy`    | Pharmacies                   | pharmacy              |
| `blood_bank`  | Blood banks                  | blood_bank            |
| `specialist`  | Specialist services          | healthcare_service    |

---

## Important Notes on Real Data

- **Facility information** (name, address, rating) comes from Google Places API and may not be current real-time data for medical availability, bed counts, or doctor schedules.
- **Route information** (distance, time) comes from Google Routes API and assumes current traffic patterns; actual times may vary.
- **No guarantees**: This data is for informational purposes. Do not rely on it for actual medical emergencies; always call emergency services directly.

---

## GET /api/history

### Purpose
Retrieve previous coordination records (paginated).

### Query Parameters
| Parameter | Type   | Required | Notes                                        |
| --------- | ------ | -------- | -------------------------------------------- |
| `page`    | number | no       | Page number (default 1)                      |
| `limit`   | number | no       | Items per page (max 50, default 10)          |
| `status`  | string | no       | Filter: `All`, `pending`, `planning`, `executing`, `completed`, `failed` |

### Success Response — `200`
```json
{
  "success": true,
  "data": {
    "items": [
      {
        "id": "675000000000000000000001",
        "request": "Find the best emergency facility near me",
        "status": "completed",
        "createdAt": "2026-08-29T12:00:00.000Z",
        "recommendation": "CityCare Emergency Center",
        "facilitiesFound": 3
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 10,
      "total": 1,
      "pages": 1
    }
  }
}
```

### Error Responses
- `500` if the database is unreachable.

---

## Unknown Routes

Any other method/path returns:

```json
{
  "success": false,
  "message": "Route not found: GET /api/unknown"
}
```
