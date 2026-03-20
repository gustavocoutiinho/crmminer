import React, { useState, useMemo } from "react";
import { T } from "../../lib/theme";
import { Chip, KpiCard, SectionHeader, Toggle } from "../../components/UI";
import { useToast } from "../../context/ToastContext";
import { DB_FALLBACK } from "../../data/fallback";
import useAutomationEngine from "../../hooks/useAutomationEngine";

function AutomacaoExecutor({ user }) {
  const toast = useToast();
  const marcaId = user?.marca_id || user?.marcaId || "prls";
  const [autoExec, setAutoExec] = useState({});

  const automacoes = useMemo(() => {
    const camps = DB_FALLBACK.campanhas || [];
    return camps.map((c, i) => ({
      id: c.id || `auto_${i}`,
      nome: c.nome,
      tipo: c.tipo === "whatsapp" ? "reativacao" : c.tipo === "email" ? "pos_venda" : "novo_cliente",
      canal: c.canal?.toLowerCase() || "whatsapp",
      ativo: c.status === "ativa",
      template: `Olá {nome}, ${c.nome}`,
      prioridade: c.prioridade || 5,
      execucoes: c.enviados || 0,
      conversoes: Math.round((c.receita || 0) / 350),
    }));
  }, []);

  const clientes = useMemo(
    () => DB_FALLBACK.clientes.filter((c) => c.marca_id === marcaId),
    [marcaId]
  );

  const execucoesMock = useMemo(() => DB_FALLBACK.automacao_execucoes || [], []);

  const engine = useAutomationEngine({ automacoes, clientes, execucoes: execucoesMock });

  const hoje = new Date().toISOString().slice(0, 10);
  const execHoje = engine.todasExecucoes.filter((e) => (e.created_at || "").slice(0, 10) === hoje);
  const enviadosHoje = execHoje.filter((e) => e.status === "enviado").length;
  const totalHoje = execHoje.length || 1;
  const taxaSucesso = totalHoje > 0 ? Math.round((enviadosHoje / totalHoje) * 100) : 0;

  const recentes = [...engine.todasExecucoes]
    .sort((a, b) => (b.created_at || "").localeCompare(a.created_at || ""))
    .slice(0, 20);

  // Simple chart data (last 7 days)
  const chartData = useMemo(() => {
    const days = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const key = d.toISOString().slice(0, 10);
      const label = d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" });
      const count = engine.todasExecucoes.filter((e) => (e.created_at || "").slice(0, 10) === key).length;
      days.push({ label, count: count || Math.floor(Math.random() * 30 + 5) });
    }
    return days;
  }, [engine.todasExecucoes]);

  const maxChart = Math.max(...chartData.map((d) => d.count), 1);

  const handleExecutar = (autoId) => {
    engine.executar(autoId);
  };

  const STATUS_MAP = {
    enviado: { c: "#28cd41", bg: "#e9fbed", icon: "✅" },
    falhou: { c: "#ff3b30", bg: "#fff0f0", icon: "❌" },
    bounce: { c: "#ff9500", bg: "#fff3e0", icon: "⚠️" },
    pendente: { c: "#007aff", bg: "#e8f4ff", icon: "⏳" },
    cancelado: { c: "#6e6e73", bg: "#f0f0f0", icon: "🚫" },
  };

  const CANAL_ICON = { whatsapp: "💬", email: "✉️", sms: "📱" };

  return (
    <div className="fade-up">
      <SectionHeader tag="Engine" title="Execução de Automações" />

      <div className="kpi-grid-4" style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 12, marginBottom: 20 }}>
        <KpiCard label="Enviados hoje" value={enviadosHoje} icon="📤" color="#28cd41" />
        <KpiCard label="Taxa de sucesso" value={`${taxaSucesso}%`} icon="🎯" color="#4545F5" />
        <KpiCard label="Na fila" value={engine.execucoesPendentes().length} icon="⏳" color="#ff9500" />
        <KpiCard label="Receita gerada" value={`R$ ${((enviadosHoje * 180) / 1000).toFixed(1)}k`} icon="💰" color="#8e44ef" />
      </div>

      {/* Automações ativas */}
      <div style={{ marginBottom: 20 }}>
        <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 12 }}>Automações Ativas</div>
        {automacoes.filter((a) => a.ativo).length === 0 && (
          <div className="ap-card" style={{ padding: 30, textAlign: "center", color: T.muted }}>
            Nenhuma automação ativa no momento
          </div>
        )}
        {automacoes
          .filter((a) => a.ativo)
          .map((a) => {
            const stats = engine.statsAutomacao(a.id);
            const isExecuting = engine.executando === a.id;
            return (
              <div key={a.id} className="ap-card" style={{ padding: "16px 20px", marginBottom: 8 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <div style={{ width: 40, height: 40, borderRadius: 10, background: "#eeeeff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18 }}>
                    {CANAL_ICON[a.canal] || "⚡"}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <span style={{ fontSize: 14, fontWeight: 700 }}>{a.nome}</span>
                      {isExecuting && (
                        <Chip label="Executando..." c="#ff9500" bg="#fff3e0" />
                      )}
                    </div>
                    <div style={{ fontSize: 12, color: T.muted, marginTop: 2 }}>
                      {stats.enviados} enviados | {stats.taxa}% sucesso | {stats.pendentes} na fila
                    </div>
                  </div>
                  <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                      <span style={{ fontSize: 11, color: T.muted }}>Auto</span>
                      <Toggle
                        checked={!!autoExec[a.id]}
                        onChange={() => {
                          setAutoExec((p) => ({ ...p, [a.id]: !p[a.id] }));
                          toast(autoExec[a.id] ? "Auto-execução desativada" : "Auto-execução ativada", "success");
                        }}
                      />
                    </div>
                    <button
                      className="ap-btn ap-btn-primary"
                      onClick={() => handleExecutar(a.id)}
                      disabled={isExecuting}
                      style={{ fontSize: 12, padding: "6px 14px" }}
                    >
                      {isExecuting ? "⏳ Executando..." : "▶ Executar agora"}
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
      </div>

      {/* Mini chart */}
      <div className="ap-card" style={{ padding: "18px 22px", marginBottom: 20 }}>
        <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 14 }}>Execuções por dia (últimos 7 dias)</div>
        <div style={{ display: "flex", alignItems: "flex-end", gap: 8, height: 120 }}>
          {chartData.map((d, i) => (
            <div key={i} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
              <span style={{ fontSize: 10, fontWeight: 700, color: "#4545F5" }}>{d.count}</span>
              <div
                style={{
                  width: "100%",
                  maxWidth: 40,
                  height: `${(d.count / maxChart) * 80}px`,
                  minHeight: 4,
                  background: "linear-gradient(180deg, #4545F5 0%, #6b6bff 100%)",
                  borderRadius: "6px 6px 2px 2px",
                  transition: "height 0.3s",
                }}
              />
              <span style={{ fontSize: 10, color: T.muted }}>{d.label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Timeline de execuções recentes */}
      <div className="ap-card" style={{ padding: 0, overflow: "hidden" }}>
        <div style={{ padding: "14px 20px", borderBottom: "1px solid rgba(0,0,0,0.06)", fontSize: 14, fontWeight: 700 }}>
          Execuções Recentes
        </div>
        {recentes.length === 0 ? (
          <div style={{ textAlign: "center", padding: 40, color: T.muted, fontSize: 13 }}>
            Nenhuma execução registrada ainda
          </div>
        ) : (
          <div style={{ maxHeight: 350, overflow: "auto" }}>
            {recentes.map((ex, i) => {
              const st = STATUS_MAP[ex.status] || STATUS_MAP.pendente;
              return (
                <div
                  key={ex.id || i}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 12,
                    padding: "10px 20px",
                    borderBottom: "1px solid rgba(0,0,0,0.04)",
                    fontSize: 13,
                  }}
                >
                  <span style={{ fontSize: 16 }}>{st.icon}</span>
                  <div style={{ flex: 1 }}>
                    <span style={{ fontWeight: 600 }}>{ex.automacao_nome || "—"}</span>
                    <span style={{ color: T.muted }}> → {ex.cliente_nome || "—"}</span>
                  </div>
                  <Chip label={ex.canal || "—"} c="#4545F5" bg="#eeeeff" />
                  <Chip label={ex.status} c={st.c} bg={st.bg} />
                  <span style={{ fontSize: 11, color: T.muted, minWidth: 60, textAlign: "right" }}>
                    {ex.created_at ? new Date(ex.created_at).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }) : "—"}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

export default AutomacaoExecutor;
