import { ArrowLeft, HeadphonesIcon, X } from "lucide-react";
import MessageComposer from "./MessageComposer";
import MessageList from "./MessageList";
import usePublicSupportChat from "../Hooks/usePublicSupportChat";

export default function PublicSupportChat({ identity, onBack }) {
  const {
    conversation,
    messages,
    settings,
    adminAvailable,
    loading,
    sending,
    error,
    sessionExpired,
    hasMore,
    sendMessage,
    loadOlder,
    clearError,
  } = usePublicSupportChat(identity);

  return (
    <section className="chat-panel is-fullscreen public-support-chat" aria-label="Live admin support chat">
      <header className="chat-panel-head">
        <button type="button" className="chat-panel-close" onClick={onBack} aria-label="Back to contact options">
          <ArrowLeft size={18} />
        </button>
        <span className="chat-panel-avatar"><HeadphonesIcon size={20} /></span>
        <div className="chat-panel-title">
          <strong>Admin Support</strong>
          <small>
            <span className={`chat-online-dot${adminAvailable ? "" : " is-offline"}`} />
            {adminAvailable ? "Support team available" : "Admin is currently not available"}
          </small>
        </div>
        <button type="button" className="chat-panel-close" onClick={onBack} aria-label="Close live support">
          <X size={18} />
        </button>
      </header>

      {error ? (
        <div className="chat-error-bar" role="alert">
          <span>{error}</span>
          <button type="button" onClick={clearError} aria-label="Dismiss error"><X size={13} /></button>
        </div>
      ) : null}
      {!adminAvailable ? (
        <div className="chat-unavailable-notice" role="status">
          Admin is currently not available. You can still use the AI Chatbot.
        </div>
      ) : null}
      {sessionExpired ? (
        <div className="chat-unavailable-notice" role="alert">
          <span>Your chat session expired. Start a new conversation to continue.</span>
          <button type="button" onClick={onBack}>Start new chat</button>
        </div>
      ) : null}

      <MessageList
        messages={messages}
        loading={loading}
        hasMore={hasMore}
        onLoadOlder={loadOlder}
        emptyHint="Send a message to start a conversation with our support team."
      />
      <MessageComposer
        onSend={sendMessage}
        sending={sending}
        settings={settings}
        disabled={!adminAvailable || loading || !conversation || sessionExpired}
        placeholder={sessionExpired ? "Chat session expired" : !adminAvailable ? "Admin support is offline" : "Type your message..."}
      />
    </section>
  );
}
