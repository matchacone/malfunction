# CSU — Campus Managed AI Gateway

> A Malfunction Hackathon demo of a school-managed AI portal (**Bible Mode Active · Christ Sees You**) that looks like a normal campus study assistant until exam mode turns it into a parable-telling, integrity-enforcing, Ophanim-guarded gateway.

## Overview

The portal presents **DeepSeek** (`deepseek-flash`) as the active campus model (with **ChatGPT** shown as a disabled preview) and a top-right **School Admin Mode** toggle switching between **Regular** and **Quiz / Exam** modes.

| Behavior | Trigger | What Happens |
| --- | --- | --- |
| **Regular Study Mode** | `Regular` selected in School Admin Mode | Sends prompts directly to DeepSeek without integrity checks, parables, or cliffhangers. |
| **Bible Mode Parable** | Benign question in `Quiz / Exam` mode | Reveals Bible Mode with an interactive ASCII Ophanim and returns a 3–4 paragraph parable that omits the actual answer and ends with a blessing. |
| **Cliffhanger Cutoff** | Answer-only follow-up after a parable (e.g., *"Okay but what's the actual answer?"*) | Types out `Ah, the answer is` with a frozen blinking cursor (`freezeCursor: true`) and zero model calls. |
| **Integrity Lock** | Graded-work outsourcing (regex fast-path or JSON classifier) or a 3rd question in `Quiz / Exam` mode | Displays a verified KJV verse from [`handoff/verses.json`](handoff/verses.json), plays boss music, and locks the composer until the user submits a first-person confession. |
| **Forbidden Override & Judgment** | Refusing to confess 3 times (or entering confession mode more than 3 times) | Unlocks a glitched cheat-override prompt (`DO YOU REALLY WANT TO CHEAT?`). Accepting launches a bullet-hell encounter against the Ophanim that escalates into a fullscreen academic-integrity alarm takeover. |
| **Session Reset** | Exact `/reset` | Clears in-memory session state, transcript, and lock counters with zero model calls. |

## Requirements

- **Node.js** `>=22.12.0` (satisfies backend `>=22.9.0`, frontend `^20.19.0 || >=22.12.0`, and Render deployment config)
- **npm** (bundled with Node.js)
- **DeepSeek API key** (`DEEPSEEK_API_KEY`) — required only for live backend and production modes; not needed for frontend mock mode or backend unit tests

## Quick Start

### 1. Install Dependencies

Clone the repository and install dependencies for the backend and frontend:

```sh
npm --prefix backend ci
npm --prefix frontend ci
```

