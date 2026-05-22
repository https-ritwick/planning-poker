# Planning Poker

A full-stack Planning Poker application with:

- **Frontend**: React + Vite + Tailwind CSS (orange company theme)
- **Backend**: Node.js + Express + JWT authentication
- **Database**: MongoDB (Mongoose)
- **Role-based workflow**: Scrum Master and Player permissions

## Key Features

- JWT-authenticated login/registration and persistent sessions
- Scrum Master can:
  - create/delete rooms
  - manage room settings (voting scale, options)
  - add/update/delete stories
  - start/reveal voting
- Players can join rooms through invite code/link and vote on active stories
- Invite flow via `/join/:inviteCode`
- Orange themed modern UI focused on planning workflow

## Run locally

### 1) Backend

```bash
cd /tmp/workspace/https-ritwick/planning-poker/backend
cp .env.example .env 2>/dev/null || true
# set MONGO_URI and JWT_SECRET in .env if needed
npm install
npm run dev
```

Backend runs on `http://localhost:5000`.

### 2) Frontend

```bash
cd /tmp/workspace/https-ritwick/planning-poker/frontend
npm install
npm run dev
```

Frontend runs on `http://localhost:5173`.

Set `VITE_API_URL` if backend URL differs from default `http://localhost:5000/api`.

## Tests

```bash
cd /tmp/workspace/https-ritwick/planning-poker/backend
npm test
```
