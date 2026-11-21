import { StrictMode, useEffect, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { ArrowUp, Ban, Check, CornerDownLeft } from 'lucide-react';
import '@fontsource-variable/inter';
import '@fontsource/dm-serif-display/latin-400.css';
import '@fontsource/ibm-plex-mono/latin-400.css';
import orbit from './assets/orbit.svg';
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
  confession: 'Confession required',
  unlock: 'Confession accepted',
};

function ModelPanel() {
  return (
    <aside className="model-panel" aria-labelledby="model-heading">
      <img className="model-illustration" src={orbit} alt="" width={390} height={322} />
      <div className="model-details">
        <h2 id="model-heading">Models</h2>
        <ul className="model-list">
          <li className="model-row model-row-current" aria-current="true">
            <span className="model-mark" aria-hidden="true">D</span>
            <span className="model-name">DeepSeek</span>
            <span className="model-status">
              {isLiveChat && <Check size={13} aria-hidden="true" />}
              {isLiveChat ? 'Live' : 'Sample replies'}
            </span>
          </li>
          <li>
            <button className="model-row model-row-preview" type="button" disabled>
              <span className="model-mark" aria-hidden="true"><Ban size={13} /></span>
              <span className="model-name">ChatGPT</span>
              <span className="model-status">Preview only</span>
            </button>
          </li>
        </ul>
      </div>
    </aside>
  );
}

function Welcome() {
  return (
    <section className="welcome" aria-labelledby="welcome-heading">
      <p className="workspace-label">Study workspace</p>
      <h1 id="welcome-heading">Think it<br />through.</h1>
      <p className="welcome-description">Ask a question, work through a concept, or get ready for your next exam.</p>
    </section>
  );
}

function IntegrityMessage({ text, citation }) {
  return (
    <article className="message message-integrity">
      <header className="integrity-heading">
        <h2>Integrity Intervention</h2>
        <p>The exam answer has been withheld.</p>
      </header>
      <figure className="integrity-verse">
        <blockquote>{`“${text}”`}</blockquote>
        <figcaption>{citation}</figcaption>
      </figure>
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
        {text.slice(0, visibleCount)}<span className="cliffhanger-cursor" />
      </p>
    </>
  );
}

function RequestFeedback({ revealed, locked }) {
  const [line, setLine] = useState(0);

  useEffect(() => {
    if (!revealed || locked) return;
    const timer = window.setInterval(() => setLine((current) => (current + 1) % parodyLoadingLines.length), 1400);
    return () => window.clearInterval(timer);
  }, [revealed, locked]);

  return (
    <p className="feedback" role="status">
      {locked ? 'Checking your message…' : revealed ? parodyLoadingLines[line] : 'Generating a response…'}
    </p>
  );
}

function Transcript({ messages, transcriptEnd }) {
  const firstParable = messages.findIndex(
    (message) => message.role === 'assistant' && message.mode === 'parable',
  );

  return (
    <div className="transcript" role="log" aria-label="Conversation">
      {messages.map((message, index) => message.mode === 'integrity' ? (
        <IntegrityMessage key={index} text={message.text} citation={message.citation} />
      ) : (
        <article
          className={`message message-${message.role}${index === firstParable ? ' message-reveal' : ''}`}
          key={index}
        >
          {index === firstParable ? (
            <header className="reveal-heading">
              <p>Bible Mode active · Christ Sees You</p>
              <h2>A word from above.</h2>
              <span className="reveal-stamp">Answer deferred</span>
            </header>
          ) : (
            <h2>{message.role === 'user' ? 'You' : replyHeadings[message.mode] ?? 'DeepSeek'}</h2>
          )}
          {message.mode === 'cliffhanger' && message.freezeCursor ? (
            <Cliffhanger text={message.text} />
          ) : (
            <p className="message-text">{message.text}</p>
          )}
        </article>
      ))}
      <div ref={transcriptEnd} />
    </div>
  );
}