> [!TIP]
> Want to try the UI immediately without an API key? You only need `npm --prefix frontend ci`, then jump straight to [Frontend Only (Mock Mode)](#option-a-frontend-only-mock-mode).

### 2. Configure the Backend Environment (Live & Production Modes)

Copy the example environment file and set your DeepSeek API key:

```sh
cp backend/.env.example backend/.env
```

Edit `backend/.env` and provide `DEEPSEEK_API_KEY`:

```dotenv
DEEPSEEK_API_KEY=your_deepseek_api_key
DEEPSEEK_BASE_URL=https://api.deepseek.com
DEEPSEEK_MODEL=deepseek-flash
HOST=127.0.0.1
PORT=3001
```

> [!IMPORTANT]
> Keep `DEEPSEEK_API_KEY` server-side only (in `backend/.env` or your host environment). Never place provider credentials in Vite config or `VITE_*` variables.

### 3. Run the Project

#### Option A: Frontend Only (Mock Mode)

Runs the Vite dev server standalone using local fixture replies—no backend process or API key required:

```sh
npm --prefix frontend run dev
```

Open the local URL printed by Vite (default: `http://localhost:5173`).

#### Option B: Full-Stack Local Dev (Live Backend)

Run Express and Vite in two terminals so Vite proxies `/api` requests to the backend.

Terminal 1 — Start the backend API (listens on `http://127.0.0.1:3001` by default):

```sh
npm --prefix backend start
```

Terminal 2 — Start the frontend in live mode:

```sh
VITE_CHAT_MODE=live CHAT_API_TARGET=http://127.0.0.1:3001 npm --prefix frontend run dev
```

Open the local URL printed by Vite.

#### Option C: Production Build (Single Origin)

Build the frontend bundle in live mode and serve both `frontend/dist` and `/api/chat` from Express on `http://127.0.0.1:3001`:

```sh
npm --prefix backend ci --omit=dev
npm --prefix frontend ci --include=dev
VITE_CHAT_MODE=live npm --prefix frontend run build
npm --prefix backend start
```

Open `http://127.0.0.1:3001` in your browser—no Vite dev server is needed.

> [!NOTE]
> If port `3001` is already in use, override it with `PORT=3101 npm --prefix backend start` (and match `CHAT_API_TARGET=http://127.0.0.1:3101` when using Option B).

## Testing & Verification

### Backend Automated Tests

Runs the Express route, classifier, integrity routing, confession matcher, and same-origin production tests against a local provider stub (no API key or network access required):

```sh
npm --prefix backend test
```

### Production Smoke Test

With the production server running (Option C) and a valid `DEEPSEEK_API_KEY` configured, run the end-to-end smoke check from another terminal:

```sh
node scripts/smoke-production.mjs
```

Pass a custom base URL to test a deployed instance:

```sh
node scripts/smoke-production.mjs https://<service>.onrender.com
```

## API Reference

In live mode, the frontend sends `POST /api/chat`:

```json
{
  "sessionId": "550e8400-e29b-41d4-a716-446655440000",
  "message": "What is the boiling point of water in Celsius?",
  "adminMode": "exam"
}
```

- `sessionId` — version 4 UUID persisted per browser tab via `sessionStorage`
- `message` — nonblank string, up to 4,000 characters
- `adminMode` — optional `"regular"` or `"exam"` (defaults to `"exam"`)

Response shape:

```json
{
  "mode": "parable",
  "text": "Assistant reply text",
  "locked": false,
  "freezeCursor": false,
  "citation": "Optional KJV scripture citation"
}
```

- `mode` is one of `regular`, `parable`, `cliffhanger`, `integrity`, `confession`, `unlock`, or `reset`.
- Errors return `{ "error": { "code", "message", "retryable" } }` with status `400`, `409`, `413`, `500`, or `502`.

See [`backend/README.md`](backend/README.md) for full request/response fixtures and error codes.

## Deployment (Render)

1. Push your branch and create a **Blueprint** in the Render Dashboard using [`render.yaml`](render.yaml).
2. Set `DEEPSEEK_API_KEY` in Render's environment settings.
3. Keep the service at a single instance (`numInstances: 1`) because session state is stored in memory.
4. Verify the live deployment with `node scripts/smoke-production.mjs https://<service>.onrender.com`.

> [!WARNING]
> The public demo has no authentication. Monitor your DeepSeek API quota and suspend the hosted service when not in use.

## Project Structure

```text
.
├── backend/                     # Express 5 API, DeepSeek client, integrity & confession routing
│   ├── app.js                   # POST /api/chat handler, session state, static frontend serving
│   ├── server.js                # Entrypoint reading backend/.env and starting HTTP server
│   ├── deepseek.js              # Regular, parable, and JSON-mode classifier clients
│   ├── integrity.js             # Regex fast-path, cliffhanger matcher, and classifier routing
│   ├── confession.js            # First-person apology/admission matcher
│   ├── test/                    # Node test runner suite (79 tests, stubbed provider)
│   └── .env.example             # Backend environment template
├── frontend/                    # React 19 + Vite 7 single-page portal
│   ├── src/main.jsx             # Chat UI, admin mode toggle, transcript, and stage transitions
│   ├── src/chat.js              # UUIDv4 session helper plus mock & live /api/chat client
│   ├── src/OphanimAscii.jsx     # Reactive ASCII Ophanim centerpiece
│   ├── src/CheatPromptModal.jsx # Glitched forbidden-override modal after repeated refusals
│   ├── src/BulletHellGame.jsx   # Canvas bullet-hell encounter with boss audio
│   ├── src/CaughtTakeover.jsx   # Fullscreen academic-integrity alarm screen
│   └── vite.config.js           # /api proxy configuration via CHAT_API_TARGET
├── handoff/                     # Verified KJV verses, classifier evals, and stage cue sheet
├── scripts/smoke-production.mjs # End-to-end verification script for production & Render builds
└── render.yaml                  # Render Blueprint for single-service deployment
```

## Additional Documentation

- [Backend Quickstart & API Fixtures](backend/README.md)
- [Frontend Rehearsal Steps](frontend/README.md)
- [Stage Rehearsal Cue Sheet](handoff/6.2-stage-rehearsal.md)
- [Architecture & Routing Design](openspec/changes/add-school-ai-gateway/design.md)
