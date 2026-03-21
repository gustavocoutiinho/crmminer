import React, { useState, useEffect } from "react";
import { T } from "../../lib/theme";
import { SectionHeader } from "../../components/UI";
import { useToast } from "../../context/ToastContext";
import { DB_FALLBACK } from "../../data/fallback";
import RankingLoja from "./RankingLoja";

const TIPO_CFG = {
  contatos_diarios: { label: "Contatos Hoje", icon: "📞", unit: "", format: v => String(v) },
  vendas_mensais: { label: "Vendas do Mês", icon: "💰", unit: "R$ ", format: v => `R$ ${Number(v).toLocaleString("pt-BR")}` },
  ticket_medio: { label: "Ticket Médio", icon: "📊", unit: "R$ ", format: v => `R$ ${Number(v).toLocaleString("pt-BR")}` },
  novos_clientes: { label: "Novos Clientes", icon: "👥", unit: "", format: v => String(v) },
};

function MetaCard({ meta }) {
  const cfg = TIPO_CFG[meta.tipo] || TIPO_CFG.contatos_diarios;
  const pct = meta.valor_meta > 0 ? Math.min(100, Math.round((meta.valor_atual / meta.valor_meta) * 100)) : 0;
  const atingiu = pct >= 100;

  return (
    <div className="ap-card" style={{ padding: "22px 24px", marginBottom: 14 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ fontSize: 20 }}>{cfg.icon}</span>
          <span style={{ fontSize: 15, fontWeight: 700 }}>{cfg.label}</span>
        </div>
        {meta.streak > 0 && (
          <div style={{
            display: "flex", alignItems: "center", gap: 4,
            background: "rgba(255,149,0,0.1)", borderRadius: 20,
            padding: "4px 12px", fontSize: 12, fontWeight: 700, color: "#ff9500",
          }}>
            🔥 {meta.streak} dias seguidos!
          </div>
        )}
      </div>

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 8 }}>
        <span className="num" style={{
          fontSize: 28, fontWeight: 800,
          color: atingiu ? "#28cd41" : "var(--brand, #4545F5)",
        }}>
          {pct}%
        </span>
        <span style={{ fontSize: 13, color: "var(--sub, #6e6e73)" }}>
          {cfg.format(meta.valor_atual)} de {cfg.format(meta.valor_meta)}
        </span>
      </div>

      {/* Progress bar */}
      <div style={{
        width: "100%", height: 10, borderRadius: 5,
        background: "var(--input-bg, rgba(0,0,0,0.04))",
        overflow: "hidden",
      }}>
        <div style={{
          width: `${pct}%`,
          height: "100%",
          borderRadius: 5,
          background: atingiu
            ? "linear-gradient(90deg, #28cd41, #20b838)"
            : "linear-gradient(90deg, var(--brand, #4545F5), #8e44ef)",
          transition: "width 0.8s ease",
        }} />
      </div>

      <div style={{ fontSize: 12, color: "var(--muted, #aeaeb2)", marginTop: 8 }}>
        {atingiu ? "🎉 Meta atingida! Parabéns!" : `Faltam ${cfg.format(meta.valor_meta - meta.valor_atual)}`}
      </div>
    </div>
  );
}

function MetasVendedor({ user }) {
  const toast = useToast();
  const [tab, setTab] = useState("metas");
  const [metas, setMetas] = useState([]);
  const [toasted, setToasted] = useState(new Set());

  useEffect(() => {
    const userMetas = DB_FALLBACK.metas.filter(m => m.user_id === user.id);
    setMetas(userMetas);
  }, [user.id]);

  // Toast when 100%
  useEffect(() => {
    metas.forEach(m => {
      const pct = m.valor_meta > 0 ? (m.valor_atual / m.valor_meta) * 100 : 0;
      if (pct >= 100 && !toasted.has(m.id)) {
        toast(`🎉 Meta "${TIPO_CFG[m.tipo]?.label}" atingida!`, "success");
        setToasted(prev => new Set([...prev, m.id]));
      }
    });
  }, [metas]);

  const isAdmin = user.role === "admin" || user.role === "miner" || user.role === "gerente";

  return (
    <div className="fade-up">
      <SectionHeader tag="Performance" title="Metas & Ranking" />

      <div className="seg" style={{ marginBottom: 24 }}>
        {[
          { k: "metas", l: "🎯 Minhas Metas" },
          { k: "ranking", l: "🏆 Ranking" },
        ].map(t => (
          <button key={t.k} className={`seg-btn ${tab === t.k ? "on" : ""}`} onClick={() => setTab(t.k)}>
            {t.l}
          </button>
        ))}
      </div>

      {tab === "metas" && (
        <>
          {metas.length === 0 ? (
            <div className="ap-card" style={{ padding: 40, textAlign: "center", color: "var(--muted, #aeaeb2)" }}>
              Nenhuma meta definida para você ainda.
            </div>
          ) : (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(340px, 1fr))", gap: 14 }}>
              {metas.map(m => <MetaCard key={m.id} meta={m} />)}
            </div>
          )}
        </>
      )}

      {tab === "ranking" && <RankingLoja user={user} />}
    </div>
  );
}

export default MetasVendedor;
