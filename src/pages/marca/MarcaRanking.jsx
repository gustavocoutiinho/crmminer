import React, { useState } from "react";
import { T, ROLE_CFG } from "../../lib/theme";
import { Avatar, Chip, ProgressBar, SectionHeader } from "../../components/UI";
import { useSupabaseQuery } from "../../lib/hooks";

function MarcaRanking({ user }) {
  const [periodo, setPeriodo] = useState("30d");
  const marcaId = user?.marca_id || user?.marcaId;
  const { data: apiUsers } = useSupabaseQuery("users", marcaId ? { eq: { marca_id: marcaId } } : {});
  const isVend = user.role === "vendedor";

  const allVends = (apiUsers)
    .filter((u) => u.role === "vendedor")
    .sort((a, b) => (+(b.meta_mensal || b.meta || 0)) - (+(a.meta_mensal || a.meta || 0)));
  const list = isVend ? allVends.filter((v) => v.nome === user.nome) : allVends;
  const medals = ["🥇", "🥈", "🥉"];

  return (
    <div className="fade-up">
      <SectionHeader tag="Performance" title="Ranking da Equipe" />
      <div style={{ display: "flex", gap: 8, marginBottom: 14, flexWrap: "wrap" }}>
        <select className="ap-inp" style={{ fontSize: 12, padding: "6px 12px", minWidth: 140 }} value={periodo} onChange={e => setPeriodo(e.target.value)}>
          <option value="7d">Últimos 7 dias</option>
          <option value="30d">Últimos 30 dias</option>
          <option value="90d">Últimos 90 dias</option>
        </select>
      </div>
      {isVend && <div style={{ background: "#eeeeff", border: "1px solid #4545F520", borderRadius: 12, padding: "12px 16px", marginBottom: 20, fontSize: 13, color: "#4545F5", fontWeight: 500 }}>👤 Você está visualizando apenas sua posição no ranking.</div>}
      {list.length === 0 && <div style={{ textAlign: "center", padding: 40, color: T.muted }}>Nenhum vendedor encontrado.</div>}
      <div style={{ display: "grid", gridTemplateColumns: `repeat(${Math.min(list.length || 1, 3)},1fr)`, gap: 14 }}>
        {list.map((v, i) => {
          const globalIdx = allVends.findIndex((x) => x.id === v.id);
          const meta = +(v.meta_mensal || v.meta || 0);
          const fat = +(v.fat || 0);
          const pct = meta > 0 ? Math.min(Math.round((fat / meta) * 100), 100) : 0;
          const bC = pct >= 100 ? "#28cd41" : pct >= 70 ? "#4545F5" : "#ff9500";
          return (
            <div key={v.id} className="ap-card" style={{ padding: 24, textAlign: "center", border: globalIdx === 0 ? "1.5px solid #ffd60a40" : "none" }}>
              <div style={{ fontSize: 32, marginBottom: 10 }}>{medals[globalIdx] || `${globalIdx + 1}°`}</div>
              <Avatar nome={v.nome} size={48} />
              <div style={{ fontSize: 15, fontWeight: 700, margin: "10px 0 2px" }}>{v.nome}</div>
              <div style={{ fontSize: 11, color: T.muted, marginBottom: 12 }}>{v.loja || "Todas"}</div>
              <div className="num" style={{ fontSize: 24, fontWeight: 800, color: bC }}>R$ {(fat / 1000).toFixed(1)}k</div>
              <div style={{ margin: "10px 0 4px" }}><ProgressBar value={fat} max={meta || 1} height={6} /></div>
              <div style={{ fontSize: 11, color: bC, fontWeight: 700 }}>{pct}% da meta{meta > 0 ? ` (R$ ${(meta/1000).toFixed(0)}k)` : ""}</div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default MarcaRanking;
