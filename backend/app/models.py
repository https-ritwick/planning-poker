"""
Domain models and Pydantic schemas for the Planning Poker application.

We keep two layers:
  * Pydantic models  -> used for request/response validation at the API boundary.
  * Dataclasses      -> used for the in-memory domain state (rooms, users, stories).

Keeping them separate means the wire format can evolve independently from the
internal representation, which is good production hygiene.
"""

from __future__ import annotations

import time
import uuid
from dataclasses import dataclass, field
from enum import Enum
from typing import Dict, List, Optional

from pydantic import BaseModel, Field


# --------------------------------------------------------------------------- #
# Enums
# --------------------------------------------------------------------------- #
class Role(str, Enum):
    ADMIN = "admin"          # Scrum Master / room owner
    DEVELOPER = "developer"
    TESTER = "tester"
    BUSINESS_ANALYST = "business_analyst"
    OBSERVER = "observer"    # can watch but not vote


class Priority(str, Enum):
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    CRITICAL = "critical"


class StoryStatus(str, Enum):
    PENDING = "pending"
    ACTIVE = "active"
    ESTIMATED = "estimated"


# A vote can be any of the Fibonacci-style card faces. We keep them as strings
# because "?" and "coffee" are not numeric.
VALID_CARDS = ["0", "1", "2", "3", "5", "8", "13", "21", "34", "?", "coffee"]
NUMERIC_CARDS = {"0", "1", "2", "3", "5", "8", "13", "21", "34"}


# --------------------------------------------------------------------------- #
# In-memory domain dataclasses
# --------------------------------------------------------------------------- #
@dataclass
class User:
    id: str
    name: str
    role: Role
    is_active: bool = True
    joined_at: float = field(default_factory=time.time)
    last_seen: float = field(default_factory=time.time)

    @property
    def is_admin(self) -> bool:
        return self.role == Role.ADMIN

    @property
    def can_vote(self) -> bool:
        return self.role != Role.OBSERVER

    def to_public(self, has_voted: bool) -> dict:
        return {
            "id": self.id,
            "name": self.name,
            "role": self.role.value,
            "is_active": self.is_active,
            "is_admin": self.is_admin,
            "can_vote": self.can_vote,
            "has_voted": has_voted,
            "joined_at": self.joined_at,
        }


@dataclass
class Story:
    id: str
    title: str
    description: str = ""
    acceptance_criteria: str = ""
    priority: Priority = Priority.MEDIUM
    jira_id: Optional[str] = None
    status: StoryStatus = StoryStatus.PENDING
    final_estimate: Optional[str] = None
    created_at: float = field(default_factory=time.time)

    def to_public(self) -> dict:
        return {
            "id": self.id,
            "title": self.title,
            "description": self.description,
            "acceptance_criteria": self.acceptance_criteria,
            "priority": self.priority.value,
            "jira_id": self.jira_id,
            "status": self.status.value,
            "final_estimate": self.final_estimate,
            "created_at": self.created_at,
        }


@dataclass
class RoundResult:
    """A historical record of one completed voting round."""
    story_id: str
    story_title: str
    votes: Dict[str, str]            # user_id -> card
    vote_names: Dict[str, str]       # user_id -> user name (snapshot)
    average: Optional[float]
    median: Optional[float]
    lowest: Optional[str]
    highest: Optional[str]
    consensus: bool
    suggested: Optional[str]
    final_estimate: Optional[str]
    timestamp: float = field(default_factory=time.time)

    def to_public(self) -> dict:
        return {
            "story_id": self.story_id,
            "story_title": self.story_title,
            "votes": self.votes,
            "vote_names": self.vote_names,
            "average": self.average,
            "median": self.median,
            "lowest": self.lowest,
            "highest": self.highest,
            "consensus": self.consensus,
            "suggested": self.suggested,
            "final_estimate": self.final_estimate,
            "timestamp": self.timestamp,
        }


# --------------------------------------------------------------------------- #
# Pydantic request/response schemas
# --------------------------------------------------------------------------- #
class CreateRoomRequest(BaseModel):
    room_name: str = Field(..., min_length=1, max_length=80)
    admin_name: str = Field(..., min_length=1, max_length=60)
    team: Optional[str] = Field(None, max_length=80)


class JoinRoomRequest(BaseModel):
    name: str = Field(..., min_length=1, max_length=60)
    role: Role = Role.DEVELOPER


class StoryRequest(BaseModel):
    title: str = Field(..., min_length=1, max_length=200)
    description: str = ""
    acceptance_criteria: str = ""
    priority: Priority = Priority.MEDIUM
    jira_id: Optional[str] = None


class VoteRequest(BaseModel):
    user_id: str
    card: str


class FinalizeRequest(BaseModel):
    story_id: str
    final_estimate: str


class TimerRequest(BaseModel):
    seconds: int = Field(60, ge=5, le=600)
    auto_reveal: bool = True


def new_id(prefix: str = "") -> str:
    """Short, URL-safe unique id."""
    return f"{prefix}{uuid.uuid4().hex[:8]}"
