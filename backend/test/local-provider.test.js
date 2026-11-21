import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { createServer } from 'node:http';
import { createInterface } from 'node:readline';
import { test } from 'node:test';
import { completion, listen } from '../test-support/http.js';

const sessionId = 'a1234567-1234-4234-8234-123456789abc';
const reply = 'A gardener waited for rain. Peace be with you.';
const benignVerdict = '{"is_cheating":false,"reason":"Study help."}';

test('LLM_PROVIDER=ollama starts without DEEPSEEK_API_KEY and defaults to qwen2.5:7b without DeepSeek thinking field', { timeout: 5000 }, async (t) => {
  const requests = [];
  const upstream = await listen(t, createServer(async (req, res) => {
    let body = '';
    for await (const chunk of req) body += chunk;
    const payload = JSON.parse(body);
    requests.push({ path: req.url, authorization: req.headers.authorization, body: payload });
    completion(res, payload.response_format?.type === 'json_object' ? benignVerdict : reply);
  }));

  const env = {
    ...process.env,
    HOST: '127.0.0.1',
    PORT: '0',
    LLM_PROVIDER: 'ollama',
    OLLAMA_BASE_URL: `${upstream}/v1`,
  };
  delete env.DEEPSEEK_API_KEY;
  delete env.OLLAMA_MODEL;

  const child = spawn(process.execPath, ['server.js'], {
    cwd: new URL('../', import.meta.url),
    env,
    stdio: ['ignore', 'pipe', 'inherit'],
  });
  const closed = once(child, 'close');
  t.after(async () => {
    child.kill();
    await closed;
  });

  const lines = createInterface({ input: child.stdout });
  const [line] = await Promise.race([
    once(lines, 'line'),
    closed.then(([code]) => { throw new Error(`Server exited before launch (code ${code})`); }),
  ]);
  const address = /^Chat API listening on (http:\/\/127\.0\.0\.1:([0-9]+))$/.exec(line);
  assert.ok(Number(address?.[2]) > 0, `Expected a bound port, got: ${line}`);

  const res = await fetch(`${address[1]}/api/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ sessionId, message: 'Tell me about rain.' }),
  });
  assert.equal(res.status, 200);
  assert.deepEqual(await res.json(), { mode: 'parable', text: reply, locked: false });
  assert.equal(requests.length, 2);
  for (const req of requests) {
    assert.equal(req.path, '/v1/chat/completions');
    assert.equal(req.authorization, undefined);
    assert.equal(req.body.model, 'qwen2.5:7b');
    assert.equal('thinking' in req.body, false);
  }
});
