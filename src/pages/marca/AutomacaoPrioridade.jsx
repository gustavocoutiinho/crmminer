import React, { useState, useMemo } from "react";
import { T } from "../../lib/theme";
import { Chip, KpiCard, SectionHeader } from "../../components/UI";
import { useToast } from "../../context/ToastContext";
import { DB_FALLBACK } from "../../data/fallback";

function AutomacaoPrioridade({ user }) {
  const toast = useToast();
  const marcaId = user?.marca_id || user?.marcaId || "prls";

  const [prioridades, setPrioridades] = useState(() => {
    const camps = DB_FALLBACK.campanhas || [];
    return camps
      .filter((c) => c.status === "ativa" || c.status === "concluida")
      .map((c, i) => ({
        id: c.id,
        nome: c.nome,
        canal: c.canal || "WhatsApp",
        status: c.status,
        prioridade: c.prioridade || i + 1,
        enviados: c.enviados || 0,
      }))
      .sort((a, b) => a.prioridade - b.prioridade);
  });

  const clientes = useMemo(
    () => DB_FALLBACK.clientes.filter((c) => c.marca_id === marcaId),
    [marcaId]
  );

  // Detect conflicts: clients that would be in 2+ automations
  const conflitos = useMemo(() => {
    const ativas = prioridades.filter((p) => p.status === "ativa");
    if (ativas.length < 2) return { count: 0, clientes: [] };
    // Simulate: at_risk and hibernating clients are in "reativação", all are in other campaigns
    const conflictClients = clientes.filter(
      (c) => c.segmento_rfm === "at_risk" || c.segmento_rfm === "hibernating"
    );
    return { count: conflictClients.length, clientes: conflictClients };
  }, [prioridades, clientes]);

  const mover = (idx, dir) => {
    const newIdx = idx + dir;
    if (newIdx < 0 || newIdx >= prioridades.length) return;
    const next = [...prioridades];
    [next[idx], next[newIdx]] = [next[newIdx], next[idx]];
    next.forEach((item, i) => (item.prioridade = i + 1));
    setPrioridades(next);
    toast("Prioridade atualizada", "success");
  };

  const CANAL_ICON = { WhatsApp: "💬", Email: "✉️", SMS: "📱" };

  return (
    <div className="fade-up">
      <SectionHeader tag="Config" title="Prioridade de Automações" />

      <div className="kpi-grid-4" style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 12, marginBottom: 20 }}>
        <KpiCard label="Automações ativas" value={prioridades.filter((p) => p.status === "ativa").length} icon="⚡" color="#4545F5" />
        <KpiCard label="Conflitos detectados" value={conflitos.count} icon="⚠️" color={conflitos.count > 0 ? "#ff9500" : "#28cd41"} />
        <KpiCard label="Clientes na fila" value={clientes.length} icon="👥" color="#8e44ef" />
      </div>

      {conflitos.count > 0 && (
        <div className="ap-card" style={{ padding: "14px 18px", marginBottom: 16, background: "rgba(255,149,0,0.08)", border: "1px solid rgba(255,149,0,0.2)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, fontWeight: 600, color: "#ff9500" }}>
            ⚠️ {conflitos.count} clientes estão em 2+ automações
          </div>
          <div style={{ fontSize: 12, color: T.muted, marginTop: 4 }}>
            A regra de prioridade garante que cada cliente receba apenas a automação de maior prioridade.
          </div>
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 8 }}>
            {conflitos.clientes.slice(0, 5).map((c) => (
              <Chip key={c.id} label={c.nome} c="#ff9500" bg="#fff3e0" />
            ))}
            {conflitos.count > 5 && <Chip label={`+${conflitos.count - 5} mais`} c="#6e6e73" bg="#f0f0f0" />}
          </div>
        </div>
      )}

      <div className="ap-card" style={{ padding: "14px 18px", marginBottom: 16, background: "rgba(69,69,245,0.06)", border: "1px solid rgba(69,69,245,0.15)" }}>
        <div style={{ fontSize: 13, color: "#4545F5", fontWeight: 600 }}>
          💡 Prioridade 1 = mais alta. Use ↑↓ para reordenar. Clientes em múltiplas automações receberão apenas a de maior prioridade.
        </div>
      </div>

      <div className="ap-card" style={{ padding: 0, overflow: "hidden" }}>
        <div style={{ padding: "14px 20px", borderBottom: "1px solid rgba(0,0,0,0.06)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span style={{ fontSize: 14, fontWeight: 700 }}>Ordem de Prioridade</span>
          <span style={{ fontSize: 12, color: T.muted }}>Arraste ou use as setas para reordenar</span>
        </div>
        {prioridades.map((item, idx) => (
          <div
            key={item.id}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 14,
              padding: "14px 20px",
              borderBottom: "1px solid rgba(0,0,0,0.04)",
              background: idx === 0 ? "rgba(69,69,245,0.03)" : "transparent",
            }}
          >
            <div
              style={{
                width: 32,
                height: 32,
                borderRadius: 8,
                background: idx === 0 ? "#4545F5" : "rgba(0,0,0,0.06)",
                color: idx === 0 ? "#fff" : T.muted,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 13,
                fontWeight: 700,
                flexShrink: 0,
              }}
            >
              {item.prioridade}
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 14, fontWeight: 600 }}>{item.nome}</div>
              <div style={{ display: "flex", gap: 6, marginTop: 4 }}>
                <Chip label={`${CANAL_ICON[item.canal] || "⚡"} ${item.canal}`} c="#4545F5" bg="#eeeeff" />
                <span style={{ fontSize: 12, color: T.muted }}>{item.enviados} enviados</span>
              </div>
            </div>
            <div style={{ display: "flex", gap: 4 }}>
              <button
                className="ap-btn ap-btn-sm"
                onClick={() => mover(idx, -1)}
                disabled={idx === 0}
                style={{ fontSize: 14, padding: "4px 8px", opacity: idx === 0 ? 0.3 : 1 }}
              >
                ↑
              </button>
              <button
                className="ap-btn ap-btn-sm"
                onClick={() => mover(idx, 1)}
                disabled={idx === prioridades.length - 1}
                style={{ fontSize: 14, padding: "4px 8px", opacity: idx === prioridades.length - 1 ? 0.3 : 1 }}
              >
                ↓
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default AutomacaoPrioridade;
