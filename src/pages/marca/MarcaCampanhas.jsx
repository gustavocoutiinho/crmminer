import React, { useState, useEffect } from "react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";
import { T, RFM_CFG } from "../../lib/theme";
import { Avatar, Chip, Modal, FormRow, Lbl, KpiCard, SectionHeader } from "../../components/UI";
import { useToast } from "../../context/ToastContext";
import { useSupabaseQuery } from "../../lib/hooks";
import { fetchCampanhaStats, updateCampanha, duplicateCampanha, deleteRecord, createRecord, fetchCampanhaAudiencia } from "../../lib/api";

function MarcaCampanhas({ user }) {
  const toast = useToast();
  const marcaId = user?.marca_id || user?.marcaId;
  const { data: sbCampanhas, refetch: refetchCampanhas } = useSupabaseQuery("campanhas", marcaId ? { eq: { marca_id: marcaId } } : {});
  const [showModal, setShowModal] = useState(false);
  const [editItem, setEditItem] = useState(null);
  const [view, setView] = useState("list"); // list | analytics
  const [stats, setStats] = useState(null);
  const [ativarCampanha, setAtivarCampanha] = useState(null);

  const cps = sbCampanhas && sbCampanhas.length > 0 ? sbCampanhas : [];

  const CANAL_ICON = { whatsapp: "💬", email: "✉️", sms: "📱", push: "🔔" };
  const CANAL_COLOR = { whatsapp: "#128C7E", email: "#4545F5", sms: "#ff9500", push: "#af52de" };
  const CANAL_BG = { whatsapp: "#e9fbed", email: "#eeeeff", sms: "#fff3e0", push: "#f5eaff" };
  const STATUS_MAP = { rascunho: { label: "Rascunho", c: "#aeaeb2", bg: "#f5f5f7" }, ativa: { label: "Ativa", c: "#007aff", bg: "#e8f4ff" }, pausada: { label: "Pausada", c: "#ff9500", bg: "#fff3e0" }, concluida: { label: "Concluída", c: "#28cd41", bg: "#e9fbed" } };
  const SEG_OPTIONS = [
    { value: "todos", label: "Todos" },
    { value: "campiao", label: RFM_CFG.campiao.label },
    { value: "fiel", label: RFM_CFG.fiel.label },
    { value: "potencial", label: RFM_CFG.potencial.label },
    { value: "em_risco", label: RFM_CFG.em_risco.label },
    { value: "inativo", label: RFM_CFG.inativo.label },
  ];
  const PIE_COLORS = ["#128C7E", "#4545F5", "#ff9500", "#af52de", "#ff3b30"];

  useEffect(() => {
    if (view === "analytics") fetchCampanhaStats().then(setStats).catch(console.error);
  }, [view]);

  const handleToggleStatus = async (c) => {
    if (c.status !== "ativa") {
      // Show activation modal instead of direct toggle
      setAtivarCampanha(c);
      return;
    }
    // Pause directly
    try {
      await updateCampanha(c.id, { status: "pausada" });
      await refetchCampanhas();
      toast("Campanha pausada!", "success");
    } catch (e) { toast(e.message || "Erro", "error"); }
  };

  const handleActivateConfirm = async (campanha, totalSelecionados) => {
    try {
      await updateCampanha(campanha.id, { status: "ativa", enviados: totalSelecionados });
      await refetchCampanhas();
      setAtivarCampanha(null);
      toast(`Campanha ativada para ${totalSelecionados} clientes!`, "success");
    } catch (e) { toast(e.message || "Erro ao ativar", "error"); }
  };

  const handleDuplicate = async (c) => {
    try {
      await duplicateCampanha(c.id);
      await refetchCampanhas();
      toast("Campanha duplicada!", "success");
    } catch (e) { toast(e.message || "Erro ao duplicar", "error"); }
  };

  const handleDelete = async (c) => {
    if (!confirm(`Excluir campanha "${c.nome}"?`)) return;
    try {
      await deleteRecord("campanhas", c.id);
      await refetchCampanhas();
      toast("Campanha excluída", "success");
    } catch (e) { toast(e.message || "Erro ao excluir", "error"); }
  };

  function CampanhaForm({ item, onClose }) {
    const isEdit = !!item;
    const [f, setF] = useState(item ? { nome: item.nome || "", tipo: item.tipo || "whatsapp", segmento_alvo: item.segmento_alvo || "todos", mensagem: item.mensagem || "", status: item.status || "rascunho" } : { nome: "", tipo: "whatsapp", segmento_alvo: "todos", mensagem: "", status: "rascunho" });
    const s = (k, v) => setF((x) => ({ ...x, [k]: v }));
    const [saving, setSaving] = useState(false);
    const previewMsg = (f.mensagem || "").replace("{nome}", "João Silva").replace("{email}", "joao@email.com");
    return (
      <Modal title={isEdit ? "Editar Campanha" : "Nova Campanha"} subtitle="Configure sua campanha de marketing" onClose={onClose} width={560}>
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <div><Lbl>Nome da Campanha *</Lbl><input className="ap-inp" value={f.nome} onChange={(e) => s("nome", e.target.value)} placeholder="Ex: Reativação 90 dias" /></div>
          <FormRow cols={2}>
            <div>
              <Lbl>Canal</Lbl>
              <select className="ap-sel" value={f.tipo} onChange={(e) => s("tipo", e.target.value)}>
                <option value="whatsapp">WhatsApp</option>
                <option value="email">Email</option>
                <option value="sms">SMS</option>
                <option value="push">Push</option>
              </select>
            </div>
            <div>
              <Lbl>Segmento Alvo</Lbl>
              <select className="ap-sel" value={f.segmento_alvo} onChange={(e) => s("segmento_alvo", e.target.value)}>
                {SEG_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </div>
          </FormRow>
          {isEdit && (
            <div>
              <Lbl>Status</Lbl>
              <select className="ap-sel" value={f.status} onChange={(e) => s("status", e.target.value)}>
                <option value="rascunho">Rascunho</option>
                <option value="ativa">Ativa</option>
                <option value="pausada">Pausada</option>
                <option value="concluida">Concluída</option>
              </select>
            </div>
          )}
          <div>
            <Lbl>Mensagem <span style={{ color: T.muted, fontWeight: 400, fontSize: 11 }}>Use {"{nome}"}, {"{email}"} como variáveis</span></Lbl>
            <textarea className="ap-inp" rows={4} value={f.mensagem} onChange={(e) => s("mensagem", e.target.value)} placeholder="Olá {nome}, temos uma oferta especial..." style={{ resize: "vertical" }} />
          </div>
          {f.mensagem && (
            <div style={{ background: "#f5f5f7", borderRadius: 12, padding: "12px 16px" }}>
              <div style={{ fontSize: 11, fontWeight: 600, color: T.muted, marginBottom: 6 }}>📱 PREVIEW</div>
              <div style={{ fontSize: 13, color: T.fg, lineHeight: 1.5, whiteSpace: "pre-wrap" }}>{previewMsg}</div>
            </div>
          )}
          <button className="ap-btn ap-btn-primary" disabled={!f.nome || saving} onClick={async () => {
            setSaving(true);
            try {
              if (isEdit) {
                await updateCampanha(item.id, { nome: f.nome, tipo: f.tipo, segmento_alvo: f.segmento_alvo, mensagem: f.mensagem, status: f.status });
              } else {
                await createRecord("campanhas", {
                  nome: f.nome, tipo: f.tipo, segmento_alvo: f.segmento_alvo,
                  mensagem: f.mensagem, status: "rascunho", enviados: 0,
                  abertos: 0, convertidos: 0, receita: 0, marca_id: marcaId,
                });
              }
              await refetchCampanhas();
              toast(isEdit ? "Campanha atualizada!" : "Campanha criada!", "success");
              onClose();
            } catch (e) { toast(e.message || "Erro ao salvar", "error"); }
            setSaving(false);
          }}>{saving ? "Salvando…" : isEdit ? "Salvar Alterações →" : "Criar Campanha →"}</button>
        </div>
      </Modal>
    );
  }

  // ── Analytics View ──
  const AnalyticsView = () => {
    if (!stats) return <div style={{ textAlign: "center", padding: 40, color: T.muted }}>Carregando analytics...</div>;
    const total = Number(stats.total) || 0;
    const enviados = Number(stats.enviados) || 0;
    const abertos = Number(stats.abertos) || 0;
    const convertidos = Number(stats.convertidos) || 0;
    const receita = Number(stats.receita) || 0;
    const txAbertura = enviados > 0 ? ((abertos / enviados) * 100).toFixed(1) : "0.0";
    const txConversao = enviados > 0 ? ((convertidos / enviados) * 100).toFixed(1) : "0.0";
    const topData = (stats.top_campanhas || []).map(c => ({ nome: c.nome?.substring(0, 20), receita: Number(c.receita) || 0 }));
    const tipoData = (stats.por_tipo || []).map(t => ({ name: (t.tipo || "email").charAt(0).toUpperCase() + (t.tipo || "email").slice(1), value: Number(t.n) || 0 }));
    return (
      <div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(5,1fr)", gap: 12, marginBottom: 24 }}>
          <KpiCard label="Total Campanhas" value={total} icon="📢" color="#4545F5" />
          <KpiCard label="Total Enviados" value={enviados.toLocaleString("pt-BR")} icon="📤" color="#007aff" />
          <KpiCard label="Taxa Abertura" value={`${txAbertura}%`} icon="👁️" color="#ff9500" />
          <KpiCard label="Taxa Conversão" value={`${txConversao}%`} icon="🎯" color="#28cd41" />
          <KpiCard label="Receita Total" value={`R$ ${receita.toLocaleString("pt-BR")}`} icon="💰" color="#5856d6" />
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
          {topData.length > 0 && (
            <div className="ap-card" style={{ padding: 20 }}>
              <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 12 }}>💰 Receita por Campanha (Top 10)</div>
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={topData}>
                  <XAxis dataKey="nome" tick={{ fontSize: 10 }} angle={-20} textAnchor="end" height={60} />
                  <YAxis tick={{ fontSize: 10 }} />
                  <Tooltip formatter={(v) => `R$ ${Number(v).toLocaleString("pt-BR")}`} />
                  <Bar dataKey="receita" fill="#4545F5" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
          {tipoData.length > 0 && (
            <div className="ap-card" style={{ padding: 20 }}>
              <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 12 }}>📊 Campanhas por Tipo</div>
              <ResponsiveContainer width="100%" height={260}>
                <PieChart>
                  <Pie data={tipoData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={90} label={({ name, value }) => `${name}: ${value}`}>
                    {tipoData.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="fade-up">
      <SectionHeader tag="Marketing" title="Campanhas" action={
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <div style={{ display: "inline-flex", background: "#f5f5f7", borderRadius: 10, padding: 3 }}>
            <button onClick={() => setView("list")} style={{ padding: "6px 14px", borderRadius: 8, fontSize: 12, fontWeight: 600, border: "none", cursor: "pointer", background: view === "list" ? "#fff" : "transparent", color: view === "list" ? T.fg : T.muted, boxShadow: view === "list" ? "0 1px 4px rgba(0,0,0,.08)" : "none", transition: "all .2s" }}>📋 Campanhas</button>
            <button onClick={() => setView("analytics")} style={{ padding: "6px 14px", borderRadius: 8, fontSize: 12, fontWeight: 600, border: "none", cursor: "pointer", background: view === "analytics" ? "#fff" : "transparent", color: view === "analytics" ? T.fg : T.muted, boxShadow: view === "analytics" ? "0 1px 4px rgba(0,0,0,.08)" : "none", transition: "all .2s" }}>📊 Analytics</button>
          </div>
          <button className="ap-btn ap-btn-primary" onClick={() => { setEditItem(null); setShowModal(true); }}>+ Nova Campanha</button>
        </div>
      } />

      {view === "analytics" ? <AnalyticsView /> : (
        <>
          {cps.length === 0 && <div style={{ textAlign: "center", padding: 40, color: T.muted }}>Nenhuma campanha encontrada. Crie uma nova!</div>}
          {cps.map((c, i) => {
            const tipoKey = (c.tipo || "email").toLowerCase();
            const canalLabel = tipoKey === "push" ? "Push" : tipoKey === "whatsapp" ? "WhatsApp" : tipoKey === "email" ? "Email" : "SMS";
            const st = STATUS_MAP[c.status] || STATUS_MAP.rascunho;
            const enviados = Number(c.enviados) || 0;
            const convertidos = Number(c.convertidos) || 0;
            const abertos = Number(c.abertos) || 0;
            const receita = Number(c.receita) || 0;
            const convRate = enviados > 0 ? (convertidos / enviados) * 100 : 0;
            const segCfg = RFM_CFG[c.segmento_alvo];
            return (
              <div key={c.id || i} className="ap-card" style={{ padding: "18px 22px", marginBottom: 10 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: enviados > 0 ? 12 : 0 }}>
                  <div style={{ width: 44, height: 44, borderRadius: 12, background: CANAL_BG[tipoKey] || "#eeeeff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20 }}>{CANAL_ICON[tipoKey] || "✉️"}</div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 6 }}>{c.nome}</div>
                    <div style={{ display: "flex", gap: 6, alignItems: "center", flexWrap: "wrap" }}>
                      <Chip label={canalLabel} c={CANAL_COLOR[tipoKey] || "#4545F5"} bg={CANAL_BG[tipoKey] || "#eeeeff"} />
                      <Chip label={st.label} c={st.c} bg={st.bg} />
                      {segCfg && <Chip label={segCfg.label} c={segCfg.c} bg={segCfg.bg} />}
                      {c.segmento_alvo === "todos" && <Chip label="Todos" c="#8e44ef" bg="#f5eaff" />}
                    </div>
                  </div>
                  <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                    {(c.status === "rascunho" || c.status === "ativa" || c.status === "pausada") && (
                      <button className={`ap-btn ap-btn-sm ${c.status === "ativa" ? "" : "ap-btn-primary"}`} onClick={() => handleToggleStatus(c)} style={c.status === "ativa" ? { background: "#fff3e0", color: "#ff9500", border: "1px solid #ff9500" } : {}}>{c.status === "ativa" ? "⏸ Pausar" : "▶ Ativar"}</button>
                    )}
                    <button className="ap-btn ap-btn-sm" onClick={() => { setEditItem(c); setShowModal(true); }} title="Editar">✏️</button>
                    <button className="ap-btn ap-btn-sm" onClick={() => handleDuplicate(c)} title="Duplicar">📋</button>
                    <button className="ap-btn ap-btn-sm" onClick={() => handleDelete(c)} title="Excluir" style={{ color: "#ff3b30" }}>🗑️</button>
                  </div>
                </div>
                {enviados > 0 && (
                  <div style={{ display: "flex", gap: 20, alignItems: "center", paddingTop: 10, borderTop: `1px solid ${T.border}` }}>
                    <span style={{ fontSize: 12, color: T.muted }}>📤 <b>{enviados.toLocaleString("pt-BR")}</b> enviados</span>
                    <span style={{ fontSize: 12, color: T.muted }}>👁️ <b>{abertos.toLocaleString("pt-BR")}</b> abertos</span>
                    <span style={{ fontSize: 12, color: T.muted }}>🎯 <b>{convertidos.toLocaleString("pt-BR")}</b> convertidos</span>
                    <span style={{ fontSize: 12, color: "#28cd41", fontWeight: 600 }}>💰 R$ {receita.toLocaleString("pt-BR")}</span>
                    <div style={{ flex: 1, display: "flex", alignItems: "center", gap: 8 }}>
                      <div style={{ flex: 1, height: 6, background: "#f0f0f2", borderRadius: 3, overflow: "hidden" }}>
                        <div style={{ width: `${Math.min(convRate, 100)}%`, height: "100%", background: convRate > 5 ? "#28cd41" : convRate > 2 ? "#ff9500" : "#ff3b30", borderRadius: 3, transition: "width .3s" }} />
                      </div>
                      <span style={{ fontSize: 11, fontWeight: 600, color: convRate > 5 ? "#28cd41" : convRate > 2 ? "#ff9500" : "#ff3b30" }}>{convRate.toFixed(1)}%</span>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </>
      )}
      {showModal && <CampanhaForm item={editItem} onClose={() => { setShowModal(false); setEditItem(null); }} />}
      {ativarCampanha && <CampanhaAtivarModal campanha={ativarCampanha} onClose={() => setAtivarCampanha(null)} onActivate={handleActivateConfirm} />}
    </div>
  );
}

// ── CampanhaAtivarModal ──────────────────────────────────────────────────────
function CampanhaAtivarModal({ campanha, onClose, onActivate }) {
  const [audiencia, setAudiencia] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [filtroRecencia, setFiltroRecencia] = useState("todos");
  const [filtroValor, setFiltroValor] = useState("todos");
  const [selecionados, setSelecionados] = useState(new Set());
  const [activating, setActivating] = useState(false);

  useEffect(() => {
    fetchCampanhaAudiencia(campanha.id).then(data => {
      const aud = data.audiencia || [];
      setAudiencia(aud);
      setStats(data.stats || null);
      setSelecionados(new Set(aud.map(c => c.id)));
      setLoading(false);
    }).catch(e => { console.error(e); setLoading(false); });
  }, [campanha.id]);

  const filtrados = audiencia.filter(c => {
    if (filtroRecencia !== "todos" && Number(c.recencia_dias) > parseInt(filtroRecencia)) return false;
    if (filtroValor !== "todos" && Number(c.receita_total || 0) < parseInt(filtroValor)) return false;
    return true;
  });

  const toggleAll = () => {
    if (selecionados.size === filtrados.length) {
      setSelecionados(new Set());
    } else {
      setSelecionados(new Set(filtrados.map(c => c.id)));
    }
  };

  const toggleOne = (id) => {
    const s = new Set(selecionados);
    s.has(id) ? s.delete(id) : s.add(id);
    setSelecionados(s);
  };

  const allSelected = filtrados.length > 0 && selecionados.size === filtrados.length;
  const selectedInFiltered = filtrados.filter(c => selecionados.has(c.id)).length;

  const CANAL_ICON = { whatsapp: "💬", email: "✉️", sms: "📱", push: "🔔" };
  const segLabel = campanha.segmento_alvo === "todos" ? "Todos" : (RFM_CFG[campanha.segmento_alvo]?.label || campanha.segmento_alvo);

  return (
    <Modal title="Ativar Campanha" subtitle={campanha.nome} onClose={onClose} width={680}>
      {loading ? (
        <div style={{ textAlign: "center", padding: 40, color: "#aeaeb2" }}>Carregando audiência...</div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {/* Campaign Info */}
          <div style={{ background: "var(--inp-bg)", borderRadius: 12, padding: "14px 18px", display: "flex", gap: 14, alignItems: "center" }}>
            <div style={{ fontSize: 28 }}>{CANAL_ICON[campanha.tipo] || "✉️"}</div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 14, fontWeight: 700 }}>{campanha.nome}</div>
              <div style={{ fontSize: 12, color: "var(--sub)", marginTop: 2 }}>
                {(campanha.tipo || "email").charAt(0).toUpperCase() + (campanha.tipo || "email").slice(1)} • Segmento: {segLabel}
              </div>
              {campanha.mensagem && (
                <div style={{ fontSize: 11, color: "var(--muted)", marginTop: 6, background: "var(--card-bg)", borderRadius: 8, padding: "8px 10px", maxHeight: 60, overflow: "hidden", lineHeight: 1.4 }}>
                  {campanha.mensagem.substring(0, 150)}{campanha.mensagem.length > 150 ? "..." : ""}
                </div>
              )}
            </div>
          </div>

          {/* Stats Bar */}
          {stats && (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 8 }}>
              <div style={{ background: "#e8f4ff", borderRadius: 10, padding: "10px 14px", textAlign: "center" }}>
                <div style={{ fontSize: 20, fontWeight: 800, color: "#007aff" }}>{stats.total}</div>
                <div style={{ fontSize: 10, color: "#007aff", fontWeight: 600 }}>Clientes</div>
              </div>
              <div style={{ background: "#e9fbed", borderRadius: 10, padding: "10px 14px", textAlign: "center" }}>
                <div style={{ fontSize: 20, fontWeight: 800, color: "#128C7E" }}>{stats.comTelefone}</div>
                <div style={{ fontSize: 10, color: "#128C7E", fontWeight: 600 }}>Com Telefone</div>
              </div>
              <div style={{ background: "#eeeeff", borderRadius: 10, padding: "10px 14px", textAlign: "center" }}>
                <div style={{ fontSize: 20, fontWeight: 800, color: "#4545F5" }}>{stats.comEmail}</div>
                <div style={{ fontSize: 10, color: "#4545F5", fontWeight: 600 }}>Com Email</div>
              </div>
              <div style={{ background: "#f5eaff", borderRadius: 10, padding: "10px 14px", textAlign: "center" }}>
                <div style={{ fontSize: 20, fontWeight: 800, color: "#8e44ef" }}>R$ {Number(stats.receitaTotal || 0).toLocaleString("pt-BR")}</div>
                <div style={{ fontSize: 10, color: "#8e44ef", fontWeight: 600 }}>Receita Total</div>
              </div>
            </div>
          )}

          {/* Filters */}
          <div style={{ display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <span style={{ fontSize: 11, fontWeight: 600, color: "var(--sub)" }}>🕐 Recência:</span>
              {["todos", "30", "60", "90", "180"].map(v => (
                <button key={v} onClick={() => setFiltroRecencia(v)} style={{
                  padding: "4px 10px", borderRadius: 8, fontSize: 11, fontWeight: 600, border: "none", cursor: "pointer",
                  background: filtroRecencia === v ? "#007aff" : "var(--inp-bg)", color: filtroRecencia === v ? "#fff" : "var(--sub)",
                  transition: "all .2s"
                }}>{v === "todos" ? "Todos" : `≤${v}d`}</button>
              ))}
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <span style={{ fontSize: 11, fontWeight: 600, color: "var(--sub)" }}>💰 Valor mín:</span>
              {["todos", "100", "300", "500"].map(v => (
                <button key={v} onClick={() => setFiltroValor(v)} style={{
                  padding: "4px 10px", borderRadius: 8, fontSize: 11, fontWeight: 600, border: "none", cursor: "pointer",
                  background: filtroValor === v ? "#8e44ef" : "var(--inp-bg)", color: filtroValor === v ? "#fff" : "var(--sub)",
                  transition: "all .2s"
                }}>{v === "todos" ? "Todos" : `R$${v}+`}</button>
              ))}
            </div>
          </div>

          {/* Select all / count */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, fontWeight: 600, color: "var(--sub)", cursor: "pointer" }}>
              <input type="checkbox" checked={allSelected} onChange={toggleAll} style={{ width: 15, height: 15, accentColor: "#007aff" }} />
              Selecionar todos ({filtrados.length})
            </label>
            <span style={{ fontSize: 11, color: "var(--muted)" }}>{selectedInFiltered} selecionado{selectedInFiltered !== 1 ? "s" : ""}</span>
          </div>

          {/* Client list */}
          <div style={{ maxHeight: 300, overflowY: "auto", borderRadius: 10, border: "1px solid var(--border)" }}>
            {filtrados.length === 0 ? (
              <div style={{ textAlign: "center", padding: 30, color: "var(--muted)", fontSize: 13 }}>Nenhum cliente encontrado com esses filtros</div>
            ) : filtrados.map(c => {
              const rfm = RFM_CFG[c.segmento_rfm];
              return (
                <div key={c.id} onClick={() => toggleOne(c.id)} style={{
                  display: "flex", alignItems: "center", gap: 10, padding: "8px 14px", cursor: "pointer",
                  borderBottom: "1px solid var(--border)", background: selecionados.has(c.id) ? "rgba(0,122,255,0.04)" : "transparent",
                  transition: "background .15s"
                }}>
                  <input type="checkbox" checked={selecionados.has(c.id)} onChange={() => toggleOne(c.id)} onClick={e => e.stopPropagation()} style={{ width: 14, height: 14, accentColor: "#007aff" }} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{c.nome || "Sem nome"}</div>
                    <div style={{ fontSize: 11, color: "var(--muted)" }}>{c.email || c.telefone || "—"}</div>
                  </div>
                  {rfm && <Chip label={rfm.label} c={rfm.c} bg={rfm.bg} />}
                  <div style={{ textAlign: "right", minWidth: 70 }}>
                    <div style={{ fontSize: 12, fontWeight: 700, color: "var(--text)" }}>R$ {Number(c.receita_total || 0).toLocaleString("pt-BR")}</div>
                    <div style={{ fontSize: 10, color: "var(--muted)" }}>{c.recencia_dias ? `${c.recencia_dias}d` : "—"}</div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Activate button */}
          <button
            className="ap-btn ap-btn-primary"
            disabled={selectedInFiltered === 0 || activating}
            onClick={async () => {
              setActivating(true);
              await onActivate(campanha, selectedInFiltered);
              setActivating(false);
            }}
            style={{ width: "100%", padding: "12px 0", fontSize: 14, fontWeight: 700 }}
          >
            {activating ? "Ativando..." : `▶ Ativar para ${selectedInFiltered} cliente${selectedInFiltered !== 1 ? "s" : ""} selecionado${selectedInFiltered !== 1 ? "s" : ""}`}
          </button>
        </div>
      )}
    </Modal>
  );
}


export default MarcaCampanhas;
