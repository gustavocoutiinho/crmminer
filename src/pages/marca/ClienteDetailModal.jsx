import React, { useState, useEffect, useRef } from "react";
import { T } from "../../lib/theme";
import { Avatar, Chip, Modal } from "../../components/UI";
import { fetchClienteDetail, updateRecord, fetchTags, addClienteTag, removeClienteTag, addTimelineEntry, createRecord } from "../../lib/api";
import { RFM_CFG } from "../../lib/theme";
import { timelineRelative, timelineDateGroup } from "../../utils/helpers";
import FidelidadeCliente from "./FidelidadeCliente";
import RegistroInteracao from "./RegistroInteracao";
import { DB_FALLBACK } from "../../data/fallback";

function ClienteTagsEditor({ clienteId, currentTags, onUpdate }) {
  const [allTags, setAllTags] = useState([]);
  const [showAdd, setShowAdd] = useState(false);
  const [search, setSearch] = useState("");
  const inputRef = useRef(null);

  useEffect(() => { fetchTags().then(r => setAllTags(r.data || [])).catch(() => {}); }, []);
  useEffect(() => { if (showAdd && inputRef.current) inputRef.current.focus(); }, [showAdd]);

  const tagColorMap = {};
  allTags.forEach(t => { tagColorMap[t.nome] = t.cor || "#4545F5"; });

  const handleAdd = async (tagName) => {
    try {
      const res = await addClienteTag(clienteId, tagName);
      onUpdate(res.data?.tags || [...currentTags, tagName]);
      setSearch(""); setShowAdd(false);
      // Refresh tags list in case auto-created
      fetchTags().then(r => setAllTags(r.data || [])).catch(() => {});
    } catch (e) { console.error(e); }
  };

  const handleRemove = async (tagName) => {
    try {
      const res = await removeClienteTag(clienteId, tagName);
      onUpdate(res.data?.tags || currentTags.filter(t => t !== tagName));
    } catch (e) { console.error(e); }
  };

  const available = allTags.filter(t => !currentTags.includes(t.nome) && (!search || t.nome.toLowerCase().includes(search.toLowerCase())));

  return (
    <div style={{ background: "rgba(0,0,0,0.03)", borderRadius: 10, padding: "10px 14px" }}>
      <div style={{ fontSize: 10, color: T.muted, fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 6 }}>Tags</div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 6, alignItems: "center" }}>
        {currentTags.map(tag => {
          const cor = tagColorMap[tag] || "#4545F5";
          return (
            <span key={tag} style={{ display: "inline-flex", alignItems: "center", gap: 4, background: `${cor}18`, color: cor, borderRadius: 16, padding: "3px 10px 3px 10px", fontSize: 12, fontWeight: 600 }}>
              <span style={{ width: 6, height: 6, borderRadius: 3, background: cor }} />
              {tag}
              <button onClick={() => handleRemove(tag)} style={{ background: "none", border: "none", cursor: "pointer", color: cor, fontSize: 14, lineHeight: 1, padding: "0 0 0 2px", opacity: 0.7 }} title="Remover">×</button>
            </span>
          );
        })}
        {!showAdd && (
          <button onClick={() => setShowAdd(true)} style={{ width: 24, height: 24, borderRadius: 12, background: "rgba(0,0,0,0.06)", border: "none", cursor: "pointer", fontSize: 14, lineHeight: 1, color: T.muted, display: "flex", alignItems: "center", justifyContent: "center" }} title="Adicionar tag">+</button>
        )}
      </div>
      {showAdd && (
        <div style={{ marginTop: 8, position: "relative" }}>
          <input ref={inputRef} className="ap-inp" value={search} onChange={e => setSearch(e.target.value)} onKeyDown={e => { if (e.key === "Enter" && search.trim()) handleAdd(search.trim()); if (e.key === "Escape") setShowAdd(false); }} placeholder="Buscar ou criar tag..." style={{ fontSize: 13, padding: "6px 10px" }} />
          {(available.length > 0 || search.trim()) && (
            <div style={{ position: "absolute", top: "100%", left: 0, right: 0, background: "#fff", border: "1px solid rgba(0,0,0,0.1)", borderRadius: 10, marginTop: 4, maxHeight: 160, overflowY: "auto", zIndex: 20, boxShadow: "0 4px 16px rgba(0,0,0,0.1)" }}>
              {available.map(t => (
                <div key={t.id} onClick={() => handleAdd(t.nome)} style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 12px", cursor: "pointer", fontSize: 13 }} onMouseEnter={e => e.currentTarget.style.background = "rgba(0,0,0,0.04)"} onMouseLeave={e => e.currentTarget.style.background = "transparent"}>
                  <span style={{ width: 8, height: 8, borderRadius: 4, background: t.cor || "#4545F5" }} />
                  {t.nome}
                </div>
              ))}
              {search.trim() && !allTags.some(t => t.nome.toLowerCase() === search.trim().toLowerCase()) && (
                <div onClick={() => handleAdd(search.trim())} style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 12px", cursor: "pointer", fontSize: 13, color: "#4545F5", fontWeight: 600, borderTop: available.length ? "1px solid rgba(0,0,0,0.05)" : "none" }} onMouseEnter={e => e.currentTarget.style.background = "rgba(0,0,0,0.04)"} onMouseLeave={e => e.currentTarget.style.background = "transparent"}>
                  + Criar "{search.trim()}"
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/* ── Timeline Config & Component ─────────────────────────────────────────── */
const TIMELINE_CFG = {
  compra:       { icon: "🛍", c: "#28cd41", label: "Compra" },
  pedido:       { icon: "🛍", c: "#28cd41", label: "Pedido" },
  mensagem:     { icon: "💬", c: "#007aff", label: "Mensagem" },
  tarefa:       { icon: "📋", c: "#ff9500", label: "Tarefa" },
  nota:         { icon: "📝", c: "#8e44ef", label: "Nota" },
  campanha:     { icon: "📢", c: "#ff6b35", label: "Campanha" },
  atendimento:  { icon: "🎧", c: "#00c7be", label: "Atendimento" },
  oportunidade: { icon: "💰", c: "#ffd60a", label: "Oportunidade" },
  carrinho:     { icon: "🛒", c: "#ff375f", label: "Carrinho" },
  sistema:      { icon: "⚙",  c: "#aeaeb2", label: "Sistema" },
};

function TimelineTab({ timeline, clienteId, onNewEntry }) {
  const [showForm, setShowForm] = useState(false);
  const [titulo, setTitulo] = useState("");
  const [descricao, setDescricao] = useState("");
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!titulo.trim()) return;
    setSaving(true);
    try {
      const res = await addTimelineEntry(clienteId, { tipo: "nota", titulo: titulo.trim(), descricao: descricao.trim() || undefined });
      if (res?.data) onNewEntry(res.data);
      setTitulo(""); setDescricao(""); setShowForm(false);
    } catch (e) { console.error("Erro ao adicionar nota:", e); }
    setSaving(false);
  };

  // Group events by date
  const groups = [];
  let lastGroup = null;
  timeline.forEach((ev) => {
    const g = timelineDateGroup(ev.created_at);
    if (g !== lastGroup) { groups.push({ label: g, events: [] }); lastGroup = g; }
    groups[groups.length - 1].events.push(ev);
  });

  return (
    <div>
      {/* Add note button / form */}
      <div style={{ marginBottom: 16 }}>
        {!showForm ? (
          <button className="ap-btn ap-btn-primary ap-btn-sm" onClick={() => setShowForm(true)} style={{ fontSize: 12 }}>+ Adicionar Nota</button>
        ) : (
          <div style={{ background: "rgba(142,68,239,0.05)", borderRadius: 12, padding: 14, display: "flex", flexDirection: "column", gap: 8 }}>
            <input className="ap-inp" placeholder="Título da nota…" value={titulo} onChange={(e) => setTitulo(e.target.value)} style={{ fontSize: 13 }} />
            <textarea className="ap-inp" rows={2} placeholder="Descrição (opcional)" value={descricao} onChange={(e) => setDescricao(e.target.value)} style={{ fontSize: 12, resize: "vertical" }} />
            <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
              <button className="ap-btn ap-btn-sm" onClick={() => { setShowForm(false); setTitulo(""); setDescricao(""); }} style={{ fontSize: 12 }}>Cancelar</button>
              <button className="ap-btn ap-btn-primary ap-btn-sm" disabled={saving || !titulo.trim()} onClick={handleSave} style={{ fontSize: 12 }}>{saving ? "Salvando…" : "Salvar"}</button>
            </div>
          </div>
        )}
      </div>

      {/* Empty state */}
      {timeline.length === 0 && <div style={{ textAlign: "center", padding: 40, color: T.muted }}>Nenhum evento registrado para este cliente</div>}

      {/* Timeline */}
      {groups.map((grp, gi) => (
        <div key={gi}>
          {/* Date separator */}
          <div style={{ fontSize: 11, fontWeight: 700, color: T.muted, textTransform: "uppercase", letterSpacing: 0.5, padding: "12px 0 6px 26px" }}>{grp.label}</div>
          {/* Events */}
          {grp.events.map((ev, ei) => {
            const cfg = TIMELINE_CFG[ev.tipo] || TIMELINE_CFG.sistema;
            const isLast = gi === groups.length - 1 && ei === grp.events.length - 1;
            const meta = ev.metadata ? (typeof ev.metadata === "string" ? JSON.parse(ev.metadata) : ev.metadata) : null;
            return (
              <div key={ev.id || `${gi}-${ei}`} style={{ display: "flex", gap: 0, minHeight: 48 }}>
                {/* Left: dot + line */}
                <div style={{ width: 26, display: "flex", flexDirection: "column", alignItems: "center", flexShrink: 0 }}>
                  <div style={{ width: 12, height: 12, borderRadius: "50%", background: cfg.c, flexShrink: 0, marginTop: 4, boxShadow: `0 0 0 3px ${cfg.c}22` }} />
                  {!isLast && <div style={{ width: 2, flex: 1, background: "rgba(0,0,0,0.08)", borderRadius: 1, marginTop: 2 }} />}
                </div>
                {/* Right: card */}
                <div style={{ flex: 1, background: "rgba(0,0,0,0.02)", borderRadius: 10, padding: "8px 12px", marginBottom: 6, marginLeft: 6 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 2 }}>
                    <span style={{ fontSize: 13 }}>{cfg.icon}</span>
                    <span style={{ fontSize: 13, fontWeight: 600, flex: 1 }}>{ev.titulo}</span>
                    <span title={ev.created_at ? new Date(ev.created_at).toLocaleString("pt-BR") : ""} style={{ fontSize: 10, color: T.muted, flexShrink: 0 }}>{timelineRelative(ev.created_at)}</span>
                  </div>
                  {ev.descricao && <div style={{ fontSize: 12, color: T.sub, marginTop: 2 }}>{ev.descricao}</div>}
                  {meta && Object.keys(meta).length > 0 && (
                    <div style={{ fontSize: 11, color: T.muted, marginTop: 4, display: "flex", gap: 8, flexWrap: "wrap" }}>
                      {Object.entries(meta).slice(0, 4).map(([k, v]) => (
                        <span key={k} style={{ background: "rgba(0,0,0,0.04)", borderRadius: 6, padding: "1px 6px" }}>{k}: {typeof v === "object" ? JSON.stringify(v) : String(v)}</span>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      ))}
    </div>
  );
}

function ClienteDetailModal({ clienteId, user, onClose }) {
  const [detail, setDetail] = useState(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState("resumo");
  const [notas, setNotas] = useState("");
  const [savingNotas, setSavingNotas] = useState(false);
  const [notasSaved, setNotasSaved] = useState(false);
  const [showRegistro, setShowRegistro] = useState(false);
  const [registros, setRegistros] = useState(() =>
    (DB_FALLBACK.registros_interacao || []).filter(r => r.cliente_id === clienteId)
  );

  const [showAgendaForm, setShowAgendaForm] = useState(false);
  const [agendaData, setAgendaData] = useState("");
  const [savingAgenda, setSavingAgenda] = useState(false);

  useEffect(() => {
    setLoading(true);
    fetchClienteDetail(clienteId)
      .then((d) => { setDetail(d); setNotas(d?.cliente?.notas || ""); setLoading(false); })
      .catch(() => setLoading(false));
  }, [clienteId]);

  const c = detail?.cliente;
  const pedidos = detail?.pedidos || [];
  const timeline = detail?.timeline || [];

  const salvarAgendamento = async () => {
    if (!agendaData) return;
    setSavingAgenda(true);
    try {
      await createRecord("tarefas", {
        titulo: `Follow-up: ${c?.nome}`,
        descricao: "Contato agendado via perfil do cliente",
        tipo: "follow-up",
        prioridade: "media",
        data_limite: agendaData,
        cliente_id: clienteId,
        responsavel_id: user?.id || null,
        marca_id: user?.marca_id || user?.marcaId || "demo",
        concluida: false,
        status: "pendente"
      });
      setShowAgendaForm(false);
      setAgendaData("");
      const res = await addTimelineEntry(clienteId, { tipo: "tarefa", titulo: "Contato agendado", descricao: `Para ${new Date(agendaData).toLocaleString("pt-BR")}` });
      if (res?.data) setDetail(prev => ({ ...prev, timeline: [res.data, ...prev.timeline] }));
    } catch (e) { console.error("Erro ao agendar:", e); }
    setSavingAgenda(false);
  };

  const saveNotas = async () => {
    setSavingNotas(true);
    try {
      await updateRecord("clientes", clienteId, { notas });
      setNotasSaved(true);
      setTimeout(() => setNotasSaved(false), 2000);
    } catch (e) { console.error("Erro ao salvar notas:", e); }
    setSavingNotas(false);
  };

  return (
    <Modal title={c?.nome || "Cliente"} subtitle={c?.email || ""} onClose={onClose} width={720}>
      {loading && <div style={{ textAlign: "center", padding: 40, color: T.muted }}>⏳ Carregando detalhes...</div>}
      {!loading && !c && <div style={{ textAlign: "center", padding: 40, color: T.muted }}>Cliente não encontrado.</div>}
      {!loading && c && (
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {/* Tabs */}
          <div className="seg">
            {[{ k: "resumo", l: "Resumo" }, { k: "pedidos", l: `Pedidos (${pedidos.length})` }, { k: "timeline", l: "Timeline" }, { k: "registros", l: `📝 Registros (${registros.length})` }, { k: "fidelidade", l: "⭐ Fidelidade" }].map((t) => (
              <button key={t.k} className={`seg-btn ${tab === t.k ? "on" : ""}`} onClick={() => setTab(t.k)}>{t.l}</button>
            ))}
          </div>

          {/* ── Tab: Resumo ── */}
          {tab === "resumo" && (
            <>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 10 }}>
                {[
                  ["Segmento RFM", RFM_CFG[c.segmento_rfm]?.label || c.segmento_rfm || "—"],
                  ["Recência", c.recencia_dias != null ? `${c.recencia_dias} dias` : "—"],
                  ["Tot. Pedidos", c.total_pedidos ?? "—"],
                  ["Receita Total", `R$ ${(+(c.receita_total || 0)).toLocaleString("pt-BR")}`],
                  ["Telefone", c.telefone || "—"],
                  ["Email", c.email || "—"],
                  ["Cadastro", c.created_at ? new Date(c.created_at).toLocaleDateString("pt-BR") : "—"],
                  ["Cashback", `R$ ${(+(c.cashback_saldo || 0)).toLocaleString("pt-BR", {minimumFractionDigits: 2})}`],
                ].map(([k, v], i) => (
                  <div key={i} style={{ background: "rgba(0,0,0,0.03)", borderRadius: 10, padding: "10px 14px" }}>
                    <div style={{ fontSize: 10, color: T.muted, fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 4, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{k}</div>
                    <div style={{ fontSize: 13, fontWeight: 600 }}>{v}</div>
                  </div>
                ))}
              </div>

              {/* Ações Rápidas */}
              <div style={{ display: "flex", gap: 8, marginTop: 4, marginBottom: 8 }}>
                <a 
                  href={`https://wa.me/${(c.telefone||"").replace(/\D/g,"")}?text=${encodeURIComponent(`Olá ${c.nome?.split(" ")[0]}! Tudo bem? Aqui é da loja. Use o código ${user?.codigo_vendedor || "PROMO10"} para garantir 10% OFF na sua próxima compra pelo nosso site!`)}`} 
                  target="_blank" rel="noopener noreferrer" 
                  className="ap-btn ap-btn-primary ap-btn-sm" 
                  style={{ flex: 1, textAlign: "center", textDecoration: "none", background: "#25D366", borderColor: "#25D366", color: "#fff" }}>
                  Enviar Cupom (WhatsApp)
                </a>
                <button className="ap-btn ap-btn-secondary ap-btn-sm" style={{ flex: 1 }} onClick={() => setShowAgendaForm(!showAgendaForm)}>
                  Agendar Follow-up
                </button>
              </div>

              {showAgendaForm && (
                <div style={{ background: "rgba(0,0,0,0.03)", borderRadius: 10, padding: 14, marginBottom: 12, display: "flex", alignItems: "center", gap: 10 }}>
                  <div style={{ fontSize: 12, fontWeight: 600, whiteSpace: "nowrap" }}>🗓 Data Prevista:</div>
                  <input type="datetime-local" className="ap-inp" style={{ flex: 1, fontSize: 13, padding: "6px 10px" }} value={agendaData} onChange={e => setAgendaData(e.target.value)} />
                  <button className="ap-btn ap-btn-primary ap-btn-sm" onClick={salvarAgendamento} disabled={!agendaData || savingAgenda}>
                    {savingAgenda ? "Agendando..." : "Confirmar"}
                  </button>
                </div>
              )}

              {/* Tags interativas */}
              <ClienteTagsEditor clienteId={clienteId} currentTags={c.tags || []} onUpdate={(newTags) => setDetail(prev => ({ ...prev, cliente: { ...prev.cliente, tags: newTags } }))} />

              {/* Notas editáveis */}
              <div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                  <label className="lbl" style={{ margin: 0 }}>Notas</label>
                  <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                    {notasSaved && <span style={{ fontSize: 11, color: "#28cd41", fontWeight: 600 }}>✓ Salvo</span>}
                    <button className="ap-btn ap-btn-primary ap-btn-sm" disabled={savingNotas} onClick={saveNotas}>{savingNotas ? "Salvando…" : "Salvar Notas"}</button>
                  </div>
                </div>
                <textarea className="ap-inp" rows={3} value={notas} onChange={(e) => setNotas(e.target.value)} placeholder="Adicione observações sobre este cliente..." style={{ resize: "vertical" }} />
              </div>
            </>
          )}

          {/* ── Tab: Pedidos ── */}
          {tab === "pedidos" && (
            <>
              {pedidos.length === 0 && <div style={{ textAlign: "center", padding: 40, color: T.muted }}>Nenhum pedido encontrado.</div>}
              {pedidos.length > 0 && (
                <div className="ap-card" style={{ padding: 0, overflow: "hidden" }}>
                  <table style={{ width: "100%", borderCollapse: "collapse" }}>
                    <thead><tr style={{ background: "rgba(0,0,0,0.02)", borderBottom: "1px solid rgba(0,0,0,0.07)" }}>
                      {["Data", "Valor", "Status"].map((h) => <th key={h} className="ap-th">{h}</th>)}
                    </tr></thead>
                    <tbody>
                      {pedidos.map((p, i) => (
                        <tr key={i} className="ap-tr">
                          <td className="ap-td"><span style={{ fontSize: 12, color: T.sub }}>{p.created_at ? new Date(p.created_at).toLocaleDateString("pt-BR") : "—"}</span></td>

                          <td className="ap-td"><span className="num" style={{ fontSize: 13, fontWeight: 700 }}>R$ {(+(p.valor_total || p.valor || 0)).toLocaleString("pt-BR")}</span></td>
                          <td className="ap-td"><Chip label={p.status || "—"} c={p.status === "pago" || p.status === "aprovado" ? "#28cd41" : "#ff9500"} bg={p.status === "pago" || p.status === "aprovado" ? "#e9fbed" : "#fff3e0"} /></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </>
          )}

          {/* ── Tab: Timeline ── */}
          {tab === "timeline" && (
            <TimelineTab timeline={timeline} clienteId={clienteId} onNewEntry={(entry) => setDetail(prev => ({ ...prev, timeline: [entry, ...prev.timeline] }))} />
          )}

          {/* ── Tab: Registros de Interação ── */}
          {tab === "registros" && (
            <div>
              <div style={{ marginBottom: 14 }}>
                <button className="ap-btn ap-btn-primary ap-btn-sm" onClick={() => setShowRegistro(true)} style={{ fontSize: 12 }}>
                  ➕ Registrar observação
                </button>
              </div>
              {registros.length === 0 && (
                <div style={{ textAlign: "center", padding: 40, color: T.muted }}>Nenhum registro encontrado</div>
              )}
              {registros.sort((a, b) => new Date(b.created_at) - new Date(a.created_at)).map(reg => {
                const tipoCfg = { observacao: { icon: "📝", c: "#4545F5" }, feedback: { icon: "💬", c: "#28cd41" }, info: { icon: "ℹ️", c: "#8e44ef" }, objecao: { icon: "🚫", c: "#ff3b30" }, preferencia: { icon: "❤️", c: "#ff9500" } };
                const cfg = tipoCfg[reg.tipo] || tipoCfg.observacao;
                const vendedor = DB_FALLBACK.usuarios.find(u => u.id === reg.vendedor_id);
                return (
                  <div key={reg.id} style={{ display: "flex", gap: 10, padding: "10px 0", borderBottom: "1px solid rgba(0,0,0,0.05)" }}>
                    <div style={{ width: 28, height: 28, borderRadius: "50%", background: `${cfg.c}18`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, flexShrink: 0 }}>
                      {cfg.icon}
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 2 }}>{reg.texto}</div>
                      <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 4 }}>
                        {(reg.tags || []).map(tag => (
                          <span key={tag} style={{ fontSize: 10, background: "rgba(0,0,0,0.06)", borderRadius: 8, padding: "1px 8px", color: T.sub }}>{tag}</span>
                        ))}
                      </div>
                      <div style={{ fontSize: 11, color: T.muted }}>
                        {vendedor?.nome || "—"} · {new Date(reg.created_at).toLocaleDateString("pt-BR")} {new Date(reg.created_at).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
                      </div>
                    </div>
                  </div>
                );
              })}
              {showRegistro && (
                <RegistroInteracao
                  clienteId={clienteId}
                  vendedorId={c?.vendedor_id}
                  marcaId={c?.marca_id}
                  onSave={(reg) => { setRegistros(prev => [reg, ...prev]); setShowRegistro(false); }}
                  onClose={() => setShowRegistro(false)}
                />
              )}
            </div>
          )}

          {/* ── Tab: Fidelidade ── */}
          {tab === "fidelidade" && (
            <FidelidadeCliente clienteId={clienteId} />
          )}
        </div>
      )}
    </Modal>
  );
}

const TAREFA_STATUS = {
  pendente: { label: "Pendente", icon: "⏳", c: "#ff9500", bg: "#fff3e0" },
  em_andamento: { label: "Em Andamento", icon: "🔄", c: "#007aff", bg: "#e5f0ff" },
  concluida: { label: "Concluída", icon: "✅", c: "#28cd41", bg: "#e9fbed" },
  cancelada: { label: "Cancelada", icon: "❌", c: "#ff3b30", bg: "#ffe5e3" },
};
const PRIORIDADE_CFG = {
  urgente: { label: "Urgente", c: "#ff3b30", bg: "#ffe5e3" },
  alta: { label: "Alta", c: "#ff9500", bg: "#fff3e0" },
  media: { label: "Média", c: "#007aff", bg: "#e5f0ff" },
  baixa: { label: "Baixa", c: "#aeaeb2", bg: "#f5f5f7" },
};
const TIPO_TAREFA = [["geral","Geral"],["follow-up","Follow-up"],["ligacao","Ligação"],["reuniao","Reunião"],["entrega","Entrega"]];
const TIPO_ICON = { geral: "📋", "follow-up": "🔁", ligacao: "📞", reuniao: "🤝", entrega: "📦" };

export default ClienteDetailModal;
