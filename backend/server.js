import { createApp } from './app.js';
import { createDeepSeekClassifier, createDeepSeekClient } from './deepseek.js';

const apiKey = process.env.DEEPSEEK_API_KEY?.trim();
if (!apiKey) {
  console.error('Set DEEPSEEK_API_KEY in backend/.env or in the environment.');
  process.exit(1);
}

const port = Number(process.env.PORT || 3001);
const host = process.env.HOST || '127.0.0.1';
const providerOptions = {
  apiKey,
  baseUrl: process.env.DEEPSEEK_BASE_URL?.trim() || undefined,
  model: process.env.DEEPSEEK_MODEL?.trim() || undefined,
};

const server = createApp({
  classify: createDeepSeekClassifier(providerOptions),
  generateReply: createDeepSeekClient(providerOptions),
}).listen(port, host, (error) => {
  if (error) {
    console.error(`Could not start the backend on ${host}:${port} (${error.code ?? 'listen error'}).`);
    process.exitCode = 1;
    return;
  }
  console.log(`Chat API listening on http://${host}:${server.address().port}`);
});
