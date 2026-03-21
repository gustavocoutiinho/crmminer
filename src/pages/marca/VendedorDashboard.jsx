import React, { useState, useEffect } from "react";
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";
import { T, ROLE_CFG } from "../../lib/theme";
import { Avatar, Chip, KpiCard, ProgressBar, ApTooltip } from "../../components/UI";
import { fetchVendedorStats } from "../../lib/api";
import { DB_FALLBACK } from "../../data/fallback";

function MetaHojeWidget({ user, setPage }) {
  const metaContatos = DB_FALLBACK.metas.find(m => m.user_id === user.id && m.tipo === "contatos_diarios");
  if (!metaContatos) return null;

  const pct = metaContatos.valor_meta > 0 ? Math.min(100, Math.round((metaContatos.valor_atual / metaContatos.valor_meta) * 100)) : 0;

  return (
    <div className="ap-card" style={{ padding: "18px 22px", marginBottom: 16 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ fontSize: 18 }}>🎯</span>
          <span style={{ fontSize: 15, fontWeight: 700 }}>Minha Meta Hoje</span>
          {metaContatos.streak > 0 && (
            <span style={{ fontSize: 12, color: "#ff9500", fontWeight: 700 }}>🔥 {metaContatos.streak}d</span>
          )}
        </div>
        <button
          onClick={() => setPage && setPage("metas")}
          style={{ background: "none", border: "none", cursor: "pointer", fontSize: 12, color: "var(--brand, #4545F5)", fontWeight: 600 }}
        >
          Ver detalhes →
        </button>
      </div>
      <div style={{ display: "flex", alignItems: "baseline", gap: 8, marginBottom: 8 }}>
        <span className="num" style={{ fontSize: 24, fontWeight: 800, color: pct >= 100 ? "#28cd41" : "var(--brand, #4545F5)" }}>
          {metaContatos.valor_atual}
        </span>
        <span style={{ fontSize: 13, color: "var(--sub, #6e6e73)" }}>
          de {metaContatos.valor_meta} contatos — {pct}%
        </span>
      </div>
      <div style={{ width: "100%", height: 8, borderRadius: 4, background: "var(--input-bg, rgba(0,0,0,0.04))", overflow: "hidden" }}>
        <div style={{
          width: `${pct}%`, height: "100%", borderRadius: 4,
          background: pct >= 100
            ? "linear-gradient(90deg, #28cd41, #20b838)"
            : "linear-gradient(90deg, var(--brand, #4545F5), #8e44ef)",
          transition: "width 0.8s ease",
        }} />
      </div>
      {pct >= 100 && <div style={{ fontSize: 12, color: "#28cd41", marginTop: 6 }}>🎉 Meta atingida! Parabéns!</div>}
    </div>
  );
}

function CarteiraWidget({ user }) {
  const clientes = DB_FALLBACK.clientes.filter(c => c.vendedor_id === user.id);
  const now = new Date();
  const semContato30 = clientes.filter(c => {
    if (!c.ultimo_contato) return true;
    return (now - new Date(c.ultimo_contato)) / (1000 * 60 * 60 * 24) >= 30;
  }).length;
  const emRisco = clientes.filter(c => c.segmento_rfm === "at_risk" || c.segmento_rfm === "hibernating").length;

  return (
    <div className="ap-card" style={{ padding: "18px 22px" }}>
      <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 12 }}>👥 Minha Carteira</div>
      <div style={{ display: "flex", gap: 16 }}>
        <div>
          <div className="num" style={{ fontSize: 24, fontWeight: 800, color: "var(--brand, #4545F5)" }}>{clientes.length}</div>
          <div style={{ fontSize: 11, color: "var(--muted)" }}>clientes</div>
        </div>
        {semContato30 > 0 && (
          <div>
            <div className="num" style={{ fontSize: 24, fontWeight: 800, color: "#ff9500" }}>{semContato30}</div>
            <div style={{ fontSize: 11, color: "var(--muted)" }}>sem contato 30d+</div>
          </div>
        )}
        {emRisco > 0 && (
          <div>
            <div className="num" style={{ fontSize: 24, fontWeight: 800, color: "#ff3b30" }}>{emRisco}</div>
            <div style={{ fontSize: 11, color: "var(--muted)" }}>em risco</div>
          </div>
        )}
      </div>
    </div>
  );
}

