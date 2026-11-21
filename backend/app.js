import { readFileSync } from 'node:fs';
import express from 'express';
import { routeIntegrity } from './integrity.js';

const verses = JSON.parse(readFileSync(new URL('../handoff/verses.json', import.meta.url), 'utf8'));
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const maxMessageLength = 4000;

function sendError(res, status, code, message, retryable = false) {
  return res.status(status).json({ error: { code, message, retryable } });
}

function invalidRequest(res) {
  return sendError(res, 400, 'invalid_request',
    'Send a version 4 UUID and a nonblank message of at most 4000 characters.');
}

export function createApp({ classify, generateReply, sessions = new Map() }) {
  const app = express();
  const pending = new Set();
  app.disable('x-powered-by');

  app.post('/api/chat', express.json({ limit: '32kb' }), async (req, res) => {
    const { sessionId, message } = req.body ?? {};
    if (typeof sessionId !== 'string' || sessionId.length !== 36 || !uuid.test(sessionId)
      || typeof message !== 'string' || message.length > maxMessageLength || !message.trim()) {
      return invalidRequest(res);
    }

    const id = sessionId.toLowerCase();
    if (pending.has(id)) {
      return sendError(res, 409, 'session_busy', 'A reply is already pending. Please retry.', true);
    }
    const phase = sessions.get(id);
    if (phase === 'locked') {
      return res.json({
        mode: 'confession',
        text: 'Chat is locked. Please try again with a fresh session.',
        locked: true,
      });
    }

    pending.add(id);
    try {
      const result = await routeIntegrity({ message: message.trim(), phase, classify, generateReply });
      if (result.mode === 'integrity') {
        const { quote, citation } = verses[Math.floor(Math.random() * verses.length)];
        sessions.set(id, 'locked');
        return res.json({ mode: 'integrity', text: quote, locked: true, citation });
      }

      sessions.set(id, result.mode === 'cliffhanger' ? 'cliffhanger' : 'awaitingAnswer');
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

  return app;
}
