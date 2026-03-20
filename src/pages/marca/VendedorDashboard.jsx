import React, { useState, useEffect } from "react";
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";
import { T, ROLE_CFG } from "../../lib/theme";
import { Avatar, Chip, KpiCard, ProgressBar, ApTooltip } from "../../components/UI";
import { fetchVendedorStats } from "../../lib/api";

function VendedorDashboard({ user }) {
  const rd = ROLE_CFG[user.role] || ROLE_CFG.vendedor;
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchVendedorStats().then(s => { setStats(s); setLoading(false); }).catch(() => setLoading(false));
  }, []);

  const cli = stats?.clientes || { total: 0, ativos: 0 };
  const ped = stats?.pedidos || { total: 0, receita: 0 };
  const meta = stats?.meta || 0;
  const mensal = (stats?.mensal || []).map(m => ({ m: m.mes || "", v: +m.receita }));
  const recentes = stats?.recentes || [];
  const rank = stats?.ranking || { posicao: 0, total_vendedores: 0 };
  const tarefas = stats?.tarefas_pendentes || 0;
  const metaPct = meta > 0 ? Math.min(100, Math.round((ped.receita / meta) * 100)) : 0;
  const metaRestante = Math.max(0, meta - ped.receita);

  const STATUS_COLORS = { aprovado: "#28cd41", pendente: "#ff9500", cancelado: "#ff3b30", processando: "#4545F5" };

  return (
    <div className="fade-up">
      <div style={{ marginBottom: 28 }}>
        <div style={{ fontSize: 10, fontWeight: 700, color: "#4545F5", letterSpacing: 0.8, textTransform: "uppercase", marginBottom: 6 }}>{rd.icon} {rd.label}</div>
        <h1 style={{ fontSize: 28, fontWeight: 700 }}>Olá, {user.nome.split(" ")[0]} 👋</h1>
        <p style={{ fontSize: 14, color: T.sub, marginTop: 4 }}>{new Date().toLocaleDateString("pt-BR", { weekday: "long", day: "numeric", month: "long" })}</p>
      </div>

      {loading && <div className="ap-card" style={{ padding: "20px 24px", marginBottom: 20, textAlign: "center" }}><span style={{ fontSize: 13, color: T.muted }}>⏳ Carregando dados...</span></div>}

      <div className="kpi-grid-4" style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 14, marginBottom: 20 }}>
        <KpiCard label="Meus Clientes" value={cli.total.toLocaleString("pt-BR")} sub={`${cli.ativos} ativos (30d)`} color="#28cd41" icon="👥" />
        <KpiCard label="Receita (30d)" value={`R$ ${(ped.receita/1000).toFixed(1)}k`} sub={`${ped.total} pedidos`} color="#4545F5" icon="💰" />
        <KpiCard label="Meta" value={`${metaPct}%`} sub={meta > 0 ? `R$ ${(meta/1000).toFixed(1)}k mensal` : "não definida"} color="#8e44ef" icon="🎯" />
        <KpiCard label="Tarefas Pendentes" value={tarefas} sub="a concluir" color="#ff9500" icon="📋" />
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: 16, marginBottom: 16 }}>
        <div className="ap-card" style={{ padding: "22px 24px" }}>
          <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 4 }}>Minha Receita Mensal</div>
          <div style={{ fontSize: 12, color: T.muted, marginBottom: 16 }}>Últimos 6 meses</div>
          {mensal.length > 0 ? (
            <ResponsiveContainer width="100%" height={180}>
              <AreaChart data={mensal}>
                <defs><linearGradient id="grv" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#4545F5" stopOpacity={0.2}/><stop offset="95%" stopColor="#4545F5" stopOpacity={0}/></linearGradient></defs>
                <XAxis dataKey="m" tick={{ fill: T.muted, fontSize: 11 }} axisLine={false} tickLine={false}/>
                <YAxis hide/>
                <Tooltip content={<ApTooltip/>}/>
                <Area type="monotone" dataKey="v" name="Receita" stroke="#4545F5" strokeWidth={2.5} fill="url(#grv)" dot={false}/>
              </AreaChart>
            </ResponsiveContainer>
          ) : <div style={{ textAlign: "center", padding: 40, color: T.muted }}>Sem dados de receita</div>}
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <div className="ap-card" style={{ padding: "22px 24px" }}>
            <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 12 }}>🎯 Meta Mensal</div>
            {meta > 0 ? (<>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 8 }}>
                <span className="num" style={{ fontSize: 28, fontWeight: 800, color: metaPct >= 100 ? "#28cd41" : "#4545F5" }}>{metaPct}%</span>
                <span style={{ fontSize: 12, color: T.muted }}>R$ {ped.receita.toLocaleString("pt-BR")} / R$ {meta.toLocaleString("pt-BR")}</span>
              </div>
              <ProgressBar value={ped.receita} max={meta} height={8}/>
              <div style={{ fontSize: 12, color: T.muted, marginTop: 8 }}>
                {metaPct >= 100 ? "🎉 Meta atingida!" : `Faltam R$ ${metaRestante.toLocaleString("pt-BR")}`}
              </div>
            </>) : <div style={{ fontSize: 13, color: T.muted }}>Meta não definida</div>}
          </div>

          <div className="ap-card" style={{ padding: "22px 24px" }}>
            <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 12 }}>🏆 Ranking</div>
            {rank.posicao > 0 ? (<>
              <div style={{ display: "flex", alignItems: "baseline", gap: 6 }}>
                <span className="num" style={{ fontSize: 32, fontWeight: 800, color: rank.posicao <= 3 ? "#ff9500" : "#4545F5" }}>{rank.posicao}°</span>
                <span style={{ fontSize: 14, color: T.sub }}>de {rank.total_vendedores} vendedores</span>
              </div>
              {rank.posicao === 1 && <div style={{ fontSize: 12, color: "#ff9500", marginTop: 4 }}>🥇 Líder do mês!</div>}
              {rank.posicao === 2 && <div style={{ fontSize: 12, color: "#8e8e93", marginTop: 4 }}>🥈 Quase lá!</div>}
              {rank.posicao === 3 && <div style={{ fontSize: 12, color: "#cd7f32", marginTop: 4 }}>🥉 Top 3!</div>}
            </>) : <div style={{ fontSize: 13, color: T.muted }}>Sem dados de ranking</div>}
          </div>
        </div>
      </div>

      {recentes.length > 0 && (
        <div className="ap-card" style={{ padding: 0, overflow: "hidden" }}>
          <div style={{ padding: "16px 22px", borderBottom: "1px solid rgba(0,0,0,0.06)", display: "flex", justifyContent: "space-between" }}>
            <span style={{ fontSize: 15, fontWeight: 700 }}>Últimos Pedidos</span>
            <span style={{ fontSize: 12, color: T.muted }}>10 mais recentes</span>
          </div>
          {recentes.map((p, i) => (
            <div key={p.id || i} style={{ display: "flex", alignItems: "center", gap: 14, padding: "12px 22px", borderBottom: i < recentes.length-1 ? "1px solid rgba(0,0,0,0.05)" : "none" }}>
              <span className="num" style={{ fontSize: 11, color: T.muted, fontWeight: 700, width: 20, textAlign: "right" }}>{i+1}</span>
              <Avatar nome={p.cliente_nome || "?"} size={32}/>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 14, fontWeight: 700 }}>{p.cliente_nome || "Cliente"}</div>
                <div style={{ fontSize: 11, color: T.muted }}>{p.created_at ? new Date(p.created_at).toLocaleDateString("pt-BR") : "—"}</div>
              </div>
              <Chip label={p.status || "—"} c={STATUS_COLORS[p.status] || T.muted} bg={(STATUS_COLORS[p.status] || T.muted) + "18"}/>
              <span className="num" style={{ fontSize: 14, fontWeight: 700, color: "#4545F5" }}>R$ {(+(p.valor || 0)).toLocaleString("pt-BR")}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default VendedorDashboard;
