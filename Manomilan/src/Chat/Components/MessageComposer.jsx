import { useEffect, useMemo, useRef, useState } from "react";
import {
  FileText, Image as ImageIcon, Loader2, Paperclip, Send, X,
} from "lucide-react";
import { formatFileSize } from "../Services/chatApi";

export default function MessageComposer({
  onSend,
  sending = false,
  settings = null,
  disabled = false,
  placeholder = "Type your message...",
}) {
  const [text, setText] = useState("");
  const [file, setFile] = useState(null);
  const [error, setError] = useState("");
  const inputRef = useRef(null);
  const textRef = useRef(null);

  const extensions = settings?.allowed_extensions?.length
    ? settings.allowed_extensions
    : ["jpg", "jpeg", "png", "webp", "pdf"];
  const maxKb = Number(settings?.max_attachment_kb) || 10240;
  const preview = useMemo(
    () => (file && String(file.type || "").startsWith("image/") ? URL.createObjectURL(file) : ""),
    [file],
  );

  useEffect(() => () => {
    if (preview) URL.revokeObjectURL(preview);
  }, [preview]);

  const pickFile = (event) => {
    const selected = event.target.files?.[0];
    event.target.value = "";
    if (!selected) return;

    const extension = selected.name.split(".").pop()?.toLowerCase() || "";
    if (!extensions.includes(extension)) {
      setError(`Only ${extensions.join(", ").toUpperCase()} files are allowed.`);
      return;
    }
    if (selected.size > maxKb * 1024) {
      setError(`File is too large. Maximum size is ${formatFileSize(maxKb * 1024)}.`);
      return;
    }

    setError("");
    setFile(selected);
  };

  const submit = async () => {
    const value = text.trim();
    if (sending || (!value && !file)) return;
    setError("");
    const sent = await onSend(value, file);
    if (sent !== false) {
      setText("");
      setFile(null);
      textRef.current?.focus();
    }
  };

  const handleKeyDown = (event) => {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      submit();
    }
  };

  return (
    <div className="chat-composer">
      {file ? (
        <div className="chat-file-preview">
          {preview && String(file.type).startsWith("image/") ? (
            <img src={preview} alt="" />
          ) : (
            <span className="chat-file-preview-icon"><FileText size={18} /></span>
          )}
          <span className="chat-file-preview-info">
            <strong>{file.name}</strong>
            <small>{formatFileSize(file.size)}</small>
          </span>
          <button type="button" onClick={() => setFile(null)} aria-label="Remove attachment" title="Remove attachment">
            <X size={15} />
          </button>
        </div>
      ) : null}

      {error ? <p className="chat-composer-error" role="alert">{error}</p> : null}

      <div className="chat-composer-row">
        <button
          type="button"
          className="chat-attach-btn"
          onClick={() => inputRef.current?.click()}
          disabled={disabled || sending}
          title="Attach a file"
          aria-label="Attach a file"
        >
          <Paperclip size={18} />
        </button>
        <input
          ref={inputRef}
          type="file"
          className="chat-file-input"
          accept={extensions.map((extension) => `.${extension}`).join(",")}
          onChange={pickFile}
        />
        <textarea
          ref={textRef}
          value={text}
          onChange={(event) => setText(event.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          rows={1}
          maxLength={5000}
          disabled={disabled}
        />
        <button
          type="button"
          className="chat-send-btn"
          onClick={submit}
          disabled={disabled || sending || (!text.trim() && !file)}
          title="Send message"
          aria-label="Send message"
        >
          {sending ? <Loader2 size={18} className="chat-spin" /> : <Send size={18} />}
        </button>
      </div>
      <span className="chat-composer-hint">
        <ImageIcon size={11} /> {extensions.join(", ").toUpperCase()} up to {formatFileSize(maxKb * 1024)}
      </span>
    </div>
  );
}
