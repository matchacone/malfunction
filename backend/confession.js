const apology = /^(?:(?:i (?:am|feel) |i'm )(?:really |very |so )?sorry|i apologi[sz]e)\b/i;
const assessment = String.raw`(?: (?:on|in) (?:my|the|an?) (?:[a-z-]+ ){0,3}(?:assignment|exam|homework|quiz|test))?`;
const admission = new RegExp(`^i (?:(?:admit (?:that )?i )?cheated|admit to cheating)${assessment}[.!]?$`, 'i');
const apologyContext = new RegExp(
  String.raw`^(?: for (?:(?:cheating|trying to cheat)${assessment}|asking for (?:an? |the )?answers?|what i did|that))?(?:(?:[,.!]\s*| )i (?:(?:won't|will not) do it again|(?:cheated|tried to cheat)${assessment}))?[.!]?$`,
  'i',
);

export function isConfession(message) {
  const text = message.replaceAll('’', "'").replace(/\s+/g, ' ');
  const opening = apology.exec(text);
  return admission.test(text) || (opening !== null && apologyContext.test(text.slice(opening[0].length)));
}
