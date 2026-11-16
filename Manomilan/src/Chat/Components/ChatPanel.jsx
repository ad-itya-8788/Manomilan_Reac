import {
  HeadphonesIcon, MessageCircle, X,
} from "lucide-react";
import MessageList from "./MessageList";
import MessageComposer from "./MessageComposer";
import useCandidateChat from "../Hooks/useCandidateChat";
import useFaqChat from "../Hooks/useFaqChat";
import "../Styles/chat.css";

export default function ChatPanel({ onClose, embedded = false, fullScreen = false }) {
  const {
    conversation, messages, faqs, settings, loading, sending, error, hasMore,
    sendMessage, loadOlder, clearError,
  } = useCandidateChat({ active: true });
  const { messages: faqMessages, typing: faqTyping, askFaq } = useFaqChat();
  const threadMessages = [...messages, ...faqMessages].sort(
    (left, right) => new Date(left.created_at) - new Date(right.created_at),
  );

  return (
    <div className={`chat-panel ${embedded ? "is-embedded" : ""} ${fullScreen ? "is-fullscreen" : ""}`}>
      <header className="chat-panel-head">
        <span className="chat-panel-avatar"><HeadphonesIcon size={20} /></span>
        <div className="chat-panel-title">
          <strong>Help</strong>
          <small>
            <span className="chat-online-dot" /> Live support team
            {conversation?.status === "closed" ? " - closed" : ""}
          </small>
        </div>
        {onClose ? (
          <button type="button" className="chat-panel-close" onClick={onClose} aria-label="Close chat">
            <X size={18} />
          </button>
        ) : null}
      </header>

      {error ? (
        <div className="chat-error-bar" role="alert">
          <span>{error}</span>
          <button type="button" onClick={clearError} aria-label="Dismiss error"><X size={13} /></button>
        </div>
      ) : null}

      <MessageList
        messages={threadMessages}
        loading={loading}
        hasMore={hasMore}
        onLoadOlder={loadOlder}
        typing={faqTyping}
        typingLabel="Assistant is typing"
        emptyHint="Hi! Ask us anything about profiles, matches, payments or verification."
      />

      {faqs.length ? (
        <div className="chat-faq-strip" aria-label="Frequently asked questions">
          {faqs.map((faq) => (
            <button
              key={faq.id}
              type="button"
              onClick={() => askFaq(faq)}
              disabled={faqTyping}
            >
              <MessageCircle size={12} /> {faq.question}
            </button>
          ))}
        </div>
      ) : null}

      <MessageComposer
        onSend={sendMessage}
        sending={sending}
        settings={settings}
        placeholder={conversation?.status === "closed"
          ? "Send a message to reopen this conversation..."
          : "Type your message..."}
      />
    </div>
  );
}
