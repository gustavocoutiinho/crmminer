import React, { useState } from "react";
import { T } from "../../lib/theme";
import { MinerLogo } from "../../components/UI";
import { useSupabaseQuery } from "../../lib/hooks";
import { DB_FALLBACK } from "../../data/fallback";
import GlobalSearch from "../../components/GlobalSearch";
import Sidebar from "../../components/Sidebar";
import NotificationBell from "../../components/NotificationBell";
import OwnerDashboard from "./OwnerDashboard";
import OwnerMarcas from "./OwnerMarcas";
import OwnerUsuarios from "./OwnerUsuarios";
import OwnerSistema from "./OwnerSistema";
import OwnerPlanos from "./OwnerPlanos";
import OwnerFinanceiro from "./OwnerFinanceiro";
import MeuPerfil from "../marca/MeuPerfil";
import MarcaClientes from "../marca/MarcaClientes";
import MarcaPipeline from "../marca/MarcaPipeline";

const STYLES_IMPORT = null; // CSS is now in global.css

function PortalOwner({ user, onLogout, dark, onToggleDark }) {
  const [page, setPage] = useState("dashboard");
  const [menuOpen, setMenuOpen] = useState(false);
  const { data: sbMarcas, loading: loadingMarcas, refetch: refetchMarcas } = useSupabaseQuery("marcas");
  const [localMarcas, setLocalMarcas] = useState(DB_FALLBACK.marcas);

  const marcas = sbMarcas && sbMarcas.length > 0 ? sbMarcas : localMarcas;
  const setMarcas = sbMarcas && sbMarcas.length > 0 ? () => {} : setLocalMarcas;

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100vh", background: "var(--bg)", overflow: "hidden" }}>
      {/* styles in global.css */}
      <GlobalSearch setPage={setPage} />
      <div className="mobile-header" style={{ display: "none" }}>
        <button onClick={() => setMenuOpen(!menuOpen)} style={{ background: "none", border: "none", fontSize: 22, cursor: "pointer", padding: 4, color: T.text }}>☰</button>
        <MinerLogo height={18} />
        <div style={{ marginLeft: "auto" }}><NotificationBell /></div>
      </div>
      <div style={{ display: "flex", flex: 1, overflow: "hidden" }}>
        <div className={`sidebar-overlay ${menuOpen ? "visible" : ""}`} onClick={() => setMenuOpen(false)} />
        <Sidebar page={page} setPage={(p) => { setPage(p); setMenuOpen(false); }} user={user} onLogout={onLogout} isOwner className={menuOpen ? "open" : ""} dark={dark} onToggleDark={onToggleDark} />
        <div className="main-content" style={{ flex: 1, overflow: "auto", padding: "32px 36px" }}>
          {page === "perfil" && <MeuPerfil user={user} onLogout={onLogout} />}
          {page === "dashboard" && <OwnerDashboard marcas={marcas} />}
          {page === "marcas" && <OwnerMarcas marcas={marcas} setMarcas={setMarcas} refetchMarcas={refetchMarcas} />}
          {page === "usuarios_admin" && <OwnerUsuarios />}
          {page === "sistema" && <OwnerSistema />}
          {page === "clientes" && <MarcaClientes user={user} />}
          {page === "pipeline" && <MarcaPipeline user={user} />}
          {page === "planos" && <OwnerPlanos marcas={marcas} />}
          {page === "financeiro" && <OwnerFinanceiro marcas={marcas} />}
        </div>
      </div>
    </div>
  );
}


export default PortalOwner;
