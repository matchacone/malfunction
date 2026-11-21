import assert from 'node:assert/strict';
import { mkdtemp, mkdir, rm, writeFile } from 'node:fs/promises';
import { createServer } from 'node:http';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';
import { createApp } from '../app.js';
import { listen } from '../test-support/http.js';

test('serves the built frontend and chat API from the same origin', async (t) => {
  const frontendDir = await mkdtemp(join(tmpdir(), 'malfunction-frontend-'));
  t.after(() => rm(frontendDir, { recursive: true }));
  await mkdir(join(frontendDir, 'assets'));
  await writeFile(join(frontendDir, 'index.html'), '<main>Campus chat</main>');
  await writeFile(join(frontendDir, 'assets', 'app.js'), 'console.log("Campus chat");');

  const origin = await listen(t, createServer(createApp({
    frontendDir,
    classify: async () => ({ is_cheating: false }),
    generateReply: async () => 'A parable.',
  })));

  const page = await fetch(`${origin}/`);
  assert.equal(page.status, 200);
  assert.match(page.headers.get('content-type'), /^text\/html/);
  assert.equal(await page.text(), '<main>Campus chat</main>');

  const asset = await fetch(`${origin}/assets/app.js`);
  assert.equal(asset.status, 200);
  assert.equal(await asset.text(), 'console.log("Campus chat");');
  assert.equal((await fetch(`${origin}/assets/missing.js`)).status, 404);

  const chat = await fetch(`${origin}/api/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      sessionId: 'a1234567-1234-4234-8234-123456789abc',
      message: 'Tell me about rain.',
    }),
  });
  assert.equal(chat.status, 200);
  assert.deepEqual(await chat.json(), { mode: 'parable', text: 'A parable.', locked: false });
});
