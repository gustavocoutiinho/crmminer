import React, { useState, useEffect, useCallback, useMemo } from "react";
import { T, RFM_CFG } from "../../lib/theme";
import { Avatar, Chip, SectionHeader, Modal, Lbl } from "../../components/UI";
import { useToast } from "../../context/ToastContext";
import { fetchData, fetchTags } from "../../lib/api";
import { DB_FALLBACK } from "../../data/fallback";
import { useCarteira } from "../../hooks/useCarteira";
import { useFrequencia } from "../../hooks/useFrequencia";
import ClienteDetailModal from "./ClienteDetailModal";
import ContatoModal from "./ContatoModal";

function FrequenciaBadge({ cliente, configMarca }) {
  const { bloqueado, horasRestantes } = useFrequencia(cliente, configMarca);
  if (!bloqueado) return null;
  return (
    <span style={{
      display: "inline-flex", alignItems: "center", gap: 4,
      background: "rgba(255,149,0,0.12)", borderRadius: 12,
      padding: "3px 10px", fontSize: 11, fontWeight: 600, color: "#ff9500",
    }}>
      ⏳ {horasRestantes}h
    </span>
  );
}

function TransferModal({ cliente, usuarios, onConfirm, onClose }) {
  const [vendedorId, setVendedorId] = useState(cliente.vendedor_id || "");
  const vendedores = usuarios.filter(u => u.role === "vendedor");

  return (
    <Modal title={`Transferir ${cliente.nome}`} onClose={onClose}>
      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        <div>
          <Lbl>Novo vendedor responsável</Lbl>
          <select className="ap-inp" value={vendedorId} onChange={e => setVendedorId(e.target.value)}>
            <option value="">Selecione...</option>
            {vendedores.map(v => (
              <option key={v.id} value={v.id}>{v.nome} — {v.loja || "Sem loja"}</option>
            ))}
          </select>
        </div>
        <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
          <button className="ap-btn ap-btn-secondary" onClick={onClose}>Cancelar</button>
          <button className="ap-btn ap-btn-primary" onClick={() => onConfirm(vendedorId)} disabled={!vendedorId}>
            Transferir
          </button>
        </div>
      </div>
    </Modal>
  );
}

