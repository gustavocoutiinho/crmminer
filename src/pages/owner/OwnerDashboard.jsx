import React, { useState, useEffect } from "react";
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";
import { T, PLANO_CFG, RFM_CFG } from "../../lib/theme";
import { Avatar, Chip, KpiCard, SectionHeader, ApTooltip } from "../../components/UI";
import { fetchOwnerStats } from "../../lib/api";
import { DB_FALLBACK } from "../../data/fallback";
import { computeMRR, PLANOS } from "../../utils/helpers";

function OwnerDashboard({ marcas }) {
  const [ownerData, setOwnerData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchOwnerStats()
      .then((d) => { setOwnerData(d); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  // Compute MRR from marcas prop (always available)
  const mrr = marcas.filter((m) => m.status === "ativo").reduce((s, m) => s + computeMRR(m), 0);
  const ativos = marcas.filter((m) => m.status === "ativo").length;

  // Use API data when available, fallback to local
  const clientesTotal = ownerData ? ownerData.clientes_total : marcas.reduce((s, m) => s + (m.clientes || 0), 0);
  const clientesNovos = ownerData ? ownerData.clientes_novos_30d : 0;
  const receita30d = ownerData ? ownerData.receita_30d : 0;
  const crescimento = ownerData ? ownerData.crescimento : 0;
  const marcaStats = ownerData ? ownerData.marcas : [];
  const mensalData = ownerData && ownerData.mensal.length > 0
    ? ownerData.mensal.map((m) => ({ m: m.mes, v: m.receita }))
    : DB_FALLBACK.mrrHist;
  const rfmData = ownerData ? ownerData.rfm : {};

  const RFM_COLORS = ["#4545F5", "#8e44ef", "#28cd41", "#ff9500", "#ff3b30", "#5ac8fa", "#af52de"];
  const rfmEntries = Object.entries(rfmData);
  const rfmPieData = rfmEntries.map(([seg, n]) => ({ name: RFM_CFG[seg]?.label || seg, value: n }));

  if (loading) return <div style={{ textAlign: "center", padding: 60, color: T.muted }}>Carregando analytics...</div>;

  return (
    <div className="fade-up">
      <SectionHeader tag="Owner" title="Visão Geral do Negócio" />

      {/* Growth indicator */}
      <div className="ap-card" style={{ padding: "16px 24px", marginBottom: 16, display: "flex", alignItems: "center", gap: 14, background: crescimento >= 0 ? "rgba(40,205,65,0.06)" : "rgba(255,59,48,0.06)", border: `1px solid ${crescimento >= 0 ? "rgba(40,205,65,0.2)" : "rgba(255,59,48,0.2)"}` }}>
        <span style={{ fontSize: 32 }}>{crescimento >= 0 ? "📈" : "📉"}</span>
        <div>
          <div style={{ fontSize: 22, fontWeight: 800, color: crescimento >= 0 ? "#28cd41" : "#ff3b30" }}>
            {crescimento >= 0 ? "+" : ""}{crescimento}% vs mês anterior
          </div>
          <div style={{ fontSize: 12, color: T.muted }}>Comparação de receita: últimos 30 dias vs 30 dias anteriores</div>
        </div>
      </div>

      {/* 6 KPI cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 14, marginBottom: 20 }}>
        <KpiCard label="MRR Total" value={`R$ ${mrr.toLocaleString("pt-BR")}`} sub="Receita mensal recorrente" color="#4545F5" icon="💳" />
        <KpiCard label="Receita 30d" value={`R$ ${Number(receita30d).toLocaleString("pt-BR")}`} sub="Últimos 30 dias" color="#5856d6" icon="💰" />
        <KpiCard label="Crescimento" value={`${crescimento >= 0 ? "+" : ""}${crescimento}%`} sub="vs mês anterior" color={crescimento >= 0 ? "#28cd41" : "#ff3b30"} icon={crescimento >= 0 ? "🚀" : "⚠️"} />
        <KpiCard label="Clientes Total" value={clientesTotal.toLocaleString("pt-BR")} sub="em todas as marcas" color="#28cd41" icon="👥" />
        <KpiCard label="Clientes Novos" value={clientesNovos.toLocaleString("pt-BR")} sub="últimos 30 dias" color="#5ac8fa" icon="🆕" />
        <KpiCard label="Marcas Ativas" value={ativos} sub={`${marcas.filter((m) => m.status === "trial").length} em trial`} color="#8e44ef" icon="🏢" />
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: 16, marginBottom: 16 }}>
        {/* Revenue chart with real data */}
        <div className="ap-card" style={{ padding: "22px 24px" }}>
          <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 4 }}>Receita Mensal</div>
          <div style={{ fontSize: 12, color: T.muted, marginBottom: 18 }}>Últimos 6 meses</div>
          <ResponsiveContainer width="100%" height={200}>
            <AreaChart data={mensalData}>
              <defs>
                <linearGradient id="gm" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#4545F5" stopOpacity={0.22} />
                  <stop offset="95%" stopColor="#4545F5" stopOpacity={0} />
                </linearGradient>
              </defs>
              <XAxis dataKey="m" tick={{ fill: T.muted, fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis hide />
              <Tooltip content={<ApTooltip />} />
              <Area type="monotone" dataKey="v" name="Receita" stroke="#4545F5" strokeWidth={2.5} fill="url(#gm)" dot={false} />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* RFM Distribution Pie */}
        <div className="ap-card" style={{ padding: "22px 24px" }}>
          <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 16 }}>Distribuição RFM</div>
          {rfmPieData.length > 0 ? (
            <>
              <ResponsiveContainer width="100%" height={160}>
                <PieChart>
                  <Pie data={rfmPieData} cx="50%" cy="50%" innerRadius={36} outerRadius={60} paddingAngle={3} dataKey="value">
                    {rfmPieData.map((_, i) => <Cell key={i} fill={RFM_COLORS[i % RFM_COLORS.length]} />)}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 8 }}>
                {rfmPieData.map((entry, i) => (
                  <div key={i} style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 11 }}>
                    <span style={{ width: 8, height: 8, borderRadius: "50%", background: RFM_COLORS[i % RFM_COLORS.length], display: "inline-block" }} />
                    <span style={{ color: T.sub }}>{entry.name}: <b>{entry.value}</b></span>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <div style={{ textAlign: "center", padding: 40, color: T.muted, fontSize: 13 }}>Sem dados RFM</div>
          )}
        </div>
      </div>

      {/* Per-Marca Performance Table */}
      <div className="ap-card" style={{ padding: 0, overflow: "hidden" }}>
        <div style={{ padding: "16px 22px", borderBottom: "1px solid rgba(0,0,0,0.06)" }}>
          <span style={{ fontSize: 15, fontWeight: 700 }}>Performance por Marca</span>
          <span style={{ fontSize: 12, color: T.muted, marginLeft: 10 }}>ordenado por receita</span>
        </div>
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
            <thead>
              <tr style={{ background: "rgba(0,0,0,0.02)" }}>
                {["Marca", "Plano", "Status", "Clientes", "Pedidos (30d)", "Receita (30d)", "Usuários"].map((h) => (
                  <th key={h} style={{ padding: "10px 16px", textAlign: "left", fontWeight: 700, fontSize: 11, color: T.muted, textTransform: "uppercase", letterSpacing: "0.5px" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {(marcaStats.length > 0 ? marcaStats : marcas).map((m, i) => (
                <tr key={m.id || i} style={{ borderBottom: "1px solid rgba(0,0,0,0.04)" }}>
                  <td style={{ padding: "12px 16px", fontWeight: 700 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      <div style={{ width: 32, height: 32, borderRadius: 9, background: "rgba(0,0,0,0.06)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, fontWeight: 800, flexShrink: 0 }}>{m.nome?.[0] || "?"}</div>
                      {m.nome}
                    </div>
                  </td>
                  <td style={{ padding: "12px 16px" }}>
                    <Chip label={PLANOS.find((p) => p.id === m.plano)?.label || m.plano} c={PLANO_CFG[m.plano]?.c} bg={PLANO_CFG[m.plano]?.bg} />
                  </td>
                  <td style={{ padding: "12px 16px" }}>
                    <Chip label={STATUS_CFG[m.status]?.label || m.status} c={STATUS_CFG[m.status]?.c} bg={STATUS_CFG[m.status]?.bg} />
                  </td>
                  <td style={{ padding: "12px 16px" }} className="num">{m.clientes || 0}</td>
                  <td style={{ padding: "12px 16px" }} className="num">{m.pedidos_30d || 0}</td>
                  <td style={{ padding: "12px 16px", fontWeight: 700, color: "#4545F5" }} className="num">R$ {Number(m.receita_30d || 0).toLocaleString("pt-BR")}</td>
                  <td style={{ padding: "12px 16px" }} className="num">{m.usuarios || 0}</td>
                </tr>
              ))}
              {marcaStats.length === 0 && marcas.length === 0 && (
                <tr><td colSpan={7} style={{ padding: 30, textAlign: "center", color: T.muted }}>Nenhuma marca cadastrada</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

export default OwnerDashboard;
