import { getToken, request } from "../../api";

const unwrap = (responsePromise) => responsePromise.then((response) => response?.data ?? response);

const noCache = { cacheTtlMs: 0, cacheBypass: true };
const PUBLIC_CHAT_TOKEN_KEY = "manomilan.public-help-chat-token";

const publicChatHeaders = () => {
  const token = window.sessionStorage.getItem(PUBLIC_CHAT_TOKEN_KEY);
  return token ? { "X-Help-Chat-Token": token } : {};
};

const queryString = (params = {}) => {
  const query = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== "" && value !== null && value !== undefined) {
      query.set(key, String(value));
    }
  });
  const text = query.toString();
  return text ? `?${text}` : "";
};

export const candidateChatEnabled = () => Boolean(getToken());

export const getPublicFaqs = () =>
  unwrap(request("/chat/faqs", { auth: false, ...noCache }));

export const startPublicSupportConversation = ({ name = "", mobile = "", email = "" } = {}) =>
  unwrap(request("/chat/public/conversations", {
    method: "POST",
    body: { name, mobile, email },
    headers: publicChatHeaders(),
    auth: false,
    ...noCache,
  })).then((data) => {
    if (data?.guest_token) {
      window.sessionStorage.setItem(PUBLIC_CHAT_TOKEN_KEY, data.guest_token);
    }
    return data;
  });

export const getPublicSupportMessages = (conversationId, { afterId, beforeId, limit = 30 } = {}) =>
  unwrap(request(`/chat/public/conversations/${conversationId}/messages${queryString({
    after_id: afterId,
    before_id: beforeId,
    limit,
  })}`, { headers: publicChatHeaders(), auth: false, ...noCache }));

export const sendPublicSupportMessage = (conversationId, { message, attachment } = {}) => {
  const body = new FormData();
  if (message?.trim()) body.append("message", message.trim());
  if (attachment) body.append("attachment", attachment);

  return unwrap(request(`/chat/public/conversations/${conversationId}/messages`, {
    method: "POST",
    body,
    headers: publicChatHeaders(),
    auth: false,
    ...noCache,
  }));
};

export const markPublicSupportRead = (conversationId) =>
  unwrap(request(`/chat/public/conversations/${conversationId}/read`, {
    method: "POST",
    headers: publicChatHeaders(),
    auth: false,
    ...noCache,
  }));

export const getCandidateChatBootstrap = () =>
  unwrap(request("/chat/bootstrap", noCache));

export const getCandidateChatMessages = ({ afterId, beforeId, limit = 30 } = {}) =>
  unwrap(request(`/chat/messages${queryString({
    after_id: afterId,
    before_id: beforeId,
    limit,
  })}`, noCache));

export const sendCandidateChatMessage = ({ message, attachment } = {}) => {
  const body = new FormData();
  if (message?.trim()) body.append("message", message.trim());
  if (attachment) body.append("attachment", attachment);

  return unwrap(request("/chat/messages", { method: "POST", body, ...noCache }));
};

export const markCandidateChatRead = () =>
  unwrap(request("/chat/read", { method: "POST", ...noCache }));

export const getCandidateChatUnread = () =>
  unwrap(request("/chat/unread-count", noCache));

export const listAdminConversations = (params = {}) =>
  unwrap(request(`/admin/chat/conversations${queryString(params)}`, noCache));

export const getAdminConversation = (id, params = {}) =>
  unwrap(request(`/admin/chat/conversations/${id}${queryString(params)}`, noCache));

export const getAdminConversationMessages = (id, { afterId, beforeId, limit = 30 } = {}) =>
  unwrap(request(`/admin/chat/conversations/${id}/messages${queryString({
    after_id: afterId,
    before_id: beforeId,
    limit,
  })}`, noCache));

export const sendAdminChatMessage = (id, { message, attachment } = {}) => {
  const body = new FormData();
  if (message?.trim()) body.append("message", message.trim());
  if (attachment) body.append("attachment", attachment);

  return unwrap(request(`/admin/chat/conversations/${id}/messages`, {
    method: "POST",
    body,
    ...noCache,
  }));
};

export const markAdminConversationRead = (id) =>
  unwrap(request(`/admin/chat/conversations/${id}/read`, { method: "POST", ...noCache }));

export const updateAdminConversationStatus = (id, status) =>
  unwrap(request(`/admin/chat/conversations/${id}/status`, {
    method: "PATCH",
    body: { status },
    ...noCache,
  }));

export const deleteAdminConversation = (id) =>
  unwrap(request(`/admin/chat/conversations/${id}`, { method: "DELETE", ...noCache }));

export const deleteAdminChatMessage = (id) =>
  unwrap(request(`/admin/chat/messages/${id}`, { method: "DELETE", ...noCache }));

export const getAdminChatUnread = () =>
  unwrap(request("/admin/chat/unread-count", noCache));

export const listChatFaqs = () =>
  unwrap(request("/admin/chat/faqs", noCache));

export const createChatFaq = (payload) =>
  unwrap(request("/admin/chat/faqs", { method: "POST", body: payload, ...noCache }));

export const updateChatFaq = (id, payload) =>
  unwrap(request(`/admin/chat/faqs/${id}`, { method: "PUT", body: payload, ...noCache }));

export const deleteChatFaq = (id) =>
  unwrap(request(`/admin/chat/faqs/${id}`, { method: "DELETE", ...noCache }));

export const getChatSettings = () =>
  unwrap(request("/admin/chat/settings", noCache));

export const saveChatSettings = (payload) =>
  unwrap(request("/admin/chat/settings", { method: "PUT", body: payload, ...noCache }));

const blobCache = new Map();

export const getAttachmentBlobUrl = async (attachment) => {
  if (!attachment?.url) return "";
  if (blobCache.has(attachment.url)) return blobCache.get(attachment.url);

  const promise = request(attachment.url, {
    raw: true,
    headers: attachment.public_guest ? publicChatHeaders() : {},
    auth: !attachment.public_guest,
    cacheTtlMs: 0,
    cacheBypass: true,
  })
    .then((response) => response.blob())
    .then((blob) => URL.createObjectURL(blob))
    .catch((error) => {
      blobCache.delete(attachment.url);
      throw error;
    });

  blobCache.set(attachment.url, promise);
  return promise;
};

export const downloadChatAttachment = async (attachment) => {
  if (!attachment?.download_url) return;

  const response = await request(attachment.download_url, {
    raw: true,
    headers: attachment.public_guest ? publicChatHeaders() : {},
    auth: !attachment.public_guest,
    cacheTtlMs: 0,
    cacheBypass: true,
  });
  const blob = await response.blob();
  const url = URL.createObjectURL(blob);
  const link = Object.assign(document.createElement("a"), {
    href: url,
    download: attachment.name || "attachment",
  });
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
};

export const formatFileSize = (bytes) => {
  const size = Number(bytes) || 0;
  if (size < 1024) return `${size} B`;
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`;
  return `${(size / (1024 * 1024)).toFixed(1)} MB`;
};

export const formatChatTime = (value) => {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return new Intl.DateTimeFormat("en-IN", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
    timeZone: "Asia/Kolkata",
  }).format(date);
};

export const formatChatDay = (value) => {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return new Intl.DateTimeFormat("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    timeZone: "Asia/Kolkata",
  }).format(date);
};
