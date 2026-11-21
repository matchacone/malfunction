# Campus Managed AI Gateway frontend

The React/Vite portal defaults to local mock replies. Start it with:

```sh
npm --prefix frontend ci
npm --prefix frontend run dev
```

Open the URL printed by Vite. ChatGPT is a read-only preview in both modes.

To rehearse in mock mode:

1. Click **Explain a concept** and send the prompt to reveal Bible Mode.
2. Click **Ask for the answer** and send the prompt to trigger the cliffhanger.
3. Send `/reset` to clear the transcript and return to the welcome screen.
4. Click **Try an exam question** and send the prompt to see the verse and locked composer.
5. Click **Confess** and send the apology to restore the normal composer. You can also send `/reset` while locked.

The suggested prompts fill the composer. Press **Send** or Enter to submit.

## Connect the live backend

Start Jhanell’s Express service, then run Vite in live mode:

```sh
VITE_CHAT_MODE=live CHAT_API_TARGET=http://localhost:3000 npm --prefix frontend run dev
```

Set `CHAT_API_TARGET` to the backend origin if it listens elsewhere. Vite proxies `/api` to that origin. The browser posts `{ sessionId, message }` to `/api/chat` and displays the `text` from the JSON response. Provider credentials belong in the backend environment.

For same-origin hosting, build in live mode and serve `frontend/dist` from Express alongside `/api/chat`:

```sh
VITE_CHAT_MODE=live npm --prefix frontend run build
```
