import React, { useState, useEffect, useMemo } from "react";
import { T } from "../../lib/theme";
import { Avatar, Chip, Modal } from "../../components/UI";
import { fetchInbox, enviarMensagem, fetchTemplates } from "../../lib/api";
import { inboxTimeAgo } from "../../utils/helpers";
import useInboxAI from "../../hooks/useInboxAI";
import InboxAIPanel from "./InboxAIPanel";
import RespostasRapidas from "./RespostasRapidas";

const SENTIMENTO_INLINE = {
  positivo: { icon: "😊", c: "#28cd41" },
  neutro: { icon: "😐", c: "#6e6e73" },
  negativo: { icon: "😤", c: "#ff3b30" },
  urgente: { icon: "🚨", c: "#ff9500" },
};

function MarcaInbox({ user }) {
  const [conversas, setConversas] = useState([]);
  const [selected, setSelected] = useState(null);
  const [mensagens, setMensagens] = useState([]);
  const [loading, setLoading] = useState(true);
  const [threadLoading, setThreadLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [texto, setTexto] = useState("");
  const [sending, setSending] = useState(false);
  const [templates, setTemplates] = useState([]);
  const [showTemplates, setShowTemplates] = useState(false);
  const [showAIPanel, setShowAIPanel] = useState(true);
  const [showRespostas, setShowRespostas] = useState(false);

  const ai = useInboxAI();

  useEffect(() => {
    fetchInbox()
      .then((r) => {
        const apiConversas = r.conversas || [];
        if (apiConversas.length > 0) {
          setConversas(apiConversas);
        } else {
          setConversas([]);
        }
        setLoading(false);
      })
      .catch(() => {
        setConversas([]);
        setLoading(false);
      });
    fetchTemplates("whatsapp")
      .then((r) => setTemplates(r.data || []))
      .catch(() => {});
  }, []);

  const loadThread = (conv) => {
    setSelected(conv);
    if (conv.mensagens) {
      setMensagens(conv.mensagens);
      setThreadLoading(false);
    } else {
      setThreadLoading(true);
      fetchInbox(conv.id)
        .then((r) => setMensagens(r.mensagens || []))
        .catch(() => setMensagens([]))
        .finally(() => setThreadLoading(false));
    }
  };

  const handleSend = async () => {
    if (!texto.trim() || !selected) return;
    setSending(true);
    try {
      await enviarMensagem({ cliente_id: selected.id || selected.cliente_id, canal: "whatsapp", conteudo: texto.trim() });
      const newMsg = {
        id: `m_${Date.now()}`,
        direcao: "saida",
        conteudo: texto.trim(),
        created_at: new Date().toISOString(),
        status: "enviado",
      };
      setMensagens((prev) => [...prev, newMsg]);
      setTexto("");
    } catch {
      const newMsg = {
        id: `m_${Date.now()}`,
        direcao: "saida",
        conteudo: texto.trim(),
        created_at: new Date().toISOString(),
        status: "enviado",
      };
      setMensagens((prev) => [...prev, newMsg]);
      setTexto("");
    }
    setSending(false);
  };

  const applyTemplate = (tpl) => {
    setTexto(tpl.corpo || "");
    setShowTemplates(false);
  };

  const filtered = conversas.filter(
    (c) => !search || ((c.nome || c.cliente_nome || "").toLowerCase().includes(search.toLowerCase()))
  );

  const analysis = useMemo(() => {
    if (!selected) return null;
    const clienteName = selected.nome || selected.cliente_nome || "Cliente";
    return ai.analyze(mensagens, clienteName);
  }, [selected, mensagens, ai]);

  // SLA timer
  const slaText = useMemo(() => {
    if (!selected || !mensagens.length) return null;
    const lastIncoming = [...mensagens].filter((m) => m.direcao === "entrada").pop();
    if (!lastIncoming) return null;
    const lastOutgoing = [...mensagens].filter((m) => m.direcao === "saida").pop();
    if (lastOutgoing && lastOutgoing.created_at > lastIncoming.created_at) return null;
    const diff = Date.now() - new Date(lastIncoming.created_at).getTime();
    const hours = Math.floor(diff / 3600000);
    const mins = Math.floor((diff % 3600000) / 60000);
    if (hours > 0) return `⏱ Cliente aguardando há ${hours}h ${mins}min`;
    if (mins > 0) return `⏱ Cliente aguardando há ${mins}min`;
    return `⏱ Mensagem recente`;
  }, [selected, mensagens]);

  const statusChip = (s) => {
    const map = {
      enviado: { c: "#666", bg: "#eee" },
      entregue: { c: "#2563eb", bg: "#dbeafe" },
      lido: { c: "#16a34a", bg: "#dcfce7" },
      erro: { c: "#dc2626", bg: "#fee2e2" },
      rascunho: { c: "#a3a3a3", bg: "#f5f5f5" },
    };
    const cfg = map[s] || map.enviado;
    return <Chip label={s || "enviado"} c={cfg.c} bg={cfg.bg} />;
  };

  return (
    <div style={{ display: "flex", height: "calc(100vh - 64px)", margin: "-32px -36px", overflow: "hidden" }}>
      {/* Left panel — Conversas */}
      <div style={{ width: 320, minWidth: 320, background: "var(--card-bg, #fff)", borderRight: "1px solid rgba(0,0,0,0.08)", display: "flex", flexDirection: "column" }}>
        <div style={{ padding: "16px 14px 12px" }}>
          <div style={{ fontSize: 18, fontWeight: 700, marginBottom: 10 }}>💬 Inbox</div>
          <input className="ap-inp" placeholder="Buscar conversa…" value={search} onChange={(e) => setSearch(e.target.value)} style={{ width: "100%", fontSize: 13 }} />
        </div>
        <div style={{ flex: 1, overflow: "auto" }}>
          {loading ? (
            <div style={{ textAlign: "center", padding: 40, color: T.muted, fontSize: 13 }}>Carregando…</div>
          ) : filtered.length === 0 ? (
            <div style={{ textAlign: "center", padding: 40, color: T.muted, fontSize: 13 }}>
              {search ? "Nenhuma conversa encontrada" : "Nenhuma mensagem ainda."}
            </div>
          ) : (
            filtered.map((c) => {
              const convSentiment = ai.enabled && c.mensagens ? ai.classifyMessage(c.mensagens.filter((m) => m.direcao === "entrada").map((m) => m.conteudo).join(" ")).sentimento : null;
              return (
                <div
                  key={c.id}
                  onClick={() => loadThread(c)}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 10,
                    padding: "12px 14px",
                    cursor: "pointer",
                    background: selected?.id === c.id ? "rgba(69,69,245,0.08)" : "transparent",
                    borderBottom: "1px solid rgba(0,0,0,0.05)",
                    transition: "background 0.15s",
                  }}
                  onMouseEnter={(e) => { if (selected?.id !== c.id) e.currentTarget.style.background = "rgba(0,0,0,0.02)"; }}
                  onMouseLeave={(e) => { if (selected?.id !== c.id) e.currentTarget.style.background = "transparent"; }}
                >
                  <Avatar nome={c.nome || c.cliente_nome || "?"} size={38} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <span style={{ fontSize: 13, fontWeight: 600, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                        {c.nome || c.cliente_nome || "Sem nome"}
                      </span>
                      <span style={{ fontSize: 10, color: T.muted, flexShrink: 0, marginLeft: 6 }}>{inboxTimeAgo(c.ultima_msg)}</span>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 2 }}>
                      {convSentiment && SENTIMENTO_INLINE[convSentiment] && (
                        <span style={{ fontSize: 12 }}>{SENTIMENTO_INLINE[convSentiment].icon}</span>
                      )}
                      <span style={{ fontSize: 12, color: T.muted, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", flex: 1 }}>
                        {(c.ultimo_texto || "").slice(0, 50)}{(c.ultimo_texto || "").length > 50 ? "…" : ""}
                      </span>
                      {c.ultima_direcao === "entrada" && (
                        <span style={{ width: 8, height: 8, borderRadius: "50%", background: "#4545F5", flexShrink: 0 }} />
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Center panel — Thread */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", background: "var(--bg-secondary, #f5f5f7)" }}>
        {!selected ? (
          <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column", color: T.muted }}>
            <div style={{ fontSize: 40, marginBottom: 12 }}>💬</div>
            <div style={{ fontSize: 15, fontWeight: 500 }}>Selecione uma conversa</div>
          </div>
        ) : (
          <>
            {/* Thread header */}
            <div style={{ padding: "14px 20px", background: "var(--card-bg, #fff)", borderBottom: "1px solid rgba(0,0,0,0.08)", display: "flex", alignItems: "center", gap: 10 }}>
              <Avatar nome={selected.nome || selected.cliente_nome || "?"} size={34} />
              <div style={{ flex: 1 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span style={{ fontSize: 14, fontWeight: 700 }}>{selected.nome || selected.cliente_nome || "Sem nome"}</span>
                  {analysis && SENTIMENTO_INLINE[analysis.sentimento] && (
                    <span style={{
                      fontSize: 11,
                      fontWeight: 600,
                      color: SENTIMENTO_INLINE[analysis.sentimento].c,
                      display: "flex",
                      alignItems: "center",
                      gap: 3,
                    }}>
                      {SENTIMENTO_INLINE[analysis.sentimento].icon}
                      {analysis.sentimento}
                    </span>
                  )}
                </div>
                <div style={{ fontSize: 11, color: T.muted }}>
                  {selected.telefone || selected.email || ""}
                  {selected.segmento_rfm ? ` · ${selected.segmento_rfm}` : ""}
                </div>
              </div>
              {slaText && (
                <span style={{ fontSize: 11, fontWeight: 600, color: "#ff9500", background: "#fff3e0", padding: "4px 10px", borderRadius: 20 }}>
                  {slaText}
                </span>
              )}
              <button
                className="ap-btn ap-btn-sm"
                onClick={() => setShowAIPanel(!showAIPanel)}
                style={{ fontSize: 16, padding: "4px 8px", background: showAIPanel ? "#4545F5" : undefined, color: showAIPanel ? "#fff" : undefined }}
                title="Toggle IA"
              >
                🤖
              </button>
            </div>

            {/* Messages */}
            <div style={{ flex: 1, overflow: "auto", padding: "20px 20px 10px", display: "flex", flexDirection: "column", gap: 8 }}>
              {threadLoading ? (
                <div style={{ textAlign: "center", color: T.muted, padding: 40, fontSize: 13 }}>Carregando mensagens…</div>
              ) : mensagens.length === 0 ? (
                <div style={{ textAlign: "center", color: T.muted, padding: 40, fontSize: 13 }}>Nenhuma mensagem nesta conversa</div>
              ) : (
                mensagens.map((m) => {
                  const isEntrada = m.direcao === "entrada";
                  const msgClassification = isEntrada && ai.enabled ? ai.classifyMessage(m.conteudo) : null;
                  return (
                    <div key={m.id} style={{ display: "flex", justifyContent: isEntrada ? "flex-start" : "flex-end" }}>
                      <div
                        style={{
                          maxWidth: "65%",
                          padding: "10px 14px",
                          borderRadius: 14,
                          background: isEntrada ? "var(--card-bg, #fff)" : "#4545F5",
                          color: isEntrada ? "var(--text, #1d1d1f)" : "#fff",
                          border: isEntrada ? "1px solid rgba(0,0,0,0.08)" : "none",
                          borderBottomLeftRadius: isEntrada ? 4 : 14,
                          borderBottomRightRadius: isEntrada ? 14 : 4,
                        }}
                      >
                        <div style={{ fontSize: 13, lineHeight: 1.5, whiteSpace: "pre-wrap" }}>{m.conteudo}</div>
                        <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 4, justifyContent: isEntrada ? "flex-start" : "flex-end" }}>
                          <span style={{ fontSize: 10, opacity: 0.6 }}>{inboxTimeAgo(m.created_at)}</span>
                          {isEntrada && msgClassification && SENTIMENTO_INLINE[msgClassification.sentimento] && msgClassification.sentimento !== "neutro" && (
                            <span style={{ fontSize: 10, color: SENTIMENTO_INLINE[msgClassification.sentimento].c }}>
                              {SENTIMENTO_INLINE[msgClassification.sentimento].icon}
                            </span>
                          )}
                          {!isEntrada && statusChip(m.status)}
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Compose */}
            <div style={{ padding: "12px 20px 16px", background: "var(--card-bg, #fff)", borderTop: "1px solid rgba(0,0,0,0.08)", position: "relative" }}>
              {showTemplates && templates.length > 0 && (
                <div
                  style={{
                    position: "absolute",
                    bottom: "100%",
                    left: 20,
                    right: 20,
                    background: "var(--card-bg, #fff)",
                    border: "1px solid rgba(0,0,0,0.1)",
                    borderRadius: 12,
                    maxHeight: 220,
                    overflow: "auto",
                    boxShadow: "0 -4px 20px rgba(0,0,0,0.08)",
                    marginBottom: 4,
                  }}
                >
                  <div style={{ padding: "10px 14px 6px", fontSize: 11, fontWeight: 700, color: T.muted, textTransform: "uppercase", letterSpacing: 0.5 }}>Templates</div>
                  {templates.map((t) => (
                    <div
                      key={t.id}
                      onClick={() => applyTemplate(t)}
                      style={{
                        padding: "8px 14px",
                        cursor: "pointer",
                        borderBottom: "1px solid rgba(0,0,0,0.04)",
                        fontSize: 13,
                        transition: "background 0.15s",
                      }}
                      onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(0,0,0,0.03)")}
                      onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                    >
                      <div style={{ fontWeight: 600 }}>{t.nome}</div>
                      <div style={{ color: T.muted, fontSize: 12, marginTop: 2, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{t.corpo}</div>
                    </div>
                  ))}
                </div>
              )}
              <div style={{ display: "flex", gap: 8, alignItems: "flex-end" }}>
                <button
                  className="ap-btn"
                  onClick={() => setShowTemplates(!showTemplates)}
                  style={{
                    padding: "8px 10px",
                    fontSize: 16,
                    lineHeight: 1,
                    flexShrink: 0,
                    background: showTemplates ? "#4545F5" : undefined,
                    color: showTemplates ? "#fff" : undefined,
                  }}
                  title="Templates"
                >
                  📋
                </button>
                <button
                  className="ap-btn"
                  onClick={() => setShowRespostas(true)}
                  style={{ padding: "8px 10px", fontSize: 16, lineHeight: 1, flexShrink: 0 }}
                  title="Respostas Rápidas"
                >
                  ⚡
                </button>
                <textarea
                  className="ap-inp"
                  value={texto}
                  onChange={(e) => setTexto(e.target.value)}
                  placeholder="Digite sua mensagem…"
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      handleSend();
                    }
                  }}
                  style={{ flex: 1, fontSize: 13, resize: "none", minHeight: 40, maxHeight: 120, lineHeight: 1.4 }}
                  rows={1}
                />
                <button
                  className="ap-btn"
                  onClick={handleSend}
                  disabled={sending || !texto.trim()}
                  style={{
                    padding: "8px 16px",
                    background: "#4545F5",
                    color: "#fff",
                    fontWeight: 600,
                    fontSize: 13,
                    flexShrink: 0,
                    opacity: sending || !texto.trim() ? 0.5 : 1,
                  }}
                >
                  {sending ? "…" : "Enviar"}
                </button>
              </div>
            </div>
          </>
        )}
      </div>

      {/* AI Panel */}
      {showAIPanel && selected && (
        <InboxAIPanel
          analysis={analysis}
          onSelectSugestao={(text) => setTexto(text)}
          aiEnabled={ai.enabled}
          onToggleAI={ai.toggleEnabled}
        />
      )}

      {/* Respostas Rápidas Modal */}
      {showRespostas && (
        <Modal title="⚡ Respostas Rápidas" onClose={() => setShowRespostas(false)} width={650}>
          <RespostasRapidas
            user={user}
            inModal
            onUseResposta={(text) => {
              setTexto(text);
              setShowRespostas(false);
            }}
          />
        </Modal>
      )}
    </div>
  );
}

export default MarcaInbox;
