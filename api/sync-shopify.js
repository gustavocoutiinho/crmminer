// ── Sync Shopify → Postgres ──────────────────────────────────────────────────
// POST /api/sync-shopify?marca_id=xxx  (syncs customers + orders)
import { Pool } from "pg";

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_SSL === "true" ? { rejectUnauthorized: false } : false,
});

const SHOPIFY_STORE = process.env.SHOPIFY_STORE || "prlsteste.myshopify.com";
const SHOPIFY_TOKEN = process.env.SHOPIFY_ACCESS_TOKEN;

async function shopifyFetch(endpoint) {
  const res = await fetch(`https://${SHOPIFY_STORE}${endpoint}`, {
    headers: { "X-Shopify-Access-Token": SHOPIFY_TOKEN, "Content-Type": "application/json" },
  });
  if (!res.ok) throw new Error(`Shopify ${res.status}: ${res.statusText}`);
  return res.json();
}

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Authorization,Content-Type");
  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).json({ error: "POST only" });

  const { marca_id } = req.query;
  if (!marca_id) return res.status(400).json({ error: "marca_id required" });
  if (!SHOPIFY_TOKEN) return res.status(500).json({ error: "Shopify token not configured" });

  try {
    let stats = { customers_synced: 0, orders_synced: 0, errors: [] };

    // ── Sync Customers (paginado) ──
    let sinceId = 0;
    for (let page = 0; page < 30; page++) {
      const data = await shopifyFetch(`/admin/api/2024-01/customers.json?limit=250&since_id=${sinceId}`);
      const customers = data.customers || [];
      if (customers.length === 0) break;

      for (const c of customers) {
        const nome = [c.first_name, c.last_name].filter(Boolean).join(" ") || c.email?.split("@")[0] || "Sem nome";
        const email = c.email || null;
        const telefone = c.phone || null;
        const totalPedidos = c.orders_count || 0;
        const receitaTotal = parseFloat(c.total_spent) || 0;

        const now = new Date();
        const lastOrder = c.last_order_date ? new Date(c.last_order_date) : null;
        const recDias = lastOrder ? Math.floor((now - lastOrder) / (1000 * 60 * 60 * 24)) : 999;

        try {
          await pool.query(`
            INSERT INTO clientes (marca_id, shopify_id, nome, email, telefone, recencia_dias, total_pedidos, receita_total, created_at)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
            ON CONFLICT (marca_id, shopify_id) DO UPDATE SET
              nome = EXCLUDED.nome,
              email = EXCLUDED.email,
              telefone = EXCLUDED.telefone,
              recencia_dias = EXCLUDED.recencia_dias,
              total_pedidos = EXCLUDED.total_pedidos,
              receita_total = EXCLUDED.receita_total,
              updated_at = now()
          `, [marca_id, c.id, nome, email, telefone, recDias, totalPedidos, receitaTotal, c.created_at]);
          stats.customers_synced++;
        } catch (e) {
          stats.errors.push(`customer ${c.id}: ${e.message}`);
        }
      }

      sinceId = customers[customers.length - 1].id;
      if (customers.length < 250) break;
    }

    // ── Sync Orders (paginado) ──
    sinceId = 0;
    for (let page = 0; page < 30; page++) {
      const data = await shopifyFetch(`/admin/api/2024-01/orders.json?limit=250&status=any&since_id=${sinceId}`);
      const orders = data.orders || [];
      if (orders.length === 0) break;

      for (const o of orders) {
        const valor = parseFloat(o.total_price) || 0;
        const status = o.financial_status === "paid" ? "aprovado" : o.cancelled_at ? "cancelado" : "pendente";

        // Encontrar cliente pelo shopify_id
        let clienteId = null;
        if (o.customer?.id) {
          const { rows } = await pool.query(
            "SELECT id FROM clientes WHERE shopify_id = $1 AND marca_id = $2 LIMIT 1",
            [o.customer.id, marca_id]
          );
          clienteId = rows[0]?.id || null;
        }

        try {
          await pool.query(`
            INSERT INTO pedidos (marca_id, shopify_id, cliente_id, valor, status, origem, created_at)
            VALUES ($1, $2, $3, $4, $5, 'shopify', $6)
            ON CONFLICT DO NOTHING
          `, [marca_id, o.id, clienteId, valor, status, o.created_at]);
          stats.orders_synced++;
        } catch (e) {
          stats.errors.push(`order ${o.id}: ${e.message}`);
        }
      }

      sinceId = orders[orders.length - 1].id;
      if (orders.length < 250) break;
    }

    // Atualizar último sync
    await pool.query(
      "UPDATE conexoes_externas SET ultimo_sync = now(), status = 'conectado' WHERE marca_id = $1 AND tipo = 'shopify'",
      [marca_id]
    );

    return res.status(200).json({ ok: true, stats });
  } catch (err) {
    console.error("[Sync Error]", err.message);
    return res.status(500).json({ error: err.message });
  }
}
