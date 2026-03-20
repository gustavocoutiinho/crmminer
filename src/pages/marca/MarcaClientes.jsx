import React, { useState, useEffect, useCallback } from "react";
import { T, RFM_CFG } from "../../lib/theme";
import { Avatar, Chip, SectionHeader } from "../../components/UI";
import { useToast } from "../../context/ToastContext";
import { fetchData, fetchTags } from "../../lib/api";
import ClienteDetailModal from "./ClienteDetailModal";

function MarcaClientes({ user }) {
  const toast = useToast();
  const [allClientes, setAllClientes] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("todos");
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [selectedCliente, setSelectedCliente] = useState(null);
  const [page, setPage] = useState(1);
  const [orderBy, setOrderBy] = useState("created_at");
  const [orderDir, setOrderDir] = useState("desc");
  const [tagFilter, setTagFilter] = useState(null);
  const [availableTags, setAvailableTags] = useState([]);
  const PER_PAGE = 50;

  // Load available tags
  useEffect(() => { fetchTags().then(r => setAvailableTags(r.data || [])).catch(() => {}); }, []);

  // Debounce search — 400ms
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search), 400);
    return () => clearTimeout(timer);
  }, [search]);

  // Reset to page 1 when filters change
  useEffect(() => { setPage(1); }, [filter, debouncedSearch, orderBy, orderDir, tagFilter]);

  // Fetch data
  const loadClientes = useCallback(() => {
    const opts = { limit: PER_PAGE, offset: (page - 1) * PER_PAGE, order_by: orderBy, order_dir: orderDir };
    if (filter !== "todos") opts.segmento_rfm = filter;
    if (debouncedSearch) opts.search = debouncedSearch;
    if (tagFilter) opts.tag = tagFilter;
    setLoading(true);
    fetchData("clientes", opts).then(r => { setAllClientes(r.data || []); setTotal(r.total || 0); setLoading(false); }).catch(() => setLoading(false));
  }, [filter, debouncedSearch, page, orderBy, orderDir, tagFilter]);

  useEffect(() => { loadClientes(); }, [loadClientes]);
  useEffect(() => { const iv = setInterval(loadClientes, 30000); return () => clearInterval(iv); }, [loadClientes]);

  const totalPages = Math.max(1, Math.ceil(total / PER_PAGE));

  const handleSort = (col) => {
    if (orderBy === col) { setOrderDir(d => d === "asc" ? "desc" : "asc"); }
    else { setOrderBy(col); setOrderDir("desc"); }
  };

  const sortIndicator = (col) => {
    if (orderBy !== col) return "";
    return orderDir === "asc" ? " ▲" : " ▼";
  };

  const COLUMNS = [
    { key: "nome", label: "Cliente" },
    { key: "email", label: "Email" },
    { key: null, label: "Telefone" },
    { key: "segmento_rfm", label: "RFM" },
    { key: "recencia_dias", label: "Recência" },
    { key: "total_pedidos", label: "Pedidos" },
    { key: "receita_total", label: "Receita" },
  ];

  return (
    <div className="fade-up">
      <SectionHeader tag="CRM" title="Base de Clientes" action={<span className="num" style={{ fontSize: 13, color: T.muted }}>{total.toLocaleString("pt-BR")} clientes</span>} />

      {/* Filtros */}
      <div style={{ display: "flex", gap: 8, marginBottom: 16, flexWrap: "wrap", alignItems: "center" }}>
        <div className="seg">
          {[{ k: "todos", l: "Todos" }, ...Object.entries(RFM_CFG).map(([k, v]) => ({ k, l: v.label }))].map((f) => (
            <button key={f.k} className={`seg-btn ${filter === f.k ? "on" : ""}`} onClick={() => setFilter(f.k)}>{f.l}</button>
          ))}
        </div>
        <input className="ap-inp" style={{ maxWidth: 220, padding: "8px 12px", fontSize: 13 }} placeholder="🔍 Buscar por nome ou email..." value={search} onChange={(e) => setSearch(e.target.value)} />
      </div>

      {/* Tag filter chips */}
      {availableTags.length > 0 && (
        <div style={{ display: "flex", gap: 6, marginBottom: 16, flexWrap: "wrap", alignItems: "center" }}>
          <span style={{ fontSize: 11, color: T.muted, fontWeight: 600, marginRight: 4 }}>🏷 Tags:</span>
          {availableTags.map(t => (
            <button key={t.id} onClick={() => setTagFilter(tagFilter === t.nome ? null : t.nome)} style={{ display: "inline-flex", alignItems: "center", gap: 5, background: tagFilter === t.nome ? (t.cor || "#4545F5") : `${t.cor || "#4545F5"}14`, color: tagFilter === t.nome ? "#fff" : (t.cor || "#4545F5"), border: "none", borderRadius: 16, padding: "4px 12px", fontSize: 12, fontWeight: 600, cursor: "pointer", transition: "all .15s" }}>
              <span style={{ width: 6, height: 6, borderRadius: 3, background: tagFilter === t.nome ? "#fff" : (t.cor || "#4545F5") }} />
              {t.nome}
            </button>
          ))}
          {tagFilter && <button onClick={() => setTagFilter(null)} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 11, color: T.muted, textDecoration: "underline" }}>Limpar filtro</button>}
        </div>
      )}

      {loading && <div style={{ textAlign: "center", padding: 40, color: T.muted }}>⏳ Carregando clientes...</div>}

      {!loading && allClientes.length === 0 && <div style={{ textAlign: "center", padding: 40, color: T.muted }}>Nenhum cliente encontrado.</div>}

      {!loading && allClientes.length > 0 && (
        <>
          <div className="ap-card" style={{ padding: 0, overflow: "hidden" }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead><tr style={{ borderBottom: "1px solid rgba(0,0,0,0.07)", background: "rgba(0,0,0,0.02)" }}>
                {COLUMNS.map((col) => (
                  <th key={col.label} className="ap-th" style={col.key ? { cursor: "pointer", userSelect: "none" } : {}} onClick={col.key ? () => handleSort(col.key) : undefined}>
                    {col.label}{col.key ? sortIndicator(col.key) : ""}
                  </th>
                ))}
              </tr></thead>
              <tbody>
                {allClientes.map((c, i) => {
                  const segKey = c.segmento_rfm;
                  const rec = c.recencia_dias ?? 999;
                  const ped = c.total_pedidos ?? 0;
                  const rec_total = +(c.receita_total ?? 0);
                  return (
                    <tr key={c.id || i} className="ap-tr" style={{ cursor: "pointer" }} onClick={() => setSelectedCliente(c.id)}>
                      <td className="ap-td"><div style={{ display: "flex", alignItems: "center", gap: 10 }}><Avatar nome={c.nome} size={32} /><div style={{ fontSize: 14, fontWeight: 700 }}>{c.nome}</div></div></td>
                      <td className="ap-td"><span style={{ fontSize: 13, color: T.sub }}>{c.email || "—"}</span></td>
                      <td className="ap-td"><span style={{ fontSize: 13, color: T.sub }}>{c.telefone || "—"}</span></td>
                      <td className="ap-td"><Chip label={RFM_CFG[segKey]?.label || "—"} c={RFM_CFG[segKey]?.c} bg={RFM_CFG[segKey]?.bg} /></td>
                      <td className="ap-td"><span className="num" style={{ fontSize: 13, color: rec > 90 ? "#ff3b30" : T.sub }}>{rec < 999 ? `${rec}d` : "—"}</span></td>
                      <td className="ap-td"><span className="num" style={{ fontSize: 13 }}>{ped}</span></td>
                      <td className="ap-td"><span className="num" style={{ fontWeight: 700, fontSize: 13 }}>R$ {rec_total.toLocaleString("pt-BR")}</span></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          <div style={{ display: "flex", justifyContent: "center", alignItems: "center", gap: 12, marginTop: 16, padding: "12px 0" }}>
            <button className="ap-btn ap-btn-secondary ap-btn-sm" disabled={page <= 1} onClick={() => setPage(p => Math.max(1, p - 1))}>← Anterior</button>
            <span style={{ fontSize: 13, fontWeight: 600, color: T.sub }}>Página {page} de {totalPages}</span>
            <button className="ap-btn ap-btn-secondary ap-btn-sm" disabled={page >= totalPages} onClick={() => setPage(p => Math.min(totalPages, p + 1))}>Próxima →</button>
          </div>
        </>
      )}

      {selectedCliente && <ClienteDetailModal clienteId={selectedCliente} onClose={() => setSelectedCliente(null)} />}
    </div>
  );
}

export default MarcaClientes;
