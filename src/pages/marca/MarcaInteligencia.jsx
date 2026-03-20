import React, { useState, useEffect } from "react";
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip } from "recharts";
import { T, RFM_CFG } from "../../lib/theme";
import { Avatar, Chip, KpiCard, ProgressBar, SectionHeader } from "../../components/UI";
import { useToast } from "../../context/ToastContext";
import { calculateChurnScores, fetchAcoesPendentes } from "../../lib/api";

const CHURN_COLOR = (v) => v < 25 ? "#28cd41" : v < 50 ? "#ff9500" : v < 75 ? "#ff6b35" : "#ff3b30";

function MarcaInteligencia({ user }) {
  const toast = useToast();
  const [tab, setTab] = useState("visao");
  const [loading, setLoading] = useState(false);
  const [dist, setDist] = useState(null);
  const [acoes, setAcoes] = useState([]);
  const [filtro, setFiltro] = useState("");
  const [pendentes, setPendentes] = useState([]);
  const [pendLoading, setPendLoading] = useState(false);

  const loadScores = async () => {
    setLoading(true);
    try {
      const res = await calculateChurnScores();
      const churnDist = res.churn_distribuicao || {};
      setDist({
        baixo: parseInt(churnDist.baixo) || 0,
        medio: parseInt(churnDist.medio) || 0,
        alto: parseInt(churnDist.alto) || 0,
        critico: parseInt(churnDist.critico) || 0,
      });
      setAcoes(res.proxima_acao || []);
      const totalClientes = (res.proxima_acao || []).reduce((s, a) => s + parseInt(a.n || 0), 0);
      toast(`Scores calculados! ${totalClientes} clientes analisados`, "success");
    } catch (e) { console.error(e); toast("Erro ao calcular scores", "error"); }
    setLoading(false);
  };

  const loadPendentes = async (acao) => {
    setPendLoading(true);
    try {
      const res = await fetchAcoesPendentes(acao || undefined, 20);
      setPendentes(res.data || []);
    } catch (e) { console.error(e); }
    setPendLoading(false);
  };

  useEffect(() => { loadScores(); }, []);
  useEffect(() => { if (tab === "acoes") loadPendentes(filtro); }, [tab, filtro]);

  const tabs = [
    { key: "visao", label: "Visão Geral" },
    { key: "acoes", label: "Ações Pendentes" },
    { key: "recs", label: "Recomendações" },
  ];

  const pieData = dist ? [
    { name: "Baixo", value: dist.baixo || 0, color: "#28cd41" },
    { name: "Médio", value: dist.medio || 0, color: "#ff9500" },
    { name: "Alto", value: dist.alto || 0, color: "#ff6b35" },
    { name: "Crítico", value: dist.critico || 0, color: "#ff3b30" },
  ] : [];

  const RECS = [
    { acao: "primeiro_contato", titulo: "Criar campanha de boas-vindas", desc: "Novos clientes precisam de nutrição inicial para se tornarem recorrentes." },
    { acao: "win_back", titulo: "Criar automação de reativação com cupom", desc: "Clientes perdidos respondem bem a ofertas agressivas de retorno." },
    { acao: "reengajar", titulo: "Enviar newsletter com novidades", desc: "Manter a marca presente para clientes que estão esfriando." },
    { acao: "cross_sell", titulo: "Sugerir produtos complementares", desc: "Aumentar ticket médio oferecendo itens relacionados à última compra." },
    { acao: "upsell", titulo: "Oferecer upgrade ou combo", desc: "Clientes engajados têm alta propensão a aceitar upgrades." },
  ];

  const acaoCount = (key) => {
    const a = acoes.find((x) => x.proxima_acao === key);
    return a ? parseInt(a.n) || 0 : 0;
  };

  const FILTROS = [
    { key: "", label: "Todos" },
    { key: "cross_sell", label: "Cross-sell" },
    { key: "upsell", label: "Upsell" },
    { key: "reengajar", label: "Reengajar" },
    { key: "reativar", label: "Reativar" },
    { key: "win_back", label: "Win Back" },
    { key: "primeiro_contato", label: "1º Contato" },
  ];

  return (
    <div>
      <SectionHeader tag="Customer Intelligence" title="Inteligência do Cliente" />

      <div style={{ display: "flex", gap: 6, marginBottom: 24 }}>
        {tabs.map((t) => (
          <button key={t.key} className={`ap-btn ${tab === t.key ? "ap-btn-primary" : ""}`} onClick={() => setTab(t.key)} style={{ fontSize: 13 }}>{t.label}</button>
        ))}
      </div>

      {/* ── Tab: Visão Geral ── */}
      {tab === "visao" && (
        <div>
          <div style={{ marginBottom: 20 }}>
            <button className="ap-btn ap-btn-primary" onClick={loadScores} disabled={loading} style={{ fontSize: 13 }}>
              {loading ? "⏳ Calculando..." : "🧠 Calcular Scores"}
            </button>
          </div>

          {dist && (
            <>
              <div className="kpi-grid" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 16, marginBottom: 28 }}>
                <KpiCard label="Baixo Risco" value={dist.baixo || 0} sub="Churn < 25" color="#28cd41" icon="✅" />
                <KpiCard label="Médio Risco" value={dist.medio || 0} sub="Churn 25-49" color="#ff9500" icon="⚠️" />
                <KpiCard label="Alto Risco" value={dist.alto || 0} sub="Churn 50-74" color="#ff6b35" icon="🔶" />
                <KpiCard label="Crítico" value={dist.critico || 0} sub="Churn ≥ 75" color="#ff3b30" icon="🔴" />
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24 }}>
                {/* Pie Chart */}
                <div style={{ background: "#fff", borderRadius: 18, padding: 24, border: "1px solid rgba(0,0,0,0.06)" }}>
                  <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 16 }}>Distribuição de Churn</div>
                  <ResponsiveContainer width="100%" height={260}>
                    <PieChart>
                      <Pie data={pieData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={100} innerRadius={55} paddingAngle={3} strokeWidth={0}>
                        {pieData.map((e, i) => <Cell key={i} fill={e.color} />)}
                      </Pie>
                      <Tooltip formatter={(v) => [v, "Clientes"]} />
                    </PieChart>
                  </ResponsiveContainer>
                  <div style={{ display: "flex", justifyContent: "center", gap: 16, marginTop: 8 }}>
                    {pieData.map((e) => (
                      <div key={e.name} style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: T.sub }}>
                        <div style={{ width: 10, height: 10, borderRadius: 3, background: e.color }} />
                        {e.name}
                      </div>
                    ))}
                  </div>
                </div>

                {/* Tabela Próxima Ação */}
                <div style={{ background: "#fff", borderRadius: 18, padding: 24, border: "1px solid rgba(0,0,0,0.06)" }}>
                  <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 16 }}>Distribuição por Próxima Ação</div>
                  <table className="ap-table" style={{ width: "100%" }}>
                    <thead><tr><th className="ap-th">Ação</th><th className="ap-th" style={{ textAlign: "right" }}>Clientes</th><th className="ap-th" style={{ textAlign: "right" }}>Churn Médio</th></tr></thead>
                    <tbody>
                      {acoes.map((a) => {
                        const cfg = ACAO_CFG[a.proxima_acao] || { label: a.proxima_acao, icon: "❓", c: "#666", bg: "#f5f5f5" };
                        return (
                          <tr key={a.proxima_acao}>
                            <td className="ap-td"><Chip label={`${cfg.icon} ${cfg.label}`} c={cfg.c} bg={cfg.bg} /></td>
                            <td className="ap-td" style={{ textAlign: "right", fontWeight: 600 }}>{a.n}</td>
                            <td className="ap-td" style={{ textAlign: "right", fontWeight: 600, color: CHURN_COLOR(a.avg_churn) }}>{a.avg_churn?.toFixed(1)}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )}
        </div>
      )}

      {/* ── Tab: Ações Pendentes ── */}
      {tab === "acoes" && (
        <div>
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 20 }}>
            {FILTROS.map((f) => (
              <button key={f.key} className={`ap-btn ${filtro === f.key ? "ap-btn-primary" : ""}`} onClick={() => setFiltro(f.key)} style={{ fontSize: 12 }}>{f.label}</button>
            ))}
          </div>

          {pendLoading ? (
            <div style={{ textAlign: "center", padding: 40, color: T.muted }}>Carregando...</div>
          ) : pendentes.length === 0 ? (
            <div style={{ textAlign: "center", padding: 40, color: T.muted }}>Nenhum cliente encontrado</div>
          ) : (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(340px, 1fr))", gap: 16 }}>
              {pendentes.map((c) => {
                const cfg = ACAO_CFG[c.proxima_acao] || { label: c.proxima_acao, icon: "❓", c: "#666", bg: "#f5f5f5" };
                const rfm = RFM_CFG[c.segmento_rfm] || { label: c.segmento_rfm, c: "#666", bg: "#f5f5f5" };
                const churnC = CHURN_COLOR(c.churn_score || 0);
                return (
                  <div key={c.id} style={{ background: "#fff", borderRadius: 16, padding: 20, border: "1px solid rgba(0,0,0,0.06)", display: "flex", flexDirection: "column", gap: 12 }}>
                    {/* Header */}
                    <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                      <Avatar nome={c.nome} size={40} />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 14, fontWeight: 700, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{c.nome}</div>
                        <div style={{ fontSize: 11, color: T.muted }}>{c.email}</div>
                        {c.telefone && <div style={{ fontSize: 11, color: T.muted }}>{c.telefone}</div>}
                      </div>
                      <Chip label={`${cfg.icon} ${cfg.label}`} c={cfg.c} bg={cfg.bg} />
                    </div>

                    {/* Scores */}
                    <div style={{ display: "flex", gap: 16, alignItems: "center" }}>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 10, color: T.muted, marginBottom: 3 }}>Churn Score</div>
                        <div style={{ fontSize: 20, fontWeight: 800, color: churnC }}>{(c.churn_score || 0).toFixed(0)}</div>
                      </div>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 10, color: T.muted, marginBottom: 3 }}>Engajamento</div>
                        <ProgressBar value={c.score_engajamento || 0} max={100} height={8} />
                        <div style={{ fontSize: 10, color: T.sub, marginTop: 2 }}>{(c.score_engajamento || 0).toFixed(0)}%</div>
                      </div>
                    </div>

                    {/* Meta */}
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 8, fontSize: 11, color: T.sub }}>
                      <Chip label={rfm.label || c.segmento_rfm} c={rfm.c} bg={rfm.bg} />
                      <span>📅 {c.recencia_dias}d</span>
                      <span>🛍 {c.total_pedidos} ped.</span>
                      <span>💰 R$ {(c.receita_total || 0).toLocaleString("pt-BR", { minimumFractionDigits: 0 })}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ── Tab: Recomendações ── */}
      {tab === "recs" && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(340px, 1fr))", gap: 16 }}>
          {RECS.map((r) => {
            const cfg = ACAO_CFG[r.acao] || {};
            const count = acaoCount(r.acao);
            return (
              <div key={r.acao} style={{ background: "#fff", borderRadius: 16, padding: 24, border: `1.5px solid ${cfg.bg || "rgba(0,0,0,0.06)"}`, display: "flex", flexDirection: "column", gap: 12 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <Chip label={`${cfg.icon} ${cfg.label}`} c={cfg.c} bg={cfg.bg} />
                  <span style={{ fontSize: 12, fontWeight: 700, color: cfg.c }}>{count} clientes</span>
                </div>
                <div style={{ fontSize: 15, fontWeight: 700 }}>{r.titulo}</div>
                <div style={{ fontSize: 13, color: T.sub, lineHeight: 1.5 }}>{r.desc}</div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ── INTEGRAÇÕES & TEMPLATES ───────────────────────────────────────────────────

const CANAL_CFG = {
  whatsapp: { label: "WhatsApp", icon: "💬", c: "#128C7E", bg: "#e9fbed" },
  email: { label: "Email", icon: "✉️", c: "#4545F5", bg: "#eeeeff" },
  sms: { label: "SMS", icon: "📱", c: "#ff9500", bg: "#fff3e0" },
};
const CATEG_CFG = {
  marketing: { label: "Marketing", c: "#8e44ef" },
  transacional: { label: "Transacional", c: "#4545F5" },
  servico: { label: "Serviço", c: "#28cd41" },
  boas_vindas: { label: "Boas-vindas", c: "#ff9500" },
  reativacao: { label: "Reativação", c: "#ff6b35" },
  pos_venda: { label: "Pós-venda", c: "#128C7E" },
  carrinho: { label: "Carrinho", c: "#ff3b30" },
};

export default MarcaInteligencia;
