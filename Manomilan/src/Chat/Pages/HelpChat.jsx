import { useEffect, useState } from "react";
import {
  ArrowLeft, ArrowRight, Bot, HeadphonesIcon, Loader2, MessageCircle, Phone,
} from "lucide-react";
import { Link, Navigate, useLocation, useNavigate } from "react-router-dom";
import { getSession, homeForRole } from "../../auth";
import PublicChatPanel from "../Components/PublicChatPanel";
import PublicSupportChat from "../Components/PublicSupportChat";
import { getPublicFaqs } from "../Services/chatApi";
import "../Styles/chat.css";

const isValidPhone = (value) => /^\+?[1-9]\d{7,14}$/.test(String(value || ""));

export default function HelpChat() {
  const session = getSession();
  const location = useLocation();
  const navigate = useNavigate();
  const [settings, setSettings] = useState(null);
  const [faqs, setFaqs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [retry, setRetry] = useState(0);
  const [view, setView] = useState("options");
  const [visitor, setVisitor] = useState({ name: "", mobile: "", email: "" });

  useEffect(() => {
    let active = true;
    getPublicFaqs()
      .then((data) => {
        if (!active) return;
        setSettings(data);
        setFaqs(Array.isArray(data?.faqs) ? data.faqs : []);
      })
      .catch((loadError) => {
        if (!active) return;
        setError(loadError.message || "Could not load Help & Support.");
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [retry]);

  if (session) return <Navigate to={homeForRole(session.role)} replace />;

  const goBackToPreviousPage = () => {
    const from = location.state?.from;
    if (typeof from === "string" && from.startsWith("/")) {
      navigate(from);
      return;
    }
    if (window.history.length > 1) {
      navigate(-1);
      return;
    }
    navigate("/");
  };

  const contactNumber = settings?.contact_admin_enabled
    ? String(settings.admin_contact_number || "")
    : "";
  const phoneAvailable = isValidPhone(contactNumber);
  const phoneDigits = contactNumber.replace(/\D/g, "");
  const aiEnabled = Boolean(settings?.help_chat_enabled && settings?.ai_chatbot_enabled);
  const contactEnabled = Boolean(settings?.help_chat_enabled && settings?.contact_admin_enabled);
  const isChatActive = view === "ai" || view === "support";
  const supportAvailable = Boolean(settings?.admin_available);
  const channelTitle = view === "ai" ? "AI Chatbot" : view === "support" ? "Admin Support" : "Help & Support";
  const channelStatus = view === "ai"
    ? "Available anytime"
    : contactEnabled && supportAvailable
      ? "Support team available"
      : contactEnabled
        ? "Admin currently not available"
        : "AI support available";

  return (
    <div className="chat-help-screen">
      <header className="chat-help-topbar">
        <Link to="/" className="chat-help-brand" aria-label="Aaryans Manomilan home">
          <img src="/website/Mano_Milan_Final_Website.png" alt="Aaryans Manomilan" />
        </Link>
        <div className="chat-help-channel">
          <span className="chat-help-channel-icon">
            {view === "ai" ? <Bot size={18} /> : <HeadphonesIcon size={18} />}
          </span>
          <span className="chat-help-channel-copy">
            <strong>{channelTitle}</strong>
            <small className={view === "ai" || supportAvailable ? "is-online" : "is-offline"}>
              <i /> {channelStatus}
            </small>
          </span>
        </div>
      </header>

      <main className={`chat-help-page${isChatActive ? " is-chat-active" : ""}`}>
        <div className="site-container">
        <button type="button" className="chat-help-back" onClick={goBackToPreviousPage}>
          <ArrowLeft size={17} /> Back
        </button>

        <header className="chat-help-head">
          <div>
            <span className="chat-page-eyebrow">We are here to help</span>
            <h1>Help &amp; Support</h1>
            <p>Choose an instant AI answer or connect with the support team.</p>
          </div>
          {contactEnabled ? (
            <div className="chat-help-status">
              <span className={`chat-online-dot${settings?.admin_available ? "" : " is-offline"}`} />
              {settings?.admin_available ? "Admin available" : "Admin currently unavailable"}
            </div>
          ) : null}
        </header>

        {loading ? (
          <div className="chat-page-state" role="status">
            <Loader2 size={20} className="chat-spin" /> Loading Help &amp; Support...
          </div>
        ) : null}
        {error ? (
          <div className="chat-page-error" role="alert">
            <span>{error}</span>
            <button
              type="button"
              onClick={() => {
                setError("");
                setLoading(true);
                setRetry((value) => value + 1);
              }}
            >
              Retry
            </button>
          </div>
        ) : null}

        {!loading && !error && !settings?.help_chat_enabled ? (
          <div className="chat-page-state" role="status">Help Chat is currently unavailable.</div>
        ) : null}

        {!loading && !error && settings?.help_chat_enabled && view === "options" ? (
          <section className="chat-help-options" aria-label="Help options">
            {aiEnabled ? (
              <button type="button" className="chat-help-option" onClick={() => setView("ai")}>
                <span className="chat-help-option-icon is-ai"><Bot size={23} /></span>
                <span className="chat-help-option-copy">
                  <strong>AI Chatbot</strong>
                  <small>Get instant answers about registration, profiles, matches, verification and payments.</small>
                </span>
                <ArrowRight size={19} />
              </button>
            ) : null}
            {contactEnabled ? (
              <button type="button" className="chat-help-option" onClick={() => setView("contact")}>
                <span className="chat-help-option-icon"><HeadphonesIcon size={23} /></span>
                <span className="chat-help-option-copy">
                  <strong>Contact Admin</strong>
                  <small>View official contact details or start a live support chat when Admin is available.</small>
                </span>
                <ArrowRight size={19} />
              </button>
            ) : null}
            {!aiEnabled && !contactEnabled ? (
              <div className="chat-page-state" role="status">Help Chat options are currently unavailable.</div>
            ) : null}
          </section>
        ) : null}

        {!loading && !error && view === "ai" && aiEnabled ? (
          <section className="chat-help-choice">
            <button type="button" className="chat-help-choice-back" onClick={() => setView("options")}>
              <ArrowLeft size={15} /> All help options
            </button>
            <PublicChatPanel faqs={faqs} faqBotEnabled={aiEnabled} fullScreen />
          </section>
        ) : null}

        {!loading && !error && view === "contact" && contactEnabled ? (
          <section className="chat-contact-panel" aria-label="Contact Admin">
            <button type="button" className="chat-help-choice-back" onClick={() => setView("options")}>
              <ArrowLeft size={15} /> All help options
            </button>
            <div className="chat-contact-card">
              <div className="chat-contact-head">
                <span className="chat-help-option-icon"><HeadphonesIcon size={22} /></span>
                <div>
                  <strong>Contact Admin</strong>
                  <span className={`chat-contact-status${settings.admin_available ? " is-online" : ""}`}>
                    <i /> {settings.admin_available ? "Admin is available" : "Admin is currently not available."}
                  </span>
                </div>
              </div>

              {phoneAvailable ? (
                <div className="chat-contact-number">
                  <Phone size={17} />
                  <a href={`tel:${contactNumber}`}>{contactNumber}</a>
                </div>
              ) : (
                <p className="chat-contact-unavailable">Admin contact is currently not available.</p>
              )}

              {phoneAvailable ? (
                <div className="chat-contact-actions">
                  <a href={`tel:${contactNumber}`}><Phone size={15} /> Call Admin</a>
                  <a href={`https://wa.me/${phoneDigits}`} target="_blank" rel="noreferrer">
                    <MessageCircle size={15} /> WhatsApp
                  </a>
                </div>
              ) : null}

              {settings.admin_available ? (
                <form
                  className="chat-live-start"
                  onSubmit={(event) => {
                    event.preventDefault();
                    setView("support");
                  }}
                >
                  <label>
                    Your name
                    <input
                      value={visitor.name}
                      maxLength={120}
                      required
                      onChange={(event) => setVisitor((current) => ({ ...current, name: event.target.value }))}
                      autoComplete="name"
                    />
                  </label>
                  <label>
                    Mobile number
                    <input
                      type="tel"
                      inputMode="numeric"
                      value={visitor.mobile}
                      maxLength={10}
                      pattern="[0-9]{10}"
                      placeholder="10-digit mobile number"
                      required
                      onChange={(event) => setVisitor((current) => ({ ...current, mobile: event.target.value }))}
                      autoComplete="tel"
                    />
                  </label>
                  <label>
                    Email
                    <input
                      type="email"
                      value={visitor.email}
                      maxLength={255}
                      required
                      onChange={(event) => setVisitor((current) => ({ ...current, email: event.target.value }))}
                      autoComplete="email"
                    />
                  </label>
                  <button type="submit"><MessageCircle size={16} /> Start live chat</button>
                </form>
              ) : (
                <p className="chat-contact-offline-note">Live Admin chat is unavailable while Admin is offline. The AI Chatbot remains available.</p>
              )}
            </div>
          </section>
        ) : null}

        {!loading && !error && view === "support" && contactEnabled && settings.admin_available ? (
          <section className="chat-help-choice">
            <PublicSupportChat
              identity={visitor}
              onBack={() => setView("contact")}
            />
          </section>
        ) : null}
        </div>
      </main>
    </div>
  );
}
