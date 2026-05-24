# EXL Planning Poker — Sprint Grooming Tool

A complete, production-style **Planning Poker / Sprint Grooming** web application built for EXL internal sprint estimation meetings.

- **Frontend:** Angular 17 (standalone components + signals)
- **Backend:** Python / FastAPI with WebSockets
- **Storage:** 100% in-memory (no database) — state lives for the lifetime of the server process
- **Theme:** EXL-inspired orange & white, enterprise-grade, responsive, light/dark toggle

Real-time voting, hidden votes until reveal, story backlog management, result analysis (average / median / consensus / suggested estimate / distribution chart), voting timer with auto-reveal, observer role, JSON/CSV export, meeting summary, and session history — all working at runtime.

---

## 1. Folder Structure

```
planning-poker/
├── README.md
├── .gitignore
│
├── backend/                        # FastAPI + WebSocket server
│   ├── requirements.txt
│   └── app/
│       ├── __init__.py
│       ├── main.py                 # FastAPI app: REST routes + /ws WebSocket + timer watcher + exports
│       ├── models.py               # Enums, Pydantic request schemas, domain dataclasses (User/Story/RoundResult)
│       ├── room.py                 # Room aggregate: voting, stats, reveal/reset, finalize, snapshot()
│       └── store.py                # In-memory RoomStore + WebSocket ConnectionManager (singletons)
│
└── frontend/                       # Angular 17 single-page app
    ├── package.json
    ├── angular.json
    ├── tsconfig.json
    ├── tsconfig.app.json
    ├── proxy.conf.json             # Proxies /api and /ws to localhost:8000 during dev
    └── src/
        ├── index.html
        ├── main.ts                 # bootstrapApplication (router, http, animations)
        ├── styles.css              # Global EXL theme: CSS variables, utilities, dark-mode overrides
        ├── environments/
        │   ├── environment.ts
        │   └── environment.development.ts
        └── app/
            ├── app.component.ts     # Root: <router-outlet> + <app-toast>
            ├── app.routes.ts        # '' & 'join/:roomId' -> Landing, 'room/:roomId' -> Room
            ├── core/
            │   ├── models/models.ts          # TS interfaces mirroring backend snapshot + label maps
            │   └── services/
            │       ├── api.service.ts         # All REST wrappers
            │       ├── ws.service.ts          # WebSocket: auto-reconnect, heartbeat, snapshot$ / status$
            │       ├── session.service.ts     # Signal store: identity, snapshot, theme, computed me/isAdmin/...
            │       └── toast.service.ts        # Toast notification signal store
            ├── components/
            │   ├── toast/                      # Bottom-right toast stack
            │   ├── voting-cards/               # Fibonacci card deck
            │   ├── participants-panel/         # Live participant list + vote status
            │   ├── story-panel/                # Current story detail
            │   ├── story-list/                 # Backlog with admin actions
            │   ├── admin-controls/             # Reveal/Reset/Revote + timer
            │   └── results-summary/            # Stats, distribution chart, finalize picker
            └── pages/
                ├── landing/                    # Create / Join session (split-panel)
                └── room/                       # Main estimation dashboard
```

---

## 2. Prerequisites

| Tool | Version |
|------|---------|
| Python | 3.10+ |
| Node.js | 18.19+ or 20+ (Angular 17 requirement) |
| npm | 9+ |

---

## 3. Running the Application

The app has **two processes**: the FastAPI backend (port `8000`) and the Angular dev server (port `4200`). Run them in two terminals.

### 3a. Backend

```bash
cd backend
python -m venv .venv

# activate the venv
source .venv/bin/activate          # macOS / Linux
# .venv\Scripts\activate           # Windows (PowerShell)

pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```

The API is now live at `http://localhost:8000`. Quick check: `http://localhost:8000/api/health` → `{"status":"ok"}`. Interactive API docs are auto-generated at `http://localhost:8000/docs`.

### 3b. Frontend

```bash
cd frontend
npm install
npm start            # = ng serve --proxy-config proxy.conf.json
```

Open **`http://localhost:4200`**. The dev server proxies `/api/*` and `/ws/*` to the backend on port 8000, so no CORS or URL config is needed during development.

### 3c. Quick start (a real estimation round)

