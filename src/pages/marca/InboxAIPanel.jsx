import React from "react";
import { T } from "../../lib/theme";
import { Toggle } from "../../components/UI";

const SENTIMENTO_MAP = {
  positivo: { icon: "😊", label: "Positivo", c: "#28cd41", bg: "#e9fbed" },
  neutro: { icon: "😐", label: "Neutro", c: "#6e6e73", bg: "#f0f0f0" },
  negativo: { icon: "😤", label: "Negativo", c: "#ff3b30", bg: "#fff0f0" },
  urgente: { icon: "🚨", label: "Urgente", c: "#ff9500", bg: "#fff3e0" },
};

const INTENCAO_MAP = {
  compra: { icon: "🛒", label: "Compra", c: "#28cd41", bg: "#e9fbed" },
  reclamacao: { icon: "⚠️", label: "Reclamação", c: "#ff3b30", bg: "#fff0f0" },
  duvida: { icon: "❓", label: "Dúvida", c: "#007aff", bg: "#e8f4ff" },
  elogio: { icon: "⭐", label: "Elogio", c: "#ff9500", bg: "#fff3e0" },
  cancelamento: { icon: "🚫", label: "Cancelamento", c: "#ff3b30", bg: "#ffe5e3" },
  geral: { icon: "💬", label: "Geral", c: "#6e6e73", bg: "#f0f0f0" },
};

function InboxAIPanel({ analysis, onSelectSugestao, aiEnabled, onToggleAI }) {
  const sent = SENTIMENTO_MAP[analysis?.sentimento] || SENTIMENTO_MAP.neutro;
  const intent = INTENCAO_MAP[analysis?.intencao] || INTENCAO_MAP.geral;

  return (
    <div
      className="fade-up"
      style={{
        width: 280,
        minWidth: 280,
        background: "rgba(255,255,255,0.7)",
        backdropFilter: "blur(20px)",
        WebkitBackdropFilter: "blur(20px)",
        borderLeft: "1px solid rgba(0,0,0,0.08)",
        display: "flex",
        flexDirection: "column",
        overflow: "auto",
      }}
    >
      {/* Header */}
      <div style={{ padding: "14px 16px", borderBottom: "1px solid rgba(0,0,0,0.06)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <span style={{ fontSize: 16 }}>🤖</span>
          <span style={{ fontSize: 13, fontWeight: 700 }}>IA Assistente</span>
        </div>
        <Toggle checked={aiEnabled} onChange={onToggleAI} />
      </div>

      {!aiEnabled ? (
        <div style={{ padding: 20, textAlign: "center", color: T.muted, fontSize: 13 }}>
          IA desativada. Ative para receber sugestões de resposta.
        </div>
      ) : (
        <div style={{ padding: "12px 14px", display: "flex", flexDirection: "column", gap: 14 }}>
          {/* Sentimento & Intenção */}
          <div>
            <div style={{ fontSize: 11, fontWeight: 700, color: T.muted, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 8 }}>
              Análise
            </div>
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
              <div style={{ display: "inline-flex", alignItems: "center", gap: 4, padding: "4px 10px", borderRadius: 20, background: sent.bg, fontSize: 12, fontWeight: 600, color: sent.c }}>
                {sent.icon} {sent.label}
              </div>
              <div style={{ display: "inline-flex", alignItems: "center", gap: 4, padding: "4px 10px", borderRadius: 20, background: intent.bg, fontSize: 12, fontWeight: 600, color: intent.c }}>
                {intent.icon} {intent.label}
              </div>
            </div>
          </div>

          {/* Sugestões */}
          <div>
            <div style={{ fontSize: 11, fontWeight: 700, color: T.muted, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 8 }}>
              🤖 Sugestões de Resposta
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {(analysis?.sugestoes || []).map((sug, i) => (
                <div
                  key={i}
                  onClick={() => onSelectSugestao(sug)}
                  style={{
                    padding: "10px 12px",
                    borderRadius: 10,
                    border: "1px solid rgba(0,0,0,0.06)",
                    background: "rgba(255,255,255,0.8)",
                    cursor: "pointer",
                    fontSize: 12,
                    lineHeight: 1.5,
                    color: T.text,
                    transition: "all 0.15s",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = "#eeeeff";
                    e.currentTarget.style.borderColor = "#4545F5";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = "rgba(255,255,255,0.8)";
                    e.currentTarget.style.borderColor = "rgba(0,0,0,0.06)";
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: 4, marginBottom: 4 }}>
                    <span style={{ fontSize: 10, fontWeight: 700, color: "#4545F5" }}>Opção {i + 1}</span>
                    <span style={{ fontSize: 10, color: T.muted }}>· Clique para usar</span>
                  </div>
                  {sug}
                </div>
              ))}
            </div>
          </div>

          {/* Ação sugerida */}
          {analysis?.acao && (
            <div>
              <div style={{ fontSize: 11, fontWeight: 700, color: T.muted, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 8 }}>
                💡 Ação Sugerida
              </div>
              <div style={{ padding: "10px 12px", borderRadius: 10, background: "rgba(69,69,245,0.06)", border: "1px solid rgba(69,69,245,0.15)", fontSize: 12, color: "#4545F5", fontWeight: 500, lineHeight: 1.5 }}>
                {analysis.acao}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default InboxAIPanel;
