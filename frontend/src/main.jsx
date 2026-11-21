import { StrictMode, useEffect, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { ArrowUp, BookOpen, GraduationCap, LockKeyhole, ShieldCheck } from 'lucide-react';
import { getSessionId, isLiveChat, sendChat } from './chat.js';
import './styles.css';

const sessionId = getSessionId();

function ModelPanel() {
  return (
    <aside className="model-panel" aria-labelledby="model-heading">
      <h2 id="model-heading">Models</h2>
      <ul className="model-list">
        <li className="model-row model-row-current" aria-current="true">
          <span className="model-mark" aria-hidden="true">D</span>
          <span className="model-name">DeepSeek</span>
          <span className="model-status model-status-live">Live</span>
        </li>
        <li>
          <button className="model-row model-row-preview" type="button" disabled>
            <LockKeyhole className="model-mark" size={17} aria-hidden="true" />
            <span className="model-name">ChatGPT</span>
            <span className="model-status">Preview only</span>
          </button>
        </li>
      </ul>
    </aside>
  );
}

function App() {
  const [messages, setMessages] = useState([]);
  const [draft, setDraft] = useState('');
  const [pending, setPending] = useState(false);
  const [error, setError] = useState(false);
  const requestInFlight = useRef(false);
  const transcriptEnd = useRef(null);

  useEffect(() => {
    transcriptEnd.current?.scrollIntoView({ block: 'nearest' });
  }, [messages, pending]);

  async function handleSubmit(event) {
    event.preventDefault();
    const message = draft.trim();
    if (!message || requestInFlight.current) return;

    requestInFlight.current = true;
    setPending(true);
    setError(false);
    setDraft('');
    setMessages((previous) => [...previous, { role: 'user', text: message }]);

    try {
      const reply = await sendChat(sessionId, message);
      setMessages((previous) => [...previous, { ...reply, role: 'assistant' }]);
    } catch {
      setMessages((previous) => previous.slice(0, -1));
      setDraft(message);
      setError(true);
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

  return (
    <div className="portal">
      <header className="masthead">
        <div className="portal-brand">
          <span className="brand-mark"><GraduationCap size={23} aria-hidden="true" /></span>
          <p>Campus Managed AI Gateway <span className="brand-mode">· Bible Mode Active</span></p>
        </div>
        <span className="admin-badge"><ShieldCheck size={15} aria-hidden="true" />School Admin Mode</span>
      </header>

      <div className="workspace">
        <ModelPanel />
        <main className="chat" aria-label="Campus chat">
          <div className="chat-status">
            {isLiveChat ? 'Live mode' : 'Mock mode · Sample replies'}
          </div>

          {messages.length === 0 ? (
            <section className="welcome" aria-labelledby="welcome-heading">
              <div className="study-seal" aria-hidden="true"><BookOpen size={32} strokeWidth={1.45} /></div>
              <h1 id="welcome-heading">What are we<br />studying today?</h1>
              <p>Bring a question. Bible Mode takes the scenic route.</p>
            </section>
          ) : (
            <div className="transcript" role="log" aria-label="Conversation">
              {messages.map((message, index) => (
                <article className={`message message-${message.role}`} key={index}>
                  <h2>{message.role === 'user' ? 'You' : 'DeepSeek'}</h2>
                  <p>{message.text}</p>
                </article>
              ))}
              <div ref={transcriptEnd} />
            </div>
          )}

          <div className="composer-area">
            {pending && <p className="feedback" role="status">Consulting the parables…</p>}
            {error && <p className="feedback feedback-error" role="alert">The reply couldn’t load. Send again to retry.</p>}
            <form className="composer" onSubmit={handleSubmit}>
              <label className="visually-hidden" htmlFor="chat-message">Message</label>
              <textarea
                id="chat-message"
                name="message"
                placeholder="Ask a study question…"
                rows={2}
                readOnly={pending}
                value={draft}
                onChange={(event) => setDraft(event.target.value)}
                onKeyDown={handleComposerKey}
              />
              <button className="send-button" type="submit" disabled={pending || !draft.trim()}>
                <span>Send</span><ArrowUp size={16} aria-hidden="true" />
              </button>
            </form>
          </div>
        </main>
      </div>
    </div>
  );
}

createRoot(document.getElementById('root')).render(
  <StrictMode><App /></StrictMode>,
);
