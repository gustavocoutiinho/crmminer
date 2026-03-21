import React from "react";
import { T, PLANO_CFG } from "../../lib/theme";
import { Chip, KpiCard, SectionHeader } from "../../components/UI";
import { computeMRR, PLANOS } from "../../utils/helpers";

function OwnerFinanceiro({ marcas }) {
  const mrr = marcas.filter((m) => m.status === "ativo").reduce((s, m) => s + computeMRR(m), 0);
  return (
    <div className="fade-up">
      <SectionHeader tag="Receita" title="Financeiro" />
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 14, marginBottom: 20 }}>
        <KpiCard label="MRR" value={`R$ ${mrr.toLocaleString("pt-BR")}`} color="#4545F5" icon="💳" />
        <KpiCard label="ARR" value={`R$ ${((mrr * 12) / 1000).toFixed(1)}k`} color="#8e44ef" icon="📊" />
        <KpiCard label="Inadimplência" value="R$ 0" color="#28cd41" icon="✅" />
      </div>
      <div className="ap-card" style={{ padding: "22px 24px" }}>
        <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 16 }}>Receita por Marca</div>
        {marcas.filter((m) => computeMRR(m) > 0).sort((a, b) => computeMRR(b) - computeMRR(a)).map((m, i, arr) => (
          <div key={i} style={{ display: "flex", alignItems: "center", gap: 14, padding: "10px 0", borderBottom: i < arr.length - 1 ? "1px solid rgba(0,0,0,0.05)" : "none" }}>
            <span style={{ fontSize: 11, color: T.muted, fontWeight: 700, width: 20, textAlign: "right" }}>{i + 1}</span>
            <div style={{ width: 32, height: 32, borderRadius: 9, background: "rgba(0,0,0,0.06)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 800 }}>{m.nome[0]}</div>
            <span style={{ flex: 1, fontSize: 14, fontWeight: 600 }}>{m.nome}</span>
            <Chip label={PLANOS.find((p) => p.id === m.plano)?.label || m.plano} c={PLANO_CFG[m.plano]?.c} bg={PLANO_CFG[m.plano]?.bg} />
            <span className="num" style={{ fontWeight: 700, color: "#4545F5", fontSize: 14 }}>R$ {computeMRR(m)}/mês</span>
          </div>
        ))}
      </div>
    </div>
  );
}


export default OwnerFinanceiro;
