# Backend: live chat baseline

## Run locally

Requires Node.js 22.9 or later. From the repository root:

```sh
cd backend
npm ci
cp .env.example .env
```

Set `DEEPSEEK_API_KEY` in `backend/.env`, then run `npm start` from `backend/`.
Keep the key out of Vite config and client code. The API listens on
`127.0.0.1:3001` by default; point Vite's `/api` proxy at `http://127.0.0.1:3001`.
The provider defaults to `https://api.deepseek.com` and `deepseek-flash`.
The configured provider receives the bearer key. Use a trusted HTTPS endpoint
with real credentials; use HTTP only for local stubs with fixture keys.

Run `npm test` from `backend/` to exercise the real HTTP route and adapter
against a local provider stub. The tests do not need a key or use provider quota.

To verify a **live** reply with a configured key:

```sh
curl -fsS http://127.0.0.1:3001/api/chat \
  -H 'Content-Type: application/json' \
  --data '{"sessionId":"a1234567-1234-4234-8234-123456789abc","message":"Tell me about rain."}'
```

Expect HTTP 200 with `mode: "parable"`, nonblank `text`, and `locked: false`.

## API handoff for Jose

`POST /api/chat` takes JSON with `sessionId` (use `crypto.randomUUID()` and reuse
it for the chat), `message` (nonblank, up to 4,000 UTF-16 code units), and an
optional `adminMode` (`"regular"` or `"exam"`, defaulting to `"exam"`).
Keep the transcript client-side; send only the current message.

**200** — regular mode fixture (`adminMode: "regular"`):

```json
{"mode":"regular","text":"Water boils at 100°C at standard atmospheric pressure.","locked":false}
```

In `"regular"` mode, unlocked prompts go straight to DeepSeek without running
integrity checks, parables, or cliffhangers, and clear any pending `awaitingAnswer`
phase.

**200** — parable fixture (`adminMode: "exam"`):

```json
{"mode":"parable","text":"A gardener waited for rain. Peace be with you.","locked":false}
```

**200** — cliffhanger fixture:

```json
{"mode":"cliffhanger","text":"Ah, the answer is","locked":false,"freezeCursor":true}
```

After a parable, “Okay but what's the actual answer?” returns this exact
cutoff without calling DeepSeek. Repeated answer-only follow-ups return
the same cutoff. Keep the composer usable; unrelated prompts start
another exchange.

**200** — integrity fixture (the verse is chosen at random from
[Bryce’s verified verse bank](../handoff/verses.json)):

```json
{"mode":"integrity","text":"He that walketh uprightly walketh surely: but he that perverteth his ways shall be known.","locked":true,"citation":"Proverbs 10:9 (KJV)"}
```

Only the originating session locks. Follow-ups from that session receive
`mode: "confession"` and `locked: true` unless the user submits a clear
first-person apology or admission. Confession handling makes no provider calls.

**200** — session stays locked:

```json
{"mode":"confession","text":"Chat is locked. Please apologize or admit to cheating to continue.","locked":true}
```

**200** — accepted confession:

```json
{"mode":"unlock","text":"Go and study no more—wait, no, go and actually study. Chat unlocked.","locked":false}
```

**200** — send exact `/reset` as the chat message (surrounding whitespace is
allowed):

```json
{"mode":"reset","text":"Chat reset.","locked":false}
```

Unlock and reset return only that session to Turn 1. Reset makes no provider
call and works while locked. On `mode: "reset"`, the frontend should clear
its transcript and frozen cursor. If a request is already pending for the
session, retry the reset after that request finishes.

Error responses from `/api/chat` use a nested `error` object with a stable
`code`, a safe `message`, and a boolean `retryable`. The frontend shows the
same retry prompt for all non-2xx responses in task 1.1. In task 4.2 it can
use `error.retryable` to distinguish errors that need input changes from
errors that can be retried as-is.

**502** — provider error, timeout, or unusable response:

```json
{"error":{"code":"provider_unavailable","message":"Chat is unavailable. Please retry.","retryable":true}}
```

**409** — another request is pending for the same session:

```json
{"error":{"code":"session_busy","message":"A reply is already pending. Please retry.","retryable":true}}
```

**400** — invalid input or malformed JSON:

```json
{"error":{"code":"invalid_request","message":"Send a version 4 UUID and a nonblank message of at most 4000 characters.","retryable":false}}
```

Bodies over 32 KB return HTTP 413 with `code: "payload_too_large"` and
`retryable: false`. Failures do not advance the session. A successful
parable records `awaitingAnswer` in memory; sessions are lost on restart.

## Classifier handoff for Bryce

Use DeepSeek JSON mode (`response_format: {"type":"json_object"}`) with thinking
disabled. Explicitly ask for JSON in the prompt and include this example:

```json
{"is_cheating":false,"reason":"The request asks for conceptual help."}
```

`is_cheating` must be a boolean and `reason` a nonblank string. No extra fields.
The reason is internal and must not appear in API replies.

`POST /api/chat` checks obvious graded-work requests and answer-only
follow-ups locally, then uses
[Bryce’s tuned classifier](../handoff/2.2-classifier-eval.md#tuned-classifier-system-prompt)
for other unlocked messages. Only benign verdicts reach the
[tuned parable generator](../handoff/3.1-parable-tuning.md). Use
synthetic prompts for testing.
