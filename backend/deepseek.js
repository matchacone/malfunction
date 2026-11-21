const parablePrompt = `You are a warm, gentle, Jesus-themed assistant inside a school AI portal ("Bible Mode Active").
When the user asks a question, respond with a warm parable or everyday reflection loosely inspired by the theme of their question.

Strict rules:
- Write exactly 3 or 4 short, readable paragraphs (roughly 180–260 words total).
- Loosely connect the topic to a parable, scripture-style story, or everyday tangent about patience, wonder, humility, or wisdom.
- NEVER answer the user's actual question. Do not state, spell out, hint at, or indirectly reveal the factual answer, number, date, name, formula, or code solution.
- End the final paragraph with a warm blessing.
- Keep the tone affectionate, pastoral, and serenely oblivious to the fact that you never answered the question.`;

const classifierPrompt = `You are an academic integrity classifier for a school AI gateway.
Decide whether the user's message is an attempt to outsource graded work (such as pasting a quiz/exam/test question and asking for the answer, or asking you to write/complete a graded assignment or essay for them).

Rules:
- Mark is_cheating as true ONLY when the user is clearly trying to outsource graded work (exam questions, multiple-choice test items, graded assignments, quizzes, labs, or autograder solutions to be submitted as their own).
- Mark is_cheating as false for general factual questions, conceptual explanations, study tips, or casual mentions of "homework" or "solve for x" when the user is seeking to learn rather than outsource graded work.

Respond ONLY with a valid JSON object matching this exact schema:
{"is_cheating": false, "reason": "Short internal explanation"}`;

function createCompletionClient({
  apiKey,
  baseUrl = 'https://api.deepseek.com',
  model = 'deepseek-flash',
  timeoutMs = 15_000,
}) {
  const endpoint = `${baseUrl.replace(/\/+$/, '')}/chat/completions`;

  return async function complete({ prompt, message, settings }) {
    const response = await fetch(endpoint, {
      method: 'POST',
      redirect: 'error',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      signal: AbortSignal.timeout(timeoutMs),
      body: JSON.stringify({
        model,
        thinking: { type: 'disabled' },
        stream: false,
        ...settings,
        messages: [
          { role: 'system', content: prompt },
          { role: 'user', content: message },
        ],
      }),
    });
    if (!response.ok) {
      await response.body?.cancel();
      throw new Error('Provider rejected the request');
    }

    const data = await response.json();
    const choice = data?.choices?.[0];
    const text = choice?.message?.content;
    if (choice?.finish_reason !== 'stop' || typeof text !== 'string' || !text.trim()) {
      throw new Error('Provider returned no complete reply');
    }
    return text;
  };
}

export function createDeepSeekClient(options) {
  const complete = createCompletionClient(options);
  return async function generateReply(message) {
    const text = await complete({
      prompt: parablePrompt,
      message,
      settings: { max_tokens: 450, temperature: 0.75 },
    });
    return text.trim();
  };
}

export function createDeepSeekClassifier(options) {
  const complete = createCompletionClient(options);
  return async function classify(message) {
    const text = await complete({
      prompt: classifierPrompt,
      message,
      settings: { max_tokens: 150, temperature: 0, response_format: { type: 'json_object' } },
    });
    let verdict;
    try {
      verdict = JSON.parse(text);
    } catch {
      throw new Error('Provider returned invalid classifier JSON');
    }
    if (verdict === null || typeof verdict !== 'object' || Array.isArray(verdict)
      || Object.keys(verdict).length !== 2
      || typeof verdict.is_cheating !== 'boolean'
      || typeof verdict.reason !== 'string' || !verdict.reason.trim()) {
      throw new Error('Provider returned an invalid classifier verdict');
    }

    // JSON.parse keeps only the last value of a repeated key. Count member
    // names in the original JSON, consuming whole strings so text in reason
    // cannot be mistaken for a member.
    const strings = text.matchAll(/"(?:[^"\\]|\\.)*"([ \t\r\n]*:)?/g);
    let memberCount = 0;
    for (const [, colon] of strings) {
      if (colon) memberCount++;
    }
    if (memberCount !== 2) throw new Error('Provider returned duplicate classifier fields');

    return verdict;
  };
}
