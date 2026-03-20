import React, { useState, useEffect } from "react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";
import { T, RFM_CFG } from "../../lib/theme";
import { Chip, KpiCard, SectionHeader } from "../../components/UI";
import { useToast } from "../../context/ToastContext";
import { fetchAdvancedStats, recalculateRFM } from "../../lib/api";

function MarcaRelatorios({ user }) {
  const [tab, setTab] = useState("executiva");
  const [adv, setAdv] = useState(null);
  const [loading, setLoading] = useState(true);
  const [recalcLoading, setRecalcLoading] = useState(false);
  const [showExport, setShowExport] = useState(false);
  const [copyMsg, setCopyMsg] = useState(false);

  const load = () => {
    setLoading(true);
    fetchAdvancedStats().then(d => { setAdv(d); setLoading(false); }).catch(() => setLoading(false));
  };
  useEffect(() => { load(); }, []);

  const tabs = [
    { k: "executiva", l: "Visão Executiva" },
    { k: "rfm", l: "Segmentação RFM" },
    { k: "cohort", l: "Cohort" },
    { k: "receita", l: "Receita por Canal" },
  ];

  const fmt = (v) => typeof v === "number" ? v.toLocaleString("pt-BR") : v;
  const fmtR = (v) => `R$ ${Number(v || 0).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  const fmtRk = (v) => `R$ ${(Number(v || 0) / 1000).toFixed(1)}k`;

  /* ── Export Functions ─────────────────────────────────────── */
  const exportPDF = () => {
    if (!adv) return;
    setShowExport(false);
    const kpis = [
      { label: "LTV Médio", value: fmtR(adv.ltv_medio), sub: `Máx: ${fmtR(adv.ltv_maximo)}` },
      { label: "Taxa Recompra", value: `${adv.taxa_recompra}%`, sub: "clientes com 2+ pedidos" },
      { label: "Clientes em Risco", value: fmt(adv.clientes_risco), sub: "segmento em_risco + inativo" },
      { label: "Novos (30d)", value: fmt(adv.novos_30d), sub: "últimos 30 dias" },
      { label: "Crescimento Receita", value: `${adv.crescimento_receita}%`, sub: "30d vs 60d anterior" },
    ];
    const kpiHtml = kpis.map(k => `<div class="kpi"><div class="kpi-label">${k.label}</div><div class="kpi-value">${k.value}</div><div class="kpi-sub">${k.sub}</div></div>`).join("");
    const rfmRows = (adv.rfm_receita || []).map(r => {
      const label = (typeof RFM_CFG !== "undefined" && RFM_CFG[r.seg]?.label) || r.seg;
      return `<tr><td>${label}</td><td>${fmt(Number(r.n))}</td><td>${fmtR(r.receita)}</td><td>${fmtR(r.ticket)}</td></tr>`;
    }).join("");
    const cohortRows = (adv.cohort || []).map(c => `<tr><td>${c.mes}</td><td>${fmt(Number(c.n))}</td></tr>`).join("");
    const canalRows = (adv.por_canal || []).map(c => `<tr><td style="text-transform:capitalize">${c.canal}</td><td>${fmtR(c.v)}</td><td>${fmt(Number(c.n))}</td></tr>`).join("");
    const w = window.open("", "_blank");
    if (!w) return;
    w.document.write(`<!DOCTYPE html><html><head><meta charset="utf-8"><title>Relatório CRM Miner</title><style>
      *{box-sizing:border-box;margin:0;padding:0}
      body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;padding:40px 48px;color:#1d1d1f;line-height:1.5;max-width:900px;margin:0 auto}
      h1{font-size:26px;font-weight:800;margin-bottom:4px}
      h2{font-size:17px;color:#4545F5;margin-top:36px;margin-bottom:12px;font-weight:700;letter-spacing:-0.2px}
      .subtitle{color:#6e6e73;font-size:13px;margin-bottom:36px}
      .kpi-row{display:flex;gap:14px;margin-bottom:28px;flex-wrap:wrap}
      .kpi{flex:1;min-width:140px;padding:16px 18px;border:1px solid #e5e5e7;border-radius:12px}
      .kpi-label{font-size:10px;color:#6e6e73;text-transform:uppercase;letter-spacing:0.6px;font-weight:600}
      .kpi-value{font-size:22px;font-weight:800;margin-top:4px;color:#1d1d1f}
      .kpi-sub{font-size:11px;color:#aeaeb2;margin-top:2px}
      table{width:100%;border-collapse:collapse;margin-top:12px;margin-bottom:8px}
      th{text-align:left;padding:8px 12px;border-bottom:2px solid #e5e5e7;font-size:10px;color:#6e6e73;text-transform:uppercase;letter-spacing:0.5px;font-weight:600}
      td{padding:8px 12px;border-bottom:1px solid #f0f0f2;font-size:13px}
      tr:last-child td{border-bottom:none}
      .footer{margin-top:48px;padding-top:16px;border-top:1px solid #e5e5e7;text-align:center;color:#aeaeb2;font-size:10px}
      @media print{body{padding:20px 24px}h1{font-size:22px}.kpi-value{font-size:18px}}
    </style></head><body>
      <h1>Relatório Executivo — CRM Miner</h1>
      <div class="subtitle">Gerado em ${new Date().toLocaleDateString("pt-BR")} às ${new Date().toLocaleTimeString("pt-BR")}</div>
      <h2>📊 Indicadores-Chave</h2>
      <div class="kpi-row">${kpiHtml}</div>
      <h2>🎯 Segmentação RFM</h2>
      <table><thead><tr><th>Segmento</th><th>Clientes</th><th>Receita</th><th>Ticket Médio</th></tr></thead><tbody>${rfmRows || "<tr><td colspan='4' style='color:#aeaeb2'>Sem dados</td></tr>"}</tbody></table>
      <h2>📅 Cohort — Novos Clientes por Mês</h2>
      <table><thead><tr><th>Mês</th><th>Clientes</th></tr></thead><tbody>${cohortRows || "<tr><td colspan='2' style='color:#aeaeb2'>Sem dados</td></tr>"}</tbody></table>
      <h2>📡 Receita por Canal</h2>
      <table><thead><tr><th>Canal</th><th>Receita</th><th>Clientes</th></tr></thead><tbody>${canalRows || "<tr><td colspan='3' style='color:#aeaeb2'>Sem dados</td></tr>"}</tbody></table>
      <div class="footer">CRM Miner v5 · Relatório gerado automaticamente</div>
    </body></html>`);
    w.document.close();
    setTimeout(() => w.print(), 600);
  };

  const exportCSV = () => {
    if (!adv) return;
    setShowExport(false);
    const BOM = "\uFEFF";
    let csv = BOM + "Segmento,Clientes,Receita,Ticket Médio\n";
    (adv.rfm_receita || []).forEach(r => {
      const label = (typeof RFM_CFG !== "undefined" && RFM_CFG[r.seg]?.label) || r.seg;
      csv += `"${label}",${r.n},${r.receita},${(+r.ticket).toFixed(2)}\n`;
    });
    csv += "\nCohort - Mês,Clientes\n";
    (adv.cohort || []).forEach(c => { csv += `${c.mes},${c.n}\n`; });
    csv += "\nCanal,Receita,Clientes\n";
    (adv.por_canal || []).forEach(c => { csv += `"${c.canal}",${c.v},${c.n}\n`; });
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `relatorio-crm-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const copyData = () => {
    if (!adv) return;
    setShowExport(false);
    const text = `Relatório CRM Miner — ${new Date().toLocaleDateString("pt-BR")}

📊 Indicadores-Chave
• LTV Médio: ${fmtR(adv.ltv_medio)}
• Taxa Recompra: ${adv.taxa_recompra}%
• Clientes em Risco: ${fmt(adv.clientes_risco)}
• Novos (30d): ${fmt(adv.novos_30d)}
• Crescimento Receita: ${adv.crescimento_receita}%

🎯 Segmentação RFM
${(adv.rfm_receita || []).map(r => {
  const label = (typeof RFM_CFG !== "undefined" && RFM_CFG[r.seg]?.label) || r.seg;
  return `• ${label}: ${fmt(Number(r.n))} clientes · ${fmtR(r.receita)} · Ticket ${fmtR(r.ticket)}`;
}).join("\n")}

📡 Receita por Canal
${(adv.por_canal || []).map(c => `• ${c.canal}: ${fmtR(c.v)} (${fmt(Number(c.n))} clientes)`).join("\n")}`;
    navigator.clipboard.writeText(text).then(() => {
      setCopyMsg(true);
      setTimeout(() => setCopyMsg(false), 2000);
    });
  };

  const exportMenuStyle = { padding: "10px 14px", fontSize: 13, fontWeight: 500, cursor: "pointer", borderRadius: 8, display: "flex", alignItems: "center", gap: 8, transition: "background 0.15s" };

  const handleRecalc = async () => {
    setRecalcLoading(true);
    try {
      await recalculateRFM();
      await load();
      toast("Segmentação RFM recalculada!", "success");
    } catch (e) { console.error(e); toast("Erro ao recalcular RFM", "error"); }
    setRecalcLoading(false);
  };

  const PIE_COLORS = ["#4545F5", "#28cd41", "#ff9500", "#ff3b30", "#8e44ef", "#00c7be", "#ffd60a"];

  return (
    <div className="fade-up">
      <SectionHeader tag="BI" title="Relatórios & Analytics" />

      {loading && <div className="ap-card" style={{ padding: "20px 24px", marginBottom: 20, textAlign: "center" }}><span style={{ fontSize: 13, color: T.muted }}>⏳ Carregando dados avançados...</span></div>}

      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 24, flexWrap: "wrap", gap: 12 }}>
        <div className="seg" style={{ display: "flex", gap: 4, background: "rgba(0,0,0,0.04)", borderRadius: 10, padding: 4, width: "fit-content" }}>
          {tabs.map(t => (
            <button key={t.k} className={`seg-btn ${tab === t.k ? "on" : ""}`} onClick={() => setTab(t.k)}>{t.l}</button>
          ))}
        </div>
        {!loading && adv && (
          <div style={{ position: "relative" }}>
            <button className="ap-btn ap-btn-secondary ap-btn-sm" onClick={() => setShowExport(!showExport)} style={{ display: "flex", alignItems: "center", gap: 6 }}>
              📥 Exportar
            </button>
            {showExport && (
              <>
                <div style={{ position: "fixed", inset: 0, zIndex: 99 }} onClick={() => setShowExport(false)} />
                <div style={{ position: "absolute", top: "100%", right: 0, marginTop: 8, background: "#fff", borderRadius: 14, boxShadow: "0 8px 32px rgba(0,0,0,0.12)", border: "1px solid rgba(0,0,0,0.06)", padding: 6, zIndex: 100, minWidth: 210 }}>
                  <div onClick={exportPDF} style={exportMenuStyle} onMouseEnter={e => e.currentTarget.style.background = "#f5f5f7"} onMouseLeave={e => e.currentTarget.style.background = "transparent"}>📄 Exportar PDF</div>
                  <div onClick={exportCSV} style={exportMenuStyle} onMouseEnter={e => e.currentTarget.style.background = "#f5f5f7"} onMouseLeave={e => e.currentTarget.style.background = "transparent"}>📊 Exportar CSV</div>
                  <div onClick={copyData} style={exportMenuStyle} onMouseEnter={e => e.currentTarget.style.background = "#f5f5f7"} onMouseLeave={e => e.currentTarget.style.background = "transparent"}>{copyMsg ? "✅ Copiado!" : "📋 Copiar Dados"}</div>
                </div>
              </>
            )}
          </div>
        )}
      </div>

      {!loading && adv && tab === "executiva" && (
        <div className="fade-up">
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: 16, marginBottom: 24 }}>
            <KpiCard label="LTV Médio" value={fmtR(adv.ltv_medio)} sub={`Máx: ${fmtR(adv.ltv_maximo)}`} color="#4545F5" icon="💎" />
            <KpiCard label="Taxa Recompra" value={`${adv.taxa_recompra}%`} sub="clientes com 2+ pedidos" color="#28cd41" icon="🔄" />
            <KpiCard label="Clientes em Risco" value={fmt(adv.clientes_risco)} sub="segmento em_risco + inativo" color="#ff3b30" icon="⚠️" />
            <KpiCard label="Novos (30d)" value={fmt(adv.novos_30d)} sub="últimos 30 dias" color="#8e44ef" icon="🆕" />
            <KpiCard label="Crescimento Receita" value={`${adv.crescimento_receita}%`} sub="30d vs 60d anterior" color={Number(adv.crescimento_receita) >= 0 ? "#28cd41" : "#ff3b30"} icon="📈" trend={Number(adv.crescimento_receita)} />
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
            <div className="ap-card" style={{ padding: "22px 24px" }}>
              <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 16 }}>Receita — Últimos 30d vs Anterior</h3>
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={[
                  { name: "60d anterior", valor: Number(adv.receita_60d_anterior || 0) },
                  { name: "Últimos 30d", valor: Number(adv.receita_30d || 0) },
                ]}>
                  <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 12 }} />
                  <Tooltip formatter={(v) => fmtR(v)} />
                  <Bar dataKey="valor" radius={[8, 8, 0, 0]}>
                    <Cell fill="#aeaeb2" />
                    <Cell fill="#4545F5" />
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
            <div className="ap-card" style={{ padding: "22px 24px" }}>
              <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 16 }}>Distribuição RFM</h3>
              <ResponsiveContainer width="100%" height={220}>
                <PieChart>
                  <Pie data={(adv.rfm_receita || []).map(r => ({ name: RFM_CFG[r.seg]?.label || r.seg, value: Number(r.n) }))} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label={({ name, value }) => `${name}: ${value}`}>
                    {(adv.rfm_receita || []).map((r, i) => <Cell key={i} fill={RFM_CFG[r.seg]?.c || PIE_COLORS[i % PIE_COLORS.length]} />)}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      )}

      {!loading && adv && tab === "rfm" && (
        <div className="fade-up">
          <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 20 }}>
            <button className="ap-btn ap-btn-primary ap-btn-sm" onClick={handleRecalc} disabled={recalcLoading}>
              {recalcLoading ? "⏳ Recalculando..." : "🔄 Recalcular RFM"}
            </button>
            {recalcLoading && <span style={{ fontSize: 13, color: T.muted }}>Processando segmentação...</span>}
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))", gap: 16 }}>
            {(adv.rfm_receita || []).map((r, i) => {
              const cfg = RFM_CFG[r.seg] || { label: r.seg, c: "#4545F5", bg: "#eeeeff" };
              return (
                <div key={i} className="ap-card" style={{ padding: "22px 24px", borderLeft: `4px solid ${cfg.c}` }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
                    <Chip label={cfg.label} c={cfg.c} bg={cfg.bg} />
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                    <div>
                      <div style={{ fontSize: 11, color: T.muted, textTransform: "uppercase", letterSpacing: "0.05em" }}>Clientes</div>
                      <div style={{ fontSize: 22, fontWeight: 800 }}>{fmt(Number(r.n))}</div>
                    </div>
                    <div>
                      <div style={{ fontSize: 11, color: T.muted, textTransform: "uppercase", letterSpacing: "0.05em" }}>Receita</div>
                      <div style={{ fontSize: 16, fontWeight: 700 }}>{fmtRk(r.receita)}</div>
                    </div>
                  </div>
                  <div style={{ marginTop: 8, fontSize: 13, color: T.muted }}>Ticket médio: {fmtR(r.ticket)}</div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {!loading && adv && tab === "cohort" && (
        <div className="fade-up">
          <div className="ap-card" style={{ padding: "22px 24px" }}>
            <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 16 }}>Novos Clientes por Mês (Cohort)</h3>
            <ResponsiveContainer width="100%" height={340}>
              <BarChart data={(adv.cohort || []).map(c => ({ mes: c.mes, clientes: Number(c.n) }))}>
                <XAxis dataKey="mes" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip />
                <Bar dataKey="clientes" fill="#4545F5" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {!loading && adv && tab === "receita" && (
        <div className="fade-up">
          <div className="ap-card" style={{ padding: "22px 24px", marginBottom: 20 }}>
            <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 16 }}>Receita por Canal</h3>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={(adv.por_canal || []).map(c => ({ canal: c.canal, receita: Number(c.v), clientes: Number(c.n) }))} layout="vertical">
                <XAxis type="number" tick={{ fontSize: 12 }} />
                <YAxis type="category" dataKey="canal" tick={{ fontSize: 12 }} width={100} />
                <Tooltip formatter={(v) => fmtR(v)} />
                <Bar dataKey="receita" fill="#8e44ef" radius={[0, 6, 6, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: 16 }}>
            {(adv.por_canal || []).map((c, i) => (
              <div key={i} className="ap-card" style={{ padding: "18px 22px" }}>
                <div style={{ fontSize: 13, fontWeight: 600, textTransform: "capitalize", marginBottom: 8 }}>{c.canal}</div>
                <div style={{ fontSize: 22, fontWeight: 800, color: PIE_COLORS[i % PIE_COLORS.length] }}>{fmtR(c.v)}</div>
                <div style={{ fontSize: 12, color: T.muted }}>{fmt(Number(c.n))} clientes</div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}


export default MarcaRelatorios;
