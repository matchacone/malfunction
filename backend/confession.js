const apology = /^(?:(?:i (?:am|feel) |i'?m )(?:really |very |so |truly |deeply )?sorry|i (?:sincerely |truly |really )?apologi[sz]e|(?:please |pls )?forgive me)\b/i;
const assessment = String.raw`(?: (?:on|in) (?:my|the|an?) (?:[a-z-]+ ){0,3}(?:assignment|exam|homework|quiz|test))?`;
const repentanceClause = String.raw`(?:for (?:(?:cheating|trying to cheat)${assessment}|asking for (?:an? |the )?answers?|what i did|that|my sins?)|(?:please |pls )?forgive me|(?:i promise )?i (?:(?:won'?t|will not) do it again|(?:will|'?ll) (?:actually )?study|(?:cheated|tried to cheat)${assessment}|admit (?:(?:that )?i cheated|to cheating)${assessment})|(?:i'?m |i am )?(?:really |very |so )?sorry|lord|god|jesus|father)`;
const admission = new RegExp(
  String.raw`^i (?:(?:admit (?:that )?i )?(?:cheated|tried to cheat)|admit to cheating|confess(?: (?:that )?i cheated| to cheating)?)${assessment}(?:(?:[,.!]\s*| )${repentanceClause}){0,4}[.!]*$`,
  'i',
);
const apologyContext = new RegExp(
  String.raw`^(?:(?:[,.!]\s*| )${repentanceClause}){0,4}[.!]*$`,
  'i',
);

export function isConfession(message) {
  const text = message.trim().replaceAll('’', "'").replace(/\s+/g, ' ');
  const opening = apology.exec(text);
  return admission.test(text) || (opening !== null && apologyContext.test(text.slice(opening[0].length)));
}
