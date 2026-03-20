import React, { useState, useEffect } from "react";
import { T } from "../../lib/theme";
import { Avatar, Chip, SectionHeader } from "../../components/UI";
import { fetchActivity, fetchData } from "../../lib/api";
import { timeAgo } from "../../utils/helpers";

function MarcaAtividades() {
  const ACAO_TIPO = {
    create: { label: "Criação", icon: "➕", c: "#28cd41", bg: "#e9fbed" },
    update: { label: "Atualização", icon: "✏️", c: "#007aff", bg: "#e5f0ff" },
    delete: { label: "Exclusão", icon: "🗑", c: "#ff3b30", bg: "#ffe5e3" },
    login: { label: "Login", icon: "🔐", c: "#8e44ef", bg: "#f3eeff" },
    importacao: { label: "Importação", icon: "📤", c: "#ff9500", bg: "#fff3e0" },
    sync: { label: "Sincronização", icon: "🔄", c: "#00c7be", bg: "#e0faf8" },
  };
  const ENTITY_ICONS = { clientes: "🙍", tarefas: "📋", campanhas: "📢", automacoes: "⚡", users: "👤", marcas: "🏢", oportunidades: "💰", tags: "🏷", webhooks: "🔗", templates: "📝" };
  const PER_PAGE = 30;

  const [activities, setActivities] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(0);
  const [equipe, setEquipe] = useState([]);

  // Filters
  const [fAcao, setFAcao] = useState("");
  const [fUser, setFUser] = useState("");
  const [fSearch, setFSearch] = useState("");
  const [fFrom, setFFrom] = useState("");
  const [fTo, setFTo] = useState("");
  const [copied, setCopied] = useState(false);

  const load = async (pg) => {
    setLoading(true);
    try {
      const res = await fetchActivity({ limit: PER_PAGE, offset: pg * PER_PAGE, acao: fAcao, user_id: fUser, search: fSearch, from: fFrom, to: fTo });
      setActivities(res?.data || []);
      setTotal(res?.total || 0);
    } catch (e) { console.error(e); }
    setLoading(false);
  };

  useEffect(() => { fetchData("users", { limit: 100 }).then(r => setEquipe(r.data || [])).catch(() => {}); }, []);
  useEffect(() => { load(page); }, [page, fAcao, fUser, fFrom, fTo]);
  // debounce search
  useEffect(() => { const t = setTimeout(() => { setPage(0); load(0); }, 400); return () => clearTimeout(t); }, [fSearch]);
  useEffect(() => { setPage(0); }, [fAcao, fUser, fFrom, fTo]);

  const totalPages = Math.max(1, Math.ceil(total / PER_PAGE));

  const clearFilters = () => { setFAcao(""); setFUser(""); setFSearch(""); setFFrom(""); setFTo(""); setPage(0); };
  const hasFilters = fAcao || fUser || fSearch || fFrom || fTo;

  const exportJSON = () => {
    navigator.clipboard.writeText(JSON.stringify(activities, null, 2)).then(() => { setCopied(true); setTimeout(() => setCopied(false), 2000); });
  };

  const fmtDate = (d) => { if (!d) return ""; const dt = new Date(d); return dt.toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" }); };

  const fmtDetails = (det) => {
    if (!det) return null;
    const obj = typeof det === "string" ? (() => { try { return JSON.parse(det); } catch { return null; } })() : det;
    if (!obj || typeof obj !== "object") return typeof det === "string" ? det : JSON.stringify(det);
    const keys = Object.keys(obj);
    if (keys.length === 0) return null;
    return keys.slice(0, 4).map(k => `${k}: ${typeof obj[k] === "object" ? JSON.stringify(obj[k]) : obj[k]}`).join(" · ") + (keys.length > 4 ? " …" : "");
  };

  const inputSt = { padding: "8px 12px", borderRadius: 10, border: "1px solid rgba(0,0,0,0.1)", fontSize: 13, background: "#fff", outline: "none", minWidth: 0 };
  const selSt = { ...inputSt, appearance: "none", WebkitAppearance: "none", paddingRight: 28, backgroundImage: "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='6'%3E%3Cpath d='M0 0l5 6 5-6z' fill='%23999'/%3E%3C/svg%3E\")", backgroundRepeat: "no-repeat", backgroundPosition: "right 10px center" };

  return (
    <div className="fade-up">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
        <SectionHeader tag="Auditoria" title="Log de Atividades" />
        <button onClick={exportJSON} style={{ padding: "8px 16px", borderRadius: 10, border: "1px solid rgba(0,0,0,0.1)", background: "#fff", fontSize: 13, cursor: "pointer", display: "flex", alignItems: "center", gap: 6, color: T.sub, fontWeight: 500 }}>
          {copied ? "✅ Copiado!" : "📋 Exportar JSON"}
        </button>
      </div>

      {/* Filters bar */}
      <div className="ap-card" style={{ padding: "14px 18px", marginBottom: 16, display: "flex", flexWrap: "wrap", gap: 10, alignItems: "center" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <label style={{ fontSize: 12, color: T.muted, fontWeight: 600 }}>De</label>
          <input type="date" value={fFrom} onChange={e => setFFrom(e.target.value)} style={inputSt} />
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <label style={{ fontSize: 12, color: T.muted, fontWeight: 600 }}>Até</label>
          <input type="date" value={fTo} onChange={e => setFTo(e.target.value)} style={inputSt} />
        </div>
        <select value={fAcao} onChange={e => setFAcao(e.target.value)} style={selSt}>
          <option value="">Todas as ações</option>
          {Object.entries(ACAO_TIPO).map(([k, v]) => <option key={k} value={k}>{v.icon} {v.label}</option>)}
        </select>
        <select value={fUser} onChange={e => setFUser(e.target.value)} style={selSt}>
          <option value="">Todos os usuários</option>
          {equipe.map(u => <option key={u.id} value={u.id}>{u.nome}</option>)}
        </select>
        <input type="text" placeholder="🔍 Buscar nos detalhes…" value={fSearch} onChange={e => setFSearch(e.target.value)} style={{ ...inputSt, flex: 1, minWidth: 160 }} />
        {hasFilters && <button onClick={clearFilters} style={{ padding: "8px 14px", borderRadius: 10, border: "none", background: "rgba(255,59,48,0.08)", color: "#ff3b30", fontSize: 13, cursor: "pointer", fontWeight: 600 }}>✕ Limpar Filtros</button>}
      </div>

      {/* Count */}
      <div style={{ fontSize: 12, color: T.muted, marginBottom: 12, fontWeight: 500 }}>{total} registro{total !== 1 ? "s" : ""} encontrado{total !== 1 ? "s" : ""}</div>

      {loading && <div style={{ textAlign: "center", padding: 40, color: T.muted }}>⏳ Carregando atividades...</div>}

      {!loading && activities.length === 0 && (
        <div className="ap-card" style={{ textAlign: "center", padding: "48px 24px", color: T.muted }}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>📭</div>
          <div style={{ fontSize: 15, fontWeight: 600 }}>Nenhuma atividade registrada neste período</div>
          <div style={{ fontSize: 13, marginTop: 6 }}>Ajuste os filtros ou aguarde novas ações no sistema.</div>
        </div>
      )}

      {!loading && activities.length > 0 && (
        <div className="ap-card" style={{ padding: 0, overflow: "hidden" }}>
          {activities.map((a, i) => {
            const tipo = ACAO_TIPO[a.acao] || { label: a.acao, icon: "📌", c: "#8e8e93", bg: "#f2f2f7" };
            const details = fmtDetails(a.detalhes);
            return (
              <div key={a.id || i} style={{ display: "flex", gap: 12, padding: "14px 20px", borderBottom: i < activities.length - 1 ? "1px solid rgba(0,0,0,0.05)" : "none", alignItems: "flex-start" }}>
                <Avatar nome={a.user_nome || "?"} size={34} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                    <span style={{ fontWeight: 700, fontSize: 13 }}>{a.user_nome || "Sistema"}</span>
                    <span style={{ display: "inline-flex", alignItems: "center", gap: 4, fontSize: 11, fontWeight: 700, padding: "2px 10px", borderRadius: 99, color: tipo.c, background: tipo.bg }}>
                      {tipo.icon} {tipo.label}
                    </span>
                    <span style={{ fontSize: 12, color: T.sub, fontWeight: 600 }}>{ENTITY_ICONS[a.entidade] || "📌"} {a.entidade}{a.entidade_id ? ` #${a.entidade_id}` : ""}</span>
                  </div>
                  {details && <div style={{ fontSize: 12, color: T.muted, marginTop: 4, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: "100%" }}>{details}</div>}
                  {a.ip && <div style={{ fontSize: 10, color: "rgba(0,0,0,0.25)", marginTop: 3 }}>IP: {a.ip}</div>}
                </div>
                <span title={fmtDate(a.created_at)} style={{ fontSize: 11, color: T.muted, flexShrink: 0, whiteSpace: "nowrap", marginTop: 2 }}>{timeAgo(a.created_at)}</span>
              </div>
            );
          })}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div style={{ display: "flex", justifyContent: "center", alignItems: "center", gap: 16, marginTop: 16 }}>
          <button disabled={page === 0} onClick={() => setPage(p => p - 1)} style={{ padding: "8px 18px", borderRadius: 10, border: "1px solid rgba(0,0,0,0.1)", background: page === 0 ? "#f5f5f7" : "#fff", color: page === 0 ? T.muted : T.fg, fontSize: 13, cursor: page === 0 ? "default" : "pointer", fontWeight: 600, opacity: page === 0 ? 0.5 : 1 }}>← Anterior</button>
          <span style={{ fontSize: 13, color: T.sub, fontWeight: 500 }}>Página {page + 1} de {totalPages}</span>
          <button disabled={page >= totalPages - 1} onClick={() => setPage(p => p + 1)} style={{ padding: "8px 18px", borderRadius: 10, border: "1px solid rgba(0,0,0,0.1)", background: page >= totalPages - 1 ? "#f5f5f7" : "#fff", color: page >= totalPages - 1 ? T.muted : T.fg, fontSize: 13, cursor: page >= totalPages - 1 ? "default" : "pointer", fontWeight: 600, opacity: page >= totalPages - 1 ? 0.5 : 1 }}>Próxima →</button>
        </div>
      )}
    </div>
  );
}


export default MarcaAtividades;
