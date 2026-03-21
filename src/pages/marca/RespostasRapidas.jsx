import React, { useState, useMemo } from "react";
import { T } from "../../lib/theme";
import { Chip, SectionHeader, Modal, Lbl } from "../../components/UI";
import { useToast } from "../../context/ToastContext";
import { DB_FALLBACK } from "../../data/fallback";

const CATEGORIAS = [
  { k: "todas", label: "Todas", icon: "📋" },
  { k: "saudacao", label: "Saudação", icon: "👋" },
  { k: "pos_venda", label: "Pós-venda", icon: "📦" },
  { k: "cobranca", label: "Cobrança", icon: "💳" },
  { k: "promocao", label: "Promoção", icon: "🎁" },
  { k: "suporte", label: "Suporte", icon: "🔧" },
];

const CAT_COLOR = {
  saudacao: { c: "#007aff", bg: "#e8f4ff" },
  pos_venda: { c: "#28cd41", bg: "#e9fbed" },
  cobranca: { c: "#ff9500", bg: "#fff3e0" },
  promocao: { c: "#8e44ef", bg: "#f5eaff" },
  suporte: { c: "#ff3b30", bg: "#fff0f0" },
  geral: { c: "#6e6e73", bg: "#f0f0f0" },
};

const VARIAVEIS = [
  { key: "{nome_cliente}", desc: "Nome do cliente" },
  { key: "{nome_vendedor}", desc: "Nome do vendedor" },
  { key: "{nome_marca}", desc: "Nome da marca" },
  { key: "{ultimo_pedido}", desc: "Último pedido" },
  { key: "{pontos_fidelidade}", desc: "Pontos de fidelidade" },
];

