const DRAFT_PREFIX = "melava_registration_draft_v1_";
const DATABASE_NAME = "manomilan_melava_registration_drafts";
const DATABASE_VERSION = 1;
const ATTACHMENTS_STORE = "attachments";
export const MELAVA_DRAFT_TTL = 60 * 60 * 1000;

let databasePromise;

const storage = () => {
  if (typeof window === "undefined") throw new Error("Browser storage is unavailable.");
  return window.localStorage;
};

const identifierHash = (value) => {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(36);
};

export const melavaDraftKey = ({ adminEditId, campaignId, mobile }) => {
  if (adminEditId) return `${DRAFT_PREFIX}admin_${adminEditId}`;
  const digits = String(mobile || "").replace(/\D/g, "");
  if (!campaignId || digits.length !== 10) return null;
  return `${DRAFT_PREFIX}campaign_${campaignId}_${identifierHash(`${campaignId}:${digits}`)}`;
};

const removeStorageItem = (key) => {
  try {
    storage().removeItem(key);
    void deleteMelavaDraftAttachments(key);
    return true;
  } catch {
    return false;
  }
};

export const saveMelavaDraft = (key, data, now = Date.now()) => {
  if (!key) return { ok: false, error: new Error("A registration identifier is required.") };
  try {
    const previous = storage().getItem(key);
    let updatedAt = now;
    if (previous) {
      try {
        const parsed = JSON.parse(previous);
        if (Number.isFinite(parsed?.updatedAt)) {
          updatedAt = Math.max(now, parsed.updatedAt + 1);
        }
      } catch {
        updatedAt = now;
      }
    }
    const draft = {
      formType: "melav_registration",
      ...data,
      updatedAt,
      expiresAt: updatedAt + MELAVA_DRAFT_TTL,
    };
    const serialized = JSON.stringify(draft);
    storage().setItem(key, serialized);
    return { ok: true, draft };
  } catch (error) {
    return { ok: false, error };
  }
};

export const readMelavaDraft = (key, now = Date.now()) => {
  if (!key) return { status: "missing", draft: null };
  let serialized;
  try {
    serialized = storage().getItem(key);
  } catch (error) {
    return { status: "unavailable", draft: null, error };
  }
  if (serialized === null) return { status: "missing", draft: null };

  try {
    const draft = JSON.parse(serialized);
    if (
      !draft
      || draft.formType !== "melav_registration"
      || !Number.isFinite(draft.updatedAt)
      || !Number.isFinite(draft.expiresAt)
      || !draft.form
      || typeof draft.form !== "object"
    ) {
      removeStorageItem(key);
      return { status: "invalid", draft: null };
    }
    if (draft.expiresAt <= now) {
      removeStorageItem(key);
      return { status: "expired", draft: null };
    }
    return { status: "available", draft };
  } catch {
    removeStorageItem(key);
    return { status: "invalid", draft: null };
  }
};

export const cleanupExpiredMelavaDrafts = (now = Date.now()) => {
  const expiredKeys = new Set();
  const invalidKeys = new Set();
  try {
    const localStorage = storage();
    const keys = Array.from({ length: localStorage.length }, (_, index) => localStorage.key(index))
      .filter((key) => key?.startsWith(DRAFT_PREFIX));
    keys.forEach((key) => {
      const result = readMelavaDraft(key, now);
      if (result.status === "expired") expiredKeys.add(key);
      if (result.status === "invalid") invalidKeys.add(key);
    });
    return { expiredKeys, invalidKeys, error: null };
  } catch (error) {
    return { expiredKeys, invalidKeys, error };
  }
};

export const clearMelavaDraft = (key, expectedUpdatedAt) => {
  if (!key) return false;
  try {
    const localStorage = storage();
    if (expectedUpdatedAt !== undefined) {
      const serialized = localStorage.getItem(key);
      if (serialized) {
        const latest = JSON.parse(serialized);
        if (Number(latest.updatedAt) !== expectedUpdatedAt) return false;
      }
    }
    return removeStorageItem(key);
  } catch {
    return false;
  }
};

const openDatabase = () => {
  if (databasePromise) return databasePromise;
  databasePromise = new Promise((resolve, reject) => {
    if (typeof indexedDB === "undefined") {
      reject(new Error("Browser file storage is unavailable."));
      return;
    }
    const request = indexedDB.open(DATABASE_NAME, DATABASE_VERSION);
    request.onupgradeneeded = () => {
      const database = request.result;
      if (!database.objectStoreNames.contains(ATTACHMENTS_STORE)) {
        database.createObjectStore(ATTACHMENTS_STORE, { keyPath: "id" });
      }
    };
    request.onsuccess = () => {
      const database = request.result;
      database.onversionchange = () => {
        database.close();
        databasePromise = null;
      };
      resolve(database);
    };
    request.onerror = () => {
      databasePromise = null;
      reject(request.error || new Error("Could not open browser file storage."));
    };
    request.onblocked = () => {
      databasePromise = null;
      reject(new Error("Browser file storage is busy in another tab."));
    };
  });
  return databasePromise;
};

const attachmentId = (draftKey, fileId) => `${draftKey}::${fileId}`;

export const saveMelavaDraftAttachment = async (draftKey, fileId, file) => {
  const database = await openDatabase();
  return new Promise((resolve, reject) => {
    const transaction = database.transaction(ATTACHMENTS_STORE, "readwrite");
    transaction.objectStore(ATTACHMENTS_STORE).put({
      id: attachmentId(draftKey, fileId),
      file,
    });
    transaction.oncomplete = () => resolve(true);
    transaction.onerror = () => reject(transaction.error || new Error("Could not save an uploaded file."));
    transaction.onabort = () => reject(transaction.error || new Error("Could not save an uploaded file."));
  });
};

export const loadMelavaDraftAttachment = async (draftKey, fileId) => {
  const database = await openDatabase();
  return new Promise((resolve, reject) => {
    const request = database.transaction(ATTACHMENTS_STORE, "readonly")
      .objectStore(ATTACHMENTS_STORE)
      .get(attachmentId(draftKey, fileId));
    request.onsuccess = () => resolve(request.result?.file || null);
    request.onerror = () => reject(request.error || new Error("Could not restore an uploaded file."));
  });
};

export const deleteMelavaDraftAttachments = async (draftKey) => {
  try {
    const database = await openDatabase();
    await new Promise((resolve, reject) => {
      const transaction = database.transaction(ATTACHMENTS_STORE, "readwrite");
      const store = transaction.objectStore(ATTACHMENTS_STORE);
      const prefix = `${draftKey}::`;
      const cursorRequest = store.openCursor(IDBKeyRange.bound(prefix, `${prefix}\uffff`));
      cursorRequest.onsuccess = () => {
        const cursor = cursorRequest.result;
        if (!cursor) return;
        cursor.delete();
        cursor.continue();
      };
      transaction.oncomplete = resolve;
      transaction.onerror = () => reject(transaction.error || new Error("Could not clear saved files."));
      transaction.onabort = () => reject(transaction.error || new Error("Could not clear saved files."));
    });
    return true;
  } catch {
    return false;
  }
};
