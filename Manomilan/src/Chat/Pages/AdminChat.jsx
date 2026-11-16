import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowLeft, Bot, CheckCircle2, Loader2, MessageCircle, Pencil, Plus,
  RefreshCw, RotateCcw, Search, Settings, Trash2, X,
} from "lucide-react";
import AdminLayout from "../../admin/components/AdminLayout";
import useDebouncedValue from "../../admin/hooks/useDebouncedValue";
import { useAdminPermission } from "../../permission-context";
import MessageList from "../Components/MessageList";
import MessageComposer from "../Components/MessageComposer";
import {
  createChatFaq, deleteAdminChatMessage, deleteAdminConversation, deleteChatFaq,
  getAdminChatUnread, getAdminConversation, getAdminConversationMessages,
  getChatSettings, listAdminConversations, listChatFaqs, saveChatSettings,
  sendAdminChatMessage, updateAdminConversationStatus, updateChatFaq,
} from "../Services/chatApi";
import "../Styles/chat.css";

const SAFE_EXTENSIONS = ["jpg", "jpeg", "png", "webp", "gif", "pdf", "doc", "docx", "xls", "xlsx", "txt", "csv"];
const numericId = (value) => Number(value) || 0;

const mergeMessages = (current, incoming) => {
  const existing = new Set(current.map((item) => item.id));
  const additions = incoming.filter((item) => !existing.has(item.id));
  return additions.length ? [...current, ...additions] : current;
};

const formatListTime = (value) => {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const today = new Date();
  const sameDay = date.toDateString() === today.toDateString();
  return new Intl.DateTimeFormat("en-IN", sameDay
    ? { hour: "2-digit", minute: "2-digit", hour12: true, timeZone: "Asia/Kolkata" }
    : { day: "2-digit", month: "short", timeZone: "Asia/Kolkata" }).format(date);
};

