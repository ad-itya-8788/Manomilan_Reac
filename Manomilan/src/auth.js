import { apiMediaUrl, request } from "./api";

const ADMIN_ROLES = ["admin", "super"];

const SESSION_KEY = "auth";
const CANDIDATE_SESSION_KEY = "candidateAuth";
const IDLE_LIMIT = 15 * 60 * 1000;
const MAX_AGE = 8 * 60 * 60 * 1000;
const CANDIDATE_MAX_AGE = 30 * 24 * 60 * 60 * 1000;

localStorage.removeItem("authToken");
localStorage.removeItem("authRole");
localStorage.removeItem("adminToken");

export const isAdminRole = (role) => ADMIN_ROLES.includes(role);

const isCandidateUser = (user) => {
  if (user?.role?.name) {
    return String(user.role.name).trim().toLowerCase() === "candidate";
  }

  const portal = String(user?.portal || "").trim().toLowerCase();
  return portal === "candidate"
    || (portal !== "admin"
      && String(user?.role?.user_type || user?.user_type).trim() === "21");
};

const roleForUser = (user) => isCandidateUser(user) ? "candidate" : "admin";

export const homeForRole = (role) =>
  isAdminRole(role) ? "/admin" : "/candidate";

const readStoredSession = (storage, key) => {
  try {
    return JSON.parse(storage.getItem(key));
  } catch {
    return null;
  }
};

const newSessionId = () =>
  `${Date.now()}-${Math.random().toString(36).slice(2)}`;

const persistentCandidateUser = (user) => ({
  id: user?.id,
  profile_id: user?.profile_id ?? null,
  name: user?.name,
  username: user?.username,
  email: user?.email,
  is_password_changed: user?.is_password_changed,
  portal: "candidate",
  role: {
    name: "candidate",
    user_type: String(user?.role?.user_type || user?.user_type || "21"),
  },
});

const read = () => {
  const persistent = readStoredSession(localStorage, CANDIDATE_SESSION_KEY);
  const tab = readStoredSession(sessionStorage, SESSION_KEY);

  if (tab?.role === "admin") return tab;

  if (persistent?.token) {
    const sameTabSession = tab?.sessionId === persistent.sessionId ? tab : null;
    return {
      ...persistent,
      ...(sameTabSession ? {
        user: sameTabSession.user || persistent.user,
        lastActive: sameTabSession.lastActive,
      } : {}),
      token: persistent.token,
      role: "candidate",
    };
  }

  if (tab?.role === "candidate" && !tab.token) return null;
  return tab;
};

const writeSession = (session) => {
  const role = session.user ? roleForUser(session.user) : session.role;
  const normalized = {
    ...session,
    role,
    sessionId: session.sessionId || newSessionId(),
  };

  if (role === "candidate") {
    const persistent = {
      token: normalized.token,
      role,
      user: persistentCandidateUser(normalized.user),
      sessionId: normalized.sessionId,
      startedAt: normalized.startedAt,
      lastActive: normalized.lastActive,
      expiresAt: normalized.expiresAt,
    };
    const tabSession = { ...normalized };
    delete tabSession.token;

    localStorage.setItem(CANDIDATE_SESSION_KEY, JSON.stringify(persistent));
    sessionStorage.setItem(SESSION_KEY, JSON.stringify(tabSession));
    return;
  }

  sessionStorage.setItem(SESSION_KEY, JSON.stringify(normalized));
};

export function saveSession({ token, role, user = null, expiresAt = null }) {
  const now = Date.now();
  const resolvedRole = user ? roleForUser(user) : role;
  const serverExpiry = Number(expiresAt);
  const expiryInMilliseconds = serverExpiry > 0
    ? (serverExpiry < 1e12 ? serverExpiry * 1000 : serverExpiry)
    : now + (resolvedRole === "candidate" ? CANDIDATE_MAX_AGE : MAX_AGE);

  writeSession({
    token,
    role: resolvedRole,
    user,
    startedAt: now,
    lastActive: now,
    expiresAt: expiryInMilliseconds,
    sessionId: newSessionId(),
  });
}

export function markPasswordChanged() {
  const session = read();
  if (!session?.user) return;

  session.user.is_password_changed = true;
  writeSession(session);
}

