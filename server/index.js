#!/usr/bin/env node
// ── CRM Miner API Server v2 ──────────────────────────────────────────────────
import express from "express";
import cors from "cors";
import pg from "pg";
import crypto from "crypto";

const { Pool } = pg;
const app = express();
const PORT = process.env.PORT || 3100;

app.use(cors());
app.use(express.json({ limit: "5mb" }));

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || "postgresql://crm:crm2026miner@localhost:5432/crmminer",
});

async function q(text, params) { const { rows } = await pool.query(text, params); return rows; }
function genToken() { return crypto.randomBytes(32).toString("hex"); }
async function getUser(req) {
  const auth = req.headers.authorization;
  if (!auth?.startsWith("Bearer ")) return null;
  const rows = await q("SELECT u.* FROM sessions s JOIN users u ON s.user_id = u.id WHERE s.token = $1 AND s.expires_at > now()", [auth.slice(7)]);
  return rows[0] || null;
}
function requireAuth(handler) {
  return async (req, res) => {
    req.user = await getUser(req);
    if (!req.user) return res.status(401).json({ error: "Not authenticated" });
    return handler(req, res);
  };
}

// ── Health ───────────────────────────────────────────────────────────────────
app.get("/api/health", async (req, res) => {
  try {
    const [{ count: users }] = await q("SELECT COUNT(*) as count FROM users");
    const [{ count: clientes }] = await q("SELECT COUNT(*) as count FROM clientes");
    const [{ count: pedidos }] = await q("SELECT COUNT(*) as count FROM pedidos");
    res.json({ status: "ok", db: "connected", users, clientes, pedidos, ts: new Date().toISOString() });
  } catch (e) { res.status(500).json({ status: "error", error: e.message }); }
});

// ── Auth ─────────────────────────────────────────────────────────────────────
app.post("/api/auth/login", async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ error: "email and password required" });
    const users = await q("SELECT * FROM users WHERE email = $1 AND status = 'ativo'", [email.trim().toLowerCase()]);
    if (!users.length) return res.status(401).json({ error: "Email ou senha incorretos" });
    const user = users[0];
    const [{ ok }] = await q("SELECT crypt($1, $2) = $2 AS ok", [password, user.password_hash]);
    if (!ok) return res.status(401).json({ error: "Email ou senha incorretos" });
    const token = genToken();
    await q("INSERT INTO sessions (user_id, token, expires_at) VALUES ($1, $2, $3)", [user.id, token, new Date(Date.now() + 7*24*3600*1000)]);
    await q("UPDATE users SET last_login = now() WHERE id = $1", [user.id]);
    let marca = null;
    if (user.marca_id) { const m = await q("SELECT * FROM marcas WHERE id = $1", [user.marca_id]); marca = m[0] || null; }
    res.json({ token, user: { id: user.id, email: user.email, nome: user.nome, role: user.role, marca_id: user.marca_id, marca, loja: user.loja } });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.get("/api/auth/me", requireAuth(async (req, res) => {
  const u = req.user;
  let marca = null;
  if (u.marca_id) { const m = await q("SELECT * FROM marcas WHERE id = $1", [u.marca_id]); marca = m[0] || null; }
  res.json({ user: { id: u.id, email: u.email, nome: u.nome, role: u.role, marca_id: u.marca_id, marca, loja: u.loja } });
}));

app.post("/api/auth/logout", async (req, res) => {
  const auth = req.headers.authorization;
  if (auth?.startsWith("Bearer ")) await q("DELETE FROM sessions WHERE token = $1", [auth.slice(7)]);
  res.json({ ok: true });
});

