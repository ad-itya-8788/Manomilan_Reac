export default function TypingIndicator({ label = "Assistant is typing" }) {
  return (
    <div className="chat-bubble-row is-theirs chat-typing-row" aria-live="polite">
      <div className="chat-bubble chat-typing-bubble">
        <span className="chat-typing-dots" aria-hidden="true">
          <i />
          <i />
          <i />
        </span>
        <span className="chat-typing-label">{label}</span>
      </div>
    </div>
  );
}
