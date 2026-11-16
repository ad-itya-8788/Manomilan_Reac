import { useState } from "react";
import {
  Download, FileText, ImageOff, Loader2,
} from "lucide-react";
import useAttachmentUrl from "../Hooks/useAttachmentUrl";
import { downloadChatAttachment, formatFileSize } from "../Services/chatApi";

export default function MessageAttachment({ attachment }) {
  const url = useAttachmentUrl(attachment);
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);

  if (!attachment) return null;

  const download = async () => {
    if (busy) return;
    setBusy(true);
    try {
      await downloadChatAttachment(attachment);
    } finally {
      setBusy(false);
    }
  };

  if (attachment.is_image) {
    return (
      <div className="chat-attachment chat-attachment-image">
        {failed ? (
          <span className="chat-attachment-missing">
            <ImageOff size={18} /> Preview unavailable
          </span>
        ) : url ? (
          <a href={url} target="_blank" rel="noreferrer" title="Open image">
            <img src={url} alt={attachment.name || "Chat attachment"} onError={() => setFailed(true)} loading="lazy" />
          </a>
        ) : (
          <span className="chat-attachment-loading">
            <Loader2 size={16} className="chat-spin" /> Loading image...
          </span>
        )}
        <div className="chat-attachment-meta">
          <span>{attachment.name}</span>
          <span>{formatFileSize(attachment.size)}</span>
          <button type="button" onClick={download} disabled={busy} title="Download">
            {busy ? <Loader2 size={14} className="chat-spin" /> : <Download size={14} />}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="chat-attachment chat-attachment-file">
      <span className="chat-attachment-icon"><FileText size={20} /></span>
      <span className="chat-attachment-details">
        <strong title={attachment.name}>{attachment.name}</strong>
        <small>{formatFileSize(attachment.size)}</small>
      </span>
      <button type="button" className="chat-download-btn" onClick={download} disabled={busy} title="Download file">
        {busy ? <Loader2 size={15} className="chat-spin" /> : <Download size={15} />}
      </button>
    </div>
  );
}
