import React, { useState } from "react";
import { Modal, Lbl } from "../../components/UI";
import { useToast } from "../../context/ToastContext";

const TIPOS = [
  { value: "whatsapp", label: "💬 WhatsApp" },
  { value: "ligacao", label: "📞 Ligação" },
  { value: "email", label: "📧 Email" },
];

function AgendarContatoModal({ clientes, user, marcaId, defaultClienteId, onSave, onClose }) {
  const toast = useToast();
  const todayStr = new Date().toISOString().slice(0, 10);
  const [clienteId, setClienteId] = useState(defaultClienteId || "");
  const [data, setData] = useState("");
  const [hora, setHora] = useState("10:00");
  const [tipo, setTipo] = useState("whatsapp");
  const [observacao, setObservacao] = useState("");
  const [busca, setBusca] = useState("");

  const filteredClientes = busca
    ? clientes.filter(c => c.nome.toLowerCase().includes(busca.toLowerCase()))
    : clientes;

  const handleSave = () => {
    if (!clienteId) { toast("Selecione um cliente", "warning"); return; }
    if (!data) { toast("Selecione uma data", "warning"); return; }
    if (data < todayStr) { toast("Não é possível agendar no passado", "error"); return; }

    const novo = {
      id: `ag_${Date.now()}`,
      cliente_id: clienteId,
      vendedor_id: user.id,
      marca_id: marcaId,
      data,
      hora,
      tipo,
      observacao,
      status: "pendente",
      created_at: new Date().toISOString(),
    };
    onSave(novo);
  };

  return (
    <Modal title="📅 Agendar Contato" onClose={onClose} width={480}>
      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        <div>
          <Lbl>Cliente</Lbl>
          <input className="ap-inp" placeholder="Buscar cliente..." value={busca}
            onChange={e => setBusca(e.target.value)} style={{ marginBottom: 6, fontSize: 13 }} />
          <select className="ap-inp" value={clienteId} onChange={e => setClienteId(e.target.value)} style={{ fontSize: 13 }}>
            <option value="">Selecione...</option>
            {filteredClientes.map(c => (
              <option key={c.id} value={c.id}>{c.nome} — {c.telefone}</option>
            ))}
          </select>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <div>
            <Lbl>Data</Lbl>
            <input className="ap-inp" type="date" value={data} min={todayStr}
              onChange={e => setData(e.target.value)} style={{ fontSize: 13 }} />
          </div>
          <div>
            <Lbl>Hora</Lbl>
            <input className="ap-inp" type="time" value={hora}
              onChange={e => setHora(e.target.value)} style={{ fontSize: 13 }} />
          </div>
        </div>
        <div>
          <Lbl>Tipo de Contato</Lbl>
          <div style={{ display: "flex", gap: 8 }}>
            {TIPOS.map(t => (
              <button key={t.value} className={`ap-btn ap-btn-sm ${tipo === t.value ? "ap-btn-primary" : ""}`}
                onClick={() => setTipo(t.value)} style={{ fontSize: 12, flex: 1 }}>
                {t.label}
              </button>
            ))}
          </div>
        </div>
        <div>
          <Lbl>Observação</Lbl>
          <textarea className="ap-inp" rows={3} value={observacao} placeholder="Objetivo do contato..."
            onChange={e => setObservacao(e.target.value)} style={{ fontSize: 13, resize: "vertical" }} />
        </div>
        <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
          <button className="ap-btn ap-btn-sm" onClick={onClose}>Cancelar</button>
          <button className="ap-btn ap-btn-primary ap-btn-sm" onClick={handleSave}>📅 Agendar</button>
        </div>
      </div>
    </Modal>
  );
}

export default AgendarContatoModal;
