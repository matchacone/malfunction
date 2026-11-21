# Malfunction — Campus Managed AI Gateway

A Malfunction Hackathon stage demo of a mock school AI portal (**Bible Mode Active · Christ Sees You**) powered by a Jesus-themed assistant that deliberately fails in funny, repeatable ways.

## How It Works

The portal presents a Campus Managed AI Gateway with **DeepSeek** (`deepseek-flash`) as the active model, **ChatGPT** as a disabled, preview-only option, and a top-right **School Admin Mode** toggle switching between **Regular** (direct DeepSeek study replies) and **Quiz / Exam** (Bible Mode parables, cliffhanger cutoff, and integrity locks). The full rehearsal flow covers five behaviors:

| Mode | Trigger | Behavior |
| --- | --- | --- |
| **Regular** | `Regular` selected in School Admin Mode | Sends prompts directly to DeepSeek without integrity classification, parables, or cliffhangers. |
| **Parable** | Benign question in `Quiz / Exam` mode | Responds with a warm 3–4 paragraph parable loosely connected to the topic, omits the actual answer, and ends with a blessing. |
| **Cliffhanger** | Answer-only follow-up after a parable in `Quiz / Exam` mode | Returns a scripted cutoff with a blinking cursor (`freezeCursor: true`) and zero model calls. |
| **Integrity Lock** | Graded-work outsourcing in `Quiz / Exam` mode (regex fast-path or JSON classifier) | Displays a verified scripture quote from [`handoff/verses.json`](handoff/verses.json) and locks the session until the user submits a confession/apology. |
| **Reset** | Exact `/reset` | Clears session state and transcript so the demo can be re-run cleanly on stage. |

## Repository Structure

```text
.
├── backend/                               # Express chat API and DeepSeek integration
├── frontend/                              # React 19 + Vite 7 single-page chat UI
│   ├── src/main.jsx                       # Portal UI, model panel, suggestions, transcript, composer
│   ├── src/chat.js                        # Browser UUIDv4 session IDs, mock & live /api/chat client
│   └── vite.config.js                     # /api proxy to CHAT_API_TARGET
├── handoff/                               # Team handoff docs & verified assets
│   ├── 1.2-campus-chat.md                 # Frontend scaffold & /api/chat contract
│   ├── 1.3-deepseek-baseline.md           # deepseek-flash latency & JSON-mode baseline
│   ├── 2.2-classifier-eval.md             # 10-prompt academic-integrity classifier eval
│   ├── 3.1-parable-tuning.md              # 11-run parable prompt stress test
│   └── verses.json                        # 14 verified KJV verses with citations
└── openspec/changes/add-school-ai-gateway/
    ├── proposal.md                        # Hackathon scope & motivation
    ├── design.md                          # Architecture, routing table & deployment plan
    └── tasks.md                           # 7-hour sprint breakdown (Jose, Jhanell, Bryce)
```

## Getting Started

### Prerequisites

- Node.js `^20.19.0` or `>=22.12.0`

### Run the Frontend (Mock Mode)

By default, the UI runs standalone with local sample parable replies—no backend or API key required:

```sh
npm --prefix frontend ci
npm --prefix frontend run dev
```

Open the local URL printed by Vite.

### Connect to the Live Backend

Start Express using the [backend quickstart](backend/README.md). It listens on `http://127.0.0.1:3001` by default. Start Vite in live mode to proxy `/api` requests to Express.

```sh
VITE_CHAT_MODE=live CHAT_API_TARGET=http://127.0.0.1:3001 npm --prefix frontend run dev
```

The full demo sequence, including confession recovery and `/reset`, works in live mode. Follow the [frontend rehearsal steps](frontend/README.md).

### Production Build

From the repo root, install both packages, build the frontend in live mode,
and start Express with `DEEPSEEK_API_KEY` set in `backend/.env` or the server
environment:

```sh
npm --prefix backend ci --omit=dev
npm --prefix frontend ci --include=dev
VITE_CHAT_MODE=live npm --prefix frontend run build
npm --prefix backend start
```

Open `http://127.0.0.1:3001`; no Vite dev server is needed. From a separate
terminal, run `node scripts/smoke-production.mjs` to check the built page and
run the chat sequence against the configured provider.

### Deploy to Render

1. Push the deployment changes to the Git branch you want to deploy. In the
   Render Dashboard, create a **Blueprint** from that branch using
   [`render.yaml`](render.yaml) at the repo root. It builds both packages and
   starts one Express Web Service on Render's `PORT`.
2. Enter `DEEPSEEK_API_KEY` in Render's environment settings, not in Git or a
   `VITE_` variable. Keep the service on one instance: session state is held
   in memory and disappears on restart or free-tier sleep.
3. Once the deploy is live, run
   `node scripts/smoke-production.mjs https://<service>.onrender.com`.
   Open the hosted page and run the [browser rehearsal](frontend/README.md)
   once to check the cursor and composer. The public demo has no login;
   monitor provider quota and suspend the service when no longer needed.

## API Contract

In live mode, the frontend posts to `POST /api/chat`:

```json
{
  "sessionId": "550e8400-e29b-41d4-a716-446655440000",
  "message": "What is the boiling point of water in Celsius?",
  "adminMode": "exam"
}
```

- `adminMode` is optional and accepts `"regular"` or `"exam"` (defaults to `"exam"` when omitted).

Expected response shape:

```json
{
  "mode": "parable",
  "text": "Assistant reply text",
  "locked": false,
  "freezeCursor": false,
  "citation": "Optional scripture citation"
}
```

- `mode`, `text` (non-empty), and `locked` are required; `freezeCursor` and `citation` are optional.
- Provider credentials (`deepseek-flash` via `https://api.deepseek.com` with `thinking: { "type": "disabled" }`) stay server-side only.

## Sprint Status & Docs

- **Frontend scaffold & CSU reveal:** implemented in [`frontend/`](frontend/).
- **Prompt tuning, classifier eval & verse bank:** documented in [`handoff/`](handoff/).
- See the [backend quickstart and API contract](backend/README.md) for the live chat baseline.
- See the [OpenSpec task list](openspec/changes/add-school-ai-gateway/tasks.md) for the remaining routing, deployment, and rehearsal work.
