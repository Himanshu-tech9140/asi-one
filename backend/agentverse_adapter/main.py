"""Official Agentverse FastAPI ACP adapter for the existing CrisisFlow API.

This process intentionally does not reimplement facility search, routing, or
the Phase 8 agent.  It owns only the Agentverse transport/identity boundary
and forwards chat text to the private Express bridge, which in turn uses the
existing allow-listed CrisisFlow capability handler and tool registry.

Run separately from the Express backend:
    uvicorn main:app --host 0.0.0.0 --port 8000
"""

import json
import os
import urllib.error
import urllib.request
from typing import cast

from fastapi import FastAPI
from uagents_core.contrib.protocols.chat import ChatMessage, TextContent
from uagents_core.envelope import Envelope
from uagents_core.identity import Identity
from uagents_core.utils.messages import parse_envelope, send_message_to_agent


AGENT_SEED_PHRASE = os.environ["AGENT_SEED_PHRASE"]
BACKEND_URL = os.getenv("CRISISFLOW_BACKEND_URL", "http://127.0.0.1:5000").rstrip("/")
IDENTITY = Identity.from_seed(AGENT_SEED_PHRASE, 0)
app = FastAPI(title="CrisisFlow Agentverse ACP Adapter")


def crisisflow_reply(text: str) -> str:
    """Forward text to the private Express bridge without exposing internals."""
    body = json.dumps({"content": [{"type": "text", "text": text}]}).encode("utf-8")
    request = urllib.request.Request(
        f"{BACKEND_URL}/api/agent/chat",
        data=body,
        headers={"Content-Type": "application/json"},
        method="POST",
    )
    try:
        with urllib.request.urlopen(request, timeout=30) as response:
            payload = json.loads(response.read().decode("utf-8"))
        content = payload.get("content", [])
        replies = [item.get("text", "") for item in content if item.get("type") == "text"]
        return " ".join(reply for reply in replies if reply).strip() or "CrisisFlow could not prepare a response."
    except (urllib.error.URLError, urllib.error.HTTPError, TimeoutError, ValueError, json.JSONDecodeError):
        return "CrisisFlow is temporarily unavailable. Please try again shortly."


@app.get("/status")
async def status():
    """Agentverse public readiness probe."""
    return {"status": "OK - Agent is running"}


@app.post("/chat")
async def handle_message(envelope: Envelope):
    """Parse an official ACP envelope and send its reply to the sender."""
    message = cast(ChatMessage, parse_envelope(envelope, ChatMessage))
    reply = crisisflow_reply(message.text())
    send_message_to_agent(
        destination=envelope.sender,
        msg=ChatMessage([TextContent(reply)]),
        sender=IDENTITY,
    )
    return {"status": "accepted"}
