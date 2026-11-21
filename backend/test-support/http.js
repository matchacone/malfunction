import { once } from 'node:events';

export async function listen(t, server) {
  server.listen(0, '127.0.0.1');
  await once(server, 'listening');
  t.after(() => {
    server.close();
    server.closeAllConnections();
  });
  return `http://127.0.0.1:${server.address().port}`;
}

export function completion(res, content, finishReason = 'stop') {
  res.setHeader('Content-Type', 'application/json');
  res.end(JSON.stringify({
    id: 'fixture-completion',
    object: 'chat.completion',
    created: 1,
    model: 'deepseek-flash',
    system_fingerprint: 'fixture',
    choices: [{ index: 0, finish_reason: finishReason, message: { role: 'assistant', content }, logprobs: null }],
    usage: { prompt_tokens: 30, completion_tokens: 12, total_tokens: 42 },
  }));
}
