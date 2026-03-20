import React from "react";
import { T, ROLE_CFG } from "../lib/theme";
import { Avatar, Toggle, MinerLogo } from "../components/UI";
import NotificationBell from "./NotificationBell";

function Sidebar({ page, setPage, user, onLogout, isOwner = false, className = "", dark, onToggleDark }) {
  const ownerNav = [
    { key: "dashboard", icon: "⬡", label: "Dashboard" },
    { key: "marcas", icon: "🏢", label: "Marcas/Contas" },
    { key: "usuarios_admin", icon: "👥", label: "Todos os Usuários" },
    { key: "sistema", icon: "⚙", label: "Sistema" },
    { divider: true, label: "Dados Operacionais" },
    { key: "clientes", icon: "🙍", label: "Clientes (global)" },
    { key: "pipeline", icon: "🔀", label: "Pipeline" },
    { key: "planos", icon: "💎", label: "Planos" },
    { key: "financeiro", icon: "💰", label: "Financeiro" },
  ];

  const marcaNav = [
    { key: "dashboard", icon: "⬡", label: "Dashboard", roles: ["miner", "dono", "gerente", "vendedor"] },
    { group: "Gestão", items: [
      { key: "lojas", icon: "🏪", label: "Lojas", roles: ["miner", "dono"] },
      { key: "equipe", icon: "👥", label: "Equipe", roles: ["miner", "dono", "gerente"] },
      { key: "gestao_vendedores", icon: "🧑‍💼", label: "Gestão Vendedores", roles: ["miner", "dono", "gerente"] },
      { key: "metas", icon: "🎯", label: "Metas", roles: ["miner", "dono", "gerente", "vendedor"] },
      { key: "ranking", icon: "🏆", label: "Ranking", roles: ["miner", "dono", "gerente", "vendedor"] },
    ]},
    { group: "Vendas", items: [
      { key: "inbox", icon: "💬", label: "Inbox", roles: ["miner", "dono", "gerente", "vendedor"] },
      { key: "clientes", icon: "🙍", label: "Clientes", roles: ["miner", "dono", "gerente", "vendedor"] },
      { key: "segmentos", icon: "🎯", label: "Segmentos", roles: ["miner", "dono", "gerente"] },
      { key: "agenda", icon: "📋", label: "Agenda", roles: ["miner", "dono", "gerente", "vendedor"] },
      { key: "agenda_contatos", icon: "📅", label: "Agenda Contatos", roles: ["miner", "dono", "gerente", "vendedor"] },
      { key: "sugestoes", icon: "💡", label: "Sugestões", roles: ["miner", "dono", "gerente", "vendedor"] },
      { key: "pipeline", icon: "🔀", label: "Pipeline", roles: ["miner", "dono", "gerente", "vendedor"] },
      { key: "campanhas", icon: "📢", label: "Campanhas", roles: ["miner", "dono"] },
      { key: "automacoes", icon: "⚡", label: "Automações", roles: ["miner", "dono"] },
      { key: "respostas", icon: "⚡", label: "Respostas Rápidas", roles: ["miner", "dono", "gerente", "vendedor"] },
      { key: "relatorios", icon: "📊", label: "Relatórios", roles: ["miner", "dono", "gerente"] },
    ]},
    { group: "Retenção", items: [
      { key: "fidelidade", icon: "⭐", label: "Fidelidade", roles: ["miner", "dono", "gerente"] },
      { key: "indicacoes", icon: "🤝", label: "Indicações", roles: ["miner", "dono", "gerente"] },
    ]},
    { group: "Dados", items: [
      { key: "inteligencia", icon: "🧠", label: "Inteligência", roles: ["miner", "dono", "gerente"] },
      { key: "integracoes", icon: "🔌", label: "Integrações API", roles: ["miner", "dono"] },
      { key: "exportar", icon: "📤", label: "Dados & Export", roles: ["miner", "dono", "gerente"] },
      { key: "atividades", icon: "📜", label: "Atividades", roles: ["miner", "dono"] },
    ]},
    { group: "QR Code", items: [
      { key: "meuqr", icon: "📱", label: "Meu QR", roles: ["vendedor"] },
      { key: "qrcodes", icon: "📱", label: "QR Codes", roles: ["miner", "dono"] },
    ]},
    { group: "Config", items: [
      { key: "usuarios", icon: "🔐", label: "Usuários", roles: ["miner", "dono"] },
      { key: "permissoes", icon: "🛡", label: "Permissões", roles: ["miner", "dono"] },
      { key: "config", icon: "⚙", label: "Configurações", roles: ["miner", "dono"] },
    ]},
  ];

  const role = user.role;
  const rd = ROLE_CFG[role] || ROLE_CFG.vendedor;

  const NavItem = ({ item }) => {
    if (!item.roles?.includes(role)) return null;
    return (
      <div className={`nav-item ${page === item.key ? "active" : ""}`} onClick={() => setPage(item.key)}>
        <span style={{ fontSize: 14, width: 22, textAlign: "center" }}>{item.icon}</span>
        <span>{item.label}</span>
      </div>
    );
  };

  return (
    <div className={`sidebar ${className}`} style={{ width: 230, display: "flex", flexDirection: "column", flexShrink: 0, height: "100vh" }}>
      <div style={{ padding: "18px 16px 14px", borderBottom: "1px solid rgba(0,0,0,0.07)" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <MinerLogo height={22} />
            <span style={{ display: "inline-flex", alignItems: "center", gap: 4, fontSize: 10, fontWeight: 700, color: "#28cd41", background: "#28cd4115", padding: "2px 8px 2px 6px", borderRadius: 20, letterSpacing: "0.3px", flexShrink: 0 }}>
              <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#28cd41", display: "inline-block", animation: "pulse 2s ease-in-out infinite" }} />
              Ao vivo
            </span>
          </div>
          <NotificationBell onViewAll={() => setPage("notificacoes")} />
        </div>
        <div onClick={() => setPage("perfil")} style={{ marginTop: 12, display: "flex", alignItems: "center", gap: 9, background: page === "perfil" ? `${rd.c}18` : rd.bg, border: `1px solid ${rd.c}22`, borderRadius: 12, padding: "9px 11px", cursor: "pointer", transition: "background 0.15s" }} onMouseEnter={e => e.currentTarget.style.background = `${rd.c}18`} onMouseLeave={e => { if (page !== "perfil") e.currentTarget.style.background = rd.bg; }}>
          <Avatar nome={user.nome} size={30} />
          <div style={{ minWidth: 0 }}>
            <div style={{ fontSize: 13, fontWeight: 700, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{user.nome.split(" ")[0]}</div>
            <div style={{ fontSize: 10, color: rd.c, fontWeight: 700 }}>{rd.icon} {rd.label}</div>
          </div>
        </div>
      </div>

      <nav style={{ flex: 1, padding: "10px 8px", overflow: "auto" }}>
        {isOwner
          ? ownerNav.map((item, idx) => item.divider
              ? <div key={`div-${idx}`} className="nav-group" style={{ marginTop: 14 }}>{item.label}</div>
              : (
              <div key={item.key} className={`nav-item ${page === item.key ? "active" : ""}`} onClick={() => setPage(item.key)}>
                <span style={{ fontSize: 14, width: 22, textAlign: "center" }}>{item.icon}</span>
                <span>{item.label}</span>
              </div>
            ))
          : marcaNav.map((section, i) => (
              <div key={i}>
                {section.group && <div className="nav-group">{section.group}</div>}
                {(section.items || [section]).filter((x) => x.key).map((item) => (
                  <NavItem key={item.key} item={item} />
                ))}
              </div>
            ))}
      </nav>

      <div style={{ padding: "10px 8px 16px", borderTop: "1px solid rgba(0,0,0,0.07)" }}>
        <div style={{ fontSize: 11, color: T.muted, textAlign: "center", padding: 8 }}>⌘K para buscar</div>
        <div style={{padding:"8px 16px",display:"flex",alignItems:"center",justifyContent:"space-between"}}>
          <span style={{fontSize:12,color:"var(--muted)"}}>{dark?"🌙":"☀️"} Tema</span>
          <Toggle checked={dark} onChange={onToggleDark}/>
        </div>
        <div className="nav-item" onClick={onLogout} style={{ color: T.muted }}>
          <span style={{ fontSize: 14, width: 22, textAlign: "center" }}>←</span>
          <span>Sair</span>
        </div>
      </div>
    </div>
  );
}

// ── OWNER PAGES ──────────────────────────────────────────────────────────────
// Helper: compute MRR from plano field

export default Sidebar;
