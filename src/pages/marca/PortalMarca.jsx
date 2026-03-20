import React, { useState, useEffect } from "react";
import { T } from "../../lib/theme";
import { MinerLogo } from "../../components/UI";
import GlobalSearch from "../../components/GlobalSearch";
import Sidebar from "../../components/Sidebar";
import NotificationBell from "../../components/NotificationBell";
import OnboardingBanner from "../../components/OnboardingBanner";
import { fetchOnboarding, skipOnboarding } from "../../lib/api";
import MarcaDashboard from "./MarcaDashboard";
import MarcaEquipe from "./MarcaEquipe";
import MarcaRanking from "./MarcaRanking";
import MarcaInbox from "./MarcaInbox";
import MarcaClientes from "./MarcaClientes";
import MarcaAgenda from "./MarcaAgenda";
import MarcaCampanhas from "./MarcaCampanhas";
import MarcaAutomacoes from "./MarcaAutomacoes";
import MarcaRelatorios from "./MarcaRelatorios";
import MarcaPipeline from "./MarcaPipeline";
import MarcaInteligencia from "./MarcaInteligencia";
import MarcaIntegracoes from "./MarcaIntegracoes";
import MarcaDados from "./MarcaDados";
import MarcaAtividades from "./MarcaAtividades";
import MarcaUsuarios from "./MarcaUsuarios";
import MarcaConfig from "./MarcaConfig";
import MarcaNotificacoes from "./MarcaNotificacoes";
import MeuPerfil from "./MeuPerfil";
import MetasVendedor from "./MetasVendedor";
import MeuQRCode from "./MeuQRCode";
import GestaoQRCodes from "./GestaoQRCodes";
import Fidelidade from "./Fidelidade";
import IndiqueCashback from "./IndiqueCashback";
import RespostasRapidas from "./RespostasRapidas";
import AgendaContatos from "./AgendaContatos";
import ContatosProativos from "./ContatosProativos";
import GestaoVendedores from "./GestaoVendedores";
import Permissoes from "./Permissoes";

const STYLES_IMPORT = null; // CSS is now in global.css

