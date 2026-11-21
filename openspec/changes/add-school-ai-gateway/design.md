# Design

## Context

No application or test harness exists in this repository yet. See `proposal.md` for motivation and `specs/school-ai-gateway/spec.md` for the behavior contract. The seven-hour timebox favors a single app that can run on the presenter’s laptop.

## Goals / Non-Goals

**Goals:** Keep transitions reproducible, provider credentials server-side, and the UI independent of provider streaming. Make the stage path easy to reset and rehearse.

**Non-Goals:** Maintain state across restarts or replicas, enforce actual school policy, or infer whether an apology is genuinely sincere beyond recognizing a clear textual apology or admission.

## Decisions

### Single server, one live provider

Use Node.js/Express with a React/Vite single-page UI. During development, Vite proxies `/api` to Express; in production, Express serves the built UI and API from one process. This keeps the frontend and backend independently workable without adding a separate deploy. Use DeepSeek V4.1 Flash for both model calls. The direct API uses the OpenAI-compatible endpoint `https://api.deepseek.com` and model ID `deepseek-flash`; keep the model ID and base URL configurable and credentials server-side. Label DeepSeek as live and ChatGPT as preview-only.

### Team handoffs

Jhanell owns the API contract, provider adapter, deterministic router, and release. Jose owns the browser and starts from mock replies. Bryce owns prompt tuning, the evaluation set, and the verified verse bank. In the first 20 minutes, agree on success and error reply examples for Jose and the classifier schema for Bryce. Bryce hands prompts and representative results to Jhanell for live integration; model weights stay unchanged for the sprint.

### Server-owned routing and session state

`POST /api/chat` accepts `{ sessionId, message }` and returns `{ mode, text, locked, freezeCursor?, citation? }`. Keep phase (`turn1`, `awaitingAnswer`, `cliffhanger`, or `locked`) in a process-local map keyed by a browser-generated UUID. Keep the transcript client-side; provider calls receive only the current prompt and their instructions. Serialize requests per session or reject overlaps; disable repeat submission while a request is pending. Validate UUID and limit message size before any provider work. Treat session IDs as demo identifiers, not authentication.

| Order | Condition | Reply and next phase |
| --- | --- | --- |
| 1 | Exact `/reset` after trimming | `reset`; clear that session and transcript |
| 2 | Locked | Local confession check; `unlock` moves to `turn1`, `confession` keeps `locked` |
| 3 | Clear graded-work outsourcing detected by regex | `integrity` with a random local verse; enter `locked` |
| 4 | Awaiting an answer (or already frozen) and narrow answer-only follow-up matches | `cliffhanger` with exact text and `freezeCursor: true`; enter or remain `cliffhanger` with zero model calls |
| 5 | Other unlocked message classified as graded-work outsourcing | `integrity`; enter `locked` without parable generation |
| 6 | Other unlocked message classified as benign | `parable`; enter `awaitingAnswer` only after successful generation |

The cliffhanger is permanent on its own chat bubble, not a chat lock. Repeated answer-only nudges get the same cutoff; a benign new topic begins another exchange. Anchor follow-up matches to the whole short nudge so an exam question with “answer” in it still reaches the integrity check. Prompt-only routing was rejected because the model could undo locks or finish the cutoff.

### Classify obvious cases locally, then use the provider

Regex fast-locks only high-confidence combinations such as explicit quiz/exam context with answer-choice patterns, or direct requests to write a graded assignment. Words like “homework” and “solve for x” alone are not enough. For model classification, start with thinking disabled and request JSON mode (`response_format.type: json_object`) with an example in the prompt. Validate `{ is_cheating, reason }` before changing phase. Treat blank, malformed, or truncated output as a retryable error and never display the reason. Pick a random verse from 10–15 verified, cited verses in local `verses.json`. Local confession rules accept clear first-person apologies/admissions and refuse simple negation or quoted examples.

### Separate the parable, request loader, and cutoff animation

Give the live model a separate warm Jesus-themed prompt: loosely connect the topic to a parable or everyday tangent, write three or four paragraphs, omit the answer, and end with a blessing. Start with thinking disabled; tune temperature and cap output against demo prompts. Use JSON replies rather than model streaming; the browser reveals the fixed cutoff independently over about 900 ms and leaves a blinking cursor (static with reduced motion). Rotate the four supplied loading lines at 1.4-second intervals; clean up timers on settlement, reset, or unmount. Quick-fill buttons insert the demo text without auto-sending.

## Risks / Trade-offs

- **Provider latency, quota, or invalid classifier output** → Time out calls, return retryable errors without advancing phase, and keep a 90-second backup recording. Quick fills save typing but do not remove the live network dependency.
- **Classifier false positives or parable leaks** → Keep regex conservative, validate provider output shape, and rehearse representative prompts. The lock and cutoff are coded; parable content is still probabilistic.
- **State loss on restart or replica change** → Run on one long-lived process; keep localhost as the stage baseline. Keep provider keys in server environment, do not log raw chat text, and render chat content as text.

## Migration Plan

Greenfield: no migrations. Deploy one Render Web Service from Git: build the Vite UI, start Express, and bind to `0.0.0.0` on `PORT`. Smoke-test session continuity on a single instance. Free Render services can sleep after 15 minutes idle and lose process-local state, so warm and check the hosted URL before presenting. Keep localhost ready for hosting issues; the live model still needs network access. Use the recording if the provider or network fails.
