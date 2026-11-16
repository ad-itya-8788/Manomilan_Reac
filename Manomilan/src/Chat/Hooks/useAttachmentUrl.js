import { useEffect, useState } from "react";
import { getAttachmentBlobUrl } from "../Services/chatApi";

export default function useAttachmentUrl(attachment) {
  const localUrl = attachment?.localUrl || "";
  const remoteUrl = attachment?.url || "";
  const [resolved, setResolved] = useState({ key: "", url: "" });

  useEffect(() => {
    let active = true;
    if (!remoteUrl || localUrl) return undefined;

    getAttachmentBlobUrl(attachment)
      .then((blobUrl) => {
        if (active) setResolved({ key: remoteUrl, url: blobUrl });
      })
      .catch(() => {
        if (active) setResolved({ key: remoteUrl, url: "" });
      });

    return () => {
      active = false;
    };
  }, [localUrl, remoteUrl]);

  if (localUrl) return localUrl;
  return resolved.key === remoteUrl ? resolved.url : "";
}
