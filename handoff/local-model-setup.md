# Local Model Branch (`local-model`) — Ollama (`qwen2.5:7b`) vs. DeepSeek

This branch adds local Ollama support to the backend and a head-to-head benchmark comparing **`qwen2.5:7b`** (target GPU: RTX 4050 6 GB VRAM) against **`deepseek-flash`** across the full integrated `/api/chat` stack.

## 1. Pull the Model on Ollama (RTX 4050)

```sh
ollama pull qwen2.5:7b
```

Verify Ollama is serving locally (`http://127.0.0.1:11434/v1`).

## 2. Run the App Locally with `qwen2.5:7b`

No `DEEPSEEK_API_KEY` is required in Ollama mode:

```sh
LLM_PROVIDER=ollama OLLAMA_MODEL=qwen2.5:7b npm --prefix backend start
```

In a second terminal (live frontend pointing at Express):

```sh
VITE_CHAT_MODE=live CHAT_API_TARGET=http://127.0.0.1:3001 npm --prefix frontend run dev
```

*(You can also try other RTX 4050-friendly models by swapping `OLLAMA_MODEL=gemma3:4b`, `llama3.2:3b`, `phi4-mini`, etc.)*

## 3. Run the Head-to-Head Benchmark (`qwen2.5:7b` vs. `deepseek-flash`)

### Option A — Compare against the saved DeepSeek baseline (no DeepSeek key needed)

```sh
node scripts/benchmark-models.mjs \
  --target=ollama \
  --ollama-model=qwen2.5:7b \
  --compare-json=handoff/local-model-deepseek-baseline.json \
  --report=handoff/local-model-comparison.md
```

### Option B — Run both live side-by-side (requires `DEEPSEEK_API_KEY` in `backend/.env`)

```sh
node scripts/benchmark-models.mjs \
  --target=both \
  --ollama-model=qwen2.5:7b \
  --report=handoff/local-model-comparison.md
```

The benchmark runs all **3 full demo loops**, **10 classifier eval prompts (`C1–C5`, `B1–B3`, `A1–A2`)**, and **10 adversarial curveballs (`ADV1–ADV10`)** through the real Express `/api/chat` route and writes a side-by-side Markdown comparison table to `handoff/local-model-comparison.md`.
