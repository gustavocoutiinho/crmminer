import React from "react";

const ICONS = {
  clientes: "👥",
  pipeline: "🎯",
  campanhas: "📢",
  automacoes: "⚡",
  fidelidade: "🏆",
  integracoes: "🔗",
  equipe: "👨‍💼",
  relatorios: "📊",
  lojas: "🏪",
  vendedores: "🛒",
  qrcode: "📱",
  atividades: "📋",
  agenda: "📅",
  inbox: "💬",
  tags: "🏷️",
  notificacoes: "🔔",
  ranking: "🥇",
  dados: "📁",
  default: "📌"
};

export default function EmptyState({ tipo = "default", titulo, descricao, acao, onAcao, isDemo = false }) {
  const icon = ICONS[tipo] || ICONS.default;

  if (isDemo) {
    return (
      <div style={{
        background: "#FFF8E1",
        border: "1px solid #FFD54F",
        borderRadius: 10,
        padding: "12px 16px",
        marginBottom: 16,
        display: "flex",
        alignItems: "center",
        gap: 10
      }}>
        <span style={{ fontSize: 18 }}>⚠️</span>
        <div>
          <span style={{ fontSize: 13, fontWeight: 600, color: "#E65100" }}>Dados de exemplo</span>
          <span style={{ fontSize: 12, color: "#795548", marginLeft: 6 }}>
            — Estes dados são ilustrativos. {acao ? "Cadastre seus dados reais para começar." : "Configure a integração para ver dados reais."}
          </span>
        </div>
        {acao && onAcao && (
          <button onClick={onAcao} style={{
            marginLeft: "auto", background: "#FF8F00", color: "#fff",
            border: "none", borderRadius: 6, padding: "6px 14px",
            fontSize: 12, fontWeight: 600, cursor: "pointer", whiteSpace: "nowrap"
          }}>{acao}</button>
        )}
      </div>
    );
  }

  return (
    <div style={{
      display: "flex", flexDirection: "column", alignItems: "center",
      justifyContent: "center", padding: "60px 20px", textAlign: "center",
      background: "#FAFBFC", borderRadius: 16, border: "2px dashed #E0E0E0",
      minHeight: 300
    }}>
      <div style={{ fontSize: 56, marginBottom: 16 }}>{icon}</div>
      <div style={{ fontSize: 18, fontWeight: 700, color: "#333", marginBottom: 8 }}>
        {titulo || "Nenhum registro ainda"}
      </div>
      <div style={{ fontSize: 14, color: "#888", maxWidth: 400, lineHeight: 1.6, marginBottom: 20 }}>
        {descricao || "Comece cadastrando o primeiro registro para utilizar este recurso."}
      </div>
      {acao && onAcao && (
        <button onClick={onAcao} style={{
          background: "#4545F5", color: "#fff", border: "none",
          borderRadius: 10, padding: "12px 28px", fontSize: 14,
          fontWeight: 700, cursor: "pointer",
          boxShadow: "0 4px 12px rgba(69,69,245,0.3)"
        }}>
          {acao}
        </button>
      )}
    </div>
  );
}
