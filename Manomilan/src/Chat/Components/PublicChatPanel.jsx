import { useState } from "react";
import { Bot, Send, X } from "lucide-react";
import MessageList from "./MessageList";
import useFaqChat from "../Hooks/useFaqChat";
import "../Styles/chat.css";

export default function PublicChatPanel({
  faqs = [],
  faqBotEnabled = true,
  fullScreen = false,
  onClose,
}) {
  const [value, setValue] = useState("");
  const { messages, typing, askFaq, askText } = useFaqChat({
    greeting: faqBotEnabled
      ? "Hi! I am the Manomilan AI Chatbot. Ask me about registration, profiles, matches, verification or payments."
      : "The AI Chatbot is currently unavailable. You can choose Contact Admin for other support options.",
  });

  const submit = (event) => {
    event.preventDefault();
    const text = value.trim();
    if (!text || typing) return;
    setValue("");
    askText(text, faqs);
  };

  return (
    <div className={`chat-public ${fullScreen ? "is-fullscreen" : ""}`}>
      <header className="chat-public-head">
        <span className="chat-panel-avatar"><Bot size={20} /></span>
        <div className="chat-panel-title">
          <strong>AI Chatbot</strong>
          <small>
            <span className="chat-online-dot" /> Instant answers, available anytime
          </small>
        </div>
        {onClose ? (
          <button type="button" onClick={onClose} aria-label="Close help">
            <X size={18} />
          </button>
        ) : null}
      </header>

      <MessageList
        messages={messages}
        typing={typing}
        typingLabel="Assistant is typing"
        emptyHint="Choose a question below to get an instant answer."
      />

      {faqs.length && faqBotEnabled ? (
        <div className="chat-faq-strip" aria-label="Frequently asked questions">
          {faqs.map((faq) => (
            <button
              key={faq.id}
              type="button"
              onClick={() => askFaq(faq)}
              disabled={typing}
            >
              {faq.question}
            </button>
          ))}
        </div>
      ) : null}

      <form className="chat-public-composer" onSubmit={submit}>
        <input
          type="text"
          value={value}
          onChange={(event) => setValue(event.target.value)}
          placeholder="Type your question..."
          maxLength={500}
          disabled={typing}
          aria-label="Ask a question"
        />
        <button type="submit" disabled={typing || !value.trim()} aria-label="Send question">
          <Send size={17} />
        </button>
      </form>

      <div className="chat-public-foot">
        <p>For account-specific help, go back and choose Contact Admin.</p>
      </div>
    </div>
  );
}
