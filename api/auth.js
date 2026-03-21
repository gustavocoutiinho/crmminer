// ── Auth API — Login/Logout/Me ───────────────────────────────────────────────
// POST /api/auth?action=login  { email, password }
// POST /api/auth?action=logout { token }
// GET  /api/auth?action=me     (Authorization: Bearer <token>)
import crypto from "crypto";
import { Pool } from "pg";

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_SSL === "true" ? { rejectUnauthorized: false } : false,
});

async function query(text, params) {
  const { rows } = await pool.query(text, params);
  return rows;
}

function generateToken() {
  return crypto.randomBytes(32).toString("hex");
}

async function verifyPassword(plain, hash) {
  const rows = await query("SELECT crypt($1, $2) = $2 AS ok", [plain, hash]);
  return rows[0]?.ok === true;
}

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET,POST,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Authorization,Content-Type");
  if (req.method === "OPTIONS") return res.status(200).end();

  const { action } = req.query;

  try {
    // ── LOGIN ──
    if (action === "login" && req.method === "POST") {
      const { email, password } = req.body;
      if (!email || !password) return res.status(400).json({ error: "email and password required" });

      const users = await query("SELECT * FROM users WHERE email = $1 AND status = 'ativo'", [email.trim().toLowerCase()]);
      if (users.length === 0) return res.status(401).json({ error: "Email ou senha incorretos" });

      const user = users[0];
      const ok = await verifyPassword(password, user.password_hash);
      if (!ok) return res.status(401).json({ error: "Email ou senha incorretos" });

      // Criar sessão (expira em 7 dias)
      const token = generateToken();
      const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
      await query("INSERT INTO sessions (user_id, token, expires_at) VALUES ($1, $2, $3)", [user.id, token, expiresAt]);
      await query("UPDATE users SET last_login = now() WHERE id = $1", [user.id]);

      // Buscar marca
      let marca = null;
      if (user.marca_id) {
        const marcas = await query("SELECT * FROM marcas WHERE id = $1", [user.marca_id]);
        marca = marcas[0] || null;
      }

      return res.status(200).json({
        token,
        user: {
          id: user.id,
          email: user.email,
          nome: user.nome,
          role: user.role,
          marca_id: user.marca_id,
          marca: marca ? { id: marca.id, nome: marca.nome, segmento: marca.segmento } : null,
          loja: user.loja,
          avatar_url: user.avatar_url,
        },
      });
    }

    // ── ME (verify token) ──
    if (action === "me" && req.method === "GET") {
      const auth = req.headers.authorization;
      if (!auth?.startsWith("Bearer ")) return res.status(401).json({ error: "Token required" });
      const token = auth.slice(7);

      const sessions = await query(
        "SELECT s.*, u.* FROM sessions s JOIN users u ON s.user_id = u.id WHERE s.token = $1 AND s.expires_at > now()",
        [token]
      );
      if (sessions.length === 0) return res.status(401).json({ error: "Session expired" });

      const s = sessions[0];
      let marca = null;
      if (s.marca_id) {
        const marcas = await query("SELECT * FROM marcas WHERE id = $1", [s.marca_id]);
        marca = marcas[0] || null;
      }

      return res.status(200).json({
        user: {
          id: s.user_id,
          email: s.email,
          nome: s.nome,
          role: s.role,
          marca_id: s.marca_id,
          marca: marca ? { id: marca.id, nome: marca.nome, segmento: marca.segmento } : null,
          loja: s.loja,
        },
      });
    }

    // ── LOGOUT ──
    if (action === "logout" && req.method === "POST") {
      const auth = req.headers.authorization;
      if (auth?.startsWith("Bearer ")) {
        await query("DELETE FROM sessions WHERE token = $1", [auth.slice(7)]);
      }
      return res.status(200).json({ ok: true });
    }

    return res.status(400).json({ error: "Invalid action. Use: login, logout, me" });
  } catch (err) {
    console.error("[Auth Error]", err.message);
    return res.status(500).json({ error: err.message });
  }
}