export default function AdminChat() {
  const canView = useAdminPermission("view", "/admin/chat", "chat_support");
  const canReply = useAdminPermission("create", "/admin/chat", "chat_support");
  const canDeleteSupport = useAdminPermission("delete", "/admin/chat", "chat_support");
  const canDeleteOverride = useAdminPermission("delete", "/admin/chat", "chat_delete");
  const canDeleteMessage = canDeleteSupport && canDeleteOverride;
  const canDeleteConversation = canDeleteMessage;
  const canManageFaqs = useAdminPermission("manage", "/admin/chat", "chat_faq_management");
  const canManageSettings = useAdminPermission("manage", "/admin/chat", "chat_settings");

  const [tab, setTab] = useState("conversations");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [page, setPage] = useState(1);
  const debouncedSearch = useDebouncedValue(search, 350).trim();

  const [list, setList] = useState({ data: [], current_page: 1, last_page: 1, total: 0 });
  const [listLoading, setListLoading] = useState(true);
  const [listError, setListError] = useState("");
  const [unread, setUnread] = useState(0);

  const [selected, setSelected] = useState(null);
  const [thread, setThread] = useState([]);
  const [threadLoading, setThreadLoading] = useState(false);
  const [threadHasMore, setThreadHasMore] = useState(false);
  const [sending, setSending] = useState(false);

  const [notice, setNotice] = useState("");
  const [actionError, setActionError] = useState("");

  const [faqs, setFaqs] = useState([]);
  const [faqLoading, setFaqLoading] = useState(false);
  const [faqBusy, setFaqBusy] = useState(false);
  const [faqForm, setFaqForm] = useState({ id: null, question: "", answer: "" });

  const [settings, setSettings] = useState(null);
  const [settingsLoading, setSettingsLoading] = useState(false);
  const [settingsBusy, setSettingsBusy] = useState(false);

  const listRequestId = useRef(0);
  const selectedIdRef = useRef(0);
  const lastServerIdRef = useRef(0);
  const sendingRef = useRef(false);

  useEffect(() => {
    selectedIdRef.current = selected?.id || 0;
  }, [selected]);

  useEffect(() => {
    if (!notice) return undefined;
    const timer = window.setTimeout(() => setNotice(""), 3500);
    return () => window.clearTimeout(timer);
  }, [notice]);

  const loadConversations = useCallback(async () => {
    const requestId = ++listRequestId.current;
    setListLoading(true);
    setListError("");
    try {
      const [result, unreadData] = await Promise.all([
        listAdminConversations({
          search: debouncedSearch || undefined,
          status: statusFilter === "all" ? undefined : statusFilter,
          page,
          per_page: 20,
        }),
        getAdminChatUnread().catch(() => null),
      ]);
      if (requestId !== listRequestId.current) return;
      setList(result || { data: [], current_page: 1, last_page: 1, total: 0 });
      setUnread(Number(unreadData?.unread_count) || 0);
    } catch (error) {
      if (requestId === listRequestId.current) {
        setListError(error.message || "Could not load conversations.");
      }
    } finally {
      if (requestId === listRequestId.current) setListLoading(false);
    }
  }, [debouncedSearch, page, statusFilter]);

  useEffect(() => {
    if (!canView || tab !== "conversations") return undefined;
    const firstLoad = window.setTimeout(loadConversations, 0);
    const timer = window.setInterval(() => {
      if (document.visibilityState !== "hidden") loadConversations();
    }, 5000);
    return () => {
      window.clearTimeout(firstLoad);
      window.clearInterval(timer);
    };
  }, [canView, tab, loadConversations]);

  const changeSearch = (value) => {
    setSearch(value);
    setPage(1);
  };

  const changeStatusFilter = (value) => {
    setStatusFilter(value);
    setPage(1);
  };

  const openFaqsTab = () => {
    if (tab !== "faqs") setFaqLoading(true);
    setTab("faqs");
  };

  const openSettingsTab = () => {
    if (tab !== "settings") setSettingsLoading(true);
    setTab("settings");
  };

  const openConversation = useCallback(async (conversation) => {
    setSelected(conversation);
    setThread([]);
    setThreadLoading(true);
    setActionError("");
    lastServerIdRef.current = 0;
    try {
      const data = await getAdminConversation(conversation.id);
      setSelected(data?.conversation || conversation);
      const messages = Array.isArray(data?.messages) ? data.messages : [];
      setThread(messages);
      setThreadHasMore(Boolean(data?.has_more));
      lastServerIdRef.current = messages.reduce((max, item) => Math.max(max, numericId(item.id)), 0);
    } catch (error) {
      setActionError(error.message || "Could not open the conversation.");
    } finally {
      setThreadLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!selected?.id || tab !== "conversations") return undefined;
    const conversationId = selected.id;

    let cancelled = false;
    const tick = async () => {
      if (cancelled || document.visibilityState === "hidden") return;
      if (selectedIdRef.current !== conversationId) return;
      try {
        const data = await getAdminConversationMessages(conversationId, {
          afterId: lastServerIdRef.current || undefined,
          limit: 40,
        });
        if (cancelled || selectedIdRef.current !== conversationId) return;
        const incoming = Array.isArray(data?.messages) ? data.messages : [];
        if (incoming.length) {
          lastServerIdRef.current = incoming.reduce(
            (max, item) => Math.max(max, numericId(item.id)),
            lastServerIdRef.current,
          );
          setThread((current) => mergeMessages(current, incoming));
        }
      } catch {
        /* silent retry */
      }
    };

    const timer = window.setInterval(tick, 2500);
    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, [selected?.id, tab]);

  const sendMessage = async (text, file) => {
    if (!selected?.id || sendingRef.current) return false;
    sendingRef.current = true;
    setSending(true);
    setActionError("");

    const tempId = `temp-${Date.now()}-${Math.random().toString(16).slice(2)}`;
    const optimistic = {
      id: tempId,
      sender_type: "admin",
      mine: true,
      message: text,
      status: "sending",
      created_at: new Date().toISOString(),
      attachment: file ? {
        name: file.name,
        size: file.size,
        type: file.type,
        is_image: String(file.type || "").startsWith("image/"),
        localUrl: URL.createObjectURL(file),
      } : null,
    };
    setThread((current) => [...current, optimistic]);

    try {
      const saved = await sendAdminChatMessage(selected.id, { message: text, attachment: file });
      const payload = { ...saved, status: "sent" };
      setThread((current) => current.map((item) => (item.id === tempId ? payload : item)));
      lastServerIdRef.current = Math.max(lastServerIdRef.current, numericId(payload.id));
      loadConversations();
      return true;
    } catch (error) {
      setThread((current) => current.map((item) => (
        item.id === tempId ? { ...item, status: "failed" } : item
      )));
      setActionError(error.message || "Message could not be sent.");
      return false;
    } finally {
      sendingRef.current = false;
      setSending(false);
    }
  };

  const loadOlder = async () => {
    if (!selected?.id || threadLoading) return;
    const firstId = thread.find((item) => numericId(item.id))?.id;
    if (!firstId) return;
    setThreadLoading(true);
    try {
      const data = await getAdminConversationMessages(selected.id, { beforeId: firstId });
      const older = Array.isArray(data?.messages) ? data.messages : [];
      setThread((current) => {
        const existing = new Set(current.map((item) => item.id));
        return [...older.filter((item) => !existing.has(item.id)), ...current];
      });
      setThreadHasMore(Boolean(data?.has_more));
    } catch (error) {
      setActionError(error.message || "Could not load older messages.");
    } finally {
      setThreadLoading(false);
    }
  };

  const removeMessage = async (message) => {
    if (!canDeleteMessage || String(message.id).startsWith("temp-")) return;
    if (!window.confirm("Delete this message permanently?")) return;
    try {
      await deleteAdminChatMessage(message.id);
      setThread((current) => current.filter((item) => item.id !== message.id));
      setNotice("Message deleted.");
    } catch (error) {
      setActionError(error.message || "Could not delete the message.");
    }
  };

  const toggleConversationStatus = async () => {
    if (!selected?.id) return;
    try {
      const next = selected.status === "closed" ? "open" : "closed";
      const data = await updateAdminConversationStatus(selected.id, next);
      setSelected((current) => ({ ...current, ...(data || {}), status: next }));
      setNotice(next === "closed" ? "Conversation closed." : "Conversation reopened.");
      loadConversations();
    } catch (error) {
      setActionError(error.message || "Could not update the conversation.");
    }
  };

  const removeConversation = async () => {
    if (!selected?.id || !canDeleteConversation) return;
    if (!window.confirm("Delete this entire conversation and its attachments?")) return;
    try {
      await deleteAdminConversation(selected.id);
      setSelected(null);
      setThread([]);
      setNotice("Conversation deleted.");
      loadConversations();
    } catch (error) {
      setActionError(error.message || "Could not delete the conversation.");
    }
  };

  useEffect(() => {
    if (tab !== "faqs" || !canManageFaqs) return undefined;
    let active = true;
    listChatFaqs()
      .then((data) => {
        if (active) setFaqs(Array.isArray(data) ? data : []);
      })
      .catch((error) => {
        if (active) setActionError(error.message || "Could not load FAQs.");
      })
      .finally(() => {
        if (active) setFaqLoading(false);
      });
    return () => {
      active = false;
    };
  }, [tab, canManageFaqs]);

  useEffect(() => {
    if (tab !== "settings" || !canManageSettings) return undefined;
    let active = true;
    getChatSettings()
      .then((data) => {
        if (active) setSettings(data);
      })
      .catch((error) => {
        if (active) setActionError(error.message || "Could not load chat settings.");
      })
      .finally(() => {
        if (active) setSettingsLoading(false);
      });
    return () => {
      active = false;
    };
  }, [tab, canManageSettings]);

  const saveFaq = async (event) => {
    event.preventDefault();
    if (!faqForm.question.trim() || !faqForm.answer.trim() || faqBusy) return;
    setFaqBusy(true);
    setActionError("");
    try {
      const payload = { question: faqForm.question.trim(), answer: faqForm.answer.trim() };
      const saved = faqForm.id
        ? await updateChatFaq(faqForm.id, payload)
        : await createChatFaq(payload);
      setFaqs((current) => {
        if (faqForm.id) {
          return current.map((item) => (item.id === saved.id ? saved : item));
        }
        return [...current, saved];
      });
      setFaqForm({ id: null, question: "", answer: "" });
      setNotice(faqForm.id ? "FAQ updated." : "FAQ added.");
    } catch (error) {
      setActionError(error.message || "Could not save the FAQ.");
    } finally {
      setFaqBusy(false);
    }
  };

  const removeFaq = async (faq) => {
    if (!window.confirm("Delete this FAQ?")) return;
    try {
      await deleteChatFaq(faq.id);
      setFaqs((current) => current.filter((item) => item.id !== faq.id));
      if (faqForm.id === faq.id) setFaqForm({ id: null, question: "", answer: "" });
      setNotice("FAQ deleted.");
    } catch (error) {
      setActionError(error.message || "Could not delete the FAQ.");
    }
  };

  const toggleExtension = (extension) => {
    setSettings((current) => {
      const selectedExtensions = new Set(current?.allowed_extensions || []);
      if (selectedExtensions.has(extension)) selectedExtensions.delete(extension);
      else selectedExtensions.add(extension);
      return {
        ...current,
        allowed_extensions: SAFE_EXTENSIONS.filter((item) => selectedExtensions.has(item)),
      };
    });
  };

  const submitSettings = async (event) => {
    event.preventDefault();
    if (!settings || settingsBusy) return;
    if (!settings.allowed_extensions?.length) {
      setActionError("Select at least one attachment type.");
      return;
    }
    if (settings.admin_contact_number
      && !/^\+?[1-9]\d{7,14}$/.test(String(settings.admin_contact_number).trim())) {
      setActionError("Enter a valid international contact number, or leave it blank.");
      return;
    }
    setSettingsBusy(true);
    setActionError("");
    try {
      const data = await saveChatSettings({
        help_chat_enabled: Boolean(settings.help_chat_enabled),
        ai_chatbot_enabled: Boolean(settings.ai_chatbot_enabled),
        contact_admin_enabled: Boolean(settings.contact_admin_enabled),
        admin_available: Boolean(settings.admin_available),
        admin_contact_number: String(settings.admin_contact_number || "").trim(),
        max_attachment_kb: Number(settings.max_attachment_kb),
        allowed_extensions: settings.allowed_extensions,
      });
      setSettings(data);
      setNotice("Help & Support settings saved.");
    } catch (error) {
      setActionError(error.message || "Could not save chat settings.");
    } finally {
      setSettingsBusy(false);
    }
  };

  const conversations = useMemo(
    () => (Array.isArray(list?.data) ? list.data : []),
    [list],
  );

  return (
    <AdminLayout currentPath="/admin/chat">
      <div className="chat-admin-page">
        <header className="chat-admin-head">
          <div>
            <span className="chat-page-eyebrow">Support inbox</span>
            <h1><MessageCircle size={24} /> Help</h1>
            <p>Reply to candidate and website visitor conversations and manage Help &amp; Support.</p>
          </div>
          <div className="chat-admin-tabs">
            <button type="button" className={tab === "conversations" ? "active" : ""} onClick={() => setTab("conversations")}>
              Conversations {unread ? <span>{unread > 99 ? "99+" : unread}</span> : null}
            </button>
            {canManageFaqs ? (
              <button type="button" className={tab === "faqs" ? "active" : ""} onClick={openFaqsTab}>
                <Bot size={14} /> FAQs
              </button>
            ) : null}
            {canManageSettings ? (
              <button type="button" className={tab === "settings" ? "active" : ""} onClick={openSettingsTab}>
                <Settings size={14} /> Settings
              </button>
            ) : null}
          </div>
        </header>

        {notice ? <div className="chat-alert chat-alert-success" role="status">{notice}</div> : null}
        {actionError ? (
          <div className="chat-alert chat-alert-error" role="alert">
            <span>{actionError}</span>
            <button type="button" onClick={() => setActionError("")} aria-label="Dismiss"><X size={13} /></button>
          </div>
        ) : null}

        {!canView ? (
          <div className="chat-access-denied">You do not have permission to view chat conversations.</div>
        ) : null}

        {canView && tab === "conversations" ? (
          <section className="chat-admin-inbox">
            <aside className="chat-conversation-list">
              <div className="chat-list-toolbar">
                <label className="chat-search">
                  <Search size={15} />
                  <input
                    type="search"
                    value={search}
                    onChange={(event) => changeSearch(event.target.value)}
                    placeholder="Search candidates or visitors..."
                  />
                </label>
                <select value={statusFilter} onChange={(event) => changeStatusFilter(event.target.value)}>
                  <option value="all">All</option>
                  <option value="open">Open</option>
                  <option value="closed">Closed</option>
                </select>
                <button type="button" className="chat-refresh-btn" onClick={loadConversations} title="Refresh">
                  <RefreshCw size={15} className={listLoading ? "chat-spin" : ""} />
                </button>
              </div>

              {listError ? <div className="chat-list-error">{listError}</div> : null}

              <div className="chat-list-scroll">
                {listLoading && !conversations.length ? (
                  <div className="chat-list-empty"><Loader2 size={18} className="chat-spin" /> Loading...</div>
                ) : null}
                {!listLoading && !conversations.length ? (
                  <div className="chat-list-empty">No conversations yet.</div>
                ) : null}
                {conversations.map((conversation) => (
                  <button
                    type="button"
                    key={conversation.id}
                    className={`chat-conversation-item ${selected?.id === conversation.id ? "active" : ""}`}
                    onClick={() => openConversation(conversation)}
                  >
                    <span className="chat-conversation-avatar">
                      {(conversation.user?.name || "C").slice(0, 1).toUpperCase()}
                    </span>
                    <span className="chat-conversation-copy">
                      <span className="chat-conversation-top">
                        <strong>{conversation.user?.name || conversation.user?.username || "Candidate"}</strong>
                        <small>{formatListTime(conversation.last_message_at)}</small>
                      </span>
                      <span className="chat-conversation-preview">
                        {conversation.last_message?.message
                          || (conversation.last_message?.attachment_name ? "Attachment" : "No messages yet")}
                      </span>
                    </span>
                    <span className="chat-conversation-flags">
                      {conversation.unread_count ? (
                        <span className="chat-unread-pill">{conversation.unread_count > 9 ? "9+" : conversation.unread_count}</span>
                      ) : null}
                      <span className={`chat-status-pill is-${conversation.status}`}>{conversation.status}</span>
                    </span>
                  </button>
                ))}
              </div>

              {list.last_page > 1 ? (
                <div className="chat-list-pagination">
                  <button type="button" disabled={page <= 1} onClick={() => setPage((value) => Math.max(1, value - 1))}>Prev</button>
                  <span>{list.current_page} / {list.last_page}</span>
                  <button type="button" disabled={page >= list.last_page} onClick={() => setPage((value) => value + 1)}>Next</button>
                </div>
              ) : null}
            </aside>

            <section className="chat-thread-panel">
              {selected ? (
                <>
                  <header className="chat-thread-head">
                    <div>
                      <strong>{selected.user?.name || selected.user?.username || "Candidate"}</strong>
                      <small>
                        {[selected.user?.mobile, selected.user?.email || selected.user?.username]
                          .filter(Boolean)
                          .join(" - ") || "Visitor"}
                        {selected.assigned_admin ? ` - Assigned to ${selected.assigned_admin.name}` : ""}
                      </small>
                    </div>
                    <div className="chat-thread-actions">
                      <button type="button" onClick={toggleConversationStatus} title={selected.status === "closed" ? "Reopen" : "Close"}>
                        {selected.status === "closed" ? <RotateCcw size={15} /> : <CheckCircle2 size={15} />}
                        {selected.status === "closed" ? "Reopen" : "Close"}
                      </button>
                      {canDeleteConversation ? (
                        <button type="button" className="danger" onClick={removeConversation} title="Delete conversation">
                          <Trash2 size={15} /> Delete
                        </button>
                      ) : null}
                    </div>
                  </header>

                  <MessageList
                    messages={thread}
                    loading={threadLoading && !thread.length}
                    hasMore={threadHasMore}
                    onLoadOlder={loadOlder}
                    isAdminView
                    canDelete={canDeleteMessage}
                    onDelete={removeMessage}
                    emptyHint="No messages in this conversation yet."
                  />

                  {canReply ? (
                    <MessageComposer
                      onSend={sendMessage}
                      sending={sending}
                      settings={settings || { allowed_extensions: SAFE_EXTENSIONS, max_attachment_kb: 10240 }}
                      placeholder={`Reply to ${selected.user?.name || "visitor"}...`}
                    />
                  ) : (
                    <div className="chat-thread-readonly">You do not have permission to reply.</div>
                  )}
                </>
              ) : (
                <div className="chat-thread-empty">
                  <MessageCircle size={34} />
                  <strong>Select a conversation</strong>
                  <span>Choose a candidate from the list to view and reply to their messages.</span>
                </div>
              )}
            </section>
          </section>
        ) : null}

        {canManageFaqs && tab === "faqs" ? (
          <section className="chat-admin-panel">
            <div className="chat-admin-panel-head">
              <h2><Bot size={18} /> Chatbot FAQs</h2>
              <span>{faqs.length} questions</span>
            </div>

            <div className="chat-faq-layout">
              <form className="chat-faq-form" onSubmit={saveFaq}>
                <h3>{faqForm.id ? "Edit FAQ" : "Add FAQ"}</h3>
                <label>
                  Question
                  <input
                    value={faqForm.question}
                    onChange={(event) => setFaqForm((current) => ({ ...current, question: event.target.value }))}
                    maxLength={500}
                    required
                  />
                </label>
                <label>
                  Answer
                  <textarea
                    value={faqForm.answer}
                    onChange={(event) => setFaqForm((current) => ({ ...current, answer: event.target.value }))}
                    maxLength={5000}
                    rows={5}
                    required
                  />
                </label>
                <div className="chat-faq-form-actions">
                  <button type="submit" className="primary" disabled={faqBusy}>
                    {faqBusy ? <Loader2 size={15} className="chat-spin" /> : <Plus size={15} />}
                    {faqForm.id ? "Save changes" : "Add FAQ"}
                  </button>
                  {faqForm.id ? (
                    <button type="button" onClick={() => setFaqForm({ id: null, question: "", answer: "" })}>
                      <ArrowLeft size={15} /> Cancel
                    </button>
                  ) : null}
                </div>
              </form>

              <div className="chat-faq-list">
                {faqLoading ? <div className="chat-list-empty"><Loader2 size={18} className="chat-spin" /> Loading FAQs...</div> : null}
                {!faqLoading && !faqs.length ? <div className="chat-list-empty">No FAQs yet.</div> : null}
                {faqs.map((faq) => (
                  <article key={faq.id} className="chat-faq-item">
                    <div>
                      <strong>{faq.question}</strong>
                      <p>{faq.answer}</p>
                    </div>
                    <div className="chat-faq-item-actions">
                      <button type="button" onClick={() => setFaqForm({ id: faq.id, question: faq.question, answer: faq.answer })} title="Edit">
                        <Pencil size={14} />
                      </button>
                      <button type="button" className="danger" onClick={() => removeFaq(faq)} title="Delete">
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </article>
                ))}
              </div>
            </div>
          </section>
        ) : null}

        {canManageSettings && tab === "settings" ? (
          <section className="chat-admin-panel">
            <div className="chat-admin-panel-head">
              <h2><Settings size={18} /> Help &amp; Support Settings</h2>
            </div>
            {settingsLoading || !settings ? (
              <div className="chat-list-empty"><Loader2 size={18} className="chat-spin" /> Loading settings...</div>
            ) : (
              <form className="chat-settings-form" onSubmit={submitSettings}>
                <label className="chat-settings-toggle">
                  <input
                    type="checkbox"
                    checked={Boolean(settings.help_chat_enabled)}
                    onChange={(event) => setSettings((current) => ({ ...current, help_chat_enabled: event.target.checked }))}
                  />
                  <span>
                    <strong>Enable Help Chat</strong>
                    <small>Show the Help Chat widget on public website pages.</small>
                  </span>
                </label>

                <label className="chat-settings-toggle">
                  <input
                    type="checkbox"
                    checked={Boolean(settings.ai_chatbot_enabled)}
                    onChange={(event) => setSettings((current) => ({ ...current, ai_chatbot_enabled: event.target.checked }))}
                  />
                  <span>
                    <strong>Show AI Chatbot</strong>
                    <small>Allow visitors to use instant answers independently of Admin availability.</small>
                  </span>
                </label>

                <label className="chat-settings-toggle">
                  <input
                    type="checkbox"
                    checked={Boolean(settings.contact_admin_enabled)}
                    onChange={(event) => setSettings((current) => ({ ...current, contact_admin_enabled: event.target.checked }))}
                  />
                  <span>
                    <strong>Show Contact Admin</strong>
                    <small>Show the official contact details and live support option.</small>
                  </span>
                </label>

                <label className="chat-settings-toggle">
                  <input
                    type="checkbox"
                    checked={Boolean(settings.admin_available)}
                    onChange={(event) => setSettings((current) => ({ ...current, admin_available: event.target.checked }))}
                  />
                  <span>
                    <strong>Admin Availability</strong>
                    <small>{settings.admin_available ? "Available for live support." : "Not available for live support."}</small>
                  </span>
                </label>

                <label className="chat-settings-field">
                  Admin contact number
                  <input
                    type="tel"
                    inputMode="tel"
                    autoComplete="tel"
                    pattern="\+?[1-9][0-9]{7,14}"
                    maxLength={16}
                    value={settings.admin_contact_number || ""}
                    onChange={(event) => setSettings((current) => ({ ...current, admin_contact_number: event.target.value }))}
                    placeholder="+919876543210"
                  />
                  <small>Use international format, such as +919876543210. Leave blank to hide call and WhatsApp actions.</small>
                </label>

                <label className="chat-settings-field">
                  Maximum attachment size (KB)
                  <input
                    type="number"
                    min="512"
                    max="51200"
                    value={settings.max_attachment_kb}
                    onChange={(event) => setSettings((current) => ({ ...current, max_attachment_kb: event.target.value }))}
                  />
                </label>

                <div className="chat-settings-field">
                  <span>Allowed attachment types</span>
                  <div className="chat-extension-grid">
                    {SAFE_EXTENSIONS.map((extension) => (
                      <label key={extension} className="chat-extension-option">
                        <input
                          type="checkbox"
                          checked={(settings.allowed_extensions || []).includes(extension)}
                          onChange={() => toggleExtension(extension)}
                        />
                        {extension.toUpperCase()}
                      </label>
                    ))}
                  </div>
                </div>

                <button type="submit" className="chat-settings-save" disabled={settingsBusy}>
                  {settingsBusy ? <Loader2 size={15} className="chat-spin" /> : null}
                  Save settings
                </button>
              </form>
            )}
          </section>
        ) : null}
      </div>
    </AdminLayout>
  );
}
