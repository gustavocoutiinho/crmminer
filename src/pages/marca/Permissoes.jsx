import React, { useState } from "react";
import { T } from "../../lib/theme";
import { SectionHeader, Toggle } from "../../components/UI";
import { useToast } from "../../context/ToastContext";
import { usePermissoes } from "../../hooks/usePermissoes";

const FUNCIONALIDADES = [
  { key: "ver_dashboard", label: "Ver Dashboard", icon: "⬡" },
  { key: "ver_todos_clientes", label: "Ver Todos os Clientes", icon: "👥" },
  { key: "editar_clientes", label: "Editar Clientes", icon: "✏️" },
  { key: "transferir_clientes", label: "Transferir Clientes", icon: "🔄" },
  { key: "ver_campanhas", label: "Ver Campanhas", icon: "📢" },
  { key: "criar_campanhas", label: "Criar Campanhas", icon: "➕" },
  { key: "ver_relatorios", label: "Ver Relatórios", icon: "📊" },
  { key: "exportar_dados", label: "Exportar Dados", icon: "📤" },
  { key: "configurar_marca", label: "Configurar Marca", icon: "⚙" },
  { key: "gerenciar_equipe", label: "Gerenciar Equipe", icon: "👥" },
  { key: "ver_financeiro", label: "Ver Financeiro", icon: "💰" },
  { key: "ver_fidelidade", label: "Ver Fidelidade", icon: "⭐" },
  { key: "config_automacoes", label: "Configurar Automações", icon: "⚡" },
];

const ROLES = [
  { key: "dono", label: "Dono", c: "#4545F5" },
  { key: "gerente", label: "Gerente", c: "#8e44ef" },
  { key: "vendedor", label: "Vendedor", c: "#ff9500" },
];

function Permissoes({ user }) {
  const toast = useToast();
  const { permissoes, salvarPermissoes, restaurarPadrao, defaultPermissoes } = usePermissoes(user);
  const [local, setLocal] = useState(JSON.parse(JSON.stringify(permissoes)));
  const [hasChanges, setHasChanges] = useState(false);

  const handleToggle = (role, key) => {
    if (role === "dono") return; // Dono always has all permissions
    setLocal(prev => {
      const next = { ...prev, [role]: { ...prev[role], [key]: !prev[role][key] } };
      setHasChanges(true);
      return next;
    });
  };

  const handleSave = () => {
    salvarPermissoes(local);
    setHasChanges(false);
    toast("Permissões salvas com sucesso! 🔐", "success");
  };

  const handleRestore = () => {
    const def = JSON.parse(JSON.stringify(defaultPermissoes));
    setLocal(def);
    restaurarPadrao();
    setHasChanges(false);
    toast("Permissões restauradas ao padrão", "info");
  };

  return (
    <div className="fade-up">
      <SectionHeader tag="ADMIN" title="Permissões por Cargo" />

      <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginBottom: 16 }}>
        <button className="ap-btn ap-btn-sm" onClick={handleRestore} style={{ fontSize: 12 }}>🔄 Restaurar Padrão</button>
        {hasChanges && (
          <button className="ap-btn ap-btn-primary ap-btn-sm" onClick={handleSave} style={{ fontSize: 12 }}>💾 Salvar Alterações</button>
        )}
      </div>

      <div className="ap-card" style={{ padding: 0, overflow: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 600 }}>
          <thead>
            <tr style={{ borderBottom: "2px solid rgba(0,0,0,0.08)" }}>
              <th style={{ padding: "14px 20px", textAlign: "left", fontSize: 12, fontWeight: 700, color: T.muted, textTransform: "uppercase", letterSpacing: 0.5 }}>
                Funcionalidade
              </th>
              {ROLES.map(r => (
                <th key={r.key} style={{ padding: "14px 16px", textAlign: "center", fontSize: 12, fontWeight: 700, color: r.c, textTransform: "uppercase", letterSpacing: 0.5 }}>
                  {r.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {FUNCIONALIDADES.map((func, i) => (
              <tr key={func.key} style={{ borderBottom: i < FUNCIONALIDADES.length - 1 ? "1px solid rgba(0,0,0,0.05)" : "none" }}>
                <td style={{ padding: "12px 20px", fontSize: 13, fontWeight: 500 }}>
                  <span style={{ marginRight: 8 }}>{func.icon}</span>
                  {func.label}
                </td>
                {ROLES.map(r => (
                  <td key={r.key} style={{ padding: "12px 16px", textAlign: "center" }}>
                    <div style={{ display: "flex", justifyContent: "center" }}>
                      <Toggle
                        checked={local[r.key]?.[func.key] ?? false}
                        onChange={() => handleToggle(r.key, func.key)}
                        disabled={r.key === "dono"}
                      />
                    </div>
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div style={{ marginTop: 14, fontSize: 12, color: T.muted, display: "flex", alignItems: "center", gap: 6 }}>
        🔒 O cargo "Dono" sempre tem acesso total e não pode ser editado.
      </div>
    </div>
  );
}

export default Permissoes;
