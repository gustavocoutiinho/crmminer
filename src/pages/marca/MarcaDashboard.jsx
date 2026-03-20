import React, { useState, useEffect, useCallback } from "react";
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";
import { T, ROLE_CFG, RFM_CFG } from "../../lib/theme";
import { Avatar, Chip, KpiCard, ProgressBar, SectionHeader, ApTooltip } from "../../components/UI";
import { fetchStats } from "../../lib/api";
import VendedorDashboard from "./VendedorDashboard";
import AgendaDono from "./AgendaDono";

function MarcaDashboard({ user, setPage }) {
  if (user.role === "vendedor") return <VendedorDashboard user={user} setPage={setPage} />;

  const rd = ROLE_CFG[user.role] || ROLE_CFG.vendedor;
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  const loadStats = useCallback(() => {
    fetchStats().then(s => { setStats(s); setLoading(false); }).catch(() => setLoading(false));
  }, []);

  useEffect(() => { loadStats(); }, []);
  useEffect(() => { const iv = setInterval(loadStats, 30000); return () => clearInterval(iv); }, [loadStats]);

  const c = stats?.clientes || 0;
  const p = stats?.pedidos || 0;
  const r = stats?.receita || 0;
  const tm = stats?.ticket_medio || 0;
  const rfm = stats?.rfm || {};
  const topCli = stats?.top_clientes || [];
  const porMes = (stats?.pedidos_por_mes || []).map(m => ({ m: m.mes?.slice(5) || "", v: +m.v }));
  const totalRfm = Object.values(rfm).reduce((s,n) => s+n, 0) || 1;

  return (
    <div className="fade-up">
      <div style={{ marginBottom: 28 }}>
        <div style={{ fontSize: 10, fontWeight: 700, color: "#4545F5", letterSpacing: 0.8, textTransform: "uppercase", marginBottom: 6 }}>{rd.icon} {rd.label}</div>
        <h1 style={{ fontSize: 28, fontWeight: 700 }}>Olá, {user.nome.split(" ")[0]} 👋</h1>
        <p style={{ fontSize: 14, color: T.sub, marginTop: 4 }}>{new Date().toLocaleDateString("pt-BR", { weekday: "long", day: "numeric", month: "long" })}</p>
      </div>

      {loading && <div className="ap-card" style={{ padding: "20px 24px", marginBottom: 20, textAlign: "center" }}><span style={{ fontSize: 13, color: T.muted }}>⏳ Carregando dados...</span></div>}

      <div className="kpi-grid-4" style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 14, marginBottom: 20 }}>
        <KpiCard label="Clientes" value={c.toLocaleString("pt-BR")} sub="cadastrados" color="#28cd41" icon="👥" />
        <KpiCard label="Pedidos" value={p.toLocaleString("pt-BR")} sub="aprovados" color="#4545F5" icon="🛍" />
        <KpiCard label="Receita" value={`R$ ${(r/1000).toFixed(1)}k`} sub="total aprovada" color="#8e44ef" icon="💰" />
        <KpiCard label="Ticket Médio" value={`R$ ${tm.toFixed(0)}`} sub="por pedido" color="#ff9500" icon="📊" />
      </div>

      <AgendaDono onViewCliente={(id) => { if (setPage) setPage("clientes"); }} />

      <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: 16, marginBottom: 16 }}>
        <div className="ap-card" style={{ padding: "22px 24px" }}>
          <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 4 }}>Receita Mensal</div>
          <div style={{ fontSize: 12, color: T.muted, marginBottom: 16 }}>Últimos meses — dados reais Shopify</div>
          {porMes.length > 0 ? (
            <ResponsiveContainer width="100%" height={180}>
              <AreaChart data={porMes}>
                <defs><linearGradient id="gr" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#4545F5" stopOpacity={0.2}/><stop offset="95%" stopColor="#4545F5" stopOpacity={0}/></linearGradient></defs>
                <XAxis dataKey="m" tick={{ fill: T.muted, fontSize: 11 }} axisLine={false} tickLine={false}/>
                <YAxis hide/>
                <Tooltip content={<ApTooltip/>}/>
                <Area type="monotone" dataKey="v" name="Receita" stroke="#4545F5" strokeWidth={2.5} fill="url(#gr)" dot={false}/>
              </AreaChart>
            </ResponsiveContainer>
          ) : <div style={{ textAlign: "center", padding: 40, color: T.muted }}>Sem dados de receita</div>}
        </div>

        <div className="ap-card" style={{ padding: "22px 24px" }}>
          <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 16 }}>Segmentação RFM</div>
          {Object.entries(RFM_CFG).map(([key, cfg], i) => (
            <div key={key} style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 0", borderBottom: i < 4 ? "1px solid rgba(0,0,0,0.05)" : "none" }}>
              <Chip label={cfg.label} c={cfg.c} bg={cfg.bg}/>
              <div style={{ flex: 1 }}><ProgressBar value={rfm[key] || 0} max={totalRfm} height={5}/></div>
              <span className="num" style={{ fontSize: 12, fontWeight: 700, color: cfg.c }}>{(rfm[key] || 0).toLocaleString("pt-BR")}</span>
            </div>
          ))}
        </div>
      </div>

      {topCli.length > 0 && (
        <div className="ap-card" style={{ padding: 0, overflow: "hidden" }}>
          <div style={{ padding: "16px 22px", borderBottom: "1px solid rgba(0,0,0,0.06)", display: "flex", justifyContent: "space-between" }}>
            <span style={{ fontSize: 15, fontWeight: 700 }}>Top 10 Clientes por Receita</span>
            <span style={{ fontSize: 12, color: T.muted }}>dados reais Shopify</span>
          </div>
          {topCli.map((cl, i) => (
            <div key={i} style={{ display: "flex", alignItems: "center", gap: 14, padding: "12px 22px", borderBottom: i < topCli.length-1 ? "1px solid rgba(0,0,0,0.05)" : "none" }}>
              <span className="num" style={{ fontSize: 11, color: T.muted, fontWeight: 700, width: 20, textAlign: "right" }}>{i+1}</span>
              <Avatar nome={cl.nome} size={32}/>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 14, fontWeight: 700 }}>{cl.nome}</div>
                <div style={{ fontSize: 11, color: T.muted }}>{cl.email || "—"} · {cl.total_pedidos} pedidos</div>
              </div>
              <Chip label={RFM_CFG[cl.segmento_rfm]?.label || "—"} c={RFM_CFG[cl.segmento_rfm]?.c} bg={RFM_CFG[cl.segmento_rfm]?.bg}/>
              <span className="num" style={{ fontSize: 14, fontWeight: 700, color: "#4545F5" }}>R$ {(+cl.receita_total).toLocaleString("pt-BR")}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default MarcaDashboard;
