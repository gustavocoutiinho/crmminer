import React, { useState, useEffect, useCallback } from "react";
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";
import { T, ROLE_CFG, RFM_CFG } from "../../lib/theme";
import { Avatar, Chip, KpiCard, ProgressBar, SectionHeader, ApTooltip } from "../../components/UI";
import { fetchStats } from "../../lib/api";
import VendedorDashboard from "./VendedorDashboard";
import AgendaAdmin from "./AgendaAdmin";
import { DB_FALLBACK } from "../../data/fallback";

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

      <AgendaAdmin onViewCliente={(id) => { if (setPage) setPage("clientes"); }} />

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

      {/* Phase 5 - Equipe Status Widget */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 16, marginBottom: 16 }}>
        <div className="ap-card" style={{ padding: "18px 22px", cursor: "pointer" }} onClick={() => setPage && setPage("gestao_vendedores")}>
          <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 10 }}>👥 Status da Equipe</div>
          {(() => {
            const vendedores = DB_FALLBACK.usuarios.filter(u => u.marca_id === (user?.marca_id || user?.marcaId || "demo") && u.role === "vendedor");
            const ativos = vendedores.filter(v => v.status_trabalho === "ativo").length;
            const ausentes = vendedores.filter(v => v.status_trabalho !== "ativo" && v.status_trabalho !== "desligado").length;
            return (
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13 }}>
                  <span style={{ color: T.muted }}>Ativos</span>
                  <span style={{ fontWeight: 700, color: "#28cd41" }}>{ativos}</span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13 }}>
                  <span style={{ color: T.muted }}>Ausentes</span>
                  <span style={{ fontWeight: 700, color: "#ff9500" }}>{ausentes}</span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13 }}>
                  <span style={{ color: T.muted }}>Total</span>
                  <span style={{ fontWeight: 600 }}>{vendedores.length}</span>
                </div>
              </div>
            );
          })()}
        </div>

        {/* Agenda Today Widget for Dono */}
        <div className="ap-card" style={{ padding: "18px 22px", cursor: "pointer" }} onClick={() => setPage && setPage("agenda_contatos")}>
          <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 10 }}>📅 Contatos Agendados Hoje</div>
          {(() => {
            const today = new Date().toISOString().slice(0, 10);
            const agendados = (DB_FALLBACK.contatos_agendados || []).filter(a => a.data === today && a.status === "pendente");
            const atrasados = (DB_FALLBACK.contatos_agendados || []).filter(a => a.status === "atrasado" || (a.status === "pendente" && a.data < today));
            return (
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13 }}>
                  <span style={{ color: T.muted }}>Pendentes hoje</span>
                  <span style={{ fontWeight: 700, color: "#4545F5" }}>{agendados.length}</span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13 }}>
                  <span style={{ color: T.muted }}>Atrasados</span>
                  <span style={{ fontWeight: 700, color: "#ff3b30" }}>{atrasados.length}</span>
                </div>
              </div>
            );
          })()}
        </div>

        {/* Sugestões for Dono */}
        <div className="ap-card" style={{ padding: "18px 22px", cursor: "pointer" }} onClick={() => setPage && setPage("sugestoes")}>
          <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 10 }}>💡 Sugestões Proativas</div>
          {(() => {
            const emRisco = DB_FALLBACK.clientes.filter(c => c.segmento_rfm === "at_risk" || c.segmento_rfm === "hibernating").length;
            const semContato = DB_FALLBACK.clientes.filter(c => c.recencia_dias > 30).length;
            return (
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13 }}>
                  <span style={{ color: T.muted }}>Clientes em risco</span>
                  <span style={{ fontWeight: 700, color: "#ff3b30" }}>{emRisco}</span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13 }}>
                  <span style={{ color: T.muted }}>Sem contato 30d+</span>
                  <span style={{ fontWeight: 700, color: "#ff9500" }}>{semContato}</span>
                </div>
              </div>
            );
          })()}
        </div>
      </div>

      {/* Phase 4 Widgets */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 16, marginBottom: 16 }}>
        {/* Inbox Widget */}
        <div className="ap-card" style={{ padding: "18px 22px", cursor: "pointer" }} onClick={() => setPage && setPage("inbox")}>
          <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 10 }}>💬 Inbox</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13 }}>
              <span style={{ color: T.muted }}>Conversas abertas</span>
              <span style={{ fontWeight: 700, color: "#4545F5" }}>{(DB_FALLBACK.inbox_conversas || []).filter(c => c.status === "aberta").length}</span>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13 }}>
              <span style={{ color: T.muted }}>Sem resposta</span>
              <span style={{ fontWeight: 700, color: "#ff9500" }}>{(DB_FALLBACK.inbox_conversas || []).filter(c => c.ultima_direcao === "entrada").length}</span>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13 }}>
              <span style={{ color: T.muted }}>Tempo médio</span>
              <span style={{ fontWeight: 600 }}>1h 23min</span>
            </div>
          </div>
        </div>

        {/* Automações Widget */}
        <div className="ap-card" style={{ padding: "18px 22px", cursor: "pointer" }} onClick={() => setPage && setPage("automacoes")}>
          <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 10 }}>⚡ Automações</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13 }}>
              <span style={{ color: T.muted }}>Execuções hoje</span>
              <span style={{ fontWeight: 700, color: "#4545F5" }}>{(DB_FALLBACK.automacao_execucoes || []).filter(e => (e.created_at || "").slice(0, 10) === new Date().toISOString().slice(0, 10)).length || 8}</span>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13 }}>
              <span style={{ color: T.muted }}>Taxa de sucesso</span>
              <span style={{ fontWeight: 700, color: "#28cd41" }}>87%</span>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13 }}>
              <span style={{ color: T.muted }}>Campanhas ativas</span>
              <span style={{ fontWeight: 600 }}>{(DB_FALLBACK.campanhas || []).filter(c => c.status === "ativa").length}</span>
            </div>
          </div>
        </div>

        {/* Fidelidade Widget */}
        <div className="ap-card" style={{ padding: "18px 22px", cursor: "pointer" }} onClick={() => setPage && setPage("fidelidade")}>
          <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 10 }}>⭐ Fidelidade</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13 }}>
              <span style={{ color: T.muted }}>Clientes no programa</span>
              <span style={{ fontWeight: 700, color: "#4545F5" }}>{(DB_FALLBACK.fidelidade_clientes || []).length}</span>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13 }}>
              <span style={{ color: T.muted }}>Pontos distribuídos</span>
              <span style={{ fontWeight: 700, color: "#ff9500" }}>{((DB_FALLBACK.fidelidade_clientes || []).reduce((s, f) => s + (f.pontos || 0), 0)).toLocaleString("pt-BR")}</span>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13 }}>
              <span style={{ color: T.muted }}>Indicações do mês</span>
              <span style={{ fontWeight: 600 }}>{(DB_FALLBACK.indicacoes || []).filter(i => (i.created_at || "").startsWith("2026-03")).length}</span>
            </div>
          </div>
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
