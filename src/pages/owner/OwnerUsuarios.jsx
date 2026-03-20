import React, { useState, useEffect } from "react";
import { T } from "../../lib/theme";
import { Avatar, Chip, Modal, FormRow, Lbl, SectionHeader } from "../../components/UI";
import { fetchAdminUsers, patchAdminUser, resetAdminUserPassword, createUser, fetchData } from "../../lib/api";

function OwnerUsuarios() {
  const [users, setUsers] = useState([]);
  const [marcas, setMarcas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const [editing, setEditing] = useState(null);
  const [resetPw, setResetPw] = useState(null);
  const [newPw, setNewPw] = useState("");
  const [saving, setSaving] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const [createForm, setCreateForm] = useState({ nome: "", email: "", role: "vendedor", marca_id: "", password: "" });

  const loadData = async () => {
    try {
      const [uRes, mRes] = await Promise.all([fetchAdminUsers(), fetchData("marcas")]);
      setUsers(uRes.data || []);
      setMarcas(mRes || []);
    } catch (e) { console.error(e); }
    setLoading(false);
  };
  useEffect(() => { loadData(); }, []);

  const filtered = users.filter(u => {
    const q = filter.toLowerCase();
    const matchText = !q || u.nome?.toLowerCase().includes(q) || u.email?.toLowerCase().includes(q) || u.marca_nome?.toLowerCase().includes(q);
    const matchRole = roleFilter === "all" || u.role === roleFilter;
    return matchText && matchRole;
  });

  const handlePatch = async (id, data) => {
    setSaving(true);
    try {
      await patchAdminUser(id, data);
      await loadData();
      setEditing(null);
    } catch (e) { alert("Erro: " + e.message); }
    setSaving(false);
  };

  const handleResetPassword = async () => {
    if (!newPw || newPw.length < 6) { alert("Senha mínima 6 caracteres"); return; }
    setSaving(true);
    try {
      await resetAdminUserPassword(resetPw.id, newPw);
      alert("Senha alterada com sucesso!");
      setResetPw(null); setNewPw("");
    } catch (e) { alert("Erro: " + e.message); }
    setSaving(false);
  };

  const handleCreate = async () => {
    if (!createForm.nome || !createForm.email || !createForm.password) { alert("Preencha nome, email e senha"); return; }
    setSaving(true);
    try {
      await createUser({ ...createForm, marca_id: createForm.marca_id || null });
      setShowCreate(false);
      setCreateForm({ nome: "", email: "", role: "vendedor", marca_id: "", password: "" });
      await loadData();
    } catch (e) { alert("Erro: " + e.message); }
    setSaving(false);
  };

  const ROLE_OPTS = [
    { value: "miner", label: "🔱 Miner (Admin)" },
    { value: "dono", label: "👑 Dono" },
    { value: "gerente", label: "📊 Gerente" },
    { value: "vendedor", label: "💼 Vendedor" },
  ];

  if (loading) return <div style={{ textAlign: "center", padding: 60, color: T.muted }}>Carregando usuários...</div>;

  return (
    <div className="fade-up">
      <SectionHeader tag="Admin" title="Todos os Usuários" />
      <div style={{ display: "flex", gap: 12, marginBottom: 16, alignItems: "center", flexWrap: "wrap" }}>
        <input className="ap-inp" value={filter} onChange={e => setFilter(e.target.value)} placeholder="Buscar por nome, email ou marca..." style={{ flex: 1, minWidth: 200 }} />
        <select className="ap-inp" value={roleFilter} onChange={e => setRoleFilter(e.target.value)} style={{ width: 160 }}>
          <option value="all">Todos os roles</option>
          {ROLE_OPTS.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
        </select>
        <button className="ap-btn" style={{ background: "#4545F5", color: "#fff", border: "none", padding: "10px 20px", borderRadius: 10, fontWeight: 700, cursor: "pointer" }} onClick={() => setShowCreate(true)}>+ Novo Usuário</button>
      </div>
      <div style={{ fontSize: 12, color: T.muted, marginBottom: 10 }}>{filtered.length} usuário(s) encontrado(s)</div>

      <div className="ap-card" style={{ padding: 0, overflow: "hidden" }}>
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
            <thead>
              <tr style={{ background: "rgba(0,0,0,0.02)" }}>
                {["Nome", "Email", "Role", "Marca", "Status", "Último Login", "Ações"].map(h => (
                  <th key={h} style={{ padding: "10px 14px", textAlign: "left", fontWeight: 700, fontSize: 11, color: T.muted, textTransform: "uppercase", letterSpacing: "0.5px" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map(u => (
                <tr key={u.id} style={{ borderBottom: "1px solid rgba(0,0,0,0.04)" }}>
                  <td style={{ padding: "12px 14px", fontWeight: 600 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <Avatar nome={u.nome || "?"} size={28} />
                      {u.nome || "—"}
                    </div>
                  </td>
                  <td style={{ padding: "12px 14px", color: T.sub, fontSize: 12 }}>{u.email}</td>
                  <td style={{ padding: "12px 14px" }}>
                    <Chip label={ROLE_OPTS.find(r => r.value === u.role)?.label || u.role} c={u.role === "miner" ? "#4545F5" : u.role === "dono" ? "#8e44ef" : u.role === "gerente" ? "#ff9500" : "#28cd41"} bg={u.role === "miner" ? "#4545F515" : u.role === "dono" ? "#8e44ef15" : u.role === "gerente" ? "#ff950015" : "#28cd4115"} />
                  </td>
                  <td style={{ padding: "12px 14px", fontSize: 12 }}>{u.marca_nome || <span style={{ color: T.muted }}>—</span>}</td>
                  <td style={{ padding: "12px 14px" }}>
                    <Chip label={u.status === "ativo" ? "Ativo" : "Inativo"} c={u.status === "ativo" ? "#28cd41" : "#ff3b30"} bg={u.status === "ativo" ? "#28cd4115" : "#ff3b3015"} />
                  </td>
                  <td style={{ padding: "12px 14px", fontSize: 11, color: T.muted }}>{u.last_login ? new Date(u.last_login).toLocaleString("pt-BR") : "Nunca"}</td>
                  <td style={{ padding: "12px 14px" }}>
                    <div style={{ display: "flex", gap: 6 }}>
                      <button onClick={() => setEditing(u)} style={{ background: "#4545F510", color: "#4545F5", border: "none", padding: "5px 10px", borderRadius: 7, fontSize: 11, fontWeight: 700, cursor: "pointer" }} title="Editar">✏️</button>
                      <button onClick={() => setResetPw(u)} style={{ background: "#ff950010", color: "#ff9500", border: "none", padding: "5px 10px", borderRadius: 7, fontSize: 11, fontWeight: 700, cursor: "pointer" }} title="Resetar Senha">🔑</button>
                      <button onClick={() => handlePatch(u.id, { status: u.status === "ativo" ? "inativo" : "ativo" })} style={{ background: u.status === "ativo" ? "#ff3b3010" : "#28cd4110", color: u.status === "ativo" ? "#ff3b30" : "#28cd41", border: "none", padding: "5px 10px", borderRadius: 7, fontSize: 11, fontWeight: 700, cursor: "pointer" }} title={u.status === "ativo" ? "Desativar" : "Ativar"}>{u.status === "ativo" ? "🚫" : "✅"}</button>
                    </div>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && <tr><td colSpan={7} style={{ padding: 30, textAlign: "center", color: T.muted }}>Nenhum usuário encontrado</td></tr>}
            </tbody>
          </table>
        </div>
      </div>

      {/* Edit Modal */}
      {editing && (
        <Modal title={`Editar: ${editing.nome}`} onClose={() => setEditing(null)} width={480}>
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <div><Lbl>Nome</Lbl><input className="ap-inp" defaultValue={editing.nome} onChange={e => editing._nome = e.target.value} /></div>
            <div><Lbl>Role</Lbl>
              <select className="ap-inp" defaultValue={editing.role} onChange={e => editing._role = e.target.value}>
                {ROLE_OPTS.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
              </select>
            </div>
            <div><Lbl>Marca</Lbl>
              <select className="ap-inp" defaultValue={editing.marca_id || ""} onChange={e => editing._marca_id = e.target.value}>
                <option value="">Sem marca</option>
                {marcas.map(m => <option key={m.id} value={m.id}>{m.nome}</option>)}
              </select>
            </div>
            <div><Lbl>Meta Mensal (R$)</Lbl><input className="ap-inp" type="number" defaultValue={editing.meta_mensal || 0} onChange={e => editing._meta = e.target.value} /></div>
            <button className="ap-btn" disabled={saving} onClick={() => {
              const data = {};
              if (editing._nome) data.nome = editing._nome;
              if (editing._role) data.role = editing._role;
              if (editing._marca_id !== undefined) data.marca_id = editing._marca_id || null;
              if (editing._meta !== undefined) data.meta_mensal = +editing._meta;
              handlePatch(editing.id, data);
            }} style={{ background: "#4545F5", color: "#fff", border: "none", padding: "12px", borderRadius: 10, fontWeight: 700, cursor: "pointer" }}>
              {saving ? "Salvando..." : "Salvar Alterações"}
            </button>
          </div>
        </Modal>
      )}

      {/* Reset Password Modal */}
      {resetPw && (
        <Modal title={`Resetar Senha: ${resetPw.nome}`} onClose={() => { setResetPw(null); setNewPw(""); }} width={400}>
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <div><Lbl>Nova Senha</Lbl><input className="ap-inp" type="password" value={newPw} onChange={e => setNewPw(e.target.value)} placeholder="Mínimo 6 caracteres" /></div>
            <button className="ap-btn" disabled={saving} onClick={handleResetPassword} style={{ background: "#ff9500", color: "#fff", border: "none", padding: "12px", borderRadius: 10, fontWeight: 700, cursor: "pointer" }}>
              {saving ? "Alterando..." : "Alterar Senha"}
            </button>
          </div>
        </Modal>
      )}

      {/* Create User Modal */}
      {showCreate && (
        <Modal title="Novo Usuário" onClose={() => setShowCreate(false)} width={480}>
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <div><Lbl>Nome *</Lbl><input className="ap-inp" value={createForm.nome} onChange={e => setCreateForm(f => ({...f, nome: e.target.value}))} /></div>
            <div><Lbl>Email *</Lbl><input className="ap-inp" type="email" value={createForm.email} onChange={e => setCreateForm(f => ({...f, email: e.target.value}))} /></div>
            <div><Lbl>Senha *</Lbl><input className="ap-inp" type="password" value={createForm.password} onChange={e => setCreateForm(f => ({...f, password: e.target.value}))} placeholder="Mínimo 6 caracteres" /></div>
            <div><Lbl>Role</Lbl>
              <select className="ap-inp" value={createForm.role} onChange={e => setCreateForm(f => ({...f, role: e.target.value}))}>
                {ROLE_OPTS.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
              </select>
            </div>
            <div><Lbl>Marca</Lbl>
              <select className="ap-inp" value={createForm.marca_id} onChange={e => setCreateForm(f => ({...f, marca_id: e.target.value}))}>
                <option value="">Sem marca</option>
                {marcas.map(m => <option key={m.id} value={m.id}>{m.nome}</option>)}
              </select>
            </div>
            <button className="ap-btn" disabled={saving} onClick={handleCreate} style={{ background: "#28cd41", color: "#fff", border: "none", padding: "12px", borderRadius: 10, fontWeight: 700, cursor: "pointer" }}>
              {saving ? "Criando..." : "Criar Usuário"}
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
}


export default OwnerUsuarios;
