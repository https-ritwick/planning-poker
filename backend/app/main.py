"""
Planning Poker — FastAPI backend.

Run with:
    uvicorn app.main:app --reload --port 8000

Exposes:
    REST endpoints for room/story/vote lifecycle.
    A WebSocket endpoint (/ws/{room_id}) that pushes full state snapshots
    to every connected client whenever anything changes.

No database is used. All state lives in app/store.py (in-memory).
"""

from __future__ import annotations

import asyncio
import csv
import io
import json
from typing import Optional

from fastapi import FastAPI, HTTPException, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse

from .models import (
    CreateRoomRequest,
    FinalizeRequest,
    JoinRoomRequest,
    Role,
    Story,
    StoryRequest,
    TimerRequest,
    User,
    VoteRequest,
    new_id,
)
from .room import Room
from .store import manager, store

app = FastAPI(title="EXL Planning Poker", version="1.0.0")

# CORS — Angular dev server runs on :4200. Allow all in dev for convenience.
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# --------------------------------------------------------------------------- #
# Helpers
# --------------------------------------------------------------------------- #
async def push_state(room: Room) -> None:
    """Broadcast the latest snapshot to everyone in the room."""
    await manager.broadcast(room.id, {"type": "state", "payload": room.snapshot()})


def require_room(room_id: str) -> Room:
    room = store.get(room_id)
    if not room:
        raise HTTPException(status_code=404, detail="Room not found")
    return room


def require_admin(room: Room, user_id: str) -> None:
    user = room.users.get(user_id)
    if not user or not user.is_admin:
        raise HTTPException(status_code=403, detail="Admin privileges required")


# --------------------------------------------------------------------------- #
# Health
# --------------------------------------------------------------------------- #
@app.get("/api/health")
async def health() -> dict:
    return {"status": "ok", "rooms": len(store.all())}


# --------------------------------------------------------------------------- #
# Room lifecycle
# --------------------------------------------------------------------------- #
@app.post("/api/rooms")
async def create_room(req: CreateRoomRequest) -> dict:
    """Create a room. The creator automatically becomes the admin and is
    returned a user_id they should use when opening the WebSocket."""
    room_id = new_id()
    admin = User(id=new_id("u_"), name=req.admin_name, role=Role.ADMIN)
    room = Room(
        id=room_id,
        name=req.room_name,
        team=req.team,
        admin_id=admin.id,
    )
    room.add_user(admin)
    store.add(room)
    return {
        "room_id": room.id,
        "user_id": admin.id,
        "role": admin.role.value,
        "snapshot": room.snapshot(),
    }


@app.get("/api/rooms/{room_id}")
async def get_room(room_id: str) -> dict:
    room = require_room(room_id)
    return room.snapshot()


@app.post("/api/rooms/{room_id}/join")
async def join_room(room_id: str, req: JoinRoomRequest) -> dict:
    """Join an existing room as a participant/observer. Returns a user_id."""
    room = require_room(room_id)
    # Anyone joining via link cannot self-assign admin.
    role = Role.OBSERVER if req.role == Role.OBSERVER else req.role
    if role == Role.ADMIN:
        role = Role.DEVELOPER
    user = User(id=new_id("u_"), name=req.name, role=role)
    room.add_user(user)
    await push_state(room)
    return {
        "room_id": room.id,
        "user_id": user.id,
        "role": user.role.value,
        "snapshot": room.snapshot(),
    }


# --------------------------------------------------------------------------- #
# Story management (admin)
# --------------------------------------------------------------------------- #
@app.post("/api/rooms/{room_id}/stories")
async def add_story(room_id: str, req: StoryRequest, user_id: str) -> dict:
    room = require_room(room_id)
    require_admin(room, user_id)
    story = Story(
        id=new_id("s_"),
        title=req.title,
        description=req.description,
        acceptance_criteria=req.acceptance_criteria,
        priority=req.priority,
        jira_id=req.jira_id,
    )
    room.add_story(story)
    await push_state(room)
    return story.to_public()


@app.put("/api/rooms/{room_id}/stories/{story_id}")
async def update_story(
    room_id: str, story_id: str, req: StoryRequest, user_id: str
) -> dict:
    room = require_room(room_id)
    require_admin(room, user_id)
    story = room.get_story(story_id)
    if not story:
        raise HTTPException(status_code=404, detail="Story not found")
    story.title = req.title
    story.description = req.description
    story.acceptance_criteria = req.acceptance_criteria
    story.priority = req.priority
    story.jira_id = req.jira_id
    await push_state(room)
    return story.to_public()


@app.delete("/api/rooms/{room_id}/stories/{story_id}")
async def delete_story(room_id: str, story_id: str, user_id: str) -> dict:
    room = require_room(room_id)
    require_admin(room, user_id)
    room.stories = [s for s in room.stories if s.id != story_id]
    if room.current_story_id == story_id:
        room.current_story_id = None
        room.reset_votes()
    await push_state(room)
    return {"ok": True}


@app.post("/api/rooms/{room_id}/stories/{story_id}/activate")
async def activate_story(room_id: str, story_id: str, user_id: str) -> dict:
    room = require_room(room_id)
    require_admin(room, user_id)
    if not room.set_current_story(story_id):
        raise HTTPException(status_code=404, detail="Story not found")
    await push_state(room)
    return {"ok": True}


# --------------------------------------------------------------------------- #
# Voting
# --------------------------------------------------------------------------- #
@app.post("/api/rooms/{room_id}/vote")
async def submit_vote(room_id: str, req: VoteRequest) -> dict:
    room = require_room(room_id)
    if not room.cast_vote(req.user_id, req.card):
        raise HTTPException(status_code=400, detail="Vote rejected")
    await push_state(room)
    return {"ok": True}


