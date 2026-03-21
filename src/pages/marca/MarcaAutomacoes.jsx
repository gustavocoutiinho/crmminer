import React, { useState, useEffect, useMemo } from "react";
import { T } from "../../lib/theme";
import { Chip, Modal, FormRow, Lbl, KpiCard, SectionHeader, Toggle } from "../../components/UI";
import { useToast } from "../../context/ToastContext";
import { fetchAutomacoes, fetchAutomacao, updateAutomacao, createAutomacao, previewAutomacao, deleteAutomacao, fetchAutoExecucoes, duplicateAutomacao } from "../../lib/api";
import { DB_FALLBACK } from "../../data/fallback";
import AutomacaoExecutor from "./AutomacaoExecutor";
import AutomacaoPrioridade from "./AutomacaoPrioridade";
import useAutomationEngine from "../../hooks/useAutomationEngine";

function MarcaAutomacoes({ user }) {
  const toast = useToast();
  const marcaId = user?.marca_id || user?.marcaId;
  const [automacoes, setAutomacoes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [editItem, setEditItem] = useState(null);
  const [previewData, setPreviewData] = useState(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [view, setView] = useState("automacoes");
  const [execucoes, setExecucoes] = useState([]);
  const [execLoading, setExecLoading] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState(null);

  const load = async () => {
    try {
      const res = await fetchAutomacoes();
      setAutomacoes(res?.data || []);
    } catch (e) { console.error(e); }
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const loadExecucoes = async () => {
    setExecLoading(true);
    try {
      const res = await fetchAutoExecucoes();
      setExecucoes(res?.data || []);
    } catch (e) { console.error(e); }
    setExecLoading(false);
  };

  useEffect(() => { if (view === "execucoes") loadExecucoes(); }, [view]);

  const TIPO_ICON = { pedido_criado: "\u{1F6CD}", carrinho_abandonado: "\u{1F6D2}", novo_cliente: "\u{1F44B}", recorrente: "\u23F0", mudanca_rfm: "\u{1F504}", pos_venda: "\u{1F4E6}", reativacao: "\u{1F504}", aniversario: "\u{1F382}", custom: "\u26A1" };
  const TIPO_LABEL = { pedido_criado: "Pedido criado", carrinho_abandonado: "Carrinho abandonado", novo_cliente: "Novo cliente", recorrente: "Recorrente", mudanca_rfm: "Mudan\u00E7a RFM", pos_venda: "P\u00F3s-venda", reativacao: "Reativa\u00E7\u00E3o", aniversario: "Anivers\u00E1rio", custom: "Custom" };
  const TIPO_COLOR = { pedido_criado: "#28cd41", carrinho_abandonado: "#ff3b30", novo_cliente: "#007aff", recorrente: "#ff9500", mudanca_rfm: "#8e44ef", pos_venda: "#007aff", reativacao: "#ff9500", aniversario: "#af52de", custom: "#4545F5" };
  const TIPO_BG = { pedido_criado: "#e9fbed", carrinho_abandonado: "#fff0f0", novo_cliente: "#e8f4ff", recorrente: "#fff3e0", mudanca_rfm: "#f5eaff", pos_venda: "#e8f4ff", reativacao: "#fff3e0", aniversario: "#f5eaff", custom: "#eeeeff" };
  const CANAL_ICON = { whatsapp: "\u{1F4AC}", email: "\u2709\uFE0F", sms: "\u{1F4F1}" };
  const CANAL_LABEL = { whatsapp: "WhatsApp", email: "Email", sms: "SMS" };
  const CANAL_COLOR = { whatsapp: "#128C7E", email: "#4545F5", sms: "#ff9500" };
  const CANAL_BG = { whatsapp: "#e9fbed", email: "#eeeeff", sms: "#fff3e0" };
  const STATUS_EXEC = { sucesso: { c: "#28cd41", bg: "#e9fbed" }, erro: { c: "#ff3b30", bg: "#fff0f0" }, pendente: { c: "#ff9500", bg: "#fff3e0" } };

  const ativas = automacoes.filter((a) => a.ativo);
  const totalExec = automacoes.reduce((s, a) => s + (a.execucoes || 0), 0);
  const totalConv = automacoes.reduce((s, a) => s + (a.conversoes || 0), 0);

  const handleToggle = async (a) => {
    try {
      await updateAutomacao(a.id, { ativo: !a.ativo });
      setAutomacoes((prev) => prev.map((x) => x.id === a.id ? { ...x, ativo: !x.ativo } : x));
    } catch (e) { console.error(e); }
  };

  const handlePreview = async (a) => {
    setPreviewLoading(true);
    setPreviewData({ nome: a.nome, tipo: a.tipo });
    try {
      const res = await previewAutomacao(a.id);
      setPreviewData({ nome: a.nome, tipo: a.tipo, ...res });
    } catch (e) {
      console.error(e);
      setPreviewData((p) => ({ ...p, error: "Erro ao carregar preview" }));
    }
    setPreviewLoading(false);
  };

  const handleDuplicate = async (a) => {
    try {
      await duplicateAutomacao(a.id);
      await load();
      toast("Automa\u00E7\u00E3o duplicada!", "success");
    } catch (e) { console.error(e); toast(e.message || "Erro ao duplicar", "error"); }
  };

  const handleDelete = async (a) => {
    try {
      await deleteAutomacao(a.id);
      await load();
      toast("Automa\u00E7\u00E3o exclu\u00EDda", "success");
      setDeleteConfirm(null);
    } catch (e) { console.error(e); toast(e.message || "Erro ao excluir", "error"); }
  };

  /* Step Wizard Form */
  const STEP_TIPOS = [
    { k: "pedido_criado", icon: "\u{1F6CD}", label: "Pedido criado", desc: "Quando um pedido \u00E9 confirmado" },
    { k: "carrinho_abandonado", icon: "\u{1F6D2}", label: "Carrinho abandonado", desc: "Carrinho sem convers\u00E3o" },
    { k: "novo_cliente", icon: "\u{1F44B}", label: "Novo cliente", desc: "Primeiro cadastro no sistema" },
    { k: "recorrente", icon: "\u23F0", label: "Recorrente", desc: "Envio peri\u00F3dico programado" },
    { k: "mudanca_rfm", icon: "\u{1F504}", label: "Mudan\u00E7a RFM", desc: "Mudan\u00E7a de segmento RFM" },
  ];

  function AutomacaoForm({ item, onClose }) {
    const isEdit = !!item;
    const [step, setStep] = useState(1);
    const [f, setF] = useState(item
      ? { nome: item.nome || "", tipo: item.tipo || "custom", canal: item.canal || "whatsapp", template: item.template || "", gatilho: item.gatilho || "", ativo: !!item.ativo, delay_hours: item.delay_hours || "" }
      : { nome: "", tipo: "", canal: "whatsapp", template: "", gatilho: "", ativo: true, delay_hours: "" }
    );
    const s = (k, v) => setF((x) => ({ ...x, [k]: v }));
    const [saving, setSaving] = useState(false);

    const canNext = () => {
      if (step === 1) return !!f.tipo;
      if (step === 2) return !!f.canal && !!f.template.trim();
      if (step === 3) return !!f.nome.trim();
      return true;
    };

    const handleSave = async () => {
      setSaving(true);
      try {
        const payload = { nome: f.nome, tipo: f.tipo, canal: f.canal, template: f.template, gatilho: f.gatilho, ativo: f.ativo };
        if (f.delay_hours) payload.delay_hours = +f.delay_hours;
        if (isEdit) {
          await updateAutomacao(item.id, payload);
        } else {
          await createAutomacao({ ...payload, marca_id: marcaId });
        }
        await load();
        toast(isEdit ? "Automa\u00E7\u00E3o atualizada!" : "Automa\u00E7\u00E3o criada!", "success");
        onClose();
      } catch (e) { console.error(e); toast(e.message || "Erro ao salvar automa\u00E7\u00E3o", "error"); }
      setSaving(false);
    };

    const stepIndicator = (
      <div style={{ display: "flex", justifyContent: "center", gap: 12, marginBottom: 24 }}>
        {[1, 2, 3, 4].map((n) => (
          <div key={n} style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <div style={{ width: 32, height: 32, borderRadius: 16, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, fontWeight: 700, background: step >= n ? "#4545F5" : "rgba(0,0,0,0.06)", color: step >= n ? "#fff" : T.muted, transition: "all .2s" }}>{n}</div>
            {n < 4 && <div style={{ width: 24, height: 2, borderRadius: 1, background: step > n ? "#4545F5" : "rgba(0,0,0,0.08)" }} />}
          </div>
        ))}
      </div>
    );

    const navButtons = (
      <div style={{ display: "flex", justifyContent: "space-between", marginTop: 20 }}>
        {step > 1 ? <button className="ap-btn ap-btn-secondary" onClick={() => setStep(step - 1)}>{"\u2190 Voltar"}</button> : <div />}
        {step < 4 ? (
          <button className="ap-btn ap-btn-primary" disabled={!canNext()} onClick={() => setStep(step + 1)}>{`Pr\u00F3ximo \u2192`}</button>
        ) : (
          <button className="ap-btn ap-btn-primary" disabled={saving} onClick={handleSave}>{saving ? "Salvando\u2026" : isEdit ? "Salvar Altera\u00E7\u00F5es \u2192" : "Criar Automa\u00E7\u00E3o \u2192"}</button>
        )}
      </div>
    );

    return (
      <Modal title={isEdit ? "Editar Automa\u00E7\u00E3o" : "Nova Automa\u00E7\u00E3o"} subtitle={["Tipo & Gatilho", "Canal & Template", "Configura\u00E7\u00E3o", "Revis\u00E3o"][step - 1]} onClose={onClose} width={600}>
        {stepIndicator}

        {step === 1 && (
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <Lbl>Selecione o tipo de automa\u00E7\u00E3o</Lbl>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 10 }}>
              {STEP_TIPOS.map((t) => (
                <div key={t.k} onClick={() => s("tipo", t.k)} style={{ padding: "16px 14px", borderRadius: 14, border: f.tipo === t.k ? "2px solid #4545F5" : "2px solid rgba(0,0,0,0.06)", background: f.tipo === t.k ? "#eeeeff" : "transparent", cursor: "pointer", transition: "all .15s" }}>
                  <div style={{ fontSize: 24, marginBottom: 6 }}>{t.icon}</div>
                  <div style={{ fontSize: 13, fontWeight: 700 }}>{t.label}</div>
                  <div style={{ fontSize: 11, color: T.muted, marginTop: 2 }}>{t.desc}</div>
                </div>
              ))}
            </div>
            {(f.tipo === "carrinho_abandonado" || f.tipo === "recorrente") && (
              <div>
                <Lbl>Delay (horas)</Lbl>
                <input className="ap-inp" type="number" value={f.delay_hours} onChange={(e) => s("delay_hours", e.target.value)} placeholder="Ex: 24" style={{ maxWidth: 160 }} />
              </div>
            )}
            <div>
              <Lbl>Gatilho (opcional)</Lbl>
              <input className="ap-inp" value={f.gatilho} onChange={(e) => s("gatilho", e.target.value)} placeholder="Ex: 24h sem finalizar compra" />
            </div>
          </div>
        )}

        {step === 2 && (
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <Lbl>Canal de envio</Lbl>
            <div style={{ display: "flex", gap: 10 }}>
              {[{ k: "whatsapp", icon: "\u{1F4AC}", label: "WhatsApp", c: "#128C7E" }, { k: "email", icon: "\u2709\uFE0F", label: "Email", c: "#4545F5" }, { k: "sms", icon: "\u{1F4F1}", label: "SMS", c: "#ff9500" }].map((ch) => (
                <div key={ch.k} onClick={() => s("canal", ch.k)} style={{ flex: 1, padding: "14px 12px", borderRadius: 12, border: f.canal === ch.k ? `2px solid ${ch.c}` : "2px solid rgba(0,0,0,0.06)", background: f.canal === ch.k ? `${ch.c}10` : "transparent", cursor: "pointer", textAlign: "center", transition: "all .15s" }}>
                  <div style={{ fontSize: 22, marginBottom: 4 }}>{ch.icon}</div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: f.canal === ch.k ? ch.c : T.sub }}>{ch.label}</div>
                </div>
              ))}
            </div>
            <div>
              <Lbl>Template da mensagem</Lbl>
              <textarea className="ap-inp" rows={6} value={f.template} onChange={(e) => s("template", e.target.value)} placeholder={"Ol\u00E1 {nome}, tudo bem?\n\nVari\u00E1veis dispon\u00EDveis: {nome}, {email}, {telefone}, {empresa}"} style={{ resize: "vertical", fontFamily: "var(--mono)", fontSize: 12 }} />
              <div style={{ fontSize: 11, color: T.muted, marginTop: 4 }}>Use {"{"}nome{"}"}, {"{"}email{"}"}, {"{"}telefone{"}"} para personalizar</div>
            </div>
          </div>
        )}

        {step === 3 && (
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <div>
              <Lbl>Nome da automa\u00E7\u00E3o *</Lbl>
              <input className="ap-inp" value={f.nome} onChange={(e) => s("nome", e.target.value)} placeholder="Ex: Recuperar carrinho 24h" />
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 16px", borderRadius: 12, background: "rgba(0,0,0,0.03)" }}>
              <Toggle checked={f.ativo} onChange={() => s("ativo", !f.ativo)} />
              <div>
                <div style={{ fontSize: 13, fontWeight: 600 }}>Ativar imediatamente</div>
                <div style={{ fontSize: 11, color: T.muted }}>A automa\u00E7\u00E3o come\u00E7ar\u00E1 a funcionar assim que for criada</div>
              </div>
            </div>
          </div>
        )}

        {step === 4 && (
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 4 }}>Resumo da automa\u00E7\u00E3o</div>
            <div style={{ background: "rgba(0,0,0,0.03)", borderRadius: 14, padding: 18, display: "flex", flexDirection: "column", gap: 12 }}>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span style={{ fontSize: 12, color: T.muted }}>Nome</span>
                <span style={{ fontSize: 13, fontWeight: 600 }}>{f.nome || "\u2014"}</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ fontSize: 12, color: T.muted }}>Tipo</span>
                <Chip label={`${TIPO_ICON[f.tipo] || "\u26A1"} ${TIPO_LABEL[f.tipo] || f.tipo}`} c={TIPO_COLOR[f.tipo] || "#4545F5"} bg={TIPO_BG[f.tipo] || "#eeeeff"} />
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ fontSize: 12, color: T.muted }}>Canal</span>
                <Chip label={`${CANAL_ICON[f.canal] || ""} ${CANAL_LABEL[f.canal] || f.canal}`} c={CANAL_COLOR[f.canal] || "#4545F5"} bg={CANAL_BG[f.canal] || "#eeeeff"} />
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ fontSize: 12, color: T.muted }}>Status</span>
                <span style={{ fontSize: 12, fontWeight: 600, color: f.ativo ? "#28cd41" : T.muted }}>{f.ativo ? "\u25CF Ativa" : "\u25CF Inativa"}</span>
              </div>
              {f.gatilho && (
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <span style={{ fontSize: 12, color: T.muted }}>Gatilho</span>
                  <span style={{ fontSize: 12 }}>{f.gatilho}</span>
                </div>
              )}
              {f.delay_hours && (
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <span style={{ fontSize: 12, color: T.muted }}>Delay</span>
                  <span style={{ fontSize: 12 }}>{f.delay_hours}h</span>
                </div>
              )}
            </div>
            <div>
              <div style={{ fontSize: 11, fontWeight: 700, color: T.muted, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 6 }}>Template</div>
              <div style={{ background: "#1a1a2e", borderRadius: 10, padding: "12px 16px", color: "#e0e0e0", fontFamily: "var(--mono)", fontSize: 11, lineHeight: 1.6, whiteSpace: "pre-wrap", maxHeight: 120, overflow: "auto" }}>{f.template || "Sem template"}</div>
            </div>
          </div>
        )}

        {navButtons}
      </Modal>
    );
  }

  return (
    <div className="fade-up">
      <SectionHeader tag="Growth" title="Automa\u00E7\u00F5es" action={<button className="ap-btn ap-btn-primary" onClick={() => setShowCreate(true)}>+ Nova Automa\u00E7\u00E3o</button>} />

      {/* Tab toggle */}
      <div className="seg" style={{ display: "inline-flex", gap: 2, marginBottom: 16 }}>
        {[{ k: "automacoes", l: "\u26A1 Automa\u00E7\u00F5es" }, { k: "execucoes", l: "\u{1F4CB} Execu\u00E7\u00F5es" }, { k: "executor", l: "\u{1F680} Engine" }, { k: "prioridade", l: "\u{1F4CA} Prioridade" }].map((t) => (
          <button key={t.k} className={`seg-btn ${view === t.k ? "on" : ""}`} onClick={() => setView(t.k)}>{t.l}</button>
        ))}
      </div>

      <div className="kpi-grid-4" style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 12, marginBottom: 20 }}>
        <KpiCard label="Total automa\u00E7\u00F5es" value={automacoes.length} icon="\u26A1" color="#4545F5" />
        <KpiCard label="Ativas" value={ativas.length} icon="\u2705" color="#28cd41" />
        <KpiCard label="Execu\u00E7\u00F5es total" value={totalExec.toLocaleString("pt-BR")} icon="\u{1F680}" color="#007aff" />
        <KpiCard label="Convers\u00F5es total" value={totalConv.toLocaleString("pt-BR")} icon="\u{1F3AF}" color="#af52de" />
      </div>

      {/* View: Automacoes */}
      {view === "automacoes" && <>
        {loading && <div style={{ textAlign: "center", padding: 40, color: T.muted }}>Carregando automa\u00E7\u00F5es...</div>}
        {!loading && automacoes.length === 0 && <div style={{ textAlign: "center", padding: 40, color: T.muted }}>Nenhuma automa\u00E7\u00E3o configurada. Crie a primeira!</div>}

        {automacoes.map((a) => {
          const tipoKey = a.tipo || "custom";
          const canalKey = (a.canal || "email").toLowerCase();
          return (
            <div key={a.id} className="ap-card" style={{ padding: "18px 22px", marginBottom: 10 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                <div style={{ width: 44, height: 44, borderRadius: 12, background: TIPO_BG[tipoKey] || "#eeeeff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20, flexShrink: 0 }}>{TIPO_ICON[tipoKey] || "\u26A1"}</div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
                    <span style={{ fontSize: 14, fontWeight: 700 }}>{a.nome}</span>
                    <Chip label={TIPO_LABEL[tipoKey] || tipoKey} c={TIPO_COLOR[tipoKey] || "#4545F5"} bg={TIPO_BG[tipoKey] || "#eeeeff"} />
                  </div>
                  <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                    <Chip label={`${CANAL_ICON[canalKey] || ""} ${CANAL_LABEL[canalKey] || canalKey}`} c={CANAL_COLOR[canalKey] || "#4545F5"} bg={CANAL_BG[canalKey] || "#eeeeff"} />
                    <span style={{ fontSize: 12, fontWeight: 600, color: a.ativo ? "#28cd41" : T.muted }}>{a.ativo ? "\u25CF Ativa" : "\u25CF Inativa"}</span>
                    <span style={{ fontSize: 12, color: T.muted }}>{(a.execucoes || 0).toLocaleString("pt-BR")} exec \u00B7 {(a.conversoes || 0).toLocaleString("pt-BR")} conv</span>
                  </div>
                </div>
                <Toggle checked={!!a.ativo} onChange={() => handleToggle(a)} />
              </div>
              {a.template && (
                <div style={{ marginTop: 10, marginLeft: 58, fontSize: 12, color: T.muted, fontFamily: "var(--mono)", background: "rgba(0,0,0,0.03)", borderRadius: 8, padding: "8px 12px", lineHeight: 1.5 }}>
                  {a.template.length > 80 ? a.template.slice(0, 80) + "\u2026" : a.template}
                </div>
              )}
              <div style={{ marginTop: 10, marginLeft: 58, display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center" }}>
                <button className="ap-btn ap-btn-sm" onClick={() => { setView("executor"); }} style={{ fontSize: 11, background: "#4545F5", color: "#fff", border: "none" }}>{"▶ Executar"}</button>
                <button className="ap-btn ap-btn-sm" onClick={() => setEditItem(a)} style={{ fontSize: 11 }}>{"\u270F\uFE0F Editar"}</button>
                <button className="ap-btn ap-btn-sm" onClick={() => handlePreview(a)} style={{ fontSize: 11 }}>{"\u{1F441} Preview"}</button>
                <button className="ap-btn ap-btn-sm" onClick={() => handleDuplicate(a)} style={{ fontSize: 11 }}>{"\u{1F4CB} Duplicar"}</button>
                <button className="ap-btn ap-btn-sm" onClick={() => setDeleteConfirm(a)} style={{ fontSize: 11, color: "#ff3b30" }}>{"\u{1F5D1} Excluir"}</button>
              </div>
            </div>
          );
        })}
      </>}

      {/* View: Execucoes */}
      {view === "execucoes" && (
        <div className="ap-card" style={{ padding: 0, overflow: "hidden" }}>
          {execLoading && <div style={{ textAlign: "center", padding: 40, color: T.muted }}>Carregando execu\u00E7\u00F5es...</div>}
          {!execLoading && execucoes.length === 0 && (
            <div style={{ textAlign: "center", padding: 50, color: T.muted }}>
              <div style={{ fontSize: 32, marginBottom: 8 }}>{"\u{1F4CB}"}</div>
              <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 4 }}>Nenhuma execu\u00E7\u00E3o registrada</div>
              <div style={{ fontSize: 12 }}>As execu\u00E7\u00F5es aparecer\u00E3o aqui quando as automa\u00E7\u00F5es forem disparadas.</div>
            </div>
          )}
          {!execLoading && execucoes.length > 0 && (
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
              <thead>
                <tr style={{ borderBottom: "1px solid rgba(0,0,0,0.06)" }}>
                  <th style={{ textAlign: "left", padding: "12px 16px", fontSize: 11, fontWeight: 700, color: T.muted, textTransform: "uppercase", letterSpacing: 0.5 }}>Automa\u00E7\u00E3o</th>
                  <th style={{ textAlign: "left", padding: "12px 16px", fontSize: 11, fontWeight: 700, color: T.muted, textTransform: "uppercase", letterSpacing: 0.5 }}>Cliente</th>
                  <th style={{ textAlign: "left", padding: "12px 16px", fontSize: 11, fontWeight: 700, color: T.muted, textTransform: "uppercase", letterSpacing: 0.5 }}>Status</th>
                  <th style={{ textAlign: "left", padding: "12px 16px", fontSize: 11, fontWeight: 700, color: T.muted, textTransform: "uppercase", letterSpacing: 0.5 }}>Canal</th>
                  <th style={{ textAlign: "right", padding: "12px 16px", fontSize: 11, fontWeight: 700, color: T.muted, textTransform: "uppercase", letterSpacing: 0.5 }}>Data</th>
                </tr>
              </thead>
              <tbody>
                {execucoes.map((ex, i) => {
                  const st = STATUS_EXEC[ex.status] || STATUS_EXEC.pendente;
                  const cKey = (ex.canal || "").toLowerCase();
                  return (
                    <tr key={ex.id || i} style={{ borderBottom: "1px solid rgba(0,0,0,0.04)" }}>
                      <td style={{ padding: "10px 16px", fontWeight: 600 }}>{ex.automacao_nome || "\u2014"}</td>
                      <td style={{ padding: "10px 16px" }}>{ex.cliente_nome || "\u2014"}</td>
                      <td style={{ padding: "10px 16px" }}><Chip label={ex.status || "pendente"} c={st.c} bg={st.bg} /></td>
                      <td style={{ padding: "10px 16px" }}>{CANAL_ICON[cKey] || ""} {CANAL_LABEL[cKey] || ex.canal || "\u2014"}</td>
                      <td style={{ padding: "10px 16px", textAlign: "right", color: T.muted, fontSize: 12 }}>{ex.created_at ? new Date(ex.created_at).toLocaleString("pt-BR") : "\u2014"}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* View: Engine (Executor) */}
      {view === "executor" && <AutomacaoExecutor user={user} />}

      {/* View: Prioridade */}
      {view === "prioridade" && <AutomacaoPrioridade user={user} />}

      {showCreate && <AutomacaoForm onClose={() => setShowCreate(false)} />}
      {editItem && <AutomacaoForm item={editItem} onClose={() => { setEditItem(null); }} />}

      {/* Delete confirmation */}
      {deleteConfirm && (
        <Modal title="Excluir Automa\u00E7\u00E3o" subtitle={`Tem certeza que deseja excluir "${deleteConfirm.nome}"?`} onClose={() => setDeleteConfirm(null)} width={420}>
          <div style={{ fontSize: 13, color: T.muted, marginBottom: 16 }}>Esta a\u00E7\u00E3o n\u00E3o pode ser desfeita. Todas as execu\u00E7\u00F5es relacionadas tamb\u00E9m ser\u00E3o removidas.</div>
          <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
            <button className="ap-btn ap-btn-secondary" onClick={() => setDeleteConfirm(null)}>Cancelar</button>
            <button className="ap-btn" style={{ background: "#ff3b30", color: "#fff", border: "none" }} onClick={() => handleDelete(deleteConfirm)}>Excluir</button>
          </div>
        </Modal>
      )}

      {previewData && (
        <Modal title={`Preview \u2014 ${previewData.nome}`} subtitle={TIPO_LABEL[previewData.tipo] || previewData.tipo} onClose={() => setPreviewData(null)} width={600}>
          {previewLoading ? (
            <div style={{ textAlign: "center", padding: 30, color: T.muted }}>Carregando preview...</div>
          ) : previewData.error ? (
            <div style={{ textAlign: "center", padding: 30, color: "#ff3b30" }}>{previewData.error}</div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              <div style={{ background: "#1a1a2e", borderRadius: 12, padding: "16px 20px", color: "#e0e0e0", fontFamily: "var(--mono)", fontSize: 12, lineHeight: 1.7, whiteSpace: "pre-wrap" }}>{previewData.template || "Sem template"}</div>
              <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
                <div style={{ background: "#eeeeff", borderRadius: 10, padding: "8px 14px", fontSize: 13, fontWeight: 600, color: "#4545F5" }}>{"\u{1F3AF}"} {previewData.total_impactados ?? "\u2014"} clientes impactados</div>
              </div>
              {previewData.amostra && previewData.amostra.length > 0 && (
                <div>
                  <div style={{ fontSize: 12, fontWeight: 700, color: T.muted, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 8 }}>Amostra de Clientes</div>
                  <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
                    <thead>
                      <tr style={{ borderBottom: "1px solid #e5e5ea" }}>
                        <th style={{ textAlign: "left", padding: "6px 8px", color: T.muted, fontWeight: 600 }}>Nome</th>
                        <th style={{ textAlign: "left", padding: "6px 8px", color: T.muted, fontWeight: 600 }}>Email</th>
                        <th style={{ textAlign: "right", padding: "6px 8px", color: T.muted, fontWeight: 600 }}>Receita</th>
                      </tr>
                    </thead>
                    <tbody>
                      {previewData.amostra.map((c) => (
                        <tr key={c.id} style={{ borderBottom: "1px solid #f5f5f7" }}>
                          <td style={{ padding: "6px 8px" }}>{c.nome}</td>
                          <td style={{ padding: "6px 8px", color: T.muted }}>{c.email}</td>
                          <td style={{ padding: "6px 8px", textAlign: "right", color: "#28cd41", fontWeight: 600 }}>R$ {(+(c.receita_total || 0)).toLocaleString("pt-BR")}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </Modal>
      )}
    </div>
  );
}


export default MarcaAutomacoes;
