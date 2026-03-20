import React, { useState, useEffect } from "react";
import { T } from "../../lib/theme";
import { Avatar, Chip, Modal, FormRow, Lbl, KpiCard, SectionHeader, Toggle } from "../../components/UI";
import { fetchIntegracoes, fetchIntegracao, updateIntegracao, testIntegracao, fetchTemplates, createTemplate, updateTemplate, deleteTemplate, enviarMensagem, fetchApiKeys, createApiKey, deleteApiKey, fetchWebhooks, createWebhook, updateWebhook, deleteWebhook, testWebhook, syncShopify, fetchSyncLogs, API_URL } from "../../lib/api";

const CANAL_CFG = {
  whatsapp: { label: "WhatsApp", icon: "💬", c: "#128C7E", bg: "#e9fbed" },
  email: { label: "Email", icon: "✉️", c: "#4545F5", bg: "#eeeeff" },
  sms: { label: "SMS", icon: "📱", c: "#ff9500", bg: "#fff3e0" },
};
const CATEG_CFG = {
  marketing: { label: "Marketing", c: "#8e44ef" },
  transacional: { label: "Transacional", c: "#4545F5" },
  servico: { label: "Serviço", c: "#28cd41" },
  boas_vindas: { label: "Boas-vindas", c: "#ff9500" },
  reativacao: { label: "Reativação", c: "#ff6b35" },
  pos_venda: { label: "Pós-venda", c: "#128C7E" },
  carrinho: { label: "Carrinho", c: "#ff3b30" },
};

