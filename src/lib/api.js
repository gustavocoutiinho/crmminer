// ── CRM Miner API Client ─────────────────────────────────────────────────────
// Conecta ao backend (Express server via Cloudflare Tunnel)

const API_URL = import.meta.env.VITE_API_URL || "";

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

export async function googleLogin(credential) {
  const data = await apiFetch("/api/auth/google", {
    method: "POST",
    body: JSON.stringify({ credential }),
  });
  setAuth(data.token, data.user);
  return data;
}

export async function register(nome, email, password) {
  const data = await apiFetch("/api/auth/register", {
    method: "POST",
    body: JSON.stringify({ nome, email, password }),
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

export async function fetchAdvancedStats() {
  return apiFetch("/api/stats/advanced");
}

export async function recalculateRFM() {
  return apiFetch("/api/rfm/recalculate", { method: "POST" });
}

export async function syncShopify(marcaId) {
  return apiFetch("/api/sync/shopify", { method: "POST", body: JSON.stringify({ marca_id: marcaId }) });
}
export async function connectIntegracao(tipo, config) {
  return apiFetch("/api/integracoes/connect", { method: "POST", body: JSON.stringify({ tipo, config }) });
}
export async function syncIntegracao(id) {
  return apiFetch(`/api/integracoes/${id}/sync`, { method: "POST" });
}

export async function forgotPassword(email) {
  return apiFetch("/api/auth/forgot-password", { method: "POST", body: JSON.stringify({ email }) });
}
export async function resetPassword(token, password) {
  return apiFetch("/api/auth/reset-password", { method: "POST", body: JSON.stringify({ token, password }) });
}

export async function fetchSyncLogs() {
  return apiFetch("/api/sync/logs");
}

export async function createUser(userData) {
  return apiFetch("/api/users", { method: "POST", body: JSON.stringify(userData) });
}

export async function fetchData(table, { limit = 50, offset = 0, segmento_rfm, search, status, order_by, order_dir, tag } = {}) {
  const params = new URLSearchParams({ limit, offset });
  if (segmento_rfm) params.set("segmento_rfm", segmento_rfm);
  if (search) params.set("search", search);
  if (status) params.set("status", status);
  if (order_by) params.set("order_by", order_by);
  if (order_dir) params.set("order_dir", order_dir);
  if (tag) params.set("tag", tag);
  return apiFetch(`/api/data/${table}?${params}`);
}

export async function fetchClienteDetail(id) {
  return apiFetch(`/api/clientes/${id}`);
}

export async function addTimelineEntry(clienteId, data) {
  return apiFetch(`/api/clientes/${clienteId}/timeline`, { method: "POST", body: JSON.stringify(data) });
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

// ── Automações ───────────────────────────────────────────────────────────────
export async function fetchAutomacoes() {
  return apiFetch("/api/automacoes");
}

export async function fetchAutomacao(id) {
  return apiFetch(`/api/automacoes/${id}`);
}

export async function createAutomacao(data) {
  return apiFetch("/api/automacoes", { method: "POST", body: JSON.stringify(data) });
}

export async function updateAutomacao(id, changes) {
  return apiFetch(`/api/automacoes/${id}`, { method: "PATCH", body: JSON.stringify(changes) });
}

export async function previewAutomacao(id) {
  return apiFetch(`/api/automacoes/${id}/preview`, { method: "POST" });
}

export async function deleteAutomacao(id) {
  return apiFetch(`/api/automacoes/${id}`, { method: "DELETE" });
}

export async function fetchAutoExecucoes(params = {}) {
  const qs = new URLSearchParams();
  if (params.automacao_id) qs.set("automacao_id", params.automacao_id);
  if (params.status) qs.set("status", params.status);
  if (params.limit) qs.set("limit", params.limit);
  return apiFetch(`/api/automacao-execucoes?${qs}`);
}

export async function duplicateAutomacao(id) {
  return apiFetch(`/api/automacoes/${id}/duplicate`, { method: "POST" });
}

// ── Integrações ──────────────────────────────────────────────────────────────
export async function fetchIntegracoes() {
  return apiFetch("/api/integracoes");
}

export async function fetchIntegracao(id) {
  return apiFetch(`/api/integracoes/${id}`);
}

export async function updateIntegracao(id, changes) {
  return apiFetch(`/api/integracoes/${id}`, { method: "PATCH", body: JSON.stringify(changes) });
}

export async function testIntegracao(id) {
  return apiFetch(`/api/integracoes/${id}/test`, { method: "POST" });
}

// ── Templates ────────────────────────────────────────────────────────────────
export async function fetchTemplates(canal, categoria) {
  const params = new URLSearchParams();
  if (canal) params.set("canal", canal);
  if (categoria) params.set("categoria", categoria);
  return apiFetch(`/api/templates?${params}`);
}

export async function createTemplate(data) {
  return apiFetch("/api/templates", { method: "POST", body: JSON.stringify(data) });
}

export async function updateTemplate(id, changes) {
  return apiFetch(`/api/templates/${id}`, { method: "PATCH", body: JSON.stringify(changes) });
}

export async function deleteTemplate(id) {
  return apiFetch(`/api/templates/${id}`, { method: "DELETE" });
}

// ── Customer Intelligence ────────────────────────────────────────────────────
export async function calculateChurnScores() {
  return apiFetch("/api/intelligence/churn-score", { method: "POST" });
}

export async function fetchAcoesPendentes(acao, limit = 20) {
  const params = new URLSearchParams({ limit });
  if (acao) params.set("acao", acao);
  return apiFetch(`/api/intelligence/acoes-pendentes?${params}`);
}

// ── Notificações ─────────────────────────────────────────────────────────────
export async function fetchNotificacoes(unread = false, { tipo, limit, offset } = {}) {
  const p = new URLSearchParams();
  if (unread) p.set("unread", "true");
  if (tipo) p.set("tipo", tipo);
  if (limit) p.set("limit", String(limit));
  if (offset) p.set("offset", String(offset));
  const qs = p.toString();
  return apiFetch(`/api/notificacoes${qs ? "?" + qs : ""}`);
}

export async function deleteNotificacao(id) {
  return apiFetch(`/api/notificacoes/${id}`, { method: "DELETE" });
}

export async function clearNotificacoes() {
  return apiFetch("/api/notificacoes", { method: "DELETE" });
}

export async function markAllRead() {
  return apiFetch("/api/notificacoes/read-all", { method: "PATCH" });
}

export async function markRead(id) {
  return apiFetch(`/api/notificacoes/${id}`, { method: "PATCH" });
}

// ── Activity Log ─────────────────────────────────────────────────────────────
export async function fetchActivity(params = {}) {
  const sp = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) { if (v !== undefined && v !== null && v !== "") sp.set(k, v); }
  return apiFetch(`/api/activity?${sp.toString()}`);
}

// ── Busca Global ─────────────────────────────────────────────────────────────
export async function globalSearch(query) {
  return apiFetch(`/api/search?q=${encodeURIComponent(query)}&limit=10`);
}

// ── Mensagens / Inbox ────────────────────────────────────────────────────────
export async function enviarMensagem(data) {
  return apiFetch("/api/mensagens/enviar", { method: "POST", body: JSON.stringify(data) });
}

export async function fetchInbox(clienteId) {
  const params = new URLSearchParams();
  if (clienteId) params.set("cliente_id", clienteId);
  return apiFetch(`/api/inbox?${params}`);
}

export async function fetchHealthFull() {
  return apiFetch("/api/health/full");
}

// ── Pipeline de Vendas ───────────────────────────────────────────────────────
export async function fetchOportunidades(params = {}) {
  const qs = new URLSearchParams();
  if (params.etapa) qs.set("etapa", params.etapa);
  if (params.vendedor_id) qs.set("vendedor_id", params.vendedor_id);
  if (params.search) qs.set("search", params.search);
  return apiFetch(`/api/oportunidades?${qs}`);
}
export async function createOportunidade(data) {
  return apiFetch("/api/oportunidades", { method: "POST", body: JSON.stringify(data) });
}
export async function updateOportunidade(id, changes) {
  return apiFetch(`/api/oportunidades/${id}`, { method: "PATCH", body: JSON.stringify(changes) });
}
export async function deleteOportunidade(id) {
  return apiFetch(`/api/oportunidades/${id}`, { method: "DELETE" });
}
export async function fetchFunil() {
  return apiFetch("/api/oportunidades/funil");
}

// ── Vendedor Stats ───────────────────────────────────────────────────────────
export async function fetchVendedorStats() {
  return apiFetch("/api/stats/vendedor");
}

// ── Profile ──────────────────────────────────────────────────────────────────
export async function updateProfile(data) {
  return apiFetch("/api/auth/profile", { method: "PATCH", body: JSON.stringify(data) });
}
export async function changePassword(current_password, new_password) {
  return apiFetch("/api/auth/change-password", { method: "POST", body: JSON.stringify({ current_password, new_password }) });
}

// ── Import CSV ───────────────────────────────────────────────────────────────
export async function importClientes(clientes) {
  return apiFetch("/api/import/clientes", { method: "POST", body: JSON.stringify({ clientes }) });
}

// ── API Keys ─────────────────────────────────────────────────────────────────
export async function fetchApiKeys() { return apiFetch("/api/api-keys"); }
export async function createApiKey(data) { return apiFetch("/api/api-keys", { method: "POST", body: JSON.stringify(data) }); }
export async function deleteApiKey(id) { return apiFetch(`/api/api-keys/${id}`, { method: "DELETE" }); }

// ── Webhooks Management ──────────────────────────────────────────────────────
export async function fetchWebhooks() { return apiFetch("/api/webhooks"); }
export async function createWebhook(data) { return apiFetch("/api/webhooks", { method: "POST", body: JSON.stringify(data) }); }
export async function updateWebhook(id, changes) { return apiFetch(`/api/webhooks/${id}`, { method: "PATCH", body: JSON.stringify(changes) }); }
export async function deleteWebhook(id) { return apiFetch(`/api/webhooks/${id}`, { method: "DELETE" }); }
export async function testWebhook(id) { return apiFetch(`/api/webhooks/${id}/test`, { method: "POST" }); }

// ── Tags ─────────────────────────────────────────────────────────────────────
export async function fetchTags() { return apiFetch("/api/tags"); }
export async function createTag(data) { return apiFetch("/api/tags", { method: "POST", body: JSON.stringify(data) }); }
export async function updateTag(id, changes) { return apiFetch(`/api/tags/${id}`, { method: "PATCH", body: JSON.stringify(changes) }); }
export async function deleteTag(id) { return apiFetch(`/api/tags/${id}`, { method: "DELETE" }); }
export async function addClienteTag(clienteId, tag) { return apiFetch(`/api/clientes/${clienteId}/tags`, { method: "POST", body: JSON.stringify({ tag }) }); }
export async function removeClienteTag(clienteId, tag) { return apiFetch(`/api/clientes/${clienteId}/tags/${encodeURIComponent(tag)}`, { method: "DELETE" }); }

// ── Tarefas (Kanban) ─────────────────────────────────────────────────────────
export async function fetchTarefas(params = {}) {
  const qs = new URLSearchParams();
  if (params.status) qs.set("status", params.status);
  if (params.responsavel_id) qs.set("responsavel_id", params.responsavel_id);
  return apiFetch(`/api/tarefas?${qs}`);
}
export async function updateTarefa(id, changes) {
  return apiFetch(`/api/tarefas/${id}`, { method: "PATCH", body: JSON.stringify(changes) });
}
export async function deleteTarefa(id) {
  return apiFetch(`/api/tarefas/${id}`, { method: "DELETE" });
}

// ── Owner Stats ──────────────────────────────────────────────────────────────
export async function fetchOwnerStats() { return apiFetch("/api/stats/owner"); }

// ── Onboarding ───────────────────────────────────────────────────────────────
export async function fetchOnboarding() { return apiFetch("/api/onboarding"); }
export async function skipOnboarding() { return apiFetch("/api/onboarding/skip", { method: "POST" }); }

// ── Campanhas ────────────────────────────────────────────────────────────────
export async function fetchCampanhaStats() { return apiFetch("/api/campanhas/stats"); }
export async function fetchCampanhaAudiencia(id) { return apiFetch(`/api/campanhas/${id}/audiencia`); }
export async function updateCampanha(id, data) { return apiFetch(`/api/campanhas/${id}`, { method: "PATCH", body: JSON.stringify(data) }); }
export async function duplicateCampanha(id) { return apiFetch(`/api/campanhas/${id}/duplicate`, { method: "POST" }); }

// ── Admin (miner only) ───────────────────────────────────────────────────────
export async function fetchAdminUsers() { return apiFetch("/api/admin/users"); }
export async function patchAdminUser(id, data) { return apiFetch(`/api/admin/users/${id}`, { method: "PATCH", body: JSON.stringify(data) }); }
export async function resetAdminUserPassword(id, password) { return apiFetch(`/api/admin/users/${id}/reset-password`, { method: "POST", body: JSON.stringify({ password }) }); }
export async function fetchAdminSystem() { return apiFetch("/api/admin/system"); }
export async function clearExpiredSessions() { return apiFetch("/api/admin/clear-sessions", { method: "POST" }); }

// ── Exports ──────────────────────────────────────────────────────────────────
export { getToken, getUser, setAuth, clearAuth, API_URL };

export async function fetchAgenda() { return apiFetch("/api/intelligence/agenda"); }
