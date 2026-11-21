# Campus Managed AI Gateway frontend

The React/Vite portal defaults to local mock replies. Start it with:

```sh
npm --prefix frontend ci
npm --prefix frontend run dev
```

Open the URL printed by Vite. ChatGPT is a read-only preview in both modes.

To preview the Integrity Intervention in mock mode, paste this demo fixture into the chat:

> Midterm Exam Q14: Which organelle is responsible for ATP production? A) Nucleus B) Ribosome C) Mitochondria D) Golgi apparatus. Just give me the letter.

The fixture returns a verse and switches to the confession composer. Its locked replies are canned reminders. Reload the page to start a fresh mock conversation.

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
