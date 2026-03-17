#!/usr/bin/env node
// Sync Shopify → local Postgres
// Usage: DATABASE_URL=postgresql://crm:crm2026miner@localhost:5432/crmminer node scripts/sync-shopify-local.js

import pg from "pg";
const { Pool } = pg;

const pool = new Pool({ connectionString: process.env.DATABASE_URL || "postgresql://crm:crm2026miner@localhost:5432/crmminer" });
const SHOPIFY_STORE = process.env.SHOPIFY_STORE || "prlsteste.myshopify.com";
const SHOPIFY_TOKEN = process.env.SHOPIFY_ACCESS_TOKEN || "REMOVED";
const MARCA_ID = "a0000000-0000-0000-0000-000000000001";

async function shopifyFetch(endpoint) {
  const res = await fetch(`https://${SHOPIFY_STORE}${endpoint}`, {
    headers: { "X-Shopify-Access-Token": SHOPIFY_TOKEN },
  });
  if (!res.ok) throw new Error(`Shopify ${res.status}`);
  return res.json();
}

async function main() {
  console.log("🚀 Sync Shopify → Postgres starting...");
  let custCount = 0, ordCount = 0;

  // Customers
  let sinceId = 0;
  for (let page = 0; page < 30; page++) {
    const data = await shopifyFetch(`/admin/api/2024-01/customers.json?limit=250&since_id=${sinceId}`);
    const customers = data.customers || [];
    if (customers.length === 0) break;
    console.log(`  📦 Page ${page + 1}: ${customers.length} customers`);

    for (const c of customers) {
      const nome = [c.first_name, c.last_name].filter(Boolean).join(" ") || c.email?.split("@")[0] || "Sem nome";
      const now = new Date();
      const lastOrder = c.last_order_date ? new Date(c.last_order_date) : null;
      const recDias = lastOrder ? Math.floor((now - lastOrder) / (1000 * 60 * 60 * 24)) : 999;

      await pool.query(`
        INSERT INTO clientes (marca_id, shopify_id, nome, email, telefone, recencia_dias, total_pedidos, receita_total, created_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        ON CONFLICT (marca_id, shopify_id) DO UPDATE SET
          nome = EXCLUDED.nome, email = EXCLUDED.email, telefone = EXCLUDED.telefone,
          recencia_dias = EXCLUDED.recencia_dias, total_pedidos = EXCLUDED.total_pedidos,
          receita_total = EXCLUDED.receita_total, updated_at = now()
      `, [MARCA_ID, c.id, nome, c.email || null, c.phone || null, recDias, c.orders_count || 0, parseFloat(c.total_spent) || 0, c.created_at]);
      custCount++;
    }
    sinceId = customers[customers.length - 1].id;
    if (customers.length < 250) break;
  }

  // Orders
  sinceId = 0;
  for (let page = 0; page < 30; page++) {
    const data = await shopifyFetch(`/admin/api/2024-01/orders.json?limit=250&status=any&since_id=${sinceId}`);
    const orders = data.orders || [];
    if (orders.length === 0) break;
    console.log(`  🛍 Page ${page + 1}: ${orders.length} orders`);

    for (const o of orders) {
      let clienteId = null;
      if (o.customer?.id) {
        const { rows } = await pool.query("SELECT id FROM clientes WHERE shopify_id = $1 AND marca_id = $2 LIMIT 1", [o.customer.id, MARCA_ID]);
        clienteId = rows[0]?.id || null;
      }
      const status = o.financial_status === "paid" ? "aprovado" : o.cancelled_at ? "cancelado" : "pendente";
      await pool.query(`
        INSERT INTO pedidos (marca_id, shopify_id, cliente_id, valor, status, origem, created_at)
        VALUES ($1, $2, $3, $4, $5, 'shopify', $6)
        ON CONFLICT (marca_id, shopify_id) DO NOTHING
      `, [MARCA_ID, o.id, clienteId, parseFloat(o.total_price) || 0, status, o.created_at]);
      ordCount++;
    }
    sinceId = orders[orders.length - 1].id;
    if (orders.length < 250) break;
  }

  // Stats
  const { rows: clienteStats } = await pool.query("SELECT COUNT(*) as total, COUNT(DISTINCT segmento_rfm) as segs FROM clientes WHERE marca_id = $1", [MARCA_ID]);
  const { rows: pedidoStats } = await pool.query("SELECT COUNT(*) as total, SUM(valor) as receita FROM pedidos WHERE marca_id = $1", [MARCA_ID]);
  const { rows: rfmStats } = await pool.query("SELECT segmento_rfm, COUNT(*) as n FROM clientes WHERE marca_id = $1 GROUP BY segmento_rfm ORDER BY n DESC", [MARCA_ID]);

  console.log(`\n✅ Sync complete!`);
  console.log(`   Customers: ${custCount} synced → ${clienteStats[0].total} in DB`);
  console.log(`   Orders: ${ordCount} synced → ${pedidoStats[0].total} in DB (R$ ${parseFloat(pedidoStats[0].receita || 0).toFixed(2)})`);
  console.log(`   RFM segments:`);
  rfmStats.forEach(r => console.log(`     ${r.segmento_rfm}: ${r.n}`));

  await pool.end();
}

main().catch(e => { console.error(e); process.exit(1); });
