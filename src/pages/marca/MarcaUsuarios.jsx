import React from "react";
import { T, ROLE_CFG } from "../../lib/theme";
import { Chip, SectionHeader } from "../../components/UI";
import MarcaEquipe from "./MarcaEquipe";

function MarcaUsuarios({ user }) {
  return (
    <div className="fade-up">
      <SectionHeader tag="Configurações" title="Gestão de Usuários" />
      <div style={{ background: "#eeeeff", border: "1px solid #4545F522", borderRadius: 14, padding: "14px 18px", marginBottom: 20 }}>
        <div style={{ fontSize: 11, fontWeight: 700, color: "#4545F5", letterSpacing: 0.5, textTransform: "uppercase", marginBottom: 10 }}>Hierarquia de Permissões</div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 10 }}>
          {[{ role: "admin", perms: ["Acesso total", "Criar/excluir usuários", "Configurar marca", "Ver todos os dados"] }, { role: "gerente", perms: ["Ver equipe toda", "Relatórios", "Editar clientes", "Sem acesso a config"] }, { role: "vendedor", perms: ["Seus clientes", "Suas tarefas", "Registrar vendas", "Sem acesso a config"] }].map((r, i) => (
            <div key={i} style={{ background: ROLE_CFG[r.role].bg, border: `1px solid ${ROLE_CFG[r.role].c}22`, borderRadius: 12, padding: 12 }}>
              <Chip label={`${ROLE_CFG[r.role].icon} ${ROLE_CFG[r.role].label}`} c={ROLE_CFG[r.role].c} bg={`${ROLE_CFG[r.role].c}25`} />
              <div style={{ marginTop: 8, display: "flex", flexDirection: "column", gap: 4 }}>
                {r.perms.map((p, j) => <div key={j} style={{ fontSize: 11, color: T.sub, display: "flex", gap: 5 }}><span style={{ color: ROLE_CFG[r.role].c }}>✓</span>{p}</div>)}
              </div>
            </div>
          ))}
        </div>
      </div>
      <MarcaEquipe isAdmin={true} user={user} />
    </div>
  );
}

const TAG_COLORS = ["#4545F5","#28cd41","#ff9500","#ff3b30","#8e44ef","#007aff","#ff6b35","#00c7be","#ffd60a","#ff2d55"];

export default MarcaUsuarios;
