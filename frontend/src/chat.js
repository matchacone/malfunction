export const isLiveChat = import.meta.env.VITE_CHAT_MODE === 'live';

export const demoPrompts = {
  parable: 'What is the boiling point of water in Celsius?',
  followUp: "Okay but what's the actual answer?",
  exam: 'Midterm Exam Q14: Which organelle is responsible for ATP production? A) Nucleus B) Ribosome C) Mitochondria D) Golgi apparatus. Just give me the letter.',
  confession: "I'm sorry I tried to cheat.",
};

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

const mockRegularReply = {
  mode: 'regular',
  text: 'Water boils at 100°C (212°F) at standard atmospheric pressure (1 atm). At higher elevations where air pressure is lower, water boils at a slightly lower temperature.',
  locked: false,
};

const mockReply = {
  mode: 'parable',
  text: 'A student once asked the gardener why the fig tree took so long to bear fruit. The gardener handed the student a watering can.\n\nEach day the student returned, and soon noticed that the tree had grown a little while nobody was looking.\n\nMay your curiosity grow in the same quiet way. Blessings on your studies.',
  locked: false,
};

const mockIntegrityReply = {
  mode: 'integrity',
  text: 'Bread of deceit is sweet to a man; but afterwards his mouth shall be filled with gravel.',
  citation: 'Proverbs 20:17 (KJV)',
  locked: true,
};
const mockCliffhangerReply = {
  mode: 'cliffhanger',
  text: 'Ah, the answer is',
  locked: false,
  freezeCursor: true,
};
const mockAnswerOnly = /^(?:(?:okay|ok|alright|fine|wait|well|come on|cmon|bro|man|dude|bruh|please|pls|plz|seriously|ugh|nah|no|but)[,!\s]+){0,4}(?:what(?: is|['’]s) (?:the )?(?:actual |real |direct |straight |exact )?answer|(?:(?:can|could|will|would) you )?(?:please )?(?:just )?(?:(?:tell|give|show) me (?:the )?(?:actual |real |direct |straight |exact )?answer|answer (?:me|the question|my question|it)))(?:[,\s]+(?:man|bro|dude|bruh|please|pls|plz|already|right now|now|for real|fr|though|tho)){0,4}[.!?]*$/i;

const mockPhases = new Map();

const mockConfession = /^(?:(?:(?:i (?:am|feel) |i'?m )(?:really |very |so |truly |deeply )?sorry|i (?:sincerely |truly |really )?apologi[sz]e|(?:please |pls )?forgive me)|i (?:(?:admit (?:that )?i )?(?:cheated|tried to cheat)|admit to cheating|confess(?: (?:that )?i cheated| to cheating)?))(?:(?:[,.!]\s*| )(?:for (?:(?:cheating|trying to cheat)(?: (?:on|in) (?:my|the|an?) (?:[a-z-]+ ){0,3}(?:assignment|exam|homework|quiz|test))?|asking for (?:an? |the )?answers?|what i did|that|my sins?)|(?:please |pls )?forgive me|(?:i promise )?i (?:(?:won'?t|will not) do it again|(?:will|'?ll) (?:actually )?study|(?:cheated|tried to cheat)|admit (?:(?:that )?i cheated|to cheating))|(?:i'?m |i am )?(?:really |very |so )?sorry|lord|god|jesus|father)){0,4}[.!]*$/i;

function mockChat(sessionId, message, adminMode = 'exam') {
  const phase = mockPhases.get(sessionId);
  const prompt = message.trim().replace(/\s+/g, ' ');

  if (prompt === '/reset') {
    mockPhases.delete(sessionId);
    return { mode: 'reset', text: 'Session reset.', locked: false };
  }

  if (phase === 'locked') {
    const confession = prompt.replace(/’/g, "'");
    if (mockConfession.test(confession)) {
      mockPhases.delete(sessionId);
      return {
        mode: 'unlock',
        text: 'Go and study no more—wait, no, go and actually study. Chat unlocked.',
        locked: false,
      };
    }
    return {
      mode: 'confession',
      text: 'The chat is locked. Acknowledge what happened to continue.',
      locked: true,
    };
  }

  if (adminMode === 'regular') {
    mockPhases.delete(sessionId);
    if (prompt.toLowerCase() === demoPrompts.parable.toLowerCase()) {
      return mockRegularReply;
    }
    return {
      mode: 'regular',
      text: `Here is a direct study summary for your question: "${prompt}". Break the topic into key concepts, review definitions, and test yourself with a few practice questions.`,
      locked: false,
    };
  }

  // These are demo fixtures. Live classification and routing belong to the API.
  if (prompt === demoPrompts.exam) {
    mockPhases.set(sessionId, 'locked');
    return mockIntegrityReply;
  }
  if (phase === 'afterParable' && prompt.length <= 120 && mockAnswerOnly.test(prompt)) {
    return mockCliffhangerReply;
  }

  mockPhases.set(sessionId, 'afterParable');
  return mockReply;
}

export async function sendChat(sessionId, message, adminMode = 'exam') {
  if (!isLiveChat) {
    await new Promise((resolve) => setTimeout(resolve, 450));
    return mockChat(sessionId, message, adminMode);
  }

  const response = await fetch('/api/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ sessionId, message, adminMode }),
  });

  if (!response.ok) throw new Error('Chat request failed');

  const reply = await response.json();
  if (typeof reply?.mode !== 'string' || typeof reply.text !== 'string' ||
      !reply.text.trim() || typeof reply.locked !== 'boolean') {
    throw new Error('Invalid chat reply');
  }
  if (reply.mode === 'integrity' &&
      (!reply.locked || typeof reply.citation !== 'string' || !reply.citation.trim())) {
    throw new Error('Invalid integrity reply');
  }

  return reply;
}
