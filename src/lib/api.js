// ── CRM Miner API Client ─────────────────────────────────────────────────────
// Conecta ao backend (Express server via Cloudflare Tunnel)

const API_URL = import.meta.env.VITE_API_URL || "https://carried-burning-tide-deadline.trycloudflare.com";

function getToken() {
  return localStorage.getItem("crm_token");
}
function getUser() {
  try { return JSON.parse(localStorage.getItem("crm_user")); } catch { return null; }
}
function setAuth(token, user) {
  localStorage.setItem("crm_token", token);
  localStorage.setItem("crm_user", JSON.stringify(user));
}
function clearAuth() {
  localStorage.removeItem("crm_token");
  localStorage.removeItem("crm_user");
}

async function apiFetch(path, opts = {}) {
  const token = getToken();
  const res = await fetch(`${API_URL}${path}`, {
    ...opts,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(opts.headers || {}),
    },
  });
  const data = await res.json().catch(() => null);
  if (!res.ok) throw new Error(data?.error || res.statusText);
  return data;
}

// ── Auth ─────────────────────────────────────────────────────────────────────
export async function login(email, password) {
  const data = await apiFetch("/api/auth/login", {
    method: "POST",
    body: JSON.stringify({ email, password }),
  });
  setAuth(data.token, data.user);
  return data;
}

export async function getMe() {
  return apiFetch("/api/auth/me");
}

export async function logout() {
  try { await apiFetch("/api/auth/logout", { method: "POST" }); } catch {}
  clearAuth();
}

// ── Data ─────────────────────────────────────────────────────────────────────
export async function fetchStats() {
  return apiFetch("/api/stats");
}

export async function fetchData(table, { limit = 50, offset = 0, segmento_rfm, search, status } = {}) {
  const params = new URLSearchParams({ limit, offset });
  if (segmento_rfm) params.set("segmento_rfm", segmento_rfm);
  if (search) params.set("search", search);
  if (status) params.set("status", status);
  return apiFetch(`/api/data/${table}?${params}`);
}

export async function fetchClienteDetail(id) {
  return apiFetch(`/api/clientes/${id}`);
}

export async function createRecord(table, record) {
  return apiFetch(`/api/data/${table}`, { method: "POST", body: JSON.stringify(record) });
}

export async function updateRecord(table, id, changes) {
  return apiFetch(`/api/data/${table}?id=${id}`, { method: "PATCH", body: JSON.stringify(changes) });
}

export async function deleteRecord(table, id) {
  return apiFetch(`/api/data/${table}?id=${id}`, { method: "DELETE" });
}

// ── Health ───────────────────────────────────────────────────────────────────
export async function checkHealth() {
  return apiFetch("/api/health");
}

// ── Exports ──────────────────────────────────────────────────────────────────
export { getToken, getUser, setAuth, clearAuth, API_URL };
