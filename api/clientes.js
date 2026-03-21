// ── API: Clientes CRUD ───────────────────────────────────────────────────────
// GET/POST /api/clientes?marca_id=xxx
// Autenticação via header: Authorization: Bearer <api_key>
import crypto from "crypto";

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

async function sbFetch(path, opts = {}) {
  if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
    throw new Error("Supabase not configured");
  }
  const res = await fetch(`${SUPABASE_URL}${path}`, {
    ...opts,
    headers: {
      apikey: SUPABASE_SERVICE_KEY,
      Authorization: `Bearer ${SUPABASE_SERVICE_KEY}`,
      "Content-Type": "application/json",
      ...(opts.headers || {}),
    },
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || res.statusText);
  }
  if (res.status === 204) return null;
  return res.json();
}

async function validateApiKey(authHeader, marcaId) {
  if (!authHeader?.startsWith("Bearer ")) return false;
  const key = authHeader.slice(7);
  const keyHash = crypto.createHash("sha256").update(key).digest("hex");
  
  const keys = await sbFetch(
    `/rest/v1/api_keys?key_hash=eq.${keyHash}&marca_id=eq.${marcaId}&ativo=eq.true&select=id`
  );
  
  if (keys && keys.length > 0) {
    // Update ultimo_uso
    await sbFetch(`/rest/v1/api_keys?id=eq.${keys[0].id}`, {
      method: "PATCH",
      body: JSON.stringify({ ultimo_uso: new Date().toISOString() }),
    });
    return true;
  }
  return false;
}

export default async function handler(req, res) {
  // CORS
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET,POST,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Authorization,Content-Type");
  if (req.method === "OPTIONS") return res.status(200).end();

  try {
    const { marca_id, segmento_rfm, limit = "50", offset = "0" } = req.query;
    if (!marca_id) return res.status(400).json({ error: "marca_id required" });

    // Validar API key
    const valid = await validateApiKey(req.headers.authorization, marca_id);
    if (!valid) return res.status(401).json({ error: "Invalid or missing API key" });

    // GET — listar clientes
    if (req.method === "GET") {
      let path = `/rest/v1/clientes?marca_id=eq.${marca_id}&select=*&order=created_at.desc&limit=${limit}&offset=${offset}`;
      if (segmento_rfm) path += `&segmento_rfm=eq.${segmento_rfm}`;
      
      const data = await sbFetch(path);
      return res.status(200).json({ data, meta: { limit: +limit, offset: +offset } });
    }

    // POST — criar cliente
    if (req.method === "POST") {
      const { nome, email, telefone } = req.body;
      if (!nome) return res.status(400).json({ error: "nome required" });

      const cliente = { marca_id, nome, email: email || null, telefone: telefone || null };
      const data = await sbFetch("/rest/v1/clientes", {
        method: "POST",
        headers: { Prefer: "return=representation" },
        body: JSON.stringify(cliente),
      });
      return res.status(201).json({ data });
    }

    return res.status(405).json({ error: "Method not allowed" });
  } catch (err) {
    console.error("[API Clientes Error]", err.message);
    return res.status(500).json({ error: err.message });
  }
}
