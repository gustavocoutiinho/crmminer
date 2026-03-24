import React, { useState } from "react";
import { T, ROLE_CFG } from "../../lib/theme";
import { Avatar, Chip, Modal, FormRow, Lbl, KpiCard, SectionHeader } from "../../components/UI";
import { useToast } from "../../context/ToastContext";
import { useSupabaseQuery } from "../../lib/hooks";
import { createUser } from "../../lib/api";

function MarcaEquipe({ isAdmin, user }) {
  const marcaId = user?.marca_id || user?.marcaId;
  const { data: sbUsuarios, loading: loadingUsers, refetch: refetchUsers } = useSupabaseQuery("users", marcaId ? { eq: { marca_id: marcaId } } : {});
  const [localUsuarios, setLocalUsuarios] = useState([]);

  const usuarios = sbUsuarios && sbUsuarios.length > 0 ? sbUsuarios : localUsuarios;
  const setUsuarios = sbUsuarios && sbUsuarios.length > 0 ? () => {} : setLocalUsuarios;

  const [showModal, setShowModal] = useState(false);
  const [search, setSearch] = useState("");
  const [filterRole, setFilterRole] = useState("");
  const [filterStatus, setFilterStatus] = useState("");

  function NovoUser({ onClose }) {
    const toast = useToast();
    const [f, setF] = useState({ nome: "", email: "", password: "", role: "vendedor", loja: "", meta: 30000 });
    const [saving, setSaving] = useState(false);
    const [erro, setErro] = useState("");
    const s = (k, v) => { setF((x) => ({ ...x, [k]: v })); if (erro) setErro(""); };

    const handleCreate = async () => {
      if (!f.nome || !f.email || !f.password) return;
      setSaving(true);
      setErro("");
      try {
        await createUser({ nome: f.nome, email: f.email, password: f.password, role: f.role, loja: f.loja, meta_mensal: f.role === "vendedor" ? f.meta : 0, marca_id: marcaId });
        await refetchUsers();
        toast("Usuário criado com sucesso!", "success");
        onClose();
      } catch (e) {
        if (e.message?.includes("já existe") || e.message?.includes("already") || e.message?.includes("409") || e.message?.includes("duplicate")) {
          setErro("Este email já está cadastrado.");
          toast("Este email já está cadastrado", "error");
        } else {
          setErro(e.message || "Erro ao criar usuário.");
          toast(e.message || "Erro ao criar usuário", "error");
        }
      }
      setSaving(false);
    };

    return (
      <Modal title="Adicionar Usuário" onClose={onClose} width={480}>
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <div><Lbl>Nome Completo *</Lbl><input className="ap-inp" value={f.nome} onChange={(e) => s("nome", e.target.value)} placeholder="Nome completo" /></div>
          <div><Lbl>Email *</Lbl> <input className="ap-inp" type="email" value={f.email} onChange={(e) => s("email", e.target.value)} placeholder="email@marca.com.br" /></div>
          <div><Lbl>Senha *</Lbl> <input className="ap-inp" type="password" value={f.password} onChange={(e) => s("password", e.target.value)} placeholder="Senha do usuário" /></div>
          <div>
            <label className="lbl">Função</label>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 10 }}>
              {["admin", "gerente", "vendedor"].map((r) => (
                <div key={r} onClick={() => s("role", r)} style={{ padding: 12, borderRadius: 12, border: `2px solid ${f.role === r ? ROLE_CFG[r].c : "rgba(0,0,0,0.08)"}`, background: f.role === r ? ROLE_CFG[r].bg : "#fff", cursor: "pointer", textAlign: "center", transition: "all .15s" }}>
                  <div style={{ fontSize: 18, marginBottom: 4 }}>{ROLE_CFG[r].icon}</div>
                  <div style={{ fontSize: 11, fontWeight: 700, color: f.role === r ? ROLE_CFG[r].c : T.sub }}>{ROLE_CFG[r].label}</div>
                </div>
              ))}
            </div>
          </div>
          <FormRow>
            <div><Lbl>Loja</Lbl><input className="ap-inp" value={f.loja} onChange={(e) => s("loja", e.target.value)} placeholder="Loja - Cidade" /></div>
            {f.role === "vendedor" && <div><Lbl>Meta (R$)</Lbl><input className="ap-inp" type="number" value={f.meta} onChange={(e) => s("meta", +e.target.value)} /></div>}
          </FormRow>
          {erro && <div className="fade-in" style={{ background: "#ffe5e3", border: "1px solid rgba(255,59,48,.2)", borderRadius: 10, padding: "10px 14px", fontSize: 13, color: "#ff3b30", fontWeight: 500 }}>{erro}</div>}
          <button className="ap-btn ap-btn-primary" disabled={!f.nome || !f.email || !f.password || saving} onClick={handleCreate}>
            {saving ? "Criando…" : "Criar Usuário →"}
          </button>
        </div>
      </Modal>
    );
  }

  return (
    <div className="fade-up">
      <SectionHeader tag="Gestão" title="Equipe" action={isAdmin && <button className="ap-btn ap-btn-primary" onClick={() => setShowModal(true)}>+ Novo Usuário</button>} />
      <div className="kpi-grid-4" style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 12, marginBottom: 20 }}>
        {[{ l: "Total", v: usuarios.length, c: "#4545F5" }, { l: "Admins", v: usuarios.filter((u) => u.role === "admin").length, c: "#4545F5" }, { l: "Gerentes", v: usuarios.filter((u) => u.role === "gerente").length, c: "#8e44ef" }, { l: "Vendedores", v: usuarios.filter((u) => u.role === "vendedor").length, c: "#28cd41" }].map((k, i) => <KpiCard key={i} label={k.l} value={k.v} color={k.c} />)}
      </div>
      <div style={{ display: "flex", gap: 8, marginBottom: 14, flexWrap: "wrap" }}>
        <input className="ap-inp" placeholder="Buscar..." style={{ flex: 1, minWidth: 200, fontSize: 12, padding: "6px 12px" }} value={search} onChange={e => setSearch(e.target.value)} />
        <select className="ap-inp" style={{ fontSize: 12, padding: "6px 12px", minWidth: 130 }} value={filterRole} onChange={e => setFilterRole(e.target.value)}>
          <option value="">Todas as funções</option>
          <option value="admin">Admin</option>
          <option value="gerente">Gerente</option>
          <option value="vendedor">Vendedor</option>
        </select>
        <select className="ap-inp" style={{ fontSize: 12, padding: "6px 12px", minWidth: 120 }} value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
          <option value="">Todos os status</option>
          <option value="ativo">Ativo</option>
          <option value="inativo">Inativo</option>
        </select>
      </div>
      <div className="ap-card" style={{ padding: 0, overflow: "hidden" }}>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead><tr style={{ borderBottom: "1px solid rgba(0,0,0,0.07)", background: "rgba(0,0,0,0.02)" }}>{["Usuário", "Email", "Função", "Status", "Loja", ...(isAdmin ? ["Ações"] : [])].map((h) => <th key={h} className="ap-th">{h}</th>)}</tr></thead>
          <tbody>
            {usuarios.filter(u => {
              const s = search.toLowerCase();
              if (s && !(u.nome || "").toLowerCase().includes(s) && !(u.email || "").toLowerCase().includes(s)) return false;
              if (filterRole && u.role !== filterRole) return false;
              if (filterStatus && u.status !== filterStatus) return false;
              return true;
            }).map((u, i) => (
              <tr key={i} className="ap-tr">
                <td className="ap-td"><div style={{ display: "flex", alignItems: "center", gap: 10 }}><Avatar nome={u.nome} size={32} /><div style={{ fontSize: 14, fontWeight: 700 }}>{u.nome}</div></div></td>
                <td className="ap-td"><span style={{ fontSize: 13, color: T.sub }}>{u.email}</span></td>
                <td className="ap-td"><Chip label={`${ROLE_CFG[u.role]?.icon} ${ROLE_CFG[u.role]?.label}`} c={ROLE_CFG[u.role]?.c} bg={ROLE_CFG[u.role]?.bg} /></td>
                <td className="ap-td"><Chip label={u.status === "ativo" ? "Ativo" : "Inativo"} c={u.status === "ativo" ? "#28cd41" : "#ff3b30"} bg={u.status === "ativo" ? "#e9fbed" : "#ffe5e3"} /></td>
                <td className="ap-td"><span style={{ fontSize: 13, color: T.sub }}>{u.loja || "Todas"}</span></td>
                {isAdmin && <td className="ap-td">{u.status === "ativo" ? <button className="ap-btn ap-btn-danger ap-btn-sm" onClick={() => setUsuarios((a) => a.map((x) => x.id === u.id ? { ...x, status: "inativo" } : x))}>Suspender</button> : <button className="ap-btn ap-btn-success ap-btn-sm" onClick={() => setUsuarios((a) => a.map((x) => x.id === u.id ? { ...x, status: "ativo" } : x))}>Reativar</button>}</td>}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {showModal && <NovoUser onClose={() => setShowModal(false)} />}
    </div>
  );
}

export default MarcaEquipe;
