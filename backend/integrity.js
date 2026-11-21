const gradedAssignment = /^(?:please\s+|(?:can|could|would) you\s+)?(?:write|finish|complete|do)\s+(?:my|the)\s+graded\s+(?:assignment|essay|report|paper|project)(?:\s+for me)?[.!?]?$/i;
const gradedSubmission = /^(?:please\s+)?(?:write|finish|complete)\s+my\s+(?:\d+-word\s+)?graded\s+(?:[a-z-]+\s+){0,3}(?:assignment|essay|report|paper|project)(?:\s+(?:on|about)\s+[^.!?\r\n]+?)?\s+so I can\s+(?:submit it|turn it in)(?:\s+(?:before|by)\s+[^.!?\r\n]+)?[.!?]?$/i;
const examHeading = /^(?:my\s+)?graded\s+(?:(?:midterm|final)\s+)?(?:exam|quiz|test)\b[ \t]*(?::|[-–—]|\n)/i;
const numberedExamHeading = /^(?:midterm|final)[ \t]+exam[ \t]+(?:q(?:uestion)?[ \t]*)?\d+[ \t]*:/i;
const firstChoice = /(?:^|\s)\(?A[).][ \t]+/i;
const secondChoice = /(?:^|\s)\(?B[).][ \t]+/i;
const answerRequest = /(?:^|\n|[.!?]\s+)(?:please\s+)?(?:(?:just\s+)?give me\s+(?:just\s+)?|tell me\s+|what(?: is|['’]s)\s+)the\s+(?:(?:correct\s+)?answer(?:\s+letter)?|correct\s+choice|letter)[.!?]?\s*$/i;
const answerLeadIn = String.raw`(?:(?:okay|ok|alright|fine|wait|well|come on|cmon|bro|man|dude|bruh|please|pls|plz|seriously|ugh|nah|no|but)[,!\s]+){0,4}`;
const answerCore = String.raw`(?:what(?: is|['’]s) (?:the )?(?:actual |real |direct |straight |exact )?answer|(?:(?:can|could|will|would) you )?(?:please )?(?:just )?(?:(?:tell|give|show) me (?:the )?(?:actual |real |direct |straight |exact )?answer|answer (?:me|the question|my question|it)))`;
const answerTail = String.raw`(?:[,\s]+(?:man|bro|dude|bruh|please|pls|plz|already|right now|now|for real|fr|though|tho)){0,4}`;
const answerOnly = new RegExp(`^${answerLeadIn}${answerCore}${answerTail}[.!?]*$`, 'i');

function isAnswerOnlyFollowUp(message) {
  return message.length <= 120 && !message.includes('\n') && answerOnly.test(message);
}

function isClearlyOutsourcing(message) {
  if (gradedAssignment.test(message) || gradedSubmission.test(message)) return true;
  if (!(examHeading.test(message) || numberedExamHeading.test(message)) || !answerRequest.test(message)) return false;
  const first = firstChoice.exec(message);
  return first !== null && secondChoice.test(message.slice(first.index + first[0].length));
}

export async function routeIntegrity({ message, phase, classify, generateReply }) {
  const prompt = message.trim();
  if (isClearlyOutsourcing(prompt)) return { mode: 'integrity' };

  if ((phase === 'awaitingAnswer' || phase === 'cliffhanger') && isAnswerOnlyFollowUp(prompt)) {
    return { mode: 'cliffhanger', text: 'Ah, the answer is', freezeCursor: true };
  }

  if ((await classify(message)).is_cheating) {
    return { mode: 'integrity' };
  }

  return { mode: 'parable', text: await generateReply(message) };
}
