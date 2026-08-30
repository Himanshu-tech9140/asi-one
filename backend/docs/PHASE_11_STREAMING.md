# Phase 11: real-time agent activity

`GET /api/ai/stream` exposes the existing ASI:One planner as a Server-Sent Events stream. It receives `message` and an optional JSON-encoded `location` query value. It does not create another planner and does not call Google or ASI:One outside the existing planner and tool registry.

## Events

The endpoint emits `agent_started`, `intent_detected`, `planning_started`, `planning_completed`, `tool_started`, `tool_completed`, `tool_failed`, `final_response`, `agent_completed`, and `error`.

Every execution event includes a persisted `coordinationId`. Tool events are sent only immediately before and after the corresponding registered tool actually executes. `final_response` carries the same safe planner result used by the frontend. `agent_completed` is emitted only after the coordination is saved as completed.

## Client and safety

The frontend has one centralized EventSource service (`src/services/api.js`), closes it after terminal events, and renders its updates in the existing coordination flow. The server handles client disconnects and avoids writes after the response has closed. Credentials, provider payloads, database URIs, stack traces, and internal paths are never included in event data.

Agentverse live registration/deployment remains deferred.