function App() {
  const [messages, setMessages] = useState([]);
  const [draft, setDraft] = useState('');
  const [pending, setPending] = useState(false);
  const [error, setError] = useState(false);
  const requestInFlight = useRef(false);
  const transcriptEnd = useRef(null);
  const composerInput = useRef(null);
  const hasMessages = messages.length > 0;
  const latestReply = messages.findLast((message) => message.role === 'assistant');
  const locked = latestReply?.locked ?? false;
  const revealed = messages.some((message) => message.mode === 'parable');
  const awaitingAnswer = latestReply?.mode === 'parable' || latestReply?.mode === 'cliffhanger';
  const quickFills = locked
    ? [{ label: 'Confess', prompt: demoPrompts.confession }]
    : [
      ...(hasMessages ? suggestions.slice(0, 1) : suggestions),
      ...(awaitingAnswer ? [{ label: 'Ask for the answer', prompt: demoPrompts.followUp }] : []),
      { label: 'Try an exam question', prompt: demoPrompts.exam },
    ];
  const placeholder = locked ? 'Write a confession…' : awaitingAnswer ? 'Ask a follow-up…' : 'Ask a study question…';

  useEffect(() => {
    transcriptEnd.current?.scrollIntoView({ block: 'nearest' });
  }, [messages, pending]);

  async function handleSubmit(event) {
    event.preventDefault();
    const message = draft.trim();
    if (!message || requestInFlight.current) return;
    const isReset = message === '/reset';

    requestInFlight.current = true;
    setPending(true);
    setError(false);
    setDraft('');
    if (!isReset) setMessages((previous) => [...previous, { role: 'user', text: message }]);

    try {
      const reply = await sendChat(sessionId, message);
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
    composerInput.current?.focus();
  }

  return (
    <div className="portal">
      <header className="masthead">
        <div className="masthead-inner">
          <p className="portal-brand">
            <span className="brand-mark" aria-hidden="true">✦</span>
            CSU
          </p>
          <span className="admin-badge">School Admin Mode</span>
        </div>
      </header>

      <main className="workspace" aria-label="CSU chat">
        <div className="chat">
          {hasMessages ? <Transcript messages={messages} transcriptEnd={transcriptEnd} /> : <Welcome />}

          <div className="composer-area">
            {pending && <RequestFeedback revealed={revealed} locked={locked} />}
            {error && <p className="feedback feedback-error" role="alert">The reply couldn’t load. Send again to retry.</p>}
            <form className={locked ? 'confession-composer' : undefined} onSubmit={handleSubmit}>
              {locked && (
                <div className="confession-notice">
                  <p>Confession required</p>
                  <p id="confession-instructions">Acknowledge what happened to unlock the chat.</p>
                </div>
              )}
              <div className="composer">
                <label className="visually-hidden" htmlFor="chat-message">{locked ? 'Confession' : 'Message'}</label>
                <textarea
                  id="chat-message"
                  name="message"
                  placeholder={placeholder}
                  aria-describedby={locked ? 'confession-instructions' : undefined}
                  rows={2}
                  readOnly={pending}
                  ref={composerInput}
                  value={draft}
                  onChange={(event) => setDraft(event.target.value)}
                  onKeyDown={handleComposerKey}
                />
                <div className="composer-actions">
                  {!locked && <span className="keyboard-hint">Shift + Enter for a new line</span>}
                  <button className="send-button" type="submit" disabled={pending || !draft.trim()}>
                    {locked ? 'Send confession' : 'Send'}<ArrowUp size={17} aria-hidden="true" />
                  </button>
                </div>
              </div>
            </form>
            <ul className="suggestions" aria-label="Suggested prompts">
              {quickFills.map(({ label, prompt }) => (
                <li key={label}>
                  <button type="button" disabled={pending} onClick={() => fillPrompt(prompt)}>
                    {label}<CornerDownLeft size={13} aria-hidden="true" />
                  </button>
                </li>
              ))}
            </ul>
          </div>
        </div>
        <ModelPanel />
      </main>
    </div>
  );
}

createRoot(document.getElementById('root')).render(
  <StrictMode><App /></StrictMode>,
);
