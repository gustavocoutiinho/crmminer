import React, { useState } from "react";
import { T } from "../../lib/theme";
import { Modal, Lbl } from "../../components/UI";
import { useToast } from "../../context/ToastContext";

const TIPOS = [
  { value: "observacao", label: "📝 Observação" },
  { value: "feedback", label: "💬 Feedback do cliente" },
  { value: "info", label: "ℹ️ Informação adicional" },
  { value: "objecao", label: "🚫 Objeção" },
  { value: "preferencia", label: "❤️ Preferência" },
];

const TAGS_RAPIDAS = [
  "Gostou do produto",
  "Prefere WhatsApp",
  "Compra pra presente",
  "Sensível a preço",
  "VIP",
  "Coleciona",
  "Primeira compra",
  "Reclamação",
  "Satisfeito",
];

function RegistroInteracao({ clienteId, vendedorId, marcaId, onSave, onClose }) {
  const toast = useToast();
  const [tipo, setTipo] = useState("observacao");
  const [texto, setTexto] = useState("");
  const [tags, setTags] = useState([]);

  const toggleTag = (tag) => {
    setTags(prev => prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag]);
  };

  const handleSave = () => {
    if (!texto.trim()) { toast("Digite o texto do registro", "warning"); return; }

    const registro = {
      id: `ri_${Date.now()}`,
      cliente_id: clienteId,
      vendedor_id: vendedorId,
      marca_id: marcaId,
      tipo,
      texto: texto.trim(),
      tags: tags.map(t => t.toLowerCase().replace(/\s+/g, "_")),
      created_at: new Date().toISOString(),
    };

    onSave(registro);
    toast("Registro salvo com sucesso! 📝", "success");
  };

  return (
    <Modal title="➕ Registrar Observação" onClose={onClose} width={480}>
      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        <div>
          <Lbl>Tipo do Registro</Lbl>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
            {TIPOS.map(t => (
              <button key={t.value} className={`ap-btn ap-btn-sm ${tipo === t.value ? "ap-btn-primary" : ""}`}
                onClick={() => setTipo(t.value)} style={{ fontSize: 12 }}>
                {t.label}
              </button>
            ))}
          </div>
        </div>

        <div>
          <Lbl>Texto</Lbl>
          <textarea className="ap-inp" rows={4} value={texto} placeholder="Descreva a observação, feedback ou informação..."
            onChange={e => setTexto(e.target.value)} style={{ fontSize: 13, resize: "vertical" }} />
        </div>

        <div>
          <Lbl>Tags Rápidas</Lbl>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
            {TAGS_RAPIDAS.map(tag => (
              <button key={tag}
                onClick={() => toggleTag(tag)}
                style={{
                  padding: "4px 12px", borderRadius: 16, fontSize: 12, fontWeight: 500,
                  border: "1px solid",
                  cursor: "pointer", transition: "all 0.15s",
                  background: tags.includes(tag) ? "#4545F518" : "transparent",
                  color: tags.includes(tag) ? "#4545F5" : T.sub,
                  borderColor: tags.includes(tag) ? "#4545F5" : "rgba(0,0,0,0.1)",
                }}>
                {tags.includes(tag) ? "✓ " : ""}{tag}
              </button>
            ))}
          </div>
        </div>

        <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
          <button className="ap-btn ap-btn-sm" onClick={onClose}>Cancelar</button>
          <button className="ap-btn ap-btn-primary ap-btn-sm" onClick={handleSave}>📝 Salvar Registro</button>
        </div>
      </div>
    </Modal>
  );
}

export default RegistroInteracao;