export function getSession() {
  const session = read();
  if (!session) return null;

  const resolvedRole = session.user ? roleForUser(session.user) : session.role;
  if (session.role !== resolvedRole) {
    session.role = resolvedRole;
    writeSession(session);
  }

  const now = Date.now();
  if (resolvedRole === "candidate" && !session.sessionId) {
    const startedAt = Number(session.startedAt) || now;
    session.sessionId = newSessionId();
    session.expiresAt = startedAt + MAX_AGE;
    writeSession(session);
  }

  const startedAt = Number(session.startedAt) || now;
  const lastActive = Number(session.lastActive) || startedAt;
  const expired = resolvedRole === "candidate"
    ? now >= (Number(session.expiresAt) || startedAt + MAX_AGE)
    : now - lastActive > IDLE_LIMIT || now - startedAt > MAX_AGE;

  if (expired) {
    clearSession();
    return null;
  }
  return { token: session.token, role: session.role, user: session.user || null };
}

export function getCachedHomeData() {
  const user = getSession()?.user;
  if (!user) return null;

  const source = user.profile;
  const profile = source
    ? {
        ...source,
        registration_number: source.registration_number || source.profile_id,
        full_name: source.full_name || source.fullName,
        gender: source.gender || source.groomOrBride,
        photo_url: apiMediaUrl(source.photo_url || source.profilePhoto),
        birth_date: source.birth_date || source.birthDate,
        city: source.city || source.location || source.professionalCity,
        education: source.education || "",
        profession: source.profession || "",
        verification_status: source.verification_status || source.profileVerificationStatus,
        profile_completion: Number(source.profile_completion || 0),
        has_education: Boolean(source.has_education || (source.education && source.profession)),
        has_family: Boolean(source.has_family || (source.fathersName && source.mothersName)),
        has_photos: Boolean(source.has_photos || source.profilePhoto),
        has_preferences: Boolean(source.has_preferences),
      }
    : null;

  return { user, profile };
}

export function updateCachedUserProfile(profile) {
  const session = read();
  if (!session?.user || !profile) return;

  session.user.profile = {
    ...(session.user.profile || {}),
    ...profile,
  };
  writeSession(session);
}

export function touchSession() {
  const session = read();
  if (!session) return;
  session.lastActive = Date.now();
  writeSession(session);
}

export function clearSession() {
  const session = read();
  sessionStorage.removeItem(SESSION_KEY);
  if (session?.role === "candidate") {
    const persistent = readStoredSession(localStorage, CANDIDATE_SESSION_KEY);
    if (!session.sessionId || persistent?.sessionId === session.sessionId) {
      localStorage.removeItem(CANDIDATE_SESSION_KEY);
    }
  }

  if (session?.token) {
    request("/logout", {
      method: "POST",
      auth: false,
      headers: { Authorization: `Bearer ${session.token}` },
    }).catch(() => {});
  }
}

export function watchActivity(onExpire) {
  let last = 0;
  let lastStatusCheck = 0;
  let statusCheckInFlight = false;

  const bump = () => {
    const now = Date.now();
    if (now - last > 30000) {
      last = now;
      touchSession();
    }
  };

  const checkAccountStatus = () => {
    const now = Date.now();
    if (statusCheckInFlight || now - lastStatusCheck < 15000) return;

    lastStatusCheck = now;
    statusCheckInFlight = true;
    request("/auth/status")
      .catch((error) => {
        if (![0, 401, 403].includes(error?.status)) {
          console.error("Unable to verify the account status.", error);
        }
      })
      .finally(() => {
        statusCheckInFlight = false;
      });
  };

  const events = ["click", "keydown", "mousemove", "scroll", "touchstart"];
  events.forEach((event) =>
    window.addEventListener(event, bump, { passive: true }),
  );

  checkAccountStatus();
  window.addEventListener("focus", checkAccountStatus);

  const timer = setInterval(() => {
    if (!getSession()) onExpire();
  }, 15000);
  const statusTimer = setInterval(checkAccountStatus, 30000);

  return () => {
    events.forEach((event) => window.removeEventListener(event, bump));
    window.removeEventListener("focus", checkAccountStatus);
    clearInterval(timer);
    clearInterval(statusTimer);
  };
}

