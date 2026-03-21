// ── Vercel Serverless Function: Webhook receiver ─────────────────────────────
// POST /api/webhook
// Recebe eventos de Shopify, WhatsApp, etc. e encaminha pro Supabase
import crypto from "crypto";

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

async function supabaseFetch(path, opts = {}) {
  if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
    throw new Error("Supabase not configured");
  }
  return fetch(`${SUPABASE_URL}${path}`, {
    ...opts,
    headers: {
      apikey: SUPABASE_SERVICE_KEY,
      Authorization: `Bearer ${SUPABASE_SERVICE_KEY}`,
      "Content-Type": "application/json",
      Prefer: "return=representation",
      ...(opts.headers || {}),
    },
  });
}

function verifyShopifyHmac(body, secret, hmacHeader) {
  const hash = crypto.createHmac("sha256", secret).update(body, "utf8").digest("base64");
  return crypto.timingSafeEqual(Buffer.from(hash), Buffer.from(hmacHeader));
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { source, marca_id } = req.query;
    const body = req.body;

    if (!source || !marca_id) {
      return res.status(400).json({ error: "Missing source or marca_id query params" });
    }

    // ── Shopify webhook ──
    if (source === "shopify") {
      const hmac = req.headers["x-shopify-hmac-sha256"];
      const shopifySecret = process.env.SHOPIFY_WEBHOOK_SECRET;

      if (shopifySecret && hmac) {
        const rawBody = JSON.stringify(body);
        if (!verifyShopifyHmac(rawBody, shopifySecret, hmac)) {
          return res.status(401).json({ error: "Invalid HMAC signature" });
        }
      }

      const topic = req.headers["x-shopify-topic"];

      if (topic === "orders/create" || topic === "orders/paid") {
        const order = body;
        // Upsert cliente
        const customerEmail = order.customer?.email;
        if (customerEmail) {
          const cliente = {
            marca_id,
            nome: `${order.customer.first_name || ""} ${order.customer.last_name || ""}`.trim(),
            email: customerEmail,
            telefone: order.customer.phone || null,
          };
          await supabaseFetch(`/rest/v1/clientes?email=eq.${encodeURIComponent(customerEmail)}&marca_id=eq.${marca_id}`, {
            method: "POST",
            headers: { Prefer: "resolution=merge-duplicates,return=representation" },
            body: JSON.stringify(cliente),
          });
        }

        // Criar pedido
        const pedido = {
          marca_id,
          valor: parseFloat(order.total_price) || 0,
          status: order.financial_status === "paid" ? "aprovado" : "pendente",
          origem: "shopify",
          external_id: String(order.id),
        };
        await supabaseFetch("/rest/v1/pedidos", {
          method: "POST",
          body: JSON.stringify(pedido),
        });

        return res.status(200).json({ ok: true, action: "order_processed" });
      }

      return res.status(200).json({ ok: true, action: "ignored", topic });
    }

    // ── WhatsApp Cloud API webhook ──
    if (source === "whatsapp") {
      // Verificar webhook (GET challenge)
      // Para POST: processar mensagens recebidas
      const entry = body.entry?.[0];
      const changes = entry?.changes?.[0];
      const message = changes?.value?.messages?.[0];

      if (message) {
        const from = message.from;
        const text = message.text?.body || "";
        // Log da mensagem (pode ser usado para qualificação automática)
        console.log(`[WhatsApp] ${from}: ${text}`);
      }

      return res.status(200).json({ ok: true });
    }

    // ── Generic webhook ──
    console.log(`[Webhook] source=${source} marca=${marca_id}`, JSON.stringify(body).slice(0, 500));
    return res.status(200).json({ ok: true, action: "logged" });

  } catch (err) {
    console.error("[Webhook Error]", err.message);
    return res.status(500).json({ error: err.message });
  }
}