function PortalMarca({ user, onLogout, dark, onToggleDark }) {
  const [page, setPage] = useState("dashboard");
  const [menuOpen, setMenuOpen] = useState(false);
  const [onboarding, setOnboarding] = useState(null);
  const [onboardingDismissed, setOnboardingDismissed] = useState(() => localStorage.getItem("crm_onboard_done") === "1");
  const isAdmin = user.role === "dono" || user.role === "miner";
  const isSup = user.role === "gerente" || isAdmin;

  useEffect(() => {
    if (!onboardingDismissed && isAdmin) {
      fetchOnboarding().then(setOnboarding).catch(() => {});
    }
  }, [onboardingDismissed, isAdmin, page]);

  const handleDismissOnboarding = () => {
    setOnboardingDismissed(true);
    localStorage.setItem("crm_onboard_done", "1");
    skipOnboarding().catch(() => {});
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100vh", background: "var(--bg)", overflow: "hidden" }}>
      <style>{STYLES}</style>
      <GlobalSearch setPage={setPage} />
      <div className="mobile-header" style={{ display: "none" }}>
        <button onClick={() => setMenuOpen(!menuOpen)} style={{ background: "none", border: "none", fontSize: 22, cursor: "pointer", padding: 4, color: T.text }}>☰</button>
        <MinerLogo height={18} />
        <div style={{ marginLeft: "auto" }}><NotificationBell onViewAll={() => { setPage("notificacoes"); setMenuOpen(false); }} /></div>
      </div>
      <div style={{ display: "flex", flex: 1, overflow: "hidden" }}>
        <div className={`sidebar-overlay ${menuOpen ? "visible" : ""}`} onClick={() => setMenuOpen(false)} />
        <Sidebar page={page} setPage={(p) => { setPage(p); setMenuOpen(false); }} user={user} onLogout={onLogout} className={menuOpen ? "open" : ""} dark={dark} onToggleDark={onToggleDark} />
        <div className="main-content" style={{ flex: 1, overflow: "auto", padding: "32px 36px" }}>
          {/* Onboarding Banner */}
          {!onboardingDismissed && onboarding && !onboarding.complete && isAdmin && (
            <OnboardingBanner steps={onboarding.steps} setPage={setPage} onDismiss={handleDismissOnboarding} />
          )}
          {page === "perfil" && <MeuPerfil user={user} onLogout={onLogout} />}
          {page === "dashboard" && <MarcaDashboard user={user} setPage={setPage} />}
          {page === "equipe" && isSup && <MarcaEquipe isAdmin={isAdmin} user={user} />}
          {page === "ranking" && <MarcaRanking user={user} />}
          {page === "inbox" && <MarcaInbox user={user} />}
          {page === "clientes" && <MarcaClientes user={user} />}
          {page === "agenda" && <MarcaAgenda user={user} />}
          {page === "campanhas" && isAdmin && <MarcaCampanhas user={user} />}
          {page === "automacoes" && isAdmin && <MarcaAutomacoes user={user} />}
          {page === "relatorios" && (isAdmin || isSup) && <MarcaRelatorios user={user} />}
          {page === "pipeline" && <MarcaPipeline user={user} />}
          {page === "inteligencia" && (isAdmin || isSup) && <MarcaInteligencia user={user} />}
          {page === "integracoes" && isAdmin && <MarcaIntegracoes user={user} />}
          {page === "exportar" && <MarcaDados user={user} />}
          {page === "atividades" && isAdmin && <MarcaAtividades />}
          {page === "usuarios" && isAdmin && <MarcaUsuarios user={user} />}
          {page === "config" && isAdmin && <MarcaConfig user={user} />}
          {page === "notificacoes" && <MarcaNotificacoes user={user} />}
          {page === "metas" && <MetasVendedor user={user} />}
          {page === "meuqr" && user.role === "vendedor" && <MeuQRCode user={user} />}
          {page === "qrcodes" && isAdmin && <GestaoQRCodes user={user} />}
          {page === "fidelidade" && (isAdmin || isSup) && <Fidelidade user={user} />}
          {page === "indicacoes" && (isAdmin || isSup) && <IndiqueCashback user={user} />}
          {page === "respostas" && <RespostasRapidas user={user} />}
          {page === "agenda_contatos" && <AgendaContatos user={user} />}
          {page === "sugestoes" && <ContatosProativos user={user} />}
          {page === "gestao_vendedores" && isSup && <GestaoVendedores user={user} />}
          {page === "permissoes" && isAdmin && <Permissoes user={user} />}
        </div>
      </div>
    </div>
  );
}

// ── PIPELINE DE VENDAS ────────────────────────────────────────────────────────
const ETAPA_CFG = {
  lead: { label: "Lead", icon: "🎯", c: "#6e6e73", bg: "#f0f0f0", prob: 10 },
  contato: { label: "Contato", icon: "📞", c: "#4545F5", bg: "#e8e8ff", prob: 20 },
  visita: { label: "Visita/Showroom", icon: "👟", c: "#8e44ef", bg: "#f3eeff", prob: 35 },
  proposta: { label: "Proposta", icon: "📋", c: "#ff9500", bg: "#fff3e0", prob: 50 },
  negociacao: { label: "Negociação", icon: "🤝", c: "#ff6b35", bg: "#fff0e8", prob: 70 },
  pedido: { label: "Pedido", icon: "📦", c: "#28cd41", bg: "#e9fbed", prob: 90 },
  fechado_ganho: { label: "Fechado ✓", icon: "🏆", c: "#28cd41", bg: "#e9fbed", prob: 100 },
  fechado_perdido: { label: "Perdido", icon: "❌", c: "#ff3b30", bg: "#ffe5e3", prob: 0 },
};
const ACTIVE_STAGES = ["lead", "contato", "visita", "proposta", "negociacao", "pedido"];
const NEXT_STAGE = { lead: "contato", contato: "visita", visita: "proposta", proposta: "negociacao", negociacao: "pedido", pedido: "fechado_ganho" };
const FONTES = [
  { value: "", label: "Selecionar..." },
  { value: "shopify", label: "Shopify" },
  { value: "whatsapp", label: "WhatsApp" },
  { value: "indicacao", label: "Indicação" },
  { value: "site", label: "Site" },
  { value: "outro", label: "Outro" },
];

export default PortalMarca;
