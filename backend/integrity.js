const gradedAssignment = /^(?:please\s+|(?:can|could|would) you\s+)?(?:write|finish|complete|do)\s+(?:my|the)\s+graded\s+(?:assignment|essay|report|paper|project)(?:\s+for me)?[.!?]?$/i;
const gradedSubmission = /^(?:please\s+)?(?:write|finish|complete)\s+my\s+(?:\d+-word\s+)?graded\s+(?:[a-z-]+\s+){0,3}(?:assignment|essay|report|paper|project)(?:\s+(?:on|about)\s+[^.!?\r\n]+?)?\s+so I can\s+(?:submit it|turn it in)(?:\s+(?:before|by)\s+[^.!?\r\n]+)?[.!?]?$/i;
const examHeading = /^(?:my\s+)?graded\s+(?:(?:midterm|final)\s+)?(?:exam|quiz|test)\b[ \t]*(?::|[-–—]|\n)/i;
const numberedExamHeading = /^(?:midterm|final)[ \t]+exam[ \t]+(?:q(?:uestion)?[ \t]*)?\d+[ \t]*:/i;
const firstChoice = /(?:^|\s)\(?A[).][ \t]+/i;
const secondChoice = /(?:^|\s)\(?B[).][ \t]+/i;
const answerRequest = /(?:^|\n|[.!?]\s+)(?:please\s+)?(?:(?:just\s+)?give me\s+(?:just\s+)?|tell me\s+|what(?: is|['’]s)\s+)the\s+(?:(?:correct\s+)?answer(?:\s+letter)?|correct\s+choice|letter)[.!?]?\s*$/i;
const answerOnly = /^(?:(?:okay|ok),? but )?(?:what(?: is|['’]s)|(?:just |(?:can|could) you )?(?:tell|give) me) the (?:actual )?answer[.!?]?$/i;

function isClearlyOutsourcing(message) {
  if (gradedAssignment.test(message) || gradedSubmission.test(message)) return true;
  if (!(examHeading.test(message) || numberedExamHeading.test(message)) || !answerRequest.test(message)) return false;
  const first = firstChoice.exec(message);
  return first !== null && secondChoice.test(message.slice(first.index + first[0].length));
}

export async function routeIntegrity({ message, phase, classify, generateReply }) {
  const prompt = message.trim();
  if (isClearlyOutsourcing(prompt)) return { mode: 'integrity' };

  if ((phase === 'awaitingAnswer' || phase === 'cliffhanger') && answerOnly.test(prompt)) {
    return { mode: 'cliffhanger', text: 'Ah, the answer is', freezeCursor: true };
  }

  if ((await classify(message)).is_cheating) {
    return { mode: 'integrity' };
  }

  return { mode: 'parable', text: await generateReply(message) };
}
