// ── DB API — Generic CRUD for CRM tables ────────────────────────────────────
// GET    /api/db?table=clientes&marca_id=xxx&limit=50&offset=0
// POST   /api/db?table=clientes   { ...record }
// PATCH  /api/db?table=clientes&id=xxx  { ...changes }
// DELETE /api/db?table=clientes&id=xxx
import { Pool } from "pg";

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_SSL === "true" ? { rejectUnauthorized: false } : false,
});

const ALLOWED_TABLES = ["clientes", "pedidos", "campanhas", "tarefas", "timeline", "mensagens", "conexoes_externas", "marcas"];

async function verifySession(req) {
  const auth = req.headers.authorization;
  if (!auth?.startsWith("Bearer ")) return null;
  const { rows } = await pool.query(
    "SELECT u.* FROM sessions s JOIN users u ON s.user_id = u.id WHERE s.token = $1 AND s.expires_at > now()",
    [auth.slice(7)]
  );
  return rows[0] || null;
}

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET,POST,PATCH,DELETE,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Authorization,Content-Type");
  if (req.method === "OPTIONS") return res.status(200).end();

  try {
    const user = await verifySession(req);
    if (!user) return res.status(401).json({ error: "Not authenticated" });

    const { table, id, marca_id, limit = "50", offset = "0", order, segmento_rfm } = req.query;

    if (!table || !ALLOWED_TABLES.includes(table)) {
      return res.status(400).json({ error: `Invalid table. Allowed: ${ALLOWED_TABLES.join(", ")}` });
    }

    // Determinar marca_id autorizada
    const userMarcaId = user.marca_id;
    const isMiner = user.role === "miner";

    // GET — listar
    if (req.method === "GET") {
      let sql = `SELECT * FROM ${table}`;
      const params = [];
      const conditions = [];

      // Filtro por marca (obrigatório pra non-miner em tabelas com marca_id)
      if (table !== "marcas") {
        if (isMiner && marca_id) {
          conditions.push(`marca_id = $${params.length + 1}`);
          params.push(marca_id);
        } else if (!isMiner && userMarcaId) {
          conditions.push(`marca_id = $${params.length + 1}`);
          params.push(userMarcaId);
        }
      } else if (!isMiner && userMarcaId) {
        conditions.push(`id = $${params.length + 1}`);
        params.push(userMarcaId);
      }

      if (id) {
        conditions.push(`id = $${params.length + 1}`);
        params.push(id);
      }

      if (segmento_rfm && table === "clientes") {
        conditions.push(`segmento_rfm = $${params.length + 1}`);
        params.push(segmento_rfm);
      }

      if (conditions.length > 0) sql += " WHERE " + conditions.join(" AND ");
      sql += ` ORDER BY ${order || "created_at"} DESC`;
      sql += ` LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
      params.push(parseInt(limit), parseInt(offset));

      const { rows } = await pool.query(sql, params);

      // Count total
      let countSql = `SELECT COUNT(*) as total FROM ${table}`;
      if (conditions.length > 0) countSql += " WHERE " + conditions.join(" AND ");
      const countParams = params.slice(0, -2); // remove limit/offset
      const { rows: countRows } = await pool.query(countSql, countParams);

      return res.status(200).json({ data: rows, total: parseInt(countRows[0]?.total || 0) });
    }

    // POST — criar
    if (req.method === "POST") {
      const record = { ...req.body };
      // Forçar marca_id se não for miner
      if (!isMiner && userMarcaId && table !== "marcas") {
        record.marca_id = userMarcaId;
      }
      const keys = Object.keys(record);
      const vals = Object.values(record);
      const placeholders = keys.map((_, i) => `$${i + 1}`).join(", ");
      const sql = `INSERT INTO ${table} (${keys.join(", ")}) VALUES (${placeholders}) RETURNING *`;
      const { rows } = await pool.query(sql, vals);
      return res.status(201).json({ data: rows[0] });
    }

    // PATCH — atualizar
    if (req.method === "PATCH") {
      if (!id) return res.status(400).json({ error: "id required for PATCH" });
      const changes = { ...req.body };
      delete changes.id;
      delete changes.created_at;
      const keys = Object.keys(changes);
      if (keys.length === 0) return res.status(400).json({ error: "No fields to update" });
      const sets = keys.map((k, i) => `${k} = $${i + 1}`).join(", ");
      const vals = [...Object.values(changes), id];
      let sql = `UPDATE ${table} SET ${sets} WHERE id = $${vals.length}`;
      if (!isMiner && userMarcaId && table !== "marcas") {
        sql += ` AND marca_id = $${vals.length + 1}`;
        vals.push(userMarcaId);
      }
      sql += " RETURNING *";
      const { rows } = await pool.query(sql, vals);
      return res.status(200).json({ data: rows[0] || null });
    }

    // DELETE
    if (req.method === "DELETE") {
      if (!id) return res.status(400).json({ error: "id required for DELETE" });
      let sql = `DELETE FROM ${table} WHERE id = $1`;
      const params = [id];
      if (!isMiner && userMarcaId && table !== "marcas") {
        sql += ` AND marca_id = $2`;
        params.push(userMarcaId);
      }
      sql += " RETURNING id";
      const { rows } = await pool.query(sql, params);
      return res.status(200).json({ deleted: rows.length > 0 });
    }

    return res.status(405).json({ error: "Method not allowed" });
  } catch (err) {
    console.error("[DB API Error]", err.message);
    return res.status(500).json({ error: err.message });
  }
}