// ── Stats Dashboard ──────────────────────────────────────────────────────────
app.get("/api/stats", requireAuth(async (req, res) => {
  const marcaId = req.user.marca_id;
  const w = marcaId ? "WHERE marca_id = $1" : "";
  const wa = marcaId ? "WHERE marca_id = $1 AND status = 'aprovado'" : "WHERE status = 'aprovado'";
  const p = marcaId ? [marcaId] : [];

  const [cli] = await q(`SELECT COUNT(*) as n FROM clientes ${w}`, p);
  const [ped] = await q(`SELECT COUNT(*) as n, COALESCE(SUM(valor),0) as r FROM pedidos ${wa}`, p);
  const [tm] = await q(`SELECT COALESCE(AVG(valor),0) as v FROM pedidos ${wa}`, p);
  const rfm = await q(`SELECT segmento_rfm as seg, COUNT(*) as n FROM clientes ${w} GROUP BY segmento_rfm`, p);

  // Top clientes
  const top = await q(`SELECT nome, email, receita_total, total_pedidos, segmento_rfm, recencia_dias FROM clientes ${w} ORDER BY receita_total DESC LIMIT 10`, p);

  // Pedidos por mês (últimos 6)
  const porMes = await q(`
    SELECT TO_CHAR(created_at, 'YYYY-MM') as mes, COUNT(*) as n, COALESCE(SUM(valor),0) as v
    FROM pedidos ${wa} GROUP BY mes ORDER BY mes DESC LIMIT 6
  `, p);

  res.json({
    clientes: +cli.n, pedidos: +ped.n, receita: +ped.r, ticket_medio: +tm.v,
    rfm: Object.fromEntries(rfm.map(r => [r.seg, +r.n])),
    top_clientes: top,
    pedidos_por_mes: porMes.reverse(),
  });
}));

// ── Cliente detail + timeline ────────────────────────────────────────────────
app.get("/api/clientes/:id", requireAuth(async (req, res) => {
  const [cli] = await q("SELECT * FROM clientes WHERE id = $1", [req.params.id]);
  if (!cli) return res.status(404).json({ error: "Not found" });
  const pedidos = await q("SELECT * FROM pedidos WHERE cliente_id = $1 ORDER BY created_at DESC LIMIT 20", [req.params.id]);
  const timeline = await q("SELECT * FROM timeline WHERE cliente_id = $1 ORDER BY created_at DESC LIMIT 50", [req.params.id]);
  const mensagens = await q("SELECT * FROM mensagens WHERE cliente_id = $1 ORDER BY created_at DESC LIMIT 20", [req.params.id]);
  res.json({ cliente: cli, pedidos, timeline, mensagens });
}));

// ── Generic CRUD ─────────────────────────────────────────────────────────────
const TABLES = ["clientes","pedidos","campanhas","tarefas","timeline","mensagens","conexoes_externas","marcas"];

// GET list
app.get("/api/data/:table", requireAuth(async (req, res) => {
  const { table } = req.params;
  if (!TABLES.includes(table)) return res.status(400).json({ error: "Invalid table" });
  const { limit = "50", offset = "0", segmento_rfm, search, status: filterStatus, order_by } = req.query;
  const isMiner = req.user.role === "miner";
  const marcaId = req.user.marca_id;
  const params = []; const conds = [];

  if (table !== "marcas" && !isMiner && marcaId) { conds.push(`marca_id = $${params.length+1}`); params.push(marcaId); }
  if (segmento_rfm) { conds.push(`segmento_rfm = $${params.length+1}`); params.push(segmento_rfm); }
  if (filterStatus) { conds.push(`status = $${params.length+1}`); params.push(filterStatus); }
  if (search && (table === "clientes" || table === "campanhas")) {
    conds.push(`(nome ILIKE $${params.length+1} OR COALESCE(email,'') ILIKE $${params.length+1})`);
    params.push(`%${search}%`);
  }

  let sql = `SELECT * FROM ${table}`;
  if (conds.length) sql += " WHERE " + conds.join(" AND ");
  sql += ` ORDER BY ${order_by || "created_at"} DESC`;
  sql += ` LIMIT $${params.length+1} OFFSET $${params.length+2}`;
  params.push(+limit, +offset);
  const rows = await q(sql, params);

  let countSql = `SELECT COUNT(*) as n FROM ${table}`;
  if (conds.length) countSql += " WHERE " + conds.join(" AND ");
  const [{ n }] = await q(countSql, params.slice(0, -2));
  res.json({ data: rows, total: +n });
}));

