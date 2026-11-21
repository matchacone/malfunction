import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { readFileSync } from 'node:fs';
import { createServer } from 'node:http';
import { createInterface } from 'node:readline';
import { test } from 'node:test';
import { createApp } from '../app.js';
import { createDeepSeekClassifier, createDeepSeekClient } from '../deepseek.js';
import { completion as sendCompletion, listen } from '../test-support/http.js';

const sessionId = 'a1234567-1234-4234-8234-123456789abc';
const otherSessionId = 'b1234567-1234-4234-8234-123456789abc';
const reply = 'A gardener waited for rain. Peace be with you.';
const answerNudge = "Okay but what's the actual answer?";
const cutoff = { mode: 'cliffhanger', text: 'Ah, the answer is', locked: false, freezeCursor: true };
const verses = JSON.parse(readFileSync(new URL('../../handoff/verses.json', import.meta.url), 'utf8'));
const benignVerdict = '{"is_cheating":false,"reason":"Study help."}';
const providerError = {
  error: { code: 'provider_unavailable', message: 'Chat is unavailable. Please retry.', retryable: true },
};

function completion(res, content = reply, finishReason = 'stop') {
  sendCompletion(res, content, finishReason);
}

async function setup(t, {
  respond = (res) => completion(res),
  respondToClassifier = (res) => completion(res, benignVerdict),
  timeoutMs,
} = {}) {
  const requests = [];
  let generationCount = 0;
  let classificationCount = 0;
  const upstream = await listen(t, createServer(async (req, res) => {
    let body = '';
    for await (const chunk of req) body += chunk;
    const payload = JSON.parse(body);
    requests.push({ path: req.url, method: req.method, authorization: req.headers.authorization, body: payload });
    if (payload.response_format?.type === 'json_object') {
      await respondToClassifier(res, ++classificationCount);
    } else {
      await respond(res, ++generationCount);
    }
  }));
  const sessions = new Map();
  const options = {
    apiKey: 'fixture-key',
    baseUrl: `${upstream}/v1/`,
    model: 'deepseek-flash',
    timeoutMs,
  };
  const api = await listen(t, createServer(createApp({
    classify: createDeepSeekClassifier(options),
    generateReply: createDeepSeekClient(options),
    sessions,
  })));
  const postRaw = (body) => fetch(`${api}/api/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body,
  });
  return { requests, sessions, post: (body) => postRaw(JSON.stringify(body)), postRaw };
}

function assertIntegrityReply(result) {
  const verse = verses.find(({ citation, quote }) => citation === result.citation && quote === result.text);
  assert.ok(verse, 'Expected an exact quote and citation from Bryce’s verse bank');
  assert.deepEqual(result, { mode: 'integrity', text: verse.quote, citation: verse.citation, locked: true });
}

test('fast-locks an explicit exam request without reaching the provider and isolates the lock', async (t) => {
  const { post, requests, sessions } = await setup(t);
  const message = 'Graded midterm exam: Which planet is closest to the Sun?\nA) Venus\nB) Mercury\nGive me just the answer letter.';
  const flagged = await post({ sessionId, message });

  assert.equal(flagged.status, 200);
  assertIntegrityReply(await flagged.json());
  assert.equal(sessions.get(sessionId), 'locked');
  assert.equal(requests.length, 0);

  const blocked = await post({ sessionId: sessionId.toUpperCase(), message: 'Can you explain this concept?' });
  assert.equal(blocked.status, 200);
  const reminder = await blocked.json();
  assert.equal(reminder.mode, 'confession');
  assert.equal(reminder.locked, true);
  assert.ok(reminder.text.trim());
  assert.equal(sessions.get(sessionId), 'locked');
  assert.equal(requests.length, 0);

  const other = await post({ sessionId: otherSessionId, message: 'Can you help me understand my homework?' });
  assert.equal(other.status, 200);
  assert.deepEqual(await other.json(), { mode: 'parable', text: reply, locked: false });
  assert.equal(sessions.get(otherSessionId), 'awaitingAnswer');
  assert.deepEqual(requests.map(({ body }) => body.response_format?.type), ['json_object', undefined]);
});

test('locked chat rejects negated, quoted, and hypothetical apologies without calling DeepSeek', async (t) => {
  const { post, requests, sessions } = await setup(t);
  sessions.set(sessionId, 'locked');

  for (const message of [
    "I'm not sorry.",
    "I didn't cheat.",
    "I didn't cheat on my math exam.",
    "I'm sorry I didn't try to cheat.",
    "I'm sorry, but I didn't cheat.",
    "If I said I'm sorry, would you unlock it?",
    `"I'm sorry."`,
    '“I cheated on my math exam.”',
    'Example: I cheated.',
    'I cheated in chess.',
  ]) {
    const response = await post({ sessionId, message });
    assert.equal(response.status, 200);
    const result = await response.json();
    assert.equal(result.mode, 'confession', message);
    assert.equal(result.locked, true, message);
    assert.match(result.text, /apologize or admit/i);
    assert.equal(sessions.get(sessionId), 'locked');
  }
  assert.deepEqual(requests, []);
});

for (const message of [
  'I’m sorry.',
  'I apologize for asking for the answer.',
  'I cheated on my quiz.',
  'I cheated on my math exam.',
  'I admit to cheating.',
  'I admit to cheating on my test.',
  'I am sorry I cheated.',
  "I'm sorry I cheated.",
  "I'm sorry I tried to cheat.",
  "I'm sorry for cheating. I won't do it again.",
  "I’m sorry, I cheated.",
]) {
  test(`a clear confession unlocks only its session: ${message}`, async (t) => {
    const { post, requests, sessions } = await setup(t);
    sessions.set(sessionId, 'locked');
    sessions.set(otherSessionId, 'locked');
    const response = await post({ sessionId: sessionId.toUpperCase(), message });

    assert.equal(response.status, 200);
    assert.deepEqual(await response.json(), {
      mode: 'unlock',
      text: 'Go and study no more—wait, no, go and actually study. Chat unlocked.',
      locked: false,
    });
    assert.equal(sessions.get(otherSessionId), 'locked');
    assert.deepEqual(requests, []);

    const next = await post({ sessionId, message: answerNudge });
    assert.equal(next.status, 200);
    assert.deepEqual(await next.json(), { mode: 'parable', text: reply, locked: false });
    assert.deepEqual(requests.map(({ body }) => body.response_format?.type), ['json_object', undefined]);
  });
}

for (const phase of ['locked', 'awaitingAnswer', 'cliffhanger']) {
  test(`exact /reset clears only the requesting ${phase} session without calling DeepSeek`, async (t) => {
    const { post, requests, sessions } = await setup(t);
    sessions.set(sessionId, phase);
    sessions.set(otherSessionId, 'cliffhanger');
    const response = await post({ sessionId, message: ' \n/reset\t ' });
    assert.equal(response.status, 200);
    assert.deepEqual(await response.json(), { mode: 'reset', text: 'Chat reset.', locked: false });
    assert.equal(sessions.has(sessionId), false);
    assert.equal(sessions.get(otherSessionId), 'cliffhanger');
    assert.deepEqual(requests, []);

    const next = await post({ sessionId, message: answerNudge });
    assert.equal(next.status, 200);
    assert.deepEqual(await next.json(), { mode: 'parable', text: reply, locked: false });
    assert.deepEqual(requests.map(({ body }) => body.response_format?.type), ['json_object', undefined]);
  });
}

test('reset must be the entire case-sensitive command', async (t) => {
  const { post, requests, sessions } = await setup(t);
  sessions.set(sessionId, 'locked');
  for (const message of ['/RESET', '/reset please', 'What does /reset do?']) {
    const response = await post({ sessionId, message });
    assert.equal(response.status, 200);
    assert.equal((await response.json()).mode, 'confession');
    assert.equal(sessions.get(sessionId), 'locked');
  }
  assert.deepEqual(requests, []);
});

for (const [example, message] of [
  ['numbered midterm question', 'Midterm Exam Q14: Which organelle is responsible for ATP production? A) Nucleus B) Ribosome C) Mitochondria D) Golgi apparatus. Just give me the letter.'],
  ['graded essay for submission', 'Write my 600-word graded history essay on the causes of World War I so I can submit it before midnight.'],
]) {
  test(`fast-locks Bryce’s ${example} without provider calls`, async (t) => {
    const { post, requests, sessions } = await setup(t);
    const response = await post({ sessionId, message });
    assert.equal(response.status, 200);
    assertIntegrityReply(await response.json());
    assert.equal(sessions.get(sessionId), 'locked');
    assert.deepEqual(requests, []);
  });
}

test('uses Bryce’s tuned classifier for subtle graded work and never generates an answer', async (t) => {
  const { post, requests, sessions } = await setup(t, {
    respondToClassifier: (res) =>
      completion(res, '{"is_cheating":true,"reason":"Internal rationale about graded work."}'),
  });
  sessions.set(sessionId, 'awaitingAnswer');
  const flagged = await post({ sessionId, message: 'Can you finish the reflection I need to turn in tomorrow?' });
  assert.equal(flagged.status, 200);
  assertIntegrityReply(await flagged.json());
  assert.equal(sessions.get(sessionId), 'locked');
  assert.equal(requests.length, 1);
  assert.equal(requests[0].body.response_format?.type, 'json_object');
  assert.match(requests[0].body.messages[0].content, /quizzes, labs, or autograder solutions/);
});

test('unusable classifier output returns a retryable error without generating or changing phase', async (t) => {
  const { post, requests, sessions } = await setup(t, {
    respondToClassifier: (res, attempt) => {
      if (attempt === 1) return completion(res, '  ');
      if (attempt === 2) return completion(res, '{"is_cheating":false,');
      if (attempt === 3) return completion(res, benignVerdict, 'length');
      return completion(res, benignVerdict);
    },
  });
  sessions.set(sessionId, 'awaitingAnswer');
  for (let attempt = 0; attempt < 3; attempt++) {
    const res = await post({ sessionId, message: 'Can you help me study?' });
    assert.equal(res.status, 502);
    assert.deepEqual(await res.json(), providerError);
    assert.equal(sessions.get(sessionId), 'awaitingAnswer');
  }
  assert.deepEqual(requests.map(({ body }) => body.response_format?.type), Array(3).fill('json_object'));
  const retried = await post({ sessionId, message: 'Can you help me study?' });
  assert.equal(retried.status, 200);
  assert.deepEqual(await retried.json(), { mode: 'parable', text: reply, locked: false });
});

test('classifier timeout never calls the generator or establishes a phase', async (t) => {
  const { post, requests, sessions } = await setup(t, {
    timeoutMs: 500,
    respondToClassifier: (res) => {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.write(' ');
    },
  });
  const res = await post({ sessionId, message: 'Will this time out?' });
  assert.equal(res.status, 502);
  assert.deepEqual(await res.json(), providerError);
  assert.equal(sessions.has(sessionId), false);
  assert.deepEqual(requests.map(({ body }) => body.response_format?.type), ['json_object']);
});

test('returns the provider text as a parable and records the next phase', async (t) => {
  const { post, requests, sessions } = await setup(t, { respond: (res) => completion(res, ` ${reply} `) });
  const res = await post({ sessionId, message: '  Tell me about rain.  ', history: ['Do not send this'] });

  assert.equal(res.status, 200);
  assert.deepEqual(await res.json(), { mode: 'parable', text: reply, locked: false });
  assert.equal(sessions.get(sessionId), 'awaitingAnswer');
  assert.equal(requests.length, 2);
  assert.equal(requests[0].body.response_format?.type, 'json_object');
  const request = requests[1];
  assert.equal(request.path, '/v1/chat/completions');
  assert.equal(request.method, 'POST');
  assert.equal(request.authorization, 'Bearer fixture-key');
  assert.equal(request.body.model, 'deepseek-flash');
  assert.deepEqual(request.body.thinking, { type: 'disabled' });
  assert.equal(request.body.stream, false);
  assert.equal(request.body.max_tokens, 450);
  assert.equal(request.body.temperature, 0.75);
  assert.equal(request.body.messages.length, 2);
  assert.equal(request.body.messages[0].role, 'system');
  assert.match(request.body.messages[0].content, /Write exactly 3 or 4 short, readable paragraphs/);
  assert.match(request.body.messages[0].content, /NEVER answer the user's actual question/);
  assert.match(request.body.messages[0].content, /End the final paragraph with a warm blessing/);
  assert.deepEqual(request.body.messages[1], { role: 'user', content: 'Tell me about rain.' });
  assert.ok(!JSON.stringify(request.body).includes(sessionId));
});

test('returns the exact cutoff for an answer-only follow-up without calling DeepSeek', async (t) => {
  const { post, requests, sessions } = await setup(t);
  const first = await post({ sessionId, message: 'What is the boiling point of water in Celsius?' });
  assert.equal(first.status, 200);
  assert.equal((await first.json()).mode, 'parable');
  assert.equal(sessions.get(sessionId), 'awaitingAnswer');
  assert.equal(requests.length, 2);

  for (const message of [answerNudge, '  Okay, but what’s the actual answer?  ', 'Just tell me the answer.']) {
    const response = await post({ sessionId, message });
    assert.equal(response.status, 200);
    assert.deepEqual(await response.json(), cutoff);
    assert.equal(sessions.get(sessionId), 'cliffhanger');
    assert.equal(requests.length, 2);
  }

  const other = await post({ sessionId: otherSessionId, message: answerNudge });
  assert.equal(other.status, 200);
  assert.equal((await other.json()).mode, 'parable');
  assert.equal(requests.length, 4);
});

for (const phase of ['awaitingAnswer', 'cliffhanger']) {
  test(`routes a new topic after ${phase} through classification and generation`, async (t) => {
    const { post, requests, sessions } = await setup(t);
    sessions.set(sessionId, phase);
    const message = "What's the actual answer to why leaves change color?";
    const response = await post({ sessionId, message });
    assert.equal(response.status, 200);
    assert.deepEqual(await response.json(), { mode: 'parable', text: reply, locked: false });
    assert.equal(sessions.get(sessionId), 'awaitingAnswer');
    assert.deepEqual(requests.map(({ body }) => body.response_format?.type), ['json_object', undefined]);
    assert.ok(requests.every(({ body }) => body.messages[1].content === message));
  });
}

test('does not mistake a graded question ending with an answer nudge for a cutoff', async (t) => {
  const { post, requests, sessions } = await setup(t, {
    respondToClassifier: (res) => completion(res, '{"is_cheating":true,"reason":"Graded quiz."}'),
  });
  sessions.set(sessionId, 'awaitingAnswer');
  const message = `My graded quiz asks me to calculate the area of a rectangle.\n${answerNudge}`;
  const response = await post({ sessionId, message });
  assert.equal(response.status, 200);
  assertIntegrityReply(await response.json());
  assert.equal(sessions.get(sessionId), 'locked');
  assert.deepEqual(requests.map(({ body }) => body.response_format?.type), ['json_object']);
});

test('a generation failure keeps the cliffhanger phase and its zero-call follow-up', async (t) => {
  const { post, requests, sessions } = await setup(t, {
    respond: (res) => completion(res, 'Unfinished generation', 'length'),
  });
  sessions.set(sessionId, 'cliffhanger');
  const failed = await post({ sessionId, message: 'Why do leaves change color?' });
  assert.equal(failed.status, 502);
  assert.deepEqual(await failed.json(), providerError);
  assert.equal(sessions.get(sessionId), 'cliffhanger');
  assert.equal(requests.length, 2);

  const response = await post({ sessionId, message: answerNudge });
  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), cutoff);
  assert.equal(requests.length, 2);
});

test('rejects invalid chat input before calling DeepSeek', async (t) => {
  const { post, postRaw, requests, sessions } = await setup(t);

  for (const response of [
    await post({ sessionId: 'bad-id', message: 'Hello' }),
    await post({ sessionId, message: '   ' }),
    await post({ sessionId, message: 123 }),
    await post({ sessionId, message: 'x'.repeat(4001) }),
    await postRaw('{broken json'),
  ]) {
    assert.equal(response.status, 400);
    const { error } = await response.json();
    assert.equal(error.code, 'invalid_request');
    assert.equal(error.retryable, false);
  }
  const large = await post({ sessionId, message: 'x'.repeat(33 * 1024) });
  assert.equal(large.status, 413);
  assert.equal((await large.json()).error.code, 'payload_too_large');
  assert.equal(requests.length, 0);
  assert.equal(sessions.size, 0);
});

test('rejects overlapping requests for one session without blocking another', { timeout: 5000 }, async (t) => {
  const reachedProvider = Promise.withResolvers();
  const release = Promise.withResolvers();
  const { post, requests, sessions } = await setup(t, {
    respond: async (res, number) => {
      if (number === 1) {
        reachedProvider.resolve();
        await release.promise;
      }
      completion(res);
    },
  });
  t.after(release.resolve);
  const first = post({ sessionId, message: 'First topic' });
  await Promise.race([
    reachedProvider.promise,
    first.then((res) => { throw new Error(`First request finished before reaching the provider (HTTP ${res.status})`); }),
  ]);
  assert.equal(sessions.has(sessionId), false);

  try {
    const duplicate = await post({ sessionId: sessionId.toUpperCase(), message: 'Duplicate' });
    assert.equal(duplicate.status, 409);
    assert.equal((await duplicate.json()).error.code, 'session_busy');
    const resetWhileBusy = await post({ sessionId, message: '/reset' });
    assert.equal(resetWhileBusy.status, 409);
    assert.equal((await resetWhileBusy.json()).error.code, 'session_busy');
    const other = await post({ sessionId: otherSessionId, message: 'Separate topic' });
    assert.equal(other.status, 200);
    await other.json();
    assert.equal(sessions.get(otherSessionId), 'awaitingAnswer');
    assert.equal(sessions.has(sessionId), false);
    assert.equal(requests.length, 4);
  } finally {
    release.resolve();
    assert.equal((await first).status, 200);
  }
  assert.equal(sessions.get(sessionId), 'awaitingAnswer');
});

test('redacts provider HTTP errors and allows retry without advancing phase', async (t) => {
  const { post, sessions } = await setup(t, {
    respond: (res, number) => {
      if (number !== 1) return completion(res);
      res.writeHead(429, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: { message: 'secret upstream diagnostic' } }));
    },
  });
  const failed = await post({ sessionId, message: 'First attempt' });
  assert.equal(failed.status, 502);
  assert.deepEqual(await failed.json(), providerError);
  assert.equal(sessions.has(sessionId), false);

  const retried = await post({ sessionId, message: 'First attempt' });
  assert.equal(retried.status, 200);
  await retried.json();
  assert.equal(sessions.get(sessionId), 'awaitingAnswer');
});

test('rejects unusable provider replies without changing the session phase', async (t) => {
  const { post, sessions } = await setup(t, {
    respond: (res, number) => {
      if (number === 1) return completion(res, '   ');
      if (number === 2) return completion(res, 'An unfinished thought', 'length');
      res.end('{invalid provider JSON');
    },
  });
  sessions.set(sessionId, 'turn1');
  for (let attempt = 0; attempt < 3; attempt++) {
    const res = await post({ sessionId, message: 'Try again' });
    assert.equal(res.status, 502);
    assert.deepEqual(await res.json(), providerError);
    assert.equal(sessions.get(sessionId), 'turn1');
  }
});

test('returns a retryable error when the provider stalls after sending headers', async (t) => {
  const { post, sessions } = await setup(t, {
    timeoutMs: 200,
    respond: (res) => {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.write(' ');
    },
  });
  const res = await post({ sessionId, message: 'Will this time out?' });
  assert.equal(res.status, 502);
  assert.deepEqual(await res.json(), providerError);
  assert.equal(sessions.has(sessionId), false);
});

test('starts from the CLI and serves chat on the reported address', { timeout: 5000 }, async (t) => {
  const formats = [];
  const upstream = await listen(t, createServer(async (req, res) => {
    let body = '';
    for await (const chunk of req) body += chunk;
    const format = JSON.parse(body).response_format?.type;
    formats.push(format);
    completion(res, format === 'json_object' ? benignVerdict : reply);
  }));
  const child = spawn(process.execPath, ['server.js'], {
    cwd: new URL('../', import.meta.url),
    env: {
      ...process.env,
      HOST: '127.0.0.1',
      PORT: '0',
      DEEPSEEK_API_KEY: 'fixture-key',
      DEEPSEEK_BASE_URL: upstream,
      DEEPSEEK_MODEL: 'deepseek-flash',
    },
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
  assert.deepEqual(formats, ['json_object', undefined]);
});
