import React from "react";
import { T, PLANO_CFG } from "../../lib/theme";
import { Chip, SectionHeader } from "../../components/UI";
import { PLANOS } from "../../utils/helpers";

function OwnerPlanos({ marcas }) {
  return (
    <div className="fade-up">
      <SectionHeader tag="Monetização" title="Planos" />
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 18 }}>
        {PLANOS.map((p, i) => {
          const st = PLANO_CFG[p.id];
          const ativos = marcas.filter((m) => m.plano === p.id && m.status === "ativo").length;
          const cliStr = String(p.clientes) === "∞" ? "Ilimitado" : `até ${Number(p.clientes).toLocaleString("pt-BR")}`;
          return (
            <div key={i} className="ap-card" style={{ padding: 28, border: `1.5px solid ${st.c}22`, background: st.bg }}>
              <Chip label={p.label} c={st.c} bg={`${st.c}20`} />
              <div className="num" style={{ fontSize: 36, fontWeight: 800, color: st.c, margin: "14px 0 2px" }}>
                R$ {p.preco}<span style={{ fontSize: 14, color: T.muted, fontFamily: "var(--sf)", fontWeight: 500 }}>/mês</span>
              </div>
              <div style={{ fontSize: 12, color: T.sub, marginBottom: 18 }}>{ativos} marca{ativos !== 1 ? "s" : ""} ativa{ativos !== 1 ? "s" : ""}</div>
              {[["🏪 Lojas", String(p.lojas) === "∞" ? "Ilimitado" : `até ${p.lojas}`], ["👤 Usuários", String(p.usuarios) === "∞" ? "Ilimitado" : `até ${p.usuarios}`], ["👥 Clientes", cliStr]].map(([l, v], j) => (
                <div key={j} style={{ display: "flex", justifyContent: "space-between", padding: "8px 0", borderBottom: `1px solid ${st.c}18` }}>
                  <span style={{ fontSize: 12, color: T.sub }}>{l}</span>
                  <span style={{ fontSize: 12, fontWeight: 700, color: st.c }}>{v}</span>
                </div>
              ))}
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default OwnerPlanos;
