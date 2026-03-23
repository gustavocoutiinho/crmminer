import React, { useState } from "react";

export default function DemoBanner({ recurso, acao, onAcao }) {
  const [dismissed, setDismissed] = useState(false);
  if (dismissed) return null;

  return (
    <div style={{
      background: "linear-gradient(90deg, #FFF8E1, #FFF3E0)",
      border: "1px solid #FFD54F",
      borderRadius: 10,
      padding: "10px 16px",
      marginBottom: 14,
      display: "flex",
      alignItems: "center",
      gap: 10,
      animation: "fadeIn 0.3s ease"
    }}>
      <span style={{ fontSize: 16 }}>⚠️</span>
      <div style={{ flex: 1 }}>
        <span style={{ fontSize: 13, fontWeight: 600, color: "#E65100" }}>Dados de exemplo</span>
        <span style={{ fontSize: 12, color: "#795548", marginLeft: 6 }}>
          — {recurso ? `Os dados de "${recurso}" são ilustrativos.` : "Estes dados são ilustrativos."} Cadastre seus dados reais para começar a usar este recurso.
        </span>
      </div>
      {acao && onAcao && (
        <button onClick={onAcao} style={{
          background: "#FF8F00", color: "#fff",
          border: "none", borderRadius: 6, padding: "6px 14px",
          fontSize: 12, fontWeight: 600, cursor: "pointer", whiteSpace: "nowrap"
        }}>{acao}</button>
      )}
      <button onClick={() => setDismissed(true)} style={{
        background: "none", border: "none", fontSize: 14, cursor: "pointer",
        color: "#BDBDBD", padding: "0 4px"
      }}>✕</button>
    </div>
  );
}