function MarcaIntegracoes({ user }) {
  const marcaId = user.marca_id || user.marcaId;
  const [tab, setTab] = useState("conexoes");

  /* ── Conexões state ── */
  const [conexoes, setConexoes] = useState([]);
  const [loadingConn, setLoadingConn] = useState(true);
  const [detailConn, setDetailConn] = useState(null);
  const [testResult, setTestResult] = useState({});
  const [testingId, setTestingId] = useState(null);
  const [savingConn, setSavingConn] = useState(false);

  /* ── Templates state ── */
  const [templates, setTemplates] = useState([]);
  const [loadingTpl, setLoadingTpl] = useState(true);
  const [tplFilter, setTplFilter] = useState({ canal: "", categoria: "" });
  const [showTplModal, setShowTplModal] = useState(false);
  const [editTpl, setEditTpl] = useState(null);
  const [deletingTpl, setDeletingTpl] = useState(null);
  const [previewTpl, setPreviewTpl] = useState(null);

  /* ── Sync state ── */
  const [syncing, setSyncing] = useState(false);
  const [syncResult, setSyncResult] = useState(null);
  const [syncLogs, setSyncLogs] = useState([]);
  const [loadingLogs, setLoadingLogs] = useState(false);
  const [expandedLog, setExpandedLog] = useState(null);

  const [copied, setCopied] = useState(null);
  const copyText = (t) => { navigator.clipboard.writeText(t).catch(() => {}); setCopied(t); setTimeout(() => setCopied(null), 2000); };

  /* ── Load integracoes ── */
  useEffect(() => {
    setLoadingConn(true);
    fetchIntegracoes().then((r) => { setConexoes(r.data || []); }).catch(() => {}).finally(() => setLoadingConn(false));
  }, []);

  /* ── Load sync logs ── */
  useEffect(() => {
    if (tab === "conexoes") {
      setLoadingLogs(true);
      fetchSyncLogs().then((r) => { setSyncLogs(r.data || []); }).catch(() => {}).finally(() => setLoadingLogs(false));
    }
  }, [tab]);

  /* ── Trigger Shopify Sync ── */
  const handleShopifySync = async () => {
    setSyncing(true);
    setSyncResult(null);
    try {
      const r = await syncShopify(marcaId);
      setSyncResult(r.sync_log || r);
      // Refresh logs and connections
      fetchSyncLogs().then((r) => setSyncLogs(r.data || [])).catch(() => {});
      fetchIntegracoes().then((r) => setConexoes(r.data || [])).catch(() => {});
    } catch (e) {
      setSyncResult({ status: "error", erros: 1, detalhes: { errors: [{ error: e.message }] } });
    }
    setSyncing(false);
  };

  /* ── Load templates ── */
  useEffect(() => {
    setLoadingTpl(true);
    fetchTemplates(tplFilter.canal || undefined, tplFilter.categoria || undefined)
      .then((r) => { setTemplates(r.data || []); })
      .catch(() => {})
      .finally(() => setLoadingTpl(false));
  }, [tplFilter.canal, tplFilter.categoria]);

  const ST_CONN = {
    conectado: { label: "Conectado", c: "#28cd41", bg: "#e9fbed" },
    ativo: { label: "Ativo", c: "#28cd41", bg: "#e9fbed" },
    configurando: { label: "Configurando", c: "#ff9500", bg: "#fff3e0" },
    desconectado: { label: "Desconectado", c: "#aeaeb2", bg: "#f5f5f7" },
    inativo: { label: "Inativo", c: "#aeaeb2", bg: "#f5f5f7" },
    erro: { label: "Erro", c: "#ff3b30", bg: "#ffe5e3" },
  };

  const ICON_MAP = { shopify: "🛍", whatsapp: "💬", suri: "🤖", google_ads: "📢", meta_ads: "📘", erp: "📦", mailchimp: "✉️", email: "✉️", sms: "📱" };
  const getIcon = (tipo) => ICON_MAP[tipo] || "🔗";

  /* ── Test connection ── */
  const handleTest = async (id) => {
    setTestingId(id);
    setTestResult((p) => ({ ...p, [id]: null }));
    try {
      const r = await testIntegracao(id);
      setTestResult((p) => ({ ...p, [id]: r }));
    } catch (e) {
      setTestResult((p) => ({ ...p, [id]: { ok: false, error: e.message || "Erro de rede" } }));
    }
    setTestingId(null);
  };

  /* ── Conexão config modal ── */
  function ConexaoModal({ conn, onClose }) {
    const st = ST_CONN[conn.status] || ST_CONN.desconectado;
    const [form, setForm] = useState({});
    const [loading, setLoading] = useState(true);
    const [localTest, setLocalTest] = useState(null);
    const [testing, setTesting] = useState(false);

    useEffect(() => {
      fetchIntegracao(conn.id).then((r) => {
        setForm(r.data?.config || {});
      }).catch(() => {}).finally(() => setLoading(false));
    }, [conn.id]);

    const s = (k, v) => setForm((x) => ({ ...x, [k]: v }));

    const handleSave = async () => {
      setSavingConn(true);
      try {
        await updateIntegracao(conn.id, { config: form, status: "configurando" });
        const refreshed = await fetchIntegracoes();
        setConexoes(refreshed.data || []);
        onClose();
      } catch (e) { console.error(e); }
      setSavingConn(false);
    };

    const handleTestLocal = async () => {
      setTesting(true);
      setLocalTest(null);
      try {
        const r = await testIntegracao(conn.id);
        setLocalTest(r);
      } catch (e) { setLocalTest({ ok: false, error: e.message }); }
      setTesting(false);
    };

    const configKeys = Object.keys(form);

    return (
      <Modal title={`${getIcon(conn.tipo)} ${conn.nome}`} subtitle={conn.tipo} onClose={onClose} width={480}>
        <div style={{ display: "flex", gap: 10, alignItems: "center", marginBottom: 20 }}>
          <Chip label={st.label} c={st.c} bg={st.bg} />
          {conn.ultimo_sync && <span style={{ fontSize: 12, color: T.muted }}>Último sync: {new Date(conn.ultimo_sync).toLocaleString("pt-BR")}</span>}
        </div>
        {conn.status === "erro" && <div style={{ background: "#ffe5e3", border: "1px solid #ff3b3030", borderRadius: 10, padding: "10px 14px", fontSize: 12, color: "#ff3b30", marginBottom: 16 }}>⚠️ Falha na última sincronização. Verifique as credenciais.</div>}
        {loading ? (
          <div style={{ textAlign: "center", padding: 30, color: T.muted }}>Carregando configuração...</div>
        ) : (
          <>
            {configKeys.length > 0 && (
              <div style={{ display: "flex", flexDirection: "column", gap: 12, marginBottom: 20 }}>
                {configKeys.map((k) => (
                  <div key={k}>
                    <Lbl>{k}</Lbl>
                    <input className="ap-inp" value={form[k] || ""} onChange={(e) => s(k, e.target.value)} placeholder={k} />
                  </div>
                ))}
              </div>
            )}
            {localTest && (
              <div style={{ background: localTest.ok ? "#e9fbed" : "#ffe5e3", border: `1px solid ${localTest.ok ? "#28cd4130" : "#ff3b3030"}`, borderRadius: 10, padding: "10px 14px", fontSize: 12, color: localTest.ok ? "#28cd41" : "#ff3b30", marginBottom: 16 }}>
                {localTest.ok ? `✓ Conexão OK${localTest.shop ? ` — ${localTest.shop}` : ""}` : `✗ ${localTest.error || "Falha na conexão"}`}
              </div>
            )}
            <div style={{ display: "flex", gap: 10 }}>
              <button className="ap-btn ap-btn-primary" style={{ flex: 1 }} disabled={savingConn} onClick={handleSave}>{savingConn ? "Salvando..." : "Salvar Configuração"}</button>
              <button className="ap-btn ap-btn-secondary" disabled={testing} onClick={handleTestLocal}>{testing ? "Testando..." : "Testar Conexão"}</button>
            </div>
          </>
        )}
      </Modal>
    );
  }

  /* ── Template Modal (create/edit) ── */
  function TemplateModal({ tpl, onClose }) {
    const isEdit = !!tpl;
    const [form, setForm] = useState({
      nome: tpl?.nome || "",
      canal: tpl?.canal || "whatsapp",
      categoria: tpl?.categoria || "marketing",
      assunto: tpl?.assunto || "",
      corpo: tpl?.corpo || "",
      variaveis: tpl?.variaveis || [],
    });
    const [saving, setSaving] = useState(false);
    const [varInput, setVarInput] = useState("");

    const s = (k, v) => setForm((x) => ({ ...x, [k]: v }));
    const addVar = () => {
      const v = varInput.trim().replace(/[{}]/g, "");
      if (v && !form.variaveis.includes(v)) {
        s("variaveis", [...form.variaveis, v]);
      }
      setVarInput("");
    };
    const removeVar = (v) => s("variaveis", form.variaveis.filter((x) => x !== v));

    const handleSave = async () => {
      setSaving(true);
      try {
        if (isEdit) {
          await updateTemplate(tpl.id, form);
        } else {
          await createTemplate(form);
        }
        const refreshed = await fetchTemplates(tplFilter.canal || undefined, tplFilter.categoria || undefined);
        setTemplates(refreshed.data || []);
        onClose();
      } catch (e) { console.error(e); }
      setSaving(false);
    };

    return (
      <Modal title={isEdit ? "Editar Template" : "Novo Template"} subtitle={isEdit ? tpl.nome : "Crie um novo modelo de mensagem"} onClose={onClose} width={540}>
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <div><Lbl>Nome *</Lbl><input className="ap-inp" value={form.nome} onChange={(e) => s("nome", e.target.value)} placeholder="Ex: Boas-vindas WhatsApp" /></div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <div>
              <Lbl>Canal</Lbl>
              <select className="ap-inp" value={form.canal} onChange={(e) => s("canal", e.target.value)}>
                {Object.entries(CANAL_CFG).map(([k, v]) => <option key={k} value={k}>{v.icon} {v.label}</option>)}
              </select>
            </div>
            <div>
              <Lbl>Categoria</Lbl>
              <select className="ap-inp" value={form.categoria} onChange={(e) => s("categoria", e.target.value)}>
                {Object.entries(CATEG_CFG).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
              </select>
            </div>
          </div>
          {form.canal === "email" && (
            <div><Lbl>Assunto</Lbl><input className="ap-inp" value={form.assunto} onChange={(e) => s("assunto", e.target.value)} placeholder="Assunto do e-mail" /></div>
          )}
          <div>
            <Lbl>Corpo da Mensagem *</Lbl>
            <textarea className="ap-inp" rows={6} value={form.corpo} onChange={(e) => s("corpo", e.target.value)} placeholder={"Olá {{nome}}, tudo bem?\n\nSua compra {{pedido_id}} foi confirmada!"} style={{ resize: "vertical", fontFamily: "var(--mono)", fontSize: 13, lineHeight: 1.6 }} />
          </div>
          <div>
            <Lbl>Variáveis</Lbl>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 8 }}>
              {form.variaveis.map((v) => (
                <span key={v} style={{ fontSize: 11, fontWeight: 600, background: "#eeeeff", color: "#4545F5", padding: "4px 10px", borderRadius: 20, display: "flex", alignItems: "center", gap: 6, fontFamily: "var(--mono)" }}>
                  {"{{" + v + "}}"}<span style={{ cursor: "pointer", opacity: 0.6 }} onClick={() => removeVar(v)}>✕</span>
                </span>
              ))}
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              <input className="ap-inp" value={varInput} onChange={(e) => setVarInput(e.target.value)} placeholder="nome_da_variavel" onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addVar())} style={{ flex: 1 }} />
              <button className="ap-btn ap-btn-secondary ap-btn-sm" onClick={addVar}>+ Adicionar</button>
            </div>
          </div>
          <button className="ap-btn ap-btn-primary" disabled={!form.nome || !form.corpo || saving} onClick={handleSave}>{saving ? "Salvando..." : isEdit ? "Salvar Alterações" : "Criar Template →"}</button>
        </div>
      </Modal>
    );
  }

  /* ── Delete confirmation modal ── */
  function DeleteTplModal({ tpl, onClose }) {
    const [deleting, setDeleting] = useState(false);
    return (
      <Modal title="Excluir Template" subtitle={tpl.nome} onClose={onClose} width={420}>
        <div style={{ fontSize: 14, color: T.sub, marginBottom: 20, lineHeight: 1.6 }}>
          Tem certeza que deseja excluir o template <b>"{tpl.nome}"</b>? Esta ação não pode ser desfeita.
        </div>
        <div style={{ display: "flex", gap: 10 }}>
          <button className="ap-btn ap-btn-secondary" style={{ flex: 1 }} onClick={onClose}>Cancelar</button>
          <button className="ap-btn ap-btn-danger" style={{ flex: 1 }} disabled={deleting} onClick={async () => {
            setDeleting(true);
            try {
              await deleteTemplate(tpl.id);
              const refreshed = await fetchTemplates(tplFilter.canal || undefined, tplFilter.categoria || undefined);
              setTemplates(refreshed.data || []);
              onClose();
            } catch (e) { console.error(e); }
            setDeleting(false);
          }}>{deleting ? "Excluindo..." : "Excluir Template"}</button>
        </div>
      </Modal>
    );
  }

  /* ── Template preview modal ── */
  function PreviewTplModal({ tpl, onClose }) {
    const highlighted = (tpl.corpo || "").replace(/\{\{(\w+)\}\}/g, '<span style="color:#a8ff78;font-weight:700">{{$1}}</span>');
    return (
      <Modal title="Preview do Template" subtitle={tpl.nome} onClose={onClose} width={520}>
        <div style={{ display: "flex", gap: 8, marginBottom: 16, flexWrap: "wrap" }}>
          {CANAL_CFG[tpl.canal] && <Chip label={CANAL_CFG[tpl.canal].label} c={CANAL_CFG[tpl.canal].c} bg={CANAL_CFG[tpl.canal].bg} />}
          {CATEG_CFG[tpl.categoria] && <Chip label={CATEG_CFG[tpl.categoria].label} c={CATEG_CFG[tpl.categoria].c} bg={`${CATEG_CFG[tpl.categoria].c}18`} />}
          {tpl.uso_count > 0 && <span style={{ fontSize: 11, color: T.muted }}>Usado {tpl.uso_count}x</span>}
        </div>
        {tpl.canal === "email" && tpl.assunto && (
          <div style={{ fontSize: 13, fontWeight: 600, color: T.sub, marginBottom: 12, padding: "8px 12px", background: "rgba(0,0,0,0.03)", borderRadius: 8 }}>
            Assunto: {tpl.assunto}
          </div>
        )}
        <pre style={{ fontFamily: "var(--mono)", fontSize: 13, background: "#1d1d1f", color: "#e0e0e0", borderRadius: 12, padding: "18px 22px", overflow: "auto", lineHeight: 1.7, whiteSpace: "pre-wrap", wordBreak: "break-word" }} dangerouslySetInnerHTML={{ __html: highlighted }} />
        {tpl.variaveis && tpl.variaveis.length > 0 && (
          <div style={{ marginTop: 14 }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: T.sub, marginBottom: 8 }}>Variáveis</div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
              {tpl.variaveis.map((v) => (
                <span key={v} style={{ fontSize: 11, fontWeight: 600, background: "#eeeeff", color: "#4545F5", padding: "4px 10px", borderRadius: 20, fontFamily: "var(--mono)" }}>{"{{" + v + "}}"}</span>
              ))}
            </div>
          </div>
        )}
      </Modal>
    );
  }

  /* ── API Keys state ── */
  const [apiKeys, setApiKeys] = useState([]);
  const [loadingKeys, setLoadingKeys] = useState(false);
  const [showKeyModal, setShowKeyModal] = useState(false);
  const [newKeyResult, setNewKeyResult] = useState(null);
  const [revokingKey, setRevokingKey] = useState(null);
  const [keyCopied, setKeyCopied] = useState(false);

  /* ── Webhooks management state ── */
  const [whooks, setWhooks] = useState([]);
  const [loadingWh, setLoadingWh] = useState(false);
  const [showWhModal, setShowWhModal] = useState(false);
  const [editWh, setEditWh] = useState(null);
  const [deletingWh, setDeletingWh] = useState(null);
  const [testingWh, setTestingWh] = useState(null);
  const [whTestResult, setWhTestResult] = useState({});

  const WEBHOOK_EVENTS = [
    { key: "cliente.criado", label: "Cliente Criado", icon: "👤" },
    { key: "cliente.atualizado", label: "Cliente Atualizado", icon: "✏️" },
    { key: "pedido.criado", label: "Pedido Criado", icon: "🛍" },
    { key: "pedido.atualizado", label: "Pedido Atualizado", icon: "📦" },
    { key: "mensagem.recebida", label: "Mensagem Recebida", icon: "💬" },
  ];

  /* ── Load API Keys ── */
  useEffect(() => {
    if (tab === "apikeys") {
      setLoadingKeys(true);
      fetchApiKeys().then(r => setApiKeys(r.data || [])).catch(() => {}).finally(() => setLoadingKeys(false));
    }
  }, [tab]);

  /* ── Load Webhooks management ── */
  useEffect(() => {
    if (tab === "webhooks-mgmt") {
      setLoadingWh(true);
      fetchWebhooks().then(r => setWhooks(r.data || [])).catch(() => {}).finally(() => setLoadingWh(false));
    }
  }, [tab]);

  const handleRevokeKey = async (id) => {
    try {
      await deleteApiKey(id);
      setApiKeys(prev => prev.map(k => k.id === id ? { ...k, ativo: false } : k));
      setRevokingKey(null);
    } catch (e) { console.error(e); }
  };

  const handleTestWh = async (id) => {
    setTestingWh(id);
    setWhTestResult(prev => ({ ...prev, [id]: null }));
    try {
      const r = await testWebhook(id);
      setWhTestResult(prev => ({ ...prev, [id]: r }));
      // Refresh list to update ultimo_status
      fetchWebhooks().then(r => setWhooks(r.data || [])).catch(() => {});
    } catch (e) {
      setWhTestResult(prev => ({ ...prev, [id]: { ok: false, status: 0, error: e.message } }));
    }
    setTestingWh(null);
  };

  const handleToggleWh = async (wh) => {
    try {
      await updateWebhook(wh.id, { ativo: !wh.ativo });
      setWhooks(prev => prev.map(w => w.id === wh.id ? { ...w, ativo: !w.ativo } : w));
    } catch (e) { console.error(e); }
  };

  const handleDeleteWh = async (id) => {
    try {
      await deleteWebhook(id);
      setWhooks(prev => prev.filter(w => w.id !== id));
      setDeletingWh(null);
    } catch (e) { console.error(e); }
  };

  /* ── API Key Create Modal ── */
  function ApiKeyModal({ onClose }) {
    const [form, setForm] = useState({ nome: "", permissions: ["read"] });
    const [saving, setSaving] = useState(false);
    const togglePerm = (p) => setForm(f => ({ ...f, permissions: f.permissions.includes(p) ? f.permissions.filter(x => x !== p) : [...f.permissions, p] }));
    const handleCreate = async () => {
      if (!form.nome.trim()) return;
      setSaving(true);
      try {
        const r = await createApiKey(form);
        setNewKeyResult(r.key);
        setApiKeys(prev => [r.data, ...prev]);
        onClose();
      } catch (e) { console.error(e); }
      setSaving(false);
    };
    return (
      <Modal title="Nova API Key" subtitle="Gere uma chave de acesso à API" onClose={onClose} width={440}>
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <div><Lbl>Nome *</Lbl><input className="ap-inp" value={form.nome} onChange={e => setForm(f => ({ ...f, nome: e.target.value }))} placeholder="Ex: Integração ERP" /></div>
          <div>
            <Lbl>Permissões</Lbl>
            <div style={{ display: "flex", gap: 10 }}>
              {["read", "write", "admin"].map(p => (
                <label key={p} style={{ display: "flex", alignItems: "center", gap: 6, cursor: "pointer", fontSize: 13, padding: "8px 14px", borderRadius: 10, border: `1.5px solid ${form.permissions.includes(p) ? "#4545F5" : "rgba(0,0,0,0.1)"}`, background: form.permissions.includes(p) ? "#eeeeff" : "transparent", transition: "all .15s" }}>
                  <input type="checkbox" checked={form.permissions.includes(p)} onChange={() => togglePerm(p)} style={{ display: "none" }} />
                  <span style={{ fontWeight: 600, color: form.permissions.includes(p) ? "#4545F5" : "#86868b" }}>{p}</span>
                </label>
              ))}
            </div>
          </div>
          <button className="ap-btn ap-btn-primary" disabled={saving || !form.nome.trim()} onClick={handleCreate}>{saving ? "Gerando..." : "Gerar API Key"}</button>
        </div>
      </Modal>
    );
  }

  /* ── Webhook Create/Edit Modal ── */
  function WebhookModal({ wh, onClose }) {
    const isEdit = !!wh;
    const [form, setForm] = useState({
      nome: wh?.nome || "", url: wh?.url || "", eventos: wh?.eventos || [], secret: wh?.secret || "",
    });
    const [saving, setSaving] = useState(false);
    const s = (k, v) => setForm(f => ({ ...f, [k]: v }));
    const toggleEvento = (ev) => setForm(f => ({ ...f, eventos: f.eventos.includes(ev) ? f.eventos.filter(x => x !== ev) : [...f.eventos, ev] }));
    const handleSave = async () => {
      if (!form.nome.trim() || !form.url.trim()) return;
      setSaving(true);
      try {
        if (isEdit) {
          const r = await updateWebhook(wh.id, form);
          setWhooks(prev => prev.map(w => w.id === wh.id ? r.data : w));
        } else {
          const r = await createWebhook(form);
          setWhooks(prev => [r.data, ...prev]);
        }
        onClose();
      } catch (e) { console.error(e); }
      setSaving(false);
    };
    return (
      <Modal title={isEdit ? "Editar Webhook" : "Novo Webhook"} subtitle={isEdit ? wh.nome : "Configure um endpoint de webhook"} onClose={onClose} width={500}>
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <div><Lbl>Nome *</Lbl><input className="ap-inp" value={form.nome} onChange={e => s("nome", e.target.value)} placeholder="Ex: Notificação ERP" /></div>
          <div><Lbl>URL *</Lbl><input className="ap-inp" value={form.url} onChange={e => s("url", e.target.value)} placeholder="https://exemplo.com/webhook" /></div>
          <div>
            <Lbl>Eventos</Lbl>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
              {WEBHOOK_EVENTS.map(ev => (
                <label key={ev.key} style={{ display: "flex", alignItems: "center", gap: 6, cursor: "pointer", fontSize: 12, padding: "7px 12px", borderRadius: 10, border: `1.5px solid ${form.eventos.includes(ev.key) ? "#4545F5" : "rgba(0,0,0,0.1)"}`, background: form.eventos.includes(ev.key) ? "#eeeeff" : "transparent", transition: "all .15s" }}>
                  <input type="checkbox" checked={form.eventos.includes(ev.key)} onChange={() => toggleEvento(ev.key)} style={{ display: "none" }} />
                  <span>{ev.icon}</span>
                  <span style={{ fontWeight: 600, color: form.eventos.includes(ev.key) ? "#4545F5" : "#86868b" }}>{ev.label}</span>
                </label>
              ))}
            </div>
          </div>
          <div><Lbl>Secret (opcional)</Lbl><input className="ap-inp" value={form.secret} onChange={e => s("secret", e.target.value)} placeholder="Chave secreta para validação" style={{ fontFamily: "var(--mono)", fontSize: 12 }} /></div>
          <button className="ap-btn ap-btn-primary" disabled={saving || !form.nome.trim() || !form.url.trim()} onClick={handleSave}>{saving ? "Salvando..." : isEdit ? "Salvar Alterações" : "Criar Webhook"}</button>
        </div>
      </Modal>
    );
  }

  const connAtivos = conexoes.filter((c) => c.status === "conectado" || c.status === "ativo").length;
  const connErros = conexoes.filter((c) => c.status === "erro").length;

  return (
    <div className="fade-up">
      <SectionHeader tag="Dados & Automação" title="Integrações & Templates" />
      <div className="kpi-grid-4" style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 14, marginBottom: 24 }}>
        <KpiCard label="Conexões Ativas" value={connAtivos} color="#28cd41" icon="🔗" />
        <KpiCard label="Templates" value={templates.length} color="#4545F5" icon="📝" />
        <KpiCard label="API Keys" value={apiKeys.filter(k => k.ativo).length} color="#8e44ef" icon="🔑" />
        <KpiCard label="Webhooks" value={whooks.filter(w => w.ativo).length} color="#ff9500" icon="🔔" />
      </div>

      <div className="seg" style={{ marginBottom: 24 }}>
        {[{ k: "conexoes", l: "Conexões" }, { k: "templates", l: "Templates" }, { k: "apikeys", l: "API Keys" }, { k: "webhooks-mgmt", l: "Webhooks" }, { k: "webhooks", l: "URLs" }, { k: "docs", l: "Docs" }].map((t) => (
          <button key={t.k} className={`seg-btn ${tab === t.k ? "on" : ""}`} onClick={() => setTab(t.k)}>{t.l}</button>
        ))}
      </div>

      {/* ── TAB: CONEXÕES ── */}
      {tab === "conexoes" && (
        <div>
          {loadingConn ? (
            <div style={{ textAlign: "center", padding: 40, color: T.muted }}>Carregando integrações...</div>
          ) : conexoes.length === 0 ? (
            <div className="ap-card" style={{ padding: 40, textAlign: "center" }}>
              <div style={{ fontSize: 36, marginBottom: 12 }}>🔗</div>
              <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 6 }}>Nenhuma integração configurada</div>
              <div style={{ fontSize: 13, color: T.muted }}>As integrações aparecerão aqui quando forem configuradas no sistema.</div>
            </div>
          ) : (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 14 }}>
              {conexoes.map((c) => {
                const st = ST_CONN[c.status] || ST_CONN.desconectado;
                const tr = testResult[c.id];
                const isShopify = c.tipo === "shopify";
                return (
                  <div key={c.id} className="ap-card" style={{ padding: 22, border: `1.5px solid ${st.c}22` }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 14 }}>
                      <div style={{ width: 44, height: 44, borderRadius: 12, background: `${st.c}12`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22 }}>{getIcon(c.tipo)}</div>
                      <Chip label={st.label} c={st.c} bg={st.bg} />
                    </div>
                    <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 4 }}>{c.nome}</div>
                    <div style={{ fontSize: 12, color: T.muted, marginBottom: 6 }}>{c.tipo}</div>
                    {isShopify && c.config?.store && (
                      <div style={{ fontSize: 11, color: T.sub, marginBottom: 8 }}>🏪 {c.config.store}</div>
                    )}
                    {(c.status === "conectado" || c.status === "ativo") && c.ultimo_sync && (
                      <div style={{ fontSize: 11, color: T.sub, background: "rgba(0,0,0,0.03)", borderRadius: 8, padding: "6px 10px", marginBottom: 12 }}>Último sync: {new Date(c.ultimo_sync).toLocaleString("pt-BR")}</div>
                    )}
                    {c.status === "erro" && <div style={{ fontSize: 11, color: "#ff3b30", background: "#ffe5e3", borderRadius: 8, padding: "6px 10px", marginBottom: 12 }}>⚠️ Falha na conexão</div>}
                    {tr && (
                      <div style={{ fontSize: 11, color: tr.ok ? "#28cd41" : "#ff3b30", background: tr.ok ? "#e9fbed" : "#ffe5e3", borderRadius: 8, padding: "6px 10px", marginBottom: 12 }}>
                        {tr.ok ? `✓ OK${tr.shop ? ` — ${tr.shop}` : ""}` : `✗ ${tr.error || "Falha"}`}
                      </div>
                    )}
                    {/* Sync result inline */}
                    {isShopify && syncResult && !syncing && (
                      <div style={{ fontSize: 11, background: syncResult.status === "success" ? "#e9fbed" : syncResult.status === "partial" ? "#fff3e0" : "#ffe5e3", color: syncResult.status === "success" ? "#1a7f2b" : syncResult.status === "partial" ? "#b45309" : "#cc2936", borderRadius: 8, padding: "8px 10px", marginBottom: 12, lineHeight: 1.5 }}>
                        {syncResult.status === "success" && "✓ "}
                        {syncResult.status === "partial" && "⚠ "}
                        {syncResult.status === "error" && "✗ "}
                        {(syncResult.clientes_novos > 0 || syncResult.clientes_atualizados > 0) && `${syncResult.clientes_novos || 0} novos clientes, ${syncResult.clientes_atualizados || 0} atualizados · `}
                        {(syncResult.pedidos_novos > 0 || syncResult.pedidos_atualizados > 0) && `${syncResult.pedidos_novos || 0} novos pedidos, ${syncResult.pedidos_atualizados || 0} atualizados`}
                        {syncResult.erros > 0 && <span style={{ color: "#ff3b30" }}> · {syncResult.erros} erro(s)</span>}
                        {syncResult.duracao_ms && <span style={{ opacity: 0.7 }}> · {(syncResult.duracao_ms / 1000).toFixed(1)}s</span>}
                      </div>
                    )}
                    <div style={{ display: "flex", gap: 8 }}>
                      {isShopify && (
                        <button
                          className="ap-btn ap-btn-sm"
                          style={{ flex: 1, background: syncing ? "#b8d98a" : "#96bf48", color: "#fff", border: "none", position: "relative", overflow: "hidden" }}
                          disabled={syncing}
                          onClick={handleShopifySync}
                        >
                          {syncing ? (
                            <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
                              <span style={{ display: "inline-block", width: 6, height: 6, borderRadius: "50%", background: "#fff", animation: "syncPulse 1s ease-in-out infinite" }} />
                              <span style={{ display: "inline-block", width: 6, height: 6, borderRadius: "50%", background: "#fff", animation: "syncPulse 1s ease-in-out 0.2s infinite" }} />
                              <span style={{ display: "inline-block", width: 6, height: 6, borderRadius: "50%", background: "#fff", animation: "syncPulse 1s ease-in-out 0.4s infinite" }} />
                              {" "}Sincronizando...
                            </span>
                          ) : "🔄 Sincronizar Agora"}
                        </button>
                      )}
                      <button className="ap-btn ap-btn-secondary ap-btn-sm" style={{ flex: isShopify ? 0 : 1 }} disabled={testingId === c.id} onClick={() => handleTest(c.id)}>{testingId === c.id ? "Testando..." : "Testar"}</button>
                      <button className={`ap-btn ap-btn-sm ${c.status === "conectado" || c.status === "ativo" ? "ap-btn-secondary" : "ap-btn-primary"}`} style={{ flex: isShopify ? 0 : 1 }} onClick={() => setDetailConn(c)}>Configurar</button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* ── Sync History ── */}
          <div style={{ marginTop: 28 }}>
            <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 14, display: "flex", alignItems: "center", gap: 8 }}>
              📋 Histórico de Sincronizações
            </div>
            {loadingLogs ? (
              <div style={{ textAlign: "center", padding: 30, color: T.muted }}>Carregando histórico...</div>
            ) : syncLogs.length === 0 ? (
              <div className="ap-card" style={{ padding: 30, textAlign: "center" }}>
                <div style={{ fontSize: 13, color: T.muted }}>Nenhuma sincronização registrada</div>
              </div>
            ) : (
              <div className="ap-card" style={{ padding: 0, overflow: "hidden" }}>
                <table style={{ width: "100%", borderCollapse: "collapse" }}>
                  <thead><tr style={{ borderBottom: "1px solid rgba(0,0,0,0.07)", background: "rgba(0,0,0,0.02)" }}>
                    {["Data", "Tipo", "Status", "Duração", "Clientes", "Pedidos", "Erros", ""].map(h => <th key={h} className="ap-th" style={{ fontSize: 11, padding: "10px 12px" }}>{h}</th>)}
                  </tr></thead>
                  <tbody>
                    {syncLogs.slice(0, 10).map((log) => {
                      const stMap = { success: { label: "Sucesso", c: "#28cd41", bg: "#e9fbed" }, error: { label: "Erro", c: "#ff3b30", bg: "#ffe5e3" }, partial: { label: "Parcial", c: "#ff9500", bg: "#fff3e0" }, running: { label: "Em andamento", c: "#007aff", bg: "#e3f0ff" } };
                      const ls = stMap[log.status] || stMap.running;
                      const isExpanded = expandedLog === log.id;
                      return (
                        <React.Fragment key={log.id}>
                          <tr className="ap-tr" style={{ cursor: "pointer" }} onClick={() => setExpandedLog(isExpanded ? null : log.id)}>
                            <td className="ap-td" style={{ fontSize: 12, whiteSpace: "nowrap" }}>{new Date(log.created_at).toLocaleString("pt-BR")}</td>
                            <td className="ap-td"><span style={{ fontSize: 12, fontWeight: 600, textTransform: "capitalize" }}>{log.tipo === "shopify" ? "🛍 Shopify" : log.tipo}</span></td>
                            <td className="ap-td">
                              <span style={{ fontSize: 11, fontWeight: 700, padding: "3px 10px", borderRadius: 20, color: ls.c, background: ls.bg, display: "inline-flex", alignItems: "center", gap: 4 }}>
                                {log.status === "running" && <span style={{ display: "inline-block", width: 6, height: 6, borderRadius: "50%", background: ls.c, animation: "syncPulse 1s ease-in-out infinite" }} />}
                                {ls.label}
                              </span>
                            </td>
                            <td className="ap-td" style={{ fontSize: 12, color: T.muted }}>{log.duracao_ms ? `${(log.duracao_ms / 1000).toFixed(1)}s` : "—"}</td>
                            <td className="ap-td" style={{ fontSize: 12 }}>
                              {(log.clientes_novos > 0 || log.clientes_atualizados > 0) ? (
                                <span><span style={{ color: "#28cd41", fontWeight: 600 }}>+{log.clientes_novos}</span> <span style={{ color: T.muted }}>/ {log.clientes_atualizados} att</span></span>
                              ) : <span style={{ color: T.muted }}>—</span>}
                            </td>
                            <td className="ap-td" style={{ fontSize: 12 }}>
                              {(log.pedidos_novos > 0 || log.pedidos_atualizados > 0) ? (
                                <span><span style={{ color: "#007aff", fontWeight: 600 }}>+{log.pedidos_novos}</span> <span style={{ color: T.muted }}>/ {log.pedidos_atualizados} att</span></span>
                              ) : <span style={{ color: T.muted }}>—</span>}
                            </td>
                            <td className="ap-td" style={{ fontSize: 12 }}>
                              {log.erros > 0 ? <span style={{ color: "#ff3b30", fontWeight: 700 }}>{log.erros}</span> : <span style={{ color: T.muted }}>0</span>}
                            </td>
                            <td className="ap-td" style={{ fontSize: 12, color: T.muted }}>{isExpanded ? "▲" : "▼"}</td>
                          </tr>
                          {isExpanded && (
                            <tr><td colSpan={8} style={{ padding: "0 12px 14px 12px", background: "rgba(0,0,0,0.015)" }}>
                              <div style={{ padding: "12px 14px", background: "rgba(0,0,0,0.03)", borderRadius: 10, fontSize: 12, lineHeight: 1.7 }}>
                                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10, marginBottom: 10 }}>
                                  <div><span style={{ color: T.muted }}>Clientes novos:</span> <b>{log.clientes_novos}</b></div>
                                  <div><span style={{ color: T.muted }}>Clientes atualizados:</span> <b>{log.clientes_atualizados}</b></div>
                                  <div><span style={{ color: T.muted }}>Pedidos novos:</span> <b>{log.pedidos_novos}</b></div>
                                  <div><span style={{ color: T.muted }}>Pedidos atualizados:</span> <b>{log.pedidos_atualizados}</b></div>
                                  <div><span style={{ color: T.muted }}>Erros:</span> <b style={{ color: log.erros > 0 ? "#ff3b30" : "inherit" }}>{log.erros}</b></div>
                                  <div><span style={{ color: T.muted }}>Duração:</span> <b>{log.duracao_ms ? `${(log.duracao_ms / 1000).toFixed(1)}s` : "—"}</b></div>
                                </div>
                                {log.detalhes?.errors && log.detalhes.errors.length > 0 && (
                                  <div style={{ marginTop: 8 }}>
                                    <div style={{ fontWeight: 700, color: "#ff3b30", marginBottom: 6 }}>Detalhes dos erros:</div>
                                    {log.detalhes.errors.map((e, i) => (
                                      <div key={i} style={{ fontSize: 11, color: "#cc2936", fontFamily: "var(--mono)", padding: "4px 0" }}>• [{e.type}] {e.error}</div>
                                    ))}
                                  </div>
                                )}
                              </div>
                            </td></tr>
                          )}
                        </React.Fragment>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── TAB: TEMPLATES ── */}
      {tab === "templates" && (
        <div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
            <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
              <select className="ap-inp" style={{ width: 150, fontSize: 13 }} value={tplFilter.canal} onChange={(e) => setTplFilter((f) => ({ ...f, canal: e.target.value }))}>
                <option value="">Todos canais</option>
                {Object.entries(CANAL_CFG).map(([k, v]) => <option key={k} value={k}>{v.icon} {v.label}</option>)}
              </select>
              <select className="ap-inp" style={{ width: 160, fontSize: 13 }} value={tplFilter.categoria} onChange={(e) => setTplFilter((f) => ({ ...f, categoria: e.target.value }))}>
                <option value="">Todas categorias</option>
                {Object.entries(CATEG_CFG).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
              </select>
            </div>
            <button className="ap-btn ap-btn-primary" onClick={() => { setEditTpl(null); setShowTplModal(true); }}>+ Novo Template</button>
          </div>
          {loadingTpl ? (
            <div style={{ textAlign: "center", padding: 40, color: T.muted }}>Carregando templates...</div>
          ) : templates.length === 0 ? (
            <div className="ap-card" style={{ padding: 40, textAlign: "center" }}>
              <div style={{ fontSize: 36, marginBottom: 12 }}>📝</div>
              <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 6 }}>Nenhum template encontrado</div>
              <div style={{ fontSize: 13, color: T.muted }}>Crie seu primeiro template de mensagem clicando em "+ Novo Template".</div>
            </div>
          ) : (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(2,1fr)", gap: 14 }}>
              {templates.map((tpl) => {
                const canal = CANAL_CFG[tpl.canal];
                const categ = CATEG_CFG[tpl.categoria];
                const preview = (tpl.corpo || "").slice(0, 120) + ((tpl.corpo || "").length > 120 ? "..." : "");
                return (
                  <div key={tpl.id} className="ap-card" style={{ padding: 20 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12 }}>
                      <div style={{ fontSize: 15, fontWeight: 700, flex: 1 }}>{tpl.nome}</div>
                      <div style={{ display: "flex", gap: 6, flexShrink: 0 }}>
                        {canal && <Chip label={`${canal.icon} ${canal.label}`} c={canal.c} bg={canal.bg} />}
                        {categ && <Chip label={categ.label} c={categ.c} bg={`${categ.c}18`} />}
                      </div>
                    </div>
                    <div style={{ fontSize: 12, color: T.sub, fontFamily: "var(--mono)", background: "rgba(0,0,0,0.03)", borderRadius: 8, padding: "10px 12px", marginBottom: 12, lineHeight: 1.5, whiteSpace: "pre-wrap" }}>{preview}</div>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <span style={{ fontSize: 11, color: T.muted }}>Usado {tpl.uso_count || 0}x</span>
                      <div style={{ display: "flex", gap: 6 }}>
                        <button className="ap-btn ap-btn-secondary ap-btn-sm" onClick={() => setPreviewTpl(tpl)}>👁 Preview</button>
                        <button className="ap-btn ap-btn-secondary ap-btn-sm" onClick={() => { setEditTpl(tpl); setShowTplModal(true); }}>Editar</button>
                        <button className="ap-btn ap-btn-danger ap-btn-sm" onClick={() => setDeletingTpl(tpl)}>Excluir</button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ── TAB: API KEYS ── */}
      {tab === "apikeys" && (
        <div>
          {/* New key result banner */}
          {newKeyResult && (
            <div style={{ background: "#fffbe6", border: "1.5px solid #ff950040", borderRadius: 14, padding: "18px 22px", marginBottom: 20 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 10 }}>
                <div style={{ fontSize: 14, fontWeight: 700, color: "#b45309" }}>🔑 Chave Gerada com Sucesso</div>
                <button className="ap-btn ap-btn-secondary ap-btn-sm" onClick={() => setNewKeyResult(null)}>✕ Fechar</button>
              </div>
              <div style={{ background: "#1d1d1f", borderRadius: 10, padding: "14px 18px", display: "flex", alignItems: "center", gap: 12, marginBottom: 10 }}>
                <code style={{ fontFamily: "var(--mono)", fontSize: 14, color: "#79c0ff", flex: 1, wordBreak: "break-all" }}>{newKeyResult}</code>
                <button className="ap-btn ap-btn-primary ap-btn-sm" onClick={() => { navigator.clipboard.writeText(newKeyResult); setKeyCopied(true); setTimeout(() => setKeyCopied(false), 2000); }}>{keyCopied ? "✓ Copiado!" : "Copiar"}</button>
              </div>
              <div style={{ fontSize: 12, color: "#b45309", fontWeight: 600 }}>⚠️ Salve esta chave — ela não será exibida novamente.</div>
            </div>
          )}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
            <div style={{ fontSize: 13, color: T.muted }}>{apiKeys.filter(k => k.ativo).length} chave(s) ativa(s)</div>
            <button className="ap-btn ap-btn-primary" onClick={() => setShowKeyModal(true)}>+ Nova API Key</button>
          </div>
          {loadingKeys ? (
            <div style={{ textAlign: "center", padding: 40, color: T.muted }}>Carregando chaves...</div>
          ) : apiKeys.length === 0 ? (
            <div className="ap-card" style={{ padding: 40, textAlign: "center" }}>
              <div style={{ fontSize: 36, marginBottom: 12 }}>🔑</div>
              <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 6 }}>Nenhuma API Key criada</div>
              <div style={{ fontSize: 13, color: T.muted }}>Crie sua primeira chave para acessar a API programaticamente.</div>
            </div>
          ) : (
            <div className="ap-card" style={{ padding: 0, overflow: "hidden" }}>
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead><tr style={{ borderBottom: "1px solid rgba(0,0,0,0.07)", background: "rgba(0,0,0,0.02)" }}>
                  {["Nome", "Chave", "Permissões", "Status", "Último Uso", "Criada em", ""].map(h => <th key={h} className="ap-th">{h}</th>)}
                </tr></thead>
                <tbody>
                  {apiKeys.map(k => (
                    <tr key={k.id} className="ap-tr" style={{ opacity: k.ativo ? 1 : 0.5 }}>
                      <td className="ap-td"><span style={{ fontSize: 13, fontWeight: 600 }}>{k.nome}</span></td>
                      <td className="ap-td"><code style={{ fontFamily: "var(--mono)", fontSize: 12, background: "rgba(0,0,0,0.04)", padding: "3px 8px", borderRadius: 6 }}>{k.key_prefix}...</code></td>
                      <td className="ap-td"><div style={{ display: "flex", gap: 4 }}>{(k.permissions || []).map(p => <Chip key={p} label={p} c={p === "admin" ? "#ff3b30" : p === "write" ? "#ff9500" : "#28cd41"} bg={p === "admin" ? "#ffe5e3" : p === "write" ? "#fff3e0" : "#e9fbed"} />)}</div></td>
                      <td className="ap-td"><Chip label={k.ativo ? "Ativa" : "Revogada"} c={k.ativo ? "#28cd41" : "#aeaeb2"} bg={k.ativo ? "#e9fbed" : "#f5f5f7"} /></td>
                      <td className="ap-td"><span style={{ fontSize: 12, color: T.muted }}>{k.last_used ? new Date(k.last_used).toLocaleString("pt-BR") : "Nunca"}</span></td>
                      <td className="ap-td"><span style={{ fontSize: 12, color: T.muted }}>{new Date(k.created_at).toLocaleDateString("pt-BR")}</span></td>
                      <td className="ap-td">{k.ativo && <button className="ap-btn ap-btn-danger ap-btn-sm" onClick={() => setRevokingKey(k)}>Revogar</button>}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ── TAB: WEBHOOKS MANAGEMENT ── */}
      {tab === "webhooks-mgmt" && (
        <div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
            <div style={{ fontSize: 13, color: T.muted }}>{whooks.filter(w => w.ativo).length} webhook(s) ativo(s)</div>
            <button className="ap-btn ap-btn-primary" onClick={() => { setEditWh(null); setShowWhModal(true); }}>+ Novo Webhook</button>
          </div>
          {loadingWh ? (
            <div style={{ textAlign: "center", padding: 40, color: T.muted }}>Carregando webhooks...</div>
          ) : whooks.length === 0 ? (
            <div className="ap-card" style={{ padding: 40, textAlign: "center" }}>
              <div style={{ fontSize: 36, marginBottom: 12 }}>🔔</div>
              <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 6 }}>Nenhum webhook configurado</div>
              <div style={{ fontSize: 13, color: T.muted }}>Crie um webhook para receber notificações em tempo real.</div>
            </div>
          ) : (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(2,1fr)", gap: 14 }}>
              {whooks.map(wh => {
                const tr = whTestResult[wh.id];
                return (
                  <div key={wh.id} className="ap-card" style={{ padding: 22, border: `1.5px solid ${wh.ativo ? "rgba(0,0,0,0.06)" : "rgba(0,0,0,0.03)"}`, opacity: wh.ativo ? 1 : 0.6 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12 }}>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 4 }}>{wh.nome}</div>
                        <code style={{ fontSize: 11, fontFamily: "var(--mono)", color: T.muted, wordBreak: "break-all" }}>{(wh.url || "").length > 50 ? wh.url.slice(0, 50) + "..." : wh.url}</code>
                      </div>
                      <div style={{ display: "flex", gap: 6, alignItems: "center", flexShrink: 0 }}>
                        <Chip label={wh.ativo ? "Ativo" : "Inativo"} c={wh.ativo ? "#28cd41" : "#aeaeb2"} bg={wh.ativo ? "#e9fbed" : "#f5f5f7"} />
                        {wh.ultimo_status > 0 && <Chip label={`${wh.ultimo_status}`} c={wh.ultimo_status >= 200 && wh.ultimo_status < 300 ? "#28cd41" : "#ff3b30"} bg={wh.ultimo_status >= 200 && wh.ultimo_status < 300 ? "#e9fbed" : "#ffe5e3"} />}
                      </div>
                    </div>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 5, marginBottom: 12 }}>
                      {(wh.eventos || []).map(ev => {
                        const evCfg = WEBHOOK_EVENTS.find(e => e.key === ev);
                        return <span key={ev} style={{ fontSize: 11, padding: "3px 8px", borderRadius: 6, background: "#eeeeff", color: "#4545F5", fontWeight: 600 }}>{evCfg ? `${evCfg.icon} ${evCfg.label}` : ev}</span>;
                      })}
                      {(!wh.eventos || wh.eventos.length === 0) && <span style={{ fontSize: 11, color: T.muted }}>Nenhum evento selecionado</span>}
                    </div>
                    {wh.ultimo_envio && <div style={{ fontSize: 11, color: T.muted, marginBottom: 10 }}>Último envio: {new Date(wh.ultimo_envio).toLocaleString("pt-BR")}</div>}
                    {tr && (
                      <div style={{ fontSize: 12, padding: "8px 12px", borderRadius: 8, marginBottom: 10, background: tr.ok ? "#e9fbed" : "#ffe5e3", color: tr.ok ? "#28cd41" : "#ff3b30", fontWeight: 600 }}>
                        {tr.ok ? `✓ Teste OK — Status ${tr.status}` : `✗ Falha${tr.status ? ` — Status ${tr.status}` : ""}`}
                      </div>
                    )}
                    <div style={{ display: "flex", gap: 8 }}>
                      <button className="ap-btn ap-btn-secondary ap-btn-sm" disabled={testingWh === wh.id} onClick={() => handleTestWh(wh.id)}>{testingWh === wh.id ? "Testando..." : "🧪 Testar"}</button>
                      <button className="ap-btn ap-btn-secondary ap-btn-sm" onClick={() => handleToggleWh(wh)}>{wh.ativo ? "Desativar" : "Ativar"}</button>
                      <button className="ap-btn ap-btn-secondary ap-btn-sm" onClick={() => { setEditWh(wh); setShowWhModal(true); }}>Editar</button>
                      <button className="ap-btn ap-btn-danger ap-btn-sm" onClick={() => setDeletingWh(wh)}>Excluir</button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ── TAB: WEBHOOKS URLs ── */}
      {tab === "webhooks" && (
        <div>
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <div className="ap-card" style={{ padding: 22 }}>
              <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 14 }}>URLs de Webhook</div>
              <div style={{ fontSize: 13, color: T.sub, marginBottom: 16 }}>Configure esses URLs nos sistemas externos para receber dados no CRM.</div>

              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 14, padding: "14px 16px", background: "rgba(0,0,0,0.02)", borderRadius: 12, border: "1px solid rgba(0,0,0,0.06)" }}>
                  <div style={{ width: 36, height: 36, borderRadius: 9, background: "#e9fbed", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16 }}>🛍</div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 12, fontWeight: 700, color: T.muted, marginBottom: 3 }}>SHOPIFY WEBHOOK</div>
                    <code style={{ fontSize: 12, fontFamily: "var(--mono)", color: T.text }}>{API_URL}/api/webhook/shopify?marca_id={marcaId}</code>
                  </div>
                  <button className="ap-btn ap-btn-secondary ap-btn-sm" onClick={() => copyText(`${API_URL}/api/webhook/shopify?marca_id=${marcaId}`)}>{copied === `${API_URL}/api/webhook/shopify?marca_id=${marcaId}` ? "✓ Copiado" : "Copiar"}</button>
                </div>

                <div style={{ display: "flex", alignItems: "center", gap: 14, padding: "14px 16px", background: "rgba(0,0,0,0.02)", borderRadius: 12, border: "1px solid rgba(0,0,0,0.06)" }}>
                  <div style={{ width: 36, height: 36, borderRadius: 9, background: "#eeeeff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16 }}>🤖</div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 12, fontWeight: 700, color: T.muted, marginBottom: 3 }}>SURI WEBHOOK</div>
                    <code style={{ fontSize: 12, fontFamily: "var(--mono)", color: T.text }}>{API_URL}/api/suri/webhook</code>
                  </div>
                  <button className="ap-btn ap-btn-secondary ap-btn-sm" onClick={() => copyText(`${API_URL}/api/suri/webhook`)}>{copied === `${API_URL}/api/suri/webhook` ? "✓ Copiado" : "Copiar"}</button>
                </div>
              </div>
            </div>

            <div className="ap-card" style={{ padding: 22 }}>
              <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 12 }}>Configuração no Shopify</div>
              <div style={{ fontSize: 13, color: T.sub, lineHeight: 1.6, marginBottom: 16 }}>
                Acesse <b>Settings → Notifications → Webhooks</b> no painel do Shopify e adicione o URL acima para os eventos desejados (ex: Order creation, Customer creation).
              </div>
              <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 12 }}>Exemplo de payload</div>
              <pre style={{ fontFamily: "var(--mono)", fontSize: 12, background: "#1d1d1f", color: "#79c0ff", borderRadius: 12, padding: "16px 20px", overflow: "auto", lineHeight: 1.7 }}>{`{
  "evento": "venda.criada",
  "timestamp": "2026-03-02T14:32:00Z",
  "marca_id": "${marcaId || "m1"}",
  "data": {
    "venda_id": "vnd_9aKx3Rp",
    "cliente_id": "cli_7mBq1Wz",
    "valor": 349.90,
    "canal": "ecommerce"
  }
}`}</pre>
            </div>
          </div>
        </div>
      )}

      {/* ── TAB: DOCS ── */}
      {tab === "docs" && (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 2fr", gap: 16 }}>
          <div className="ap-card" style={{ padding: 20 }}>
            <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 14 }}>Endpoints</div>
            {[
              { method: "GET", path: "/v1/clientes", desc: "Listar clientes" },
              { method: "POST", path: "/v1/clientes", desc: "Criar cliente" },
              { method: "GET", path: "/v1/clientes/:id", desc: "Buscar cliente" },
              { method: "PUT", path: "/v1/clientes/:id", desc: "Atualizar cliente" },
              { method: "DELETE", path: "/v1/clientes/:id", desc: "Remover cliente" },
              { method: "GET", path: "/v1/vendas", desc: "Listar vendas" },
              { method: "POST", path: "/v1/vendas", desc: "Registrar venda" },
              { method: "GET", path: "/v1/campanhas", desc: "Listar campanhas" },
              { method: "POST", path: "/v1/campanhas/send", desc: "Disparar campanha" },
              { method: "GET", path: "/v1/relatorios/rfm", desc: "Segmentação RFM" },
            ].map((ep, i) => {
              const mc = { GET: "#28cd41", POST: "#4545F5", PUT: "#ff9500", DELETE: "#ff3b30" };
              return (
                <div key={i} style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 0", borderBottom: i < 9 ? "1px solid rgba(0,0,0,0.05)" : "none" }}>
                  <span style={{ fontFamily: "var(--mono)", fontSize: 10, fontWeight: 800, color: mc[ep.method], background: `${mc[ep.method]}14`, padding: "2px 7px", borderRadius: 6, minWidth: 52, textAlign: "center" }}>{ep.method}</span>
                  <div><code style={{ fontSize: 11, fontFamily: "var(--mono)", color: T.text }}>{ep.path}</code><div style={{ fontSize: 10, color: T.muted }}>{ep.desc}</div></div>
                </div>
              );
            })}
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <div className="ap-card" style={{ padding: 22 }}>
              <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 12 }}>GET /v1/clientes</div>
              <pre style={{ fontFamily: "var(--mono)", fontSize: 11, background: "#1d1d1f", color: "#79c0ff", borderRadius: 12, padding: "16px", overflow: "auto", lineHeight: 1.7 }}>{`{
  "data": [
    {
      "id": "cli_7mBq1Wz",
      "nome": "Marina Oliveira",
      "email": "marina@gmail.com",
      "segmento_rfm": "campiao",
      "receita_total": 12840.00,
      "ultimo_pedido": "2026-02-22",
      "recencia_dias": 8
    }
  ],
  "meta": { "total": 1247, "pagina": 1, "por_pagina": 50 }
}`}</pre>
            </div>
            <div className="ap-card" style={{ padding: 22 }}>
              <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 12 }}>Rate Limits</div>
              {[
                { plano: "Starter", req: "1.000 req/hora", c: "#28cd41" },
                { plano: "Pro", req: "10.000 req/hora", c: "#4545F5" },
                { plano: "Enterprise", req: "Ilimitado", c: "#8e44ef" },
              ].map((r, i) => (
                <div key={i} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 0", borderBottom: i < 2 ? "1px solid rgba(0,0,0,0.05)" : "none" }}>
                  <Chip label={r.plano} c={r.c} bg={`${r.c}12`} />
                  <span className="num" style={{ fontSize: 13, fontWeight: 700, color: r.c }}>{r.req}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {showTplModal && <TemplateModal tpl={editTpl} onClose={() => { setShowTplModal(false); setEditTpl(null); }} />}
      {deletingTpl && <DeleteTplModal tpl={deletingTpl} onClose={() => setDeletingTpl(null)} />}
      {previewTpl && <PreviewTplModal tpl={previewTpl} onClose={() => setPreviewTpl(null)} />}
      {detailConn && <ConexaoModal conn={detailConn} onClose={() => setDetailConn(null)} />}
      {showKeyModal && <ApiKeyModal onClose={() => setShowKeyModal(false)} />}
      {showWhModal && <WebhookModal wh={editWh} onClose={() => { setShowWhModal(false); setEditWh(null); }} />}
      {revokingKey && (
        <Modal title="Revogar API Key" subtitle={revokingKey.nome} onClose={() => setRevokingKey(null)} width={400}>
          <div style={{ fontSize: 13, color: T.sub, marginBottom: 16, lineHeight: 1.6 }}>Tem certeza que deseja revogar a chave <b>{revokingKey.key_prefix}...</b>? Sistemas que usam esta chave perderão acesso imediatamente.</div>
          <div style={{ display: "flex", gap: 10 }}>
            <button className="ap-btn ap-btn-secondary" style={{ flex: 1 }} onClick={() => setRevokingKey(null)}>Cancelar</button>
            <button className="ap-btn ap-btn-danger" style={{ flex: 1 }} onClick={() => handleRevokeKey(revokingKey.id)}>Revogar Chave</button>
          </div>
        </Modal>
      )}
      {deletingWh && (
        <Modal title="Excluir Webhook" subtitle={deletingWh.nome} onClose={() => setDeletingWh(null)} width={400}>
          <div style={{ fontSize: 13, color: T.sub, marginBottom: 16, lineHeight: 1.6 }}>Tem certeza que deseja excluir o webhook <b>{deletingWh.nome}</b>? Esta ação não pode ser desfeita.</div>
          <div style={{ display: "flex", gap: 10 }}>
            <button className="ap-btn ap-btn-secondary" style={{ flex: 1 }} onClick={() => setDeletingWh(null)}>Cancelar</button>
            <button className="ap-btn ap-btn-danger" style={{ flex: 1 }} onClick={() => handleDeleteWh(deletingWh.id)}>Excluir Webhook</button>
          </div>
        </Modal>
      )}
    </div>
  );
}



export default MarcaIntegracoes;
