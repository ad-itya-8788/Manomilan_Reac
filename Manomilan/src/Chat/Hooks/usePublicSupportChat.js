import { useCallback, useEffect, useRef, useState } from "react";
import {
  getPublicSupportMessages,
  markPublicSupportRead,
  sendPublicSupportMessage,
  startPublicSupportConversation,
} from "../Services/chatApi";

const numericId = (value) => Number(value) || 0;

export default function usePublicSupportChat(identity = {}) {
  const [conversation, setConversation] = useState(null);
  const [messages, setMessages] = useState([]);
  const [settings, setSettings] = useState(null);
  const [adminAvailable, setAdminAvailable] = useState(true);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const [sessionExpired, setSessionExpired] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const lastIdRef = useRef(0);
  const sendingRef = useRef(false);
  const startedRef = useRef(false);
  const conversationId = conversation?.id;

  useEffect(() => {
    if (startedRef.current) return undefined;
    startedRef.current = true;
    let active = true;
    startPublicSupportConversation(identity)
      .then((data) => {
        if (!active) return;
        const incoming = Array.isArray(data?.messages) ? data.messages : [];
        setConversation(data?.conversation || null);
        setMessages(incoming);
        setSettings(data?.settings || null);
        setAdminAvailable(data?.settings?.admin_available !== false);
        setHasMore(incoming.length >= 30);
        lastIdRef.current = incoming.reduce((max, message) => Math.max(max, numericId(message.id)), 0);
        setLoaded(Boolean(data?.conversation?.id));
      })
      .catch((loadError) => {
        if (active) {
          if (loadError.status === 404 || loadError.status === 409) setAdminAvailable(false);
          setError(loadError.message || "Could not start live support.");
        }
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [identity]);

  useEffect(() => {
    if (!loaded || !conversation?.id) return undefined;
    let active = true;
    const poll = async () => {
      try {
        const data = await getPublicSupportMessages(conversation.id, {
          afterId: lastIdRef.current || undefined,
          limit: 40,
        });
        if (!active) return;
        setAdminAvailable(data?.admin_available !== false
          && data?.contact_admin_enabled !== false
          && data?.help_chat_enabled !== false);
        const incoming = Array.isArray(data?.messages) ? data.messages : [];
        if (incoming.length) {
          setMessages((current) => {
            const existing = new Set(current.map((message) => message.id));
            const additions = incoming.filter((message) => !existing.has(message.id));
            return additions.length ? [...current, ...additions] : current;
          });
          lastIdRef.current = incoming.reduce(
            (max, message) => Math.max(max, numericId(message.id)),
            lastIdRef.current,
          );
          if (incoming.some((message) => message.sender_type === "admin")) {
            markPublicSupportRead(conversation.id).catch(() => {});
          }
        }
        setError("");
      } catch (pollError) {
        if (!active) return;
        if (pollError.status === 410) {
          setSessionExpired(true);
          setError("");
        } else {
          setError(pollError.message || "Could not refresh the conversation.");
        }
      }
    };

    const timer = window.setInterval(() => {
      if (document.visibilityState !== "hidden") poll();
    }, 3000);
    return () => {
      active = false;
      window.clearInterval(timer);
    };
  }, [conversation?.id, loaded]);

  const sendMessage = useCallback(async (text, attachment) => {
    const message = String(text || "").trim();
    if (sendingRef.current || (!message && !attachment)) return false;
    if (sessionExpired) return false;
    if (!adminAvailable || !conversationId) {
      setError("Admin is currently not available.");
      return false;
    }

    sendingRef.current = true;
    setSending(true);
    setError("");
    const tempId = `temp-${Date.now()}-${Math.random().toString(16).slice(2)}`;
    const optimistic = {
      id: tempId,
      sender_type: "user",
      mine: true,
      message,
      status: "sending",
      created_at: new Date().toISOString(),
      attachment: attachment ? {
        name: attachment.name,
        type: attachment.type,
        size: attachment.size,
        is_image: String(attachment.type || "").startsWith("image/"),
        localUrl: URL.createObjectURL(attachment),
      } : null,
    };
    setMessages((current) => [...current, optimistic]);

    try {
      const saved = await sendPublicSupportMessage(conversationId, {
        message,
        attachment,
      });
      setMessages((current) => current.map((item) => (
        item.id === tempId ? { ...saved, status: "sent" } : item
      )));
      lastIdRef.current = Math.max(lastIdRef.current, numericId(saved.id));
      return true;
    } catch (sendError) {
      if (sendError.status === 410) {
        setSessionExpired(true);
      } else if (sendError.status === 404 || sendError.status === 409) {
        setAdminAvailable(false);
      }
      setMessages((current) => current.map((item) => (
        item.id === tempId ? { ...item, status: "failed" } : item
      )));
      setError(sendError.message || "Message could not be sent.");
      return false;
    } finally {
      sendingRef.current = false;
      setSending(false);
    }
  }, [adminAvailable, conversationId, sessionExpired]);

  const loadOlder = useCallback(async () => {
    const firstId = messages.find((message) => numericId(message.id))?.id;
    if (!firstId || !conversationId || loading) return;
    setLoading(true);
    try {
      const data = await getPublicSupportMessages(conversationId, { beforeId: firstId });
      const older = Array.isArray(data?.messages) ? data.messages : [];
      setMessages((current) => {
        const existing = new Set(current.map((message) => message.id));
        return [...older.filter((message) => !existing.has(message.id)), ...current];
      });
      setHasMore(Boolean(data?.has_more));
    } catch (loadError) {
      if (loadError.status === 410) {
        setSessionExpired(true);
      } else {
        setError(loadError.message || "Could not load older messages.");
      }
    } finally {
      setLoading(false);
    }
  }, [conversationId, loading, messages]);

  return {
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
    clearError: () => setError(""),
  };
}
