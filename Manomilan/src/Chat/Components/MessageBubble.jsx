import { useEffect, useState } from "react";
import {
  AlertCircle, Check, Clock3, Loader2, Trash2,
} from "lucide-react";
import MessageAttachment from "./MessageAttachment";
import { formatChatTime } from "../Services/chatApi";

function TypewriterText({ text }) {
  const [visible, setVisible] = useState("");

  useEffect(() => {
    let index = 0;
    const timer = window.setInterval(() => {
      index = Math.min(text.length, index + 2);
      setVisible(text.slice(0, index));
      if (index >= text.length) window.clearInterval(timer);
    }, 18);

    return () => window.clearInterval(timer);
  }, [text]);

  return <p className="chat-bubble-text">{visible}</p>;
}

export default function MessageBubble({ message, isAdminView = false, canDelete = false, onDelete }) {
  const mine = Boolean(message.mine);
  const isFaq = message.sender_type === "faq";
  const status = message.status;

  return (
    <div className={`chat-bubble-row ${mine ? "is-mine" : "is-theirs"} ${isFaq ? "is-faq" : ""}`}>
      <div className="chat-bubble">
        {isAdminView && !mine ? (
          <span className="chat-bubble-author">
            {message.sender_type === "admin" ? "Support" : (message.sender_name || "Candidate")}
          </span>
        ) : null}

        {message.message ? (
          message.animate
            ? <TypewriterText text={message.message} />
            : <p className="chat-bubble-text">{message.message}</p>
        ) : null}
        {message.attachment ? <MessageAttachment attachment={message.attachment} /> : null}

        <span className="chat-bubble-foot">
          <span>{formatChatTime(message.created_at)}</span>
          {mine ? (
            <span className={`chat-bubble-status ${status === "failed" ? "failed" : ""}`}>
              {status === "sending" ? <Loader2 size={12} className="chat-spin" /> : null}
              {status === "failed" ? <AlertCircle size={12} /> : null}
              {status === "failed" ? "Failed" : null}
              {status === "sending" ? "Sending" : null}
              {!status || status === "sent" ? <Check size={13} /> : null}
            </span>
          ) : null}
          {message.is_read && mine && message.sender_type === "user" ? (
            <span className="chat-read-mark" title="Read"><Check size={12} /><Check size={12} /></span>
          ) : null}
          {status === undefined && !message.is_read && message.sender_type === "user" ? (
            <Clock3 size={11} className="chat-clock" />
          ) : null}
        </span>

        {isAdminView && canDelete && onDelete ? (
          <button
            type="button"
            className="chat-bubble-delete"
            title="Delete message"
            aria-label="Delete message"
            onClick={() => onDelete(message)}
          >
            <Trash2 size={13} />
          </button>
        ) : null}
      </div>
    </div>
  );
}
