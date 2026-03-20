import React, { useState, useCallback, useEffect } from "react";
import { T } from "../../lib/theme";
import { Avatar, Chip, Modal, FormRow, Lbl, KpiCard, SectionHeader, Toggle } from "../../components/UI";
import { useSupabaseQuery } from "../../lib/hooks";
import { fetchTarefas, updateTarefa, deleteTarefa, createRecord } from "../../lib/api";

function MarcaAgenda({ user }) {
  const marcaId = user?.marca_id || user?.marcaId;
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState("board");
  const [showModal, setShowModal] = useState(false);
  const [editTask, setEditTask] = useState(null);
  const [filterStatus, setFilterStatus] = useState("");
  const [filterPrioridade, setFilterPrioridade] = useState("");
  const [filterResp, setFilterResp] = useState("");
  const [sortCol, setSortCol] = useState("prioridade");
  const [sortDir, setSortDir] = useState("asc");
  const { data: teamUsers } = useSupabaseQuery("users", marcaId ? { eq: { marca_id: marcaId } } : {});
  const { data: sbClientes } = useSupabaseQuery("clientes", marcaId ? { eq: { marca_id: marcaId } } : {});
  const team = teamUsers || [];
  const clientes = sbClientes || [];

  const loadTasks = useCallback(async () => {
    try {
      const r = await fetchTarefas();
      setTasks(r.data || []);
    } catch (e) { console.error(e); }
    setLoading(false);
  }, []);

  useEffect(() => { loadTasks(); }, [loadTasks]);

  const advance = async (t) => {
    const next = t.status === "pendente" ? "em_andamento" : t.status === "em_andamento" ? "concluida" : null;
    if (!next) return;
    try { await updateTarefa(t.id, { status: next }); await loadTasks(); } catch (e) { console.error(e); }
  };

  const changePrioridade = async (t, p) => {
    try { await updateTarefa(t.id, { prioridade: p }); await loadTasks(); } catch (e) { console.error(e); }
  };

  const today = new Date(); today.setHours(0,0,0,0);
  const dateColor = (d) => {
    if (!d) return "var(--muted)";
    const dt = new Date(d); dt.setHours(0,0,0,0);
    if (dt < today) return "#ff3b30";
    if (dt.getTime() === today.getTime()) return "#ff9500";
    return "var(--sub)";
  };
  const fmtDate = (d) => d ? new Date(d).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "2-digit" }) : "";

  const vencidos = tasks.filter(t => t.status !== "concluida" && t.status !== "cancelada" && t.data_limite && new Date(t.data_limite) < new Date()).length;
  const BOARD_COLS = ["pendente", "em_andamento", "concluida"];

  // Sort helper for list view
  const sortedTasks = [...tasks].filter(t => {
    if (filterStatus && t.status !== filterStatus) return false;
    if (filterPrioridade && t.prioridade !== filterPrioridade) return false;
    if (filterResp && t.responsavel_id !== filterResp) return false;
    return true;
  }).sort((a, b) => {
    const prioOrder = { urgente: 0, alta: 1, media: 2, baixa: 3 };
    let va, vb;
    if (sortCol === "prioridade") { va = prioOrder[a.prioridade] ?? 2; vb = prioOrder[b.prioridade] ?? 2; }
    else if (sortCol === "data_limite") { va = a.data_limite || "9999"; vb = b.data_limite || "9999"; }
    else if (sortCol === "titulo") { va = (a.titulo || "").toLowerCase(); vb = (b.titulo || "").toLowerCase(); }
    else if (sortCol === "status") { va = a.status; vb = b.status; }
    else { va = a[sortCol]; vb = b[sortCol]; }
    if (va < vb) return sortDir === "asc" ? -1 : 1;
    if (va > vb) return sortDir === "asc" ? 1 : -1;
    return 0;
  });

  const toggleSort = (col) => {
    if (sortCol === col) setSortDir(d => d === "asc" ? "desc" : "asc");
    else { setSortCol(col); setSortDir("asc"); }
  };

  function TarefaModal({ tarefa, onClose }) {
    const isEdit = !!tarefa;
    const [f, setF] = useState({
      titulo: tarefa?.titulo || "", descricao: tarefa?.descricao || "",
      tipo: tarefa?.tipo || "geral", prioridade: tarefa?.prioridade || "media",
      data_limite: tarefa?.data_limite ? tarefa.data_limite.slice(0, 16) : "",
      responsavel_id: tarefa?.responsavel_id || user.id,
      cliente_id: tarefa?.cliente_id || "", status: tarefa?.status || "pendente",
    });
    const s = (k, v) => setF(x => ({ ...x, [k]: v }));
    const [saving, setSaving] = useState(false);
    const [clienteSearch, setClienteSearch] = useState("");
    const filteredClientes = clientes.filter(c => !clienteSearch || (c.nome || "").toLowerCase().includes(clienteSearch.toLowerCase())).slice(0, 50);

    return (
      <Modal title={isEdit ? "Editar Tarefa" : "Nova Tarefa"} subtitle={isEdit ? "Atualize os dados da tarefa" : "Crie uma nova tarefa para a equipe"} onClose={onClose} width={520}>
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <div><Lbl>Título *</Lbl><input className="ap-inp" value={f.titulo} onChange={e => s("titulo", e.target.value)} placeholder="Ex: Retornar cliente VIP" /></div>
          <div><Lbl>Descrição</Lbl><textarea className="ap-inp" rows={2} value={f.descricao} onChange={e => s("descricao", e.target.value)} placeholder="Detalhes da tarefa..." style={{ resize: "vertical" }} /></div>
          <FormRow>
            <div><Lbl>Tipo</Lbl><select className="ap-sel" value={f.tipo} onChange={e => s("tipo", e.target.value)}>
              {TIPO_TAREFA.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
            </select></div>
            <div><Lbl>Prioridade</Lbl><select className="ap-sel" value={f.prioridade} onChange={e => s("prioridade", e.target.value)}>
              {Object.entries(PRIORIDADE_CFG).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
            </select></div>
          </FormRow>
          <FormRow>
            <div><Lbl>Data Limite</Lbl><input className="ap-inp" type="datetime-local" value={f.data_limite} onChange={e => s("data_limite", e.target.value)} /></div>
            <div><Lbl>Responsável</Lbl><select className="ap-sel" value={f.responsavel_id} onChange={e => s("responsavel_id", e.target.value)}>
              <option value="">Nenhum</option>
              {team.map(u => <option key={u.id} value={u.id}>{u.nome}</option>)}
            </select></div>
          </FormRow>
          {isEdit && <div><Lbl>Status</Lbl><select className="ap-sel" value={f.status} onChange={e => s("status", e.target.value)}>
            {Object.entries(TAREFA_STATUS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
          </select></div>}
          <div><Lbl>Cliente</Lbl>
            <input className="ap-inp" placeholder="Buscar cliente..." value={clienteSearch} onChange={e => { setClienteSearch(e.target.value); if (!e.target.value) s("cliente_id", ""); }} style={{ marginBottom: 4 }} />
            {clienteSearch && <div style={{ maxHeight: 120, overflow: "auto", border: "1px solid var(--border)", borderRadius: 8, background: "var(--card-bg)" }}>
              {filteredClientes.map(c => <div key={c.id} style={{ padding: "6px 10px", cursor: "pointer", fontSize: 13, background: f.cliente_id === c.id ? "var(--hover)" : "transparent" }} onClick={() => { s("cliente_id", c.id); setClienteSearch(c.nome); }}>{c.nome}</div>)}
              {filteredClientes.length === 0 && <div style={{ padding: "6px 10px", fontSize: 12, color: "var(--muted)" }}>Nenhum resultado</div>}
            </div>}
          </div>
          <div style={{ display: "flex", gap: 10, marginTop: 4 }}>
            <button className="ap-btn ap-btn-primary" style={{ flex: 1 }} disabled={!f.titulo || saving} onClick={async () => {
              setSaving(true);
              try {
                const payload = { ...f, data_limite: f.data_limite || null, cliente_id: f.cliente_id || null, responsavel_id: f.responsavel_id || null };
                if (isEdit) { await updateTarefa(tarefa.id, payload); }
                else { await createRecord("tarefas", { ...payload, marca_id: marcaId, concluida: false }); }
                await loadTasks(); onClose();
              } catch (e) { console.error(e); }
              setSaving(false);
            }}>{saving ? "Salvando…" : isEdit ? "Salvar Alterações" : "Criar Tarefa →"}</button>
            {isEdit && <button className="ap-btn ap-btn-secondary" style={{ color: "#ff3b30" }} onClick={async () => {
              if (!confirm("Excluir esta tarefa?")) return;
              try { await deleteTarefa(tarefa.id); await loadTasks(); onClose(); } catch (e) { console.error(e); }
            }}>Excluir</button>}
          </div>
        </div>
      </Modal>
    );
  }

  function TaskCard({ t }) {
    const st = TAREFA_STATUS[t.status] || TAREFA_STATUS.pendente;
    const pr = PRIORIDADE_CFG[t.prioridade] || PRIORIDADE_CFG.media;
    const canAdvance = t.status === "pendente" || t.status === "em_andamento";
    const [showPrio, setShowPrio] = useState(false);
    return (
      <div className="ap-card" style={{ padding: "12px 14px", marginBottom: 10, cursor: "pointer", transition: "box-shadow .15s" }}
        onClick={() => setEditTask(t)} onMouseEnter={e => e.currentTarget.style.boxShadow = "0 4px 16px rgba(0,0,0,0.10)"} onMouseLeave={e => e.currentTarget.style.boxShadow = ""}>
        <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 6 }}>
          <span style={{ width: 8, height: 8, borderRadius: "50%", background: pr.c, flexShrink: 0 }} title={pr.label} />
          <span style={{ fontSize: 13, fontWeight: 700, flex: 1, lineHeight: 1.3 }}>{t.titulo}</span>
          <span style={{ fontSize: 11, padding: "1px 6px", borderRadius: 6, background: "var(--hover)", color: "var(--sub)" }}>{TIPO_ICON[t.tipo] || "📋"} {(TIPO_TAREFA.find(x => x[0] === t.tipo) || ["",""])[1] || t.tipo}</span>
        </div>
        {t.cliente_nome && <div style={{ display: "flex", alignItems: "center", gap: 5, marginBottom: 4 }}>
          <Avatar name={t.cliente_nome} size={18} />
          <span style={{ fontSize: 11, color: "var(--sub)" }}>{t.cliente_nome}</span>
        </div>}
        <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 8 }}>
          {t.responsavel_nome && <><Avatar name={t.responsavel_nome} size={18} /><span style={{ fontSize: 11, color: "var(--sub)" }}>{t.responsavel_nome}</span></>}
          {t.data_limite && <span style={{ fontSize: 11, fontWeight: 600, color: dateColor(t.data_limite), marginLeft: "auto" }}>📅 {fmtDate(t.data_limite)}</span>}
        </div>
        <div style={{ display: "flex", gap: 6, alignItems: "center" }} onClick={e => e.stopPropagation()}>
          {canAdvance && <button className="ap-btn ap-btn-primary ap-btn-sm" style={{ fontSize: 11, padding: "3px 10px" }} onClick={e => { e.stopPropagation(); advance(t); }}>
            {t.status === "pendente" ? "Iniciar →" : "Concluir ✓"}
          </button>}
          <div style={{ position: "relative", marginLeft: "auto" }}>
            <button className="ap-btn ap-btn-secondary ap-btn-sm" style={{ fontSize: 10, padding: "2px 7px" }} onClick={e => { e.stopPropagation(); setShowPrio(!showPrio); }}>
              <span style={{ width: 6, height: 6, borderRadius: "50%", background: pr.c, display: "inline-block", marginRight: 3 }} />{pr.label}
            </button>
            {showPrio && <div style={{ position: "absolute", right: 0, top: "100%", marginTop: 4, background: "var(--card-bg)", border: "1px solid var(--border)", borderRadius: 10, padding: 4, zIndex: 20, minWidth: 100, boxShadow: "0 4px 16px rgba(0,0,0,0.12)" }}>
              {Object.entries(PRIORIDADE_CFG).map(([k, v]) => <div key={k} style={{ padding: "5px 10px", fontSize: 12, cursor: "pointer", borderRadius: 6, display: "flex", alignItems: "center", gap: 6, background: t.prioridade === k ? v.bg : "transparent" }}
                onClick={() => { changePrioridade(t, k); setShowPrio(false); }}>
                <span style={{ width: 6, height: 6, borderRadius: "50%", background: v.c }} />{v.label}
              </div>)}
            </div>}
          </div>
        </div>
      </div>
    );
  }

  if (loading) return <div style={{ textAlign: "center", padding: 60, color: "var(--muted)" }}>Carregando tarefas…</div>;

  return (
    <div className="fade-up">
      <SectionHeader tag="Kanban" title="Quadro de Tarefas" action={
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <div className="seg" style={{ display: "flex", borderRadius: 8, overflow: "hidden", border: "1px solid var(--border)" }}>
            <button className={`seg-btn${view === "board" ? " active" : ""}`} style={{ padding: "5px 12px", fontSize: 12, fontWeight: 600, cursor: "pointer", background: view === "board" ? "var(--seg-active-bg)" : "transparent", border: "none", color: "var(--text)" }} onClick={() => setView("board")}>Board</button>
            <button className={`seg-btn${view === "lista" ? " active" : ""}`} style={{ padding: "5px 12px", fontSize: 12, fontWeight: 600, cursor: "pointer", background: view === "lista" ? "var(--seg-active-bg)" : "transparent", border: "none", color: "var(--text)" }} onClick={() => setView("lista")}>Lista</button>
          </div>
          <button className="ap-btn ap-btn-primary" onClick={() => { setEditTask(null); setShowModal(true); }}>+ Nova Tarefa</button>
        </div>
      } />

      <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 12, marginBottom: 20 }}>
        <KpiCard label="Pendentes" value={tasks.filter(t => t.status === "pendente").length} color="#ff9500" icon="⏳" />
        <KpiCard label="Em Andamento" value={tasks.filter(t => t.status === "em_andamento").length} color="#007aff" icon="🔄" />
        <KpiCard label="Concluídas" value={tasks.filter(t => t.status === "concluida").length} color="#28cd41" icon="✅" />
        <KpiCard label="Vencidas" value={vencidos} color="#ff3b30" icon="🔥" />
      </div>

      {view === "board" && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 16, alignItems: "start" }}>
          {BOARD_COLS.map(col => {
            const cfg = TAREFA_STATUS[col];
            const colTasks = tasks.filter(t => t.status === col);
            return (
              <div key={col} style={{ background: "var(--card-bg)", borderRadius: 14, border: "1px solid var(--border)", overflow: "hidden" }}>
                <div style={{ padding: "12px 16px", borderBottom: "1px solid var(--border)", display: "flex", alignItems: "center", gap: 8 }}>
                  <span style={{ fontSize: 16 }}>{cfg.icon}</span>
                  <span style={{ fontSize: 14, fontWeight: 700 }}>{cfg.label}</span>
                  <span style={{ marginLeft: "auto", fontSize: 12, fontWeight: 600, background: cfg.bg, color: cfg.c, padding: "2px 8px", borderRadius: 10 }}>{colTasks.length}</span>
                </div>
                <div style={{ padding: 12, maxHeight: "calc(100vh - 320px)", overflowY: "auto", minHeight: 80 }}>
                  {colTasks.length === 0 && <div style={{ textAlign: "center", padding: 20, color: "var(--muted)", fontSize: 12 }}>Nenhuma tarefa</div>}
                  {colTasks.map(t => <TaskCard key={t.id} t={t} />)}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {view === "lista" && (
        <div>
          <div style={{ display: "flex", gap: 8, marginBottom: 14, flexWrap: "wrap" }}>
            <select className="ap-sel" style={{ fontSize: 12, padding: "5px 10px", minWidth: 120 }} value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
              <option value="">Todos os Status</option>
              {Object.entries(TAREFA_STATUS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
            </select>
            <select className="ap-sel" style={{ fontSize: 12, padding: "5px 10px", minWidth: 120 }} value={filterPrioridade} onChange={e => setFilterPrioridade(e.target.value)}>
              <option value="">Todas Prioridades</option>
              {Object.entries(PRIORIDADE_CFG).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
            </select>
            <select className="ap-sel" style={{ fontSize: 12, padding: "5px 10px", minWidth: 140 }} value={filterResp} onChange={e => setFilterResp(e.target.value)}>
              <option value="">Todos Responsáveis</option>
              {team.map(u => <option key={u.id} value={u.id}>{u.nome}</option>)}
            </select>
          </div>
          <div className="ap-card" style={{ overflow: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
              <thead>
                <tr style={{ borderBottom: "2px solid var(--border)" }}>
                  {[["prioridade","Prio"],["titulo","Título"],["status","Status"],["tipo","Tipo"],["responsavel_nome","Responsável"],["cliente_nome","Cliente"],["data_limite","Prazo"]].map(([k,l]) => (
                    <th key={k} style={{ padding: "8px 10px", textAlign: "left", fontWeight: 600, cursor: "pointer", userSelect: "none", color: "var(--sub)", fontSize: 11, textTransform: "uppercase", letterSpacing: 0.5 }} onClick={() => toggleSort(k)}>
                      {l} {sortCol === k ? (sortDir === "asc" ? "↑" : "↓") : ""}
                    </th>
                  ))}
                  <th style={{ padding: "8px 10px", width: 90 }}></th>
                </tr>
              </thead>
              <tbody>
                {sortedTasks.map(t => {
                  const st = TAREFA_STATUS[t.status] || TAREFA_STATUS.pendente;
                  const pr = PRIORIDADE_CFG[t.prioridade] || PRIORIDADE_CFG.media;
                  const canAdv = t.status === "pendente" || t.status === "em_andamento";
                  return (
                    <tr key={t.id} style={{ borderBottom: "1px solid var(--border)", cursor: "pointer" }} onClick={() => setEditTask(t)} onMouseEnter={e => e.currentTarget.style.background = "var(--hover)"} onMouseLeave={e => e.currentTarget.style.background = ""}>
                      <td style={{ padding: "8px 10px" }}><span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}><span style={{ width: 8, height: 8, borderRadius: "50%", background: pr.c }} /><span style={{ fontSize: 11 }}>{pr.label}</span></span></td>
                      <td style={{ padding: "8px 10px", fontWeight: 600 }}>{t.titulo}</td>
                      <td style={{ padding: "8px 10px" }}><Chip label={st.label} c={st.c} bg={st.bg} /></td>
                      <td style={{ padding: "8px 10px", fontSize: 12 }}>{TIPO_ICON[t.tipo] || "📋"} {(TIPO_TAREFA.find(x => x[0] === t.tipo) || ["",""])[1] || t.tipo}</td>
                      <td style={{ padding: "8px 10px" }}>{t.responsavel_nome ? <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}><Avatar name={t.responsavel_nome} size={20} />{t.responsavel_nome}</span> : <span style={{ color: "var(--muted)" }}>—</span>}</td>
                      <td style={{ padding: "8px 10px" }}>{t.cliente_nome || <span style={{ color: "var(--muted)" }}>—</span>}</td>
                      <td style={{ padding: "8px 10px", fontWeight: 600, color: dateColor(t.data_limite), fontSize: 12 }}>{fmtDate(t.data_limite) || "—"}</td>
                      <td style={{ padding: "8px 10px" }} onClick={e => e.stopPropagation()}>{canAdv && <button className="ap-btn ap-btn-primary ap-btn-sm" style={{ fontSize: 10, padding: "2px 8px" }} onClick={() => advance(t)}>{t.status === "pendente" ? "Iniciar" : "Concluir"}</button>}</td>
                    </tr>
                  );
                })}
                {sortedTasks.length === 0 && <tr><td colSpan={8} style={{ textAlign: "center", padding: 30, color: "var(--muted)" }}>Nenhuma tarefa encontrada</td></tr>}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {(showModal || editTask) && <TarefaModal tarefa={editTask} onClose={() => { setShowModal(false); setEditTask(null); }} />}
    </div>
  );
}

export default MarcaAgenda;
