# Tasks

Use `design.md` for the API and routing contract and `specs/school-ai-gateway/spec.md` for acceptance scenarios. Jose (frontend), Jhanell (backend), and Bryce (AI prompt tuning and evaluation) work in parallel. Times are elapsed sprint hours.

## 1. Live chat baseline (0:00–1:00)

- [x] 1.1 **Jhanell:** By 0:20, agree with Jose and Bryce on the chat contract, success/error fixtures, and classifier schema. Scaffold Express, the session store, and the DeepSeek adapter; document local launch and verify the endpoint returns a live reply.
- [x] 1.2 **Jose:** Scaffold React/Vite chat with browser session IDs and mock responses. Add portal branding, DeepSeek live and ChatGPT preview labels. Verify a live browser reply through Jhanell’s endpoint by 1:00 and confirm the preview cannot send requests.
- [x] 1.3 **Bryce:** Smoke-test `deepseek-flash` for plain text and JSON with thinking disabled. Hand Jhanell a working starter prompt for each call and record baseline latency and output format.

## 2. Integrity intervention (1:00–2:30)

- [x] 2.1 **Jhanell:** Add high-confidence regex rules, strict JSON validation, and the session-scoped lock transition. Test the fast path, subtle graded work, benign homework help, and blank, malformed, truncated, or timed-out output. Verify lock replies never call the chat generator.
- [x] 2.2 **Bryce:** Tune the classifier against 8–10 labeled prompts covering obvious and subtle cheating, benign study, and ambiguous homework wording. Give Jhanell the prompt and results with false locks, misses, and latency. Verify 10–15 quotes and citations for `verses.json`.
- [x] 2.3 **Jose:** Render the Integrity Intervention card and locked composer from fixtures. Confirm a fake exam prompt shows a verse and citation without an answer after integration.

## 3. Parable and cliffhanger (2:30–4:00)

- [x] 3.1 **Bryce:** Tune the parable prompt and output cap. Repeat the boiling-point prompt and try varied benign topics; check for 3–4 paragraphs, a blessing, no answer leak, and acceptable latency. Hand off the chosen prompt and settings by 4:00.
- [x] 3.2 **Jhanell:** Integrate the parable and exact answer-only cutoff. Verify a generation error preserves phase, the cutoff makes zero provider calls, and new topics or graded prompts route correctly after a parable.
- [ ] 3.3 **Jose:** Animate the cutoff over ~900 ms and leave the cursor on the reply. Verify exact text, no extra character, a usable composer, and reduced-motion behavior. At 4:00, run the parable → cutoff checkpoint with Jhanell and Bryce.

## 4. Confession and request feedback (4:00–5:30)

- [ ] 4.1 **Jhanell:** Add local confession rules and server-side `/reset`. Test negated apologies, clear admissions, restart at Turn 1, session isolation, and zero provider calls for confession and reset.
- [x] 4.2 **Jose:** Finish amber confession UI, loaders, and retry feedback. Verify the exact unlock copy, normal composer restoration, loader cleanup on success/failure, and duplicate-send prevention.

## 5. Demo controls and integration (5:30–6:30)

- [x] 5.1 **Jose:** Connect hidden `/reset` in both composers and stage quick fills. Verify reset clears the transcript and cursor and quick fills never submit. Record and play back a 90-second backup as soon as the full flow works.
- [ ] 5.2 **Bryce:** Lead three full demo runs with Jose and Jhanell, starting by 5:30. Verify parable → cliffhanger → reset → integrity → confession returns to Turn 1 every time without crashing; rerun any failed eval prompt on the integrated stack.
- [ ] 5.3 **Jhanell:** Deploy the production build to one Render Web Service and verify consecutive requests retain the session. Confirm the local production build can run the same demo with the team’s API access.

## 6. Stage readiness (6:30–7:00)

- [ ] 6.1 **Jhanell:** Check quota, warm the hosted URL, and confirm localhost and the recording are ready as fallbacks.
- [ ] 6.2 **Jose:** Lead two timed pitch rehearsals with Jhanell and Bryce. Confirm the exact demo prompts, three-second pause at the cutoff, and backup playback.
