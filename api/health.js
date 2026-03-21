// ── Health check endpoint ────────────────────────────────────────────────────
// GET /api/health
export default function handler(req, res) {
  res.status(200).json({
    status: "ok",
    timestamp: new Date().toISOString(),
    version: "2.0.0",
    supabase: process.env.SUPABASE_URL ? "configured" : "not configured",
  });
}
