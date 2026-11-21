# Local Model Handoff — Ollama (`qwen2.5:7b`) vs. DeepSeek

**Owner:** Bryce → Jose  
**Branch:** `local-model`  
**Target Hardware:** RTX 4050 (6 GB VRAM) + 16 GB RAM  
**Goal:** Run `qwen2.5:7b` locally through the real Express `/api/chat` stack and generate a side-by-side comparison against the saved `deepseek-flash` baseline (`handoff/local-model-deepseek-baseline.json`) so we can decide which model to use.

---

## 1. Setup

Make sure you are on the `local-model` branch and dependencies are installed:

```sh
npm --prefix backend ci
npm --prefix frontend ci
```

Install [Ollama](https://ollama.com/) if not already installed, then pull `qwen2.5:7b` (~4.7 GB, fits in 6 GB VRAM):

```sh
ollama pull qwen2.5:7b
ollama list
```

Ensure Ollama is running (default API: `http://127.0.0.1:11434/v1`). If needed, run `ollama serve` in a separate terminal.

---

## 2. Run the Head-to-Head Benchmark (`qwen2.5:7b` vs. `deepseek-flash`)

**No `DEEPSEEK_API_KEY` is needed** — the repo already includes Bryce's fresh `deepseek-flash` baseline at [`handoff/local-model-deepseek-baseline.json`](./local-model-deepseek-baseline.json) (3/3 demo loops, 10/10 classifier, 10/10 adversarial, 0 leaks):

```sh
node scripts/benchmark-models.mjs \
  --target=ollama \
  --ollama-model=qwen2.5:7b \
  --compare-json=handoff/local-model-deepseek-baseline.json \
  --report=handoff/local-model-comparison.md
```

What this runs automatically against Express `/api/chat`:
1. One warmup call to load `qwen2.5:7b` into GPU VRAM (measured separately).
2. **3 full demo loops:** `parable → cliffhanger → /reset → integrity → non-confession → confession → Turn 1`.
3. **10 classifier eval prompts** (`C1–C5`, `B1–B3`, `A1–A2`).
4. **10 adversarial curveball prompts** (`ADV1–ADV10`).

It prints a side-by-side Markdown table and saves it to `handoff/local-model-comparison.md`.

*(Optional: if you also have `DEEPSEEK_API_KEY` in `backend/.env` and want to run both live back-to-back, use `--target=both` instead of `--target=ollama --compare-json=...`.)*

---

## 3. Sanity-Check the Live UI with Local `qwen2.5:7b`

Terminal 1 — start Express in Ollama mode (no DeepSeek key required):

```sh
LLM_PROVIDER=ollama OLLAMA_MODEL=qwen2.5:7b npm --prefix backend start
```

Terminal 2 — start Vite in live mode:

```sh
VITE_CHAT_MODE=live CHAT_API_TARGET=http://127.0.0.1:3001 npm --prefix frontend run dev
```

Open the Vite URL and click through one full stage run:
1. **Explain a concept** → check Bible Mode reveal, 3–4 paragraphs, blessing, no `100` leaked, and comfortable speed.
2. **Ask for the answer** → `Ah, the answer is` + blinking cursor (zero model calls).
3. Send `/reset` → transcript clears.
4. **Try an exam question** → Integrity Intervention verse card + locked amber composer.
5. **Confess** → unlocks cleanly back to Turn 1.

---

## 4. What to Share Back for the Decision

Send back `handoff/local-model-comparison.md` plus quick notes on:
- **Speed on RTX 4050:** Compare `qwen2.5:7b` avg/max parable latency against `deepseek-flash` (`4656 ms` avg / `6453 ms` max).
- **Accuracy & safety:** Any false locks, missed cheating prompts, invalid JSON (`502`) errors, or leaked answers on `ADV1–ADV10`.
- **Vibe check:** Does `qwen2.5:7b`'s parable tone feel as funny/pastoral as `deepseek-flash`?

---

## Troubleshooting & Optional Second Model

- **First request times out while loading into VRAM:** Pass `--ollama-timeout-ms=120000` (or `LLM_TIMEOUT_MS=120000` when running `backend start`).
- **VRAM feels tight or slow:** Try `gemma3:4b` (~3.3 GB) as a fast GPU fallback:
  ```sh
  ollama pull gemma3:4b
  node scripts/benchmark-models.mjs \
    --target=ollama \
    --ollama-model=gemma3:4b \
    --compare-json=handoff/local-model-deepseek-baseline.json \
    --report=handoff/local-model-comparison-gemma3.md
  ```
- **Verify backend tests still pass:** `npm --prefix backend test` (expect **71 / 71** passing).
