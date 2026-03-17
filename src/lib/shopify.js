// ── Shopify API Client (via proxy /api/shopify para não expor token no frontend) ──
// Para dev/demo: usa proxy serverless que guarda o token seguro

const SHOPIFY_PROXY = "/api/shopify";

async function shopifyFetch(endpoint, opts = {}) {
  const res = await fetch(`${SHOPIFY_PROXY}?endpoint=${encodeURIComponent(endpoint)}`, opts);
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(err.error || res.statusText);
  }
  return res.json();
}

// ── Clientes ─────────────────────────────────────────────────────────────────
export async function fetchShopifyCustomers({ limit = 50, sinceId = null } = {}) {
  let url = `/admin/api/2024-01/customers.json?limit=${limit}`;
  if (sinceId) url += `&since_id=${sinceId}`;
  const data = await shopifyFetch(url);
  return (data.customers || []).map(mapCustomer);
}

export async function fetchAllShopifyCustomers(maxPages = 20) {
  const all = [];
  let sinceId = null;
  for (let i = 0; i < maxPages; i++) {
    const batch = await fetchShopifyCustomers({ limit: 250, sinceId });
    if (batch.length === 0) break;
    all.push(...batch);
    sinceId = batch[batch.length - 1]?.shopify_id;
    if (batch.length < 250) break;
  }
  return all;
}

export async function fetchShopifyCustomerCount() {
  const data = await shopifyFetch("/admin/api/2024-01/customers/count.json");
  return data.count || 0;
}

// ── Pedidos ──────────────────────────────────────────────────────────────────
export async function fetchShopifyOrders({ limit = 50, status = "any" } = {}) {
  const data = await shopifyFetch(`/admin/api/2024-01/orders.json?limit=${limit}&status=${status}`);
  return (data.orders || []).map(mapOrder);
}

export async function fetchShopifyOrderCount() {
  const data = await shopifyFetch("/admin/api/2024-01/orders/count.json?status=any");
  return data.count || 0;
}

// ── Shop info ────────────────────────────────────────────────────────────────
export async function fetchShopInfo() {
  const data = await shopifyFetch("/admin/api/2024-01/shop.json");
  return data.shop;
}

// ── Mappers ──────────────────────────────────────────────────────────────────
function mapCustomer(c) {
  const now = new Date();
  const lastOrder = c.last_order_date ? new Date(c.last_order_date) : null;
  const recDias = lastOrder ? Math.floor((now - lastOrder) / (1000 * 60 * 60 * 24)) : 999;
  const pedidos = c.orders_count || 0;
  const receita = parseFloat(c.total_spent) || 0;

  let seg = "inativo";
  if (recDias <= 30 && pedidos >= 20 && receita >= 5000) seg = "campiao";
  else if (recDias <= 60 && pedidos >= 10) seg = "fiel";
  else if (recDias <= 60 && pedidos < 10) seg = "potencial";
  else if (recDias > 60 && recDias <= 120) seg = "em_risco";
  else if (recDias > 120) seg = "inativo";

  return {
    shopify_id: c.id,
    nome: [c.first_name, c.last_name].filter(Boolean).join(" ") || c.email?.split("@")[0] || "Sem nome",
    email: c.email || "",
    telefone: c.phone || "",
    seg,
    segmento_rfm: seg,
    rec: recDias,
    recencia_dias: recDias,
    pedidos,
    total_pedidos: pedidos,
    receita,
    receita_total: receita,
    vend: "",
    created_at: c.created_at,
  };
}

function mapOrder(o) {
  return {
    shopify_id: o.id,
    valor: parseFloat(o.total_price) || 0,
    status: o.financial_status === "paid" ? "aprovado" : o.cancelled_at ? "cancelado" : "pendente",
    origem: "shopify",
    cliente_nome: o.customer ? [o.customer.first_name, o.customer.last_name].filter(Boolean).join(" ") : "",
    cliente_email: o.customer?.email || "",
    created_at: o.created_at,
  };
}
