import React, { useState, useEffect, useRef } from "react";
import { useToast } from "../context/ToastContext";
import { MinerLogo } from "../components/UI";
import { login as apiLogin, googleLogin as apiGoogleLogin, register as apiRegister, forgotPassword, resetPassword } from "../lib/api";

const STYLES_IMPORT = null; // CSS is now in global.css

function Login({ onLogin }) {
  const toast = useToast();
  const [mode, setMode] = useState("login"); // "login" | "register" | "forgot" | "reset"
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [nome, setNome] = useState("");
  const [confirmSenha, setConfirmSenha] = useState("");
  const [erro, setErro] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPwd, setShowPwd] = useState(false);
  const [shake, setShake] = useState(false);
  const [forgotSent, setForgotSent] = useState(false);
  const [resetToken, setResetToken] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmNew, setConfirmNew] = useState("");
  const [successMsg, setSuccessMsg] = useState("");
  const pwdRef = useRef(null);

  const clearErro = () => { if (erro) setErro(""); };
  const chEmail = (v) => { setEmail(v); clearErro(); };
  const chSenha = (v) => { setSenha(v); clearErro(); };

  const handleUserResult = (u, msg) => {
    toast(msg, "success");
    onLogin({
      id: u.id, email: u.email, nome: u.nome,
      tipo: u.role === "miner" ? "owner" : "marca",
      role: u.role, marcaId: u.marca_id, marca_id: u.marca_id, marca: u.marca, loja: u.loja,
    });
  };

  const doLogin = async () => {
    setLoading(true);
    setErro("");
    try {
      const result = await apiLogin(email.trim(), senha);
      if (result?.user) { handleUserResult(result.user, "Bem-vindo de volta! 👋"); return; }
    } catch (apiErr) {
      console.log("[Login] API error:", apiErr.message);
      toast("Email ou senha incorretos", "error");
      setErro("Email ou senha incorretos.");
      setShake(true); setTimeout(() => setShake(false), 450);
      setLoading(false);
    }
  };

  const doRegister = async () => {
    if (senha !== confirmSenha) { setErro("As senhas não coincidem."); setShake(true); setTimeout(() => setShake(false), 450); return; }
    if (senha.length < 6) { setErro("Senha deve ter pelo menos 6 caracteres."); return; }
    setLoading(true);
    setErro("");
    try {
      const result = await apiRegister(nome.trim(), email.trim(), senha);
      if (result?.user) { handleUserResult(result.user, "Conta criada com sucesso! 🎉"); return; }
    } catch (err) {
      toast(err.message || "Erro ao cadastrar", "error");
      setErro(err.message || "Erro ao cadastrar.");
    }
    setShake(true); setTimeout(() => setShake(false), 450);
    setLoading(false);
  };

  const handleForgot = async () => {
    if (!email.trim()) { setErro("Digite seu email."); return; }
    setLoading(true); setErro("");
    try {
      await forgotPassword(email.trim());
      setForgotSent(true);
      toast("Link de redefinição enviado!", "success");
    } catch (e) { setErro(e.message || "Erro ao enviar."); }
    setLoading(false);
  };

  const handleReset = async () => {
    if (!resetToken.trim()) { setErro("Cole o código de redefinição."); return; }
    if (newPassword.length < 6) { setErro("Senha deve ter no mínimo 6 caracteres."); return; }
    if (newPassword !== confirmNew) { setErro("As senhas não coincidem."); return; }
    setLoading(true); setErro("");
    try {
      const r = await resetPassword(resetToken.trim(), newPassword);
      if (r.ok) {
        setSuccessMsg("Senha redefinida com sucesso! Faça login.");
        setTimeout(() => { setMode("login"); setSuccessMsg(""); setForgotSent(false); setResetToken(""); setNewPassword(""); setConfirmNew(""); }, 3000);
      }
    } catch (e) { setErro(e.message || "Token inválido ou expirado."); }
    setLoading(false);
  };

  // Password strength
  const getPasswordStrength = (pwd) => {
    if (!pwd) return { level: 0, label: "", color: "#ddd" };
    let score = 0;
    if (pwd.length >= 6) score++;
    if (pwd.length >= 8) score++;
    if (/[A-Z]/.test(pwd)) score++;
    if (/[0-9]/.test(pwd)) score++;
    if (/[^a-zA-Z0-9]/.test(pwd)) score++;
    if (score <= 1) return { level: 1, label: "Fraca", color: "#ff3b30" };
    if (score <= 2) return { level: 2, label: "Razoável", color: "#ff9500" };
    if (score <= 3) return { level: 3, label: "Boa", color: "#28cd41" };
    return { level: 4, label: "Forte", color: "#007aff" };
  };

  // Google Sign-In
  useEffect(() => {
    const GOOGLE_CLIENT_ID = "PLACEHOLDER_GOOGLE_CLIENT_ID";
    if (document.getElementById("gsi-script")) return;
    const script = document.createElement("script");
    script.id = "gsi-script";
    script.src = "https://accounts.google.com/gsi/client";
    script.async = true;
    script.defer = true;
    script.onload = () => {
      if (window.google?.accounts?.id) {
        window.google.accounts.id.initialize({
          client_id: GOOGLE_CLIENT_ID,
          callback: async (response) => {
            try {
              const result = await apiGoogleLogin(response.credential);
              if (result?.user) { handleUserResult(result.user, "Login com Google realizado! 🎉"); }
            } catch (err) {
              toast(err.message || "Erro no login com Google", "error");
              setErro(err.message || "Erro no login com Google.");
            }
          },
        });
      }
    };
    document.head.appendChild(script);
  }, []);

  const triggerGoogleLogin = () => {
    if (window.google?.accounts?.id) {
      window.google.accounts.id.prompt();
    } else {
      toast("Google Sign-In não carregou. Tente novamente.", "error");
    }
  };

  const floatCircle = (size, top, left, color, anim, dur) => ({
    position: "absolute", width: size, height: size, borderRadius: "50%",
    background: color, opacity: 0.06, filter: "blur(2px)",
    top, left, animation: `${anim} ${dur}s ease-in-out infinite`, pointerEvents: "none",
  });

  return (
    <div style={{ minHeight: "100vh", background: "linear-gradient(135deg, #f5f5f7 0%, #eeeeff 50%, #f5f5f7 100%)", display: "flex", alignItems: "center", justifyContent: "center", padding: 24, overflow: "hidden", position: "relative" }}>
      {/* styles in global.css */}

      {/* Floating background circles */}
      <div style={floatCircle(420, "-5%", "-8%", "#4545F5", "floatBg", 14)} />
      <div style={floatCircle(340, "60%", "75%", "#28cd41", "floatBg2", 18)} />
      <div style={floatCircle(280, "20%", "80%", "#4545F5", "floatBg3", 16)} />
      <div style={floatCircle(360, "70%", "-5%", "#8b5cf6", "floatBg", 20)} />

      {/* Card */}
      <div
        style={{
          width: "100%", maxWidth: 420,
          background: "rgba(255,255,255,0.92)",
          backdropFilter: "blur(20px) saturate(1.6)",
          WebkitBackdropFilter: "blur(20px) saturate(1.6)",
          borderRadius: 24,
          boxShadow: "0 20px 60px rgba(0,0,0,0.08), 0 1px 3px rgba(0,0,0,0.04)",
          padding: "44px 40px",
          animation: shake ? "shakeX 0.4s ease" : "fadeUpLogin 0.5s cubic-bezier(.34,1.2,.64,1)",
          position: "relative", zIndex: 1,
        }}
      >
        {/* Logo */}
        <div style={{ textAlign: "center" }}><MinerLogo height={34} /></div>
        <div style={{ height: 28 }} />

        {mode === "login" ? (
          <>
            <h2 style={{ fontSize: 26, fontWeight: 800, letterSpacing: "-0.03em", textAlign: "center", color: "#1d1d1f" }}>Bem-vindo de volta</h2>
            <p style={{ fontSize: 14, color: "#6e6e73", textAlign: "center", marginBottom: 32, marginTop: 6 }}>Faça login para acessar o CRM</p>

            <label style={{ fontSize: 12, fontWeight: 600, color: "#6e6e73", textTransform: "uppercase", letterSpacing: "0.5px", display: "block", marginBottom: 6 }}>Email</label>
            <input className="ap-inp" type="email" placeholder="seu@email.com" autoFocus value={email} onChange={(e) => chEmail(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") pwdRef.current?.focus(); }} />
            <div style={{ height: 16 }} />

            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
              <label style={{ fontSize: 12, fontWeight: 600, color: "#6e6e73", textTransform: "uppercase", letterSpacing: "0.5px" }}>Senha</label>
              <button onClick={() => { setMode("forgot"); setErro(""); setForgotSent(false); setSuccessMsg(""); }} style={{ background: "none", border: "none", fontSize: 12, color: "#4545F5", cursor: "pointer", fontWeight: 500, fontFamily: "var(--sf)" }}>Esqueci a senha</button>
            </div>
            <div style={{ position: "relative" }}>
              <input ref={pwdRef} className="ap-inp" type={showPwd ? "text" : "password"} placeholder="••••••••" value={senha} onChange={(e) => chSenha(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") doLogin(); }} style={{ paddingRight: 44 }} />
              <button type="button" onClick={() => setShowPwd(!showPwd)} style={{ position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", fontSize: 16, padding: 4, color: "#6e6e73", lineHeight: 1 }} tabIndex={-1}>{showPwd ? "👁" : "👁‍🗨"}</button>
            </div>
            <div style={{ height: 24 }} />

            <button className="ap-btn ap-btn-primary" style={{ width: "100%", height: 48, fontSize: 15, fontWeight: 700, borderRadius: 14 }} onClick={doLogin} disabled={loading || !email || !senha}>
              {loading ? "⏳ Entrando..." : "Entrar →"}
            </button>

            {/* Divider */}
            <div style={{ display: "flex", alignItems: "center", gap: 14, margin: "20px 0" }}>
              <div style={{ flex: 1, height: 1, background: "#e5e5ea" }} />
              <span style={{ fontSize: 12, color: "#aeaeb2", fontWeight: 500 }}>— ou —</span>
              <div style={{ flex: 1, height: 1, background: "#e5e5ea" }} />
            </div>

            {/* Google button */}
            <button
              onClick={triggerGoogleLogin}
              style={{
                width: "100%", height: 48, borderRadius: 14, border: "1px solid #e5e5ea",
                background: "#fff", cursor: "pointer", display: "flex", alignItems: "center",
                justifyContent: "center", gap: 10, fontSize: 15, fontWeight: 600, color: "#1d1d1f",
                transition: "all .15s ease", fontFamily: "var(--sf)",
              }}
              onMouseEnter={(e) => { e.currentTarget.style.background = "#f5f5f7"; e.currentTarget.style.borderColor = "#ccc"; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = "#fff"; e.currentTarget.style.borderColor = "#e5e5ea"; }}
            >
              <svg width="20" height="20" viewBox="0 0 48 48"><path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/><path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/><path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/><path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/></svg>
              Entrar com Google
            </button>
          </>
        ) : (
          <>
            <h2 style={{ fontSize: 26, fontWeight: 800, letterSpacing: "-0.03em", textAlign: "center", color: "#1d1d1f" }}>Criar conta</h2>
            <p style={{ fontSize: 14, color: "#6e6e73", textAlign: "center", marginBottom: 32, marginTop: 6 }}>Preencha seus dados para começar</p>

            <label style={{ fontSize: 12, fontWeight: 600, color: "#6e6e73", textTransform: "uppercase", letterSpacing: "0.5px", display: "block", marginBottom: 6 }}>Nome</label>
            <input className="ap-inp" type="text" placeholder="Seu nome completo" autoFocus value={nome} onChange={(e) => { setNome(e.target.value); clearErro(); }} />
            <div style={{ height: 14 }} />

            <label style={{ fontSize: 12, fontWeight: 600, color: "#6e6e73", textTransform: "uppercase", letterSpacing: "0.5px", display: "block", marginBottom: 6 }}>Email</label>
            <input className="ap-inp" type="email" placeholder="seu@email.com" value={email} onChange={(e) => chEmail(e.target.value)} />
            <div style={{ height: 14 }} />

            <label style={{ fontSize: 12, fontWeight: 600, color: "#6e6e73", textTransform: "uppercase", letterSpacing: "0.5px", display: "block", marginBottom: 6 }}>Senha</label>
            <div style={{ position: "relative" }}>
              <input className="ap-inp" type={showPwd ? "text" : "password"} placeholder="Mínimo 6 caracteres" value={senha} onChange={(e) => chSenha(e.target.value)} style={{ paddingRight: 44 }} />
              <button type="button" onClick={() => setShowPwd(!showPwd)} style={{ position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", fontSize: 16, padding: 4, color: "#6e6e73", lineHeight: 1 }} tabIndex={-1}>{showPwd ? "👁" : "👁‍🗨"}</button>
            </div>
            {senha && (() => { const s = getPasswordStrength(senha); return (
              <div style={{ marginTop: 6, display: "flex", gap: 4, alignItems: "center" }}>
                {[1,2,3,4].map(i => <div key={i} style={{ height: 3, flex: 1, borderRadius: 2, background: i <= s.level ? s.color : "#e5e5ea", transition: "all 0.3s" }} />)}
                <span style={{ fontSize: 11, color: s.color, fontWeight: 600, marginLeft: 8 }}>{s.label}</span>
              </div>
            ); })()}
            <div style={{ height: 14 }} />

            <label style={{ fontSize: 12, fontWeight: 600, color: "#6e6e73", textTransform: "uppercase", letterSpacing: "0.5px", display: "block", marginBottom: 6 }}>Confirmar senha</label>
            <input className="ap-inp" type="password" placeholder="Repita a senha" value={confirmSenha} onChange={(e) => { setConfirmSenha(e.target.value); clearErro(); }} onKeyDown={(e) => { if (e.key === "Enter") doRegister(); }} />
            <div style={{ height: 24 }} />

            <button className="ap-btn ap-btn-primary" style={{ width: "100%", height: 48, fontSize: 15, fontWeight: 700, borderRadius: 14 }} onClick={doRegister} disabled={loading || !nome || !email || !senha || !confirmSenha}>
              {loading ? "⏳ Cadastrando..." : "Criar conta →"}
            </button>
          </>
        )}

        {/* Forgot password */}
        {mode === "forgot" && (
          <>
            <h2 style={{ fontSize: 26, fontWeight: 800, letterSpacing: "-0.03em", textAlign: "center", color: "#1d1d1f" }}>Esqueceu a senha?</h2>
            <p style={{ fontSize: 14, color: "#6e6e73", textAlign: "center", marginBottom: 32, marginTop: 6 }}>
              {forgotSent ? "Verifique seu email para o link de redefinição." : "Digite seu email e enviaremos um link para redefinir."}
            </p>
            {!forgotSent ? (
              <>
                <label style={{ fontSize: 12, fontWeight: 600, color: "#6e6e73", textTransform: "uppercase", letterSpacing: "0.5px", display: "block", marginBottom: 6 }}>Email</label>
                <input className="ap-inp" type="email" placeholder="seu@email.com" autoFocus value={email} onChange={(e) => chEmail(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") handleForgot(); }} />
                <div style={{ height: 20 }} />
                <button className="ap-btn ap-btn-primary" disabled={loading} onClick={handleForgot} style={{ width: "100%", padding: "14px 0", borderRadius: 14, fontSize: 15, fontWeight: 700 }}>
                  {loading ? "Enviando..." : "Enviar link de redefinição"}
                </button>
              </>
            ) : (
              <>
                <div style={{ background: "#e9fbed", border: "1px solid #28cd4133", borderRadius: 12, padding: 16, textAlign: "center", marginBottom: 16 }}>
                  <div style={{ fontSize: 32, marginBottom: 8 }}>✉️</div>
                  <div style={{ fontSize: 14, fontWeight: 600, color: "#1a7f2b" }}>Email enviado!</div>
                  <div style={{ fontSize: 12, color: "#6e6e73", marginTop: 4 }}>Verifique sua caixa de entrada e spam.</div>
                </div>
                <label style={{ fontSize: 12, fontWeight: 600, color: "#6e6e73", textTransform: "uppercase", letterSpacing: "0.5px", display: "block", marginBottom: 6 }}>Código de redefinição</label>
                <input className="ap-inp" placeholder="Cole o código recebido" value={resetToken} onChange={(e) => setResetToken(e.target.value)} />
                <div style={{ height: 12 }} />
                <label style={{ fontSize: 12, fontWeight: 600, color: "#6e6e73", textTransform: "uppercase", letterSpacing: "0.5px", display: "block", marginBottom: 6 }}>Nova senha</label>
                <input className="ap-inp" type="password" placeholder="Mínimo 6 caracteres" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} />
                <div style={{ height: 12 }} />
                <label style={{ fontSize: 12, fontWeight: 600, color: "#6e6e73", textTransform: "uppercase", letterSpacing: "0.5px", display: "block", marginBottom: 6 }}>Confirmar nova senha</label>
                <input className="ap-inp" type="password" placeholder="Repita a nova senha" value={confirmNew} onChange={(e) => setConfirmNew(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") handleReset(); }} />
                <div style={{ height: 20 }} />
                <button className="ap-btn ap-btn-primary" disabled={loading} onClick={handleReset} style={{ width: "100%", padding: "14px 0", borderRadius: 14, fontSize: 15, fontWeight: 700 }}>
                  {loading ? "Redefinindo..." : "Redefinir senha"}
                </button>
              </>
            )}
          </>
        )}

        {/* Success message */}
        {successMsg && (
          <div className="fade-in" style={{ marginTop: 14, background: "#e9fbed", border: "1px solid #28cd4133", borderRadius: 12, padding: "10px 16px", fontSize: 13, color: "#1a7f2b", fontWeight: 600, textAlign: "center" }}>
            {successMsg}
          </div>
        )}

        {/* Error message */}
        {erro && (
          <div className="fade-in" style={{ marginTop: 14, background: "rgba(255,59,48,0.08)", border: "1px solid rgba(255,59,48,.18)", borderRadius: 12, padding: "10px 16px", fontSize: 13, color: "#ff3b30", fontWeight: 600, textAlign: "center", animation: "shakeX 0.4s ease" }}>
            {erro}
          </div>
        )}

        {/* Toggle login/register */}
        <div style={{ height: 20 }} />
        <p style={{ fontSize: 13, color: "#6e6e73", textAlign: "center" }}>
          {mode === "login" ? (
            <>Não tem conta?{" "}<button onClick={() => { setMode("register"); setErro(""); setLoading(false); }} style={{ background: "none", border: "none", color: "#4545F5", cursor: "pointer", fontWeight: 600, fontSize: 13, fontFamily: "var(--sf)" }}>Cadastre-se</button></>
          ) : mode === "register" ? (
            <>Já tem conta?{" "}<button onClick={() => { setMode("login"); setErro(""); setLoading(false); }} style={{ background: "none", border: "none", color: "#4545F5", cursor: "pointer", fontWeight: 600, fontSize: 13, fontFamily: "var(--sf)" }}>Faça login</button></>
          ) : (
            <><button onClick={() => { setMode("login"); setErro(""); setLoading(false); setForgotSent(false); setSuccessMsg(""); }} style={{ background: "none", border: "none", color: "#4545F5", cursor: "pointer", fontWeight: 600, fontSize: 13, fontFamily: "var(--sf)" }}>← Voltar ao login</button></>
          )}
        </p>

        <div style={{ height: 16 }} />
        <p style={{ fontSize: 11, color: "#aeaeb2", textAlign: "center" }}>Miner CRM v5</p>
      </div>
    </div>
  );
}


export default Login;
