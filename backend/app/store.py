"""
Central in-memory registry of rooms + the WebSocket connection manager.

RoomStore        -> dict of room_id -> Room  (the single source of truth)
ConnectionManager-> tracks live websocket connections per room and broadcasts
                    state snapshots to everyone in a room.
"""

from __future__ import annotations

import asyncio
from typing import Dict, List, Optional, Set

from fastapi import WebSocket

from .room import Room


class RoomStore:
    """Thread-safe-ish in-memory store. FastAPI runs single-threaded async,
    so a simple dict is sufficient; we add an asyncio.Lock for safety around
    compound operations."""

    def __init__(self) -> None:
        self._rooms: Dict[str, Room] = {}
        self.lock = asyncio.Lock()

    def get(self, room_id: str) -> Optional[Room]:
        return self._rooms.get(room_id)

    def add(self, room: Room) -> None:
        self._rooms[room.id] = room

    def remove(self, room_id: str) -> None:
        self._rooms.pop(room_id, None)

    def exists(self, room_id: str) -> bool:
        return room_id in self._rooms

    def all(self) -> List[Room]:
        return list(self._rooms.values())


class ConnectionManager:
    """Manages active WebSocket connections, keyed by room id.

    Each connection is tagged with the user_id so we can detect
    disconnects and mark users inactive."""

    def __init__(self) -> None:
        # room_id -> set of (websocket, user_id)
        self._connections: Dict[str, Set[tuple[WebSocket, str]]] = {}

    async def connect(self, room_id: str, user_id: str, ws: WebSocket) -> None:
        await ws.accept()
        self._connections.setdefault(room_id, set()).add((ws, user_id))

    def disconnect(self, room_id: str, user_id: str, ws: WebSocket) -> None:
        conns = self._connections.get(room_id)
        if not conns:
            return
        conns.discard((ws, user_id))
        if not conns:
            self._connections.pop(room_id, None)

    def active_user_ids(self, room_id: str) -> Set[str]:
        return {uid for _, uid in self._connections.get(room_id, set())}

    async def broadcast(self, room_id: str, message: dict) -> None:
        """Send a JSON message to every connected client in a room.
        Dead sockets are silently dropped."""
        conns = list(self._connections.get(room_id, set()))
        dead: List[tuple[WebSocket, str]] = []
        for ws, uid in conns:
            try:
                await ws.send_json(message)
            except Exception:
                dead.append((ws, uid))
        for ws, uid in dead:
            self.disconnect(room_id, uid, ws)


# Singletons used across the app.
store = RoomStore()
manager = ConnectionManager()
