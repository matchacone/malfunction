export const isLiveChat = import.meta.env.VITE_CHAT_MODE === 'live';

const sessionKey = 'campus-ai.session-id';
const uuidPattern = /^[\da-f]{8}-[\da-f]{4}-4[\da-f]{3}-[89ab][\da-f]{3}-[\da-f]{12}$/i;

export function getSessionId() {
  try {
    const storedId = sessionStorage.getItem(sessionKey);
    if (storedId && uuidPattern.test(storedId)) return storedId;
  } catch {
    // Keep the ID in component state when browser storage is unavailable.
  }

  const sessionId = createSessionId();
  try {
    sessionStorage.setItem(sessionKey, sessionId);
  } catch {
    return sessionId;
  }

  return sessionId;
}

function createSessionId() {
  const bytes = crypto.getRandomValues(new Uint8Array(16));
  bytes[6] = (bytes[6] & 0x0f) | 0x40;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  const hex = Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('');

  return [hex.slice(0, 8), hex.slice(8, 12), hex.slice(12, 16), hex.slice(16, 20), hex.slice(20)].join('-');
}

const mockReply = {
  mode: 'parable',
  text: 'A student once asked the gardener why the fig tree took so long to bear fruit. The gardener handed the student a watering can.\n\nEach day the student returned, and soon noticed that the tree had grown a little while nobody was looking.\n\nMay your curiosity grow in the same quiet way. Blessings on your studies.',
  locked: false,
};

export async function sendChat(sessionId, message) {
  if (!isLiveChat) {
    await new Promise((resolve) => setTimeout(resolve, 450));
    return mockReply;
  }

  const response = await fetch('/api/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ sessionId, message }),
  });

  if (!response.ok) throw new Error('Chat request failed');

  const reply = await response.json();
  if (typeof reply?.mode !== 'string' || typeof reply.text !== 'string' ||
      !reply.text.trim() || typeof reply.locked !== 'boolean') {
    throw new Error('Invalid chat reply');
  }

  return reply;
}
