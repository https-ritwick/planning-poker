"""
Room aggregate: holds all state for a single planning-poker session and
encapsulates the business rules (voting, reveal, statistics, finalisation).

Everything lives in memory. There is intentionally no persistence layer.
"""

from __future__ import annotations

import statistics
import time
from dataclasses import dataclass, field
from typing import Dict, List, Optional

from .models import (
    NUMERIC_CARDS,
    VALID_CARDS,
    RoundResult,
    Role,
    Story,
    StoryStatus,
    User,
    new_id,
)


@dataclass
class Room:
    id: str
    name: str
    team: Optional[str]
    admin_id: str
    created_at: float = field(default_factory=time.time)

    users: Dict[str, User] = field(default_factory=dict)
    stories: List[Story] = field(default_factory=list)
    history: List[RoundResult] = field(default_factory=list)

    # Voting state for the *current* round
    current_story_id: Optional[str] = None
    votes: Dict[str, str] = field(default_factory=dict)  # user_id -> card
    revealed: bool = False

    # Timer state
    timer_ends_at: Optional[float] = None
    timer_auto_reveal: bool = False

    # ----------------------------------------------------------------- #
    # User management
    # ----------------------------------------------------------------- #
    def add_user(self, user: User) -> None:
        self.users[user.id] = user

    def remove_user(self, user_id: str) -> None:
        self.users.pop(user_id, None)
        self.votes.pop(user_id, None)

    def set_active(self, user_id: str, active: bool) -> None:
        if user_id in self.users:
            self.users[user_id].is_active = active
            self.users[user_id].last_seen = time.time()

    # ----------------------------------------------------------------- #
    # Story management
    # ----------------------------------------------------------------- #
    def add_story(self, story: Story) -> Story:
        self.stories.append(story)
        # If there's no active story yet, make this one active.
        if self.current_story_id is None:
            self.set_current_story(story.id)
        return story

    def get_story(self, story_id: str) -> Optional[Story]:
        return next((s for s in self.stories if s.id == story_id), None)

    def set_current_story(self, story_id: str) -> bool:
        story = self.get_story(story_id)
        if not story:
            return False
        # Reset round state when switching stories.
        self._reset_round_state()
        # Demote any previously active (but not estimated) story.
        for s in self.stories:
            if s.status == StoryStatus.ACTIVE:
                s.status = StoryStatus.PENDING
        if story.status != StoryStatus.ESTIMATED:
            story.status = StoryStatus.ACTIVE
        self.current_story_id = story_id
        return True

    @property
    def current_story(self) -> Optional[Story]:
        if self.current_story_id is None:
            return None
        return self.get_story(self.current_story_id)

    # ----------------------------------------------------------------- #
    # Voting
    # ----------------------------------------------------------------- #
    def cast_vote(self, user_id: str, card: str) -> bool:
        user = self.users.get(user_id)
        if not user or not user.can_vote:
            return False
        if card not in VALID_CARDS:
            return False
        if self.revealed:
            return False  # voting is locked once revealed
        self.votes[user_id] = card
        return True

    def reveal(self) -> None:
        self.revealed = True
        self.timer_ends_at = None  # stop any running timer

    def reset_votes(self) -> None:
        self._reset_round_state()

    def _reset_round_state(self) -> None:
        self.votes = {}
        self.revealed = False
        self.timer_ends_at = None
        self.timer_auto_reveal = False

    def start_timer(self, seconds: int, auto_reveal: bool) -> None:
        self.timer_ends_at = time.time() + seconds
        self.timer_auto_reveal = auto_reveal

    def timer_remaining(self) -> Optional[int]:
        if self.timer_ends_at is None:
            return None
        remaining = int(round(self.timer_ends_at - time.time()))
        return max(0, remaining)

    # ----------------------------------------------------------------- #
    # Statistics / analysis
    # ----------------------------------------------------------------- #
    def compute_stats(self) -> dict:
        """Compute averages, median, spread, consensus and a suggested estimate."""
        numeric_votes = [
            int(card) for card in self.votes.values() if card in NUMERIC_CARDS
        ]
        special_votes = [
            card for card in self.votes.values() if card not in NUMERIC_CARDS
        ]

        distribution: Dict[str, int] = {}
        for card in self.votes.values():
            distribution[card] = distribution.get(card, 0) + 1

        avg = round(statistics.mean(numeric_votes), 2) if numeric_votes else None
        med = round(statistics.median(numeric_votes), 2) if numeric_votes else None
        lowest = str(min(numeric_votes)) if numeric_votes else None
        highest = str(max(numeric_votes)) if numeric_votes else None

        # Consensus: everyone who voted numerically picked the same card,
        # and at least one numeric vote exists.
        consensus = (
            len(set(numeric_votes)) == 1
            and len(numeric_votes) > 0
            and len(special_votes) == 0
        )

        suggested = self._suggest_estimate(numeric_votes, distribution)

        return {
            "distribution": distribution,
            "average": avg,
            "median": med,
            "lowest": lowest,
            "highest": highest,
            "consensus": consensus,
            "suggested": suggested,
            "numeric_count": len(numeric_votes),
            "special_count": len(special_votes),
            "total_votes": len(self.votes),
        }

    @staticmethod
    def _suggest_estimate(
        numeric_votes: List[int], distribution: Dict[str, int]
    ) -> Optional[str]:
        """
        Heuristic: snap the average to the nearest valid Fibonacci card.
        If there is a clear modal value, prefer that instead.
        """
        if not numeric_votes:
            return None

        fib = [0, 1, 2, 3, 5, 8, 13, 21, 34]

        # Prefer the mode if a single card has a strict majority.
        numeric_dist = {
            int(k): v for k, v in distribution.items() if k in NUMERIC_CARDS
        }
        if numeric_dist:
            top_card, top_count = max(numeric_dist.items(), key=lambda kv: kv[1])
            if top_count > len(numeric_votes) / 2:
                return str(top_card)

        avg = statistics.mean(numeric_votes)
        nearest = min(fib, key=lambda f: abs(f - avg))
        return str(nearest)

    # ----------------------------------------------------------------- #
    # Finalisation
    # ----------------------------------------------------------------- #
    def finalize(self, story_id: str, final_estimate: str) -> bool:
        story = self.get_story(story_id)
        if not story:
            return False

        stats = self.compute_stats()
        story.final_estimate = final_estimate
        story.status = StoryStatus.ESTIMATED

        # Snapshot this round into history.
        result = RoundResult(
            story_id=story.id,
            story_title=story.title,
            votes=dict(self.votes),
            vote_names={
                uid: self.users[uid].name
                for uid in self.votes
                if uid in self.users
            },
            average=stats["average"],
            median=stats["median"],
            lowest=stats["lowest"],
            highest=stats["highest"],
            consensus=stats["consensus"],
            suggested=stats["suggested"],
            final_estimate=final_estimate,
        )
        self.history.append(result)

        # Auto-advance to the next pending story if available.
        self._advance_to_next_pending()
        return True

    def _advance_to_next_pending(self) -> None:
        nxt = next(
            (s for s in self.stories if s.status == StoryStatus.PENDING), None
        )
        if nxt:
            self.set_current_story(nxt.id)
        else:
            self._reset_round_state()
            self.current_story_id = None

    # ----------------------------------------------------------------- #
    # Serialisation -> the full state snapshot pushed to clients
    # ----------------------------------------------------------------- #
    def snapshot(self, include_votes: bool = False) -> dict:
        voted_ids = set(self.votes.keys())

        stats = self.compute_stats() if self.revealed else None

        return {
            "room": {
                "id": self.id,
                "name": self.name,
                "team": self.team,
                "admin_id": self.admin_id,
                "created_at": self.created_at,
            },
            "users": [
                u.to_public(has_voted=(u.id in voted_ids))
                for u in sorted(
                    self.users.values(), key=lambda x: (not x.is_admin, x.joined_at)
                )
            ],
            "stories": [s.to_public() for s in self.stories],
            "current_story_id": self.current_story_id,
            "revealed": self.revealed,
            # Votes are only ever exposed once revealed.
            "votes": dict(self.votes) if self.revealed else {},
            "vote_names": (
                {
                    uid: self.users[uid].name
                    for uid in self.votes
                    if uid in self.users
                }
                if self.revealed
                else {}
            ),
            "stats": stats,
            "timer_remaining": self.timer_remaining(),
            "timer_auto_reveal": self.timer_auto_reveal,
            "history": [h.to_public() for h in self.history],
            "estimated_count": sum(
                1 for s in self.stories if s.status == StoryStatus.ESTIMATED
            ),
            "pending_count": sum(
                1 for s in self.stories if s.status != StoryStatus.ESTIMATED
            ),
        }