function MarcaClientes({ user }) {
  const toast = useToast();
  const [allClientes, setAllClientes] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("todos");
  const [carteiraTab, setCarteiraTab] = useState("minha");
  const [filtroContato, setFiltroContato] = useState(null);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [selectedCliente, setSelectedCliente] = useState(null);
  const [contatoCliente, setContatoCliente] = useState(null);
  const [contatoOverride, setContatoOverride] = useState(false);
  const [transferCliente, setTransferCliente] = useState(null);
  const [page, setPage] = useState(1);
  const [orderBy, setOrderBy] = useState("created_at");
  const [orderDir, setOrderDir] = useState("desc");
  const [tagFilter, setTagFilter] = useState(null);
  const [availableTags, setAvailableTags] = useState([]);
  const PER_PAGE = 50;

  const isAdmin = user.role === "dono" || user.role === "miner";
  const isSup = user.role === "gerente" || isAdmin;

  const marca = DB_FALLBACK.marcas.find(m => m.id === (user.marca_id || user.marcaId || "prls"));
  const configMarca = marca?.config || { intervalo_minimo_contato_horas: 48 };

  // Load tags
  useEffect(() => { fetchTags().then(r => setAvailableTags(r.data || [])).catch(() => {}); }, []);

  // Debounce
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search), 400);
    return () => clearTimeout(timer);
  }, [search]);

  useEffect(() => { setPage(1); }, [filter, debouncedSearch, orderBy, orderDir, tagFilter, carteiraTab, filtroContato]);

  // Fetch from API or fallback
  const loadClientes = useCallback(() => {
    const opts = { limit: 250, offset: 0, order_by: orderBy, order_dir: orderDir };
    if (filter !== "todos") opts.segmento_rfm = filter;
    if (debouncedSearch) opts.search = debouncedSearch;
    if (tagFilter) opts.tag = tagFilter;
    setLoading(true);
    fetchData("clientes", opts)
      .then(r => { setAllClientes(r.data || []); setTotal(r.total || 0); setLoading(false); })
      .catch(() => {
        // Fallback
        setAllClientes(DB_FALLBACK.clientes);
        setTotal(DB_FALLBACK.clientes.length);
        setLoading(false);
      });
  }, [filter, debouncedSearch, orderBy, orderDir, tagFilter]);

  useEffect(() => { loadClientes(); }, [loadClientes]);

  // Carteira filtering
  const { meusClientes, todosMarca, filtros } = useCarteira(user, allClientes);

  const clientesExibidos = useMemo(() => {
    let base = carteiraTab === "todos" && isSup ? todosMarca : meusClientes;

    // Search filter (client-side for fallback)
    if (debouncedSearch) {
      const q = debouncedSearch.toLowerCase();
      base = base.filter(c => (c.nome || "").toLowerCase().includes(q) || (c.email || "").toLowerCase().includes(q));
    }

    // Filtro de contato
    if (filtroContato === "sem30d") base = base.filter(c => filtros.sem30d.includes(c));
    if (filtroContato === "sem60d") base = base.filter(c => filtros.sem60d.includes(c));
    if (filtroContato === "sem90d") base = base.filter(c => filtros.sem90d.includes(c));
    if (filtroContato === "novos") base = base.filter(c => filtros.novos.includes(c));
    if (filtroContato === "emRisco") base = base.filter(c => filtros.emRisco.includes(c));

    return base;
  }, [carteiraTab, isSup, todosMarca, meusClientes, debouncedSearch, filtroContato, filtros]);

  const totalPages = Math.max(1, Math.ceil(clientesExibidos.length / PER_PAGE));
  const paginados = clientesExibidos.slice((page - 1) * PER_PAGE, page * PER_PAGE);

  const handleSort = (col) => {
    if (orderBy === col) setOrderDir(d => d === "asc" ? "desc" : "asc");
    else { setOrderBy(col); setOrderDir("desc"); }
  };
  const sortIndicator = (col) => orderBy !== col ? "" : orderDir === "asc" ? " ▲" : " ▼";

  const handleContato = (cliente) => {
    const freq = calcFrequencia(cliente, configMarca);
    if (freq.bloqueado && !isSup) {
      toast(freq.msgBloqueio, "warning");
      return;
    }
    setContatoOverride(freq.bloqueado);
    setContatoCliente(cliente);
  };

  const handleContatoConfirm = (registro) => {
    // Update local state
    setAllClientes(prev => prev.map(c => {
      if (c.id === registro.cliente_id) {
        return {
          ...c,
          ultimo_contato: registro.created_at,
          proximo_contato_permitido: new Date(
            new Date(registro.created_at).getTime() + (configMarca.intervalo_minimo_contato_horas || 48) * 60 * 60 * 1000
          ).toISOString(),
        };
      }
      return c;
    }));
    setContatoCliente(null);
  };

  const handleTransfer = (vendedorId) => {
    if (!transferCliente || !vendedorId) return;
    setAllClientes(prev => prev.map(c =>
      c.id === transferCliente.id ? { ...c, vendedor_id: vendedorId } : c
    ));
    const vendedor = DB_FALLBACK.usuarios.find(u => u.id === vendedorId);
    toast(`${transferCliente.nome} transferido para ${vendedor?.nome || "vendedor"}! ✅`, "success");
    setTransferCliente(null);
  };

  const FILTROS_CONTATO = [
    { k: "sem30d", l: "Sem contato 30d", count: filtros.sem30d.length },
    { k: "sem60d", l: "Sem contato 60d", count: filtros.sem60d.length },
    { k: "sem90d", l: "Sem contato 90d", count: filtros.sem90d.length },
    { k: "novos", l: "Novos esta semana", count: filtros.novos.length },
    { k: "emRisco", l: "Em risco", count: filtros.emRisco.length },
  ];

  const COLUMNS = [
    { key: "nome", label: "Cliente" },
    { key: "email", label: "Email" },
    { key: null, label: "Telefone" },
    { key: "segmento_rfm", label: "RFM" },
    { key: "ultimo_contato", label: "Último Contato" },
    { key: "receita_total", label: "Receita" },
    { key: null, label: "Ações" },
  ];

  const nomeVendedor = (vendedorId) => {
    const v = DB_FALLBACK.usuarios.find(u => u.id === vendedorId);
    return v?.nome?.split(" ")[0] || "—";
  };

  return (
    <div className="fade-up">
      <SectionHeader tag="CRM" title="Base de Clientes" action={
        <span className="num" style={{ fontSize: 13, color: T.muted }}>{clientesExibidos.length.toLocaleString("pt-BR")} clientes</span>
      } />

      {/* Tabs Carteira */}
      <div className="seg" style={{ marginBottom: 16 }}>
        <button className={`seg-btn ${carteiraTab === "minha" ? "on" : ""}`} onClick={() => setCarteiraTab("minha")}>
          👤 Minha Carteira ({meusClientes.length})
        </button>
        {isSup && (
          <button className={`seg-btn ${carteiraTab === "todos" ? "on" : ""}`} onClick={() => setCarteiraTab("todos")}>
            👥 Todos ({todosMarca.length})
          </button>
        )}
      </div>

      {/* Filtros de contato */}
      <div style={{ display: "flex", gap: 8, marginBottom: 16, flexWrap: "wrap", alignItems: "center" }}>
        {FILTROS_CONTATO.map(f => (
          <button
            key={f.k}
            onClick={() => setFiltroContato(filtroContato === f.k ? null : f.k)}
            style={{
              display: "inline-flex", alignItems: "center", gap: 6,
              padding: "6px 14px", borderRadius: 20, fontSize: 12, fontWeight: 600,
              border: filtroContato === f.k ? "1px solid var(--brand, #4545F5)" : "1px solid var(--border, rgba(0,0,0,0.08))",
              background: filtroContato === f.k ? "var(--brand-light, rgba(69,69,245,0.08))" : "transparent",
              color: filtroContato === f.k ? "var(--brand, #4545F5)" : "var(--sub, #6e6e73)",
              cursor: "pointer", transition: "all .15s",
            }}
          >
            {f.l}
            <span style={{
              background: f.count > 0 ? "var(--brand, #4545F5)" : "var(--border, rgba(0,0,0,0.08))",
              color: f.count > 0 ? "#fff" : "var(--muted, #aeaeb2)",
              borderRadius: 10, padding: "1px 7px", fontSize: 10, fontWeight: 700,
            }}>
              {f.count}
            </span>
          </button>
        ))}
        {filtroContato && (
          <button onClick={() => setFiltroContato(null)} style={{
            background: "none", border: "none", cursor: "pointer", fontSize: 11,
            color: "var(--muted)", textDecoration: "underline",
          }}>Limpar</button>
        )}
      </div>

      {/* RFM + Search */}
      <div style={{ display: "flex", gap: 8, marginBottom: 16, flexWrap: "wrap", alignItems: "center" }}>
        <div className="seg">
          {[{ k: "todos", l: "Todos" }, ...Object.entries(RFM_CFG).map(([k, v]) => ({ k, l: v.label }))].map((f) => (
            <button key={f.k} className={`seg-btn ${filter === f.k ? "on" : ""}`} onClick={() => setFilter(f.k)}>{f.l}</button>
          ))}
        </div>
        <input className="ap-inp" style={{ maxWidth: 220, padding: "8px 12px", fontSize: 13 }} placeholder="🔍 Buscar por nome ou email..." value={search} onChange={(e) => setSearch(e.target.value)} />
      </div>

      {/* Tag filter */}
      {availableTags.length > 0 && (
        <div style={{ display: "flex", gap: 6, marginBottom: 16, flexWrap: "wrap", alignItems: "center" }}>
          <span style={{ fontSize: 11, color: T.muted, fontWeight: 600, marginRight: 4 }}>🏷 Tags:</span>
          {availableTags.map(t => (
            <button key={t.id} onClick={() => setTagFilter(tagFilter === t.nome ? null : t.nome)} style={{
              display: "inline-flex", alignItems: "center", gap: 5,
              background: tagFilter === t.nome ? (t.cor || "#4545F5") : `${t.cor || "#4545F5"}14`,
              color: tagFilter === t.nome ? "#fff" : (t.cor || "#4545F5"),
              border: "none", borderRadius: 16, padding: "4px 12px", fontSize: 12, fontWeight: 600, cursor: "pointer", transition: "all .15s",
            }}>
              <span style={{ width: 6, height: 6, borderRadius: 3, background: tagFilter === t.nome ? "#fff" : (t.cor || "#4545F5") }} />
              {t.nome}
            </button>
          ))}
          {tagFilter && <button onClick={() => setTagFilter(null)} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 11, color: T.muted, textDecoration: "underline" }}>Limpar filtro</button>}
        </div>
      )}

      {loading && <div style={{ textAlign: "center", padding: 40, color: T.muted }}>⏳ Carregando clientes...</div>}

      {!loading && paginados.length === 0 && <div style={{ textAlign: "center", padding: 40, color: T.muted }}>Nenhum cliente encontrado.</div>}

      {!loading && paginados.length > 0 && (
        <>
          <div className="ap-card" style={{ padding: 0, overflow: "hidden" }}>
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 700 }}>
                <thead><tr style={{ borderBottom: "1px solid rgba(0,0,0,0.07)", background: "rgba(0,0,0,0.02)" }}>
                  {COLUMNS.map((col) => (
                    <th key={col.label} className="ap-th" style={col.key ? { cursor: "pointer", userSelect: "none" } : {}} onClick={col.key ? () => handleSort(col.key) : undefined}>
                      {col.label}{col.key ? sortIndicator(col.key) : ""}
                    </th>
                  ))}
                </tr></thead>
                <tbody>
                  {paginados.map((c, i) => {
                    const segKey = c.segmento_rfm;
                    const rec_total = +(c.receita_total ?? 0);
                    const ultimoContato = c.ultimo_contato ? new Date(c.ultimo_contato).toLocaleDateString("pt-BR") : "Nunca";
                    const diasSemContato = c.ultimo_contato
                      ? Math.floor((new Date() - new Date(c.ultimo_contato)) / (1000 * 60 * 60 * 24))
                      : 999;

                    return (
                      <tr key={c.id || i} className="ap-tr">
                        <td className="ap-td" style={{ cursor: "pointer" }} onClick={() => setSelectedCliente(c.id)}>
                          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                            <Avatar nome={c.nome} size={32} />
                            <div>
                              <div style={{ fontSize: 14, fontWeight: 700 }}>{c.nome}</div>
                              {carteiraTab === "todos" && isSup && (
                                <div style={{ fontSize: 10, color: T.muted }}>👤 {nomeVendedor(c.vendedor_id)}</div>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="ap-td"><span style={{ fontSize: 13, color: T.sub }}>{c.email || "—"}</span></td>
                        <td className="ap-td"><span style={{ fontSize: 13, color: T.sub }}>{c.telefone || "—"}</span></td>
                        <td className="ap-td"><Chip label={RFM_CFG[segKey]?.label || "—"} c={RFM_CFG[segKey]?.c} bg={RFM_CFG[segKey]?.bg} /></td>
                        <td className="ap-td">
                          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                            <span style={{ fontSize: 13, color: diasSemContato > 60 ? "#ff3b30" : diasSemContato > 30 ? "#ff9500" : T.sub }}>
                              {ultimoContato}
                            </span>
                            <FrequenciaBadge cliente={c} configMarca={configMarca} />
                          </div>
                        </td>
                        <td className="ap-td"><span className="num" style={{ fontWeight: 700, fontSize: 13 }}>R$ {rec_total.toLocaleString("pt-BR")}</span></td>
                        <td className="ap-td">
                          <div style={{ display: "flex", gap: 6 }}>
                            <button
                              className="ap-btn ap-btn-primary ap-btn-sm"
                              onClick={() => handleContato(c)}
                              title="Registrar contato"
                            >
                              📞
                            </button>
                            {isSup && (
                              <button
                                className="ap-btn ap-btn-secondary ap-btn-sm"
                                onClick={() => setTransferCliente(c)}
                                title="Transferir cliente"
                              >
                                🔄
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
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
      {contatoCliente && (
        <ContatoModal
          cliente={contatoCliente}
          user={user}
          isOverride={contatoOverride}
          onConfirm={handleContatoConfirm}
          onClose={() => setContatoCliente(null)}
        />
      )}
      {transferCliente && (
        <TransferModal
          cliente={transferCliente}
          usuarios={DB_FALLBACK.usuarios}
          onConfirm={handleTransfer}
          onClose={() => setTransferCliente(null)}
        />
      )}
    </div>
  );
}

// Helper inline — same calc as useFrequencia but non-hook
function calcFrequencia(cliente, configMarca) {
  if (!cliente) return { bloqueado: false, horasRestantes: 0, podeContatar: true, msgBloqueio: "" };
  const intervaloHoras = configMarca?.intervalo_minimo_contato_horas || 48;
  const proximo = cliente.proximo_contato_permitido;
  if (!proximo) return { bloqueado: false, horasRestantes: 0, podeContatar: true, msgBloqueio: "" };
  const agora = new Date();
  const proximoDate = new Date(proximo);
  if (agora >= proximoDate) return { bloqueado: false, horasRestantes: 0, podeContatar: true, msgBloqueio: "" };
  const diffMs = proximoDate - agora;
  const horasRestantes = Math.ceil(diffMs / (1000 * 60 * 60));
  return { bloqueado: true, horasRestantes, podeContatar: false, msgBloqueio: `Aguarde ${horasRestantes}h para novo contato (intervalo mínimo: ${intervaloHoras}h)` };
}

export default MarcaClientes;
