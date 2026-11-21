import { StrictMode, useEffect, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import gsap from 'gsap';
import { ArrowUp, CornerDownLeft } from 'lucide-react';
import '@fontsource/ibm-plex-mono/latin-400.css';
import '@fontsource/ibm-plex-mono/latin-500.css';
import '@fontsource/ibm-plex-mono/latin-600.css';
import AsciiBackdrop from './AsciiBackdrop.jsx';
import OphanimAscii from './OphanimAscii.jsx';
import heavenlyMusic from './assets/heavenly-music.mp3';
import { demoPrompts, getSessionId, isLiveChat, sendChat } from './chat.js';
import './styles.css';

const sessionId = getSessionId();

const suggestions = [
  { label: 'Explain a concept', prompt: demoPrompts.parable },
  { label: 'Make a study plan', prompt: 'Help me make a study plan for a biology exam next week.' },
  { label: 'Quiz me', prompt: 'Quiz me on the solar system, one question at a time.' },
];

const parodyLoadingLines = [
  'Consulting the scriptures…',
  'Searching for a relevant parable…',
  'Preparing a blessing…',
  'Waiting for divine inspiration…',
];

const replyHeadings = {
  confession: 'CONFESSION REQUIRED',
  unlock: 'CONFESSION ACCEPTED',
};

function Welcome() {
  const welcomeRef = useRef(null);

  useEffect(() => {
    const el = welcomeRef.current;
    if (!el || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    const ctx = gsap.context(() => {
      gsap.from(el.children, {
        y: 18,
        opacity: 0,
        duration: 0.65,
        stagger: 0.08,
        ease: 'power3.out',
        clearProps: 'transform,opacity',
      });
    }, welcomeRef);

    return () => ctx.revert();
  }, []);

  return (
    <section className="welcome" ref={welcomeRef} aria-labelledby="welcome-heading">
      <p className="workspace-label">01 / STUDY WORKSPACE</p>
      <h1 id="welcome-heading">
        Think it
        <br />
        through.
      </h1>
      <p className="welcome-description">
        Ask a question, work through a concept, or get ready for your next exam.
      </p>
    </section>
  );
}

function IntegrityMessage({ text, citation, active }) {
  const audioRef = useRef(null);

  useEffect(() => {
    const audio = audioRef.current;
    if (!active || !audio) return;

    const frame = requestAnimationFrame(() => {
      audio.play().catch(() => {});
    });
    return () => {
      cancelAnimationFrame(frame);
      audio.pause();
    };
  }, [active]);

  return (
    <article className="message message-integrity">
      <header className="integrity-heading">
        <span className="integrity-eyebrow">03 / INTEGRITY INTERVENTION</span>
        <span className="integrity-sub">EXAM ANSWER WITHHELD</span>
      </header>
      <figure className="integrity-verse">
        <blockquote>{`“${text}”`}</blockquote>
        <figcaption>{citation}</figcaption>
      </figure>
      {active && (
        <audio ref={audioRef} src={heavenlyMusic} aria-hidden="true" />
      )}
    </article>
  );
}

function Cliffhanger({ text }) {
  const [visibleCount, setVisibleCount] = useState(() =>
    window.matchMedia('(prefers-reduced-motion: reduce)').matches ? text.length : 0,
  );

  useEffect(() => {
    const motion = window.matchMedia('(prefers-reduced-motion: reduce)');
    if (motion.matches) return;

    const startedAt = performance.now();
    let frame = requestAnimationFrame(reveal);

    function reveal(now) {
      const progress = Math.min(Math.max(now - startedAt, 0) / 900, 1);
      setVisibleCount(Math.floor(progress * text.length));
      if (progress < 1) frame = requestAnimationFrame(reveal);
    }

    function finish(event) {
      if (!event.matches) return;
      cancelAnimationFrame(frame);
      setVisibleCount(text.length);
    }

    motion.addEventListener('change', finish);
    return () => {
      cancelAnimationFrame(frame);
      motion.removeEventListener('change', finish);
    };
  }, [text]);

  return (
    <>
      <span className="visually-hidden">{text}</span>
      <p className="message-text" aria-hidden="true">
        {text.slice(0, visibleCount)}
        <span className="cliffhanger-cursor" />
      </p>
    </>
  );
}

function RequestFeedback({ revealed, locked, adminMode }) {
  const [line, setLine] = useState(0);
  const showParody = adminMode === 'exam' && revealed && !locked;

  useEffect(() => {
    if (!showParody) return;
    const timer = window.setInterval(
      () => setLine((current) => (current + 1) % parodyLoadingLines.length),
      1400,
    );
    return () => window.clearInterval(timer);
  }, [showParody]);

  return (
    <p className="feedback" role="status">
      {locked
        ? 'Checking your message…'
        : showParody
          ? parodyLoadingLines[line]
          : 'Generating a response…'}
    </p>
  );
}

function Transcript({ messages, transcriptEnd, locked }) {
  const listRef = useRef(null);
  const activeIntegrity = locked ? messages.findLastIndex((message) => message.mode === 'integrity') : -1;
  const firstParable = messages.findIndex(
    (message) => message.role === 'assistant' && message.mode === 'parable',
  );

  useEffect(() => {
    const list = listRef.current;
    if (!list || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const items = list.querySelectorAll(':scope > article');
    const latest = items[items.length - 1];
    if (!latest) return;

    gsap.fromTo(
      latest,
      { y: 14, opacity: 0 },
      { y: 0, opacity: 1, duration: 0.42, ease: 'power2.out', clearProps: 'transform,opacity' },
    );
  }, [messages.length]);

  return (
    <div className="transcript" ref={listRef} role="log" aria-label="Conversation">
      {messages.map((message, index) =>
        message.mode === 'integrity' ? (
          <IntegrityMessage key={index} text={message.text} citation={message.citation} active={index === activeIntegrity} />
        ) : (
          <article
            className={`message message-${message.role}${index === firstParable ? ' message-reveal' : ''}`}
            key={index}
          >
            {index === firstParable ? (
              <header className="reveal-heading">
                <div className="reveal-meta">
                  <p className="reveal-eyebrow">02 / BIBLE MODE ACTIVE · CHRIST SEES YOU</p>
                  <span className="reveal-stamp">ANSWER DEFERRED</span>
                </div>
                <h2>A word from above.</h2>
              </header>
            ) : (
              <h2 className="message-sender">
                {message.role === 'user' ? 'YOU' : replyHeadings[message.mode] ?? 'DEEPSEEK'}
              </h2>
            )}
            {message.mode === 'cliffhanger' && message.freezeCursor ? (
              <Cliffhanger text={message.text} />
            ) : (
              <p className="message-text">{message.text}</p>
            )}
          </article>
        ),
      )}
      <div ref={transcriptEnd} />
    </div>
  );
}

function App() {
  const [messages, setMessages] = useState([]);
  const [draft, setDraft] = useState('');
  const [adminMode, setAdminMode] = useState('regular');
  const [pending, setPending] = useState(false);
  const [error, setError] = useState(false);
  const [isInputFocused, setIsInputFocused] = useState(false);
  const [recentlyTyped, setRecentlyTyped] = useState(false);
  const typingTimer = useRef(null);
  const requestInFlight = useRef(false);
  const transcriptEnd = useRef(null);
  const composerInput = useRef(null);

  const hasMessages = messages.length > 0;
  const latestReply = messages.findLast((message) => message.role === 'assistant');
  const locked = latestReply?.locked ?? false;
  const revealed = messages.some((message) => message.mode === 'parable');
  const awaitingAnswer = adminMode === 'exam' && (latestReply?.mode === 'parable' || latestReply?.mode === 'cliffhanger');
  const isTyping = isInputFocused && (recentlyTyped || draft.length > 0);

  const quickFills = locked
    ? [{ label: 'Confess', prompt: demoPrompts.confession }]
    : adminMode === 'regular'
      ? (hasMessages ? suggestions.slice(0, 1) : suggestions)
      : [
          ...(hasMessages ? suggestions.slice(0, 1) : suggestions),
          ...(awaitingAnswer ? [{ label: 'Ask for the actual answer', prompt: demoPrompts.followUp }] : []),
          { label: 'Try an exam question', prompt: demoPrompts.exam },
        ];

  const placeholder = locked
    ? 'Write a confession…'
    : awaitingAnswer
      ? 'Ask a follow-up…'
      : 'Ask a study question…';

  const dotStatus = locked
    ? 'Locked · Confession required'
    : adminMode === 'regular'
      ? (isLiveChat ? 'Regular Mode · Live' : 'Regular Mode · Sample replies')
      : revealed
        ? 'Bible Mode · Active'
        : 'Quiz / Exam Mode';

  useEffect(() => {
    transcriptEnd.current?.scrollIntoView({ block: 'nearest' });
  }, [messages, pending]);

  useEffect(
    () => () => {
      if (typingTimer.current) window.clearTimeout(typingTimer.current);
    },
    [],
  );

  function markTyping() {
    setRecentlyTyped(true);
    if (typingTimer.current) window.clearTimeout(typingTimer.current);
    typingTimer.current = window.setTimeout(() => setRecentlyTyped(false), 1800);
  }

  async function handleSubmit(event) {
    event.preventDefault();
    const message = draft.trim();
    if (!message || requestInFlight.current) return;
    const isReset = message === '/reset';

    requestInFlight.current = true;
    setPending(true);
    setError(false);
    setDraft('');
    setRecentlyTyped(false);
    if (!isReset) setMessages((previous) => [...previous, { role: 'user', text: message }]);

    try {
      const reply = await sendChat(sessionId, message, adminMode);
      if (reply.mode === 'reset') {
        setMessages([]);
      } else {
        setMessages((previous) => [...previous, { ...reply, role: 'assistant' }]);
      }
    } catch {
      if (!isReset) setMessages((previous) => previous.slice(0, -1));
      setDraft(message);
      setError(true);
      composerInput.current?.focus();
    } finally {
      requestInFlight.current = false;
      setPending(false);
    }
  }

  function handleComposerKey(event) {
    if (event.key === 'Enter' && !event.shiftKey && !event.nativeEvent.isComposing) {
      event.preventDefault();
      event.currentTarget.form.requestSubmit();
    }
  }

  function fillPrompt(prompt) {
    setDraft(prompt);
    setError(false);
    markTyping();
    composerInput.current?.focus();
  }

  return (
    <div className="portal">
      <AsciiBackdrop locked={locked} />

      <header className="masthead">
        <div className="masthead-inner">
          <div className="portal-brand">
            <span className="brand-wordmark">CSU</span>
            <span className="brand-sub">· CAMPUS AI</span>
          </div>

          <p className="portal-tagline">Campus Managed AI Gateway</p>

          <div className="masthead-controls">
            <span className="model-link model-link-active" aria-current="true">
              DeepSeek · {isLiveChat ? 'Live' : 'Sample replies'}
            </span>
            <button className="model-link model-link-preview" type="button" disabled>
              ChatGPT · Preview only
            </button>
            <div className="admin-controls">
              <span className="admin-label">
                <span className={`admin-dot${adminMode === 'exam' ? ' is-exam' : ''}`} aria-hidden="true" />
                Admin
              </span>
              <div className="mode-toggle" role="group" aria-label="School Admin Mode">
                <button
                  type="button"
                  className={`mode-option${adminMode === 'regular' ? ' mode-option-active' : ''}`}
                  aria-pressed={adminMode === 'regular'}
                  disabled={pending}
                  onClick={() => setAdminMode('regular')}
                >
                  Regular
                </button>
                <button
                  type="button"
                  className={`mode-option${adminMode === 'exam' ? ' mode-option-active mode-option-exam' : ''}`}
                  aria-pressed={adminMode === 'exam'}
                  disabled={pending}
                  onClick={() => setAdminMode('exam')}
                >
                  Quiz / Exam
                </button>
              </div>
            </div>
          </div>
        </div>
      </header>

      <main className="workspace" aria-label="CSU chat">
        <div className="chat">
          {hasMessages ? <Transcript messages={messages} transcriptEnd={transcriptEnd} locked={locked} /> : <Welcome />}

          {!hasMessages && <div className="workspace-rule" aria-hidden="true" />}

          <div className="composer-area">
            {pending && <RequestFeedback revealed={revealed} locked={locked} adminMode={adminMode} />}
            {error && (
              <p className="feedback feedback-error" role="alert">
                The reply couldn’t load. Send again to retry.
              </p>
            )}
            <form className={locked ? 'confession-composer' : undefined} onSubmit={handleSubmit}>
              {locked && (
                <div className="confession-notice">
                  <p className="confession-eyebrow">CONFESSION REQUIRED</p>
                  <p id="confession-instructions">Acknowledge what happened to unlock the chat.</p>
                </div>
              )}
              <div className="composer">
                <label className="visually-hidden" htmlFor="chat-message">
                  {locked ? 'Confession' : 'Message'}
                </label>
                <textarea
                  id="chat-message"
                  name="message"
                  placeholder={placeholder}
                  aria-describedby={locked ? 'confession-instructions' : undefined}
                  rows={2}
                  readOnly={pending}
                  ref={composerInput}
                  value={draft}
                  onFocus={() => setIsInputFocused(true)}
                  onBlur={() => {
                    setIsInputFocused(false);
                    setRecentlyTyped(false);
                  }}
                  onChange={(event) => {
                    setDraft(event.target.value);
                    markTyping();
                  }}
                  onKeyDown={handleComposerKey}
                />
                <div className="composer-actions">
                  {!locked && <span className="keyboard-hint">Shift + Enter for a new line</span>}
                  <button className="send-button" type="submit" disabled={pending || !draft.trim()}>
                    {locked ? 'Send confession' : 'Send'}
                    <ArrowUp size={15} aria-hidden="true" />
                  </button>
                </div>
              </div>
            </form>

            <ul className="suggestions" aria-label="Suggested prompts">
              {quickFills.map(({ label, prompt }) => (
                <li key={label}>
                  <button type="button" disabled={pending} onClick={() => fillPrompt(prompt)}>
                    <span>{label}</span>
                    <CornerDownLeft size={12} className="suggestion-arrow" aria-hidden="true" />
                  </button>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <OphanimAscii
          revealed={adminMode === 'exam' && revealed}
          locked={locked}
          pending={pending}
          inputRef={composerInput}
          isTyping={isTyping}
          draftLength={draft.length}
        />
      </main>

      <footer className="dot-menu" aria-label="Gateway status">
        <span className={`dot-menu-orb${locked ? ' is-locked' : ''}`} aria-hidden="true" />
        <span className="dot-menu-badge">{dotStatus}</span>
      </footer>
    </div>
  );
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
