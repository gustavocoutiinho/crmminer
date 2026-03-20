import React, { useState, useEffect } from "react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from "recharts";
import { T } from "../../lib/theme";
import { Avatar, Chip, Modal, FormRow, Lbl, KpiCard, SectionHeader } from "../../components/UI";
import { fetchOportunidades, createOportunidade, updateOportunidade, deleteOportunidade, fetchFunil, fetchData } from "../../lib/api";
import { fmtBRL } from "../../utils/helpers";


function MarcaPipeline({ user }) {
  const [view, setView] = useState("kanban");
  const [ops, setOps] = useState([]);
  const [stats, setStats] = useState(null);
  const [funil, setFunil] = useState(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [editOp, setEditOp] = useState(null);
  const [preStage, setPreStage] = useState("lead");
  const [showClosed, setShowClosed] = useState(false);
  const [menuId, setMenuId] = useState(null);
  const [loseModal, setLoseModal] = useState(null);
  const [loseMotivo, setLoseMotivo] = useState("");

  const load = async () => {
    try {
      const r = await fetchOportunidades({ search: search || undefined });
      setOps(r.data || []);
      setStats(r.stats || null);
    } catch (e) { console.error(e); }
    setLoading(false);
  };

  const loadFunil = async () => {
    try { setFunil(await fetchFunil()); } catch (e) { console.error(e); }
  };

  useEffect(() => { load(); loadFunil(); }, []);
  useEffect(() => { const t = setTimeout(() => load(), 300); return () => clearTimeout(t); }, [search]);
  useEffect(() => { const iv = setInterval(() => { load(); loadFunil(); }, 15000); return () => clearInterval(iv); }, []);

  const advance = async (op) => {
    const next = NEXT_STAGE[op.etapa];
    if (!next) return;
    try {
      await updateOportunidade(op.id, { etapa: next, probabilidade: ETAPA_CFG[next]?.prob || op.probabilidade });
      load(); loadFunil();
    } catch (e) { alert(e.message); }
  };

  const markLost = async () => {
    if (!loseModal || !loseMotivo.trim()) return;
    try {
      await updateOportunidade(loseModal.id, { etapa: "fechado_perdido", motivo_perda: loseMotivo, probabilidade: 0 });
      setLoseModal(null); setLoseMotivo("");
      load(); loadFunil();
    } catch (e) { alert(e.message); }
  };

  const handleDelete = async (id) => {
    if (!confirm("Excluir oportunidade?")) return;
    try { await deleteOportunidade(id); load(); loadFunil(); } catch (e) { alert(e.message); }
  };

  const byStage = {};
  ACTIVE_STAGES.forEach(s => { byStage[s] = []; });
  ops.forEach(o => { if (byStage[o.etapa]) byStage[o.etapa].push(o); });
  const closedOps = ops.filter(o => o.etapa === "fechado_ganho" || o.etapa === "fechado_perdido");

  // ── Kanban Card ──
  const OpCard = ({ op }) => {
    const cfg = ETAPA_CFG[op.etapa];
    const isOpen = menuId === op.id;
    return (
      <div className="scale-in" style={{
        background: "#fff", borderRadius: 16, padding: "16px 18px", marginBottom: 10,
        boxShadow: "0 1px 4px rgba(0,0,0,0.06), 0 0 0 1px rgba(0,0,0,0.03)",
        position: "relative", transition: "box-shadow .2s",
      }} onMouseLeave={() => isOpen && setMenuId(null)}>
        <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 6, lineHeight: 1.3, color: "#1d1d1f" }}>{op.titulo}</div>
        {op.cliente_nome && <div style={{ fontSize: 12, color: T.sub, marginBottom: 4 }}>🙍 {op.cliente_nome}</div>}
        <div style={{ fontSize: 18, fontWeight: 800, color: cfg.c, marginBottom: 8 }}>{fmtBRL(op.valor)}</div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 8 }}>
          <span style={{ fontSize: 11, padding: "2px 8px", borderRadius: 8, background: cfg.bg, color: cfg.c, fontWeight: 600 }}>
            {op.probabilidade}%
          </span>
          {op.fonte && <span style={{ fontSize: 11, padding: "2px 8px", borderRadius: 8, background: "#f5f5f7", color: T.sub, fontWeight: 500 }}>{op.fonte}</span>}
          {op.data_previsao && <span style={{ fontSize: 11, padding: "2px 8px", borderRadius: 8, background: "#f5f5f7", color: T.sub, fontWeight: 500 }}>📅 {new Date(op.data_previsao).toLocaleDateString("pt-BR")}</span>}
        </div>
        {op.vendedor_nome && (
          <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 10 }}>
            <Avatar nome={op.vendedor_nome} size={20} />
            <span style={{ fontSize: 11, color: T.muted }}>{op.vendedor_nome}</span>
          </div>
        )}
        <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
          {NEXT_STAGE[op.etapa] && (
            <button className="ap-btn ap-btn-primary ap-btn-sm" onClick={() => advance(op)} style={{ fontSize: 12, borderRadius: 10, padding: "4px 12px" }}>
              Avançar →
            </button>
          )}
          <div style={{ position: "relative", marginLeft: "auto" }}>
            <button className="ap-btn ap-btn-sm" onClick={() => setMenuId(isOpen ? null : op.id)} style={{ fontSize: 14, padding: "2px 8px", borderRadius: 8, background: "transparent", border: "1px solid rgba(0,0,0,0.08)" }}>⋯</button>
            {isOpen && (
              <div style={{
                position: "absolute", right: 0, top: "100%", marginTop: 4, background: "#fff", borderRadius: 12,
                boxShadow: "0 4px 20px rgba(0,0,0,0.12)", border: "1px solid rgba(0,0,0,0.06)", zIndex: 50,
                minWidth: 150, overflow: "hidden",
              }}>
                <div style={{ padding: "9px 14px", fontSize: 13, cursor: "pointer", borderBottom: "1px solid rgba(0,0,0,0.05)" }}
                  onClick={() => { setEditOp(op); setShowModal(true); setMenuId(null); }}>✏️ Editar</div>
                <div style={{ padding: "9px 14px", fontSize: 13, cursor: "pointer", borderBottom: "1px solid rgba(0,0,0,0.05)" }}
                  onClick={() => { setLoseModal(op); setMenuId(null); }}>❌ Marcar Perdido</div>
                {(user.role === "miner" || user.role === "dono") && (
                  <div style={{ padding: "9px 14px", fontSize: 13, cursor: "pointer", color: "#ff3b30" }}
                    onClick={() => { handleDelete(op.id); setMenuId(null); }}>🗑 Excluir</div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  // ── Kanban Column ──
  const KanbanCol = ({ stage }) => {
    const cfg = ETAPA_CFG[stage];
    const items = byStage[stage] || [];
    const total = items.reduce((s, o) => s + (+o.valor || 0), 0);
    return (
      <div style={{ flex: 1, minWidth: 260, maxWidth: 340, display: "flex", flexDirection: "column", height: "100%" }}>
        <div style={{
          padding: "14px 16px", borderRadius: "16px 16px 0 0", background: cfg.bg,
          borderBottom: `2px solid ${cfg.c}`,
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
            <span style={{ fontSize: 16 }}>{cfg.icon}</span>
            <span style={{ fontWeight: 700, fontSize: 14, color: cfg.c }}>{cfg.label}</span>
            <span style={{ marginLeft: "auto", fontSize: 12, fontWeight: 600, background: cfg.c, color: "#fff", borderRadius: 10, padding: "2px 8px" }}>{items.length}</span>
          </div>
          <div style={{ fontSize: 13, fontWeight: 600, color: cfg.c }}>{fmtBRL(total)}</div>
        </div>
        <div style={{
          flex: 1, overflowY: "auto", padding: "10px 8px", background: "rgba(0,0,0,0.015)",
          borderRadius: "0 0 16px 16px",
        }}>
          {items.map(o => <OpCard key={o.id} op={o} />)}
          <button className="ap-btn ap-btn-sm" onClick={() => { setPreStage(stage); setEditOp(null); setShowModal(true); }}
            style={{ width: "100%", marginTop: 6, borderRadius: 12, fontSize: 13, color: T.sub, border: "1px dashed rgba(0,0,0,0.12)", background: "transparent", padding: "10px 0" }}>
            + Nova Oportunidade
          </button>
        </div>
      </div>
    );
  };

  // ── Funil View ──
  const FunilView = () => {
    if (!funil) return <div style={{ padding: 40, textAlign: "center", color: T.muted }}>Carregando funil...</div>;

    const stageOrder = ["lead", "qualificado", "proposta", "negociacao", "fechado_ganho", "fechado_perdido"];
    const chartData = stageOrder.map(s => {
      const found = funil.por_etapa?.find(e => e.etapa === s);
      return { name: ETAPA_CFG[s].label, valor: +(found?.valor || 0), count: found?.count || 0, fill: ETAPA_CFG[s].c };
    });

    const ClosedTable = ({ title, icon, items }) => (
      <div style={{ marginTop: 28 }}>
        <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 12 }}>{icon} {title}</h3>
        {items.length === 0 ? <div style={{ color: T.muted, fontSize: 13 }}>Nenhum registro</div> : (
          <div className="ap-card" style={{ overflow: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead><tr style={{ borderBottom: "1px solid rgba(0,0,0,0.07)", background: "rgba(0,0,0,0.02)" }}>
                {["Título", "Cliente", "Valor", "Vendedor", "Data"].map(h => <th key={h} className="ap-th">{h}</th>)}
              </tr></thead>
              <tbody>{items.map(o => (
                <tr key={o.id} className="ap-tr">
                  <td className="ap-td" style={{ fontWeight: 600 }}>{o.titulo}</td>
                  <td className="ap-td">{o.cliente_nome || "—"}</td>
                  <td className="ap-td" style={{ fontWeight: 700 }}>{fmtBRL(o.valor)}</td>
                  <td className="ap-td">{o.vendedor_nome || "—"}</td>
                  <td className="ap-td" style={{ fontSize: 12, color: T.muted }}>{new Date(o.updated_at).toLocaleDateString("pt-BR")}</td>
                </tr>
              ))}</tbody>
            </table>
          </div>
        )}
      </div>
    );

    return (
      <div className="fade-up">
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 16, marginBottom: 28 }}>
          <KpiCard label="Pipeline Ativo" value={fmtBRL(funil.ativos?.valor || 0)} sub={`${funil.ativos?.count || 0} oportunidades`} color="#4545F5" />
          <KpiCard label="Win Rate" value={`${funil.win_rate || 0}%`} sub={`${funil.ganhos || 0} ganhos / ${funil.perdidos || 0} perdidos`} color="#28cd41" />
          <KpiCard label="Ticket Médio" value={fmtBRL(funil.ticket_medio || 0)} sub="Oportunidades ganhas" color="#8e44ef" />
          <KpiCard label="Deals Ativos" value={funil.ativos?.count || 0} sub="Em andamento" color="#ff9500" />
        </div>

        <div className="ap-card" style={{ padding: 24, marginBottom: 28 }}>
          <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 16 }}>Funil por Valor</h3>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={chartData} layout="vertical" margin={{ left: 10, right: 30 }}>
              <XAxis type="number" tickFormatter={v => fmtBRL(v)} style={{ fontSize: 11 }} />
              <YAxis type="category" dataKey="name" width={100} style={{ fontSize: 12, fontWeight: 600 }} />
              <Tooltip formatter={v => fmtBRL(v)} labelStyle={{ fontWeight: 700 }} />
              <Bar dataKey="valor" radius={[0, 8, 8, 0]} barSize={28}>
                {chartData.map((e, i) => <Cell key={i} fill={e.fill} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        <ClosedTable title="Últimas Conquistas" icon="🏆" items={funil.recent_wins || []} />
        <ClosedTable title="Últimas Perdas" icon="❌" items={funil.recent_losses || []} />
      </div>
    );
  };

  // ── Create/Edit Modal ──
  const OpModal = () => {
    const [form, setForm] = useState({
      titulo: editOp?.titulo || "",
      cliente_id: editOp?.cliente_id || "",
      valor: editOp?.valor || "",
      etapa: editOp?.etapa || preStage || "lead",
      probabilidade: editOp?.probabilidade ?? ETAPA_CFG[editOp?.etapa || preStage || "lead"]?.prob ?? 10,
      data_previsao: editOp?.data_previsao ? editOp.data_previsao.slice(0, 10) : "",
      fonte: editOp?.fonte || "",
      vendedor_id: editOp?.vendedor_id || "",
      notas: editOp?.notas || "",
      motivo_perda: editOp?.motivo_perda || "",
    });
    const [clienteSearch, setClienteSearch] = useState(editOp?.cliente_nome || "");
    const [clientes, setClientes] = useState([]);
    const [saving, setSaving] = useState(false);
    const [equipe, setEquipe] = useState([]);
    const [showClienteDD, setShowClienteDD] = useState(false);

    useEffect(() => {
      fetchData("users", { limit: 100 }).then(r => setEquipe(r.data || [])).catch(() => {});
    }, []);

    useEffect(() => {
      if (clienteSearch.length < 2) { setClientes([]); return; }
      const t = setTimeout(() => {
        fetchData("clientes", { search: clienteSearch, limit: 10 }).then(r => { setClientes(r.data || []); setShowClienteDD(true); }).catch(() => {});
      }, 300);
      return () => clearTimeout(t);
    }, [clienteSearch]);

    const handleStageChange = (et) => {
      setForm(f => ({ ...f, etapa: et, probabilidade: ETAPA_CFG[et]?.prob ?? f.probabilidade }));
    };

    const handleSave = async () => {
      if (!form.titulo.trim()) return alert("Título é obrigatório");
      if (form.etapa === "fechado_perdido" && !form.motivo_perda.trim()) return alert("Motivo da perda é obrigatório");
      setSaving(true);
      try {
        const payload = {
          ...form,
          valor: +form.valor || 0,
          probabilidade: +form.probabilidade || 0,
          cliente_id: form.cliente_id || null,
          vendedor_id: form.vendedor_id || null,
          data_previsao: form.data_previsao || null,
          fonte: form.fonte || null,
          notas: form.notas || null,
          motivo_perda: form.motivo_perda || null,
        };
        if (editOp) {
          await updateOportunidade(editOp.id, payload);
        } else {
          await createOportunidade(payload);
        }
        setShowModal(false); setEditOp(null);
        load(); loadFunil();
      } catch (e) { alert(e.message); }
      setSaving(false);
    };

    const needMotivo = form.etapa === "fechado_perdido";

    return (
      <Modal title={editOp ? "Editar Oportunidade" : "Nova Oportunidade"} onClose={() => { setShowModal(false); setEditOp(null); }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <FormRow label="Título *">
            <input className="ap-inp" value={form.titulo} onChange={e => setForm(f => ({ ...f, titulo: e.target.value }))} placeholder="Ex: Proposta Empresa X" />
          </FormRow>

          <FormRow label="Cliente">
            <div style={{ position: "relative" }}>
              <input className="ap-inp" value={clienteSearch} onChange={e => { setClienteSearch(e.target.value); setForm(f => ({ ...f, cliente_id: "" })); }}
                placeholder="Buscar cliente..." onFocus={() => clientes.length > 0 && setShowClienteDD(true)} />
              {showClienteDD && clientes.length > 0 && (
                <div style={{
                  position: "absolute", top: "100%", left: 0, right: 0, background: "#fff", borderRadius: 12,
                  boxShadow: "0 4px 20px rgba(0,0,0,0.12)", border: "1px solid rgba(0,0,0,0.06)", zIndex: 100, maxHeight: 200, overflowY: "auto",
                }}>
                  {clientes.map(c => (
                    <div key={c.id} style={{ padding: "9px 14px", fontSize: 13, cursor: "pointer", borderBottom: "1px solid rgba(0,0,0,0.04)" }}
                      onClick={() => { setForm(f => ({ ...f, cliente_id: c.id })); setClienteSearch(c.nome); setShowClienteDD(false); }}>
                      {c.nome} <span style={{ color: T.muted, fontSize: 11 }}>{c.email}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </FormRow>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
            <FormRow label="Valor (R$)">
              <input className="ap-inp" type="number" step="0.01" value={form.valor} onChange={e => setForm(f => ({ ...f, valor: e.target.value }))} placeholder="0,00" />
            </FormRow>
            <FormRow label="Probabilidade (%)">
              <input className="ap-inp" type="number" min="0" max="100" value={form.probabilidade} onChange={e => setForm(f => ({ ...f, probabilidade: e.target.value }))} />
            </FormRow>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
            <FormRow label="Etapa">
              <select className="ap-sel" value={form.etapa} onChange={e => handleStageChange(e.target.value)}>
                {Object.entries(ETAPA_CFG).map(([k, v]) => <option key={k} value={k}>{v.icon} {v.label}</option>)}
              </select>
            </FormRow>
            <FormRow label="Data Previsão">
              <input className="ap-inp" type="date" value={form.data_previsao} onChange={e => setForm(f => ({ ...f, data_previsao: e.target.value }))} />
            </FormRow>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
            <FormRow label="Fonte">
              <select className="ap-sel" value={form.fonte} onChange={e => setForm(f => ({ ...f, fonte: e.target.value }))}>
                {FONTES.map(f => <option key={f.value} value={f.value}>{f.label}</option>)}
              </select>
            </FormRow>
            <FormRow label="Vendedor">
              <select className="ap-sel" value={form.vendedor_id} onChange={e => setForm(f => ({ ...f, vendedor_id: e.target.value }))}>
                <option value="">Selecionar...</option>
                {equipe.filter(u => u.status === "ativo").map(u => <option key={u.id} value={u.id}>{u.nome}</option>)}
              </select>
            </FormRow>
          </div>

          {needMotivo && (
            <FormRow label="Motivo da Perda *">
              <input className="ap-inp" value={form.motivo_perda} onChange={e => setForm(f => ({ ...f, motivo_perda: e.target.value }))} placeholder="Por que perdeu?" />
            </FormRow>
          )}

          <FormRow label="Notas">
            <textarea className="ap-inp" rows={3} value={form.notas} onChange={e => setForm(f => ({ ...f, notas: e.target.value }))} placeholder="Observações..." style={{ resize: "vertical" }} />
          </FormRow>

          <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", marginTop: 8 }}>
            <button className="ap-btn ap-btn-secondary" onClick={() => { setShowModal(false); setEditOp(null); }}>Cancelar</button>
            <button className="ap-btn ap-btn-primary" onClick={handleSave} disabled={saving}>{saving ? "Salvando..." : editOp ? "Salvar" : "Criar"}</button>
          </div>
        </div>
      </Modal>
    );
  };

  return (
    <div className="fade-up">
      <SectionHeader tag="Operação" title="Pipeline de Vendas — Atacado"
        action={
          <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
            <div className="seg" style={{ display: "flex" }}>
              <button className={`seg-btn ${view === "kanban" ? "active" : ""}`} onClick={() => setView("kanban")}>Kanban</button>
              <button className={`seg-btn ${view === "funil" ? "active" : ""}`} onClick={() => setView("funil")}>Funil</button>
            </div>
            <button className="ap-btn ap-btn-primary" onClick={() => { setPreStage("lead"); setEditOp(null); setShowModal(true); }}>+ Nova Oportunidade</button>
          </div>
        }
      />

      {view === "kanban" && (
        <>
          <div style={{ marginBottom: 16 }}>
            <input className="ap-inp" value={search} onChange={e => setSearch(e.target.value)} placeholder="🔍 Buscar oportunidades..." style={{ maxWidth: 360 }} />
          </div>

          {loading ? (
            <div style={{ padding: 60, textAlign: "center", color: T.muted }}>Carregando pipeline...</div>
          ) : (
            <>
              <div style={{ display: "flex", gap: 12, overflowX: "auto", paddingBottom: 12, minHeight: 400, alignItems: "flex-start" }}>
                {ACTIVE_STAGES.map(s => <KanbanCol key={s} stage={s} />)}
              </div>

              {closedOps.length > 0 && (
                <div style={{ marginTop: 24 }}>
                  <button className="ap-btn ap-btn-sm" onClick={() => setShowClosed(!showClosed)}
                    style={{ fontSize: 13, color: T.sub, background: "transparent", border: "1px solid rgba(0,0,0,0.1)", borderRadius: 10, padding: "6px 14px" }}>
                    {showClosed ? "▼" : "▶"} Fechados ({closedOps.length})
                  </button>
                  {showClosed && (
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 10, marginTop: 12 }}>
                      {closedOps.map(o => {
                        const cfg = ETAPA_CFG[o.etapa];
                        return (
                          <div key={o.id} className="ap-card" style={{ padding: "14px 16px", borderLeft: `3px solid ${cfg.c}`, opacity: 0.8 }}>
                            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                              <span>{cfg.icon}</span>
                              <span style={{ fontWeight: 700, fontSize: 13 }}>{o.titulo}</span>
                            </div>
                            <div style={{ fontSize: 15, fontWeight: 800, color: cfg.c }}>{fmtBRL(o.valor)}</div>
                            {o.cliente_nome && <div style={{ fontSize: 12, color: T.muted, marginTop: 2 }}>{o.cliente_nome}</div>}
                            {o.motivo_perda && <div style={{ fontSize: 11, color: "#ff3b30", marginTop: 4 }}>Motivo: {o.motivo_perda}</div>}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </>
      )}

      {view === "funil" && <FunilView />}

      {showModal && <OpModal />}

      {loseModal && (
        <Modal title="Marcar como Perdido" onClose={() => { setLoseModal(null); setLoseMotivo(""); }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <div style={{ fontSize: 14, color: T.sub }}>Oportunidade: <strong>{loseModal.titulo}</strong></div>
            <FormRow label="Motivo da Perda *">
              <input className="ap-inp" value={loseMotivo} onChange={e => setLoseMotivo(e.target.value)} placeholder="Por que perdeu?" autoFocus />
            </FormRow>
            <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
              <button className="ap-btn ap-btn-secondary" onClick={() => { setLoseModal(null); setLoseMotivo(""); }}>Cancelar</button>
              <button className="ap-btn ap-btn-danger" onClick={markLost} disabled={!loseMotivo.trim()}>Marcar Perdido</button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}

// ── INTELIGÊNCIA DO CLIENTE ───────────────────────────────────────────────────
const ACAO_CFG = {
  cross_sell: { label: "Cross-sell", icon: "🔀", c: "#4545F5", bg: "#eeeeff", desc: "Oferecer produtos complementares" },
  upsell: { label: "Upsell", icon: "⬆️", c: "#8e44ef", bg: "#f3eeff", desc: "Oferecer upgrade ou combo" },
  reengajar: { label: "Reengajar", icon: "💬", c: "#ff9500", bg: "#fff3e0", desc: "Mensagem de reengajamento" },
  reativar: { label: "Reativar", icon: "🔄", c: "#ff6b35", bg: "#fff0eb", desc: "Oferta especial de retorno" },
  win_back: { label: "Win Back", icon: "🎯", c: "#ff3b30", bg: "#ffe5e3", desc: "Cupom agressivo de recuperação" },
  primeiro_contato: { label: "1º Contato", icon: "👋", c: "#28cd41", bg: "#e9fbed", desc: "Nutrição e boas-vindas" },
  monitorar: { label: "Monitorar", icon: "👀", c: "#aeaeb2", bg: "#f5f5f7", desc: "Sem ação urgente" },
};

export default MarcaPipeline;
