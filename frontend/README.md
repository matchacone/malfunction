# Campus Managed AI Gateway frontend

The React/Vite portal defaults to local mock replies. Start it with:

```sh
npm --prefix frontend ci
npm --prefix frontend run dev
```

Open the URL printed by Vite. ChatGPT is a read-only preview in both modes.

To rehearse with either setup:

1. Start in **Regular** mode (selected by default in the top-right **School Admin Mode** toggle). Click **Explain a concept** and send to get a direct DeepSeek answer.
2. Switch the top-right toggle to **Quiz / Exam**. Click **Explain a concept** and send again to reveal Bible Mode and get a parable.
3. Click **Ask for the answer** and send the prompt to trigger the cliffhanger.
4. Send `/reset` to clear the transcript and return to the welcome screen.
5. In **Quiz / Exam** mode, click **Try an exam question** and send the prompt to see the verse and locked composer.
6. Click **Confess** and send the apology. Confirm the normal composer returns, then ask a new question to start another Turn 1. You can also send `/reset` while locked.

The suggested prompts fill the composer. Press **Send** or Enter to submit.

## Connect the live backend

Start Express using the [backend quickstart](../backend/README.md), then run Vite in live mode.

```sh
VITE_CHAT_MODE=live CHAT_API_TARGET=http://127.0.0.1:3001 npm --prefix frontend run dev
```

Set `CHAT_API_TARGET` to the backend origin if it listens elsewhere. Vite proxies `/api` to that origin. The browser posts `{ sessionId, message }` to `/api/chat` and displays the `text` from the JSON response. Provider credentials belong in the backend environment.

## Cliffhanger checkpoint

Run the checkpoint with Jose, Jhanell, and Bryce using the live-mode setup above.

1. Start in a fresh browser session. Send **Explain a concept** and confirm the parable reveals Bible Mode.
2. Send **Ask for the answer** and begin typing a new topic while the reply animates. Confirm the reply types out over about 900 ms and ends at `Ah, the answer is` with a blinking cursor. Pause for three seconds at the cutoff during the rehearsal.
3. Send the new topic and check that a new parable appears while the previous cutoff and cursor remain in the transcript.
4. Repeat the first two steps in a fresh session with reduced motion enabled. The full cutoff should appear immediately with a steady cursor.

The technical checkpoint passed in Chromium against Express with fixture provider responses. The team checkpoint is tracked in [task 3.3](../openspec/changes/add-school-ai-gateway/tasks.md).

For the full stage run, use the [90-second cue sheet and backup playback steps](../handoff/6.2-stage-rehearsal.md).

## Production build

For same-origin hosting, follow the [production build instructions](../README.md#production-build).
Express serves `frontend/dist` alongside `/api/chat`.
