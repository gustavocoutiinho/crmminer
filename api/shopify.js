// ── Shopify API Proxy ────────────────────────────────────────────────────────
// GET /api/shopify?endpoint=/admin/api/2024-01/customers.json
// Protege o token: frontend chama este proxy, proxy chama Shopify com token seguro

export default async function handler(req, res) {
  // CORS
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.status(200).end();

  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const shopifyStore = process.env.SHOPIFY_STORE || "prlsteste.myshopify.com";
  const shopifyToken = process.env.SHOPIFY_ACCESS_TOKEN;

  if (!shopifyToken) {
    return res.status(500).json({ error: "Shopify token not configured" });
  }

  const { endpoint } = req.query;
  if (!endpoint) {
    return res.status(400).json({ error: "endpoint query param required" });
  }

  // Segurança: só permitir endpoints da Admin API
  if (!endpoint.startsWith("/admin/api/")) {
    return res.status(403).json({ error: "Invalid endpoint" });
  }

  try {
    const url = `https://${shopifyStore}${endpoint}`;
    const shopifyRes = await fetch(url, {
      headers: {
        "X-Shopify-Access-Token": shopifyToken,
        "Content-Type": "application/json",
      },
    });

    if (!shopifyRes.ok) {
      const errText = await shopifyRes.text().catch(() => "");
      return res.status(shopifyRes.status).json({
        error: `Shopify API error: ${shopifyRes.status}`,
        details: errText.slice(0, 500),
      });
    }

    const data = await shopifyRes.json();

    // Cache 60s para reduzir chamadas à API
    res.setHeader("Cache-Control", "s-maxage=60, stale-while-revalidate=300");
    return res.status(200).json(data);
  } catch (err) {
    console.error("[Shopify Proxy Error]", err.message);
    return res.status(500).json({ error: err.message });
  }
}
