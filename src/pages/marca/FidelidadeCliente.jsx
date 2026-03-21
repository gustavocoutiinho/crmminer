import React, { useState, useMemo } from "react";
import { T } from "../../lib/theme";
import { Chip, KpiCard, Modal, Lbl } from "../../components/UI";
import { useToast } from "../../context/ToastContext";
import { DB_FALLBACK } from "../../data/fallback";

function FidelidadeCliente({ clienteId, onClose }) {
  const toast = useToast();

  const cliente = useMemo(() => DB_FALLBACK.clientes.find((c) => c.id === clienteId), [clienteId]);
  const fidData = useMemo(() => (DB_FALLBACK.fidelidade_clientes || []).find((f) => f.cliente_id === clienteId) || { pontos: 0, nivel: "Bronze", indicacoes: 0, indicacoes_convertidas: 0 }, [clienteId]);
  const config = useMemo(() => DB_FALLBACK.fidelidade_config || { niveis: [], pontos_por_real: 1 }, []);
  const historico = useMemo(() => (DB_FALLBACK.pontos_historico || []).filter((h) => h.cliente_id === clienteId).sort((a, b) => (b.created_at || "").localeCompare(a.created_at || "")), [clienteId]);
  const indicacoes = useMemo(() => (DB_FALLBACK.indicacoes || []).filter((i) => i.indicador_id === clienteId), [clienteId]);

  const [showCreditar, setShowCreditar] = useState(false);
  const [creditarPontos, setCreditarPontos] = useState("");
  const [creditarMotivo, setCreditarMotivo] = useState("");
  const [showResgatar, setShowResgatar] = useState(false);

  const nivelAtual = (config.niveis || []).find((n) => n.nome === fidData.nivel);
  const proximoNivel = (config.niveis || []).find((n) => n.min > fidData.pontos);
  const progressToNext = proximoNivel
    ? Math.round(((fidData.pontos - (nivelAtual?.min || 0)) / (proximoNivel.min - (nivelAtual?.min || 0))) * 100)
    : 100;

  const pontosGanhos = historico.filter((h) => h.tipo === "ganhou").reduce((s, h) => s + h.pontos, 0);
  const pontosResgatados = historico.filter((h) => h.tipo === "resgatou").reduce((s, h) => s + Math.abs(h.pontos), 0);

  const RECOMPENSAS = [
    { id: "r1", nome: "Desconto 10%", custo: 500, icone: "🏷️" },
    { id: "r2", nome: "Frete grátis", custo: 300, icone: "📦" },
    { id: "r3", nome: "Brinde exclusivo", custo: 1000, icone: "🎁" },
    { id: "r4", nome: "Acesso antecipado", custo: 800, icone: "⚡" },
    { id: "r5", nome: "Desconto 20%", custo: 1500, icone: "💎" },
  ];

  const handleCreditar = () => {
    const pts = parseInt(creditarPontos);
    if (!pts || pts <= 0) return toast("Informe pontos válidos", "error");
    toast(`${pts} pontos creditados para ${cliente?.nome}!`, "success");
    setShowCreditar(false);
    setCreditarPontos("");
    setCreditarMotivo("");
  };

  const handleResgatar = (recompensa) => {
    if (fidData.pontos < recompensa.custo) return toast("Pontos insuficientes", "error");
    toast(`${recompensa.nome} resgatado por ${recompensa.custo} pontos!`, "success");
    setShowResgatar(false);
  };

  if (!cliente) return null;

  return (
    <div>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 20 }}>
        <div style={{ width: 56, height: 56, borderRadius: 16, background: "#eeeeff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 24, fontWeight: 700, color: "#4545F5" }}>
          {cliente.nome[0]}
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 18, fontWeight: 700 }}>{cliente.nome}</div>
          <div style={{ fontSize: 13, color: T.muted }}>{cliente.email}</div>
        </div>
        <div style={{ textAlign: "right" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6, justifyContent: "flex-end" }}>
            <span style={{ fontSize: 22 }}>{nivelAtual?.icone || "🥉"}</span>
            <span style={{ fontSize: 16, fontWeight: 700, color: "#4545F5" }}>{fidData.nivel}</span>
          </div>
          <div style={{ fontSize: 20, fontWeight: 700, color: "#ff9500" }}>{fidData.pontos.toLocaleString("pt-BR")} pts</div>
        </div>
      </div>

      {/* Progress bar */}
      {proximoNivel && (
        <div style={{ marginBottom: 20 }}>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: T.muted, marginBottom: 4 }}>
            <span>{nivelAtual?.icone} {fidData.nivel}</span>
            <span>{proximoNivel.icone} {proximoNivel.nome} ({proximoNivel.min} pts)</span>
          </div>
          <div style={{ height: 10, borderRadius: 5, background: "rgba(0,0,0,0.06)", overflow: "hidden" }}>
            <div style={{ height: "100%", width: `${Math.min(progressToNext, 100)}%`, background: "linear-gradient(90deg, #4545F5, #8e44ef)", borderRadius: 5, transition: "width 0.3s" }} />
          </div>
          <div style={{ fontSize: 11, color: T.muted, marginTop: 4 }}>
            Faltam {(proximoNivel.min - fidData.pontos).toLocaleString("pt-BR")} pontos para {proximoNivel.nome}
          </div>
        </div>
      )}

      {/* KPIs */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 10, marginBottom: 20 }}>
        <KpiCard label="Pontos ganhos" value={pontosGanhos} icon="⬆️" color="#28cd41" />
        <KpiCard label="Pontos resgatados" value={pontosResgatados} icon="⬇️" color="#ff3b30" />
        <KpiCard label="Indicações" value={fidData.indicacoes} icon="🤝" color="#8e44ef" />
        <KpiCard label="Convertidas" value={fidData.indicacoes_convertidas} icon="✅" color="#4545F5" />
      </div>

      {/* Actions */}
      <div style={{ display: "flex", gap: 8, marginBottom: 20 }}>
        <button className="ap-btn ap-btn-primary" onClick={() => setShowCreditar(true)} style={{ fontSize: 13 }}>
          ⭐ Creditar pontos
        </button>
        <button className="ap-btn ap-btn-secondary" onClick={() => setShowResgatar(true)} style={{ fontSize: 13 }}>
          🎁 Resgatar pontos
        </button>
      </div>

      {/* Histórico */}
      <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 10 }}>📜 Histórico de Pontos</div>
      <div className="ap-card" style={{ padding: 0, overflow: "hidden", marginBottom: 16 }}>
        {historico.length === 0 ? (
          <div style={{ padding: 24, textAlign: "center", color: T.muted, fontSize: 13 }}>Nenhuma movimentação registrada</div>
        ) : (
          historico.map((h, i) => (
            <div key={i} style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 16px", borderBottom: "1px solid rgba(0,0,0,0.04)" }}>
              <span style={{ fontSize: 16 }}>{h.tipo === "ganhou" ? "⬆️" : h.tipo === "resgatou" ? "⬇️" : "🔄"}</span>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 13, fontWeight: 500 }}>{h.motivo}</div>
                <div style={{ fontSize: 11, color: T.muted }}>{h.created_at ? new Date(h.created_at).toLocaleDateString("pt-BR") : "—"}</div>
              </div>
              <span style={{ fontSize: 14, fontWeight: 700, color: h.pontos > 0 ? "#28cd41" : "#ff3b30" }}>
                {h.pontos > 0 ? "+" : ""}{h.pontos}
              </span>
            </div>
          ))
        )}
      </div>

      {/* Indicações */}
      {indicacoes.length > 0 && (
        <>
          <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 10 }}>🤝 Indicações feitas</div>
          <div className="ap-card" style={{ padding: 0, overflow: "hidden" }}>
            {indicacoes.map((ind) => (
              <div key={ind.id} style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 16px", borderBottom: "1px solid rgba(0,0,0,0.04)" }}>
                <span style={{ fontSize: 13, fontWeight: 600 }}>{ind.indicado_nome}</span>
                <span style={{ fontSize: 12, color: T.muted }}>{ind.indicado_email}</span>
                <div style={{ marginLeft: "auto" }}>
                  <Chip
                    label={ind.status}
                    c={ind.status === "convertida" ? "#28cd41" : ind.status === "pendente" ? "#ff9500" : "#6e6e73"}
                    bg={ind.status === "convertida" ? "#e9fbed" : ind.status === "pendente" ? "#fff3e0" : "#f0f0f0"}
                  />
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {/* Creditar modal */}
      {showCreditar && (
        <Modal title="Creditar Pontos" onClose={() => setShowCreditar(false)} width={400}>
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <div>
              <Lbl>Quantidade de pontos</Lbl>
              <input className="ap-inp" type="number" value={creditarPontos} onChange={(e) => setCreditarPontos(e.target.value)} placeholder="Ex: 100" />
            </div>
            <div>
              <Lbl>Motivo</Lbl>
              <input className="ap-inp" value={creditarMotivo} onChange={(e) => setCreditarMotivo(e.target.value)} placeholder="Ex: Bonificação especial" />
            </div>
            <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 8 }}>
              <button className="ap-btn ap-btn-secondary" onClick={() => setShowCreditar(false)}>Cancelar</button>
              <button className="ap-btn ap-btn-primary" onClick={handleCreditar}>Creditar</button>
            </div>
          </div>
        </Modal>
      )}

      {/* Resgatar modal */}
      {showResgatar && (
        <Modal title="Resgatar Pontos" subtitle={`Saldo: ${fidData.pontos.toLocaleString("pt-BR")} pts`} onClose={() => setShowResgatar(false)} width={450}>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {RECOMPENSAS.map((r) => (
              <div
                key={r.id}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 12,
                  padding: "12px 14px",
                  borderRadius: 12,
                  border: "1px solid rgba(0,0,0,0.06)",
                  opacity: fidData.pontos >= r.custo ? 1 : 0.5,
                  cursor: fidData.pontos >= r.custo ? "pointer" : "default",
                }}
                onClick={() => fidData.pontos >= r.custo && handleResgatar(r)}
              >
                <span style={{ fontSize: 22 }}>{r.icone}</span>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 13, fontWeight: 600 }}>{r.nome}</div>
                  <div style={{ fontSize: 12, color: T.muted }}>{r.custo} pontos</div>
                </div>
                {fidData.pontos >= r.custo ? (
                  <button className="ap-btn ap-btn-primary" style={{ fontSize: 11, padding: "4px 12px" }}>Resgatar</button>
                ) : (
                  <span style={{ fontSize: 11, color: T.muted }}>Pts insuficientes</span>
                )}
              </div>
            ))}
          </div>
        </Modal>
      )}
    </div>
  );
}

export default FidelidadeCliente;
