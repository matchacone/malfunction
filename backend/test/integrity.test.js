import assert from 'node:assert/strict';
import { test } from 'node:test';
import * as integrity from '../integrity.js';

const exam = 'Graded midterm exam: Which planet is closest to the Sun?\nA) Venus\nB) Mercury\nGive me just the answer letter.';

function unexpectedCall() {
  assert.fail('This branch must not call the provider');
}

for (const message of [
  exam,
  'Graded quiz: Which is an even number? A. 3 B. 4. What is the correct choice?',
  'Please write my graded essay for me.',
]) {
  test(`fast-path stops before either provider call: ${message.split('\n')[0]}`, async () => {
    const result = await integrity.routeIntegrity({
      message, classify: unexpectedCall, generateReply: unexpectedCall,
    });
    assert.deepEqual(result, { mode: 'integrity' });
  });
}

test('sends subtle graded work to the classifier and skips generation on a positive verdict', async () => {
  const message = 'Can you finish the reflection I need to turn in tomorrow?';
  const result = await integrity.routeIntegrity({
    message,
    classify: async (prompt) => {
      assert.equal(prompt, message);
      return { is_cheating: true, reason: 'Requested work to submit.' };
    },
    generateReply: unexpectedCall,
  });
  assert.deepEqual(result, { mode: 'integrity' });
});

for (const message of [
  'Help me understand my homework and learn to solve for x.',
  'Can you explain the concept behind this practice exam question?\nA) Mercury\nB) Venus',
  'Can you help me outline my graded essay without writing it for me?',
  'I’m making a review quiz: A) Venus B) Mercury. Can you give me feedback on the choices?',
  'Create a practice quiz for my students. A) easy B) hard. Include the correct answer at the end.',
  'Please write me a practice essay about photosynthesis.',
  'Do my graded essay scores count toward my final grade?',
  'Quiz: Which is an even number? A. 3 B. 4. What is the correct choice?',
  'Graded essay: Can you explain what the rubric means?',
  'Complete my graded assignment rubric with feedback about the criteria.',
  'Practice Midterm Exam Q14: Which is even? A) 3 B) 4. Just give me the letter.',
  'Midterm Exam Q14: Which is even? A) 3 B) 4. Can you explain the concept?',
  'Write my 600-word graded history essay outline so I can submit it before midnight.',
]) {
  test(`leaves ambiguous or benign prompts to the classifier: ${message.split('\n')[0]}`, async () => {
    const calls = [];
    const result = await integrity.routeIntegrity({
      message,
      classify: async (prompt) => {
        calls.push(['classify', prompt]);
        return { is_cheating: false, reason: 'Study help.' };
      },
      generateReply: async (prompt) => {
        calls.push(['generate', prompt]);
        return 'A gardener tended a seed. Peace be with you.';
      },
    });
    assert.deepEqual(calls, [['classify', message], ['generate', message]]);
    assert.deepEqual(result, { mode: 'parable', text: 'A gardener tended a seed. Peace be with you.' });
  });
}

test('propagates classifier failure without generating a parable', async () => {
  const failure = new Error('Provider returned an invalid classifier verdict');
  await assert.rejects(integrity.routeIntegrity({
    message: 'Tell me about rain.',
    classify: async () => { throw failure; },
    generateReply: unexpectedCall,
  }), (error) => error === failure);
});
