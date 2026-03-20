import React, { useState } from "react";
import { T } from "../../lib/theme";
import { Modal, Lbl } from "../../components/UI";
import { useToast } from "../../context/ToastContext";

const TIPOS_CONTATO = [
  { value: "whatsapp", label: "💬 WhatsApp", icon: "💬" },
  { value: "ligacao", label: "📞 Ligação", icon: "📞" },
  { value: "email", label: "📧 Email", icon: "📧" },
  { value: "presencial", label: "🏪 Presencial", icon: "🏪" },
  { value: "sms", label: "📱 SMS", icon: "📱" },
];

function ContatoModal({ cliente, user, isOverride, onConfirm, onClose }) {
  const toast = useToast();
  const [tipo, setTipo] = useState("whatsapp");
  const [observacao, setObservacao] = useState("");
  const [motivo, setMotivo] = useState("");
  const [salvando, setSalvando] = useState(false);

  const handleConfirm = () => {
    if (!tipo) { toast("Selecione o tipo de contato", "warning"); return; }
    if (isOverride && !motivo.trim()) { toast("Informe o motivo da antecipação", "warning"); return; }

    setSalvando(true);

    const registro = {
      id: `cl_${Date.now()}`,
      marca_id: cliente.marca_id,
      cliente_id: cliente.id,
      vendedor_id: user.id,
      tipo,
      observacao: observacao.trim(),
      override: isOverride || false,
      override_motivo: isOverride ? motivo.trim() : null,
      override_por: isOverride ? user.id : null,
      created_at: new Date().toISOString(),
    };

    setTimeout(() => {
      setSalvando(false);
      toast(`Contato com ${cliente.nome} registrado! ✅`, "success");
      if (onConfirm) onConfirm(registro);
    }, 300);
  };

  return (
    <Modal title={`📞 Registrar Contato — ${cliente.nome}`} onClose={onClose}>
      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        {isOverride && (
          <div style={{
            background: "rgba(255,149,0,0.1)",
            border: "1px solid rgba(255,149,0,0.3)",
            borderRadius: 10,
            padding: "10px 14px",
            fontSize: 13,
            color: "#ff9500",
            fontWeight: 500,
          }}>
            ⚠️ Este cliente ainda está no período de espera. Você está forçando o contato.
          </div>
        )}

        <div>
          <Lbl>Tipo de Contato</Lbl>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 6 }}>
            {TIPOS_CONTATO.map(t => (
              <button
                key={t.value}
                onClick={() => setTipo(t.value)}
                style={{
                  padding: "8px 16px",
                  borderRadius: 10,
                  border: tipo === t.value ? "2px solid var(--brand, #4545F5)" : "1px solid var(--border, rgba(0,0,0,0.08))",
                  background: tipo === t.value ? "var(--brand-light, #eeeeff)" : "var(--bg-card, rgba(255,255,255,0.92))",
                  color: tipo === t.value ? "var(--brand, #4545F5)" : "var(--text, #1d1d1f)",
                  fontSize: 13,
                  fontWeight: 600,
                  cursor: "pointer",
                  transition: "all .15s",
                }}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>

        <div>
          <Lbl>Observação</Lbl>
          <textarea
            className="ap-inp"
            rows={3}
            placeholder="O que foi conversado? Alguma nota importante..."
            value={observacao}
            onChange={e => setObservacao(e.target.value)}
            style={{ resize: "vertical", minHeight: 70 }}
          />
        </div>

        {isOverride && (
          <div>
            <Lbl>Motivo da Antecipação *</Lbl>
            <input
              className="ap-inp"
              placeholder="Por que está antecipando o contato?"
              value={motivo}
              onChange={e => setMotivo(e.target.value)}
            />
          </div>
        )}

        <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", marginTop: 8 }}>
          <button className="ap-btn ap-btn-secondary" onClick={onClose}>Cancelar</button>
          <button
            className="ap-btn ap-btn-primary"
            onClick={handleConfirm}
            disabled={salvando}
          >
            {salvando ? "Registrando..." : isOverride ? "⚡ Forçar Contato" : "✅ Registrar Contato"}
          </button>
        </div>
      </div>
    </Modal>
  );
}

export default ContatoModal;