export async function loginUser(username, password) {
  try {
    const body = await request("/login", {
      method: "POST",
      body: { username, password },
      auth: false,
    });

    if (!body?.token || !body?.user) {
      throw new Error("The server returned an invalid login response.");
    }

    return {
      token: body.token,
      role: roleForUser(body.user),
      user: body.user,
      expiresAt: body.expires_at,
    };
  } catch (error) {
    if (error.status === 401) {
      throw new Error("Invalid username or password.", { cause: error });
    }
    if (error.status === 429) {
      throw new Error(
        "Too many attempts. Please wait a few minutes and try again.",
        { cause: error },
      );
    }
    throw error;
  }
}

export async function registerUser({ name, email, phone, password, birth_date, gender }) {
  const body = await request("/register", {
    method: "POST",
    body: { name, email, phone, password, birth_date, gender },
    auth: false,
  });

  if (!body?.token || !body?.user) {
    throw new Error("The server returned an invalid registration response.");
  }

  return {
    token: body.token,
    role: roleForUser(body.user),
    user: body.user,
    expiresAt: body.expires_at,
  };
}

const DASHBOARD_CACHE_KEY = "candidate_dashboard_cache";
const DASHBOARD_CACHE_TTL = 60 * 60 * 1000;
let dashboardRequest = null;

export function readDashboardCache() {
  try {
    const cached = JSON.parse(sessionStorage.getItem(DASHBOARD_CACHE_KEY));
    if (cached?.savedAt && Date.now() - cached.savedAt < DASHBOARD_CACHE_TTL) {
      return cached.data || null;
    }
  } catch {
    sessionStorage.removeItem(DASHBOARD_CACHE_KEY);
  }
  return null;
}

export function clearDashboardCache() {
  sessionStorage.removeItem(DASHBOARD_CACHE_KEY);
}

async function loadDashboard(endpoint, {
  force = false, period = "", from = "", to = "", gender = "", status = "", source = "",
  useSessionCache = true,
} = {}) {
  if (!force && useSessionCache) {
    const cached = readDashboardCache();
    if (cached) return cached;
  }

  const query = new URLSearchParams();
  if (period) query.set("period", period);
  if (from) query.set("from", from);
  if (to) query.set("to", to);
  if (gender && gender !== "all") query.set("gender", gender);
  if (status && status !== "all") query.set("status", status);
  if (source) query.set("source", source);
  const queryString = query.toString();

  dashboardRequest = request(
    `${endpoint}${queryString ? `?${queryString}` : ""}`,
    { cacheBypass: force },
  ).then((body) => {
      if (!body?.success || !body?.data) {
        throw new Error(body?.message || "Could not load dashboard data.");
      }
      if (useSessionCache) {
        sessionStorage.setItem(DASHBOARD_CACHE_KEY, JSON.stringify({
          savedAt: Date.now(),
          data: body.data,
        }));
      }
      return body.data;
    }).finally(() => {
      dashboardRequest = null;
    });

  return dashboardRequest;
}

export const getDashboard = (options = {}) => loadDashboard("/dashboard", options);
export const getAdminDashboard = (options = {}) =>
  loadDashboard("/reports", { ...options, useSessionCache: false });
export const getAdminDashboardOverview = (options = {}) =>
  loadDashboard("/dashboard", { ...options, useSessionCache: false });

export async function getHomeData() {
  const body = await request("/home-data");
  if (!body?.success || !body?.data) {
    throw new Error(body?.message || "Could not load profile data.");
  }
  return body.data;
}

export async function getReceivedInterests(perPage = 20) {
  const body = await request(`/interests/received?per_page=${perPage}`);
  return body?.data || null;
}

export async function getSentInterests(perPage = 20) {
  const body = await request(`/interests/sent?per_page=${perPage}`);
  return body?.data || null;
}

export async function getProfiles(params = {}) {
  const query = new URLSearchParams(
    Object.entries(params).filter(([, value]) => value !== "" && value != null),
  ).toString();
  const body = await request(`/profiles${query ? `?${query}` : ""}`);
  return body?.data || null;
}

export async function getMyProfile() {
  const body = await request("/my-profile");
  return body?.data || null;
}
