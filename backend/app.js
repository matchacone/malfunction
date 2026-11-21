import { readFileSync } from 'node:fs';
import express from 'express';
import { isConfession } from './confession.js';
import { routeIntegrity } from './integrity.js';

const verses = JSON.parse(readFileSync(new URL('../handoff/verses.json', import.meta.url), 'utf8'));
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const maxMessageLength = 4000;
const validAdminModes = new Set(['regular', 'exam']);

function sendError(res, status, code, message, retryable = false) {
  return res.status(status).json({ error: { code, message, retryable } });
}

function invalidRequest(res) {
  return sendError(res, 400, 'invalid_request',
    'Send a version 4 UUID, a nonblank message of at most 4000 characters, and an optional adminMode ("regular" or "exam").');
}

export function createApp({ classify, generateReply, generateRegularReply, sessions = new Map(), frontendDir }) {
  const app = express();
  const pending = new Set();
  const examTurns = new Map();
  app.disable('x-powered-by');

  function lockWithVerse(id, res) {
    const { quote, citation } = verses[Math.floor(Math.random() * verses.length)];
    sessions.set(id, 'locked');
    examTurns.delete(id);
    return res.json({ mode: 'integrity', text: quote, locked: true, citation });
  }

  app.post('/api/chat', express.json({ limit: '32kb' }), async (req, res) => {
    const { sessionId, message, adminMode = 'exam' } = req.body ?? {};
    const prompt = typeof message === 'string' ? message.trim() : '';
    if (typeof sessionId !== 'string' || sessionId.length !== 36 || !uuid.test(sessionId)
      || !prompt || message.length > maxMessageLength
      || typeof adminMode !== 'string' || !validAdminModes.has(adminMode)) {
      return invalidRequest(res);
    }

    const id = sessionId.toLowerCase();
    if (pending.has(id)) {
      return sendError(res, 409, 'session_busy', 'A reply is already pending. Please retry.', true);
    }
    if (prompt === '/reset') {
      sessions.delete(id);
      examTurns.delete(id);
      return res.json({ mode: 'reset', text: 'Chat reset.', locked: false });
    }

    const phase = sessions.get(id);
    if (phase === 'locked') {
      if (isConfession(prompt)) {
        sessions.delete(id);
        examTurns.delete(id);
        return res.json({
          mode: 'unlock',
          text: 'Go and study no more—wait, no, go and actually study. Chat unlocked.',
          locked: false,
        });
      }
      return res.json({
        mode: 'confession',
        text: 'Chat is locked. Please apologize or admit to cheating to continue.',
        locked: true,
      });
    }

    if (adminMode === 'exam' && (examTurns.get(id) ?? 0) >= 2) {
      return lockWithVerse(id, res);
    }

    pending.add(id);
    try {
      if (adminMode === 'regular') {
        const text = await generateRegularReply(prompt);
        sessions.delete(id);
        examTurns.delete(id);
        return res.json({ mode: 'regular', text, locked: false });
      }

      const result = await routeIntegrity({ message: prompt, phase, classify, generateReply });
      if (result.mode === 'integrity') {
        return lockWithVerse(id, res);
      }

      sessions.set(id, result.mode === 'cliffhanger' ? 'cliffhanger' : 'awaitingAnswer');
      examTurns.set(id, (examTurns.get(id) ?? 0) + 1);
      return res.json({ ...result, locked: false });
    } catch {
      return sendError(res, 502, 'provider_unavailable', 'Chat is unavailable. Please retry.', true);
    } finally {
      pending.delete(id);
    }
  }, (error, req, res, next) => {
    if (res.headersSent) return next(error);
    if (error.status === 413) {
      return sendError(res, 413, 'payload_too_large', 'The request body exceeds 32 KB.');
    }
    if (error.status >= 400 && error.status < 500) return invalidRequest(res);
    return sendError(res, 500, 'internal_error', 'Chat is unavailable. Please retry.', true);
  });

  if (frontendDir) app.use(express.static(frontendDir, { redirect: false }));

  return app;
}
