export function timeAgo(date) {
  if (!date) return "";
  const now = Date.now();
  const d = new Date(date).getTime();
  const diff = Math.max(0, now - d);
  const sec = Math.floor(diff / 1000);
  if (sec < 60) return "agora";
  const min = Math.floor(sec / 60);
  if (min < 60) return `${min}min`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}h`;
  const days = Math.floor(hr / 24);
  if (days < 30) return `${days}d`;
  const months = Math.floor(days / 30);
  return `${months}m`;
}

export function timelineRelative(dateStr) {
  if (!dateStr) return "";
  const d = new Date(dateStr);
  const now = new Date();
  const diffMs = now - d;
  const diffMin = Math.floor(diffMs / 60000);
  if (diffMin < 1) return "Agora";
  if (diffMin < 60) return `${diffMin}min atrás`;
  const diffH = Math.floor(diffMin / 60);
  if (diffH < 24) return `${diffH}h atrás`;
  const diffD = Math.floor(diffH / 24);
  if (diffD === 1) return "Ontem";
  if (diffD < 7) return `${diffD} dias atrás`;
  return d.toLocaleDateString("pt-BR", { day: "numeric", month: "short" });
}

export function timelineDateGroup(dateStr) {
  if (!dateStr) return "Sem data";
  const d = new Date(dateStr);
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const evDay = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const diffD = Math.round((today - evDay) / 86400000);
  if (diffD === 0) return "Hoje";
  if (diffD === 1) return "Ontem";
  return d.toLocaleDateString("pt-BR", { day: "numeric", month: "long", year: now.getFullYear() !== d.getFullYear() ? "numeric" : undefined });
}

export function fmtBRL(v) {
  return (+v || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export function computeMRR(m) {
  const PLANO_MRR = { starter: 197, pro: 497, enterprise: 1497 };
  return PLANO_MRR[m.plano] || m.mrr || 0;
}

export function inboxTimeAgo(date) {
  if (!date) return "";
  const now = new Date();
  const d = new Date(date);
  const diff = Math.floor((now - d) / 1000);
  if (diff < 60) return "agora";
  if (diff < 3600) return `${Math.floor(diff / 60)}m`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h`;
  if (diff < 604800) return `${Math.floor(diff / 86400)}d`;
  return d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" });
}

export const PLANO_MRR = { starter: 197, pro: 497, enterprise: 1497 };

export const PLANOS = [
  { id: "starter", label: "Starter", preco: 197, lojas: 1, usuarios: 5, clientes: 1000 },
  { id: "pro", label: "Pro", preco: 497, lojas: 3, usuarios: 15, clientes: 5000 },
  { id: "enterprise", label: "Enterprise", preco: 1497, lojas: "∞", usuarios: "∞", clientes: "∞" },
];

export const NOTIF_ICONS = {
  info: "ℹ️", alerta: "⚠️", sucesso: "✅", erro: "❌",
  tarefa: "📋", pedido: "🛍", campanha: "📢", automacao: "⚡",
};
