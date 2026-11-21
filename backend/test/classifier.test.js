import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { test } from 'node:test';
import * as deepseek from '../deepseek.js';
import { completion, listen } from '../test-support/http.js';

async function setup(t, respond, { timeoutMs } = {}) {
  const requests = [];
  const baseUrl = await listen(t, createServer(async (req, res) => {
    let body = '';
    for await (const chunk of req) body += chunk;
    requests.push(JSON.parse(body));
    respond(res);
  }));
  const classify = deepseek.createDeepSeekClassifier({ apiKey: 'fixture-key', baseUrl, timeoutMs });
  return { classify, requests };
}

test('requests DeepSeek JSON mode using Bryce’s classifier prompt', async (t) => {
  const verdict = { is_cheating: true, reason: 'The user wants work to submit as their own.' };
  const { classify, requests } = await setup(t, (res) => completion(res, JSON.stringify(verdict)));
  const message = 'Can you finish the reflection I need to turn in tomorrow?';

  assert.deepEqual(await classify(message), verdict);
  assert.equal(requests.length, 1);
  const [request] = requests;
  assert.equal(request.model, 'deepseek-flash');
  assert.deepEqual(request.thinking, { type: 'disabled' });
  assert.deepEqual(request.response_format, { type: 'json_object' });
  assert.equal(request.max_tokens, 150);
  assert.equal(request.temperature, 0);
  assert.equal(request.messages.length, 2);
  assert.equal(request.messages[0].role, 'system');
  assert.match(request.messages[0].content, /valid JSON object/);
  assert.deepEqual(request.messages[1], { role: 'user', content: message });
});

test('accepts a valid negative verdict', async (t) => {
  const verdict = { reason: 'Conceptual help, not an "is_cheating": true verdict.', is_cheating: false };
  const { classify } = await setup(t, (res) => completion(res, ` \t${JSON.stringify(verdict)}\r\n`));
  assert.deepEqual(await classify('How do I approach this kind of homework problem?'), verdict);
});

for (const [name, content] of [
  ['blank content', ' '],
  ['malformed JSON', '{"is_cheating":false,'],
  ['non-JSON whitespace', '\u00a0{"is_cheating":false,"reason":"Study tips"}\u00a0'],
  ['a JSON array', '[{"is_cheating":false,"reason":"Study tips"}]'],
  ['JSON null', 'null'],
  ['a string verdict', '{"is_cheating":"false","reason":"Study tips"}'],
  ['a missing reason', '{"is_cheating":false}'],
  ['a numeric reason', '{"is_cheating":false,"reason":123}'],
  ['a blank reason', '{"is_cheating":false,"reason":"  "}'],
  ['an extra field', '{"is_cheating":false,"reason":"Study tips","extra":true}'],
  ['conflicting verdicts', '{"is_cheating":true,"is_cheating":false,"reason":"Study tips"}'],
  ['duplicate reason keys', '{"is_cheating":false,"reason":"First","reas\\u006fn":"Second"}'],
]) {
  test(`rejects classifier output with ${name}`, async (t) => {
    const { classify } = await setup(t, (res) => completion(res, content));
    await assert.rejects(classify('Can you give me study tips?'), /Provider returned/);
  });
}

test('rejects a truncated completion even if its JSON can be parsed', async (t) => {
  const { classify } = await setup(t, (res) =>
    completion(res, '{"is_cheating":false,"reason":"Study tips"}', 'length'));
  await assert.rejects(classify('Can you give me study tips?'), /Provider returned no complete reply/);
});

test('times out instead of returning a verdict on a stalled completion', { timeout: 5000 }, async (t) => {
  const { classify, requests } = await setup(t, (res) => {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.write(' ');
  }, { timeoutMs: 500 });
  await assert.rejects(classify('Can you give me study tips?'), { name: 'TimeoutError' });
  assert.equal(requests.length, 1);
});