@app.post("/api/rooms/{room_id}/reveal")
async def reveal_votes(room_id: str, user_id: str) -> dict:
    room = require_room(room_id)
    require_admin(room, user_id)
    room.reveal()
    await push_state(room)
    return {"ok": True}


@app.post("/api/rooms/{room_id}/reset")
async def reset_votes(room_id: str, user_id: str) -> dict:
    room = require_room(room_id)
    require_admin(room, user_id)
    room.reset_votes()
    await push_state(room)
    return {"ok": True}


@app.post("/api/rooms/{room_id}/finalize")
async def finalize_estimate(
    room_id: str, req: FinalizeRequest, user_id: str
) -> dict:
    room = require_room(room_id)
    require_admin(room, user_id)
    if not room.finalize(req.story_id, req.final_estimate):
        raise HTTPException(status_code=404, detail="Story not found")
    await push_state(room)
    return {"ok": True}


# --------------------------------------------------------------------------- #
# Timer
# --------------------------------------------------------------------------- #
@app.post("/api/rooms/{room_id}/timer")
async def start_timer(room_id: str, req: TimerRequest, user_id: str) -> dict:
    room = require_room(room_id)
    require_admin(room, user_id)
    room.start_timer(req.seconds, req.auto_reveal)
    await push_state(room)
    # Kick off a background task to auto-reveal when the timer ends.
    asyncio.create_task(_timer_watcher(room.id, req.seconds))
    return {"ok": True}


async def _timer_watcher(room_id: str, seconds: int) -> None:
    """Background coroutine: ticks every second, broadcasts remaining time,
    and auto-reveals when the timer expires (if enabled)."""
    for _ in range(seconds):
        await asyncio.sleep(1)
        room = store.get(room_id)
        if not room or room.timer_ends_at is None:
            return  # timer cancelled / room gone
        await push_state(room)
    room = store.get(room_id)
    if room and room.timer_ends_at is not None:
        if room.timer_auto_reveal and not room.revealed:
            room.reveal()
        room.timer_ends_at = None
        await push_state(room)


# --------------------------------------------------------------------------- #
# Export
# --------------------------------------------------------------------------- #
@app.get("/api/rooms/{room_id}/export.json")
async def export_json(room_id: str) -> StreamingResponse:
    room = require_room(room_id)
    payload = {
        "room": room.snapshot()["room"],
        "exported_at": __import__("time").time(),
        "history": [h.to_public() for h in room.history],
        "stories": [s.to_public() for s in room.stories],
    }
    buf = io.BytesIO(json.dumps(payload, indent=2).encode())
    return StreamingResponse(
        buf,
        media_type="application/json",
        headers={
            "Content-Disposition": f'attachment; filename="session_{room_id}.json"'
        },
    )


@app.get("/api/rooms/{room_id}/export.csv")
async def export_csv(room_id: str) -> StreamingResponse:
    room = require_room(room_id)
    out = io.StringIO()
    writer = csv.writer(out)
    writer.writerow(
        ["Story", "JIRA", "Priority", "Status", "Final Estimate",
         "Average", "Median", "Lowest", "Highest", "Consensus"]
    )
    # Map history by story for quick lookup of the last round's stats.
    hist_by_story = {h.story_id: h for h in room.history}
    for s in room.stories:
        h = hist_by_story.get(s.id)
        writer.writerow(
            [
                s.title,
                s.jira_id or "",
                s.priority.value,
                s.status.value,
                s.final_estimate or "",
                h.average if h else "",
                h.median if h else "",
                h.lowest if h else "",
                h.highest if h else "",
                ("Yes" if h.consensus else "No") if h else "",
            ]
        )
    out.seek(0)
    buf = io.BytesIO(out.getvalue().encode())
    return StreamingResponse(
        buf,
        media_type="text/csv",
        headers={
            "Content-Disposition": f'attachment; filename="session_{room_id}.csv"'
        },
    )


# --------------------------------------------------------------------------- #
# WebSocket — real-time room updates
# --------------------------------------------------------------------------- #
@app.websocket("/ws/{room_id}")
async def ws_room(websocket: WebSocket, room_id: str, user_id: str) -> None:
    """Clients connect here after creating/joining a room. We mark the user
    active on connect, push the current state, and listen for lightweight
    client messages (heartbeats / votes). On disconnect we mark them inactive."""
    room = store.get(room_id)
    if not room or user_id not in room.users:
        await websocket.close(code=4404)
        return

    await manager.connect(room_id, user_id, websocket)
    room.set_active(user_id, True)
    await push_state(room)

    try:
        while True:
            data = await websocket.receive_json()
            msg_type = data.get("type")

            if msg_type == "ping":
                room.set_active(user_id, True)
                await websocket.send_json({"type": "pong"})

            elif msg_type == "vote":
                card = data.get("card")
                if room.cast_vote(user_id, card):
                    await push_state(room)

            elif msg_type == "request_state":
                await websocket.send_json(
                    {"type": "state", "payload": room.snapshot()}
                )

    except WebSocketDisconnect:
        manager.disconnect(room_id, user_id, websocket)
        # Mark inactive only if they have no other live connections.
        if user_id not in manager.active_user_ids(room_id):
            room.set_active(user_id, False)
        await push_state(room)
    except Exception:
        manager.disconnect(room_id, user_id, websocket)
        if user_id not in manager.active_user_ids(room_id):
            room.set_active(user_id, False)
        await push_state(room)
