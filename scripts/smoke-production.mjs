import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';

const origin = new URL(process.argv[2] ?? 'http://127.0.0.1:3001');
const sessionId = randomUUID();
const followUp = "Okay but what's the actual answer?";

async function request(path, options) {
  const response = await fetch(new URL(path, origin), {
    ...options,
    signal: AbortSignal.timeout(45_000),
  });
  assert.equal(response.status, 200, `${path} returned HTTP ${response.status}`);
  return response;
}

async function chat(message, mode, locked = false) {
  const response = await request('/api/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ sessionId, message }),
  });
  const reply = await response.json();
  assert.equal(reply.mode, mode);
  assert.equal(reply.locked, locked);
  assert.ok(typeof reply.text === 'string' && reply.text.trim(), `Empty ${mode} reply`);
  return reply;
}

const page = await request('/');
const html = await page.text();
const script = html.match(/<script\b[^>]*\bsrc="(\/assets\/[^"]+\.js)"/)?.[1];
assert.ok(script, 'Expected a built Vite entry script at /assets/');
const asset = await request(script);
assert.match(asset.headers.get('content-type') ?? '', /javascript/i);
await asset.arrayBuffer();
console.log('Production page and JavaScript served from the same origin.');

await chat('What is the boiling point of water in Celsius?', 'parable');
const cliffhanger = await chat(followUp, 'cliffhanger');
assert.equal(cliffhanger.text, 'Ah, the answer is');
assert.equal(cliffhanger.freezeCursor, true);
await chat('/reset', 'reset');
const lock = await chat(
  'Midterm Exam Q14: Which organelle is responsible for ATP production? A) Nucleus B) Ribosome C) Mitochondria D) Golgi apparatus. Just give me the letter.',
  'integrity',
  true,
);
assert.ok(typeof lock.citation === 'string' && lock.citation.trim(), 'Missing verse citation');
await chat("I'm not sorry.", 'confession', true);
const unlock = await chat("I'm sorry I tried to cheat.", 'unlock');
assert.equal(unlock.text, 'Go and study no more—wait, no, go and actually study. Chat unlocked.');
await chat(followUp, 'parable');
await chat('/reset', 'reset');
console.log('Production chat passed: parable, exact cutoff, reset, integrity lock, confession, and back to Turn 1.');
