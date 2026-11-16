import { useCallback, useEffect, useState } from "react";
import { ArrowRight, MessageCircle, X } from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";
import { getPublicFaqs } from "../Services/chatApi";
import "../Styles/chat.css";

export default function ChatWidget() {
  const location = useLocation();
  const navigate = useNavigate();
  const [settings, setSettings] = useState(null);
  const [open, setOpen] = useState(false);

  const loadSettings = useCallback(async () => {
    try {
      const data = await getPublicFaqs();
      setSettings(data);
    } catch (error) {
      console.error("Could not load public Help Chat settings.", error);
    }
  }, []);

  useEffect(() => {
    loadSettings();
    const timer = window.setInterval(loadSettings, 60000);
    window.addEventListener("focus", loadSettings);
    return () => {
      window.clearInterval(timer);
      window.removeEventListener("focus", loadSettings);
    };
  }, [loadSettings]);

  if (!settings?.help_chat_enabled) return null;

  const canStart = Boolean(settings.ai_chatbot_enabled || settings.contact_admin_enabled);
  const openHelpPage = () => {
    const from = `${location.pathname}${location.search}${location.hash}`;
    navigate("/help", { state: { from } });
  };

  return (
    <div className={`chat-widget${open ? " is-open" : ""}`}>
      {open ? (
        <section className="chat-widget-window" role="dialog" aria-labelledby="chat-widget-title">
          <header className="chat-widget-welcome-head">
            <span className="chat-widget-welcome-icon"><MessageCircle size={19} /></span>
            <div>
              <strong id="chat-widget-title">Help &amp; Support</strong>
              <small>We are here to help</small>
            </div>
            <button type="button" onClick={() => setOpen(false)} aria-label="Close Help Chat welcome">
              <X size={17} />
            </button>
          </header>
          <p>Hi! Choose a support option and we’ll help you get started.</p>
          <button type="button" className="chat-widget-start" onClick={openHelpPage} disabled={!canStart}>
            {canStart ? "Start Chat" : "Chat options unavailable"}
            {canStart ? <ArrowRight size={16} /> : null}
          </button>
        </section>
      ) : null}

      <button
        type="button"
        className="chat-widget-toggle"
        onClick={() => setOpen((value) => !value)}
        aria-label={open ? "Close Help Chat" : "Open Help Chat"}
        aria-expanded={open}
        title="Help & Support"
      >
        {open ? <X size={22} /> : <MessageCircle size={24} />}
      </button>
    </div>
  );
}