function RespostasRapidas({ user, onUseResposta, inModal = false }) {
  const toast = useToast();
  const [respostas, setRespostas] = useState(() => DB_FALLBACK.respostas_rapidas || []);
  const [search, setSearch] = useState("");
  const [catFilter, setCatFilter] = useState("todas");
  const [editItem, setEditItem] = useState(null);
  const [showCreate, setShowCreate] = useState(false);
  const [previewCliente] = useState({ nome: "Maria Silva", pontos: 1850 });

  const filtered = useMemo(() => {
    return respostas
      .filter((r) => {
        if (catFilter !== "todas" && r.categoria !== catFilter) return false;
        if (search) {
          const s = search.toLowerCase();
          return (
            (r.titulo || "").toLowerCase().includes(s) ||
            (r.texto || "").toLowerCase().includes(s)
          );
        }
        return true;
      })
      .sort((a, b) => (b.usos || 0) - (a.usos || 0));
  }, [respostas, search, catFilter]);

  const previewText = (texto) => {
    return (texto || "")
      .replace(/{nome_cliente}/g, previewCliente.nome)
      .replace(/{nome_vendedor}/g, user?.nome?.split(" ")[0] || "Vendedor")
      .replace(/{nome_marca}/g, "Demo Store")
      .replace(/{ultimo_pedido}/g, "#4521")
      .replace(/{pontos_fidelidade}/g, previewCliente.pontos.toLocaleString("pt-BR"));
  };

  const handleUse = (resposta) => {
    const text = previewText(resposta.texto);
    if (onUseResposta) {
      onUseResposta(text);
    } else {
      navigator.clipboard.writeText(text).catch(() => {});
      toast("Resposta copiada!", "success");
    }
    // Increment usage
    setRespostas((prev) =>
      prev.map((r) => (r.id === resposta.id ? { ...r, usos: (r.usos || 0) + 1 } : r))
    );
  };

  function RespostaForm({ item, onClose }) {
    const isEdit = !!item;
    const [f, setF] = useState(
      item
        ? { titulo: item.titulo, categoria: item.categoria, texto: item.texto }
        : { titulo: "", categoria: "geral", texto: "" }
    );
    const s = (k, v) => setF((prev) => ({ ...prev, [k]: v }));

    const handleSave = () => {
      if (!f.titulo.trim() || !f.texto.trim()) return toast("Preencha título e texto", "error");
      if (isEdit) {
        setRespostas((prev) =>
          prev.map((r) => (r.id === item.id ? { ...r, ...f } : r))
        );
        toast("Resposta atualizada!", "success");
      } else {
        const newR = {
          id: `rr_${Date.now()}`,
          marca_id: "demo",
          ...f,
          usos: 0,
        };
        setRespostas((prev) => [...prev, newR]);
        toast("Resposta criada!", "success");
      }
      onClose();
    };

    return (
      <Modal title={isEdit ? "Editar Resposta" : "Nova Resposta"} onClose={onClose} width={500}>
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <div>
            <Lbl>Título</Lbl>
            <input className="ap-inp" value={f.titulo} onChange={(e) => s("titulo", e.target.value)} placeholder="Ex: Boas-vindas" />
          </div>
          <div>
            <Lbl>Categoria</Lbl>
            <select className="ap-inp" value={f.categoria} onChange={(e) => s("categoria", e.target.value)}>
              {CATEGORIAS.filter((c) => c.k !== "todas").map((c) => (
                <option key={c.k} value={c.k}>{c.icon} {c.label}</option>
              ))}
            </select>
          </div>
          <div>
            <Lbl>Texto da resposta</Lbl>
            <textarea className="ap-inp" rows={5} value={f.texto} onChange={(e) => s("texto", e.target.value)} placeholder="Olá {nome_cliente}! Como posso te ajudar?" style={{ resize: "vertical", fontFamily: "var(--mono)", fontSize: 12 }} />
            <div style={{ fontSize: 11, color: T.muted, marginTop: 4, display: "flex", flexWrap: "wrap", gap: 6 }}>
              Variáveis:{" "}
              {VARIAVEIS.map((v) => (
                <span key={v.key} onClick={() => s("texto", f.texto + v.key)} style={{ cursor: "pointer", color: "#4545F5", fontFamily: "var(--mono)" }}>
                  {v.key}
                </span>
              ))}
            </div>
          </div>
          {f.texto && (
            <div>
              <Lbl>Preview</Lbl>
              <div style={{ padding: "10px 14px", borderRadius: 10, background: "#f5f5f7", fontSize: 13, lineHeight: 1.5 }}>
                {previewText(f.texto)}
              </div>
            </div>
          )}
          <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 8 }}>
            <button className="ap-btn ap-btn-secondary" onClick={onClose}>Cancelar</button>
            <button className="ap-btn ap-btn-primary" onClick={handleSave}>{isEdit ? "Salvar" : "Criar"}</button>
          </div>
        </div>
      </Modal>
    );
  }

  return (
    <div className={inModal ? "" : "fade-up"}>
      {!inModal && (
        <SectionHeader
          tag="Atendimento"
          title="Respostas Rápidas"
          action={
            <button className="ap-btn ap-btn-primary" onClick={() => setShowCreate(true)}>
              + Nova Resposta
            </button>
          }
        />
      )}

      {/* Filters */}
      <div style={{ display: "flex", gap: 8, marginBottom: 14, flexWrap: "wrap", alignItems: "center" }}>
        <input className="ap-inp" placeholder="Buscar resposta..." value={search} onChange={(e) => setSearch(e.target.value)} style={{ maxWidth: 220, fontSize: 13 }} />
        <div className="seg" style={{ display: "inline-flex", gap: 2 }}>
          {CATEGORIAS.map((c) => (
            <button key={c.k} className={`seg-btn ${catFilter === c.k ? "on" : ""}`} onClick={() => setCatFilter(c.k)} style={{ fontSize: 11 }}>
              {c.icon} {c.label}
            </button>
          ))}
        </div>
        {inModal && (
          <button className="ap-btn ap-btn-sm" onClick={() => setShowCreate(true)} style={{ marginLeft: "auto", fontSize: 11 }}>
            + Nova
          </button>
        )}
      </div>

      {/* List */}
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {filtered.length === 0 && (
          <div style={{ textAlign: "center", padding: 30, color: T.muted, fontSize: 13 }}>Nenhuma resposta encontrada</div>
        )}
        {filtered.map((r) => {
          const cc = CAT_COLOR[r.categoria] || CAT_COLOR.geral;
          return (
            <div key={r.id} className="ap-card" style={{ padding: "14px 18px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
                <span style={{ fontSize: 14, fontWeight: 700, flex: 1 }}>{r.titulo}</span>
                <Chip label={r.categoria} c={cc.c} bg={cc.bg} />
                <span style={{ fontSize: 11, color: T.muted }}>{r.usos || 0} usos</span>
              </div>
              <div style={{ fontSize: 12, color: T.sub, lineHeight: 1.5, marginBottom: 8, background: "rgba(0,0,0,0.02)", padding: "8px 10px", borderRadius: 8 }}>
                {previewText(r.texto)}
              </div>
              <div style={{ display: "flex", gap: 6 }}>
                <button className="ap-btn ap-btn-primary" onClick={() => handleUse(r)} style={{ fontSize: 11, padding: "4px 12px" }}>
                  ⚡ Usar
                </button>
                <button className="ap-btn ap-btn-sm" onClick={() => setEditItem(r)} style={{ fontSize: 11 }}>
                  ✏️ Editar
                </button>
                <button
                  className="ap-btn ap-btn-sm"
                  onClick={() => {
                    setRespostas((prev) => prev.filter((x) => x.id !== r.id));
                    toast("Resposta excluída", "success");
                  }}
                  style={{ fontSize: 11, color: "#ff3b30" }}
                >
                  🗑
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {showCreate && <RespostaForm onClose={() => setShowCreate(false)} />}
      {editItem && <RespostaForm item={editItem} onClose={() => setEditItem(null)} />}
    </div>
  );
}

export default RespostasRapidas;
