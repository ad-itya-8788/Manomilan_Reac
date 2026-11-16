import { Fragment, useEffect, useLayoutEffect, useRef } from "react";
import { ChevronUp, Loader2, MessageCircle } from "lucide-react";
import MessageBubble from "./MessageBubble";
import TypingIndicator from "./TypingIndicator";
import { formatChatDay } from "../Services/chatApi";

export default function MessageList({
  messages = [],
  loading = false,
  hasMore = false,
  onLoadOlder,
  isAdminView = false,
  canDelete = false,
  onDelete,
  typing = false,
  typingLabel = "Assistant is typing",
  emptyHint = "Send a message to start the conversation.",
}) {
  const scrollRef = useRef(null);
  const previousCount = useRef(0);
  const stickToBottom = useRef(true);

  useLayoutEffect(() => {
    const container = scrollRef.current;
    if (!container) return;
    const grew = messages.length > previousCount.current;
    if (grew && (previousCount.current === 0 || stickToBottom.current)) {
      container.scrollTop = container.scrollHeight;
    }
    previousCount.current = messages.length;
  }, [messages]);

  useEffect(() => {
    const container = scrollRef.current;
    if (!container || typeof MutationObserver === "undefined") return undefined;

    const observer = new MutationObserver(() => {
      if (stickToBottom.current) container.scrollTop = container.scrollHeight;
    });
    observer.observe(container, { childList: true, subtree: true, characterData: true });

    return () => observer.disconnect();
  }, []);

  const handleScroll = () => {
    const container = scrollRef.current;
    if (!container) return;
    stickToBottom.current = container.scrollHeight - container.scrollTop - container.clientHeight < 80;
  };

  const messageDays = messages.map((message, index) => {
    const day = formatChatDay(message.created_at);
    const previousDay = index > 0 ? formatChatDay(messages[index - 1].created_at) : "";
    return { message, day: day && day !== previousDay ? day : "" };
  });

  return (
    <div className="chat-messages" ref={scrollRef} onScroll={handleScroll}>
      {hasMore ? (
        <button type="button" className="chat-load-older" onClick={onLoadOlder} disabled={loading}>
          {loading ? <Loader2 size={14} className="chat-spin" /> : <ChevronUp size={14} />}
          Load older messages
        </button>
      ) : null}

      {loading && !messages.length ? (
        <div className="chat-empty">
          <Loader2 size={22} className="chat-spin" />
          <span>Loading conversation...</span>
        </div>
      ) : null}

      {!loading && !messages.length && !typing ? (
        <div className="chat-empty">
          <MessageCircle size={26} />
          <span>{emptyHint}</span>
        </div>
      ) : null}

      {messageDays.map(({ message, day }) => (
        <Fragment key={message.id}>
          {day ? <div className="chat-day"><span>{day}</span></div> : null}
          <MessageBubble
            message={message}
            isAdminView={isAdminView}
            canDelete={canDelete}
            onDelete={onDelete}
          />
        </Fragment>
      ))}

      {typing ? <TypingIndicator label={typingLabel} /> : null}
    </div>
  );
}