// POST create
app.post("/api/data/:table", requireAuth(async (req, res) => {
  const { table } = req.params;
  if (!TABLES.includes(table)) return res.status(400).json({ error: "Invalid table" });
  const record = { ...req.body };
  if (req.user.role !== "miner" && req.user.marca_id && table !== "marcas") record.marca_id = req.user.marca_id;
  const keys = Object.keys(record);
  const vals = Object.values(record);
  const sql = `INSERT INTO ${table} (${keys.join(",")}) VALUES (${keys.map((_,i)=>`$${i+1}`).join(",")}) RETURNING *`;
  const rows = await q(sql, vals);

  // Se criou tarefa ou campanha, adicionar na timeline
  if (table === "tarefas" && record.cliente_id) {
    await q("INSERT INTO timeline (marca_id, cliente_id, tipo, titulo) VALUES ($1,$2,'tarefa',$3)", [record.marca_id, record.cliente_id, record.titulo]);
  }
  res.status(201).json({ data: rows[0] });
}));

// PATCH update
app.patch("/api/data/:table", requireAuth(async (req, res) => {
  const { table, id } = req.query;
  if (!id) return res.status(400).json({ error: "id required" });
  if (!TABLES.includes(table)) return res.status(400).json({ error: "Invalid table" });
  const changes = { ...req.body }; delete changes.id; delete changes.created_at;
  const keys = Object.keys(changes);
  if (!keys.length) return res.status(400).json({ error: "No fields" });
  const sets = keys.map((k,i)=>`${k}=$${i+1}`).join(",");
  const vals = [...Object.values(changes), id];
  let sql = `UPDATE ${table} SET ${sets} WHERE id = $${vals.length}`;
  if (req.user.role !== "miner" && req.user.marca_id && table !== "marcas") { sql += ` AND marca_id = $${vals.length+1}`; vals.push(req.user.marca_id); }
  sql += " RETURNING *";
  const rows = await q(sql, vals);
  res.json({ data: rows[0] });
}));

// Also support PATCH on /api/data/:table?id=xxx via params
app.patch("/api/data/:table/:id", requireAuth(async (req, res) => {
  const { table, id } = req.params;
  if (!TABLES.includes(table)) return res.status(400).json({ error: "Invalid table" });
  const changes = { ...req.body }; delete changes.id; delete changes.created_at;
  const keys = Object.keys(changes);
  if (!keys.length) return res.status(400).json({ error: "No fields" });
  const sets = keys.map((k,i)=>`${k}=$${i+1}`).join(",");
  const vals = [...Object.values(changes), id];
  let sql = `UPDATE ${table} SET ${sets} WHERE id = $${vals.length}`;
  if (req.user.role !== "miner" && req.user.marca_id && table !== "marcas") { sql += ` AND marca_id = $${vals.length+1}`; vals.push(req.user.marca_id); }
  sql += " RETURNING *";
  const rows = await q(sql, vals);
  res.json({ data: rows[0] });
}));

// DELETE
app.delete("/api/data/:table/:id", requireAuth(async (req, res) => {
  const { table, id } = req.params;
  if (!TABLES.includes(table)) return res.status(400).json({ error: "Invalid table" });
  const vals = [id];
  let sql = `DELETE FROM ${table} WHERE id = $1`;
  if (req.user.role !== "miner" && req.user.marca_id && table !== "marcas") { sql += " AND marca_id = $2"; vals.push(req.user.marca_id); }
  sql += " RETURNING id";
  const rows = await q(sql, vals);
  res.json({ deleted: rows.length > 0 });
}));

// ── Start ────────────────────────────────────────────────────────────────────
app.listen(PORT, "0.0.0.0", () => console.log(`🚀 CRM Miner API v2 on port ${PORT}`));