1. On the landing page, **Create Session** — enter a session name, your name, and team. You become the **Scrum Master (Admin)**.
2. Click **Invite** in the top bar to copy the shareable link, and send it to your team. They open it, enter a name and pick a role (Developer / Tester / Business Analyst / Observer), and join.
3. As admin, **Add a story** (title, description, acceptance criteria, priority, optional Jira ID) and **activate** it.
4. Everyone selects a Fibonacci card. Votes stay hidden — you only see *who* has voted.
5. Admin clicks **Reveal**. The results panel shows every vote, average, median, high/low, consensus, a distribution chart, and a suggested estimate.
6. Admin **finalizes** the estimate (accept suggested or pick manually). The story is marked *estimated* and the app auto-advances to the next pending story.
7. **Revote / Reset** to run another round; **Meeting Summary** shows session history; **Export** downloads JSON or CSV.

---

## 4. Dependencies

### Backend (`backend/requirements.txt`)
- `fastapi` — web framework & routing
- `uvicorn[standard]` — ASGI server (with `websockets`, `httptools`)
- `pydantic` — request validation
- `websockets` — WebSocket protocol support
- `python-multipart` — form parsing support

### Frontend (`frontend/package.json`)
- `@angular/*` 17.3 (core, common, router, forms, platform-browser, animations)
- `rxjs`, `zone.js`, `typescript`
- `@angular/cli`, `@angular-devkit/build-angular` (dev)

---

## 5. How the System Works

### Real-time model
The backend keeps every session as an in-memory **`Room`** aggregate inside a process-wide `RoomStore`. When anything changes (a vote, a reveal, a new story, a timer tick), the server builds a **snapshot** — a single authoritative JSON object describing the whole room — and **broadcasts it over WebSocket** to every connected client. The Angular app never patches state piecemeal; it simply replaces its local snapshot signal with whatever the server sent. This "server-authoritative full-snapshot" approach keeps all participants perfectly in sync and makes the client logic simple and bug-resistant.

### Hidden votes
Individual vote values are **never sent to clients while a round is open** — the snapshot only includes a `has_voted` flag per user. Vote values are added to the snapshot **only after the admin reveals**. This means votes can't be sniffed from network traffic before reveal. The client shows an optimistic "you voted" state locally so the current user sees their own selection immediately.

### Voting flow
Votes travel over the **WebSocket** (not REST) for lowest latency. The `Room.cast_vote` method rejects observers, invalid cards, and votes cast after a reveal. On reveal, `compute_stats` builds the distribution, average, median, lowest/highest, a consensus flag (all numeric voters agree), and a **suggested estimate** — strict majority value if one exists, otherwise the nearest Fibonacci card to the average.

### Timer & auto-reveal
When the admin starts a timer, the backend spawns an `asyncio` background task that ticks every second, broadcasting the remaining time, and (if auto-reveal is enabled) reveals automatically when it hits zero.

### Identity & reconnection
There is **no authentication** by design. Identity (room ID, user ID, name, role) is stored in `localStorage`, so a refresh keeps the user in their seat. The WebSocket service auto-reconnects with exponential backoff and sends a heartbeat ping, so transient network drops recover gracefully and the "Live / Reconnecting" indicator reflects connection status.

### Exports & history
Each finalized story is snapshotted into the room's `history`. The Meeting Summary modal renders that history, and `/api/rooms/{id}/export.json` / `export.csv` stream a downloadable session summary.

---

## 6. Assumptions Made

- **No authentication / no database** — as specified. All state is in-memory and is lost when the backend process restarts. This is appropriate for a single-meeting internal tool.
- **Single backend instance** — because state is in-process memory, the app runs as one Uvicorn process. Horizontal scaling would require shared state (e.g. Redis), which is intentionally out of scope.
- **Anyone with the room ID can join.** Joiners choose their own role but **cannot self-assign Admin** — only the session creator is admin. This matches a trusted internal-network use case.
- **Suggested estimate logic:** a strict majority vote wins; otherwise the average is snapped to the nearest Fibonacci card. Non-numeric cards (`?`, `Coffee`) and observers are excluded from numeric stats.
- **Observers** are blocked from voting on the server side, not just hidden in the UI.
- **Light (orange/white) theme is the default**; dark mode is an opt-in toggle persisted in `localStorage`.

---

## 7. Production Notes (beyond this deliverable)

For a real internal deployment you would typically: build the frontend with `npm run build` and serve the static `dist/` from a CDN or from FastAPI itself; run Uvicorn behind a process manager / reverse proxy (e.g. Nginx) with TLS so WebSockets use `wss://`; and introduce shared state (Redis) if more than one backend instance is needed. The current build is verified to compile and run cleanly for single-instance internal use.
