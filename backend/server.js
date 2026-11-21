import { fileURLToPath } from 'node:url';
import { createApp } from './app.js';
import { createDeepSeekClassifier, createDeepSeekClient } from './deepseek.js';

const provider = (process.env.LLM_PROVIDER || 'deepseek').trim().toLowerCase();
const isOllama = provider === 'ollama';

let providerOptions;
if (isOllama) {
  providerOptions = {
    apiKey: process.env.OLLAMA_API_KEY?.trim() || undefined,
    baseUrl: process.env.OLLAMA_BASE_URL?.trim() || 'http://127.0.0.1:11434/v1',
    model: process.env.OLLAMA_MODEL?.trim() || 'qwen2.5:7b',
    timeoutMs: Number(process.env.LLM_TIMEOUT_MS || 60_000),
    disableThinking: false,
  };
} else if (provider === 'deepseek') {
  const apiKey = process.env.DEEPSEEK_API_KEY?.trim();
  if (!apiKey) {
    console.error('Set DEEPSEEK_API_KEY in backend/.env or in the environment (or set LLM_PROVIDER=ollama).');
    process.exit(1);
  }
  providerOptions = {
    apiKey,
    baseUrl: process.env.DEEPSEEK_BASE_URL?.trim() || undefined,
    model: process.env.DEEPSEEK_MODEL?.trim() || undefined,
    timeoutMs: Number(process.env.LLM_TIMEOUT_MS || 15_000),
    disableThinking: true,
  };
} else {
  console.error(`Unsupported LLM_PROVIDER "${provider}". Use "deepseek" or "ollama".`);
  process.exit(1);
}

const port = Number(process.env.PORT || 3001);
const host = process.env.HOST || '127.0.0.1';

const server = createApp({
  classify: createDeepSeekClassifier(providerOptions),
  generateReply: createDeepSeekClient(providerOptions),
  frontendDir: fileURLToPath(new URL('../frontend/dist/', import.meta.url)),
}).listen(port, host, (error) => {
  if (error) {
    console.error(`Could not start the backend on ${host}:${port} (${error.code ?? 'listen error'}).`);
    process.exitCode = 1;
    return;
  }
  console.log(`Chat API listening on http://${host}:${server.address().port}`);
});
