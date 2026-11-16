import { useCallback, useEffect, useRef, useState } from "react";
import {
  getCandidateChatBootstrap,
  getCandidateChatMessages,
  markCandidateChatRead,
  sendCandidateChatMessage,
} from "../Services/chatApi";

const POLL_INTERVAL = 2500;
const numericId = (value) => Number(value) || 0;

export default function useCandidateChat({ active = true } = {}) {
  const [conversation, setConversation] = useState(null);
  const [messages, setMessages] = useState([]);
  const [faqs, setFaqs] = useState([]);
  const [settings, setSettings] = useState(null);
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const [hasMore, setHasMore] = useState(false);
  const [loaded, setLoaded] = useState(false);

  const activeRef = useRef(active);
  const loadedRef = useRef(false);
  const lastServerIdRef = useRef(0);
  const pollBusyRef = useRef(false);
  const sendingRef = useRef(false);
  const readBusyRef = useRef(false);

  useEffect(() => {
    activeRef.current = active;
  }, [active]);

  const markRead = useCallback(() => {
    if (readBusyRef.current) return;
    readBusyRef.current = true;
    markCandidateChatRead()
      .catch(() => {})
      .finally(() => {
        readBusyRef.current = false;
      });
  }, []);

  const applyServerMessages = useCallback((incoming) => {
    if (!Array.isArray(incoming) || !incoming.length) return 0;
    let newest = 0;
    setMessages((current) => {
      const existing = new Set(current.map((item) => item.id));
      const additions = incoming.filter((item) => !existing.has(item.id));
      if (!additions.length) return current;
      additions.forEach((item) => {
        newest = Math.max(newest, numericId(item.id));
      });
      return [...current, ...additions];
    });
    return newest;
  }, []);

  const load = useCallback(async ({ force = false } = {}) => {
    if (loadedRef.current && !force) return;
    setLoading(!loadedRef.current);
    setError("");
    try {
      const data = await getCandidateChatBootstrap();
      loadedRef.current = true;
      setLoaded(true);
      setConversation(data?.conversation || null);
      setMessages(Array.isArray(data?.messages) ? data.messages : []);
      setFaqs(Array.isArray(data?.faqs) ? data.faqs : []);
      setSettings(data?.settings || null);
      setHasMore(Boolean(data?.messages && data.messages.length >= 30));
      const newest = (data?.messages || []).reduce(
        (max, item) => Math.max(max, numericId(item.id)),
        0,
      );
      lastServerIdRef.current = newest;
      if (Number(data?.unread_count) > 0) markRead();
    } catch (loadError) {
      setError(loadError.message || "Could not load the chat.");
    } finally {
      setLoading(false);
    }
  }, [markRead]);

  useEffect(() => {
    if (!active) return undefined;
    load();
    return undefined;
  }, [active, load]);

  useEffect(() => {
    if (!active || !loaded) return undefined;

    let cancelled = false;
    const poll = async () => {
      if (cancelled || pollBusyRef.current || document.visibilityState === "hidden") {
        return;
      }
      pollBusyRef.current = true;
      try {
        const data = await getCandidateChatMessages({
          afterId: lastServerIdRef.current || undefined,
          limit: 40,
        });
        if (cancelled) return;
        const incoming = Array.isArray(data?.messages) ? data.messages : [];
        if (incoming.length) {
          const newest = incoming.reduce(
            (max, item) => Math.max(max, numericId(item.id)),
            0,
          );
          lastServerIdRef.current = Math.max(lastServerIdRef.current, newest);
          applyServerMessages(incoming);
          if (activeRef.current && incoming.some((item) => item.sender_type === "admin")) {
            markRead();
          }
        }
        if (data?.conversation) setConversation(data.conversation);
      } catch {
        /* polling failures are silent; the next tick retries */
      } finally {
        pollBusyRef.current = false;
      }
    };

    const timer = window.setInterval(poll, POLL_INTERVAL);
    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, [active, loaded, applyServerMessages, markRead]);

  const sendMessage = useCallback(async (text, file) => {
    const message = String(text || "").trim();
    if (sendingRef.current || (!message && !file)) return false;

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
      attachment: file ? {
        name: file.name,
        size: file.size,
        type: file.type,
        is_image: String(file.type || "").startsWith("image/"),
        localUrl: URL.createObjectURL(file),
      } : null,
    };
    setMessages((current) => [...current, optimistic]);

    try {
      const saved = await sendCandidateChatMessage({ message, attachment: file });
      const payload = { ...saved, status: "sent" };
      setMessages((current) => current.map((item) => (
        item.id === tempId ? payload : item
      )));
      lastServerIdRef.current = Math.max(lastServerIdRef.current, numericId(payload.id));
      return true;
    } catch (sendError) {
      setMessages((current) => current.map((item) => (
        item.id === tempId ? { ...item, status: "failed" } : item
      )));
      setError(sendError.message || "Message could not be sent.");
      return false;
    } finally {
      sendingRef.current = false;
      setSending(false);
    }
  }, []);

  const loadOlder = useCallback(async () => {
    const firstId = messages.find((item) => numericId(item.id))?.id;
    if (!firstId || loading) return;
    try {
      const data = await getCandidateChatMessages({ beforeId: firstId });
      const older = Array.isArray(data?.messages) ? data.messages : [];
      setMessages((current) => {
        const existing = new Set(current.map((item) => item.id));
        const additions = older.filter((item) => !existing.has(item.id));
        return [...additions, ...current];
      });
      setHasMore(Boolean(data?.has_more));
    } catch (loadError) {
      setError(loadError.message || "Could not load older messages.");
    }
  }, [messages, loading]);

  return {
    conversation,
    messages,
    faqs,
    settings,
    loading,
    sending,
    error,
    hasMore,
    loaded,
    sendMessage,
    loadOlder,
    refresh: () => load({ force: true }),
    clearError: () => setError(""),
  };
}
