import React, { useState, useEffect } from "react";
import { T } from "../lib/theme";

const TIPO_ICON = { novo: "🆕", melhoria: "⚡", fix: "🔧" };
const TIPO_COR = { novo: "#28cd41", melhoria: "#4545F5", fix: "#ff9500" };

export default function WhatsNew() {
  const [data, setData] = useState(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    fetch("/api/changelog")
      .then(r => r.json())
      .then(d => {
        if (d.data?.length) {
          const latest = d.data[0];
          const seen = localStorage.getItem("changelog_seen");
          if (seen !== latest.id) {
            setData(latest);
            setVisible(true);
          }
        }
      })
      .catch(() => {});
  }, []);

  if (!visible || !data) return null;

  const dismiss = () => {
    localStorage.setItem("changelog_seen", data.id);
    setVisible(false);
  };

  const itens = typeof data.itens === "string" ? JSON.parse(data.itens) : data.itens || [];

  return (
    <div style={{
      position: "fixed", top: 0, left: 0, right: 0, bottom: 0,
      background: "rgba(0,0,0,0.5)", zIndex: 9999,
      display: "flex", alignItems: "center", justifyContent: "center",
      animation: "fadeIn 0.3s ease"
    }} onClick={dismiss}>
      <div onClick={e => e.stopPropagation()} style={{
        background: "#fff", borderRadius: 16, padding: "28px 32px",
        maxWidth: 480, width: "90%", maxHeight: "80vh", overflow: "auto",
        boxShadow: "0 20px 60px rgba(0,0,0,0.15)"
      }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
          <div>
            <div style={{ fontSize: 11, fontWeight: 700, color: "#4545F5", textTransform: "uppercase", letterSpacing: 1, marginBottom: 4 }}>
              Novidades v{data.versao}
            </div>
            <div style={{ fontSize: 20, fontWeight: 800, color: T.text }}>{data.titulo}</div>
          </div>
          <button onClick={dismiss} style={{
            background: "none", border: "none", fontSize: 20, cursor: "pointer",
            color: T.muted, padding: 4
          }}>✕</button>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {itens.map((item, i) => (
            <div key={i} style={{
              display: "flex", gap: 10, alignItems: "flex-start",
              padding: "10px 12px", borderRadius: 10,
              background: `${TIPO_COR[item.tipo] || "#666"}08`,
              border: `1px solid ${TIPO_COR[item.tipo] || "#666"}15`
            }}>
              <span style={{ fontSize: 16, flexShrink: 0, marginTop: 1 }}>{TIPO_ICON[item.tipo] || "📌"}</span>
              <span style={{ fontSize: 13, color: T.text, lineHeight: 1.5 }}>{item.texto}</span>
            </div>
          ))}
        </div>

        <button onClick={dismiss} style={{
          marginTop: 20, width: "100%", padding: "12px 0",
          background: "#4545F5", color: "#fff", border: "none",
          borderRadius: 10, fontSize: 14, fontWeight: 700, cursor: "pointer"
        }}>
          Entendi, vamos lá!
        </button>
      </div>
    </div>
  );
}