function RankingWidget({ user }) {
  const vendedores = DB_FALLBACK.usuarios.filter(u => u.role === "vendedor" && u.marca_id === (user.marca_id || user.marcaId || "demo"));
  const ranked = vendedores.map(v => {
    const m = DB_FALLBACK.metas.find(mt => mt.user_id === v.id && mt.tipo === "vendas_mensais");
    const pct = m && m.valor_meta > 0 ? (m.valor_atual / m.valor_meta) * 100 : 0;
    return { ...v, pct };
  }).sort((a, b) => b.pct - a.pct);
  const pos = ranked.findIndex(v => v.id === user.id) + 1;
  const medals = { 1: "🥇", 2: "🥈", 3: "🥉" };

  return (
    <div className="ap-card" style={{ padding: "18px 22px" }}>
      <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 12 }}>🏆 Ranking</div>
      {pos > 0 ? (
        <div style={{ display: "flex", alignItems: "baseline", gap: 6 }}>
          <span className="num" style={{ fontSize: 28, fontWeight: 800, color: pos <= 3 ? "#ff9500" : "var(--brand, #4545F5)" }}>
            {medals[pos] || `${pos}°`}
          </span>
          <span style={{ fontSize: 13, color: "var(--sub, #6e6e73)" }}>de {ranked.length} vendedores</span>
        </div>
      ) : (
        <div style={{ fontSize: 13, color: "var(--muted)" }}>Sem dados</div>
      )}
    </div>
  );
}

function AgendaHojeWidget({ user, setPage }) {
  const today = new Date().toISOString().slice(0, 10);
  const agendados = (DB_FALLBACK.contatos_agendados || []).filter(
    a => a.marca_id === (user?.marca_id || user?.marcaId || "demo") && a.data === today && a.status === "pendente"
  ).slice(0, 3);
  const TIPO_ICON = { whatsapp: "💬", ligacao: "📞", email: "📧" };

  return (
    <div className="ap-card" style={{ padding: "18px 22px", cursor: "pointer" }} onClick={() => setPage && setPage("agenda_contatos")}>
      <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 10 }}>📅 Contatos Agendados Hoje</div>
      {agendados.length === 0 ? (
        <div style={{ fontSize: 13, color: "var(--muted)" }}>Nenhum contato agendado para hoje</div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {agendados.map(a => {
            const cli = DB_FALLBACK.clientes.find(c => c.id === a.cliente_id);
            return (
              <div key={a.id} style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13 }}>
                <span>{TIPO_ICON[a.tipo] || "📋"}</span>
                <span style={{ fontWeight: 600 }}>{cli?.nome || "Cliente"}</span>
                <span style={{ color: "var(--muted)" }}>às {a.hora}</span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function SugestoesWidget({ user, setPage }) {
  const clientes = DB_FALLBACK.clientes.filter(c => c.marca_id === (user?.marca_id || user?.marcaId || "demo") && c.vendedor_id === user.id);
  const urgentes = clientes.filter(c => c.segmento_rfm === "at_risk" || c.segmento_rfm === "hibernating" || c.recencia_dias > 30).slice(0, 3);

  return (
    <div className="ap-card" style={{ padding: "18px 22px", cursor: "pointer" }} onClick={() => setPage && setPage("sugestoes")}>
      <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 10 }}>💡 Sugestões Urgentes</div>
      {urgentes.length === 0 ? (
        <div style={{ fontSize: 13, color: "var(--muted)" }}>Sem sugestões urgentes</div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {urgentes.map(cli => (
            <div key={cli.id} style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13 }}>
              <span>{cli.segmento_rfm === "at_risk" || cli.segmento_rfm === "em_risco" ? "⚠️" : cli.recencia_dias > 60 ? "💤" : "🕐"}</span>
              <span style={{ fontWeight: 600 }}>{cli.nome}</span>
              <span style={{ color: "var(--muted)", fontSize: 11 }}>{cli.recencia_dias}d sem contato</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function VendedorDashboard({ user, setPage }) {
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

      {/* Meta + Carteira widgets */}
      <MetaHojeWidget user={user} setPage={setPage} />

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginBottom: 16 }}>
        <CarteiraWidget user={user} />
        <RankingWidget user={user} />
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginBottom: 16 }}>
        <AgendaHojeWidget user={user} setPage={setPage} />
        <SugestoesWidget user={user} setPage={setPage} />
      </div>

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
