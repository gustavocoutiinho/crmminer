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

// ── Google Login ─────────────────────────────────────────────────────────────
app.post("/api/auth/google", async (req, res) => {
  try {
    const { credential } = req.body;
    if (!credential) return res.status(400).json({ error: "credential required" });
    // Decode JWT payload (base64url)
    const parts = credential.split(".");
    if (parts.length !== 3) return res.status(400).json({ error: "Invalid credential format" });
    const payload = JSON.parse(Buffer.from(parts[1].replace(/-/g, "+").replace(/_/g, "/"), "base64").toString());
    const email = payload.email?.toLowerCase();
    const nome = payload.name || payload.given_name || email?.split("@")[0] || "Usuário Google";
    if (!email) return res.status(400).json({ error: "Email not found in credential" });

    // Check if user exists
    let users = await q("SELECT * FROM users WHERE email = $1", [email]);
    let user;
    if (users.length) {
      user = users[0];
      if (user.status !== "ativo") return res.status(401).json({ error: "Conta desativada" });
    } else {
      // Create user with random password
      const randomPwd = crypto.randomBytes(24).toString("hex");
      const [hash] = await q("SELECT crypt($1, gen_salt('bf')) as h", [randomPwd]);
      const rows = await q(
        "INSERT INTO users (email, password_hash, nome, role, status) VALUES ($1,$2,$3,'vendedor','ativo') RETURNING *",
        [email, hash.h, nome]
      );
      user = rows[0];
    }

    const token = genToken();
    await q("INSERT INTO sessions (user_id, token, expires_at) VALUES ($1, $2, $3)", [user.id, token, new Date(Date.now() + 7*24*3600*1000)]);
    await q("UPDATE users SET last_login = now() WHERE id = $1", [user.id]);

    let marca = null;
    if (user.marca_id) { const m = await q("SELECT * FROM marcas WHERE id = $1", [user.marca_id]); marca = m[0] || null; }
    res.json({ token, user: { id: user.id, email: user.email, nome: user.nome, role: user.role, marca_id: user.marca_id, marca, loja: user.loja } });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ── Registration ─────────────────────────────────────────────────────────────
app.post("/api/auth/register", async (req, res) => {
  try {
    const { nome, email, password } = req.body;
    if (!nome || !email || !password) return res.status(400).json({ error: "nome, email e senha são obrigatórios" });
    if (password.length < 6) return res.status(400).json({ error: "Senha deve ter pelo menos 6 caracteres" });

    const existing = await q("SELECT id FROM users WHERE email = $1", [email.trim().toLowerCase()]);
    if (existing.length) return res.status(409).json({ error: "Email já cadastrado" });

    const [hash] = await q("SELECT crypt($1, gen_salt('bf')) as h", [password]);
    const rows = await q(
      "INSERT INTO users (email, password_hash, nome, role, status) VALUES ($1,$2,$3,'vendedor','ativo') RETURNING *",
      [email.trim().toLowerCase(), hash.h, nome.trim()]
    );
    const user = rows[0];

    const token = genToken();
    await q("INSERT INTO sessions (user_id, token, expires_at) VALUES ($1, $2, $3)", [user.id, token, new Date(Date.now() + 7*24*3600*1000)]);
    await q("UPDATE users SET last_login = now() WHERE id = $1", [user.id]);

    res.json({ token, user: { id: user.id, email: user.email, nome: user.nome, role: user.role, marca_id: user.marca_id, marca: null, loja: user.loja } });
  } catch (e) { res.status(500).json({ error: e.message }); }
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

  // Equipe stats
  const equipeW = marcaId ? "WHERE marca_id = $1" : "";
  const equipeAll = await q(`SELECT COUNT(*) as total FROM users ${equipeW}`, p);
  const equipeAtivos = await q(`SELECT COUNT(*) as n FROM users ${equipeW ? equipeW + " AND status = 'ativo'" : "WHERE status = 'ativo'"}`, p);

  // Agenda stats (hoje)
  const today = new Date().toISOString().slice(0,10);
  const agendaW = marcaId ? "WHERE marca_id = $1" : "";
  const agPendentes = await q(`SELECT COUNT(*) as n FROM agenda ${agendaW ? agendaW + ` AND status = 'pendente' AND data_inicio::date = '${today}'` : `WHERE status = 'pendente' AND data_inicio::date = '${today}'`}`, p);
  const agAtrasados = await q(`SELECT COUNT(*) as n FROM agenda ${agendaW ? agendaW + ` AND status = 'pendente' AND data_inicio < now()` : `WHERE status = 'pendente' AND data_inicio < now()`}`, p);

  // Tarefas pendentes
  const tarW = marcaId ? "WHERE marca_id = $1 AND concluida = false" : "WHERE concluida = false";
  const [tarPend] = await q(`SELECT COUNT(*) as n FROM tarefas ${tarW}`, p);

  // RFM com keys em português E inglês pra compatibilidade
  const rfmMap = Object.fromEntries(rfm.map(r => [r.seg, +r.n]));
  rfmMap.at_risk = rfmMap.em_risco || 0;
  rfmMap.hibernating = rfmMap.inativo || 0;
  rfmMap.champion = rfmMap.campiao || 0;
  rfmMap.loyal = rfmMap.fiel || 0;
  rfmMap.potential = rfmMap.potencial || 0;

  res.json({
    clientes: +cli.n, pedidos: +ped.n, receita: +ped.r, ticket_medio: +tm.v,
    rfm: rfmMap,
    top_clientes: top,
    pedidos_por_mes: porMes.reverse(),
    equipe: { total: +equipeAll[0].total, ativos: +equipeAtivos[0].n },
    agenda: { pendentes: +agPendentes[0].n, atrasados: +agAtrasados[0].n },
    tarefas_pendentes: +tarPend.n,
  });
}));

// ── Cliente detail + timeline ────────────────────────────────────────────────
app.get("/api/clientes/:id", requireAuth(async (req, res) => {
  const marcaId = req.user.marca_id;
  const [cli] = marcaId
    ? await q("SELECT * FROM clientes WHERE id = $1 AND marca_id = $2", [req.params.id, marcaId])
    : await q("SELECT * FROM clientes WHERE id = $1", [req.params.id]);
  if (!cli) return res.status(404).json({ error: "Not found" });
  const pedidos = await q("SELECT * FROM pedidos WHERE cliente_id = $1 ORDER BY created_at DESC LIMIT 20", [req.params.id]);
  const pedidosWithItems = await Promise.all(pedidos.map(async (p) => {
    const itens = await q("SELECT * FROM pedido_itens WHERE pedido_id = $1 ORDER BY created_at", [p.id]);
    return { ...p, itens };
  }));
  const timeline = await q("SELECT * FROM timeline WHERE cliente_id = $1 ORDER BY created_at DESC LIMIT 50", [req.params.id]);
  const mensagens = await q("SELECT * FROM mensagens WHERE cliente_id = $1 ORDER BY created_at DESC LIMIT 20", [req.params.id]);
  res.json({ cliente: cli, pedidos: pedidosWithItems, timeline, mensagens });
}));

// ── Add timeline entry ───────────────────────────────────────────────────────
app.post("/api/clientes/:id/timeline", requireAuth(async (req, res) => {
  const { tipo, titulo, descricao } = req.body;
  if (!titulo) return res.status(400).json({ error: "Título obrigatório" });
  const marcaId = req.user.marca_id;
  const [cli] = marcaId
    ? await q("SELECT marca_id FROM clientes WHERE id = $1 AND marca_id = $2", [req.params.id, marcaId])
    : await q("SELECT marca_id FROM clientes WHERE id = $1", [req.params.id]);
  if (!cli) return res.status(404).json({ error: "Cliente não encontrado" });
  const [entry] = await q(
    "INSERT INTO timeline (marca_id, cliente_id, tipo, titulo, descricao) VALUES ($1,$2,$3,$4,$5) RETURNING *",
    [cli.marca_id, req.params.id, tipo || "nota", titulo, descricao || null]
  );
  res.json({ data: entry });
}));

// ── Generic CRUD ─────────────────────────────────────────────────────────────
const TABLES = ["clientes","pedidos","campanhas","tarefas","timeline","mensagens","conexoes_externas","marcas","automacoes","automacao_execucoes","users","fidelidade","pipeline","segmentos","agenda","qrcodes","indicacoes","respostas_rapidas","metas","lojas","tags","inbox","permissoes","campanhas_sugeridas","integracoes","activity_log","notificacoes","sync_logs","templates_mensagem"];

// GET list
app.get("/api/data/:table", requireAuth(async (req, res) => {
  const { table } = req.params;
  if (!TABLES.includes(table)) return res.status(400).json({ error: "Invalid table" });
  // Restrict users table to admin roles
  if (table === "users" && !["miner","admin","gerente"].includes(req.user.role)) {
    return res.status(403).json({ error: "Sem permissão" });
  }
  const selectCols = table === "users"
    ? "id, nome, email, role, loja, status, meta_mensal, avatar_url, last_login, created_at, marca_id"
    : "*";
  const { limit = "50", offset = "0", segmento_rfm, search, status: filterStatus, order_by, order_dir, tag } = req.query;
  const isMiner = req.user.role === "miner";
  const marcaId = req.user.marca_id;
  const params = []; const conds = [];

  if (table !== "marcas" && !isMiner && marcaId) { conds.push(`marca_id = $${params.length+1}`); params.push(marcaId); }
  if (segmento_rfm) { conds.push(`segmento_rfm = $${params.length+1}`); params.push(segmento_rfm); }
  if (filterStatus) { conds.push(`status = $${params.length+1}`); params.push(filterStatus); }
  if (tag && table === "clientes") { conds.push(`$${params.length+1} = ANY(tags)`); params.push(tag); }
  if (search && (table === "clientes" || table === "campanhas")) {
    conds.push(`(nome ILIKE $${params.length+1} OR COALESCE(email,'') ILIKE $${params.length+1})`);
    params.push(`%${search}%`);
  }

  let sql = `SELECT ${selectCols} FROM ${table}`;
  if (conds.length) sql += " WHERE " + conds.join(" AND ");
  const validDir = order_dir && order_dir.toLowerCase() === "asc" ? "ASC" : "DESC";
  const validOrderCols = ["created_at","nome","email","segmento_rfm","recencia_dias","total_pedidos","receita_total","status","updated_at"];
  const orderCol = order_by && validOrderCols.includes(order_by) ? order_by : "created_at";
  sql += ` ORDER BY ${orderCol} ${validDir}`;
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

// ── Advanced Stats ───────────────────────────────────────────────────────────
app.get("/api/stats/advanced", requireAuth(async (req, res) => {
  const marcaId = req.user.marca_id;
  const p = marcaId ? [marcaId] : [];
  const w = marcaId ? "WHERE marca_id = $1" : "";
  const wa = marcaId ? "WHERE marca_id = $1 AND status = 'aprovado'" : "WHERE status = 'aprovado'";

  // LTV médio (receita_total média dos clientes com pedidos)
  const [ltv] = await q(`SELECT COALESCE(AVG(receita_total),0) as avg_ltv, COALESCE(MAX(receita_total),0) as max_ltv FROM clientes ${w} ${w ? "AND" : "WHERE"} total_pedidos > 0`, p);

  // Taxa de recompra (clientes com >1 pedido / clientes com >=1 pedido)
  const [recompra] = await q(`SELECT 
    COUNT(*) FILTER (WHERE total_pedidos > 1) as recompradores,
    COUNT(*) FILTER (WHERE total_pedidos >= 1) as compradores
    FROM clientes ${w}`, p);
  const taxaRecompra = +recompra.compradores > 0 ? (+recompra.recompradores / +recompra.compradores * 100).toFixed(1) : 0;

  // Clientes em risco (recencia > 60 dias, com compras)
  const [risco] = await q(`SELECT COUNT(*) as n FROM clientes ${w} ${w ? "AND" : "WHERE"} recencia_dias > 60 AND total_pedidos > 0`, p);

  // Novos clientes últimos 30 dias
  const [novos30] = await q(`SELECT COUNT(*) as n FROM clientes ${w} ${w ? "AND" : "WHERE"} created_at > now() - interval '30 days'`, p);

  // Receita últimos 30 dias vs 30 anteriores
  const [rec30] = await q(`SELECT COALESCE(SUM(valor),0) as v FROM pedidos ${wa} ${wa.includes("AND") ? "AND" : wa ? "AND" : "WHERE"} created_at > now() - interval '30 days'`, p);
  const [rec60] = await q(`SELECT COALESCE(SUM(valor),0) as v FROM pedidos ${wa} ${wa.includes("AND") ? "AND" : wa ? "AND" : "WHERE"} created_at BETWEEN now() - interval '60 days' AND now() - interval '30 days'`, p);

  // Pedidos por canal (origem)
  const porCanal = await q(`SELECT COALESCE(origem,'shopify') as canal, COUNT(*) as n, COALESCE(SUM(valor),0) as v FROM pedidos ${wa} GROUP BY COALESCE(origem,'shopify') ORDER BY v DESC`, p);

  // Top segmentos RFM por receita
  const rfmReceita = await q(`SELECT segmento_rfm as seg, COUNT(*) as n, COALESCE(SUM(receita_total),0) as receita, COALESCE(AVG(receita_total),0) as ticket FROM clientes ${w} ${w ? "AND" : "WHERE"} segmento_rfm IS NOT NULL GROUP BY segmento_rfm ORDER BY receita DESC`, p);

  // Cohort simples: clientes por mês de cadastro
  const cohort = await q(`SELECT TO_CHAR(created_at, 'YYYY-MM') as mes, COUNT(*) as n FROM clientes ${w} GROUP BY mes ORDER BY mes DESC LIMIT 12`, p);

  // Receita mensal (últimos 12 meses)
  const receitaMensal = await q(`SELECT TO_CHAR(created_at, 'YYYY-MM') as mes, COUNT(*) as pedidos, COALESCE(SUM(valor),0) as receita FROM pedidos ${wa} ${wa.includes("WHERE") ? "AND" : "WHERE"} created_at > now() - interval '12 months' GROUP BY mes ORDER BY mes`, p);

  // RFM evolution (segmentos por mês)
  const rfmEvolution = await q(`SELECT TO_CHAR(created_at, 'YYYY-MM') as mes, segmento_rfm as seg, COUNT(*) as n FROM clientes ${w} ${w ? "AND" : "WHERE"} segmento_rfm IS NOT NULL GROUP BY mes, seg ORDER BY mes`, p);

  res.json({
    ltv_medio: +ltv.avg_ltv,
    ltv_maximo: +ltv.max_ltv,
    taxa_recompra: +taxaRecompra,
    clientes_risco: +risco.n,
    novos_30d: +novos30.n,
    receita_30d: +rec30.v,
    receita_60d_anterior: +rec60.v,
    crescimento_receita: +rec60.v > 0 ? (((+rec30.v - +rec60.v) / +rec60.v) * 100).toFixed(1) : 0,
    por_canal: porCanal,
    rfm_receita: rfmReceita,
    cohort: cohort.reverse(),
    receita_mensal: receitaMensal,
    rfm_evolution: rfmEvolution,
  });
}));

// ── RFM Recalculate ──────────────────────────────────────────────────────────
app.post("/api/rfm/recalculate", requireAuth(async (req, res) => {
  if (req.user.role !== "miner" && req.user.role !== "admin") {
    return res.status(403).json({ error: "Sem permissão" });
  }
  const marcaId = req.user.marca_id;
  const w = marcaId ? "WHERE marca_id = $1" : "";
  const p = marcaId ? [marcaId] : [];

  // Get all clients with orders
  const clientes = await q(`SELECT id, recencia_dias, total_pedidos, receita_total FROM clientes ${w}`, p);
  if (!clientes.length) return res.json({ updated: 0 });

  // Calculate RFM scores using quintiles
  const sorted = (arr, key) => [...arr].sort((a, b) => a[key] - b[key]);
  const quintile = (arr, key, id) => {
    const s = sorted(arr.filter(x => x[key] != null), key);
    const idx = s.findIndex(x => x.id === id);
    if (idx === -1) return 3;
    return Math.min(5, Math.floor(idx / s.length * 5) + 1);
  };

  let updated = 0;
  for (const c of clientes) {
    const r = 6 - quintile(clientes, "recencia_dias", c.id); // lower recency = higher score
    const f = quintile(clientes, "total_pedidos", c.id);
    const m = quintile(clientes, "receita_total", c.id);
    const avg = (r + f + m) / 3;

    let seg;
    if (avg >= 4.5) seg = "campiao";
    else if (avg >= 3.5) seg = "fiel";
    else if (r <= 2 && f >= 3) seg = "em_risco";
    else if (r <= 2 && f <= 2 && m <= 2) seg = "inativo";
    else seg = "potencial";

    await q("UPDATE clientes SET segmento_rfm = $1 WHERE id = $2", [seg, c.id]);
    updated++;
  }

  res.json({ updated, segments: await q(`SELECT segmento_rfm as seg, COUNT(*) as n FROM clientes ${w} GROUP BY segmento_rfm ORDER BY n DESC`, p) });
}));

// ── Shopify Sync via API ─────────────────────────────────────────────────────
app.post("/api/sync/shopify", requireAuth(async (req, res) => {
  if (req.user.role !== "miner" && req.user.role !== "admin") {
    return res.status(403).json({ error: "Sem permissão" });
  }
  const SHOPIFY_STORE = process.env.SHOPIFY_PRLS_STORE || process.env.SHOPIFY_STORE || "prlsteste.myshopify.com";
  const SHOPIFY_TOKEN = process.env.SHOPIFY_PRLS_TOKEN || process.env.SHOPIFY_ACCESS_TOKEN || "";
  if (!SHOPIFY_TOKEN) return res.status(400).json({ error: "Shopify token não configurado" });

  const marcaId = req.user.marca_id || req.body.marca_id;
  if (!marcaId) return res.status(400).json({ error: "marca_id required" });

  const startTime = Date.now();
  // Create sync log entry
  const [logEntry] = await q(
    `INSERT INTO sync_logs (marca_id, tipo, status) VALUES ($1, 'shopify', 'running') RETURNING *`,
    [marcaId]
  );
  const logId = logEntry.id;

  try {
    const shopFetch = async (endpoint) => {
      const r = await fetch(`https://${SHOPIFY_STORE}${endpoint}`, { headers: { "X-Shopify-Access-Token": SHOPIFY_TOKEN } });
      if (!r.ok) throw new Error(`Shopify ${r.status}: ${await r.text()}`);
      return r.json();
    };

    let clientesNovos = 0, clientesAtualizados = 0, pedidosNovos = 0, pedidosAtualizados = 0, erros = 0;
    const errorDetails = [];

    // Sync customers (max 5 pages = 1250 clientes por sync pra evitar timeout)
    const MAX_PAGES = 5;
    const TIMEOUT_LIMIT = 240000; // 240s safety margin
    let sinceId = 0;
    for (let page = 0; page < MAX_PAGES; page++) {
      if (Date.now() - startTime > TIMEOUT_LIMIT) break;
      try {
        const data = await shopFetch(`/admin/api/2024-01/customers.json?limit=250&since_id=${sinceId}`);
        const customers = data.customers || [];
        if (!customers.length) break;
        for (const c of customers) {
          try {
            // Só importar clientes que compraram
            if (!c.orders_count || c.orders_count === 0) continue;
            const nome = [c.first_name, c.last_name].filter(Boolean).join(" ") || c.email?.split("@")[0] || "Sem nome";
            const lastOrder = c.last_order_date ? new Date(c.last_order_date) : null;
            const recDias = lastOrder ? Math.floor((Date.now() - lastOrder) / 86400000) : 999;
            const result = await q(`INSERT INTO clientes (marca_id, shopify_id, nome, email, telefone, recencia_dias, total_pedidos, receita_total, created_at)
              VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) ON CONFLICT (marca_id, shopify_id) DO UPDATE SET
              nome=EXCLUDED.nome, email=EXCLUDED.email, telefone=EXCLUDED.telefone,
              recencia_dias=EXCLUDED.recencia_dias, total_pedidos=EXCLUDED.total_pedidos,
              receita_total=EXCLUDED.receita_total, updated_at=now() RETURNING (xmax = 0) AS is_new`,
              [marcaId, c.id, nome, c.email, c.phone, recDias, c.orders_count || 0, parseFloat(c.total_spent) || 0, c.created_at]);
            if (result[0]?.is_new) clientesNovos++; else clientesAtualizados++;
          } catch (e) {
            erros++;
            if (errorDetails.length < 10) errorDetails.push({ type: "customer", id: c.id, error: e.message });
          }
        }
        sinceId = customers[customers.length - 1].id;
        if (customers.length < 250) break;
      } catch (e) {
        erros++;
        if (errorDetails.length < 10) errorDetails.push({ type: "customer_page", page, error: e.message });
        break;
      }
    }

    // Sync orders (max 5 pages = 1250 pedidos por sync)
    sinceId = 0;
    for (let page = 0; page < MAX_PAGES; page++) {
      if (Date.now() - startTime > TIMEOUT_LIMIT) break;
      try {
        const data = await shopFetch(`/admin/api/2024-01/orders.json?limit=250&status=any&since_id=${sinceId}`);
        const orders = data.orders || [];
        if (!orders.length) break;
        for (const o of orders) {
          try {
            let clienteId = null;
            if (o.customer?.id) {
              const { rows } = await pool.query("SELECT id FROM clientes WHERE shopify_id = $1 AND marca_id = $2 LIMIT 1", [o.customer.id, marcaId]);
              clienteId = rows[0]?.id || null;
            }
            const status = o.financial_status === "paid" ? "aprovado" : o.cancelled_at ? "cancelado" : "pendente";
            const result = await q(`INSERT INTO pedidos (marca_id, shopify_id, cliente_id, valor, status, origem, created_at)
              VALUES ($1,$2,$3,$4,$5,'shopify',$6) ON CONFLICT (marca_id, shopify_id) DO UPDATE SET
              cliente_id=EXCLUDED.cliente_id, valor=EXCLUDED.valor, status=EXCLUDED.status, updated_at=now() RETURNING id, (xmax = 0) AS is_new`,
              [marcaId, o.id, clienteId, parseFloat(o.total_price) || 0, status, o.created_at]);
            if (result[0]?.is_new) pedidosNovos++; else pedidosAtualizados++;
            // Save line items
            if (o.line_items && result[0]?.id) {
              for (const item of o.line_items) {
                await q(`INSERT INTO pedido_itens (pedido_id, produto_nome, produto_id, variante, quantidade, preco)
                  VALUES ($1,$2,$3,$4,$5,$6) ON CONFLICT (pedido_id, produto_id, variante) WHERE produto_id IS NOT NULL DO NOTHING`,
                  [result[0].id, item.title, item.product_id, item.variant_title, item.quantity, parseFloat(item.price) || 0]);
              }
            }
          } catch (e) {
            erros++;
            if (errorDetails.length < 10) errorDetails.push({ type: "order", id: o.id, error: e.message });
          }
        }
        sinceId = orders[orders.length - 1].id;
        if (orders.length < 250) break;
      } catch (e) {
        erros++;
        if (errorDetails.length < 10) errorDetails.push({ type: "order_page", page, error: e.message });
        break;
      }
    }

    const duracao = Date.now() - startTime;
    const finalStatus = erros > 0 && (clientesNovos + clientesAtualizados + pedidosNovos + pedidosAtualizados) > 0 ? "partial" : erros > 0 ? "error" : "success";

    // Update sync log
    const [updatedLog] = await q(
      `UPDATE sync_logs SET status=$1, clientes_novos=$2, clientes_atualizados=$3, pedidos_novos=$4, pedidos_atualizados=$5, erros=$6, detalhes=$7, duracao_ms=$8 WHERE id=$9 RETURNING *`,
      [finalStatus, clientesNovos, clientesAtualizados, pedidosNovos, pedidosAtualizados, erros, JSON.stringify({ errors: errorDetails }), duracao, logId]
    );

    // Update ultimo_sync on conexoes_externas
    await q(`UPDATE conexoes_externas SET ultimo_sync=now(), status=$1 WHERE marca_id=$2 AND tipo='shopify'`,
      [finalStatus === "error" ? "erro" : "conectado", marcaId]).catch(() => {});

    res.json({ ok: true, sync_log: updatedLog });
  } catch (e) {
    const duracao = Date.now() - startTime;
    const [updatedLog] = await q(
      `UPDATE sync_logs SET status='error', erros=1, detalhes=$1, duracao_ms=$2 WHERE id=$3 RETURNING *`,
      [JSON.stringify({ errors: [{ type: "fatal", error: e.message }] }), duracao, logId]
    );
    await q(`UPDATE conexoes_externas SET status='erro' WHERE marca_id=$1 AND tipo='shopify'`, [marcaId]).catch(() => {});
    res.status(500).json({ error: e.message, sync_log: updatedLog });
  }
}));

// ── Sync Olist ───────────────────────────────────────────────────────────────
app.post("/api/sync/olist", requireAuth(async (req, res) => {
  if (!["miner","admin"].includes(req.user.role)) return res.status(403).json({ error: "Sem permissão" });
  const marcaId = req.body.marca_id || req.user.marca_id;
  if (!marcaId) return res.status(400).json({ error: "marca_id required" });

  const [integ] = await q("SELECT * FROM integracoes WHERE marca_id=$1 AND tipo='olist'", [marcaId]);
  if (!integ?.config?.api_key) return res.status(400).json({ error: "Olist não configurado. Adicione API Key e Seller ID nas integrações." });

  const { api_key, seller_id } = integ.config;
  const start = Date.now();
  const [log] = await q("INSERT INTO sync_logs (marca_id, tipo, status) VALUES ($1, 'olist', 'running') RETURNING *", [marcaId]);
  const logId = log.id;

  try {
    let clientesNovos = 0, clientesAtualizados = 0, pedidosNovos = 0, pedidosAtualizados = 0;
    const headers = { Authorization: `Bearer ${api_key}` };

    // Sync pedidos (orders)
    let nextUrl = `https://api.olist.com/v2/sellers/${seller_id}/orders?limit=50`;
    while (nextUrl) {
      const r = await fetch(nextUrl, { headers });
      if (!r.ok) break;
      const data = await r.json();
      const orders = data.results || data.data || [];

      for (const order of orders) {
        const custName = order.customer?.name || order.buyer?.name || "Cliente Olist";
        const custEmail = order.customer?.email || order.buyer?.email || null;
        const custPhone = order.customer?.phone || order.buyer?.phone || null;
        const valor = parseFloat(order.total_amount || order.total || 0);

        // Upsert cliente
        const [existing] = await q("SELECT id FROM clientes WHERE marca_id=$1 AND email=$2 LIMIT 1", [marcaId, custEmail]);
        let clienteId;
        if (existing) {
          clienteId = existing.id;
          await q("UPDATE clientes SET total_pedidos=total_pedidos+1, receita_total=receita_total+$1, updated_at=now() WHERE id=$2", [valor, clienteId]);
          clientesAtualizados++;
        } else if (custEmail) {
          const [novo] = await q("INSERT INTO clientes (marca_id, nome, email, telefone, total_pedidos, receita_total) VALUES ($1,$2,$3,$4,1,$5) RETURNING id",
            [marcaId, custName, custEmail, custPhone, valor]);
          clienteId = novo.id;
          clientesNovos++;
        }

        // Upsert pedido
        const orderId = String(order.id || order.order_id);
        const [existPedido] = await q("SELECT id FROM pedidos WHERE marca_id=$1 AND external_id=$2 LIMIT 1", [marcaId, orderId]);
        if (!existPedido) {
          await q("INSERT INTO pedidos (marca_id, cliente_id, valor, status, origem, external_id, created_at) VALUES ($1,$2,$3,$4,'olist',$5,$6)",
            [marcaId, clienteId, valor, order.status === "delivered" ? "entregue" : "aprovado", orderId, order.created_at || new Date().toISOString()]);
          pedidosNovos++;
        } else {
          pedidosAtualizados++;
        }
      }

      nextUrl = data.next || null;
      if (orders.length === 0) break;
    }

    const duracao = Date.now() - start;
    await q("UPDATE sync_logs SET status='success', clientes_novos=$1, clientes_atualizados=$2, pedidos_novos=$3, pedidos_atualizados=$4, duracao_ms=$5 WHERE id=$6",
      [clientesNovos, clientesAtualizados, pedidosNovos, pedidosAtualizados, duracao, logId]);
    await q("UPDATE integracoes SET status='conectado', ultimo_sync=now() WHERE id=$1", [integ.id]);

    res.json({ ok: true, clientes: { novos: clientesNovos, atualizados: clientesAtualizados }, pedidos: { novos: pedidosNovos, atualizados: pedidosAtualizados }, duracao_ms: duracao });
  } catch (e) {
    const duracao = Date.now() - start;
    await q("UPDATE sync_logs SET status='error', erros=1, detalhes=$1, duracao_ms=$2 WHERE id=$3",
      [JSON.stringify({ error: e.message }), duracao, logId]);
    await q("UPDATE integracoes SET status='erro' WHERE id=$1", [integ.id]).catch(() => {});
    res.status(500).json({ error: e.message });
  }
}));

// ── Sync Pagar.me ────────────────────────────────────────────────────────────
app.post("/api/sync/pagarme", requireAuth(async (req, res) => {
  if (!["miner","admin"].includes(req.user.role)) return res.status(403).json({ error: "Sem permissão" });
  const marcaId = req.body.marca_id || req.user.marca_id;
  if (!marcaId) return res.status(400).json({ error: "marca_id required" });

  const [integ] = await q("SELECT * FROM integracoes WHERE marca_id=$1 AND tipo='pagarme'", [marcaId]);
  if (!integ?.config?.secret_key) return res.status(400).json({ error: "Pagar.me não configurado. Adicione a Secret Key nas integrações." });

  const { secret_key } = integ.config;
  const authHeader = "Basic " + Buffer.from(secret_key + ":").toString("base64");
  const start = Date.now();
  const [log] = await q("INSERT INTO sync_logs (marca_id, tipo, status) VALUES ($1, 'pagarme', 'running') RETURNING *", [marcaId]);
  const logId = log.id;

  try {
    let clientesNovos = 0, clientesAtualizados = 0, pedidosNovos = 0, pedidosAtualizados = 0;
    let page = 1;
    let hasMore = true;

    while (hasMore) {
      const r = await fetch(`https://api.pagar.me/core/v5/orders?page=${page}&size=50`, {
        headers: { Authorization: authHeader }
      });
      if (!r.ok) break;
      const data = await r.json();
      const orders = data.data || [];

      for (const order of orders) {
        const cust = order.customer || {};
        const custName = cust.name || "Cliente Pagar.me";
        const custEmail = cust.email || null;
        const custPhone = cust.phones?.mobile_phone ? `${cust.phones.mobile_phone.area_code}${cust.phones.mobile_phone.number}` : null;
        const valor = (order.amount || 0) / 100; // Pagar.me usa centavos

        // Upsert cliente
        let clienteId = null;
        if (custEmail) {
          const [existing] = await q("SELECT id FROM clientes WHERE marca_id=$1 AND email=$2 LIMIT 1", [marcaId, custEmail]);
          if (existing) {
            clienteId = existing.id;
            clientesAtualizados++;
          } else {
            const [novo] = await q("INSERT INTO clientes (marca_id, nome, email, telefone, total_pedidos, receita_total) VALUES ($1,$2,$3,$4,1,$5) RETURNING id",
              [marcaId, custName, custEmail, custPhone, valor]);
            clienteId = novo.id;
            clientesNovos++;
          }
        }

        // Upsert pedido
        const orderId = order.id || order.code;
        const [existPedido] = await q("SELECT id FROM pedidos WHERE marca_id=$1 AND external_id=$2 LIMIT 1", [marcaId, orderId]);
        const statusMap = { paid: "aprovado", pending: "pendente", canceled: "cancelado", failed: "cancelado" };
        if (!existPedido) {
          await q("INSERT INTO pedidos (marca_id, cliente_id, valor, status, origem, external_id, created_at) VALUES ($1,$2,$3,$4,'pagarme',$5,$6)",
            [marcaId, clienteId, valor, statusMap[order.status] || "pendente", orderId, order.created_at || new Date().toISOString()]);
          pedidosNovos++;
        } else {
          await q("UPDATE pedidos SET status=$1, updated_at=now() WHERE marca_id=$2 AND external_id=$3",
            [statusMap[order.status] || "pendente", marcaId, orderId]);
          pedidosAtualizados++;
        }
      }

      hasMore = orders.length === 50;
      page++;
    }

    const duracao = Date.now() - start;
    await q("UPDATE sync_logs SET status='success', clientes_novos=$1, clientes_atualizados=$2, pedidos_novos=$3, pedidos_atualizados=$4, duracao_ms=$5 WHERE id=$6",
      [clientesNovos, clientesAtualizados, pedidosNovos, pedidosAtualizados, duracao, logId]);
    await q("UPDATE integracoes SET status='conectado', ultimo_sync=now() WHERE id=$1", [integ.id]);

    res.json({ ok: true, clientes: { novos: clientesNovos, atualizados: clientesAtualizados }, pedidos: { novos: pedidosNovos, atualizados: pedidosAtualizados }, duracao_ms: duracao });
  } catch (e) {
    const duracao = Date.now() - start;
    await q("UPDATE sync_logs SET status='error', erros=1, detalhes=$1, duracao_ms=$2 WHERE id=$3",
      [JSON.stringify({ error: e.message }), duracao, logId]);
    await q("UPDATE integracoes SET status='erro' WHERE id=$1", [integ.id]).catch(() => {});
    res.status(500).json({ error: e.message });
  }
}));

// ── Sync Logs ────────────────────────────────────────────────────────────────
app.get("/api/sync/logs", requireAuth(async (req, res) => {
  const marcaId = req.user.marca_id;
  const params = [];
  let where = "";
  if (marcaId) { params.push(marcaId); where = "WHERE marca_id = $1"; }
  params.push(20);
  const rows = await q(`SELECT * FROM sync_logs ${where} ORDER BY created_at DESC LIMIT $${params.length}`, params);
  res.json({ data: rows });
}));

// ── Users management (admin) ─────────────────────────────────────────────────
app.get("/api/users", requireAuth(async (req, res) => {
  if (!["miner","admin","gerente"].includes(req.user.role)) return res.status(403).json({ error: "Sem permissão" });
  const marcaId = req.user.marca_id;
  const params = [];
  let where = "";
  if (marcaId) { params.push(marcaId); where = "WHERE marca_id = $1"; }
  const rows = await q(`SELECT id, nome, email, role, loja, status, meta_mensal, avatar_url, last_login, created_at FROM users ${where} ORDER BY created_at`, params);
  res.json({ data: rows });
}));

app.post("/api/users", requireAuth(async (req, res) => {
  if (req.user.role !== "miner" && req.user.role !== "admin") {
    return res.status(403).json({ error: "Sem permissão" });
  }
  const { nome, email, password, role, loja, meta_mensal } = req.body;
  if (!nome || !email || !password) return res.status(400).json({ error: "nome, email, password required" });

  const existing = await q("SELECT id FROM users WHERE email = $1", [email.toLowerCase()]);
  if (existing.length) return res.status(409).json({ error: "Email já cadastrado" });

  const [hash] = await q("SELECT crypt($1, gen_salt('bf')) as h", [password]);
  const marcaId = req.user.marca_id || req.body.marca_id;

  const rows = await q(
    `INSERT INTO users (email, password_hash, nome, role, marca_id, loja, meta_mensal, status) 
     VALUES ($1,$2,$3,$4,$5,$6,$7,'ativo') RETURNING id, email, nome, role, marca_id, loja, status`,
    [email.toLowerCase(), hash.h, nome, role || "vendedor", marcaId, loja, meta_mensal || 0]
  );
  res.status(201).json({ user: rows[0] });
}));

// ── Notificações ─────────────────────────────────────────────────────────────
app.get("/api/notificacoes", requireAuth(async (req, res) => {
  const { limit = "20", offset = "0", unread, tipo } = req.query;
  const conds = ["user_id = $1"];
  const params = [req.user.id];
  if (unread === "true") { conds.push("lida = false"); }
  if (tipo) { params.push(tipo); conds.push(`tipo = $${params.length}`); }
  const where = conds.join(" AND ");
  const rows = await q(`SELECT * FROM notificacoes WHERE ${where} ORDER BY created_at DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`, [...params, +limit, +offset]);
  const [{ count: total }] = await q(`SELECT COUNT(*) as count FROM notificacoes WHERE ${where}`, params);
  const [{ count: uc }] = await q("SELECT COUNT(*) as count FROM notificacoes WHERE user_id = $1 AND lida = false", [req.user.id]);
  res.json({ data: rows, total: +total, unread_count: +uc });
}));

app.patch("/api/notificacoes/read-all", requireAuth(async (req, res) => {
  await q("UPDATE notificacoes SET lida = true WHERE user_id = $1 AND lida = false", [req.user.id]);
  res.json({ ok: true });
}));

app.patch("/api/notificacoes/:id", requireAuth(async (req, res) => {
  await q("UPDATE notificacoes SET lida = true WHERE id = $1 AND user_id = $2", [req.params.id, req.user.id]);
  res.json({ ok: true });
}));

app.delete("/api/notificacoes/:id", requireAuth(async (req, res) => {
  await q("DELETE FROM notificacoes WHERE id = $1 AND user_id = $2", [req.params.id, req.user.id]);
  res.json({ ok: true });
}));

app.delete("/api/notificacoes", requireAuth(async (req, res) => {
  await q("DELETE FROM notificacoes WHERE user_id = $1", [req.user.id]);
  res.json({ ok: true });
}));

// Helper: criar notificação
async function notify(userId, marcaId, tipo, titulo, mensagem, link) {
  await q("INSERT INTO notificacoes (marca_id, user_id, tipo, titulo, mensagem, link) VALUES ($1,$2,$3,$4,$5,$6)",
    [marcaId, userId, tipo, titulo, mensagem, link]);
}

// Helper: log de atividade
async function logActivity(req, acao, entidade, entidadeId, detalhes) {
  const user = req.user;
  await q("INSERT INTO activity_log (marca_id, user_id, user_nome, acao, entidade, entidade_id, detalhes, ip) VALUES ($1,$2,$3,$4,$5,$6,$7,$8)",
    [user.marca_id, user.id, user.nome, acao, entidade, entidadeId, JSON.stringify(detalhes || {}), req.ip]);
}

// ── Activity Log ─────────────────────────────────────────────────────────────
app.get("/api/activity", requireAuth(async (req, res) => {
  const { limit = "30", offset = "0", acao, user_id, search, from, to } = req.query;
  const marcaId = req.user.marca_id;
  const conds = [];
  const p = [];
  if (marcaId) { p.push(marcaId); conds.push(`marca_id = $${p.length}`); }
  if (acao) { p.push(acao); conds.push(`acao = $${p.length}`); }
  if (user_id) { p.push(+user_id); conds.push(`user_id = $${p.length}`); }
  if (search) { p.push(`%${search}%`); conds.push(`detalhes::text ILIKE $${p.length}`); }
  if (from) { p.push(from); conds.push(`created_at >= $${p.length}::date`); }
  if (to) { p.push(to); conds.push(`created_at < ($${p.length}::date + interval '1 day')`); }
  const w = conds.length ? "WHERE " + conds.join(" AND ") : "";
  const countRes = await q(`SELECT count(*)::int as total FROM activity_log ${w}`, p);
  const total = countRes[0]?.total || 0;
  p.push(+limit); const limIdx = p.length;
  p.push(+offset); const offIdx = p.length;
  const rows = await q(`SELECT * FROM activity_log ${w} ORDER BY created_at DESC LIMIT $${limIdx} OFFSET $${offIdx}`, p);
  res.json({ data: rows, total });
}));

// ── Busca Global ─────────────────────────────────────────────────────────────
app.get("/api/search", requireAuth(async (req, res) => {
  const { q: query, limit = "10" } = req.query;
  if (!query || query.length < 2) return res.json({ results: [] });
  const marcaId = req.user.marca_id;
  const term = `%${query}%`;
  const results = [];

  // Clientes
  const cliWhere = marcaId ? "AND marca_id = $3" : "";
  const cliParams = marcaId ? [term, +limit, marcaId] : [term, +limit];
  const clientes = await q(`SELECT id, nome, email, telefone, segmento_rfm, receita_total FROM clientes WHERE (nome ILIKE $1 OR COALESCE(email,'') ILIKE $1 OR COALESCE(telefone,'') ILIKE $1) ${cliWhere} ORDER BY receita_total DESC LIMIT $2`, cliParams);
  clientes.forEach(c => results.push({ tipo: "cliente", id: c.id, titulo: c.nome, subtitulo: c.email || c.telefone, extra: `R$ ${(+c.receita_total).toLocaleString("pt-BR")}`, segmento: c.segmento_rfm }));

  // Tarefas
  const tarWhere = marcaId ? "AND marca_id = $3" : "";
  const tarParams = marcaId ? [term, +limit, marcaId] : [term, +limit];
  const tarefas = await q(`SELECT id, titulo, tipo, concluida FROM tarefas WHERE (titulo ILIKE $1 OR COALESCE(descricao,'') ILIKE $1) ${tarWhere} ORDER BY created_at DESC LIMIT $2`, tarParams);
  tarefas.forEach(t => results.push({ tipo: "tarefa", id: t.id, titulo: t.titulo, subtitulo: t.tipo, extra: t.concluida ? "Concluída" : "Pendente" }));

  // Campanhas
  const camWhere = marcaId ? "AND marca_id = $3" : "";
  const camParams = marcaId ? [term, +limit, marcaId] : [term, +limit];
  const campanhas = await q(`SELECT id, nome, tipo, status FROM campanhas WHERE nome ILIKE $1 ${camWhere} ORDER BY created_at DESC LIMIT $2`, camParams);
  campanhas.forEach(c => results.push({ tipo: "campanha", id: c.id, titulo: c.nome, subtitulo: c.tipo, extra: c.status }));

  res.json({ results, query });
}));

// ── Webhooks (Shopify + genérico) ────────────────────────────────────────────
app.post("/api/webhook/:source", async (req, res) => {
  const { source } = req.params;
  const { marca_id } = req.query;

  try {
    if (source === "shopify") {
      const topic = req.headers["x-shopify-topic"];
      const mId = marca_id || "a0000000-0000-0000-0000-000000000001";

      if (topic === "orders/create" || topic === "orders/paid") {
        const order = req.body;
        const cust = order.customer;
        if (cust?.email) {
          const nome = [cust.first_name, cust.last_name].filter(Boolean).join(" ") || cust.email.split("@")[0];
          await q(`INSERT INTO clientes (marca_id, shopify_id, nome, email, telefone, total_pedidos, receita_total, created_at)
            VALUES ($1,$2,$3,$4,$5,1,$6,now()) ON CONFLICT (marca_id, shopify_id) DO UPDATE SET
            nome=EXCLUDED.nome, total_pedidos=clientes.total_pedidos+1, receita_total=clientes.receita_total+$6, recencia_dias=0, updated_at=now()`,
            [mId, cust.id, nome, cust.email, cust.phone, parseFloat(order.total_price) || 0]);
          
          const [cli] = await q("SELECT id FROM clientes WHERE shopify_id=$1 AND marca_id=$2", [cust.id, mId]);
          if (cli) {
            const status = order.financial_status === "paid" ? "aprovado" : "pendente";
            const pedidoRow = await q(`INSERT INTO pedidos (marca_id, shopify_id, cliente_id, valor, status, origem, created_at) VALUES ($1,$2,$3,$4,$5,'shopify',now()) ON CONFLICT (marca_id, shopify_id) DO UPDATE SET updated_at=now() RETURNING id`,
              [mId, order.id, cli.id, parseFloat(order.total_price) || 0, status]);
            // Save line items from webhook
            if (order.line_items && pedidoRow[0]?.id) {
              for (const item of order.line_items) {
                await q(`INSERT INTO pedido_itens (pedido_id, produto_nome, produto_id, variante, quantidade, preco)
                  VALUES ($1,$2,$3,$4,$5,$6) ON CONFLICT (pedido_id, produto_id, variante) WHERE produto_id IS NOT NULL DO NOTHING`,
                  [pedidoRow[0].id, item.title, item.product_id, item.variant_title, item.quantity, parseFloat(item.price) || 0]);
              }
            }
            // Timeline
            await q("INSERT INTO timeline (marca_id, cliente_id, tipo, titulo, metadata) VALUES ($1,$2,'pedido',$3,$4)",
              [mId, cli.id, `Pedido #${order.order_number} - R$ ${order.total_price}`, JSON.stringify({shopify_order_id: order.id, valor: order.total_price})]);
          }
        }
        return res.json({ ok: true, action: "order_processed" });
      }

      if (topic === "checkouts/create" || topic === "checkouts/update") {
        // Carrinho — registra pra automação de carrinho abandonado
        const checkout = req.body;
        if (checkout.email) {
          await q("INSERT INTO timeline (marca_id, tipo, titulo, metadata) VALUES ($1,'carrinho',$2,$3)",
            [mId, `Carrinho: ${checkout.email} - R$ ${checkout.total_price}`, JSON.stringify({email: checkout.email, valor: checkout.total_price, token: checkout.token, abandoned_url: checkout.abandoned_checkout_url})]);
        }
        return res.json({ ok: true, action: "checkout_tracked" });
      }

      return res.json({ ok: true, action: "ignored", topic });
    }

    // ── Olist Webhook ──
    if (source === "olist") {
      const mId = marca_id;
      if (!mId) return res.status(400).json({ error: "marca_id required" });
      const event = req.body;
      const topic = event.topic || event.event_type || "unknown";

      if (topic.includes("order") || event.order) {
        const order = event.order || event.resource || event;
        const custName = order.customer?.name || order.buyer?.name || "Cliente Olist";
        const custEmail = order.customer?.email || order.buyer?.email || null;
        const custPhone = order.customer?.phone || order.buyer?.phone || null;
        const valor = parseFloat(order.total_amount || order.total || 0);
        const orderId = String(order.id || order.order_id || "");

        if (custEmail) {
          const [existing] = await q("SELECT id FROM clientes WHERE marca_id=$1 AND email=$2 LIMIT 1", [mId, custEmail]);
          let clienteId;
          if (existing) {
            clienteId = existing.id;
            await q("UPDATE clientes SET total_pedidos=total_pedidos+1, receita_total=receita_total+$1, recencia_dias=0, updated_at=now() WHERE id=$2", [valor, clienteId]);
          } else {
            const [novo] = await q("INSERT INTO clientes (marca_id, nome, email, telefone, total_pedidos, receita_total) VALUES ($1,$2,$3,$4,1,$5) RETURNING id",
              [mId, custName, custEmail, custPhone, valor]);
            clienteId = novo.id;
          }

          if (orderId) {
            await q("INSERT INTO pedidos (marca_id, cliente_id, valor, status, origem, external_id, created_at) VALUES ($1,$2,$3,$4,'olist',$5,now()) ON CONFLICT DO NOTHING",
              [mId, clienteId, valor, "aprovado", orderId]);
            await q("INSERT INTO timeline (marca_id, cliente_id, tipo, titulo, metadata) VALUES ($1,$2,'pedido',$3,$4)",
              [mId, clienteId, `Pedido Olist #${orderId} - R$ ${valor.toFixed(2)}`, JSON.stringify({ olist_order_id: orderId, valor })]);
          }
        }
        return res.json({ ok: true, action: "olist_order_processed" });
      }
      return res.json({ ok: true, action: "olist_event_logged", topic });
    }

    // ── Pagar.me Webhook ──
    if (source === "pagarme") {
      const mId = marca_id;
      if (!mId) return res.status(400).json({ error: "marca_id required" });
      const event = req.body;
      const eventType = event.type || "unknown";

      if (eventType.includes("order") || eventType.includes("charge") || event.data?.order) {
        const order = event.data?.order || event.data || event;
        const cust = order.customer || {};
        const custName = cust.name || "Cliente Pagar.me";
        const custEmail = cust.email || null;
        const custPhone = cust.phones?.mobile_phone ? `${cust.phones.mobile_phone.area_code}${cust.phones.mobile_phone.number}` : null;
        const valor = (order.amount || 0) / 100;
        const orderId = order.id || order.code || "";
        const statusMap = { paid: "aprovado", pending: "pendente", canceled: "cancelado", failed: "cancelado" };

        if (custEmail) {
          const [existing] = await q("SELECT id FROM clientes WHERE marca_id=$1 AND email=$2 LIMIT 1", [mId, custEmail]);
          let clienteId;
          if (existing) {
            clienteId = existing.id;
            await q("UPDATE clientes SET total_pedidos=total_pedidos+1, receita_total=receita_total+$1, recencia_dias=0, updated_at=now() WHERE id=$2", [valor, clienteId]);
          } else {
            const [novo] = await q("INSERT INTO clientes (marca_id, nome, email, telefone, total_pedidos, receita_total) VALUES ($1,$2,$3,$4,1,$5) RETURNING id",
              [mId, custName, custEmail, custPhone, valor]);
            clienteId = novo.id;
          }

          if (orderId) {
            const [existPedido] = await q("SELECT id FROM pedidos WHERE marca_id=$1 AND external_id=$2 LIMIT 1", [mId, orderId]);
            if (!existPedido) {
              await q("INSERT INTO pedidos (marca_id, cliente_id, valor, status, origem, external_id, created_at) VALUES ($1,$2,$3,$4,'pagarme',$5,now())",
                [mId, clienteId, valor, statusMap[order.status] || "pendente", orderId]);
            } else {
              await q("UPDATE pedidos SET status=$1, updated_at=now() WHERE marca_id=$2 AND external_id=$3",
                [statusMap[order.status] || "pendente", mId, orderId]);
            }
            await q("INSERT INTO timeline (marca_id, cliente_id, tipo, titulo, metadata) VALUES ($1,$2,'pedido',$3,$4)",
              [mId, clienteId, `Pagamento Pagar.me #${orderId} - R$ ${valor.toFixed(2)}`, JSON.stringify({ pagarme_order_id: orderId, valor, status: order.status })]);
          }
        }
        return res.json({ ok: true, action: "pagarme_order_processed" });
      }
      return res.json({ ok: true, action: "pagarme_event_logged", eventType });
    }

    // Generic webhook log
    console.log(`[Webhook] source=${source}`, JSON.stringify(req.body).slice(0, 300));
    return res.json({ ok: true, action: "logged" });
  } catch (e) {
    console.error("[Webhook Error]", e.message);
    return res.status(500).json({ error: e.message });
  }
});

// ── Automações ───────────────────────────────────────────────────────────────
const AUTO_TABLES = ["automacoes", "automacao_execucoes"];

app.get("/api/automacoes", requireAuth(async (req, res) => {
  const marcaId = req.user.marca_id;
  const w = marcaId ? "WHERE marca_id = $1" : "";
  const p = marcaId ? [marcaId] : [];
  const rows = await q(`SELECT * FROM automacoes ${w} ORDER BY created_at DESC`, p);
  res.json({ data: rows });
}));

app.get("/api/automacoes/:id", requireAuth(async (req, res) => {
  const marcaId = req.user.marca_id;
  const [auto] = marcaId
    ? await q("SELECT * FROM automacoes WHERE id = $1 AND marca_id = $2", [req.params.id, marcaId])
    : await q("SELECT * FROM automacoes WHERE id = $1", [req.params.id]);
  if (!auto) return res.status(404).json({ error: "Not found" });
  const execs = await q("SELECT * FROM automacao_execucoes WHERE automacao_id = $1 ORDER BY created_at DESC LIMIT 50", [req.params.id]);
  const [stats] = await q(`SELECT 
    COUNT(*) as total,
    COUNT(*) FILTER (WHERE status = 'enviado' OR status = 'entregue' OR status = 'lido') as enviados,
    COUNT(*) FILTER (WHERE status = 'convertido') as convertidos,
    COUNT(*) FILTER (WHERE status = 'erro') as erros
    FROM automacao_execucoes WHERE automacao_id = $1`, [req.params.id]);
  res.json({ automacao: auto, execucoes: execs, stats });
}));

app.post("/api/automacoes", requireAuth(async (req, res) => {
  if (!["miner","admin"].includes(req.user.role)) return res.status(403).json({ error: "Sem permissão" });
  const { nome, tipo, gatilho, acao, canal, template } = req.body;
  if (!nome || !tipo) return res.status(400).json({ error: "nome and tipo required" });
  const marcaId = req.user.marca_id || req.body.marca_id;
  const rows = await q(
    `INSERT INTO automacoes (marca_id, nome, tipo, gatilho, acao, canal, template, ativo)
     VALUES ($1,$2,$3,$4,$5,$6,$7,false) RETURNING *`,
    [marcaId, nome, tipo, JSON.stringify(gatilho || {}), JSON.stringify(acao || {}), canal || "whatsapp", template || ""]
  );
  res.status(201).json({ data: rows[0] });
}));

app.patch("/api/automacoes/:id", requireAuth(async (req, res) => {
  if (!["miner","admin"].includes(req.user.role)) return res.status(403).json({ error: "Sem permissão" });
  const marcaId = req.user.marca_id;
  const changes = { ...req.body }; delete changes.id; delete changes.created_at;
  if (changes.gatilho) changes.gatilho = JSON.stringify(changes.gatilho);
  if (changes.acao) changes.acao = JSON.stringify(changes.acao);
  const keys = Object.keys(changes);
  if (!keys.length) return res.status(400).json({ error: "No fields" });
  const sets = keys.map((k, i) => `${k}=$${i + 1}`).join(",");
  const vals = [...Object.values(changes), req.params.id];
  const rows = marcaId
    ? await q(`UPDATE automacoes SET ${sets}, updated_at=now() WHERE id = $${vals.length} AND marca_id = $${vals.length + 1} RETURNING *`, [...vals, marcaId])
    : await q(`UPDATE automacoes SET ${sets}, updated_at=now() WHERE id = $${vals.length} RETURNING *`, vals);
  res.json({ data: rows[0] });
}));

app.delete("/api/automacoes/:id", requireAuth(async (req, res) => {
  if (!["miner","admin"].includes(req.user.role)) return res.status(403).json({ error: "Sem permissão" });
  const marcaId = req.user.marca_id;
  marcaId
    ? await q("DELETE FROM automacoes WHERE id = $1 AND marca_id = $2", [req.params.id, marcaId])
    : await q("DELETE FROM automacoes WHERE id = $1", [req.params.id]);
  res.json({ deleted: true });
}));

// Simular execução de automação (dry-run: mostra quantos clientes seriam impactados)
app.post("/api/automacoes/:id/preview", requireAuth(async (req, res) => {
  const marcaId = req.user.marca_id;
  const [auto] = marcaId
    ? await q("SELECT * FROM automacoes WHERE id = $1 AND marca_id = $2", [req.params.id, marcaId])
    : await q("SELECT * FROM automacoes WHERE id = $1", [req.params.id]);
  if (!auto) return res.status(404).json({ error: "Not found" });
  const autoMarcaId = auto.marca_id;
  const gatilho = auto.gatilho;
  let clientes = [];

  if (auto.tipo === "reativacao") {
    const dias = gatilho.dias_inativo || 60;
    clientes = await q(
      "SELECT id, nome, email, telefone, recencia_dias, receita_total FROM clientes WHERE marca_id = $1 AND recencia_dias >= $2 AND total_pedidos > 0 ORDER BY receita_total DESC LIMIT 100",
      [autoMarcaId, dias]
    );
  } else if (auto.tipo === "pos_venda") {
    clientes = await q(
      `SELECT DISTINCT c.id, c.nome, c.email, c.telefone, c.recencia_dias, c.receita_total
       FROM clientes c JOIN pedidos p ON p.cliente_id = c.id
       WHERE c.marca_id = $1 AND p.status = 'aprovado' AND p.created_at > now() - interval '7 days'
       ORDER BY c.receita_total DESC LIMIT 100`,
      [autoMarcaId]
    );
  } else if (auto.tipo === "carrinho_abandonado") {
    // Placeholder — depende de webhook do Shopify
    clientes = [];
  } else {
    // Custom — pega todos com pedidos
    clientes = await q(
      "SELECT id, nome, email, telefone, recencia_dias, receita_total FROM clientes WHERE marca_id = $1 AND total_pedidos > 0 ORDER BY receita_total DESC LIMIT 100",
      [autoMarcaId]
    );
  }

  res.json({ total_impactados: clientes.length, amostra: clientes.slice(0, 10), template: auto.template });
}));

// ── Automação Execuções (all, with filters) ─────────────────────────────────
app.get("/api/automacao-execucoes", requireAuth(async (req, res) => {
  const marcaId = req.user.marca_id;
  const { automacao_id, status, limit = "50" } = req.query;
  const conds = []; const params = [];
  if (marcaId) { conds.push(`a.marca_id=$${params.length+1}`); params.push(marcaId); }
  if (automacao_id) { conds.push(`ae.automacao_id=$${params.length+1}`); params.push(automacao_id); }
  if (status) { conds.push(`ae.status=$${params.length+1}`); params.push(status); }
  const w = conds.length ? "WHERE " + conds.join(" AND ") : "";
  params.push(+limit);
  const rows = await q(`
    SELECT ae.*, c.nome as cliente_nome, a.nome as automacao_nome, a.canal
    FROM automacao_execucoes ae
    LEFT JOIN clientes c ON ae.cliente_id = c.id
    LEFT JOIN automacoes a ON ae.automacao_id = a.id
    ${w} ORDER BY ae.created_at DESC LIMIT $${params.length}
  `, params);
  res.json({ data: rows });
}));

// ── Automação Execuções (per automation) ─────────────────────────────────────
app.get("/api/automacoes/:id/execucoes", requireAuth(async (req, res) => {
  const marcaId = req.user.marca_id;
  // Verify automacao belongs to user's marca
  const [auto] = marcaId
    ? await q("SELECT id FROM automacoes WHERE id = $1 AND marca_id = $2", [req.params.id, marcaId])
    : await q("SELECT id FROM automacoes WHERE id = $1", [req.params.id]);
  if (!auto) return res.status(404).json({ error: "Not found" });
  const rows = await q(`
    SELECT ae.*, c.nome as cliente_nome
    FROM automacao_execucoes ae
    LEFT JOIN clientes c ON ae.cliente_id = c.id
    WHERE ae.automacao_id = $1
    ORDER BY ae.created_at DESC LIMIT 50
  `, [req.params.id]);
  res.json({ data: rows });
}));

// ── Duplicar Automação ──────────────────────────────────────────────────────
app.post("/api/automacoes/:id/duplicate", requireAuth(async (req, res) => {
  if (!["miner","admin"].includes(req.user.role)) return res.status(403).json({ error: "Sem permissão" });
  const marcaId = req.user.marca_id;
  const [orig] = marcaId
    ? await q("SELECT * FROM automacoes WHERE id = $1 AND marca_id = $2", [req.params.id, marcaId])
    : await q("SELECT * FROM automacoes WHERE id = $1", [req.params.id]);
  if (!orig) return res.status(404).json({ error: "Não encontrada" });
  const [dup] = await q(
    "INSERT INTO automacoes (marca_id, nome, tipo, gatilho, acao, canal, template, ativo) VALUES ($1,$2,$3,$4,$5,$6,$7,false) RETURNING *",
    [orig.marca_id, orig.nome + " (cópia)", orig.tipo, orig.gatilho, orig.acao, orig.canal, orig.template]
  );
  res.json({ data: dup });
}));

// ── Auto-gerar 10 campanhas sugeridas baseado nos dados ──────────────────────
async function gerarCampanhasSugeridas(marcaId) {
  try {
    // Verificar se já tem campanhas sugeridas
    const [{ count }] = await q("SELECT COUNT(*) as count FROM campanhas_sugeridas WHERE marca_id=$1", [marcaId]);
    if (+count >= 10) return; // Já tem campanhas

    // Coletar métricas
    const [{ total_cli }] = await q("SELECT COUNT(*) as total_cli FROM clientes WHERE marca_id=$1", [marcaId]);
    const [{ aniv_count }] = await q("SELECT COUNT(*) as aniv_count FROM clientes WHERE marca_id=$1 AND data_nascimento IS NOT NULL", [marcaId]);
    const [{ inativos }] = await q("SELECT COUNT(*) as inativos FROM clientes WHERE marca_id=$1 AND recencia_dias > 90", [marcaId]);
    const [{ novos_30d }] = await q("SELECT COUNT(*) as novos_30d FROM clientes WHERE marca_id=$1 AND created_at > now() - interval '30 days'", [marcaId]);
    const [{ vip_count }] = await q("SELECT COUNT(*) as vip_count FROM clientes WHERE marca_id=$1 AND total_pedidos >= 3", [marcaId]);
    const [{ ticket_medio }] = await q("SELECT COALESCE(AVG(valor),0) as ticket_medio FROM pedidos WHERE marca_id=$1 AND status='aprovado'", [marcaId]);

    const hoje = new Date();
    const proxMes = new Date(hoje); proxMes.setMonth(proxMes.getMonth() + 1);
    const fmt = d => d.toISOString().split("T")[0];

    const campanhas = [
      {
        titulo: "Aniversariantes do Mês",
        descricao: `${+aniv_count} clientes com aniversário cadastrado. Envie cupom especial de aniversário para aumentar recompra.`,
        tipo: "aniversario", gatilho: "Data de nascimento do cliente", canal: "whatsapp",
        data_sugerida: fmt(hoje), recorrencia: "mensal", prioridade: 10
      },
      {
        titulo: "Reativação de Inativos",
        descricao: `${+inativos} clientes sem compra há mais de 90 dias. Ofereça desconto exclusivo para trazer de volta.`,
        tipo: "reativacao", gatilho: "Cliente sem compra > 90 dias", canal: "whatsapp",
        data_sugerida: fmt(hoje), recorrencia: "semanal", prioridade: 9
      },
      {
        titulo: "Boas-vindas — Novo Cliente",
        descricao: `${+novos_30d} novos clientes no último mês. Envie mensagem de boas-vindas automática após primeira compra.`,
        tipo: "boas_vindas", gatilho: "Primeira compra realizada", canal: "whatsapp",
        data_sugerida: fmt(hoje), recorrencia: "diario", prioridade: 9
      },
      {
        titulo: "Pós-venda (7 dias)",
        descricao: "Pergunte se o cliente recebeu o pedido e está satisfeito. Aumenta NPS e fidelização.",
        tipo: "pos_venda", gatilho: "7 dias após compra aprovada", canal: "whatsapp",
        data_sugerida: fmt(hoje), recorrencia: "diario", prioridade: 8
      },
      {
        titulo: "Clientes VIP — Acesso Exclusivo",
        descricao: `${+vip_count} clientes com 3+ compras. Ofereça acesso antecipado a lançamentos ou promoções exclusivas.`,
        tipo: "fidelidade", gatilho: "Cliente com 3+ pedidos", canal: "whatsapp",
        data_sugerida: fmt(proxMes), recorrencia: "mensal", prioridade: 8
      },
      {
        titulo: "Carrinho Abandonado",
        descricao: "Recupere vendas perdidas. Envie lembrete automático 2h após abandono de carrinho no site.",
        tipo: "carrinho", gatilho: "Checkout abandonado", canal: "whatsapp",
        data_sugerida: fmt(hoje), recorrencia: "diario", prioridade: 7
      },
      {
        titulo: "Feedback pós-compra",
        descricao: "Peça avaliação do produto 15 dias após entrega. Gera prova social e identifica problemas.",
        tipo: "feedback", gatilho: "15 dias após entrega", canal: "email",
        data_sugerida: fmt(hoje), recorrencia: "diario", prioridade: 7
      },
      {
        titulo: "Upsell — Ticket Médio",
        descricao: `Ticket médio atual: R$ ${(+ticket_medio).toFixed(0)}. Sugira produtos complementares para quem comprou recentemente.`,
        tipo: "upsell", gatilho: "Compra realizada com valor abaixo da média", canal: "email",
        data_sugerida: fmt(proxMes), recorrencia: "semanal", prioridade: 6
      },
      {
        titulo: "Programa de Indicação",
        descricao: "Clientes satisfeitos indicam amigos. Ofereça desconto para quem indicar + para o indicado.",
        tipo: "fidelidade", gatilho: "Cliente com 2+ compras e NPS alto", canal: "whatsapp",
        data_sugerida: fmt(proxMes), recorrencia: "mensal", prioridade: 6
      },
      {
        titulo: "Recorrência — Recompra programada",
        descricao: "Para produtos de uso contínuo, lembre o cliente de reabastecer baseado no ciclo médio de recompra.",
        tipo: "recorrencia", gatilho: "Ciclo médio de recompra atingido", canal: "whatsapp",
        data_sugerida: fmt(proxMes), recorrencia: "semanal", prioridade: 5
      }
    ];

    for (const c of campanhas) {
      await q(`INSERT INTO campanhas_sugeridas (marca_id,titulo,descricao,tipo,gatilho,canal,data_sugerida,recorrencia,prioridade)
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) ON CONFLICT DO NOTHING`,
        [marcaId,c.titulo,c.descricao,c.tipo,c.gatilho,c.canal,c.data_sugerida,c.recorrencia,c.prioridade]);
    }
  } catch(e) { console.error("Erro gerando campanhas:", e.message); }
}

// ── API Campanhas Sugeridas ──────────────────────────────────────────────────
app.get("/api/campanhas-sugeridas", requireAuth(async (req, res) => {
  const marcaId = req.user.marca_id;
  if (!marcaId) return res.status(400).json({ error: "marca_id required" });
  const rows = await q("SELECT * FROM campanhas_sugeridas WHERE marca_id=$1 ORDER BY prioridade DESC, created_at", [marcaId]);
  res.json({ data: rows });
}));

app.patch("/api/campanhas-sugeridas/:id", requireAuth(async (req, res) => {
  if (!["miner","admin"].includes(req.user.role)) return res.status(403).json({ error: "Sem permissão" });
  const { status } = req.body;
  if (!["aprovada","ativa","pausada","sugerida"].includes(status)) return res.status(400).json({ error: "Status inválido" });
  const rows = await q("UPDATE campanhas_sugeridas SET status=$1 WHERE id=$2 AND marca_id=$3 RETURNING *", [status, req.params.id, req.user.marca_id]);
  res.json({ data: rows[0] });
}));

app.post("/api/campanhas-sugeridas/gerar", requireAuth(async (req, res) => {
  if (!["miner","admin"].includes(req.user.role)) return res.status(403).json({ error: "Sem permissão" });
  await gerarCampanhasSugeridas(req.user.marca_id);
  const rows = await q("SELECT * FROM campanhas_sugeridas WHERE marca_id=$1 ORDER BY prioridade DESC", [req.user.marca_id]);
  res.json({ data: rows });
}));

// ── Conexão Self-Service (admin conecta sozinho, sem dev) ────────────────────
app.post("/api/integracoes/connect", requireAuth(async (req, res) => {
  if (!["miner","admin"].includes(req.user.role)) return res.status(403).json({ error: "Sem permissão" });
  const marcaId = req.user.marca_id;
  if (!marcaId) return res.status(400).json({ error: "marca_id required" });
  const { tipo, config } = req.body;
  if (!tipo || !config) return res.status(400).json({ error: "tipo e config obrigatórios" });

  // Testar conexão antes de salvar
  try {
    if (tipo === "shopify") {
      const { store, token } = config;
      if (!store || !token) return res.status(400).json({ error: "URL da loja e token são obrigatórios" });
      const shopUrl = store.replace("https://","").replace("http://","").replace(/\/$/,"");
      const r = await fetch(`https://${shopUrl}/admin/api/2024-01/shop.json`, { headers: { "X-Shopify-Access-Token": token } });
      if (!r.ok) {
        const txt = await r.text().catch(() => "");
        return res.json({ ok: false, error: `Shopify retornou erro ${r.status}. Verifique o token e a URL da loja.` });
      }
      const { shop } = await r.json();
      // Salvar ou atualizar integração
      const [existing] = await q("SELECT id FROM integracoes WHERE marca_id=$1 AND tipo='shopify'", [marcaId]);
      if (existing) {
        await q("UPDATE integracoes SET config=$1, status='conectado', nome=$2, ultimo_sync=now() WHERE id=$3",
          [JSON.stringify({ store: shopUrl, token, shop_name: shop.name }), `Shopify — ${shop.name}`, existing.id]);
      } else {
        await q("INSERT INTO integracoes (marca_id, tipo, nome, config, status) VALUES ($1,'shopify',$2,$3,'conectado')",
          [marcaId, `Shopify — ${shop.name}`, JSON.stringify({ store: shopUrl, token, shop_name: shop.name })]);
      }
      return res.json({ ok: true, message: `Conectado com sucesso à loja "${shop.name}"!`, shop: { name: shop.name, domain: shop.domain } });
    }

    if (tipo === "bling") {
      const { api_key } = config;
      if (!api_key) return res.status(400).json({ error: "API Key do Bling é obrigatória" });
      const r = await fetch("https://bling.com.br/Api/v2/produtos/json/", { headers: { Authorization: `Bearer ${api_key}` } });
      if (!r.ok) return res.json({ ok: false, error: `Bling retornou erro ${r.status}. Verifique a API Key.` });
      const [existing] = await q("SELECT id FROM integracoes WHERE marca_id=$1 AND tipo='bling'", [marcaId]);
      if (existing) {
        await q("UPDATE integracoes SET config=$1, status='conectado', ultimo_sync=now() WHERE id=$2",
          [JSON.stringify({ api_key }), existing.id]);
      } else {
        await q("INSERT INTO integracoes (marca_id, tipo, nome, config, status) VALUES ($1,'bling','Bling ERP',$2,'conectado')",
          [marcaId, JSON.stringify({ api_key })]);
      }
      return res.json({ ok: true, message: "Conectado ao Bling com sucesso!" });
    }

    if (tipo === "olist") {
      const { seller_id, api_key } = config;
      if (!seller_id || !api_key) return res.status(400).json({ error: "Seller ID e API Key obrigatórios" });
      const [existing] = await q("SELECT id FROM integracoes WHERE marca_id=$1 AND tipo='olist'", [marcaId]);
      if (existing) {
        await q("UPDATE integracoes SET config=$1, status='conectado', ultimo_sync=now() WHERE id=$2",
          [JSON.stringify({ seller_id, api_key }), existing.id]);
      } else {
        await q("INSERT INTO integracoes (marca_id, tipo, nome, config, status) VALUES ($1,'olist','Olist',$2,'conectado')",
          [marcaId, JSON.stringify({ seller_id, api_key })]);
      }
      return res.json({ ok: true, message: "Conectado ao Olist!" });
    }

    if (tipo === "pagarme") {
      const { api_key } = config;
      if (!api_key) return res.status(400).json({ error: "API Key do Pagar.me obrigatória" });
      const [existing] = await q("SELECT id FROM integracoes WHERE marca_id=$1 AND tipo='pagarme'", [marcaId]);
      if (existing) {
        await q("UPDATE integracoes SET config=$1, status='conectado', ultimo_sync=now() WHERE id=$2",
          [JSON.stringify({ api_key }), existing.id]);
      } else {
        await q("INSERT INTO integracoes (marca_id, tipo, nome, config, status) VALUES ($1,'pagarme','Pagar.me',$2,'conectado')",
          [marcaId, JSON.stringify({ api_key })]);
      }
      return res.json({ ok: true, message: "Conectado ao Pagar.me!" });
    }

    if (tipo === "suri") {
      const { api_url, token } = config;
      if (!api_url || !token) return res.status(400).json({ error: "URL e token obrigatórios" });
      const [existing] = await q("SELECT id FROM integracoes WHERE marca_id=$1 AND tipo='suri'", [marcaId]);
      if (existing) {
        await q("UPDATE integracoes SET config=$1, status='conectado', ultimo_sync=now() WHERE id=$2",
          [JSON.stringify({ api_url, token }), existing.id]);
      } else {
        await q("INSERT INTO integracoes (marca_id, tipo, nome, config, status) VALUES ($1,'suri','Suri',$2,'conectado')",
          [marcaId, JSON.stringify({ api_url, token })]);
      }
      return res.json({ ok: true, message: "Conectado à Suri!" });
    }

    return res.status(400).json({ error: `Tipo "${tipo}" não suportado. Use: shopify, bling, olist, pagarme, suri` });
  } catch (e) {
    return res.status(500).json({ ok: false, error: e.message });
  }
}));

// ── Sync genérico (usa token da integração, não env var) ─────────────────────
app.post("/api/integracoes/:id/sync", requireAuth(async (req, res) => {
  if (!["miner","admin"].includes(req.user.role)) return res.status(403).json({ error: "Sem permissão" });
  const marcaId = req.user.marca_id;
  const [integ] = marcaId
    ? await q("SELECT * FROM integracoes WHERE id=$1 AND marca_id=$2", [req.params.id, marcaId])
    : await q("SELECT * FROM integracoes WHERE id=$1", [req.params.id]);
  if (!integ) return res.status(404).json({ error: "Integração não encontrada" });
  if (!integ.config) return res.status(400).json({ error: "Integração sem configuração" });

  const cfg = typeof integ.config === "string" ? JSON.parse(integ.config) : integ.config;
  const mId = integ.marca_id;
  const startTime = Date.now();
  const TIMEOUT_LIMIT = 240000;

  if (integ.tipo === "shopify") {
    const store = cfg.store || process.env.SHOPIFY_PRLS_STORE || process.env.SHOPIFY_STORE;
    const token = cfg.token || process.env.SHOPIFY_PRLS_TOKEN || process.env.SHOPIFY_ACCESS_TOKEN;
    if (!store || !token) return res.status(400).json({ error: "Store e token não configurados" });

    try {
      const shopFetch = async (ep) => {
        const r = await fetch(`https://${store}${ep}`, { headers: { "X-Shopify-Access-Token": token } });
        if (!r.ok) throw new Error(`Shopify ${r.status}`);
        return r.json();
      };
      let cN=0,cU=0,pN=0,pU=0,erros=0,aniversarios=0;
      // Customers — com dados completos
      let sinceId = 0;
      for (let pg = 0; pg < 5; pg++) {
        if (Date.now() - startTime > TIMEOUT_LIMIT) break;
        const data = await shopFetch(`/admin/api/2024-01/customers.json?limit=250&since_id=${sinceId}`);
        const custs = data.customers || [];
        if (!custs.length) break;
        for (const c of custs) {
          try {
            const nome = [c.first_name, c.last_name].filter(Boolean).join(" ") || c.email?.split("@")[0] || "Sem nome";
            const recDias = c.last_order_date ? Math.floor((Date.now() - new Date(c.last_order_date)) / 86400000) : 999;
            const addr = c.default_address || c.addresses?.[0] || {};
            const cidade = addr.city || null;
            const estado = addr.province_code || addr.province || null;
            const endereco = [addr.address1, addr.address2].filter(Boolean).join(", ") || null;
            const telefone = c.phone || addr.phone || null;
            // Extrair aniversário das tags ou metafields
            let dataNasc = null;
            if (c.note) {
              const m = c.note.match(/(\d{2})\/(\d{2})\/(\d{4})/);
              if (m) dataNasc = `${m[3]}-${m[2]}-${m[1]}`;
            }
            if (!dataNasc && c.tags) {
              const m = c.tags.match(/aniv[:\s]*(\d{2})\/(\d{2})/i);
              if (m) dataNasc = `2000-${m[2]}-${m[1]}`;
            }
            if (dataNasc) aniversarios++;

            const r = await q(`INSERT INTO clientes (marca_id,shopify_id,nome,email,telefone,recencia_dias,total_pedidos,receita_total,
              data_nascimento,endereco,cidade,estado,ultimo_pedido,origem,created_at)
              VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,'shopify',$14)
              ON CONFLICT (marca_id,shopify_id) WHERE shopify_id IS NOT NULL DO UPDATE SET
              nome=EXCLUDED.nome,email=EXCLUDED.email,telefone=COALESCE(EXCLUDED.telefone,clientes.telefone),
              recencia_dias=EXCLUDED.recencia_dias,total_pedidos=EXCLUDED.total_pedidos,receita_total=EXCLUDED.receita_total,
              data_nascimento=COALESCE(EXCLUDED.data_nascimento,clientes.data_nascimento),
              endereco=COALESCE(EXCLUDED.endereco,clientes.endereco),cidade=COALESCE(EXCLUDED.cidade,clientes.cidade),
              estado=COALESCE(EXCLUDED.estado,clientes.estado),ultimo_pedido=EXCLUDED.ultimo_pedido,
              updated_at=now() RETURNING (xmax=0) AS is_new`,
              [mId,c.id,nome,c.email,telefone,recDias,c.orders_count||0,parseFloat(c.total_spent)||0,
               dataNasc,endereco,cidade,estado,c.last_order_date||null,c.created_at]);
            if (r[0]?.is_new) cN++; else cU++;
          } catch(e) { erros++; }
        }
        sinceId = custs[custs.length-1].id;
        if (custs.length < 250) break;
      }
      // Orders
      sinceId = 0;
      for (let pg = 0; pg < 5; pg++) {
        if (Date.now() - startTime > TIMEOUT_LIMIT) break;
        const data = await shopFetch(`/admin/api/2024-01/orders.json?limit=250&status=any&since_id=${sinceId}`);
        const ords = data.orders || [];
        if (!ords.length) break;
        for (const o of ords) {
          try {
            let cliId = null;
            if (o.customer?.id) {
              const rs = await q("SELECT id FROM clientes WHERE shopify_id=$1 AND marca_id=$2 LIMIT 1", [o.customer.id, mId]);
              cliId = rs[0]?.id || null;
            }
            const st = o.financial_status === "paid" ? "aprovado" : o.cancelled_at ? "cancelado" : "pendente";
            const r = await q(`INSERT INTO pedidos (marca_id,shopify_id,cliente_id,valor,status,origem,created_at)
              VALUES ($1,$2,$3,$4,$5,'shopify',$6) ON CONFLICT (marca_id,shopify_id) WHERE shopify_id IS NOT NULL DO UPDATE SET
              cliente_id=EXCLUDED.cliente_id,valor=EXCLUDED.valor,status=EXCLUDED.status,updated_at=now() RETURNING (xmax=0) AS is_new`,
              [mId,o.id,cliId,parseFloat(o.total_price)||0,st,o.created_at]);
            if (r[0]?.is_new) pN++; else pU++;
          } catch(e) { erros++; }
        }
        sinceId = ords[ords.length-1].id;
        if (ords.length < 250) break;
      }

      // Auto-gerar campanhas sugeridas após sync
      await gerarCampanhasSugeridas(mId);

      await q("UPDATE integracoes SET ultimo_sync=now(), status='conectado' WHERE id=$1", [integ.id]);
      return res.json({ ok: true, clientes_novos: cN, clientes_atualizados: cU, pedidos_novos: pN, pedidos_atualizados: pU, aniversarios, erros, duracao_ms: Date.now()-startTime });
    } catch (e) {
      await q("UPDATE integracoes SET status='erro' WHERE id=$1", [integ.id]);
      return res.status(500).json({ ok: false, error: e.message });
    }
  }

  return res.status(400).json({ error: `Sync para tipo "${integ.tipo}" ainda não implementado` });
}));

// ── Integrações ──────────────────────────────────────────────────────────────
app.get("/api/integracoes", requireAuth(async (req, res) => {
  const marcaId = req.user.marca_id;
  const w = marcaId ? "WHERE marca_id = $1" : "";
  const p = marcaId ? [marcaId] : [];
  const rows = await q(`SELECT id, marca_id, tipo, nome, status, ultimo_sync, created_at FROM integracoes ${w} ORDER BY created_at`, p);
  res.json({ data: rows });
}));

app.get("/api/integracoes/:id", requireAuth(async (req, res) => {
  const marcaId = req.user.marca_id;
  const [row] = marcaId
    ? await q("SELECT * FROM integracoes WHERE id = $1 AND marca_id = $2", [req.params.id, marcaId])
    : await q("SELECT * FROM integracoes WHERE id = $1", [req.params.id]);
  if (!row) return res.status(404).json({ error: "Not found" });
  res.json({ data: row });
}));

app.patch("/api/integracoes/:id", requireAuth(async (req, res) => {
  if (!["miner","admin"].includes(req.user.role)) return res.status(403).json({ error: "Sem permissão" });
  const marcaId = req.user.marca_id;
  const { config, status } = req.body;
  const sets = []; const vals = [];
  if (config) { sets.push(`config=$${vals.length+1}`); vals.push(JSON.stringify(config)); }
  if (status) { sets.push(`status=$${vals.length+1}`); vals.push(status); }
  sets.push("updated_at=now()");
  vals.push(req.params.id);
  const rows = marcaId
    ? await q(`UPDATE integracoes SET ${sets.join(",")} WHERE id=$${vals.length} AND marca_id=$${vals.length+1} RETURNING *`, [...vals, marcaId])
    : await q(`UPDATE integracoes SET ${sets.join(",")} WHERE id=$${vals.length} RETURNING *`, vals);
  res.json({ data: rows[0] });
}));

app.post("/api/integracoes/:id/test", requireAuth(async (req, res) => {
  const marcaId = req.user.marca_id;
  const [integ] = marcaId
    ? await q("SELECT * FROM integracoes WHERE id = $1 AND marca_id = $2", [req.params.id, marcaId])
    : await q("SELECT * FROM integracoes WHERE id = $1", [req.params.id]);
  if (!integ) return res.status(404).json({ error: "Not found" });

  if (integ.tipo === "shopify") {
    try {
      const store = integ.config.store || process.env.SHOPIFY_STORE;
      const token = process.env.SHOPIFY_ACCESS_TOKEN;
      if (!token) return res.json({ ok: false, error: "Token não configurado" });
      const r = await fetch(`https://${store}/admin/api/2024-01/shop.json`, { headers: { "X-Shopify-Access-Token": token } });
      if (!r.ok) return res.json({ ok: false, error: `Shopify retornou ${r.status}` });
      const { shop } = await r.json();
      await q("UPDATE integracoes SET status='conectado', ultimo_sync=now() WHERE id=$1", [integ.id]);
      return res.json({ ok: true, shop: { name: shop.name, domain: shop.domain, plan: shop.plan_name } });
    } catch (e) {
      await q("UPDATE integracoes SET status='erro' WHERE id=$1", [integ.id]);
      return res.json({ ok: false, error: e.message });
    }
  }

  if (integ.tipo === "suri") {
    const { api_url, token } = integ.config;
    if (!api_url || !token) return res.json({ ok: false, error: "URL e token da Suri são obrigatórios" });
    try {
      const r = await fetch(`${api_url}/contacts?limit=1`, { headers: { Authorization: `Bearer ${token}` } });
      if (!r.ok) return res.json({ ok: false, error: `Suri retornou ${r.status}` });
      await q("UPDATE integracoes SET status='conectado', ultimo_sync=now() WHERE id=$1", [integ.id]);
      return res.json({ ok: true, message: "Conexão com Suri OK" });
    } catch (e) {
      await q("UPDATE integracoes SET status='erro' WHERE id=$1", [integ.id]);
      return res.json({ ok: false, error: e.message });
    }
  }

  // ── Teste Olist ──
  if (integ.tipo === "olist") {
    const { seller_id, api_key } = integ.config;
    if (!seller_id || !api_key) return res.json({ ok: false, error: "Seller ID e API Key são obrigatórios" });
    try {
      const r = await fetch(`https://api.olist.com/v2/sellers/${seller_id}`, {
        headers: { Authorization: `Bearer ${api_key}` }
      });
      if (!r.ok) return res.json({ ok: false, error: `Olist retornou ${r.status}` });
      await q("UPDATE integracoes SET status='conectado', ultimo_sync=now() WHERE id=$1", [integ.id]);
      return res.json({ ok: true, message: "Conexão com Olist OK" });
    } catch (e) {
      await q("UPDATE integracoes SET status='erro' WHERE id=$1", [integ.id]);
      return res.json({ ok: false, error: e.message });
    }
  }

  // ── Teste Pagar.me ──
  if (integ.tipo === "pagarme") {
    const { secret_key } = integ.config;
    if (!secret_key) return res.json({ ok: false, error: "Secret Key (sk_...) é obrigatória" });
    try {
      const r = await fetch("https://api.pagar.me/core/v5/orders?size=1", {
        headers: { Authorization: "Basic " + Buffer.from(secret_key + ":").toString("base64") }
      });
      if (!r.ok) return res.json({ ok: false, error: `Pagar.me retornou ${r.status}` });
      await q("UPDATE integracoes SET status='conectado', ultimo_sync=now() WHERE id=$1", [integ.id]);
      return res.json({ ok: true, message: "Conexão com Pagar.me OK" });
    } catch (e) {
      await q("UPDATE integracoes SET status='erro' WHERE id=$1", [integ.id]);
      return res.json({ ok: false, error: e.message });
    }
  }

  return res.json({ ok: false, error: "Teste não implementado para este tipo" });
}));

// ── Templates de Mensagem ────────────────────────────────────────────────────
app.get("/api/templates", requireAuth(async (req, res) => {
  const marcaId = req.user.marca_id;
  const { canal, categoria } = req.query;
  const conds = []; const params = [];
  if (marcaId) { conds.push(`marca_id = $${params.length+1}`); params.push(marcaId); }
  if (canal) { conds.push(`canal = $${params.length+1}`); params.push(canal); }
  if (categoria) { conds.push(`categoria = $${params.length+1}`); params.push(categoria); }
  const w = conds.length ? "WHERE " + conds.join(" AND ") : "";
  const rows = await q(`SELECT * FROM templates_mensagem ${w} ORDER BY uso_count DESC, created_at DESC`, params);
  res.json({ data: rows });
}));

app.post("/api/templates", requireAuth(async (req, res) => {
  if (!["miner","admin"].includes(req.user.role)) return res.status(403).json({ error: "Sem permissão" });
  const { nome, canal, categoria, assunto, corpo, variaveis } = req.body;
  if (!nome || !canal || !corpo) return res.status(400).json({ error: "nome, canal, corpo required" });
  const marcaId = req.user.marca_id || req.body.marca_id;
  const rows = await q(
    "INSERT INTO templates_mensagem (marca_id, nome, canal, categoria, assunto, corpo, variaveis) VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *",
    [marcaId, nome, canal, categoria, assunto, corpo, JSON.stringify(variaveis || [])]
  );
  res.status(201).json({ data: rows[0] });
}));

app.patch("/api/templates/:id", requireAuth(async (req, res) => {
  const marcaId = req.user.marca_id;
  const changes = { ...req.body }; delete changes.id; delete changes.created_at;
  if (changes.variaveis) changes.variaveis = JSON.stringify(changes.variaveis);
  const keys = Object.keys(changes);
  if (!keys.length) return res.status(400).json({ error: "No fields" });
  const sets = keys.map((k, i) => `${k}=$${i+1}`).join(",");
  const vals = [...Object.values(changes), req.params.id];
  const rows = marcaId
    ? await q(`UPDATE templates_mensagem SET ${sets} WHERE id=$${vals.length} AND marca_id=$${vals.length+1} RETURNING *`, [...vals, marcaId])
    : await q(`UPDATE templates_mensagem SET ${sets} WHERE id=$${vals.length} RETURNING *`, vals);
  res.json({ data: rows[0] });
}));

app.delete("/api/templates/:id", requireAuth(async (req, res) => {
  const marcaId = req.user.marca_id;
  marcaId
    ? await q("DELETE FROM templates_mensagem WHERE id = $1 AND marca_id = $2", [req.params.id, marcaId])
    : await q("DELETE FROM templates_mensagem WHERE id = $1", [req.params.id]);
  res.json({ deleted: true });
}));

// Suri webhook receiver (handshake + events)
app.get("/api/suri/webhook", (req, res) => {
  // Handshake: Suri sends GET, we respond with chatbot ID
  const chatbotId = req.query.chatbot_id || process.env.SURI_CHATBOT_ID || "";
  res.status(200).send(chatbotId);
});

app.post("/api/suri/webhook", async (req, res) => {
  const event = req.body;
  const tipo = event.type || event.event;
  console.log(`[Suri] Event: ${tipo}`, JSON.stringify(event).slice(0, 300));

  try {
    if (tipo === "new_contact" || tipo === "contact.created") {
      const c = event.contact || event.data;
      if (c?.phone) {
        const marcaId = "a0000000-0000-0000-0000-000000000001"; // TODO: dynamic
        await q(`INSERT INTO clientes (marca_id, nome, telefone, suri_contact_id, canal_preferido) 
          VALUES ($1,$2,$3,$4,'whatsapp') ON CONFLICT (pedido_id, produto_id, variante) WHERE produto_id IS NOT NULL DO NOTHING`,
          [marcaId, c.name || c.phone, c.phone, c.id || c.uuid]);
      }
    }
    
    if (tipo === "message.received" || tipo === "new_message") {
      const msg = event.message || event.data;
      const contactId = msg?.contact_id || msg?.contact?.id;
      if (contactId) {
        const marcaId = "a0000000-0000-0000-0000-000000000001";
        const [cli] = await q("SELECT id FROM clientes WHERE suri_contact_id = $1 AND marca_id = $2", [contactId, marcaId]);
        if (cli) {
          await q("INSERT INTO mensagens (marca_id, cliente_id, canal, direcao, conteudo, status) VALUES ($1,$2,'whatsapp','entrada',$3,'recebida')",
            [marcaId, cli.id, msg.text || msg.body || ""]);
          await q("UPDATE clientes SET ultima_interacao = now() WHERE id = $1", [cli.id]);
        }
      }
    }

    if (tipo === "attendance.finished" || tipo === "chat.closed") {
      // Fim de atendimento — timeline
      const att = event.attendance || event.data;
      if (att?.contact_id) {
        const marcaId = "a0000000-0000-0000-0000-000000000001";
        const [cli] = await q("SELECT id FROM clientes WHERE suri_contact_id = $1 AND marca_id = $2", [att.contact_id, marcaId]);
        if (cli) {
          await q("INSERT INTO timeline (marca_id, cliente_id, tipo, titulo, metadata) VALUES ($1,$2,'atendimento','Atendimento finalizado',$3)",
            [marcaId, cli.id, JSON.stringify({duration: att.duration, agent: att.agent_name})]);
        }
      }
    }

    res.json({ ok: true });
  } catch (e) {
    console.error("[Suri Webhook Error]", e.message);
    res.status(500).json({ error: e.message });
  }
});

// ── Customer Intelligence ────────────────────────────────────────────────────
app.post("/api/intelligence/churn-score", requireAuth(async (req, res) => {
  if (!["miner","admin"].includes(req.user.role)) return res.status(403).json({ error: "Sem permissão" });
  const marcaId = req.user.marca_id;
  const w = marcaId ? "WHERE marca_id = $1" : "";
  const p = marcaId ? [marcaId] : [];

  const clientes = await q(`SELECT id, recencia_dias, total_pedidos, receita_total FROM clientes ${w}`, p);
  if (!clientes.length) return res.json({ updated: 0 });

  // Calcular métricas de referência
  const maxRec = Math.max(...clientes.map(c => c.recencia_dias || 0), 1);
  const maxPed = Math.max(...clientes.map(c => c.total_pedidos || 0), 1);
  const maxRec_t = Math.max(...clientes.map(c => +c.receita_total || 0), 1);

  let updated = 0;
  for (const c of clientes) {
    const rec = c.recencia_dias || 999;
    const ped = c.total_pedidos || 0;
    const receita = +c.receita_total || 0;

    // Churn score: 0-100 (100 = altíssimo risco)
    const recScore = Math.min(rec / maxRec, 1) * 50; // Recência pesa 50%
    const freqScore = (1 - Math.min(ped / maxPed, 1)) * 30; // Frequência pesa 30%
    const valScore = (1 - Math.min(receita / maxRec_t, 1)) * 20; // Valor pesa 20%
    const churnScore = Math.min(100, Math.round(recScore + freqScore + valScore));

    // Engajamento: inverso do churn
    const engajamento = Math.max(0, 100 - churnScore);

    // Próxima melhor ação
    let proximaAcao;
    if (rec <= 7 && ped > 0) proximaAcao = "cross_sell"; // Comprou recente → oferecer complementar
    else if (rec <= 30 && ped > 2) proximaAcao = "upsell"; // Cliente fiel recente → upgrade
    else if (rec > 30 && rec <= 60) proximaAcao = "reengajar"; // Esfriando → mensagem de reengajamento
    else if (rec > 60 && rec <= 120 && ped > 0) proximaAcao = "reativar"; // Dormindo → oferta especial
    else if (rec > 120 && ped > 0) proximaAcao = "win_back"; // Perdido → cupom agressivo
    else if (ped === 0) proximaAcao = "primeiro_contato"; // Nunca comprou → nutrição
    else proximaAcao = "monitorar";

    await q("UPDATE clientes SET churn_score=$1, score_engajamento=$2, proxima_acao=$3 WHERE id=$4",
      [churnScore, engajamento, proximaAcao, c.id]);
    updated++;
  }

  // Retornar distribuição
  const dist = await q(`SELECT proxima_acao, COUNT(*) as n, ROUND(AVG(churn_score),1) as avg_churn 
    FROM clientes ${w} GROUP BY proxima_acao ORDER BY n DESC`, p);
  const churnDist = await q(`SELECT 
    COUNT(*) FILTER (WHERE churn_score < 25) as baixo,
    COUNT(*) FILTER (WHERE churn_score >= 25 AND churn_score < 50) as medio,
    COUNT(*) FILTER (WHERE churn_score >= 50 AND churn_score < 75) as alto,
    COUNT(*) FILTER (WHERE churn_score >= 75) as critico
    FROM clientes ${w}`, p);

  res.json({ updated, proxima_acao: dist, churn_distribuicao: churnDist[0] });
}));

// Clientes que precisam de ação (priorizados)
app.get("/api/intelligence/acoes-pendentes", requireAuth(async (req, res) => {
  const marcaId = req.user.marca_id;
  const { acao, limit = "20" } = req.query;
  const conds = []; const params = [];
  if (marcaId) { conds.push(`marca_id = $${params.length + 1}`); params.push(marcaId); }
  if (acao) { conds.push(`proxima_acao = $${params.length + 1}`); params.push(acao); }
  else { conds.push("proxima_acao IS NOT NULL"); conds.push("proxima_acao != 'monitorar'"); }
  
  params.push(+limit);
  const w = conds.length ? "WHERE " + conds.join(" AND ") : "";
  const rows = await q(`SELECT id, nome, email, telefone, segmento_rfm, recencia_dias, total_pedidos, receita_total, churn_score, proxima_acao, score_engajamento
    FROM clientes ${w} ORDER BY churn_score DESC LIMIT $${params.length}`, params);
  
  res.json({ data: rows });
}));

// ── Agenda Inteligente ────────────────────────────────────────────────────────
app.get("/api/intelligence/agenda", requireAuth(async (req, res) => {
  const marcaId = req.user.marca_id;
  const w = marcaId ? "WHERE c.marca_id = $1" : "";
  const wn = marcaId ? "WHERE marca_id = $1" : "";
  const wa = marcaId ? "AND c.marca_id = $1" : "";
  const p = marcaId ? [marcaId] : [];
  const acoes = [];

  // 1. Pós-venda: clientes que compraram nos últimos 7 dias
  const posVenda = await q(`
    SELECT DISTINCT ON (c.id) c.id, c.nome, c.email, p.valor, p.created_at::date as data_compra, c.total_pedidos
    FROM pedidos p JOIN clientes c ON p.cliente_id = c.id
    WHERE p.created_at > now() - interval '7 days' ${wa}
    ORDER BY c.id, p.created_at DESC LIMIT 5
  `, p);
  for (const c of posVenda) {
    acoes.push({ id: c.id, tipo: "pos_venda", icon: "🙏", nome: c.nome, 
      texto: `Enviar pós-venda para ${c.nome}`,
      detalhe: `Comprou R$ ${(+c.valor).toFixed(2)} em ${new Date(c.data_compra).toLocaleDateString("pt-BR")}${c.total_pedidos > 1 ? ` • ${c.total_pedidos} pedidos` : " • 1ª compra"}`,
      urgencia: "media", acao_btn: "Enviar mensagem" });
  }

  // 2. Cross-sell: clientes fiéis (2+ pedidos, ativos)
  const crossSell = await q(`
    SELECT id, nome, email, total_pedidos, receita_total, recencia_dias FROM clientes c
    ${w} ${w ? "AND" : "WHERE"} total_pedidos >= 2 AND recencia_dias <= 90
    ORDER BY total_pedidos DESC, receita_total DESC LIMIT 3
  `, p);
  for (const c of crossSell) {
    acoes.push({ id: c.id, tipo: "cross_sell", icon: "🎯", nome: c.nome,
      texto: `Cross-sell para ${c.nome}`,
      detalhe: `Cliente fiel — ${c.total_pedidos} pedidos, R$ ${(+c.receita_total).toFixed(2)} total, ativo há ${c.recencia_dias}d`,
      urgencia: "baixa", acao_btn: "Sugerir produto" });
  }

  // 3. Reativação: clientes de alto valor inativos
  const reativar = await q(`
    SELECT id, nome, email, receita_total, recencia_dias, churn_score FROM clientes c
    ${w} ${w ? "AND" : "WHERE"} recencia_dias > 90 AND receita_total > 200
    ORDER BY receita_total DESC LIMIT 3
  `, p);
  for (const c of reativar) {
    acoes.push({ id: c.id, tipo: "reativar", icon: "🔄", nome: c.nome,
      texto: `Reativar ${c.nome}`,
      detalhe: `R$ ${(+c.receita_total).toFixed(2)} em compras, inativo há ${c.recencia_dias} dias • Churn: ${(+c.churn_score || 0).toFixed(0)}%`,
      urgencia: "alta", acao_btn: "Enviar cupom" });
  }

  // 4. Win-back: clientes perdidos com maior valor
  const winBack = await q(`
    SELECT id, nome, email, receita_total, recencia_dias FROM clientes c
    ${w} ${w ? "AND" : "WHERE"} recencia_dias > 180 AND receita_total > 100
    ORDER BY receita_total DESC LIMIT 2
  `, p);
  for (const c of winBack) {
    acoes.push({ id: c.id, tipo: "win_back", icon: "💔", nome: c.nome,
      texto: `Win-back ${c.nome}`,
      detalhe: `Gastou R$ ${(+c.receita_total).toFixed(2)} mas sumiu há ${c.recencia_dias} dias`,
      urgencia: "alta", acao_btn: "Campanha especial" });
  }

  // Ordenar: alta > media > baixa
  const order = { alta: 0, media: 1, baixa: 2 };
  acoes.sort((a, b) => (order[a.urgencia] || 9) - (order[b.urgencia] || 9));

  res.json({ acoes });
}));

// ── Envio de Mensagem ────────────────────────────────────────────────────────
app.post("/api/mensagens/enviar", requireAuth(async (req, res) => {
  const { cliente_id, canal, conteudo, template_id } = req.body;
  if (!cliente_id || !conteudo) return res.status(400).json({ error: "cliente_id and conteudo required" });
  const marcaId = req.user.marca_id;

  // Buscar cliente
  const [cli] = marcaId
    ? await q("SELECT * FROM clientes WHERE id = $1 AND marca_id = $2", [cliente_id, marcaId])
    : await q("SELECT * FROM clientes WHERE id = $1", [cliente_id]);
  if (!cli) return res.status(404).json({ error: "Cliente não encontrado" });

  // Registrar mensagem
  const [msg] = await q(
    "INSERT INTO mensagens (marca_id, cliente_id, canal, direcao, conteudo, status, agente_id) VALUES ($1,$2,$3,'saida',$4,'pendente',$5) RETURNING *",
    [marcaId, cliente_id, canal || "whatsapp", conteudo, req.user.id]
  );

  // Tentar enviar via integração
  if (canal === "whatsapp" || !canal) {
    const [integ] = await q("SELECT * FROM integracoes WHERE marca_id = $1 AND tipo = 'suri' AND status = 'conectado'", [marcaId]);
    if (integ && integ.config.api_url && integ.config.token) {
      try {
        const phone = cli.telefone?.replace(/\D/g, "");
        if (!phone) throw new Error("Cliente sem telefone");
        const r = await fetch(`${integ.config.api_url}/messages`, {
          method: "POST",
          headers: { Authorization: `Bearer ${integ.config.token}`, "Content-Type": "application/json" },
          body: JSON.stringify({ contact_phone: phone, message: conteudo }),
        });
        if (r.ok) {
          await q("UPDATE mensagens SET status = 'enviado' WHERE id = $1", [msg.id]);
          msg.status = "enviado";
        } else {
          const err = await r.text();
          await q("UPDATE mensagens SET status = 'erro', metadata = $1 WHERE id = $2", [JSON.stringify({error: err}), msg.id]);
          msg.status = "erro";
        }
      } catch (e) {
        await q("UPDATE mensagens SET status = 'erro', metadata = $1 WHERE id = $2", [JSON.stringify({error: e.message}), msg.id]);
        msg.status = "erro";
      }
    } else {
      // Sem integração — salva como rascunho
      await q("UPDATE mensagens SET status = 'rascunho' WHERE id = $1", [msg.id]);
      msg.status = "rascunho";
    }
  }

  // Timeline
  await q("INSERT INTO timeline (marca_id, cliente_id, tipo, titulo) VALUES ($1,$2,'mensagem',$3)",
    [marcaId, cliente_id, `Mensagem enviada via ${canal || "whatsapp"}`]);

  // Incrementar uso do template
  if (template_id) {
    await q("UPDATE templates_mensagem SET uso_count = uso_count + 1 WHERE id = $1", [template_id]);
  }

  res.json({ data: msg });
}));

// ── Inbox (mensagens do cliente) ─────────────────────────────────────────────
app.get("/api/inbox", requireAuth(async (req, res) => {
  const marcaId = req.user.marca_id;
  const { limit = "50", cliente_id } = req.query;
  const conds = []; const params = [];
  if (marcaId) { conds.push(`m.marca_id = $${params.length+1}`); params.push(marcaId); }
  if (cliente_id) { conds.push(`m.cliente_id = $${params.length+1}`); params.push(cliente_id); }
  const w = conds.length ? "WHERE " + conds.join(" AND ") : "";
  params.push(+limit);

  const rows = await q(`
    SELECT m.*, c.nome as cliente_nome, c.email as cliente_email, c.telefone as cliente_telefone
    FROM mensagens m LEFT JOIN clientes c ON m.cliente_id = c.id
    ${w} ORDER BY m.created_at DESC LIMIT $${params.length}
  `, params);

  // Conversas agrupadas por cliente (últimas)
  const convos = await q(`
    SELECT c.id, c.nome, c.email, c.telefone, c.segmento_rfm,
      (SELECT COUNT(*) FROM mensagens WHERE cliente_id = c.id AND marca_id = $1) as total_msgs,
      (SELECT created_at FROM mensagens WHERE cliente_id = c.id ORDER BY created_at DESC LIMIT 1) as ultima_msg,
      (SELECT conteudo FROM mensagens WHERE cliente_id = c.id ORDER BY created_at DESC LIMIT 1) as ultimo_texto,
      (SELECT direcao FROM mensagens WHERE cliente_id = c.id ORDER BY created_at DESC LIMIT 1) as ultima_direcao
    FROM clientes c WHERE c.marca_id = $1 AND c.id IN (SELECT DISTINCT cliente_id FROM mensagens WHERE marca_id = $1)
    ORDER BY ultima_msg DESC LIMIT 30
  `, [marcaId || params[0]]);

  res.json({ mensagens: rows, conversas: convos });
}));

// ── Health v2 ────────────────────────────────────────────────────────────────
app.get("/api/health/full", async (req, res) => {
  try {
    const tables = await q("SELECT tablename FROM pg_tables WHERE schemaname = 'public' ORDER BY tablename");
    const counts = {};
    for (const t of tables) {
      const [{ n }] = await q(`SELECT COUNT(*) as n FROM ${t.tablename}`);
      counts[t.tablename] = +n;
    }
    const dbSize = await q("SELECT pg_size_pretty(pg_database_size('crmminer')) as size");
    res.json({
      status: "ok", version: "v5", uptime: process.uptime(),
      db: { connected: true, size: dbSize[0].size, tables: counts },
      memory: process.memoryUsage(),
      ts: new Date().toISOString(),
    });
  } catch (e) { res.status(500).json({ status: "error", error: e.message }); }
});

// ── Pipeline de Vendas ───────────────────────────────────────────────────────

// GET /api/oportunidades/funil — must be before /:id routes
app.get("/api/oportunidades/funil", requireAuth(async (req, res) => {
  try {
    const marcaId = req.user.marca_id;
    if (!marcaId) return res.status(400).json({ error: "marca_id required" });

    const stages = await q(
      `SELECT etapa, COUNT(*)::int as count, COALESCE(SUM(valor),0)::numeric as valor
       FROM oportunidades WHERE marca_id = $1 GROUP BY etapa ORDER BY etapa`, [marcaId]);

    const totalAtivos = await q(
      `SELECT COUNT(*)::int as count, COALESCE(SUM(valor),0)::numeric as valor
       FROM oportunidades WHERE marca_id = $1 AND etapa NOT IN ('fechado_ganho','fechado_perdido')`, [marcaId]);

    const ganhos = await q(
      `SELECT COUNT(*)::int as count FROM oportunidades WHERE marca_id = $1 AND etapa = 'fechado_ganho'`, [marcaId]);
    const perdidos = await q(
      `SELECT COUNT(*)::int as count FROM oportunidades WHERE marca_id = $1 AND etapa = 'fechado_perdido'`, [marcaId]);

    const totalFechados = (ganhos[0]?.count || 0) + (perdidos[0]?.count || 0);
    const winRate = totalFechados > 0 ? Math.round((ganhos[0]?.count || 0) / totalFechados * 100) : 0;

    const ticketMedio = await q(
      `SELECT COALESCE(AVG(valor),0)::numeric as avg FROM oportunidades WHERE marca_id = $1 AND etapa = 'fechado_ganho'`, [marcaId]);

    const recentWins = await q(
      `SELECT o.*, c.nome as cliente_nome, u.nome as vendedor_nome
       FROM oportunidades o LEFT JOIN clientes c ON o.cliente_id = c.id LEFT JOIN users u ON o.vendedor_id = u.id
       WHERE o.marca_id = $1 AND o.etapa = 'fechado_ganho' ORDER BY o.updated_at DESC LIMIT 10`, [marcaId]);

    const recentLosses = await q(
      `SELECT o.*, c.nome as cliente_nome, u.nome as vendedor_nome
       FROM oportunidades o LEFT JOIN clientes c ON o.cliente_id = c.id LEFT JOIN users u ON o.vendedor_id = u.id
       WHERE o.marca_id = $1 AND o.etapa = 'fechado_perdido' ORDER BY o.updated_at DESC LIMIT 10`, [marcaId]);

    res.json({
      por_etapa: stages,
      ativos: totalAtivos[0] || { count: 0, valor: 0 },
      ganhos: ganhos[0]?.count || 0,
      perdidos: perdidos[0]?.count || 0,
      win_rate: winRate,
      ticket_medio: +ticketMedio[0]?.avg || 0,
      recent_wins: recentWins,
      recent_losses: recentLosses,
    });
  } catch (e) { res.status(500).json({ error: e.message }); }
}));

// GET /api/oportunidades
app.get("/api/oportunidades", requireAuth(async (req, res) => {
  try {
    const marcaId = req.user.marca_id;
    if (!marcaId) return res.status(400).json({ error: "marca_id required" });

    const { etapa, vendedor_id, search } = req.query;
    let where = "WHERE o.marca_id = $1";
    const params = [marcaId];
    let idx = 2;

    if (etapa) { where += ` AND o.etapa = $${idx++}`; params.push(etapa); }
    if (vendedor_id) { where += ` AND o.vendedor_id = $${idx++}`; params.push(vendedor_id); }
    if (search) { where += ` AND (o.titulo ILIKE $${idx} OR c.nome ILIKE $${idx})`; params.push(`%${search}%`); idx++; }

    const data = await q(
      `SELECT o.*, c.nome as cliente_nome, c.email as cliente_email, u.nome as vendedor_nome
       FROM oportunidades o
       LEFT JOIN clientes c ON o.cliente_id = c.id
       LEFT JOIN users u ON o.vendedor_id = u.id
       ${where} ORDER BY o.updated_at DESC`, params);

    const stats = await q(
      `SELECT etapa, COUNT(*)::int as count, COALESCE(SUM(valor),0)::numeric as valor
       FROM oportunidades WHERE marca_id = $1 GROUP BY etapa`, [marcaId]);

    const [totals] = await q(
      `SELECT COUNT(*)::int as total, COALESCE(SUM(valor),0)::numeric as valor_total
       FROM oportunidades WHERE marca_id = $1`, [marcaId]);

    res.json({ data, stats: { total: totals.total, valor_total: +totals.valor_total, por_etapa: stats } });
  } catch (e) { res.status(500).json({ error: e.message }); }
}));

// POST /api/oportunidades
app.post("/api/oportunidades", requireAuth(async (req, res) => {
  try {
    const r = req.user.role;
    if (!["miner","admin","gerente","vendedor"].includes(r)) return res.status(403).json({ error: "Sem permissão" });

    const marcaId = req.user.marca_id;
    if (!marcaId) return res.status(400).json({ error: "marca_id required" });

    const { titulo, cliente_id, vendedor_id, valor, etapa, probabilidade, data_previsao, fonte, notas } = req.body;
    if (!titulo) return res.status(400).json({ error: "titulo required" });

    const vid = vendedor_id || req.user.id;
    const et = etapa || "lead";

    const [row] = await q(
      `INSERT INTO oportunidades (marca_id, cliente_id, vendedor_id, titulo, valor, etapa, probabilidade, data_previsao, fonte, notas)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) RETURNING *`,
      [marcaId, cliente_id || null, vid, titulo, valor || 0, et, probabilidade || 10, data_previsao || null, fonte || null, notas || null]);

    await logActivity(req, "criou_oportunidade", "oportunidades", row.id, { titulo, etapa: et, valor });

    if (cliente_id) {
      await q("INSERT INTO timeline (marca_id, cliente_id, tipo, titulo, metadata) VALUES ($1,$2,'oportunidade',$3,$4)",
        [marcaId, cliente_id, `Nova oportunidade: ${titulo}`, JSON.stringify({ valor, etapa: et })]);
    }

    res.json(row);
  } catch (e) { res.status(500).json({ error: e.message }); }
}));

// PATCH /api/oportunidades/:id
app.patch("/api/oportunidades/:id", requireAuth(async (req, res) => {
  try {
    const marcaId = req.user.marca_id;
    const [existing] = await q("SELECT * FROM oportunidades WHERE id = $1 AND marca_id = $2", [req.params.id, marcaId]);
    if (!existing) return res.status(404).json({ error: "Not found" });

    const allowed = ["titulo","cliente_id","vendedor_id","valor","etapa","probabilidade","data_previsao","motivo_perda","fonte","notas"];
    const changes = {};
    for (const k of allowed) { if (req.body[k] !== undefined) changes[k] = req.body[k]; }

    if (changes.etapa === "fechado_perdido" && !changes.motivo_perda && !existing.motivo_perda) {
      return res.status(400).json({ error: "motivo_perda é obrigatório para oportunidades perdidas" });
    }

    if (Object.keys(changes).length === 0) return res.json(existing);

    const sets = Object.keys(changes).map((k, i) => `${k} = $${i + 3}`);
    const vals = Object.values(changes);

    const [updated] = await q(
      `UPDATE oportunidades SET ${sets.join(", ")}, updated_at = now() WHERE id = $1 AND marca_id = $2 RETURNING *`,
      [req.params.id, marcaId, ...vals]);

    const detalhes = { ...changes };
    if (changes.etapa && changes.etapa !== existing.etapa) {
      detalhes.etapa_anterior = existing.etapa;
    }
    await logActivity(req, "atualizou_oportunidade", "oportunidades", req.params.id, detalhes);

    if (changes.etapa && ["fechado_ganho","fechado_perdido"].includes(changes.etapa) && updated.cliente_id) {
      const label = changes.etapa === "fechado_ganho" ? "Oportunidade ganha" : "Oportunidade perdida";
      await q("INSERT INTO timeline (marca_id, cliente_id, tipo, titulo, metadata) VALUES ($1,$2,'oportunidade',$3,$4)",
        [marcaId, updated.cliente_id, `${label}: ${updated.titulo}`, JSON.stringify({ valor: updated.valor, etapa: changes.etapa })]);
    }

    res.json(updated);
  } catch (e) { res.status(500).json({ error: e.message }); }
}));

// DELETE /api/oportunidades/:id
app.delete("/api/oportunidades/:id", requireAuth(async (req, res) => {
  try {
    if (!["miner","admin"].includes(req.user.role)) return res.status(403).json({ error: "Sem permissão" });
    const marcaId = req.user.marca_id;
    const [row] = await q("DELETE FROM oportunidades WHERE id = $1 AND marca_id = $2 RETURNING *", [req.params.id, marcaId]);
    if (!row) return res.status(404).json({ error: "Not found" });
    await logActivity(req, "deletou_oportunidade", "oportunidades", req.params.id, { titulo: row.titulo });
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
}));

// ── Vendedor Stats ───────────────────────────────────────────────────────────
app.get("/api/stats/vendedor", requireAuth(async (req, res) => {
  try {
    const userId = req.user.id;
    const marcaId = req.user.marca_id;

    const [cliStats] = await q("SELECT COUNT(*) as total, COUNT(*) FILTER (WHERE recencia_dias <= 30) as ativos FROM clientes WHERE vendedor_id = $1", [userId]);

    const [pedStats] = await q(`
      SELECT COUNT(*) as total, COALESCE(SUM(valor),0) as receita
      FROM pedidos WHERE vendedor_id = $1 AND created_at >= now() - interval '30 days'
    `, [userId]);

    const [userInfo] = await q("SELECT meta_mensal FROM users WHERE id = $1", [userId]);
    const meta = +(userInfo?.meta_mensal || 0);

    const mensal = await q(`
      SELECT to_char(created_at, 'YYYY-MM') as mes, COUNT(*) as pedidos, COALESCE(SUM(valor),0) as receita
      FROM pedidos WHERE vendedor_id = $1 AND created_at >= now() - interval '6 months'
      GROUP BY mes ORDER BY mes
    `, [userId]);

    const recentes = await q(`
      SELECT p.id, p.valor, p.status, p.created_at, c.nome as cliente_nome
      FROM pedidos p LEFT JOIN clientes c ON p.cliente_id = c.id
      WHERE p.vendedor_id = $1 ORDER BY p.created_at DESC LIMIT 10
    `, [userId]);

    const ranking = await q(`
      SELECT u.id, u.nome, COALESCE(SUM(p.valor),0) as receita
      FROM users u LEFT JOIN pedidos p ON p.vendedor_id = u.id AND p.created_at >= now() - interval '30 days'
      WHERE u.marca_id = $1 AND u.role = 'vendedor' AND u.status = 'ativo'
      GROUP BY u.id, u.nome ORDER BY receita DESC
    `, [marcaId]);
    const posicao = ranking.findIndex(r => r.id === userId) + 1;

    const [tarefas] = await q("SELECT COUNT(*) as pendentes FROM tarefas WHERE responsavel_id = $1 AND concluida = false", [userId]);

    res.json({
      clientes: { total: +cliStats.total, ativos: +cliStats.ativos },
      pedidos: { total: +pedStats.total, receita: +pedStats.receita },
      meta,
      mensal: mensal.map(m => ({ mes: m.mes?.slice(5), pedidos: +m.pedidos, receita: +m.receita })),
      recentes,
      ranking: { posicao, total_vendedores: ranking.length },
      tarefas_pendentes: +(tarefas?.pendentes || 0),
    });
  } catch (e) { res.status(500).json({ error: e.message }); }
}));

// ── Profile ──────────────────────────────────────────────────────────────────
app.patch("/api/auth/profile", requireAuth(async (req, res) => {
  try {
    const userId = req.user.id;
    const { nome, avatar_url } = req.body;
    const sets = []; const vals = [];
    if (nome !== undefined) { sets.push(`nome = $${vals.length+1}`); vals.push(nome); }
    if (avatar_url !== undefined) { sets.push(`avatar_url = $${vals.length+1}`); vals.push(avatar_url); }
    if (!sets.length) return res.status(400).json({ error: "Nada para atualizar" });
    vals.push(userId);
    const [updated] = await q(`UPDATE users SET ${sets.join(",")} WHERE id = $${vals.length} RETURNING id, nome, email, role, avatar_url`, vals);
    res.json({ user: updated });
  } catch (e) { res.status(500).json({ error: e.message }); }
}));

app.post("/api/auth/change-password", requireAuth(async (req, res) => {
  try {
    const { current_password, new_password } = req.body;
    if (!current_password || !new_password) return res.status(400).json({ error: "Campos obrigatórios" });
    if (new_password.length < 6) return res.status(400).json({ error: "Senha deve ter pelo menos 6 caracteres" });
    const [match] = await q("SELECT (password_hash = crypt($1, password_hash)) as ok FROM users WHERE id = $2", [current_password, req.user.id]);
    if (!match?.ok) return res.status(401).json({ error: "Senha atual incorreta" });
    await q("UPDATE users SET password_hash = crypt($1, gen_salt('bf')) WHERE id = $2", [new_password, req.user.id]);
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
}));

// ── Import CSV ───────────────────────────────────────────────────────────────
app.post("/api/import/clientes", requireAuth(async (req, res) => {
  if (!["miner","admin"].includes(req.user.role)) return res.status(403).json({ error: "Sem permissão" });
  const marcaId = req.user.marca_id;
  if (!marcaId) return res.status(400).json({ error: "Marca obrigatória" });

  const { clientes } = req.body;
  if (!Array.isArray(clientes) || !clientes.length) return res.status(400).json({ error: "Array de clientes vazio" });
  if (clientes.length > 5000) return res.status(400).json({ error: "Máximo 5000 por importação" });

  let imported = 0, skipped = 0, errors = [];

  for (const c of clientes) {
    if (!c.nome || !c.nome.trim()) { skipped++; continue; }
    try {
      if (c.email) {
        const [existing] = await q("SELECT id FROM clientes WHERE marca_id = $1 AND email = $2", [marcaId, c.email.trim().toLowerCase()]);
        if (existing) { skipped++; continue; }
      }
      await q(
        "INSERT INTO clientes (marca_id, nome, email, telefone, tags, recencia_dias, total_pedidos, receita_total) VALUES ($1,$2,$3,$4,$5,999,0,0)",
        [marcaId, c.nome.trim(), c.email?.trim()?.toLowerCase() || null, c.telefone?.trim() || null, c.tags ? `{${c.tags.split(",").map(t => `"${t.trim()}"`).join(",")}}` : "{}"]
      );
      imported++;
    } catch (e) {
      errors.push({ nome: c.nome, error: e.message });
      if (errors.length > 10) break;
    }
  }

  try {
    await q("INSERT INTO activity_log (marca_id, user_id, user_nome, acao, entidade, detalhes, ip) VALUES ($1,$2,$3,$4,$5,$6,$7)",
      [marcaId, req.user.id, req.user.nome, "importacao", "clientes", JSON.stringify({ imported, skipped, errors: errors.length }), req.ip]);
  } catch {}

  res.json({ imported, skipped, errors: errors.slice(0, 10), total: clientes.length });
}));

// ── API Keys CRUD ────────────────────────────────────────────────────────────
app.get("/api/api-keys", requireAuth(async (req, res) => {
  try {
    if (!["miner","admin"].includes(req.user.role)) return res.status(403).json({ error: "Sem permissão" });
    const marcaId = req.user.marca_id;
    if (!marcaId) return res.status(400).json({ error: "marca_id required" });
    const rows = await q("SELECT id, nome, key_prefix, permissions, ativo, last_used, created_at FROM api_keys WHERE marca_id = $1 ORDER BY created_at DESC", [marcaId]);
    res.json({ data: rows });
  } catch (e) { res.status(500).json({ error: e.message }); }
}));

app.post("/api/api-keys", requireAuth(async (req, res) => {
  try {
    if (!["miner","admin"].includes(req.user.role)) return res.status(403).json({ error: "Sem permissão" });
    const marcaId = req.user.marca_id;
    if (!marcaId) return res.status(400).json({ error: "marca_id required" });
    const { nome, permissions } = req.body;
    if (!nome) return res.status(400).json({ error: "Nome obrigatório" });
    const rawKey = "mk_" + crypto.randomBytes(16).toString("hex");
    const keyPrefix = rawKey.slice(0, 8);
    const perms = Array.isArray(permissions) && permissions.length > 0 ? permissions : ["read"];
    const [row] = await q(
      `INSERT INTO api_keys (marca_id, nome, key_hash, key_prefix, permissions) VALUES ($1, $2, crypt($3, gen_salt('bf')), $4, $5) RETURNING id, nome, key_prefix, permissions, ativo, created_at`,
      [marcaId, nome, rawKey, keyPrefix, perms]
    );
    res.json({ data: row, key: rawKey });
  } catch (e) { res.status(500).json({ error: e.message }); }
}));

app.delete("/api/api-keys/:id", requireAuth(async (req, res) => {
  try {
    if (!["miner","admin"].includes(req.user.role)) return res.status(403).json({ error: "Sem permissão" });
    const marcaId = req.user.marca_id;
    const [row] = await q("UPDATE api_keys SET ativo = false WHERE id = $1 AND marca_id = $2 RETURNING id", [req.params.id, marcaId]);
    if (!row) return res.status(404).json({ error: "Chave não encontrada" });
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
}));

// ── Webhooks CRUD ────────────────────────────────────────────────────────────
app.get("/api/webhooks", requireAuth(async (req, res) => {
  try {
    if (!["miner","admin"].includes(req.user.role)) return res.status(403).json({ error: "Sem permissão" });
    const marcaId = req.user.marca_id;
    if (!marcaId) return res.status(400).json({ error: "marca_id required" });
    const rows = await q("SELECT id, nome, url, eventos, secret, ativo, ultimo_envio, ultimo_status, created_at FROM webhooks WHERE marca_id = $1 ORDER BY created_at DESC", [marcaId]);
    res.json({ data: rows });
  } catch (e) { res.status(500).json({ error: e.message }); }
}));

app.post("/api/webhooks", requireAuth(async (req, res) => {
  try {
    if (!["miner","admin"].includes(req.user.role)) return res.status(403).json({ error: "Sem permissão" });
    const marcaId = req.user.marca_id;
    if (!marcaId) return res.status(400).json({ error: "marca_id required" });
    const { nome, url, eventos, secret } = req.body;
    if (!nome || !url) return res.status(400).json({ error: "Nome e URL obrigatórios" });
    const [row] = await q(
      "INSERT INTO webhooks (marca_id, nome, url, eventos, secret) VALUES ($1,$2,$3,$4,$5) RETURNING *",
      [marcaId, nome, url, Array.isArray(eventos) ? eventos : [], secret || null]
    );
    res.json({ data: row });
  } catch (e) { res.status(500).json({ error: e.message }); }
}));

app.patch("/api/webhooks/:id", requireAuth(async (req, res) => {
  try {
    if (!["miner","admin"].includes(req.user.role)) return res.status(403).json({ error: "Sem permissão" });
    const marcaId = req.user.marca_id;
    const allowed = ["nome", "url", "eventos", "secret", "ativo"];
    const sets = []; const vals = [req.params.id, marcaId]; let idx = 3;
    for (const k of allowed) {
      if (req.body[k] !== undefined) { sets.push(`${k} = $${idx++}`); vals.push(req.body[k]); }
    }
    if (sets.length === 0) return res.status(400).json({ error: "Nada para atualizar" });
    const [row] = await q(`UPDATE webhooks SET ${sets.join(", ")} WHERE id = $1 AND marca_id = $2 RETURNING *`, vals);
    if (!row) return res.status(404).json({ error: "Webhook não encontrado" });
    res.json({ data: row });
  } catch (e) { res.status(500).json({ error: e.message }); }
}));

app.delete("/api/webhooks/:id", requireAuth(async (req, res) => {
  try {
    if (!["miner","admin"].includes(req.user.role)) return res.status(403).json({ error: "Sem permissão" });
    const marcaId = req.user.marca_id;
    const [row] = await q("DELETE FROM webhooks WHERE id = $1 AND marca_id = $2 RETURNING id", [req.params.id, marcaId]);
    if (!row) return res.status(404).json({ error: "Webhook não encontrado" });
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
}));

app.post("/api/webhooks/:id/test", requireAuth(async (req, res) => {
  try {
    if (!["miner","admin"].includes(req.user.role)) return res.status(403).json({ error: "Sem permissão" });
    const marcaId = req.user.marca_id;
    const [wh] = await q("SELECT * FROM webhooks WHERE id = $1 AND marca_id = $2", [req.params.id, marcaId]);
    if (!wh) return res.status(404).json({ error: "Webhook não encontrado" });
    const payload = { evento: "test", timestamp: new Date().toISOString(), data: { message: "Teste de webhook do CRM Miner" } };
    const headers = { "Content-Type": "application/json" };
    if (wh.secret) headers["X-Webhook-Secret"] = wh.secret;
    let status = 0;
    try {
      const r = await fetch(wh.url, { method: "POST", headers, body: JSON.stringify(payload), signal: AbortSignal.timeout(10000) });
      status = r.status;
    } catch (e) { status = 0; }
    await q("UPDATE webhooks SET ultimo_envio = now(), ultimo_status = $1 WHERE id = $2", [status, wh.id]);
    res.json({ ok: status >= 200 && status < 300, status, url: wh.url });
  } catch (e) { res.status(500).json({ error: e.message }); }
}));

// ── Tags Management ──────────────────────────────────────────────────────────
app.get("/api/tags", requireAuth(async (req, res) => {
  try {
    const marcaId = req.user.marca_id;
    const p = marcaId ? [marcaId] : [];
    const w = marcaId ? "WHERE marca_id = $1" : "";
    const tags = await q(`SELECT * FROM tags ${w} ORDER BY nome`, p);
    for (const tag of tags) {
      const [{ count }] = await q("SELECT COUNT(*) as count FROM clientes WHERE marca_id = $1 AND $2 = ANY(tags)", [tag.marca_id, tag.nome]);
      tag.uso = +count;
    }
    res.json({ data: tags });
  } catch (e) { res.status(500).json({ error: e.message }); }
}));

app.post("/api/tags", requireAuth(async (req, res) => {
  try {
    if (req.user.role !== "miner" && req.user.role !== "admin") return res.status(403).json({ error: "Sem permissão" });
    const marcaId = req.user.marca_id;
    if (!marcaId) return res.status(400).json({ error: "marca_id required" });
    const { nome, cor } = req.body;
    if (!nome) return res.status(400).json({ error: "nome required" });
    const rows = await q("INSERT INTO tags (marca_id, nome, cor) VALUES ($1, $2, $3) RETURNING *", [marcaId, nome.trim(), cor || "#4545F5"]);
    res.status(201).json({ data: rows[0] });
  } catch (e) {
    if (e.code === "23505") return res.status(409).json({ error: "Tag já existe" });
    res.status(500).json({ error: e.message });
  }
}));

app.patch("/api/tags/:id", requireAuth(async (req, res) => {
  try {
    if (req.user.role !== "miner" && req.user.role !== "admin") return res.status(403).json({ error: "Sem permissão" });
    const marcaId = req.user.marca_id;
    const { nome, cor } = req.body;
    const [old] = marcaId
      ? await q("SELECT * FROM tags WHERE id = $1 AND marca_id = $2", [req.params.id, marcaId])
      : await q("SELECT * FROM tags WHERE id = $1", [req.params.id]);
    if (!old) return res.status(404).json({ error: "Tag não encontrada" });
    const sets = []; const vals = []; let idx = 1;
    if (nome !== undefined) { sets.push(`nome = $${idx++}`); vals.push(nome.trim()); }
    if (cor !== undefined) { sets.push(`cor = $${idx++}`); vals.push(cor); }
    if (!sets.length) return res.status(400).json({ error: "Nada para atualizar" });
    vals.push(req.params.id);
    const rows = await q(`UPDATE tags SET ${sets.join(",")} WHERE id = $${idx} RETURNING *`, vals);
    // If nome changed, update all clientes with old tag
    if (nome !== undefined && nome.trim() !== old.nome) {
      await q("UPDATE clientes SET tags = array_replace(tags, $1, $2) WHERE marca_id = $3 AND $1 = ANY(tags)", [old.nome, nome.trim(), old.marca_id]);
    }
    res.json({ data: rows[0] });
  } catch (e) {
    if (e.code === "23505") return res.status(409).json({ error: "Tag com esse nome já existe" });
    res.status(500).json({ error: e.message });
  }
}));

app.delete("/api/tags/:id", requireAuth(async (req, res) => {
  try {
    if (req.user.role !== "miner" && req.user.role !== "admin") return res.status(403).json({ error: "Sem permissão" });
    const marcaId = req.user.marca_id;
    const [old] = marcaId
      ? await q("SELECT * FROM tags WHERE id = $1 AND marca_id = $2", [req.params.id, marcaId])
      : await q("SELECT * FROM tags WHERE id = $1", [req.params.id]);
    if (!old) return res.status(404).json({ error: "Tag não encontrada" });
    // Remove tag from all clientes
    await q("UPDATE clientes SET tags = array_remove(tags, $1) WHERE marca_id = $2 AND $1 = ANY(tags)", [old.nome, old.marca_id]);
    marcaId
      ? await q("DELETE FROM tags WHERE id = $1 AND marca_id = $2", [req.params.id, marcaId])
      : await q("DELETE FROM tags WHERE id = $1", [req.params.id]);
    res.json({ deleted: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
}));

app.post("/api/clientes/:id/tags", requireAuth(async (req, res) => {
  try {
    const { tag } = req.body;
    if (!tag) return res.status(400).json({ error: "tag required" });
    const marcaId = req.user.marca_id;
    const [cli] = marcaId
      ? await q("SELECT id, marca_id, tags FROM clientes WHERE id = $1 AND marca_id = $2", [req.params.id, marcaId])
      : await q("SELECT id, marca_id, tags FROM clientes WHERE id = $1", [req.params.id]);
    if (!cli) return res.status(404).json({ error: "Cliente não encontrado" });
    // Auto-create tag in tags table if it doesn't exist
    const cliMarca = cli.marca_id;
    await q("INSERT INTO tags (marca_id, nome) VALUES ($1, $2) ON CONFLICT (marca_id, nome) DO NOTHING", [cliMarca, tag.trim()]);
    // Add to client if not present
    if (!cli.tags || !cli.tags.includes(tag.trim())) {
      await q("UPDATE clientes SET tags = array_append(COALESCE(tags, '{}'), $1) WHERE id = $2", [tag.trim(), req.params.id]);
    }
    const [updated] = marcaId
      ? await q("SELECT * FROM clientes WHERE id = $1 AND marca_id = $2", [req.params.id, marcaId])
      : await q("SELECT * FROM clientes WHERE id = $1", [req.params.id]);
    res.json({ data: updated });
  } catch (e) { res.status(500).json({ error: e.message }); }
}));

app.delete("/api/clientes/:id/tags/:tag", requireAuth(async (req, res) => {
  try {
    const tag = decodeURIComponent(req.params.tag);
    const marcaId = req.user.marca_id;
    const [cli] = marcaId
      ? await q("SELECT id, marca_id FROM clientes WHERE id = $1 AND marca_id = $2", [req.params.id, marcaId])
      : await q("SELECT id, marca_id FROM clientes WHERE id = $1", [req.params.id]);
    if (!cli) return res.status(404).json({ error: "Cliente não encontrado" });
    await q("UPDATE clientes SET tags = array_remove(tags, $1) WHERE id = $2", [tag, req.params.id]);
    const [updated] = marcaId
      ? await q("SELECT * FROM clientes WHERE id = $1 AND marca_id = $2", [req.params.id, marcaId])
      : await q("SELECT * FROM clientes WHERE id = $1", [req.params.id]);
    res.json({ data: updated });
  } catch (e) { res.status(500).json({ error: e.message }); }
}));

// ── Tarefas (Kanban) ─────────────────────────────────────────────────────────
app.get("/api/tarefas", requireAuth(async (req, res) => {
  try {
    const marcaId = req.user.marca_id;
    const { status, responsavel_id } = req.query;
    const conds = []; const params = [];
    if (marcaId) { conds.push(`t.marca_id=$${params.length+1}`); params.push(marcaId); }
    if (status) { conds.push(`t.status_kanban=$${params.length+1}`); params.push(status); }
    if (responsavel_id) { conds.push(`t.responsavel_id=$${params.length+1}`); params.push(responsavel_id); }
    const w = conds.length ? "WHERE " + conds.join(" AND ") : "";
    const rows = await q(`SELECT t.*, t.status_kanban as status, u.nome as responsavel_nome, c.nome as cliente_nome FROM tarefas t LEFT JOIN users u ON t.responsavel_id=u.id LEFT JOIN clientes c ON t.cliente_id=c.id ${w} ORDER BY CASE t.prioridade WHEN 'urgente' THEN 0 WHEN 'alta' THEN 1 WHEN 'media' THEN 2 ELSE 3 END, t.data_limite ASC NULLS LAST`, params);
    res.json({ data: rows });
  } catch (e) { res.status(500).json({ error: e.message }); }
}));

app.patch("/api/tarefas/:id", requireAuth(async (req, res) => {
  try {
    const { titulo, descricao, tipo, data_limite, concluida, status, prioridade, responsavel_id, cliente_id } = req.body;
    const sets = []; const vals = [];
    if (titulo !== undefined) { sets.push(`titulo=$${vals.length+1}`); vals.push(titulo); }
    if (descricao !== undefined) { sets.push(`descricao=$${vals.length+1}`); vals.push(descricao); }
    if (tipo !== undefined) { sets.push(`tipo=$${vals.length+1}`); vals.push(tipo); }
    if (data_limite !== undefined) { sets.push(`data_limite=$${vals.length+1}`); vals.push(data_limite); }
    if (concluida !== undefined) { sets.push(`concluida=$${vals.length+1}`); vals.push(concluida); }
    if (status !== undefined) { sets.push(`status_kanban=$${vals.length+1}`); vals.push(status); if (status === "concluida") { sets.push(`concluida=true`); } }
    if (prioridade !== undefined) { sets.push(`prioridade=$${vals.length+1}`); vals.push(prioridade); }
    if (responsavel_id !== undefined) { sets.push(`responsavel_id=$${vals.length+1}`); vals.push(responsavel_id); }
    if (cliente_id !== undefined) { sets.push(`cliente_id=$${vals.length+1}`); vals.push(cliente_id); }
    if (!sets.length) return res.status(400).json({ error: "Nada para atualizar" });
    vals.push(req.params.id);
    const [row] = await q(`UPDATE tarefas SET ${sets.join(",")} WHERE id=$${vals.length} RETURNING *`, vals);
    if (!row) return res.status(404).json({ error: "Tarefa não encontrada" });
    res.json({ data: row });
  } catch (e) { res.status(500).json({ error: e.message }); }
}));

app.delete("/api/tarefas/:id", requireAuth(async (req, res) => {
  try {
    const [row] = await q("DELETE FROM tarefas WHERE id=$1 RETURNING id", [req.params.id]);
    if (!row) return res.status(404).json({ error: "Tarefa não encontrada" });
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
}));

// ── Owner Stats ──────────────────────────────────────────────────────────────
app.get("/api/stats/owner", requireAuth(async (req, res) => {
  if (!["miner"].includes(req.user.role)) return res.status(403).json({ error: "Apenas owner" });
  try {
    const marcas = await q("SELECT id, nome, plano, status, created_at FROM marcas ORDER BY created_at DESC");
    const [cliTotal] = await q("SELECT COUNT(*) as total FROM clientes");
    const [cliNew] = await q("SELECT COUNT(*) as total FROM clientes WHERE created_at >= now() - interval '30 days'");
    const [rev30] = await q("SELECT COALESCE(SUM(valor),0) as total FROM pedidos WHERE created_at >= now() - interval '30 days'");
    const [rev60] = await q("SELECT COALESCE(SUM(valor),0) as total FROM pedidos WHERE created_at >= now() - interval '60 days' AND created_at < now() - interval '30 days'");
    const marcaStats = await q(`
      SELECT m.id, m.nome, m.plano, m.status, m.created_at,
        (SELECT COUNT(*) FROM clientes WHERE marca_id=m.id) as clientes,
        (SELECT COUNT(*) FROM pedidos WHERE marca_id=m.id AND created_at >= now()-interval '30 days') as pedidos_30d,
        (SELECT COALESCE(SUM(valor),0) FROM pedidos WHERE marca_id=m.id AND created_at >= now()-interval '30 days') as receita_30d,
        (SELECT COUNT(*) FROM users WHERE marca_id=m.id AND status='ativo') as usuarios
      FROM marcas m ORDER BY receita_30d DESC
    `);
    const mensal = await q(`
      SELECT to_char(created_at, 'YYYY-MM') as mes, COUNT(*) as pedidos, COALESCE(SUM(valor),0) as receita
      FROM pedidos WHERE created_at >= now() - interval '6 months'
      GROUP BY mes ORDER BY mes
    `);
    const rfm = await q("SELECT segmento_rfm as seg, COUNT(*) as n FROM clientes WHERE segmento_rfm IS NOT NULL GROUP BY segmento_rfm");
    const [usersTotal] = await q("SELECT COUNT(*) as total FROM users");
    const [pedidosTotal] = await q("SELECT COUNT(*) as total FROM pedidos");
    const [receitaTotal] = await q("SELECT COALESCE(SUM(valor),0) as total FROM pedidos");
    const growth = +rev60.total > 0 ? (((+rev30.total - +rev60.total) / +rev60.total) * 100).toFixed(1) : 0;
    res.json({
      clientes_total: +cliTotal.total,
      clientes_novos_30d: +cliNew.total,
      receita_30d: +rev30.total,
      receita_anterior: +rev60.total,
      crescimento: +growth,
      marcas: marcaStats.map(m => ({...m, clientes: +m.clientes, pedidos_30d: +m.pedidos_30d, receita_30d: +m.receita_30d, usuarios: +m.usuarios})),
      mensal: mensal.map(m => ({ mes: m.mes, pedidos: +m.pedidos, receita: +m.receita })),
      rfm: Object.fromEntries(rfm.map(r => [r.seg, +r.n])),
      totals: { clientes: +cliTotal.total, pedidos: +pedidosTotal.total, receita: +receitaTotal.total, users: +usersTotal.total },
    });
  } catch (e) { res.status(500).json({ error: e.message }); }
}));

// ── Changelog (Novidades) ────────────────────────────────────────────────────
app.get("/api/changelog", async (req, res) => {
  try {
    const rows = await q("SELECT * FROM changelog ORDER BY created_at DESC LIMIT 5");
    res.json({ data: rows });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post("/api/changelog", requireAuth(async (req, res) => {
  if (req.user.role !== "miner") return res.status(403).json({ error: "Apenas miner" });
  const { versao, titulo, itens } = req.body;
  if (!versao || !titulo) return res.status(400).json({ error: "versao e titulo required" });
  const rows = await q("INSERT INTO changelog (versao, titulo, itens) VALUES ($1,$2,$3) RETURNING *",
    [versao, titulo, JSON.stringify(itens || [])]);
  res.status(201).json({ data: rows[0] });
}));

// ── Onboarding ───────────────────────────────────────────────────────────────
app.get("/api/onboarding", requireAuth(async (req, res) => {
  try {
    const marcaId = req.user.marca_id;
    if (!marcaId) return res.json({ complete: true });
    const [marca] = await q("SELECT * FROM marcas WHERE id = $1", [marcaId]);
    if (!marca) return res.json({ complete: true });
    const [{ cli_count }] = await q("SELECT COUNT(*) as cli_count FROM clientes WHERE marca_id = $1", [marcaId]);
    const [{ user_count }] = await q("SELECT COUNT(*) as user_count FROM users WHERE marca_id = $1", [marcaId]);
    const [{ integ_count }] = await q("SELECT COUNT(*) as integ_count FROM integracoes WHERE marca_id = $1 AND status = 'conectado'", [marcaId]);
    const steps = {
      dados_marca: !!(marca.email && marca.segmento),
      equipe: +user_count > 1,
      clientes: +cli_count > 0,
      integracoes: +integ_count > 0,
    };
    const complete = Object.values(steps).every(Boolean);
    res.json({ steps, complete, marca_nome: marca.nome });
  } catch (e) { res.status(500).json({ error: e.message }); }
}));

app.post("/api/onboarding/skip", requireAuth(async (req, res) => {
  try {
    const marcaId = req.user.marca_id;
    if (marcaId) {
      await q("UPDATE marcas SET updated_at = now() WHERE id = $1", [marcaId]);
    }
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
}));

// ── Campanha Audiência (preview de clientes alvo) ────────────────────────────
app.get("/api/campanhas/:id/audiencia", requireAuth(async (req, res) => {
  try {
    const marcaId = req.user.marca_id;
    const [campanha] = await q("SELECT * FROM campanhas WHERE id = $1", [req.params.id]);
    if (!campanha) return res.status(404).json({ error: "Campanha não encontrada" });

    const seg = campanha.segmento_alvo;
    const conds = ["marca_id = $1"];
    const params = [marcaId || campanha.marca_id];

    if (seg && seg !== "todos") {
      conds.push("segmento_rfm = $2");
      params.push(seg);
    }

    const clientes = await q(`
      SELECT id, nome, email, telefone, segmento_rfm, recencia_dias, total_pedidos, receita_total
      FROM clientes WHERE ${conds.join(" AND ")}
      ORDER BY receita_total DESC
    `, params);

    const total = clientes.length;
    const comTelefone = clientes.filter(c => c.telefone).length;
    const comEmail = clientes.filter(c => c.email).length;
    const receitaTotal = clientes.reduce((s, c) => s + (+c.receita_total || 0), 0);

    res.json({
      campanha,
      audiencia: clientes,
      stats: { total, comTelefone, comEmail, receitaTotal }
    });
  } catch (e) { res.status(500).json({ error: e.message }); }
}));

// ── Campanhas Stats / Duplicate / Update ─────────────────────────────────────
app.get("/api/campanhas/stats", requireAuth(async (req, res) => {
  try {
    const marcaId = req.user.marca_id;
    const w = marcaId ? "WHERE marca_id = $1" : "";
    const p = marcaId ? [marcaId] : [];
    const rows = await q(`SELECT COUNT(*) as total, COALESCE(SUM(enviados),0) as enviados, COALESCE(SUM(abertos),0) as abertos, COALESCE(SUM(convertidos),0) as convertidos, COALESCE(SUM(receita),0) as receita FROM campanhas ${w}`, p);
    const stats = rows[0] || { total: 0, enviados: 0, abertos: 0, convertidos: 0, receita: 0 };
    const porTipo = await q(`SELECT tipo, COUNT(*) as n FROM campanhas ${w} GROUP BY tipo`, p);
    const top = await q(`SELECT nome, tipo, enviados, abertos, convertidos, receita FROM campanhas ${w} ORDER BY receita DESC LIMIT 10`, p);
    res.json({ ...stats, por_tipo: porTipo, top_campanhas: top });
  } catch (e) { res.status(500).json({ error: e.message }); }
}));

app.patch("/api/campanhas/:id", requireAuth(async (req, res) => {
  try {
    const { id } = req.params;
    const fields = req.body;
    const keys = Object.keys(fields).filter(k => ["nome","tipo","segmento_alvo","mensagem","status"].includes(k));
    if (!keys.length) return res.status(400).json({ error: "No valid fields" });
    const sets = keys.map((k, i) => `${k} = $${i + 1}`).join(", ");
    const vals = keys.map(k => fields[k]);
    vals.push(id);
    await q(`UPDATE campanhas SET ${sets}, updated_at = now() WHERE id = $${vals.length}`, vals);
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
}));

app.post("/api/campanhas/:id/duplicate", requireAuth(async (req, res) => {
  try {
    const { id } = req.params;
    const rows = await q("SELECT * FROM campanhas WHERE id = $1", [id]);
    if (!rows.length) return res.status(404).json({ error: "Not found" });
    const c = rows[0];
    const newRow = await q(
      `INSERT INTO campanhas (nome, tipo, segmento_alvo, mensagem, status, enviados, abertos, convertidos, receita, marca_id) VALUES ($1,$2,$3,$4,'rascunho',0,0,0,0,$5) RETURNING *`,
      [c.nome + " (cópia)", c.tipo, c.segmento_alvo, c.mensagem, c.marca_id]
    );
    res.json(newRow[0]);
  } catch (e) { res.status(500).json({ error: e.message }); }
}));

// ── Admin Endpoints (miner only) ─────────────────────────────────────────────
app.get("/api/admin/users", requireAuth(async (req, res) => {
  if (req.user.role !== "miner") return res.status(403).json({ error: "Apenas admin" });
  try {
    const rows = await q(`
      SELECT u.id, u.nome, u.email, u.role, u.status, u.marca_id, u.loja, u.meta_mensal, u.last_login, u.created_at,
             m.nome as marca_nome
      FROM users u LEFT JOIN marcas m ON u.marca_id = m.id
      ORDER BY u.created_at
    `);
    res.json({ data: rows });
  } catch (e) { res.status(500).json({ error: e.message }); }
}));

app.patch("/api/admin/users/:id", requireAuth(async (req, res) => {
  if (req.user.role !== "miner") return res.status(403).json({ error: "Apenas admin" });
  try {
    const { role, status, marca_id, nome, meta_mensal } = req.body;
    const sets = []; const vals = [];
    if (role) { sets.push(`role = $${vals.length+1}`); vals.push(role); }
    if (status) { sets.push(`status = $${vals.length+1}`); vals.push(status); }
    if (marca_id !== undefined) { sets.push(`marca_id = $${vals.length+1}`); vals.push(marca_id || null); }
    if (nome) { sets.push(`nome = $${vals.length+1}`); vals.push(nome); }
    if (meta_mensal !== undefined) { sets.push(`meta_mensal = $${vals.length+1}`); vals.push(meta_mensal); }
    if (!sets.length) return res.status(400).json({ error: "Nothing to update" });
    vals.push(req.params.id);
    await q(`UPDATE users SET ${sets.join(", ")}, updated_at = now() WHERE id = $${vals.length}`, vals);
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
}));

app.post("/api/admin/users/:id/reset-password", requireAuth(async (req, res) => {
  if (req.user.role !== "miner") return res.status(403).json({ error: "Apenas admin" });
  try {
    const { password } = req.body;
    if (!password || password.length < 6) return res.status(400).json({ error: "Senha mínima 6 caracteres" });
    const [hash] = await q("SELECT crypt($1, gen_salt('bf')) as h", [password]);
    await q("UPDATE users SET password_hash = $1 WHERE id = $2", [hash.h, req.params.id]);
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
}));

app.get("/api/admin/system", requireAuth(async (req, res) => {
  if (req.user.role !== "miner") return res.status(403).json({ error: "Apenas admin" });
  try {
    const [{ count: users }] = await q("SELECT COUNT(*) as count FROM users");
    const [{ count: clientes }] = await q("SELECT COUNT(*) as count FROM clientes");
    const [{ count: pedidos }] = await q("SELECT COUNT(*) as count FROM pedidos");
    const [{ count: marcas }] = await q("SELECT COUNT(*) as count FROM marcas");
    const [{ count: sessions }] = await q("SELECT COUNT(*) as count FROM sessions WHERE expires_at > now()");
    const [{ count: tarefas }] = await q("SELECT COUNT(*) as count FROM tarefas");
    const [{ count: campanhas }] = await q("SELECT COUNT(*) as count FROM campanhas");
    res.json({
      status: "ok",
      uptime: process.uptime(),
      memory: process.memoryUsage(),
      db: { users: +users, clientes: +clientes, pedidos: +pedidos, marcas: +marcas, sessions_active: +sessions, tarefas: +tarefas, campanhas: +campanhas },
      ts: new Date().toISOString(),
    });
  } catch (e) { res.status(500).json({ error: e.message }); }
}));

app.post("/api/admin/clear-sessions", requireAuth(async (req, res) => {
  if (req.user.role !== "miner") return res.status(403).json({ error: "Apenas admin" });
  try {
    const result = await q("DELETE FROM sessions WHERE expires_at < now()");
    res.json({ ok: true, cleared: result.length || 0 });
  } catch (e) { res.status(500).json({ error: e.message }); }
}));

// ── Serve Frontend (static) ──────────────────────────────────────────────────
import path from "path";
import { fileURLToPath } from "url";
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const distPath = path.join(__dirname, "..", "dist");
app.use(express.static(distPath));
app.get("/{*splat}", (req, res) => {
  if (!req.path.startsWith("/api")) {
    res.sendFile(path.join(distPath, "index.html"));
  }
});

// ── Start (only when run directly, not when imported) ────────────────────────
if (process.env.VERCEL !== "1") {
  app.listen(PORT, "0.0.0.0", () => console.log(`🚀 CRM Miner API v5 on port ${PORT}`));
}

export default app;
