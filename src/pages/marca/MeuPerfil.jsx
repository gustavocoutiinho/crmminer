import React, { useState } from "react";
import { T, ROLE_CFG } from "../../lib/theme";
import { Avatar, Chip, FormRow, SectionHeader } from "../../components/UI";
import { useToast } from "../../context/ToastContext";
import { updateProfile, changePassword } from "../../lib/api";

function MeuPerfil({ user, onLogout }) {
  const toast = useToast();
  const [nome, setNome] = useState(user.nome || "");
  const [avatarUrl, setAvatarUrl] = useState(user.avatar_url || "");
  const [saving, setSaving] = useState(false);
  const [profileMsg, setProfileMsg] = useState(null);

  const [curPwd, setCurPwd] = useState("");
  const [newPwd, setNewPwd] = useState("");
  const [confirmPwd, setConfirmPwd] = useState("");
  const [pwdSaving, setPwdSaving] = useState(false);
  const [pwdMsg, setPwdMsg] = useState(null);

  const rd = ROLE_CFG[user.role] || ROLE_CFG.vendedor;

  const handleSaveProfile = async () => {
    setSaving(true); setProfileMsg(null);
    try {
      const changes = {};
      if (nome !== user.nome) changes.nome = nome;
      if (avatarUrl !== (user.avatar_url || "")) changes.avatar_url = avatarUrl;
      if (!Object.keys(changes).length) { setProfileMsg({ ok: false, text: "Nada para atualizar" }); setSaving(false); return; }
      await updateProfile(changes);
      setProfileMsg({ ok: true, text: "Perfil atualizado!" });
      toast("Perfil atualizado!", "success");
    } catch (e) { setProfileMsg({ ok: false, text: e.message }); toast(e.message || "Erro ao salvar perfil", "error"); }
    setSaving(false);
  };

  const handleChangePwd = async () => {
    setPwdMsg(null);
    if (!curPwd || !newPwd) { setPwdMsg({ ok: false, text: "Preencha todos os campos" }); return; }
    if (newPwd.length < 6) { setPwdMsg({ ok: false, text: "Senha deve ter pelo menos 6 caracteres" }); return; }
    if (newPwd !== confirmPwd) { setPwdMsg({ ok: false, text: "Senhas não coincidem" }); return; }
    setPwdSaving(true);
    try {
      await changePassword(curPwd, newPwd);
      setPwdMsg({ ok: true, text: "Senha alterada com sucesso!" });
      toast("Senha alterada com sucesso!", "success");
      setCurPwd(""); setNewPwd(""); setConfirmPwd("");
    } catch (e) { setPwdMsg({ ok: false, text: e.message }); toast(e.message || "Erro ao alterar senha", "error"); }
    setPwdSaving(false);
  };

  const inputStyle = { width: "100%", padding: "10px 12px", borderRadius: 10, border: `1px solid ${T.border}`, fontSize: 14, background: T.bg, outline: "none", boxSizing: "border-box" };
  const readOnlyStyle = { ...inputStyle, background: "#f5f5f7", color: T.muted, cursor: "default" };

  return (
    <div>
      <SectionHeader tag="Conta" title="Meu Perfil" />
      <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: 24, marginTop: 20 }}>
        {/* Left column — Profile */}
        <div className="ap-card" style={{ padding: 28 }}>
          <div style={{ display: "flex", justifyContent: "center", marginBottom: 20 }}>
            <Avatar nome={nome || user.nome} size={64} />
          </div>

          <FormRow label="Nome">
            <input style={inputStyle} value={nome} onChange={e => setNome(e.target.value)} placeholder="Seu nome" />
          </FormRow>

          <FormRow label="E-mail">
            <input style={readOnlyStyle} value={user.email || ""} readOnly />
          </FormRow>

          <FormRow label="Função">
            <div style={{ padding: "6px 0" }}>
              <Chip label={rd.label} color={rd.c} bg={rd.bg} />
            </div>
          </FormRow>

          {user.marca_nome && (
            <FormRow label="Marca">
              <input style={readOnlyStyle} value={user.marca_nome} readOnly />
            </FormRow>
          )}

          {user.loja_nome && (
            <FormRow label="Loja">
              <input style={readOnlyStyle} value={user.loja_nome} readOnly />
            </FormRow>
          )}

          <div style={{ marginTop: 18, display: "flex", alignItems: "center", gap: 12 }}>
            <button className="ap-btn ap-btn-primary" onClick={handleSaveProfile} disabled={saving}>
              {saving ? "Salvando..." : "Salvar"}
            </button>
            {profileMsg && <span style={{ fontSize: 13, color: profileMsg.ok ? "#28cd41" : "#ff3b30", fontWeight: 600 }}>{profileMsg.text}</span>}
          </div>
        </div>

        {/* Right column — Account */}
        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          <div className="ap-card" style={{ padding: 24 }}>
            <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 16 }}>🔒 Alterar Senha</h3>

            <FormRow label="Senha atual">
              <input style={inputStyle} type="password" value={curPwd} onChange={e => setCurPwd(e.target.value)} placeholder="••••••" />
            </FormRow>

            <FormRow label="Nova senha">
              <input style={inputStyle} type="password" value={newPwd} onChange={e => setNewPwd(e.target.value)} placeholder="Mínimo 6 caracteres" />
            </FormRow>

            <FormRow label="Confirmar senha">
              <input style={inputStyle} type="password" value={confirmPwd} onChange={e => setConfirmPwd(e.target.value)} placeholder="Repita a nova senha" />
            </FormRow>

            <div style={{ marginTop: 14, display: "flex", alignItems: "center", gap: 12 }}>
              <button className="ap-btn ap-btn-primary" onClick={handleChangePwd} disabled={pwdSaving}>
                {pwdSaving ? "Alterando..." : "Alterar Senha"}
              </button>
              {pwdMsg && <span style={{ fontSize: 13, color: pwdMsg.ok ? "#28cd41" : "#ff3b30", fontWeight: 600 }}>{pwdMsg.text}</span>}
            </div>
          </div>

          <div className="ap-card" style={{ padding: 24 }}>
            <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 16 }}>📱 Sessão</h3>
            <div style={{ fontSize: 13, color: T.muted, marginBottom: 14 }}>
              Logado como <strong>{user.email}</strong>
            </div>
            <button className="ap-btn" onClick={onLogout} style={{ color: "#ff3b30", borderColor: "#ff3b30" }}>
              ← Sair da conta
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── ONBOARDING BANNER ─────────────────────────────────────────────────────────
const ONBOARD_STEPS = [
  { key: "dados_marca", icon: "🏢", label: "Dados da Marca", page: "config", desc: "Preencha email e segmento" },
  { key: "equipe", icon: "👥", label: "Adicione sua Equipe", page: "usuarios", desc: "Convide vendedores e supervisores" },
  { key: "clientes", icon: "🙍", label: "Importe Clientes", page: "exportar", desc: "CSV ou sincronize com Shopify" },
  { key: "integracoes", icon: "🔌", label: "Conecte Integrações", page: "integracoes", desc: "WhatsApp, Shopify, etc" },
];

export default MeuPerfil;
