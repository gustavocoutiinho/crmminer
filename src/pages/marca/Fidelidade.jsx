import React, { useState, useMemo } from "react";
import { T } from "../../lib/theme";
import { Chip, KpiCard, SectionHeader, Toggle, Modal, FormRow, Lbl } from "../../components/UI";
import { useToast } from "../../context/ToastContext";

function Fidelidade({ user }) {
  const toast = useToast();
  const marcaId = user?.marca_id || user?.marcaId || "demo";

  const [config, setConfig] = useState(() => {
    return {
      programa_nome: "Programa de Fidelidade",
      ativo: false,
      pontos_por_real: 1,
      pontos_por_indicacao: 200,
      pontos_por_review: 50,
      niveis: [
        { nome: "Bronze", min: 0, max: 500, desconto: 0, icone: "🥉" },
        { nome: "Prata", min: 501, max: 2000, desconto: 5, icone: "🥈" },
        { nome: "Ouro", min: 2001, max: 5000, desconto: 10, icone: "🥇" },
        { nome: "Diamante", min: 5001, max: 999999, desconto: 15, icone: "💎" },
      ],
    };
  });

  const [editing, setEditing] = useState(false);
  const [editForm, setEditForm] = useState(config);
  const [showRanking, setShowRanking] = useState(false);

  const fidClientes = useMemo(() => [], []);
  const clientes = useMemo(() => [], [marcaId]);

  const totalPontos = fidClientes.reduce((s, f) => s + (f.pontos || 0), 0);
  const totalIndicacoes = fidClientes.reduce((s, f) => s + (f.indicacoes || 0), 0);
  const clientesNoPrograma = fidClientes.length;

  const nivelDistrib = useMemo(() => {
    const dist = {};
    (config.niveis || []).forEach((n) => (dist[n.nome] = 0));
    fidClientes.forEach((f) => {
      if (dist[f.nivel] !== undefined) dist[f.nivel]++;
    });
    return dist;
  }, [fidClientes, config.niveis]);

  const handleSave = () => {
    setConfig(editForm);
    setEditing(false);
    toast("Configurações do programa salvas!", "success");
  };

  const clienteRanking = useMemo(() => {
    return fidClientes
      .map((f) => {
        const cl = clientes.find((c) => c.id === f.cliente_id);
        return { ...f, nome: cl?.nome || "Cliente", email: cl?.email || "" };
      })
      .sort((a, b) => b.pontos - a.pontos);
  }, [fidClientes, clientes]);

  return (
    <div className="fade-up">
      <SectionHeader
        tag="Retenção"
        title="Programa de Fidelidade"
        action={
          <button className="ap-btn ap-btn-primary" onClick={() => { setEditForm({ ...config }); setEditing(true); }}>
            ⚙ Configurar Programa
          </button>
        }
      />

      {/* Status card */}
      <div className="ap-card" style={{ padding: "20px 24px", marginBottom: 16, display: "flex", alignItems: "center", gap: 16 }}>
        <div style={{ width: 50, height: 50, borderRadius: 14, background: config.ativo ? "#e9fbed" : "#f0f0f0", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 24 }}>
          {config.ativo ? "⭐" : "⏸"}
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 16, fontWeight: 700 }}>{config.programa_nome}</div>
          <div style={{ fontSize: 13, color: T.muted, marginTop: 2 }}>
            {config.pontos_por_real} pt/R$ · {config.pontos_por_indicacao} pts/indicação · {config.pontos_por_review} pts/review
          </div>
        </div>
        <Chip
          label={config.ativo ? "● Ativo" : "● Inativo"}
          c={config.ativo ? "#28cd41" : "#6e6e73"}
          bg={config.ativo ? "#e9fbed" : "#f0f0f0"}
        />
      </div>

      <div className="kpi-grid-4" style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 12, marginBottom: 20 }}>
        <KpiCard label="Clientes no programa" value={clientesNoPrograma} icon="👥" color="#4545F5" />
        <KpiCard label="Pontos distribuídos" value={totalPontos.toLocaleString("pt-BR")} icon="⭐" color="#ff9500" />
        <KpiCard label="Indicações total" value={totalIndicacoes} icon="🤝" color="#8e44ef" />
        <KpiCard label="Conversão indicações" value={`${fidClientes.reduce((s, f) => s + (f.indicacoes_convertidas || 0), 0)}`} icon="✅" color="#28cd41" />
      </div>

      {/* Níveis */}
      <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 12 }}>Níveis do Programa</div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 12, marginBottom: 20 }}>
        {(config.niveis || []).map((nivel) => {
          const count = nivelDistrib[nivel.nome] || 0;
          const total = clientesNoPrograma || 1;
          const pct = Math.round((count / total) * 100);
          return (
            <div key={nivel.nome} className="ap-card" style={{ padding: "18px 16px", textAlign: "center" }}>
              <div style={{ fontSize: 32, marginBottom: 6 }}>{nivel.icone}</div>
              <div style={{ fontSize: 14, fontWeight: 700 }}>{nivel.nome}</div>
              <div style={{ fontSize: 12, color: T.muted, marginTop: 2 }}>
                {nivel.min.toLocaleString("pt-BR")}–{nivel.max === 999999 ? "∞" : nivel.max.toLocaleString("pt-BR")} pts
              </div>
              {nivel.desconto > 0 && (
                <Chip label={`${nivel.desconto}% desconto`} c="#28cd41" bg="#e9fbed" />
              )}
              <div style={{ marginTop: 8 }}>
                <div style={{ height: 6, borderRadius: 3, background: "rgba(0,0,0,0.06)", overflow: "hidden" }}>
                  <div style={{ height: "100%", width: `${pct}%`, background: "#4545F5", borderRadius: 3, transition: "width 0.3s" }} />
                </div>
                <div style={{ fontSize: 11, color: T.muted, marginTop: 4 }}>{count} clientes ({pct}%)</div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Ranking de clientes */}
      <div className="ap-card" style={{ padding: 0, overflow: "hidden" }}>
        <div style={{ padding: "14px 20px", borderBottom: "1px solid rgba(0,0,0,0.06)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span style={{ fontSize: 14, fontWeight: 700 }}>🏆 Ranking de Pontos</span>
          <span style={{ fontSize: 12, color: T.muted }}>{clienteRanking.length} clientes</span>
        </div>
        {clienteRanking.map((cl, i) => {
          const nivelCfg = (config.niveis || []).find((n) => n.nome === cl.nivel);
          const nextNivel = (config.niveis || []).find((n) => n.min > cl.pontos);
          const progressToNext = nextNivel ? Math.round(((cl.pontos - (nivelCfg?.min || 0)) / (nextNivel.min - (nivelCfg?.min || 0))) * 100) : 100;
          return (
            <div key={cl.cliente_id} style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 20px", borderBottom: "1px solid rgba(0,0,0,0.04)" }}>
              <span style={{ fontSize: 12, fontWeight: 700, color: i < 3 ? "#ff9500" : T.muted, width: 24, textAlign: "right" }}>
                {i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : `${i + 1}`}
              </span>
              <div style={{ width: 34, height: 34, borderRadius: 10, background: "#eeeeff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, fontWeight: 700, color: "#4545F5" }}>
                {(cl.nome || "?")[0]}
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 13, fontWeight: 600 }}>{cl.nome}</div>
                <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 2 }}>
                  <span style={{ fontSize: 11, color: T.muted }}>{cl.email}</span>
                  {cl.indicacoes > 0 && <Chip label={`${cl.indicacoes} indicações`} c="#8e44ef" bg="#f5eaff" />}
                </div>
              </div>
              <div style={{ textAlign: "right" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 6, justifyContent: "flex-end" }}>
                  <span style={{ fontSize: 16 }}>{nivelCfg?.icone || "🥉"}</span>
                  <span style={{ fontSize: 14, fontWeight: 700, color: "#4545F5" }}>{cl.pontos.toLocaleString("pt-BR")} pts</span>
                </div>
                {nextNivel && (
                  <div style={{ width: 100, marginTop: 4 }}>
                    <div style={{ height: 4, borderRadius: 2, background: "rgba(0,0,0,0.06)", overflow: "hidden" }}>
                      <div style={{ height: "100%", width: `${Math.min(progressToNext, 100)}%`, background: "#4545F5", borderRadius: 2 }} />
                    </div>
                    <div style={{ fontSize: 10, color: T.muted, marginTop: 2 }}>→ {nextNivel.nome}</div>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Edit modal */}
      {editing && (
        <Modal title="Configurar Programa" onClose={() => setEditing(false)} width={500}>
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <div>
              <Lbl>Nome do programa</Lbl>
              <input className="ap-inp" value={editForm.programa_nome} onChange={(e) => setEditForm((p) => ({ ...p, programa_nome: e.target.value }))} />
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 16px", borderRadius: 12, background: "rgba(0,0,0,0.03)" }}>
              <Toggle checked={editForm.ativo} onChange={() => setEditForm((p) => ({ ...p, ativo: !p.ativo }))} />
              <div>
                <div style={{ fontSize: 13, fontWeight: 600 }}>Programa {editForm.ativo ? "ativo" : "inativo"}</div>
                <div style={{ fontSize: 11, color: T.muted }}>Ative para os clientes começarem a acumular pontos</div>
              </div>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10 }}>
              <div>
                <Lbl>Pontos por R$</Lbl>
                <input className="ap-inp" type="number" value={editForm.pontos_por_real} onChange={(e) => setEditForm((p) => ({ ...p, pontos_por_real: +e.target.value }))} />
              </div>
              <div>
                <Lbl>Pts/indicação</Lbl>
                <input className="ap-inp" type="number" value={editForm.pontos_por_indicacao} onChange={(e) => setEditForm((p) => ({ ...p, pontos_por_indicacao: +e.target.value }))} />
              </div>
              <div>
                <Lbl>Pts/review</Lbl>
                <input className="ap-inp" type="number" value={editForm.pontos_por_review} onChange={(e) => setEditForm((p) => ({ ...p, pontos_por_review: +e.target.value }))} />
              </div>
            </div>
            <div style={{ fontSize: 13, fontWeight: 700, marginTop: 4 }}>Níveis</div>
            {(editForm.niveis || []).map((n, i) => (
              <div key={i} style={{ display: "flex", gap: 8, alignItems: "center", background: "rgba(0,0,0,0.02)", padding: "8px 12px", borderRadius: 10 }}>
                <span style={{ fontSize: 20 }}>{n.icone}</span>
                <span style={{ fontSize: 13, fontWeight: 600, width: 70 }}>{n.nome}</span>
                <span style={{ fontSize: 12, color: T.muted }}>{n.min}–{n.max === 999999 ? "∞" : n.max}</span>
                <span style={{ fontSize: 12, marginLeft: "auto", fontWeight: 600, color: "#28cd41" }}>{n.desconto}% off</span>
              </div>
            ))}
            <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 8 }}>
              <button className="ap-btn ap-btn-secondary" onClick={() => setEditing(false)}>Cancelar</button>
              <button className="ap-btn ap-btn-primary" onClick={handleSave}>Salvar Configurações</button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}

export default Fidelidade;
