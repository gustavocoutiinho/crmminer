import React, { useState, useEffect } from "react";
import { T } from "../../lib/theme";
import { Modal } from "../../components/UI";
import { fetchTags, createTag, updateTag, deleteTag } from "../../lib/api";

const TAG_COLORS = ["#4545F5","#28cd41","#ff9500","#ff3b30","#8e44ef","#007aff","#ff6b35","#00c7be","#ffd60a","#ff2d55"];

function TagsManager({ marcaId }) {
  const [tags, setTags] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showNew, setShowNew] = useState(false);
  const [newNome, setNewNome] = useState("");
  const [newCor, setNewCor] = useState(TAG_COLORS[0]);
  const [saving, setSaving] = useState(false);
  const [editId, setEditId] = useState(null);
  const [editNome, setEditNome] = useState("");
  const [editCor, setEditCor] = useState("");
  const [deleteConfirm, setDeleteConfirm] = useState(null);

  const load = () => { setLoading(true); fetchTags().then(r => { setTags(r.data || []); setLoading(false); }).catch(() => setLoading(false)); };
  useEffect(() => { load(); }, []);

  const handleCreate = async () => {
    if (!newNome.trim()) return;
    setSaving(true);
    try { await createTag({ nome: newNome.trim(), cor: newCor }); setNewNome(""); setNewCor(TAG_COLORS[0]); setShowNew(false); load(); } catch (e) { alert(e.message); }
    setSaving(false);
  };

  const handleUpdate = async (id) => {
    setSaving(true);
    try { await updateTag(id, { nome: editNome.trim(), cor: editCor }); setEditId(null); load(); } catch (e) { alert(e.message); }
    setSaving(false);
  };

  const handleDelete = async (tag) => {
    try { await deleteTag(tag.id); setDeleteConfirm(null); load(); } catch (e) { alert(e.message); }
  };

  const startEdit = (tag) => { setEditId(tag.id); setEditNome(tag.nome); setEditCor(tag.cor || TAG_COLORS[0]); };

  const ColorPicker = ({ value, onChange }) => (
    <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
      {TAG_COLORS.map(c => (
        <button key={c} onClick={() => onChange(c)} style={{ width: 24, height: 24, borderRadius: 12, background: c, border: value === c ? "2.5px solid #000" : "2px solid transparent", cursor: "pointer", transition: "all .15s", transform: value === c ? "scale(1.15)" : "scale(1)" }} />
      ))}
    </div>
  );

  return (
    <div className="ap-card" style={{ padding: 24 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 18 }}>
        <div style={{ fontSize: 15, fontWeight: 700 }}>Tags</div>
        <button className="ap-btn ap-btn-primary ap-btn-sm" onClick={() => { setShowNew(true); setEditId(null); }}>+ Nova Tag</button>
      </div>

      {showNew && (
        <div className="fade-in" style={{ background: "rgba(0,0,0,0.03)", borderRadius: 12, padding: 16, marginBottom: 16, display: "flex", flexDirection: "column", gap: 12 }}>
          <input className="ap-inp" placeholder="Nome da tag..." value={newNome} onChange={e => setNewNome(e.target.value)} autoFocus style={{ fontSize: 14 }} />
          <ColorPicker value={newCor} onChange={setNewCor} />
          <div style={{ display: "flex", gap: 8 }}>
            <button className="ap-btn ap-btn-primary ap-btn-sm" disabled={saving || !newNome.trim()} onClick={handleCreate}>{saving ? "Criando…" : "Criar Tag"}</button>
            <button className="ap-btn ap-btn-secondary ap-btn-sm" onClick={() => setShowNew(false)}>Cancelar</button>
          </div>
        </div>
      )}

      {loading && <div style={{ textAlign: "center", padding: 30, color: T.muted }}>⏳ Carregando tags...</div>}

      {!loading && tags.length === 0 && <div style={{ textAlign: "center", padding: 30, color: T.muted }}>Nenhuma tag criada ainda.</div>}

      {!loading && tags.length > 0 && (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {tags.map(tag => (
            <div key={tag.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 12px", borderRadius: 10, background: editId === tag.id ? "rgba(0,0,0,0.04)" : "transparent", transition: "background .15s" }}>
              {editId === tag.id ? (
                <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 10 }}>
                  <input className="ap-inp" value={editNome} onChange={e => setEditNome(e.target.value)} style={{ fontSize: 14 }} />
                  <ColorPicker value={editCor} onChange={setEditCor} />
                  <div style={{ display: "flex", gap: 8 }}>
                    <button className="ap-btn ap-btn-primary ap-btn-sm" disabled={saving || !editNome.trim()} onClick={() => handleUpdate(tag.id)}>{saving ? "Salvando…" : "Salvar"}</button>
                    <button className="ap-btn ap-btn-secondary ap-btn-sm" onClick={() => setEditId(null)}>Cancelar</button>
                  </div>
                </div>
              ) : (
                <>
                  <span style={{ display: "inline-flex", alignItems: "center", gap: 6, background: `${tag.cor || TAG_COLORS[0]}18`, color: tag.cor || TAG_COLORS[0], borderRadius: 20, padding: "5px 14px", fontSize: 13, fontWeight: 600 }}>
                    <span style={{ width: 8, height: 8, borderRadius: 4, background: tag.cor || TAG_COLORS[0] }} />
                    {tag.nome}
                  </span>
                  <span style={{ fontSize: 11, color: T.muted, fontWeight: 500 }}>{tag.uso} cliente{tag.uso !== 1 ? "s" : ""}</span>
                  <div style={{ marginLeft: "auto", display: "flex", gap: 6 }}>
                    <button style={{ background: "none", border: "none", cursor: "pointer", fontSize: 14, padding: 4 }} title="Editar" onClick={() => startEdit(tag)}>✏️</button>
                    <button style={{ background: "none", border: "none", cursor: "pointer", fontSize: 14, padding: 4 }} title="Excluir" onClick={() => setDeleteConfirm(tag)}>🗑</button>
                  </div>
                </>
              )}
            </div>
          ))}
        </div>
      )}

      {deleteConfirm && (
        <Modal title="Confirmar Exclusão" onClose={() => setDeleteConfirm(null)} width={400}>
          <div style={{ padding: "8px 0", fontSize: 14, lineHeight: 1.6 }}>
            Tem certeza que deseja excluir a tag <strong style={{ color: deleteConfirm.cor }}>{deleteConfirm.nome}</strong>?
            {deleteConfirm.uso > 0 && <div style={{ marginTop: 8, color: "#ff3b30", fontWeight: 600 }}>⚠️ Será removida de {deleteConfirm.uso} cliente{deleteConfirm.uso !== 1 ? "s" : ""}.</div>}
          </div>
          <div style={{ display: "flex", gap: 8, marginTop: 16, justifyContent: "flex-end" }}>
            <button className="ap-btn ap-btn-secondary ap-btn-sm" onClick={() => setDeleteConfirm(null)}>Cancelar</button>
            <button className="ap-btn ap-btn-sm" style={{ background: "#ff3b30", color: "#fff" }} onClick={() => handleDelete(deleteConfirm)}>Excluir Tag</button>
          </div>
        </Modal>
      )}
    </div>
  );
}

export default TagsManager;
