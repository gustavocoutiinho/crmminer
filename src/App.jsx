import { useState, useEffect } from "react";
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";

// ── Módulos extraídos ────────────────────────────────────────────────────────
import { T, BRAND, STATUS_CFG, PLANO_CFG, ROLE_CFG, RFM_CFG } from "./lib/theme";
import {
  Avatar, Chip, Toggle, ProgressBar, Lbl, Divider, FormRow,
  ApTooltip, Modal, SectionHeader, KpiCard, MinerLogo,
} from "./components/UI";
import { login as apiLogin, logout as apiLogout, getUser as getStoredUser, fetchStats, fetchData, fetchClienteDetail, createRecord, updateRecord, deleteRecord, checkHealth } from "./lib/api";
import { useSupabaseQuery, useSupabaseMutation } from "./lib/hooks";

// ── STYLES (mantido aqui por tamanho) ────────────────────────────────────────
const STYLES = `
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&family=JetBrains+Mono:wght@400;500;600&display=swap');

:root {
  --sf: -apple-system, BlinkMacSystemFont, "SF Pro Text", "SF Pro Display",
        "Inter", ui-sans-serif, system-ui, sans-serif;
  --mono: "SF Mono", "JetBrains Mono", ui-monospace, monospace;
  --brand: #4545F5;
  --rc: 18px;
  --rb: 980px;
  --ri: 10px;
}

*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

body {
  font-family: var(--sf);
  background: #f5f5f7;
  color: #1d1d1f;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}

h1,h2,h3 { letter-spacing:-0.03em; }
p,span,div,td,th,label { letter-spacing:-0.01em; }

::-webkit-scrollbar { width:5px; height:5px; }
::-webkit-scrollbar-track { background:transparent; }
::-webkit-scrollbar-thumb { background:rgba(0,0,0,0.14); border-radius:5px; }

@keyframes fadeUp  { from{opacity:0;transform:translateY(10px)} to{opacity:1;transform:translateY(0)} }
@keyframes fadeIn  { from{opacity:0} to{opacity:1} }
@keyframes scaleIn { from{opacity:0;transform:scale(0.96)} to{opacity:1;transform:scale(1)} }
@keyframes pulse   { 0%,100%{opacity:1} 50%{opacity:.45} }
@keyframes spin    { to{transform:rotate(360deg)} }

.fade-up  { animation:fadeUp  .28s cubic-bezier(.34,1.2,.64,1); }
.fade-in  { animation:fadeIn  .22s ease; }
.scale-in { animation:scaleIn .22s cubic-bezier(.34,1.2,.64,1); }

.ap-inp {
  background:rgba(0,0,0,0.04); border:1.5px solid rgba(0,0,0,0.09);
  border-radius:var(--ri); padding:10px 14px;
  font-size:15px; font-family:var(--sf);
  outline:none; width:100%; color:#1d1d1f; transition:all .18s;
}
.ap-inp:focus { background:#fff; border-color:var(--brand); box-shadow:0 0 0 3.5px rgba(69,69,245,.15); }
.ap-inp::placeholder { color:#c0c0c5; }
.ap-inp.mono { font-family:var(--mono); font-size:13px; }
.ap-inp:read-only { background:rgba(0,0,0,0.03); color:#6e6e73; cursor:default; }

.ap-sel {
  background:rgba(0,0,0,0.04); border:1.5px solid rgba(0,0,0,0.09);
  border-radius:var(--ri); padding:10px 14px;
  font-size:15px; font-family:var(--sf);
  outline:none; width:100%; color:#1d1d1f; cursor:pointer;
  -webkit-appearance:none; appearance:none;
}
.ap-sel:focus { border-color:var(--brand); box-shadow:0 0 0 3.5px rgba(69,69,245,.15); }

.ap-btn {
  display:inline-flex; align-items:center; justify-content:center; gap:6px;
  padding:10px 20px; border-radius:var(--rb);
  font-size:15px; font-weight:600; cursor:pointer; font-family:var(--sf);
  transition:all .18s cubic-bezier(.34,1.2,.64,1); border:none; white-space:nowrap;
  letter-spacing:-0.01em;
}
.ap-btn:active:not(:disabled) { transform:scale(0.97); }
.ap-btn:disabled { opacity:.38; cursor:not-allowed; }

.ap-btn-primary  { background:var(--brand); color:#fff; }
.ap-btn-primary:hover:not(:disabled)  { background:#2f2fb8; box-shadow:0 4px 20px rgba(69,69,245,.35); }
.ap-btn-secondary { background:rgba(0,0,0,0.06); color:#1d1d1f; }
.ap-btn-secondary:hover:not(:disabled) { background:rgba(0,0,0,0.10); }
.ap-btn-danger  { background:rgba(255,59,48,.10);  color:#ff3b30; }
.ap-btn-danger:hover:not(:disabled)  { background:rgba(255,59,48,.18); }
.ap-btn-success { background:rgba(40,205,65,.10);  color:#28cd41; }
.ap-btn-success:hover:not(:disabled) { background:rgba(40,205,65,.18); }
.ap-btn-sm  { padding:6px 14px; font-size:13px; }
.ap-btn-ghost { background:transparent; color:var(--brand); font-size:13px; font-weight:600;
                font-family:var(--sf); cursor:pointer; border:none; padding:4px 0; }
.ap-btn-ghost:hover { opacity:.7; }

.ap-card {
  background:rgba(255,255,255,0.92);
  backdrop-filter:blur(20px) saturate(1.6);
  -webkit-backdrop-filter:blur(20px) saturate(1.6);
  border:1px solid rgba(0,0,0,0.07); border-radius:var(--rc);
  box-shadow:0 2px 12px rgba(0,0,0,0.06);
}

.sidebar {
  background:rgba(255,255,255,0.82);
  backdrop-filter:blur(32px) saturate(1.8);
  -webkit-backdrop-filter:blur(32px) saturate(1.8);
  border-right:1px solid rgba(0,0,0,0.07);
}

.nav-item {
  display:flex; align-items:center; gap:9px; padding:8px 12px;
  border-radius:10px; cursor:pointer; font-size:14px; font-weight:500;
  color:#6e6e73; transition:all .15s; user-select:none;
}
.nav-item:hover  { background:rgba(0,0,0,0.05); color:#1d1d1f; }
.nav-item.active { background:rgba(69,69,245,.10); color:#4545F5; font-weight:600; }
.nav-group { font-size:10px; font-weight:700; color:#c7c7cc; text-transform:uppercase;
             letter-spacing:0.9px; padding:14px 12px 4px; }

.ap-th { padding:10px 16px; font-size:11px; font-weight:700; color:#aeaeb2;
         text-transform:uppercase; letter-spacing:0.5px; text-align:left; white-space:nowrap; }
.ap-tr { border-bottom:1px solid rgba(0,0,0,0.05); transition:background .12s; }
.ap-tr:last-child { border-bottom:none; }
.ap-tr:hover { background:rgba(0,0,0,0.02); }
.ap-td { padding:12px 16px; font-size:14px; vertical-align:middle; }

.ap-toggle { position:relative; width:44px; height:24px; flex-shrink:0; cursor:pointer; }
.ap-toggle input { opacity:0; width:0; height:0; position:absolute; }
.ap-toggle-track {
  position:absolute; cursor:pointer; inset:0; border-radius:24px;
  background:#d1d1d6; transition:.28s cubic-bezier(.34,1.2,.64,1);
}
.ap-toggle-track::before {
  content:""; position:absolute; width:18px; height:18px;
  left:3px; bottom:3px; border-radius:50%; background:#fff;
  transition:.28s cubic-bezier(.34,1.2,.64,1); box-shadow:0 1px 4px rgba(0,0,0,.22);
}
input:checked ~ .ap-toggle-track { background:#28cd41; }
input:checked ~ .ap-toggle-track::before { transform:translateX(20px); }

.ap-progress { background:rgba(0,0,0,0.07); border-radius:100px; overflow:hidden; }
.ap-progress-fill { height:100%; border-radius:100px; transition:width .9s cubic-bezier(.34,1.2,.64,1); }

.modal-overlay {
  position:fixed; inset:0; background:rgba(0,0,0,.44);
  backdrop-filter:blur(10px); -webkit-backdrop-filter:blur(10px);
  z-index:200; display:flex; align-items:center; justify-content:center; padding:20px;
  animation:fadeIn .2s ease;
}
.modal-box {
  background:rgba(255,255,255,.98); backdrop-filter:blur(40px);
  border:1px solid rgba(255,255,255,.7); border-radius:22px;
  box-shadow:0 20px 60px rgba(0,0,0,.22); padding:32px;
  max-height:90vh; overflow-y:auto; animation:scaleIn .22s cubic-bezier(.34,1.2,.64,1); width:100%;
}
.modal-box::-webkit-scrollbar { width:3px; }
.modal-box::-webkit-scrollbar-thumb { background:rgba(0,0,0,.10); border-radius:3px; }

.chip { display:inline-flex; align-items:center; gap:3px; padding:4px 10px;
        border-radius:20px; font-size:11px; font-weight:700; white-space:nowrap; }

.seg { background:rgba(0,0,0,0.06); border-radius:10px; padding:3px; display:inline-flex; gap:1px; }
.seg-btn { padding:7px 16px; border-radius:8px; font-size:13px; font-weight:600; cursor:pointer;
           transition:all .15s; background:transparent; border:none; font-family:var(--sf); color:#6e6e73; }
.seg-btn.on { background:#fff; color:#1d1d1f; box-shadow:0 1px 4px rgba(0,0,0,.13); }

.lbl    { font-size:13px; font-weight:600; color:#3a3a3c; margin-bottom:6px; display:block; }
.sublbl { font-size:12px; color:#8e8e93; margin-bottom:8px; display:block; margin-top:-3px; }
.divider { border:none; border-top:1px solid rgba(0,0,0,0.07); margin:16px 0; }
.num { font-family:var(--mono); }
`;

// ── PLANOS (local, não está no banco) ────────────────────────────────────────
const PLANOS = [
  { id: "starter", label: "Starter", preco: 197, lojas: 1, usuarios: 5, clientes: 1000 },
  { id: "pro", label: "Pro", preco: 497, lojas: 3, usuarios: 15, clientes: 5000 },
  { id: "enterprise", label: "Enterprise", preco: 1497, lojas: "∞", usuarios: "∞", clientes: "∞" },
];

// ── DB_FALLBACK (dados demo para funcionar sem Supabase) ─────────────────────
const DB_FALLBACK = {
  marcas: [
    { id: "prls", nome: "PRLS Calçados", seg: "Moda / Calçados", cnpj: "", plano: "pro", status: "ativo", lojas: 1, usuarios: 3, clientes: 0, mrr: 497, resp: "Leonardo Umbelino", email: "leonardo@prls.com.br", cidade: "Fortaleza", estado: "CE", created_at: "07 Mar 2025" },
  ],
  usuarios: [
    { id: "u1", nome: "Leonardo Umbelino", email: "leonardo@prls.com.br", role: "admin", status: "ativo", loja: "Fortaleza", vendas: 0, meta: 0, fat: 0 },
  ],
  clientes: [],
  mrrHist: [
    { m: "Set", v: 2890 }, { m: "Out", v: 3180 }, { m: "Nov", v: 3580 },
    { m: "Dez", v: 3580 }, { m: "Jan", v: 3977 }, { m: "Fev", v: 2191 },
  ],
  revHist: [
    { m: "Out", v: 38400 }, { m: "Nov", v: 42100 }, { m: "Dez", v: 51200 },
    { m: "Jan", v: 44800 }, { m: "Fev", v: 48200 },
  ],
  campanhas: [
    { id: 1, nome: "Reativação 90 dias", tipo: "whatsapp", canal: "WhatsApp", status: "ativa", enviados: 247, receita: 18420 },
    { id: 2, nome: "Black Friday Antecipada", tipo: "email", canal: "Email", status: "concluida", enviados: 523, receita: 42800 },
    { id: 3, nome: "Coleção Primavera 2026", tipo: "sms", canal: "SMS", status: "rascunho", enviados: 0, receita: 0 },
  ],
};

// ── LOGINS ────────────────────────────────────────────────────────────────────
const LOGINS = [
  { email: "gustavo@minerbz.com.br", senha: "miner2026", tipo: "owner", nome: "Gustavo Coutinho", role: "owner", marcaId: null },
  { email: "leonardo@prls.com.br", senha: "prls2026", tipo: "marca", nome: "Leonardo Umbelino", role: "admin", marcaId: "prls" },
  { email: "squad@minerbz.com.br", senha: "squad2026", tipo: "marca", nome: "Squad Miner", role: "admin", marcaId: "prls" },
];

// ── LOGIN ────────────────────────────────────────────────────────────────────
function Login({ onLogin }) {
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [erro, setErro] = useState("");
  const [loading, setLoading] = useState(false);

  const chEmail = (v) => { setEmail(v); if (erro) setErro(""); };
  const chSenha = (v) => { setSenha(v); if (erro) setErro(""); };

  const doLogin = async () => {
    setLoading(true);
    setErro("");

    try {
      // 1. Tentar API real (Postgres)
      const result = await apiLogin(email.trim(), senha);
      if (result?.user) {
        const u = result.user;
        onLogin({
          id: u.id,
          email: u.email,
          nome: u.nome,
          tipo: u.role === "miner" ? "owner" : "marca",
          role: u.role,
          marcaId: u.marca_id,
          marca_id: u.marca_id,
          marca: u.marca,
          loja: u.loja,
        });
        return;
      }
    } catch (apiErr) {
      console.log("[Login] API error, trying fallback:", apiErr.message);
    }

    // 2. Fallback: logins locais (offline)
    const u = LOGINS.find((l) => l.email === email.trim() && l.senha === senha);
    if (u) {
      onLogin({ ...u, marca_id: u.marcaId });
      return;
    }

    setErro("Email ou senha incorretos.");
    setLoading(false);
  };

  return (
    <div style={{ minHeight: "100vh", background: "#f5f5f7", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: 24, overflow: "hidden", position: "relative" }}>
      <style>{STYLES}</style>
      <div style={{ position: "fixed", top: "-8%", right: "-4%", width: 500, height: 500, borderRadius: "50%", background: "radial-gradient(circle,rgba(69,69,245,.08) 0%,transparent 70%)", pointerEvents: "none" }} />
      <div style={{ position: "fixed", bottom: "-12%", left: "-6%", width: 560, height: 560, borderRadius: "50%", background: "radial-gradient(circle,rgba(40,205,65,.05) 0%,transparent 70%)", pointerEvents: "none" }} />

      <div className="fade-up" style={{ width: "100%", maxWidth: 400 }}>
        <div style={{ textAlign: "center", marginBottom: 36 }}>
          <MinerLogo height={34} />
          <p style={{ fontSize: 15, color: T.sub, marginTop: 14, fontWeight: 400 }}>Sistema de Crescimento para Varejo</p>
        </div>

        <div className="ap-card" style={{ padding: "32px 36px" }}>
          <h2 style={{ fontSize: 22, fontWeight: 700, marginBottom: 6 }}>Bem-vindo</h2>
          <p style={{ fontSize: 14, color: T.sub, marginBottom: 28 }}>Acesse sua conta para continuar</p>

          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <div>
              <label className="lbl">Email</label>
              <input className="ap-inp" type="email" placeholder="seu@email.com.br" value={email} onChange={(e) => chEmail(e.target.value)} onKeyDown={(e) => e.key === "Enter" && doLogin()} />
            </div>
            <div>
              <label className="lbl">Senha</label>
              <input className="ap-inp" type="password" placeholder="••••••••" value={senha} onChange={(e) => chSenha(e.target.value)} onKeyDown={(e) => e.key === "Enter" && doLogin()} />
            </div>

            {erro && (
              <div className="fade-in" style={{ background: "#ffe5e3", border: "1px solid rgba(255,59,48,.2)", borderRadius: 10, padding: "10px 14px", fontSize: 13, color: "#ff3b30", fontWeight: 500 }}>{erro}</div>
            )}

            <button className="ap-btn ap-btn-primary" style={{ width: "100%", padding: "12px", fontSize: 15, borderRadius: 12, marginTop: 4 }} onClick={doLogin} disabled={loading || !email || !senha}>
              {loading ? "Entrando…" : "Entrar →"}
            </button>
          </div>

          <div style={{ textAlign: "center", marginTop: 8 }}>
            <span style={{ fontSize: 12, color: T.muted }}>Problemas para acessar? Fale com o admin.</span>
          </div>
        </div>

        <p style={{ textAlign: "center", marginTop: 20, fontSize: 12, color: T.muted }}>Miner CRM ® 2026 — Todos os direitos reservados</p>
      </div>
    </div>
  );
}

// ── SIDEBAR ──────────────────────────────────────────────────────────────────
function Sidebar({ page, setPage, user, onLogout, isOwner = false }) {
  const ownerNav = [
    { key: "dashboard", icon: "⬡", label: "Visão Geral" },
    { key: "marcas", icon: "🏢", label: "Marcas" },
    { key: "planos", icon: "💎", label: "Planos" },
    { key: "financeiro", icon: "💰", label: "Financeiro" },
  ];

  const marcaNav = [
    { key: "dashboard", icon: "⬡", label: "Dashboard", roles: ["admin", "supervisor", "vendedor"] },
    { group: "Gestão", items: [
      { key: "equipe", icon: "👥", label: "Equipe", roles: ["admin", "supervisor"] },
      { key: "ranking", icon: "🏆", label: "Ranking", roles: ["admin", "supervisor", "vendedor"] },
    ]},
    { group: "Operação", items: [
      { key: "clientes", icon: "🙍", label: "Clientes", roles: ["admin", "supervisor", "vendedor"] },
      { key: "agenda", icon: "📋", label: "Agenda", roles: ["admin", "supervisor", "vendedor"] },
      { key: "campanhas", icon: "📢", label: "Campanhas", roles: ["admin"] },
    ]},
    { group: "Dados", items: [
      { key: "integracoes", icon: "🔌", label: "Integrações API", roles: ["admin"] },
      { key: "exportar", icon: "📤", label: "Dados & Export", roles: ["admin", "supervisor"] },
    ]},
    { group: "Config", items: [
      { key: "usuarios", icon: "🔐", label: "Usuários", roles: ["admin"] },
      { key: "config", icon: "⚙", label: "Configurações", roles: ["admin"] },
    ]},
  ];

  const role = user.role;
  const rd = ROLE_CFG[role] || ROLE_CFG.vendedor;

  const NavItem = ({ item }) => {
    if (!item.roles?.includes(role)) return null;
    return (
      <div className={`nav-item ${page === item.key ? "active" : ""}`} onClick={() => setPage(item.key)}>
        <span style={{ fontSize: 14, width: 22, textAlign: "center" }}>{item.icon}</span>
        <span>{item.label}</span>
      </div>
    );
  };

  return (
    <div className="sidebar" style={{ width: 230, display: "flex", flexDirection: "column", flexShrink: 0, height: "100vh" }}>
      <div style={{ padding: "18px 16px 14px", borderBottom: "1px solid rgba(0,0,0,0.07)" }}>
        <MinerLogo height={22} />
        <div style={{ marginTop: 12, display: "flex", alignItems: "center", gap: 9, background: rd.bg, border: `1px solid ${rd.c}22`, borderRadius: 12, padding: "9px 11px" }}>
          <Avatar nome={user.nome} size={30} />
          <div style={{ minWidth: 0 }}>
            <div style={{ fontSize: 13, fontWeight: 700, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{user.nome.split(" ")[0]}</div>
            <div style={{ fontSize: 10, color: rd.c, fontWeight: 700 }}>{rd.icon} {rd.label}</div>
          </div>
        </div>
      </div>

      <nav style={{ flex: 1, padding: "10px 8px", overflow: "auto" }}>
        {isOwner
          ? ownerNav.map((item) => (
              <div key={item.key} className={`nav-item ${page === item.key ? "active" : ""}`} onClick={() => setPage(item.key)}>
                <span style={{ fontSize: 14, width: 22, textAlign: "center" }}>{item.icon}</span>
                <span>{item.label}</span>
              </div>
            ))
          : marcaNav.map((section, i) => (
              <div key={i}>
                {section.group && <div className="nav-group">{section.group}</div>}
                {(section.items || [section]).filter((x) => x.key).map((item) => (
                  <NavItem key={item.key} item={item} />
                ))}
              </div>
            ))}
      </nav>

      <div style={{ padding: "10px 8px 16px", borderTop: "1px solid rgba(0,0,0,0.07)" }}>
        <div className="nav-item" onClick={onLogout} style={{ color: T.muted }}>
          <span style={{ fontSize: 14, width: 22, textAlign: "center" }}>←</span>
          <span>Sair</span>
        </div>
      </div>
    </div>
  );
}

// ── OWNER PAGES ──────────────────────────────────────────────────────────────
function OwnerDashboard({ marcas }) {
  const mrr = marcas.filter((m) => m.status === "ativo").reduce((s, m) => s + (m.mrr || 0), 0);
  const total = marcas.reduce((s, m) => s + (m.clientes || 0), 0);
  const ativos = marcas.filter((m) => m.status === "ativo").length;

  return (
    <div className="fade-up">
      <SectionHeader tag="Owner" title="Visão Geral do Negócio" />
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 14, marginBottom: 20 }}>
        <KpiCard label="MRR Total" value={`R$ ${mrr.toLocaleString("pt-BR")}`} sub="Receita mensal recorrente" color="#4545F5" icon="💳" trend={14} />
        <KpiCard label="Marcas Ativas" value={ativos} sub={`${marcas.filter((m) => m.status === "trial").length} em trial`} color="#8e44ef" icon="🏢" />
        <KpiCard label="Total Clientes" value={total.toLocaleString("pt-BR")} sub="em todas as marcas" color="#28cd41" icon="👥" />
        <KpiCard label="ARR Projetado" value={`R$ ${((mrr * 12) / 1000).toFixed(1)}k`} sub="Anualização do MRR" color="#ff9500" icon="📈" />
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: 16, marginBottom: 16 }}>
        <div className="ap-card" style={{ padding: "22px 24px" }}>
          <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 4 }}>Evolução do MRR</div>
          <div style={{ fontSize: 12, color: T.muted, marginBottom: 18 }}>Últimos 6 meses</div>
          <ResponsiveContainer width="100%" height={180}>
            <AreaChart data={DB_FALLBACK.mrrHist}>
              <defs>
                <linearGradient id="gm" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#4545F5" stopOpacity={0.22} />
                  <stop offset="95%" stopColor="#4545F5" stopOpacity={0} />
                </linearGradient>
              </defs>
              <XAxis dataKey="m" tick={{ fill: T.muted, fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis hide />
              <Tooltip content={<ApTooltip />} />
              <Area type="monotone" dataKey="v" name="MRR" stroke="#4545F5" strokeWidth={2.5} fill="url(#gm)" dot={false} />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        <div className="ap-card" style={{ padding: "22px 24px" }}>
          <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 16 }}>Por Plano</div>
          {PLANOS.map((p, i) => {
            const count = marcas.filter((m) => m.plano === p.id && m.status === "ativo").length;
            const st = PLANO_CFG[p.id];
            return (
              <div key={i} style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 0", borderBottom: i < 2 ? "1px solid rgba(0,0,0,0.05)" : "none" }}>
                <Chip label={p.label} c={st.c} bg={st.bg} />
                <div style={{ flex: 1 }}><ProgressBar value={count} max={marcas.length} height={5} /></div>
                <span className="num" style={{ fontSize: 13, fontWeight: 700, color: st.c }}>R$ {(count * p.preco).toLocaleString("pt-BR")}</span>
              </div>
            );
          })}
          <div style={{ marginTop: 16, padding: "10px 12px", background: "rgba(0,0,0,0.03)", borderRadius: 12, fontSize: 12, color: T.sub, textAlign: "center" }}>
            <span style={{ fontWeight: 700, color: T.text }}>R$ {mrr.toLocaleString("pt-BR")}/mês</span> · {ativos} ativas
          </div>
        </div>
      </div>

      <div className="ap-card" style={{ padding: 0, overflow: "hidden" }}>
        <div style={{ padding: "16px 22px", borderBottom: "1px solid rgba(0,0,0,0.06)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span style={{ fontSize: 15, fontWeight: 700 }}>Marcas Recentes</span>
          <button className="ap-btn-ghost">Ver todas →</button>
        </div>
        {marcas.slice(0, 3).map((m, i) => (
          <div key={i} style={{ display: "flex", alignItems: "center", gap: 14, padding: "14px 22px", borderBottom: i < 2 ? "1px solid rgba(0,0,0,0.05)" : "none" }}>
            <div style={{ width: 38, height: 38, borderRadius: 11, background: "rgba(0,0,0,0.06)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 15, fontWeight: 800, flexShrink: 0 }}>{m.nome[0]}</div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 14, fontWeight: 700 }}>{m.nome}</div>
              <div style={{ fontSize: 11, color: T.muted }}>{m.segmento || m.seg} · {m.cidade}/{m.estado}</div>
            </div>
            <Chip label={PLANOS.find((p) => p.id === m.plano)?.label || m.plano} c={PLANO_CFG[m.plano]?.c} bg={PLANO_CFG[m.plano]?.bg} />
            <Chip label={STATUS_CFG[m.status]?.label || m.status} c={STATUS_CFG[m.status]?.c} bg={STATUS_CFG[m.status]?.bg} />
            <span className="num" style={{ fontSize: 13, fontWeight: 700, color: "#4545F5", minWidth: 80, textAlign: "right" }}>R$ {m.mrr}/mês</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function OwnerMarcas({ marcas, setMarcas, refetchMarcas }) {
  const [showModal, setShowModal] = useState(false);
  const [detail, setDetail] = useState(null);
  const [saving, setSaving] = useState(false);

  const handleCreateMarca = async (f) => {
    setSaving(true);
    try {
      const record = {
        nome: f.nome, segmento: f.seg, cnpj: f.cnpj, email: f.email,
        responsavel: f.resp, cidade: f.cidade, plano: f.plano,
        status: "trial", lojas: 1,
      };
      await createRecord("marcas", record);
      if (refetchMarcas) await refetchMarcas();
    } catch (e) {
      // Fallback to local state
      setMarcas((a) => [...a, { ...f, id: `m${Date.now()}`, lojas: 1, usuarios: 1, clientes: 0, mrr: PLANOS.find((p) => p.id === f.plano)?.preco || 0, status: "trial", created_at: "Agora" }]);
    }
    setSaving(false);
  };

  const handleStatusChange = async (id, newStatus) => {
    try {
      await updateRecord("marcas", id, { status: newStatus });
      if (refetchMarcas) await refetchMarcas();
    } catch (e) {
      setMarcas((a) => a.map((x) => x.id === id ? { ...x, status: newStatus } : x));
    }
  };

  function NovaMarca({ onClose, onSave }) {
    const [f, setF] = useState({ nome: "", seg: "", cnpj: "", email: "", resp: "", cidade: "", plano: "starter" });
    const s = (k, v) => setF((x) => ({ ...x, [k]: v }));
    return (
      <Modal title="Cadastrar Nova Marca" subtitle="Preencha os dados para criar o acesso" onClose={onClose} width={560}>
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <FormRow>
            <div><Lbl>Nome *</Lbl><input className="ap-inp" value={f.nome} onChange={(e) => s("nome", e.target.value)} placeholder="Ex: Minha Loja" /></div>
            <div><Lbl>Segmento *</Lbl><input className="ap-inp" value={f.seg} onChange={(e) => s("seg", e.target.value)} placeholder="Ex: Moda" /></div>
          </FormRow>
          <FormRow>
            <div><Lbl>CNPJ</Lbl><input className="ap-inp mono" value={f.cnpj} onChange={(e) => s("cnpj", e.target.value)} placeholder="00.000.000/0001-00" /></div>
            <div><Lbl>Email Admin *</Lbl><input className="ap-inp" type="email" value={f.email} onChange={(e) => s("email", e.target.value)} placeholder="admin@marca.com.br" /></div>
          </FormRow>
          <FormRow>
            <div><Lbl>Responsável *</Lbl><input className="ap-inp" value={f.resp} onChange={(e) => s("resp", e.target.value)} placeholder="Nome completo" /></div>
            <div><Lbl>Cidade</Lbl><input className="ap-inp" value={f.cidade} onChange={(e) => s("cidade", e.target.value)} placeholder="Cidade" /></div>
          </FormRow>
          <div>
            <label className="lbl">Plano</label>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 10 }}>
              {PLANOS.map((p) => (
                <div key={p.id} onClick={() => s("plano", p.id)} style={{ padding: 14, borderRadius: 14, border: `2px solid ${f.plano === p.id ? PLANO_CFG[p.id].c : "rgba(0,0,0,0.08)"}`, background: f.plano === p.id ? PLANO_CFG[p.id].bg : "#fff", cursor: "pointer", textAlign: "center", transition: "all .15s" }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: f.plano === p.id ? PLANO_CFG[p.id].c : T.sub }}>{p.label}</div>
                  <div className="num" style={{ fontSize: 20, fontWeight: 800, color: PLANO_CFG[p.id].c }}>R$ {p.preco}</div>
                  <div style={{ fontSize: 10, color: T.muted }}>/ mês</div>
                </div>
              ))}
            </div>
          </div>
          <button className="ap-btn ap-btn-primary" disabled={!f.nome || !f.email || !f.resp || saving} onClick={() => { if (f.nome && f.email && f.resp) { onSave(f); onClose(); } }}>
            {saving ? "Salvando…" : "Cadastrar Marca →"}
          </button>
        </div>
      </Modal>
    );
  }

  return (
    <div className="fade-up">
      <SectionHeader tag="Gestão" title="Marcas Cadastradas" action={<button className="ap-btn ap-btn-primary" onClick={() => setShowModal(true)}>+ Cadastrar Marca</button>} />

      <div style={{ display: "flex", gap: 8, marginBottom: 20 }}>
        {["ativo", "trial", "inativo"].map((s) => (
          <div key={s} style={{ background: STATUS_CFG[s].bg, border: `1px solid ${STATUS_CFG[s].c}22`, borderRadius: 20, padding: "6px 14px", fontSize: 12, fontWeight: 700, color: STATUS_CFG[s].c, display: "flex", alignItems: "center", gap: 6 }}>
            <span style={{ width: 7, height: 7, borderRadius: "50%", background: STATUS_CFG[s].c, display: "inline-block", animation: "pulse 2s infinite" }} />
            {STATUS_CFG[s].label} · {marcas.filter((m) => m.status === s).length}
          </div>
        ))}
      </div>

      <div className="ap-card" style={{ padding: 0, overflow: "hidden" }}>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ borderBottom: "1px solid rgba(0,0,0,0.07)", background: "rgba(0,0,0,0.02)" }}>
              {["Marca", "Segmento", "Plano", "Status", "Clientes", "MRR", "Ações"].map((h) => <th key={h} className="ap-th">{h}</th>)}
            </tr>
          </thead>
          <tbody>
            {marcas.map((m, i) => (
              <tr key={i} className="ap-tr">
                <td className="ap-td">
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <div style={{ width: 38, height: 38, borderRadius: 11, background: "rgba(0,0,0,0.06)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, fontWeight: 800, flexShrink: 0 }}>{m.nome[0]}</div>
                    <div><div style={{ fontSize: 14, fontWeight: 700 }}>{m.nome}</div><div style={{ fontSize: 11, color: T.muted }}>{m.responsavel || m.resp}</div></div>
                  </div>
                </td>
                <td className="ap-td"><span style={{ fontSize: 13, color: T.sub }}>{m.segmento || m.seg}</span></td>
                <td className="ap-td"><Chip label={PLANOS.find((p) => p.id === m.plano)?.label} c={PLANO_CFG[m.plano]?.c} bg={PLANO_CFG[m.plano]?.bg} /></td>
                <td className="ap-td"><Chip label={STATUS_CFG[m.status]?.label} c={STATUS_CFG[m.status]?.c} bg={STATUS_CFG[m.status]?.bg} /></td>
                <td className="ap-td"><span className="num" style={{ fontSize: 13 }}>{(m.clientes || 0).toLocaleString("pt-BR")}</span></td>
                <td className="ap-td"><span className="num" style={{ fontSize: 13, fontWeight: 700, color: "#4545F5" }}>R$ {m.mrr || PLANOS.find((p) => p.id === m.plano)?.preco || 0}</span></td>
                <td className="ap-td">
                  <div style={{ display: "flex", gap: 6 }}>
                    <button className="ap-btn ap-btn-secondary ap-btn-sm" onClick={() => setDetail(m)}>Ver</button>
                    {m.status === "ativo" && <button className="ap-btn ap-btn-danger ap-btn-sm" onClick={() => handleStatusChange(m.id, "inativo")}>Suspender</button>}
                    {m.status === "inativo" && <button className="ap-btn ap-btn-success ap-btn-sm" onClick={() => handleStatusChange(m.id, "ativo")}>Reativar</button>}
                    {m.status === "trial" && <button className="ap-btn ap-btn-success ap-btn-sm" onClick={() => handleStatusChange(m.id, "ativo")}>Ativar</button>}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {showModal && <NovaMarca onClose={() => setShowModal(false)} onSave={handleCreateMarca} />}
      {detail && (
        <Modal title={detail.nome} subtitle={detail.segmento || detail.seg} onClose={() => setDetail(null)} width={520}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            {[["Responsável", detail.responsavel || detail.resp], ["Email", detail.email], ["CNPJ", detail.cnpj], ["Cadastro", detail.created_at], ["Cidade/UF", `${detail.cidade || ""}/${detail.estado || ""}`], ["MRR", `R$ ${detail.mrr || PLANOS.find((p) => p.id === detail.plano)?.preco || 0}/mês`], ["Clientes", detail.clientes], ["Lojas", detail.lojas]].map(([k, v], i) => (
              <div key={i} style={{ background: "rgba(0,0,0,0.03)", borderRadius: 10, padding: "10px 14px" }}>
                <div style={{ fontSize: 10, color: T.muted, fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 4 }}>{k}</div>
                <div style={{ fontSize: 13, fontWeight: 600 }}>{v || "—"}</div>
              </div>
            ))}
          </div>
        </Modal>
      )}
    </div>
  );
}

function OwnerPlanos({ marcas }) {
  return (
    <div className="fade-up">
      <SectionHeader tag="Monetização" title="Planos" />
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 18 }}>
        {PLANOS.map((p, i) => {
          const st = PLANO_CFG[p.id];
          const ativos = marcas.filter((m) => m.plano === p.id && m.status === "ativo").length;
          const cliStr = String(p.clientes) === "∞" ? "Ilimitado" : `até ${Number(p.clientes).toLocaleString("pt-BR")}`;
          return (
            <div key={i} className="ap-card" style={{ padding: 28, border: `1.5px solid ${st.c}22`, background: st.bg }}>
              <Chip label={p.label} c={st.c} bg={`${st.c}20`} />
              <div className="num" style={{ fontSize: 36, fontWeight: 800, color: st.c, margin: "14px 0 2px" }}>
                R$ {p.preco}<span style={{ fontSize: 14, color: T.muted, fontFamily: "var(--sf)", fontWeight: 500 }}>/mês</span>
              </div>
              <div style={{ fontSize: 12, color: T.sub, marginBottom: 18 }}>{ativos} marca{ativos !== 1 ? "s" : ""} ativa{ativos !== 1 ? "s" : ""}</div>
              {[["🏪 Lojas", String(p.lojas) === "∞" ? "Ilimitado" : `até ${p.lojas}`], ["👤 Usuários", String(p.usuarios) === "∞" ? "Ilimitado" : `até ${p.usuarios}`], ["👥 Clientes", cliStr]].map(([l, v], j) => (
                <div key={j} style={{ display: "flex", justifyContent: "space-between", padding: "8px 0", borderBottom: `1px solid ${st.c}18` }}>
                  <span style={{ fontSize: 12, color: T.sub }}>{l}</span>
                  <span style={{ fontSize: 12, fontWeight: 700, color: st.c }}>{v}</span>
                </div>
              ))}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function OwnerFinanceiro({ marcas }) {
  const mrr = marcas.filter((m) => m.status === "ativo").reduce((s, m) => s + (m.mrr || 0), 0);
  return (
    <div className="fade-up">
      <SectionHeader tag="Receita" title="Financeiro" />
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 14, marginBottom: 20 }}>
        <KpiCard label="MRR" value={`R$ ${mrr.toLocaleString("pt-BR")}`} color="#4545F5" icon="💳" />
        <KpiCard label="ARR" value={`R$ ${((mrr * 12) / 1000).toFixed(1)}k`} color="#8e44ef" icon="📊" />
        <KpiCard label="Inadimplência" value="R$ 0" color="#28cd41" icon="✅" />
      </div>
      <div className="ap-card" style={{ padding: "22px 24px" }}>
        <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 16 }}>Receita por Marca</div>
        {marcas.filter((m) => (m.mrr || 0) > 0).sort((a, b) => (b.mrr || 0) - (a.mrr || 0)).map((m, i, arr) => (
          <div key={i} style={{ display: "flex", alignItems: "center", gap: 14, padding: "10px 0", borderBottom: i < arr.length - 1 ? "1px solid rgba(0,0,0,0.05)" : "none" }}>
            <span style={{ fontSize: 11, color: T.muted, fontWeight: 700, width: 20, textAlign: "right" }}>{i + 1}</span>
            <div style={{ width: 32, height: 32, borderRadius: 9, background: "rgba(0,0,0,0.06)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 800 }}>{m.nome[0]}</div>
            <span style={{ flex: 1, fontSize: 14, fontWeight: 600 }}>{m.nome}</span>
            <Chip label={PLANOS.find((p) => p.id === m.plano)?.label || m.plano} c={PLANO_CFG[m.plano]?.c} bg={PLANO_CFG[m.plano]?.bg} />
            <span className="num" style={{ fontWeight: 700, color: "#4545F5", fontSize: 14 }}>R$ {m.mrr}/mês</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function PortalOwner({ user, onLogout }) {
  const [page, setPage] = useState("dashboard");
  const { data: sbMarcas, loading: loadingMarcas, refetch: refetchMarcas } = useSupabaseQuery("marcas");
  const [localMarcas, setLocalMarcas] = useState(DB_FALLBACK.marcas);

  const marcas = sbMarcas && sbMarcas.length > 0 ? sbMarcas : localMarcas;
  const setMarcas = sbMarcas && sbMarcas.length > 0 ? () => {} : setLocalMarcas;

  return (
    <div style={{ display: "flex", height: "100vh", background: T.bg, overflow: "hidden" }}>
      <style>{STYLES}</style>
      <Sidebar page={page} setPage={setPage} user={user} onLogout={onLogout} isOwner />
      <div style={{ flex: 1, overflow: "auto", padding: "32px 36px" }}>
        {page === "dashboard" && <OwnerDashboard marcas={marcas} />}
        {page === "marcas" && <OwnerMarcas marcas={marcas} setMarcas={setMarcas} refetchMarcas={refetchMarcas} />}
        {page === "planos" && <OwnerPlanos marcas={marcas} />}
        {page === "financeiro" && <OwnerFinanceiro marcas={marcas} />}
      </div>
    </div>
  );
}

// ── MARCA PAGES ──────────────────────────────────────────────────────────────
function MarcaDashboard({ user }) {
  const rd = ROLE_CFG[user.role] || ROLE_CFG.vendedor;
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStats().then(s => { setStats(s); setLoading(false); }).catch(() => setLoading(false));
  }, []);

  const c = stats?.clientes || 0;
  const p = stats?.pedidos || 0;
  const r = stats?.receita || 0;
  const tm = stats?.ticket_medio || 0;
  const rfm = stats?.rfm || {};
  const topCli = stats?.top_clientes || [];
  const porMes = (stats?.pedidos_por_mes || []).map(m => ({ m: m.mes?.slice(5) || "", v: +m.v }));
  const totalRfm = Object.values(rfm).reduce((s,n) => s+n, 0) || 1;

  return (
    <div className="fade-up">
      <div style={{ marginBottom: 28 }}>
        <div style={{ fontSize: 10, fontWeight: 700, color: "#4545F5", letterSpacing: 0.8, textTransform: "uppercase", marginBottom: 6 }}>{rd.icon} {rd.label}</div>
        <h1 style={{ fontSize: 28, fontWeight: 700 }}>Olá, {user.nome.split(" ")[0]} 👋</h1>
        <p style={{ fontSize: 14, color: T.sub, marginTop: 4 }}>{new Date().toLocaleDateString("pt-BR", { weekday: "long", day: "numeric", month: "long" })}</p>
      </div>

      {loading && <div className="ap-card" style={{ padding: "20px 24px", marginBottom: 20, textAlign: "center" }}><span style={{ fontSize: 13, color: T.muted }}>⏳ Carregando dados...</span></div>}

      <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 14, marginBottom: 20 }}>
        <KpiCard label="Clientes" value={c.toLocaleString("pt-BR")} sub="cadastrados" color="#28cd41" icon="👥" />
        <KpiCard label="Pedidos" value={p.toLocaleString("pt-BR")} sub="aprovados" color="#4545F5" icon="🛍" />
        <KpiCard label="Receita" value={`R$ ${(r/1000).toFixed(1)}k`} sub="total aprovada" color="#8e44ef" icon="💰" />
        <KpiCard label="Ticket Médio" value={`R$ ${tm.toFixed(0)}`} sub="por pedido" color="#ff9500" icon="📊" />
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: 16, marginBottom: 16 }}>
        <div className="ap-card" style={{ padding: "22px 24px" }}>
          <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 4 }}>Receita Mensal</div>
          <div style={{ fontSize: 12, color: T.muted, marginBottom: 16 }}>Últimos meses — dados reais Shopify</div>
          {porMes.length > 0 ? (
            <ResponsiveContainer width="100%" height={180}>
              <AreaChart data={porMes}>
                <defs><linearGradient id="gr" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#4545F5" stopOpacity={0.2}/><stop offset="95%" stopColor="#4545F5" stopOpacity={0}/></linearGradient></defs>
                <XAxis dataKey="m" tick={{ fill: T.muted, fontSize: 11 }} axisLine={false} tickLine={false}/>
                <YAxis hide/>
                <Tooltip content={<ApTooltip/>}/>
                <Area type="monotone" dataKey="v" name="Receita" stroke="#4545F5" strokeWidth={2.5} fill="url(#gr)" dot={false}/>
              </AreaChart>
            </ResponsiveContainer>
          ) : <div style={{ textAlign: "center", padding: 40, color: T.muted }}>Sem dados de receita</div>}
        </div>

        <div className="ap-card" style={{ padding: "22px 24px" }}>
          <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 16 }}>Segmentação RFM</div>
          {Object.entries(RFM_CFG).map(([key, cfg], i) => (
            <div key={key} style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 0", borderBottom: i < 4 ? "1px solid rgba(0,0,0,0.05)" : "none" }}>
              <Chip label={cfg.label} c={cfg.c} bg={cfg.bg}/>
              <div style={{ flex: 1 }}><ProgressBar value={rfm[key] || 0} max={totalRfm} height={5}/></div>
              <span className="num" style={{ fontSize: 12, fontWeight: 700, color: cfg.c }}>{(rfm[key] || 0).toLocaleString("pt-BR")}</span>
            </div>
          ))}
        </div>
      </div>

      {topCli.length > 0 && (
        <div className="ap-card" style={{ padding: 0, overflow: "hidden" }}>
          <div style={{ padding: "16px 22px", borderBottom: "1px solid rgba(0,0,0,0.06)", display: "flex", justifyContent: "space-between" }}>
            <span style={{ fontSize: 15, fontWeight: 700 }}>Top 10 Clientes por Receita</span>
            <span style={{ fontSize: 12, color: T.muted }}>dados reais Shopify</span>
          </div>
          {topCli.map((cl, i) => (
            <div key={i} style={{ display: "flex", alignItems: "center", gap: 14, padding: "12px 22px", borderBottom: i < topCli.length-1 ? "1px solid rgba(0,0,0,0.05)" : "none" }}>
              <span className="num" style={{ fontSize: 11, color: T.muted, fontWeight: 700, width: 20, textAlign: "right" }}>{i+1}</span>
              <Avatar nome={cl.nome} size={32}/>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 14, fontWeight: 700 }}>{cl.nome}</div>
                <div style={{ fontSize: 11, color: T.muted }}>{cl.email || "—"} · {cl.total_pedidos} pedidos</div>
              </div>
              <Chip label={RFM_CFG[cl.segmento_rfm]?.label || "—"} c={RFM_CFG[cl.segmento_rfm]?.c} bg={RFM_CFG[cl.segmento_rfm]?.bg}/>
              <span className="num" style={{ fontSize: 14, fontWeight: 700, color: "#4545F5" }}>R$ {(+cl.receita_total).toLocaleString("pt-BR")}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function MarcaEquipe({ isAdmin, user }) {
  const marcaId = user?.marca_id || user?.marcaId;
  const { data: sbUsuarios, loading: loadingUsers, refetch: refetchUsers } = useSupabaseQuery("users", marcaId ? { eq: { marca_id: marcaId } } : {});
  const [localUsuarios, setLocalUsuarios] = useState(DB_FALLBACK.usuarios);

  const usuarios = sbUsuarios && sbUsuarios.length > 0 ? sbUsuarios : localUsuarios;
  const setUsuarios = sbUsuarios && sbUsuarios.length > 0 ? () => {} : setLocalUsuarios;

  const [showModal, setShowModal] = useState(false);

  function NovoUser({ onClose, onSave }) {
    const [f, setF] = useState({ nome: "", email: "", role: "vendedor", loja: "", meta: 30000 });
    const s = (k, v) => setF((x) => ({ ...x, [k]: v }));
    return (
      <Modal title="Adicionar Usuário" onClose={onClose} width={480}>
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <div><Lbl>Nome Completo *</Lbl><input className="ap-inp" value={f.nome} onChange={(e) => s("nome", e.target.value)} placeholder="Nome completo" /></div>
          <div><Lbl>Email *</Lbl> <input className="ap-inp" type="email" value={f.email} onChange={(e) => s("email", e.target.value)} placeholder="email@marca.com.br" /></div>
          <div>
            <label className="lbl">Função</label>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 10 }}>
              {["admin", "supervisor", "vendedor"].map((r) => (
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
          <button className="ap-btn ap-btn-primary" disabled={!f.nome || !f.email} onClick={() => { if (f.nome && f.email) { onSave({ ...f, id: `u${Date.now()}`, status: "ativo", vendas: 0, fat: 0 }); onClose(); } }}>
            Criar Usuário →
          </button>
        </div>
      </Modal>
    );
  }

  return (
    <div className="fade-up">
      <SectionHeader tag="Gestão" title="Equipe" action={isAdmin && <button className="ap-btn ap-btn-primary" onClick={() => setShowModal(true)}>+ Novo Usuário</button>} />
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 12, marginBottom: 20 }}>
        {[{ l: "Total", v: usuarios.length, c: "#4545F5" }, { l: "Admins", v: usuarios.filter((u) => u.role === "admin").length, c: "#8e44ef" }, { l: "Supervisores", v: usuarios.filter((u) => u.role === "supervisor").length, c: "#4545F5" }, { l: "Vendedores", v: usuarios.filter((u) => u.role === "vendedor").length, c: "#28cd41" }].map((k, i) => <KpiCard key={i} label={k.l} value={k.v} color={k.c} />)}
      </div>
      <div className="ap-card" style={{ padding: 0, overflow: "hidden" }}>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead><tr style={{ borderBottom: "1px solid rgba(0,0,0,0.07)", background: "rgba(0,0,0,0.02)" }}>{["Usuário", "Email", "Função", "Status", "Loja", ...(isAdmin ? ["Ações"] : [])].map((h) => <th key={h} className="ap-th">{h}</th>)}</tr></thead>
          <tbody>
            {usuarios.map((u, i) => (
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
      {showModal && <NovoUser onClose={() => setShowModal(false)} onSave={(u) => setUsuarios((a) => [...a, u])} />}
    </div>
  );
}

function MarcaRanking({ user }) {
  const marcaId = user?.marca_id || user?.marcaId;
  const { data: apiUsers } = useSupabaseQuery("users", marcaId ? { eq: { marca_id: marcaId } } : {});
  const isVend = user.role === "vendedor";

  const allVends = (apiUsers.length > 0 ? apiUsers : DB_FALLBACK.usuarios)
    .filter((u) => u.role === "vendedor")
    .sort((a, b) => (+(b.meta_mensal || b.meta || 0)) - (+(a.meta_mensal || a.meta || 0)));
  const list = isVend ? allVends.filter((v) => v.nome === user.nome) : allVends;
  const medals = ["🥇", "🥈", "🥉"];

  return (
    <div className="fade-up">
      <SectionHeader tag="Performance" title="Ranking da Equipe" />
      {isVend && <div style={{ background: "#eeeeff", border: "1px solid #4545F520", borderRadius: 12, padding: "12px 16px", marginBottom: 20, fontSize: 13, color: "#4545F5", fontWeight: 500 }}>👤 Você está visualizando apenas sua posição no ranking.</div>}
      {list.length === 0 && <div style={{ textAlign: "center", padding: 40, color: T.muted }}>Nenhum vendedor encontrado.</div>}
      <div style={{ display: "grid", gridTemplateColumns: `repeat(${Math.min(list.length || 1, 3)},1fr)`, gap: 14 }}>
        {list.map((v, i) => {
          const globalIdx = allVends.findIndex((x) => x.id === v.id);
          const meta = +(v.meta_mensal || v.meta || 0);
          const fat = +(v.fat || 0);
          const pct = meta > 0 ? Math.min(Math.round((fat / meta) * 100), 100) : 0;
          const bC = pct >= 100 ? "#28cd41" : pct >= 70 ? "#4545F5" : "#ff9500";
          return (
            <div key={v.id} className="ap-card" style={{ padding: 24, textAlign: "center", border: globalIdx === 0 ? "1.5px solid #ffd60a40" : "none" }}>
              <div style={{ fontSize: 32, marginBottom: 10 }}>{medals[globalIdx] || `${globalIdx + 1}°`}</div>
              <Avatar nome={v.nome} size={48} />
              <div style={{ fontSize: 15, fontWeight: 700, margin: "10px 0 2px" }}>{v.nome}</div>
              <div style={{ fontSize: 11, color: T.muted, marginBottom: 12 }}>{v.loja || "Todas"}</div>
              <div className="num" style={{ fontSize: 24, fontWeight: 800, color: bC }}>R$ {(fat / 1000).toFixed(1)}k</div>
              <div style={{ margin: "10px 0 4px" }}><ProgressBar value={fat} max={meta || 1} height={6} /></div>
              <div style={{ fontSize: 11, color: bC, fontWeight: 700 }}>{pct}% da meta{meta > 0 ? ` (R$ ${(meta/1000).toFixed(0)}k)` : ""}</div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function MarcaClientes({ user }) {
  const [allClientes, setAllClientes] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("todos");
  const [search, setSearch] = useState("");
  const [selectedCliente, setSelectedCliente] = useState(null);
  const [clienteDetail, setClienteDetail] = useState(null);
  const [loadingDetail, setLoadingDetail] = useState(false);

  useEffect(() => {
    const opts = { limit: 250 };
    if (filter !== "todos") opts.segmento_rfm = filter;
    if (search) opts.search = search;
    setLoading(true);
    fetchData("clientes", opts).then(r => { setAllClientes(r.data || []); setTotal(r.total || 0); setLoading(false); }).catch(() => setLoading(false));
  }, [filter, search]);

  const customers = allClientes;
  const counts = { customers: total };

  // API already filters by segmento_rfm and search, no need to re-filter client-side
  const filtered = customers;

  return (
    <div className="fade-up">
      <SectionHeader tag="CRM" title="Base de Clientes" action={<span className="num" style={{ fontSize: 13, color: T.muted }}>{counts.customers} total no Shopify · {customers.length} carregados</span>} />

      {/* Filtros */}
      <div style={{ display: "flex", gap: 8, marginBottom: 16, flexWrap: "wrap", alignItems: "center" }}>
        <div className="seg">
          {[{ k: "todos", l: "Todos" }, ...Object.entries(RFM_CFG).map(([k, v]) => ({ k, l: v.label }))].map((f) => (
            <button key={f.k} className={`seg-btn ${filter === f.k ? "on" : ""}`} onClick={() => setFilter(f.k)}>{f.l}</button>
          ))}
        </div>
        <input className="ap-inp" style={{ maxWidth: 220, padding: "8px 12px", fontSize: 13 }} placeholder="🔍 Buscar por nome ou email..." value={search} onChange={(e) => setSearch(e.target.value)} />
      </div>

      {loading && <div style={{ textAlign: "center", padding: 40, color: T.muted }}>⏳ Carregando clientes do Shopify...</div>}

      {!loading && filtered.length === 0 && <div style={{ textAlign: "center", padding: 40, color: T.muted }}>Nenhum cliente encontrado.</div>}

      {!loading && filtered.length > 0 && (
        <div className="ap-card" style={{ padding: 0, overflow: "hidden" }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead><tr style={{ borderBottom: "1px solid rgba(0,0,0,0.07)", background: "rgba(0,0,0,0.02)" }}>{["Cliente", "Email", "Telefone", "RFM", "Recência", "Pedidos", "Receita"].map((h) => <th key={h} className="ap-th">{h}</th>)}</tr></thead>
            <tbody>
              {filtered.slice(0, 100).map((c, i) => {
                const segKey = c.segmento_rfm;
                const rec = c.recencia_dias ?? 999;
                const ped = c.total_pedidos ?? 0;
                const rec_total = +(c.receita_total ?? 0);
                return (
                  <tr key={i} className="ap-tr" style={{ cursor: "pointer" }} onClick={() => setSelectedCliente(c.id)}>
                    <td className="ap-td"><div style={{ display: "flex", alignItems: "center", gap: 10 }}><Avatar nome={c.nome} size={32} /><div style={{ fontSize: 14, fontWeight: 700 }}>{c.nome}</div></div></td>
                    <td className="ap-td"><span style={{ fontSize: 13, color: T.sub }}>{c.email || "—"}</span></td>
                    <td className="ap-td"><span style={{ fontSize: 13, color: T.sub }}>{c.telefone || "—"}</span></td>
                    <td className="ap-td"><Chip label={RFM_CFG[segKey]?.label || "—"} c={RFM_CFG[segKey]?.c} bg={RFM_CFG[segKey]?.bg} /></td>
                    <td className="ap-td"><span className="num" style={{ fontSize: 13, color: rec > 90 ? "#ff3b30" : T.sub }}>{rec < 999 ? `${rec}d` : "—"}</span></td>
                    <td className="ap-td"><span className="num" style={{ fontSize: 13 }}>{ped}</span></td>
                    <td className="ap-td"><span className="num" style={{ fontWeight: 700, fontSize: 13 }}>R$ {rec_total.toLocaleString("pt-BR")}</span></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {filtered.length > 100 && <div style={{ padding: "12px 22px", background: "rgba(0,0,0,0.02)", fontSize: 12, color: T.muted, textAlign: "center" }}>Mostrando 100 de {filtered.length} clientes</div>}
        </div>
      )}

      {selectedCliente && <ClienteDetailModal clienteId={selectedCliente} onClose={() => { setSelectedCliente(null); setClienteDetail(null); }} />}
    </div>
  );
}

function ClienteDetailModal({ clienteId, onClose }) {
  const [detail, setDetail] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    fetchClienteDetail(clienteId)
      .then((d) => { setDetail(d); setLoading(false); })
      .catch(() => setLoading(false));
  }, [clienteId]);

  const c = detail?.cliente;
  const pedidos = detail?.pedidos || [];
  const timeline = detail?.timeline || [];
  const mensagens = detail?.mensagens || [];

  return (
    <Modal title={c?.nome || "Cliente"} subtitle={c?.email || ""} onClose={onClose} width={680}>
      {loading && <div style={{ textAlign: "center", padding: 40, color: T.muted }}>⏳ Carregando detalhes...</div>}
      {!loading && !c && <div style={{ textAlign: "center", padding: 40, color: T.muted }}>Cliente não encontrado.</div>}
      {!loading && c && (
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {/* Info grid */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10 }}>
            {[
              ["Segmento RFM", RFM_CFG[c.segmento_rfm]?.label || c.segmento_rfm || "—"],
              ["Recência", c.recencia_dias != null ? `${c.recencia_dias} dias` : "—"],
              ["Total Pedidos", c.total_pedidos ?? "—"],
              ["Receita Total", `R$ ${(+(c.receita_total || 0)).toLocaleString("pt-BR")}`],
              ["Telefone", c.telefone || "—"],
              ["Cadastro", c.created_at ? new Date(c.created_at).toLocaleDateString("pt-BR") : "—"],
            ].map(([k, v], i) => (
              <div key={i} style={{ background: "rgba(0,0,0,0.03)", borderRadius: 10, padding: "10px 14px" }}>
                <div style={{ fontSize: 10, color: T.muted, fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 4 }}>{k}</div>
                <div style={{ fontSize: 13, fontWeight: 600 }}>{v}</div>
              </div>
            ))}
          </div>

          {c.notas && (
            <div style={{ background: "#fff3e0", borderRadius: 10, padding: "10px 14px", fontSize: 13, color: "#cc7700" }}>
              <strong>Notas:</strong> {c.notas}
            </div>
          )}

          {/* Pedidos */}
          {pedidos.length > 0 && (
            <div>
              <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 8 }}>Últimos Pedidos ({pedidos.length})</div>
              <div className="ap-card" style={{ padding: 0, overflow: "hidden" }}>
                <table style={{ width: "100%", borderCollapse: "collapse" }}>
                  <thead><tr style={{ background: "rgba(0,0,0,0.02)", borderBottom: "1px solid rgba(0,0,0,0.07)" }}>
                    {["Data", "Valor", "Status"].map((h) => <th key={h} className="ap-th">{h}</th>)}
                  </tr></thead>
                  <tbody>
                    {pedidos.slice(0, 10).map((p, i) => (
                      <tr key={i} className="ap-tr">
                        <td className="ap-td"><span style={{ fontSize: 12, color: T.sub }}>{p.created_at ? new Date(p.created_at).toLocaleDateString("pt-BR") : "—"}</span></td>
                        <td className="ap-td"><span className="num" style={{ fontSize: 13, fontWeight: 700 }}>R$ {(+(p.valor_total || 0)).toLocaleString("pt-BR")}</span></td>
                        <td className="ap-td"><Chip label={p.status || "—"} c={p.status === "pago" ? "#28cd41" : "#ff9500"} bg={p.status === "pago" ? "#e9fbed" : "#fff3e0"} /></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Timeline */}
          {timeline.length > 0 && (
            <div>
              <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 8 }}>Timeline</div>
              {timeline.slice(0, 10).map((ev, i) => (
                <div key={i} style={{ display: "flex", gap: 10, padding: "8px 0", borderBottom: i < Math.min(timeline.length, 10) - 1 ? "1px solid rgba(0,0,0,0.05)" : "none" }}>
                  <div style={{ width: 28, height: 28, borderRadius: 8, background: "#eeeeff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, flexShrink: 0 }}>
                    {ev.tipo === "compra" ? "🛍" : ev.tipo === "mensagem" ? "💬" : ev.tipo === "tarefa" ? "📋" : "📌"}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 13, fontWeight: 600 }}>{ev.titulo}</div>
                    {ev.descricao && <div style={{ fontSize: 12, color: T.sub }}>{ev.descricao}</div>}
                    <div style={{ fontSize: 10, color: T.muted }}>{ev.created_at ? new Date(ev.created_at).toLocaleString("pt-BR") : ""}</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </Modal>
  );
}

function MarcaAgenda({ user }) {
  const marcaId = user?.marca_id || user?.marcaId;
  const { data: sbTarefas, refetch: refetchTarefas } = useSupabaseQuery("tarefas", marcaId ? { eq: { marca_id: marcaId } } : {});
  const [showModal, setShowModal] = useState(false);

  const tasks = sbTarefas && sbTarefas.length > 0 ? sbTarefas : [];

  const ICONS = { whatsapp: "💬", ligacao: "📞", presencial: "🤝", email: "✉️", outro: "📋" };

  const toggle = async (t) => {
    try {
      await updateRecord("tarefas", t.id, { concluida: !t.concluida });
      await refetchTarefas();
    } catch (e) {
      console.error("Erro ao atualizar tarefa:", e);
    }
  };

  const vencidos = tasks.filter((t) => !t.concluida && t.data_limite && new Date(t.data_limite) < new Date()).length;

  function NovaTarefa({ onClose }) {
    const [f, setF] = useState({ titulo: "", descricao: "", tipo: "outro", data_limite: "" });
    const s = (k, v) => setF((x) => ({ ...x, [k]: v }));
    const [saving, setSaving] = useState(false);
    return (
      <Modal title="Nova Tarefa" subtitle="Crie uma nova tarefa para a equipe" onClose={onClose} width={480}>
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <div><Lbl>Título *</Lbl><input className="ap-inp" value={f.titulo} onChange={(e) => s("titulo", e.target.value)} placeholder="Ex: Retornar cliente VIP" /></div>
          <div><Lbl>Descrição</Lbl><input className="ap-inp" value={f.descricao} onChange={(e) => s("descricao", e.target.value)} placeholder="Detalhes da tarefa..." /></div>
          <FormRow>
            <div>
              <Lbl>Tipo</Lbl>
              <select className="ap-sel" value={f.tipo} onChange={(e) => s("tipo", e.target.value)}>
                {[["whatsapp","WhatsApp"],["ligacao","Ligação"],["email","Email"],["presencial","Presencial"],["outro","Outro"]].map(([v,l]) => <option key={v} value={v}>{l}</option>)}
              </select>
            </div>
            <div><Lbl>Data Limite</Lbl><input className="ap-inp" type="datetime-local" value={f.data_limite} onChange={(e) => s("data_limite", e.target.value)} /></div>
          </FormRow>
          <button className="ap-btn ap-btn-primary" disabled={!f.titulo || saving} onClick={async () => {
            setSaving(true);
            try {
              await createRecord("tarefas", {
                titulo: f.titulo, descricao: f.descricao, tipo: f.tipo,
                data_limite: f.data_limite || null, concluida: false,
                marca_id: marcaId, responsavel_id: user.id,
              });
              await refetchTarefas();
              onClose();
            } catch (e) { console.error(e); }
            setSaving(false);
          }}>{saving ? "Salvando…" : "Criar Tarefa →"}</button>
        </div>
      </Modal>
    );
  }

  return (
    <div className="fade-up">
      <SectionHeader tag="Atendimentos" title="Agenda" action={<button className="ap-btn ap-btn-primary" onClick={() => setShowModal(true)}>+ Nova Tarefa</button>} />
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 12, marginBottom: 20 }}>
        <KpiCard label="Pendentes" value={tasks.filter((t) => !t.concluida).length} color="#ff9500" icon="⏰" />
        <KpiCard label="Concluídos" value={tasks.filter((t) => t.concluida).length} color="#28cd41" icon="✅" />
        <KpiCard label="Vencidos" value={vencidos} color="#ff3b30" icon="❌" />
      </div>
      {tasks.length === 0 && <div style={{ textAlign: "center", padding: 40, color: T.muted }}>Nenhuma tarefa encontrada. Crie uma nova!</div>}
      {tasks.map((t, i) => {
        const tipoKey = (t.tipo || "outro").toLowerCase();
        const dataStr = t.data_limite ? new Date(t.data_limite).toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" }) : "";
        return (
          <div key={t.id || i} className="ap-card" style={{ display: "flex", gap: 14, alignItems: "center", padding: "14px 18px", marginBottom: 10 }}>
            <div style={{ width: 42, height: 42, borderRadius: 12, background: t.concluida ? "#e9fbed" : "#eeeeff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18, flexShrink: 0 }}>{ICONS[tipoKey] || "📋"}</div>
            <div style={{ flex: 1 }}><div style={{ fontSize: 14, fontWeight: 700 }}>{t.titulo}</div><div style={{ fontSize: 12, color: T.sub }}>{t.tipo || ""}{dataStr ? ` · ${dataStr}` : ""}{t.descricao ? ` · ${t.descricao}` : ""}</div></div>
            <Chip label={t.concluida ? "Concluído" : "Pendente"} c={t.concluida ? "#28cd41" : "#ff9500"} bg={t.concluida ? "#e9fbed" : "#fff3e0"} />
            <button className="ap-btn ap-btn-secondary ap-btn-sm" onClick={() => toggle(t)}>{t.concluida ? "Reabrir" : "Concluir"}</button>
          </div>
        );
      })}
      {showModal && <NovaTarefa onClose={() => setShowModal(false)} />}
    </div>
  );
}

function MarcaCampanhas({ user }) {
  const marcaId = user?.marca_id || user?.marcaId;
  const { data: sbCampanhas, refetch: refetchCampanhas } = useSupabaseQuery("campanhas", marcaId ? { eq: { marca_id: marcaId } } : {});
  const [showModal, setShowModal] = useState(false);

  const cps = sbCampanhas && sbCampanhas.length > 0 ? sbCampanhas : [];

  const CANAL_ICON = { whatsapp: "💬", email: "✉️", sms: "📱" };
  const CANAL_COLOR = { whatsapp: "#128C7E", email: "#4545F5", sms: "#ff9500" };
  const CANAL_BG = { whatsapp: "#e9fbed", email: "#eeeeff", sms: "#fff3e0" };

  const handleSend = async (c) => {
    try {
      await updateRecord("campanhas", c.id, { status: "ativa" });
      await refetchCampanhas();
    } catch (e) { console.error(e); }
  };

  function NovaCampanha({ onClose }) {
    const [f, setF] = useState({ nome: "", tipo: "whatsapp", segmento_alvo: "", mensagem: "" });
    const s = (k, v) => setF((x) => ({ ...x, [k]: v }));
    const [saving, setSaving] = useState(false);
    return (
      <Modal title="Nova Campanha" subtitle="Configure uma nova campanha de marketing" onClose={onClose} width={520}>
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <div><Lbl>Nome da Campanha *</Lbl><input className="ap-inp" value={f.nome} onChange={(e) => s("nome", e.target.value)} placeholder="Ex: Reativação 90 dias" /></div>
          <FormRow>
            <div>
              <Lbl>Canal</Lbl>
              <select className="ap-sel" value={f.tipo} onChange={(e) => s("tipo", e.target.value)}>
                <option value="whatsapp">WhatsApp</option>
                <option value="email">Email</option>
                <option value="sms">SMS</option>
              </select>
            </div>
            <div><Lbl>Segmento Alvo</Lbl><input className="ap-inp" value={f.segmento_alvo} onChange={(e) => s("segmento_alvo", e.target.value)} placeholder="Ex: campiao, em_risco" /></div>
          </FormRow>
          <div><Lbl>Mensagem</Lbl><textarea className="ap-inp" rows={3} value={f.mensagem} onChange={(e) => s("mensagem", e.target.value)} placeholder="Texto da campanha..." style={{ resize: "vertical" }} /></div>
          <button className="ap-btn ap-btn-primary" disabled={!f.nome || saving} onClick={async () => {
            setSaving(true);
            try {
              await createRecord("campanhas", {
                nome: f.nome, tipo: f.tipo, segmento_alvo: f.segmento_alvo,
                mensagem: f.mensagem, status: "rascunho", enviados: 0,
                abertos: 0, convertidos: 0, receita: 0, marca_id: marcaId,
              });
              await refetchCampanhas();
              onClose();
            } catch (e) { console.error(e); }
            setSaving(false);
          }}>{saving ? "Salvando…" : "Criar Campanha →"}</button>
        </div>
      </Modal>
    );
  }

  return (
    <div className="fade-up">
      <SectionHeader tag="Marketing" title="Campanhas" action={<button className="ap-btn ap-btn-primary" onClick={() => setShowModal(true)}>+ Nova Campanha</button>} />
      {cps.length === 0 && <div style={{ textAlign: "center", padding: 40, color: T.muted }}>Nenhuma campanha encontrada. Crie uma nova!</div>}
      {cps.map((c, i) => {
        const tipoKey = (c.tipo || "email").toLowerCase();
        const canalLabel = tipoKey === "whatsapp" ? "WhatsApp" : tipoKey === "email" ? "Email" : "SMS";
        const statusLabel = c.status === "ativa" || c.status === "enviada" ? "Enviada" : c.status === "concluida" ? "Concluída" : "Rascunho";
        const statusC = c.status === "ativa" || c.status === "enviada" || c.status === "concluida" ? "#28cd41" : "#aeaeb2";
        const statusBg = c.status === "ativa" || c.status === "enviada" || c.status === "concluida" ? "#e9fbed" : "#f5f5f7";
        return (
          <div key={c.id || i} className="ap-card" style={{ padding: "18px 22px", marginBottom: 10, display: "flex", alignItems: "center", gap: 14 }}>
            <div style={{ width: 44, height: 44, borderRadius: 12, background: CANAL_BG[tipoKey] || "#eeeeff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20 }}>{CANAL_ICON[tipoKey] || "✉️"}</div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 6 }}>{c.nome}</div>
              <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                <Chip label={canalLabel} c={CANAL_COLOR[tipoKey] || "#4545F5"} bg={CANAL_BG[tipoKey] || "#eeeeff"} />
                <Chip label={statusLabel} c={statusC} bg={statusBg} />
                {(c.enviados || 0) > 0 && <span style={{ fontSize: 12, color: T.muted }}>{c.enviados} enviados · <span style={{ color: "#28cd41", fontWeight: 600 }}>R$ {(+(c.receita || 0)).toLocaleString("pt-BR")}</span></span>}
              </div>
            </div>
            {c.status === "rascunho" && <button className="ap-btn ap-btn-primary ap-btn-sm" onClick={() => handleSend(c)}>Enviar Agora</button>}
          </div>
        );
      })}
      {showModal && <NovaCampanha onClose={() => setShowModal(false)} />}
    </div>
  );
}

function MarcaUsuarios({ user }) {
  return (
    <div className="fade-up">
      <SectionHeader tag="Configurações" title="Gestão de Usuários" />
      <div style={{ background: "#eeeeff", border: "1px solid #4545F522", borderRadius: 14, padding: "14px 18px", marginBottom: 20 }}>
        <div style={{ fontSize: 11, fontWeight: 700, color: "#4545F5", letterSpacing: 0.5, textTransform: "uppercase", marginBottom: 10 }}>Hierarquia de Permissões</div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 10 }}>
          {[{ role: "admin", perms: ["Acesso total", "Criar/excluir usuários", "Configurar marca", "Ver todos os dados"] }, { role: "supervisor", perms: ["Ver equipe toda", "Relatórios", "Editar clientes", "Sem acesso a config"] }, { role: "vendedor", perms: ["Seus clientes", "Suas tarefas", "Registrar vendas", "Sem acesso a config"] }].map((r, i) => (
            <div key={i} style={{ background: ROLE_CFG[r.role].bg, border: `1px solid ${ROLE_CFG[r.role].c}22`, borderRadius: 12, padding: 12 }}>
              <Chip label={`${ROLE_CFG[r.role].icon} ${ROLE_CFG[r.role].label}`} c={ROLE_CFG[r.role].c} bg={`${ROLE_CFG[r.role].c}25`} />
              <div style={{ marginTop: 8, display: "flex", flexDirection: "column", gap: 4 }}>
                {r.perms.map((p, j) => <div key={j} style={{ fontSize: 11, color: T.sub, display: "flex", gap: 5 }}><span style={{ color: ROLE_CFG[r.role].c }}>✓</span>{p}</div>)}
              </div>
            </div>
          ))}
        </div>
      </div>
      <MarcaEquipe isAdmin={true} user={user} />
    </div>
  );
}

function MarcaConfig() {
  const [tab, setTab] = useState("dados");
  const [integs, setIntegs] = useState([
    { l: "Shopify", icon: "🛍", desc: "E-commerce sincronizado", on: true },
    { l: "WhatsApp API", icon: "💬", desc: "Automações ativas", on: true },
    { l: "ERP", icon: "📦", desc: "Não conectado", on: false },
    { l: "Google Ads", icon: "📢", desc: "Não configurado", on: false },
  ]);
  const [notifs, setNotifs] = useState([
    { l: "Email de novos pedidos", on: true },
    { l: "Alertas de churn", on: true },
    { l: "Relatório semanal", on: false },
  ]);

  return (
    <div className="fade-up">
      <SectionHeader tag="Configurações" title="Configurações da Marca" />
      <div className="seg" style={{ marginBottom: 24 }}>
        {[{ k: "dados", l: "Dados" }, { k: "integracoes", l: "Integrações" }, { k: "notificacoes", l: "Notificações" }].map((t) => (
          <button key={t.k} className={`seg-btn ${tab === t.k ? "on" : ""}`} onClick={() => setTab(t.k)}>{t.l}</button>
        ))}
      </div>

      {tab === "dados" && (
        <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: 20 }}>
          <div className="ap-card" style={{ padding: 24 }}>
            <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 18 }}>Dados da Marca</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <div><Lbl>Nome da Marca</Lbl> <input className="ap-inp" defaultValue="Miner Fashion" /></div>
              <div><Lbl>Segmento</Lbl> <input className="ap-inp" defaultValue="Moda & Vestuario" /></div>
              <FormRow>
                <div><Lbl>Email</Lbl> <input className="ap-inp" type="email" defaultValue="admin@minerfashion.com.br" /></div>
                <div><Lbl>Telefone</Lbl> <input className="ap-inp" defaultValue="(99) 98765-4321" /></div>
              </FormRow>
              <button className="ap-btn ap-btn-primary" style={{ width: "fit-content" }}>Salvar Alterações</button>
            </div>
          </div>
          <div className="ap-card" style={{ padding: 24 }}>
            <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 14 }}>Plano Atual</div>
            <Chip label="Pro" c="#4545F5" bg="#eeeeff" />
            <div className="num" style={{ fontSize: 28, fontWeight: 800, color: "#4545F5", margin: "10px 0" }}>R$ 497/mês</div>
            <button className="ap-btn ap-btn-secondary" style={{ width: "100%" }}>Fazer Upgrade →</button>
          </div>
        </div>
      )}

      {tab === "integracoes" && (
        <div className="ap-card" style={{ padding: 24 }}>
          <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 16 }}>Integrações</div>
          {integs.map((it, i) => (
            <div key={i} style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 0", borderBottom: i < integs.length - 1 ? "1px solid rgba(0,0,0,0.05)" : "none" }}>
              <span style={{ fontSize: 20 }}>{it.icon}</span>
              <div style={{ flex: 1 }}><div style={{ fontSize: 14, fontWeight: 600 }}>{it.l}</div><div style={{ fontSize: 12, color: T.muted }}>{it.desc}</div></div>
              <Toggle checked={it.on} onChange={() => setIntegs((a) => a.map((x, j) => (j === i ? { ...x, on: !x.on } : x)))} />
            </div>
          ))}
        </div>
      )}

      {tab === "notificacoes" && (
        <div className="ap-card" style={{ padding: 24 }}>
          <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 16 }}>Notificações</div>
          {notifs.map((n, i) => (
            <div key={i} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 0", borderBottom: i < notifs.length - 1 ? "1px solid rgba(0,0,0,0.05)" : "none" }}>
              <span style={{ fontSize: 14, fontWeight: 500 }}>{n.l}</span>
              <Toggle checked={n.on} onChange={() => setNotifs((a) => a.map((x, j) => (j === i ? { ...x, on: !x.on } : x)))} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function PortalMarca({ user, onLogout }) {
  const [page, setPage] = useState("dashboard");
  const isAdmin = user.role === "admin";
  const isSup = user.role === "supervisor" || isAdmin;
  return (
    <div style={{ display: "flex", height: "100vh", background: T.bg, overflow: "hidden" }}>
      <style>{STYLES}</style>
      <Sidebar page={page} setPage={setPage} user={user} onLogout={onLogout} />
      <div style={{ flex: 1, overflow: "auto", padding: "32px 36px" }}>
        {page === "dashboard" && <MarcaDashboard user={user} />}
        {page === "equipe" && isSup && <MarcaEquipe isAdmin={isAdmin} user={user} />}
        {page === "ranking" && <MarcaRanking user={user} />}
        {page === "clientes" && <MarcaClientes user={user} />}
        {page === "agenda" && <MarcaAgenda user={user} />}
        {page === "campanhas" && isAdmin && <MarcaCampanhas user={user} />}
        {page === "integracoes" && isAdmin && <MarcaIntegracoes user={user} />}
        {page === "exportar" && <MarcaDados user={user} />}
        {page === "usuarios" && isAdmin && <MarcaUsuarios user={user} />}
        {page === "config" && isAdmin && <MarcaConfig />}
      </div>
    </div>
  );
}

// ── INTEGRAÇÕES API ──────────────────────────────────────────────────────────
function MarcaIntegracoes({ user }) {
  const [tab, setTab] = useState("conexoes");
  const [apiKeys, setApiKeys] = useState([
    { id: "k1", nome: "Producao", key: "mk_live_4xF9...a8Kp", criado: "01 Jan 2026", ultimo: "Hoje 14:32", ativo: true },
    { id: "k2", nome: "Desenvolvimento", key: "mk_test_9bR2...j3Wq", criado: "15 Dez 2025", ultimo: "Ontem 09:10", ativo: true },
    { id: "k3", nome: "Legado", key: "mk_live_1aA0...z7Xm", criado: "10 Mar 2025", ultimo: "Nunca", ativo: false },
  ]);
  const [webhooks, setWebhooks] = useState([
    { id: "w1", url: "https://minha-loja.com/webhook/miner", eventos: ["venda.criada", "cliente.novo"], status: "ativo", ultdisparo: "Hoje 14:32", sucessos: 1847, erros: 3 },
    { id: "w2", url: "https://automacao.com/trigger/recompra", eventos: ["cliente.inativo", "carrinho.abandono"], status: "ativo", ultdisparo: "Ontem 22:01", sucessos: 412, erros: 0 },
    { id: "w3", url: "https://erp.empresa.com/api/sync", eventos: ["venda.criada"], status: "erro", ultdisparo: "02 Fev 17:44", sucessos: 89, erros: 24 },
  ]);
  const [conexoes, setConexoes] = useState([
    { id: "c1", nome: "Shopify", icon: "🛍", desc: "E-commerce", status: "conectado", ultimo: "Hoje 14:30", config: { loja: "minha-loja.myshopify.com", token: "shpat_••••••••" } },
    { id: "c2", nome: "WhatsApp Cloud", icon: "💬", desc: "Mensagens e bots", status: "conectado", ultimo: "Hoje 09:00", config: { numero: "+55 99 98765-4321", token: "EAAm••••••••" } },
    { id: "c3", nome: "Google Ads", icon: "📢", desc: "Campanhas pagas", status: "desconectado", ultimo: "—", config: {} },
    { id: "c4", nome: "Meta Ads", icon: "📘", desc: "Facebook / Instagram", status: "desconectado", ultimo: "—", config: {} },
    { id: "c5", nome: "ERP / TOTVS", icon: "📦", desc: "Gestão de estoque", status: "erro", ultimo: "02 Fev", config: { url: "https://totvs.empresa.com", usuario: "api_user" } },
    { id: "c6", nome: "Mailchimp", icon: "✉️", desc: "Email marketing", status: "desconectado", ultimo: "—", config: {} },
  ]);

  const [showNewKey, setShowNewKey] = useState(false);
  const [showNewWh, setShowNewWh] = useState(false);
  const [detailConn, setDetailConn] = useState(null);
  const [copied, setCopied] = useState(null);

  const copyKey = (k) => { navigator.clipboard.writeText(k).catch(() => {}); setCopied(k); setTimeout(() => setCopied(null), 2000); };

  const ST_CONN = {
    conectado: { label: "Conectado", c: "#28cd41", bg: "#e9fbed" },
    desconectado: { label: "Desconectado", c: "#aeaeb2", bg: "#f5f5f7" },
    erro: { label: "Erro", c: "#ff3b30", bg: "#ffe5e3" },
  };

  function NovaKeyModal({ onClose, onSave }) {
    const [nome, setNome] = useState("");
    const [tipo, setTipo] = useState("live");
    return (
      <Modal title="Gerar Nova API Key" subtitle="A chave será exibida apenas uma vez" onClose={onClose} width={460}>
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <div><Lbl>Nome da chave *</Lbl><input className="ap-inp" value={nome} onChange={(e) => setNome(e.target.value)} placeholder="Ex: Integração ERP" /></div>
          <div>
            <label className="lbl">Ambiente</label>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              {[{ v: "live", l: "Produção", c: "#28cd41", bg: "#e9fbed" }, { v: "test", l: "Teste/Dev", c: "#ff9500", bg: "#fff3e0" }].map((op) => (
                <div key={op.v} onClick={() => setTipo(op.v)} style={{ padding: 14, borderRadius: 12, border: `2px solid ${tipo === op.v ? op.c : "rgba(0,0,0,0.08)"}`, background: tipo === op.v ? op.bg : "#fff", cursor: "pointer", textAlign: "center", transition: "all .15s" }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: tipo === op.v ? op.c : T.sub }}>{op.l}</div>
                  <div style={{ fontSize: 11, color: T.muted }}>mk_{op.v}_...</div>
                </div>
              ))}
            </div>
          </div>
          <div style={{ background: "#fff3e0", border: "1px solid #ff950030", borderRadius: 10, padding: "10px 14px", fontSize: 12, color: "#cc7700" }}>⚠️ Guarde a chave em local seguro. Após fechar, não será possível visualizá-la novamente.</div>
          <button className="ap-btn ap-btn-primary" disabled={!nome} onClick={() => { if (nome) { const rand = Math.random().toString(36).slice(2, 10); onSave({ id: `k${Date.now()}`, nome, key: `mk_${tipo}_${rand}...xxxx`, criado: "Agora", ultimo: "Nunca", ativo: true }); onClose(); } }}>Gerar API Key →</button>
        </div>
      </Modal>
    );
  }

  function NovoWebhookModal({ onClose, onSave }) {
    const [url, setUrl] = useState("");
    const [evs, setEvs] = useState([]);
    const [secret, setSecret] = useState("");
    const EVENTOS = ["venda.criada", "venda.atualizada", "cliente.novo", "cliente.inativo", "carrinho.abandono", "campanha.enviada", "pagamento.confirmado", "reembolso.solicitado"];
    const toggleEv = (ev) => setEvs((a) => (a.includes(ev) ? a.filter((x) => x !== ev) : [...a, ev]));
    return (
      <Modal title="Novo Webhook" subtitle="Configure o endpoint que receberá os eventos" onClose={onClose} width={520}>
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <div><Lbl>URL do Endpoint *</Lbl><input className="ap-inp" value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://seu-sistema.com/webhook" /></div>
          <div><Lbl sub="Opcional — usado para verificar assinatura HMAC">Secret Key</Lbl><input className="ap-inp mono" value={secret} onChange={(e) => setSecret(e.target.value)} placeholder="whsec_..." /></div>
          <div>
            <label className="lbl">Eventos <span style={{ color: T.muted, fontWeight: 400 }}>({evs.length} selecionados)</span></label>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6 }}>
              {EVENTOS.map((ev) => (
                <div key={ev} onClick={() => toggleEv(ev)} style={{ padding: "8px 12px", borderRadius: 9, fontSize: 12, fontWeight: 500, cursor: "pointer", transition: "all .12s", background: evs.includes(ev) ? "#eeeeff" : "rgba(0,0,0,0.04)", border: `1.5px solid ${evs.includes(ev) ? "#4545F5" : "rgba(0,0,0,0.07)"}`, color: evs.includes(ev) ? "#4545F5" : T.sub }}>{evs.includes(ev) ? "✓ " : ""}{ev}</div>
              ))}
            </div>
          </div>
          <button className="ap-btn ap-btn-primary" disabled={!url || evs.length === 0} onClick={() => { if (url && evs.length) { onSave({ id: `w${Date.now()}`, url, eventos: evs, status: "ativo", ultdisparo: "Nunca", sucessos: 0, erros: 0 }); onClose(); } }}>Criar Webhook →</button>
        </div>
      </Modal>
    );
  }

  function ConexaoModal({ conn, onClose }) {
    const st = ST_CONN[conn.status];
    const [form, setForm] = useState(conn.config || {});
    const s = (k, v) => setForm((x) => ({ ...x, [k]: v }));
    const fields = {
      Shopify: [["loja", "URL da loja", "minha-loja.myshopify.com"], ["token", "Access Token", "shpat_..."]],
      "WhatsApp Cloud": [["numero", "Número", "+ 55 99 ..."], ["token", "Bearer Token", "EAAm..."]],
      "ERP / TOTVS": [["url", "URL da API", "https://..."], ["usuario", "Usuário API", "api_user"], ["senha", "Senha", "••••••••"]],
      "Google Ads": [["cid", "Customer ID", "123-456-7890"], ["token", "Developer Token", "••••••••"]],
      "Meta Ads": [["adaccount", "Ad Account ID", "act_123456789"], ["token", "Access Token", "EAAm..."]],
      Mailchimp: [["apikey", "API Key", "abc123-us14"], ["lista", "ID da lista", "abc12345"]],
    };
    const flds = fields[conn.nome] || [];
    return (
      <Modal title={`${conn.icon} ${conn.nome}`} subtitle={conn.desc} onClose={onClose} width={480}>
        <div style={{ display: "flex", gap: 10, alignItems: "center", marginBottom: 20 }}>
          <Chip label={st.label} c={st.c} bg={st.bg} />
          {conn.ultimo !== "—" && <span style={{ fontSize: 12, color: T.muted }}>Último sync: {conn.ultimo}</span>}
        </div>
        {conn.status === "erro" && <div style={{ background: "#ffe5e3", border: "1px solid #ff3b3030", borderRadius: 10, padding: "10px 14px", fontSize: 12, color: "#ff3b30", marginBottom: 16 }}>⚠️ Falha na última sincronização. Verifique as credenciais e a conectividade.</div>}
        {flds.length > 0 && <div style={{ display: "flex", flexDirection: "column", gap: 12, marginBottom: 20 }}>{flds.map(([k, lbl, ph]) => <div key={k}><Lbl>{lbl}</Lbl><input className="ap-inp" value={form[k] || ""} onChange={(e) => s(k, e.target.value)} placeholder={ph} /></div>)}</div>}
        <div style={{ display: "flex", gap: 10 }}>
          <button className="ap-btn ap-btn-primary" style={{ flex: 1 }} onClick={() => { setConexoes((a) => a.map((x) => x.id === conn.id ? { ...x, status: "conectado", ultimo: "Agora", config: form } : x)); onClose(); }}>{conn.status === "conectado" ? "Salvar Alterações" : "Conectar →"}</button>
          {conn.status === "conectado" && <button className="ap-btn ap-btn-danger" onClick={() => { setConexoes((a) => a.map((x) => x.id === conn.id ? { ...x, status: "desconectado", ultimo: "—" } : x)); onClose(); }}>Desconectar</button>}
        </div>
      </Modal>
    );
  }

  return (
    <div className="fade-up">
      <SectionHeader tag="Dados & Automação" title="Integrações & API" />
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 14, marginBottom: 24 }}>
        <KpiCard label="Conexões Ativas" value={conexoes.filter((c) => c.status === "conectado").length} color="#28cd41" icon="🔗" />
        <KpiCard label="API Keys" value={apiKeys.filter((k) => k.ativo).length} color="#4545F5" icon="🔑" />
        <KpiCard label="Webhooks" value={webhooks.filter((w) => w.status === "ativo").length} color="#8e44ef" icon="⚡" />
        <KpiCard label="Erros" value={conexoes.filter((c) => c.status === "erro").length + webhooks.filter((w) => w.status === "erro").length} color="#ff3b30" icon="❌" />
      </div>

      <div className="seg" style={{ marginBottom: 24 }}>
        {[{ k: "conexoes", l: "Conexões" }, { k: "apikeys", l: "API Keys" }, { k: "webhooks", l: "Webhooks" }, { k: "docs", l: "Documentação" }].map((t) => (
          <button key={t.k} className={`seg-btn ${tab === t.k ? "on" : ""}`} onClick={() => setTab(t.k)}>{t.l}</button>
        ))}
      </div>

      {tab === "conexoes" && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 14 }}>
          {conexoes.map((c, i) => { const st = ST_CONN[c.status]; return (
            <div key={i} className="ap-card" style={{ padding: 22, border: `1.5px solid ${st.c}22` }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 14 }}>
                <div style={{ width: 44, height: 44, borderRadius: 12, background: `${st.c}12`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22 }}>{c.icon}</div>
                <Chip label={st.label} c={st.c} bg={st.bg} />
              </div>
              <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 4 }}>{c.nome}</div>
              <div style={{ fontSize: 12, color: T.muted, marginBottom: 12 }}>{c.desc}</div>
              {c.status === "conectado" && <div style={{ fontSize: 11, color: T.sub, background: "rgba(0,0,0,0.03)", borderRadius: 8, padding: "6px 10px", marginBottom: 12 }}>Último sync: {c.ultimo}</div>}
              {c.status === "erro" && <div style={{ fontSize: 11, color: "#ff3b30", background: "#ffe5e3", borderRadius: 8, padding: "6px 10px", marginBottom: 12 }}>⚠️ Falha na conexão</div>}
              <button className={`ap-btn ap-btn-sm ${c.status === "conectado" ? "ap-btn-secondary" : "ap-btn-primary"}`} style={{ width: "100%" }} onClick={() => setDetailConn(c)}>{c.status === "conectado" ? "Gerenciar" : c.status === "erro" ? "Reconectar" : "Configurar →"}</button>
            </div>
          ); })}
        </div>
      )}

      {tab === "apikeys" && (
        <div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
            <div><div style={{ fontSize: 15, fontWeight: 700 }}>Chaves de API</div><div style={{ fontSize: 12, color: T.muted, marginTop: 2 }}>Use para integrar sistemas externos ao CRM Miner</div></div>
            <button className="ap-btn ap-btn-primary" onClick={() => setShowNewKey(true)}>+ Gerar Nova Key</button>
          </div>
          <div className="ap-card" style={{ padding: "16px 20px", marginBottom: 16, display: "flex", alignItems: "center", gap: 14 }}>
            <div style={{ width: 36, height: 36, borderRadius: 9, background: "#eeeeff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16 }}>🌐</div>
            <div style={{ flex: 1 }}><div style={{ fontSize: 12, fontWeight: 700, color: T.muted, marginBottom: 3 }}>BASE URL DA API</div><div className="num" style={{ fontSize: 13, color: T.text }}>https://api.miner.com.br/v1</div></div>
            <button className="ap-btn ap-btn-secondary ap-btn-sm" onClick={() => copyKey("https://api.miner.com.br/v1")}>{copied === "https://api.miner.com.br/v1" ? "✓ Copiado" : "Copiar"}</button>
          </div>
          <div className="ap-card" style={{ padding: 0, overflow: "hidden" }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead><tr style={{ borderBottom: "1px solid rgba(0,0,0,0.07)", background: "rgba(0,0,0,0.02)" }}>{["Nome", "Chave", "Criado", "Último uso", "Status", "Ações"].map((h) => <th key={h} className="ap-th">{h}</th>)}</tr></thead>
              <tbody>{apiKeys.map((k, i) => (
                <tr key={i} className="ap-tr">
                  <td className="ap-td"><span style={{ fontSize: 14, fontWeight: 700 }}>{k.nome}</span></td>
                  <td className="ap-td"><div style={{ display: "flex", alignItems: "center", gap: 8 }}><code style={{ fontSize: 12, background: "rgba(0,0,0,0.05)", padding: "3px 8px", borderRadius: 6, fontFamily: "var(--mono)" }}>{k.key}</code><button className="ap-btn ap-btn-secondary ap-btn-sm" onClick={() => copyKey(k.key)}>{copied === k.key ? "✓" : "📋"}</button></div></td>
                  <td className="ap-td"><span style={{ fontSize: 12, color: T.muted }}>{k.criado}</span></td>
                  <td className="ap-td"><span style={{ fontSize: 12, color: T.muted }}>{k.ultimo}</span></td>
                  <td className="ap-td"><Chip label={k.ativo ? "Ativa" : "Revogada"} c={k.ativo ? "#28cd41" : "#aeaeb2"} bg={k.ativo ? "#e9fbed" : "#f5f5f7"} /></td>
                  <td className="ap-td">{k.ativo && <button className="ap-btn ap-btn-danger ap-btn-sm" onClick={() => setApiKeys((a) => a.map((x) => x.id === k.id ? { ...x, ativo: false } : x))}>Revogar</button>}</td>
                </tr>
              ))}</tbody>
            </table>
          </div>
          <div className="ap-card" style={{ padding: 22, marginTop: 16 }}>
            <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 12 }}>Exemplo de autenticação</div>
            <pre style={{ fontFamily: "var(--mono)", fontSize: 12, background: "#1d1d1f", color: "#a8ff78", borderRadius: 12, padding: "16px 20px", overflow: "auto", lineHeight: 1.7 }}>{`curl -X GET https://api.miner.com.br/v1/clientes \\
  -H "Authorization: Bearer mk_live_••••••••" \\
  -H "Content-Type: application/json"`}</pre>
          </div>
        </div>
      )}

      {tab === "webhooks" && (
        <div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
            <div><div style={{ fontSize: 15, fontWeight: 700 }}>Webhooks</div><div style={{ fontSize: 12, color: T.muted, marginTop: 2 }}>Receba eventos em tempo real no seu sistema</div></div>
            <button className="ap-btn ap-btn-primary" onClick={() => setShowNewWh(true)}>+ Novo Webhook</button>
          </div>
          {webhooks.map((w, i) => (
            <div key={i} className="ap-card" style={{ padding: 20, marginBottom: 12, border: `1.5px solid ${w.status === "erro" ? "#ff3b3030" : "rgba(0,0,0,0.07)"}` }}>
              <div style={{ display: "flex", alignItems: "flex-start", gap: 14 }}>
                <div style={{ width: 42, height: 42, borderRadius: 11, background: w.status === "ativo" ? "#eeeeff" : "#ffe5e3", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18, flexShrink: 0 }}>⚡</div>
                <div style={{ flex: 1 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}><code style={{ fontSize: 13, fontFamily: "var(--mono)", fontWeight: 600 }}>{w.url}</code><Chip label={w.status === "ativo" ? "Ativo" : "Erro"} c={w.status === "ativo" ? "#28cd41" : "#ff3b30"} bg={w.status === "ativo" ? "#e9fbed" : "#ffe5e3"} /></div>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 10 }}>{w.eventos.map((ev) => <span key={ev} style={{ fontSize: 10, fontWeight: 700, background: "rgba(69,69,245,.08)", color: "#4545F5", padding: "3px 8px", borderRadius: 20, fontFamily: "var(--mono)" }}>{ev}</span>)}</div>
                  <div style={{ display: "flex", gap: 20, fontSize: 12, color: T.muted }}>
                    <span>⏱ Último disparo: <b style={{ color: T.text }}>{w.ultdisparo}</b></span>
                    <span>✅ Sucessos: <b style={{ color: "#28cd41" }}>{w.sucessos}</b></span>
                    {w.erros > 0 && <span>❌ Erros: <b style={{ color: "#ff3b30" }}>{w.erros}</b></span>}
                  </div>
                </div>
                <div style={{ display: "flex", gap: 8, flexShrink: 0 }}>
                  <button className="ap-btn ap-btn-secondary ap-btn-sm">Testar</button>
                  <button className="ap-btn ap-btn-danger ap-btn-sm" onClick={() => setWebhooks((a) => a.filter((x) => x.id !== w.id))}>Remover</button>
                </div>
              </div>
            </div>
          ))}
          <div className="ap-card" style={{ padding: 22, marginTop: 8 }}>
            <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 12 }}>Exemplo de payload</div>
            <pre style={{ fontFamily: "var(--mono)", fontSize: 12, background: "#1d1d1f", color: "#79c0ff", borderRadius: 12, padding: "16px 20px", overflow: "auto", lineHeight: 1.7 }}>{`{
  "evento": "venda.criada",
  "timestamp": "2026-03-02T14:32:00Z",
  "loja_id": "m1",
  "data": {
    "venda_id": "vnd_9aKx3Rp",
    "cliente_id": "cli_7mBq1Wz",
    "valor": 349.90,
    "canal": "loja_fisica"
  }
}`}</pre>
          </div>
        </div>
      )}

      {/* ── TAB: DOCS ── */}
      {tab === "docs" && (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 2fr", gap: 16 }}>
          <div className="ap-card" style={{ padding: 20 }}>
            <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 14 }}>Endpoints</div>
            {[
              { method: "GET", path: "/v1/clientes", desc: "Listar clientes" },
              { method: "POST", path: "/v1/clientes", desc: "Criar cliente" },
              { method: "GET", path: "/v1/clientes/:id", desc: "Buscar cliente" },
              { method: "PUT", path: "/v1/clientes/:id", desc: "Atualizar cliente" },
              { method: "DELETE", path: "/v1/clientes/:id", desc: "Remover cliente" },
              { method: "GET", path: "/v1/vendas", desc: "Listar vendas" },
              { method: "POST", path: "/v1/vendas", desc: "Registrar venda" },
              { method: "GET", path: "/v1/campanhas", desc: "Listar campanhas" },
              { method: "POST", path: "/v1/campanhas/send", desc: "Disparar campanha" },
              { method: "GET", path: "/v1/relatorios/rfm", desc: "Segmentação RFM" },
            ].map((ep, i) => {
              const mc = { GET: "#28cd41", POST: "#4545F5", PUT: "#ff9500", DELETE: "#ff3b30" };
              return (
                <div key={i} style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 0", borderBottom: i < 9 ? "1px solid rgba(0,0,0,0.05)" : "none" }}>
                  <span style={{ fontFamily: "var(--mono)", fontSize: 10, fontWeight: 800, color: mc[ep.method], background: `${mc[ep.method]}14`, padding: "2px 7px", borderRadius: 6, minWidth: 52, textAlign: "center" }}>{ep.method}</span>
                  <div><code style={{ fontSize: 11, fontFamily: "var(--mono)", color: T.text }}>{ep.path}</code><div style={{ fontSize: 10, color: T.muted }}>{ep.desc}</div></div>
                </div>
              );
            })}
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <div className="ap-card" style={{ padding: 22 }}>
              <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 12 }}>GET /v1/clientes</div>
              <pre style={{ fontFamily: "var(--mono)", fontSize: 11, background: "#1d1d1f", color: "#79c0ff", borderRadius: 12, padding: "16px", overflow: "auto", lineHeight: 1.7 }}>{`{
  "data": [
    {
      "id": "cli_7mBq1Wz",
      "nome": "Marina Oliveira",
      "email": "marina@gmail.com",
      "segmento_rfm": "campiao",
      "receita_total": 12840.00,
      "ultimo_pedido": "2026-02-22",
      "recencia_dias": 8
    }
  ],
  "meta": { "total": 1247, "pagina": 1, "por_pagina": 50 }
}`}</pre>
            </div>
            <div className="ap-card" style={{ padding: 22 }}>
              <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 12 }}>Rate Limits</div>
              {[
                { plano: "Starter", req: "1.000 req/hora", c: "#28cd41" },
                { plano: "Pro", req: "10.000 req/hora", c: "#4545F5" },
                { plano: "Enterprise", req: "Ilimitado", c: "#8e44ef" },
              ].map((r, i) => (
                <div key={i} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 0", borderBottom: i < 2 ? "1px solid rgba(0,0,0,0.05)" : "none" }}>
                  <Chip label={r.plano} c={r.c} bg={`${r.c}12`} />
                  <span className="num" style={{ fontSize: 13, fontWeight: 700, color: r.c }}>{r.req}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {showNewKey && <NovaKeyModal onClose={() => setShowNewKey(false)} onSave={(k) => { setApiKeys((a) => [...a, k]); }} />}
      {showNewWh && <NovoWebhookModal onClose={() => setShowNewWh(false)} onSave={(w) => { setWebhooks((a) => [...a, w]); }} />}
      {detailConn && <ConexaoModal conn={detailConn} onClose={() => setDetailConn(null)} />}
    </div>
  );
}

// ── DADOS & EXPORT / IMPORT ──────────────────────────────────────────────────
function MarcaDados({ user }) {
  const marcaId = user.marca_id || user.marcaId;
  const { data: dbClientes } = useSupabaseQuery("clientes", { eq: { marca_id: marcaId } });
  const { data: dbVendedores } = useSupabaseQuery("users", { eq: { marca_id: marcaId } });
  const { data: dbCampanhas } = useSupabaseQuery("campanhas", { eq: { marca_id: marcaId } });

  const clientes = dbClientes.length > 0 ? dbClientes : DB_FALLBACK.clientes;
  const vendedores = (dbVendedores.length > 0 ? dbVendedores : DB_FALLBACK.usuarios).filter((u) => u.role === "vendedor");
  const campanhas = dbCampanhas.length > 0 ? dbCampanhas : DB_FALLBACK.campanhas;

  const [tab, setTab] = useState("exportar");
  const [importing, setImporting] = useState(false);
  const [importFile, setImportFile] = useState(null);
  const [importRows, setImportRows] = useState(null);
  const [importErr, setImportErr] = useState("");
  const [exported, setExported] = useState(null);
  const [exporting, setExporting] = useState(false);
  const [importSaved, setImportSaved] = useState(false);

  const toCSV = (rows, headers) => {
    const esc = (v) => { const s = String(v ?? ""); return s.includes(",") || s.includes('"') || s.includes("\n") ? `"${s.replace(/"/g, '""')}"` : s; };
    return [headers.join(","), ...rows.map((r) => headers.map((h) => esc(r[h])).join(","))].join("\n");
  };
  const downloadText = (text, filename) => {
    const blob = new Blob(["\uFEFF" + text], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = filename; a.click();
    URL.revokeObjectURL(url);
  };
  const loadSheetJS = () => new Promise((res, rej) => {
    if (window.XLSX) return res(window.XLSX);
    const s = document.createElement("script");
    s.src = "https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js";
    s.onload = () => res(window.XLSX);
    s.onerror = () => rej(new Error("Falha ao carregar SheetJS"));
    document.head.appendChild(s);
  });
  const downloadXLSX = async (data, sheetName, filename) => {
    const XLSX = await loadSheetJS();
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, sheetName);
    XLSX.writeFile(wb, filename);
  };

  const clienteRows = clientes.map((c) => ({
    nome: c.nome, email: c.email, telefone: c.telefone || c.tel || "",
    segmento: RFM_CFG[c.segmento_rfm || c.seg]?.label || c.segmento_rfm || c.seg || "",
    recencia: c.recencia_dias ?? c.rec ?? 0, pedidos: c.total_pedidos ?? c.pedidos ?? 0,
    receita: c.receita_total ?? c.receita ?? 0, vendedor: c.vendedor_nome || c.vend || "",
  }));
  const vendedorRows = vendedores.map((u) => ({
    nome: u.nome, email: u.email, loja: u.loja || "", meta: u.meta_mensal ?? u.meta ?? 0,
    faturamento: u.fat ?? 0, percentual: (u.meta_mensal || u.meta) > 0 ? Math.round((u.fat ?? 0) / (u.meta_mensal || u.meta || 1) * 100) + "%" : "—",
  }));
  const campanhaRows = campanhas.map((c) => ({
    nome: c.nome, canal: c.tipo || c.canal || "", status: c.status || "", enviados: c.enviados ?? 0, receita: c.receita ?? 0,
  }));

  const EXPORTS = [
    { id: "clientes", icon: "👥", label: "Base de Clientes", desc: "Todos os clientes com RFM, recência, receita e vendedor", rows: clienteRows, headers: ["nome", "email", "telefone", "segmento", "recencia", "pedidos", "receita", "vendedor"], count: clienteRows.length },
    { id: "vendedores", icon: "🏆", label: "Performance de Vendedores", desc: "Ranking, faturamento, metas e conversão", rows: vendedorRows, headers: ["nome", "email", "loja", "meta", "faturamento", "percentual"], count: vendedorRows.length },
    { id: "campanhas", icon: "📢", label: "Resultados de Campanhas", desc: "Canal, status, envios e receita gerada", rows: campanhaRows, headers: ["nome", "canal", "status", "enviados", "receita"], count: campanhaRows.length },
  ];

  const doExport = async (exp, format) => {
    setExporting(true);
    await new Promise((r) => setTimeout(r, 400));
    try {
      if (format === "csv") { downloadText(toCSV(exp.rows, exp.headers), `miner_${exp.id}_${new Date().toISOString().slice(0, 10)}.csv`); }
      else { await downloadXLSX(exp.rows, exp.label, `miner_${exp.id}_${new Date().toISOString().slice(0, 10)}.xlsx`); }
      setExported(exp.id + format);
      setTimeout(() => setExported(null), 3000);
    } catch (e) { console.error(e); }
    setExporting(false);
  };

  const parseCSV = (text) => {
    const lines = text.trim().split("\n");
    if (lines.length < 2) return [];
    const headers = lines[0].split(",").map((h) => h.trim().replace(/^"|"$/g, ""));
    return lines.slice(1).map((line) => {
      const vals = []; let cur = "", inQ = false;
      for (let ch of line) { if (ch === '"') inQ = !inQ; else if (ch === "," && !inQ) { vals.push(cur); cur = ""; } else cur += ch; }
      vals.push(cur);
      return Object.fromEntries(headers.map((h, i) => [h, (vals[i] || "").trim()]));
    });
  };
  const handleFile = async (file) => {
    if (!file) return;
    setImportFile(file); setImportErr(""); setImportRows(null);
    const ext = file.name.split(".").pop().toLowerCase();
    if (ext === "csv") { try { setImportRows(parseCSV(await file.text())); } catch { setImportErr("Erro ao ler CSV."); } }
    else if (ext === "xlsx" || ext === "xls") { try { const XLSX = await loadSheetJS(); const wb = XLSX.read(await file.arrayBuffer(), { type: "array" }); setImportRows(XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]])); } catch { setImportErr("Erro ao ler XLSX."); } }
    else { setImportErr("Formato não suportado. Use .csv, .xlsx ou .xls"); }
  };
  const [importProgress, setImportProgress] = useState(0);
  const doImport = async () => {
    if (!importRows || importRows.length === 0) return;
    setImporting(true);
    setImportProgress(0);
    let success = 0;
    let errors = 0;
    for (let i = 0; i < importRows.length; i++) {
      try {
        const row = importRows[i];
        // Map common CSV fields to DB fields
        const record = {
          nome: row.nome || row.name || "",
          email: row.email || "",
          telefone: row.telefone || row.phone || row.tel || "",
          marca_id: marcaId || null,
        };
        if (row.segmento || row.segmento_rfm) record.segmento_rfm = row.segmento_rfm || row.segmento;
        if (row.cpf) record.tags = [row.cpf];
        await createRecord("clientes", record);
        success++;
      } catch (e) {
        errors++;
        console.error("Import row error:", e);
      }
      setImportProgress(Math.round(((i + 1) / importRows.length) * 100));
    }
    setImporting(false);
    setImportSaved(true);
    setImportProgress(0);
    setTimeout(() => { setImportSaved(false); setImportFile(null); setImportRows(null); }, 4000);
  };

  return (
    <div className="fade-up">
      <SectionHeader tag="Gestão de Dados" title="Dados & Export" />
      <div className="seg" style={{ marginBottom: 24 }}>
        {[{ k: "exportar", l: "Exportar Dados" }, { k: "importar", l: "Importar Dados" }, { k: "historico", l: "Histórico" }].map((t) => (
          <button key={t.k} className={`seg-btn ${tab === t.k ? "on" : ""}`} onClick={() => setTab(t.k)}>{t.l}</button>
        ))}
      </div>

      {tab === "exportar" && (
        <div>
          <div style={{ background: "#eeeeff", border: "1px solid #4545F522", borderRadius: 14, padding: "14px 18px", marginBottom: 20, fontSize: 13, color: T.sub }}>
            💡 Todos os exports incluem <b>BOM UTF-8</b> para compatibilidade com Excel e Google Sheets.
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
            {EXPORTS.map((exp, i) => (
              <div key={i} className="ap-card" style={{ padding: 22 }}>
                <div style={{ display: "flex", gap: 14, marginBottom: 16 }}>
                  <div style={{ width: 44, height: 44, borderRadius: 12, background: "#eeeeff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22, flexShrink: 0 }}>{exp.icon}</div>
                  <div>
                    <div style={{ fontSize: 15, fontWeight: 700 }}>{exp.label}</div>
                    <div style={{ fontSize: 12, color: T.muted, marginTop: 3 }}>{exp.desc}</div>
                    <div style={{ fontSize: 11, color: "#4545F5", fontWeight: 600, marginTop: 5 }}>{exp.count} registros</div>
                  </div>
                </div>
                <div style={{ display: "flex", gap: 8 }}>
                  <button className="ap-btn ap-btn-secondary ap-btn-sm" style={{ flex: 1 }} disabled={exporting} onClick={() => doExport(exp, "csv")}>{exported === exp.id + "csv" ? "✓ Baixado!" : "📄 CSV"}</button>
                  <button className="ap-btn ap-btn-primary ap-btn-sm" style={{ flex: 1 }} disabled={exporting} onClick={() => doExport(exp, "xlsx")}>{exported === exp.id + "xlsx" ? "✓ Baixado!" : "📊 XLSX"}</button>
                </div>
              </div>
            ))}
          </div>
          <div className="ap-card" style={{ marginTop: 14, padding: 22, display: "flex", alignItems: "center", gap: 16 }}>
            <div style={{ fontSize: 28 }}>📦</div>
            <div style={{ flex: 1 }}><div style={{ fontSize: 15, fontWeight: 700 }}>Export Completo</div><div style={{ fontSize: 12, color: T.muted }}>Todos os dados em um único arquivo XLSX</div></div>
            <button className="ap-btn ap-btn-primary" disabled={exporting} onClick={async () => {
              setExporting(true);
              try { const XLSX = await loadSheetJS(); const wb = XLSX.utils.book_new(); EXPORTS.forEach((exp) => { XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(exp.rows), exp.label.slice(0, 31)); }); XLSX.writeFile(wb, `miner_export_completo_${new Date().toISOString().slice(0, 10)}.xlsx`); } catch (e) { console.error(e); }
              setExporting(false);
            }}>{exporting ? "Gerando…" : "📦 Baixar Tudo (.xlsx)"}</button>
          </div>
        </div>
      )}

      {tab === "importar" && (
        <div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20, marginBottom: 20 }}>
            <div className="ap-card" style={{ padding: 0, overflow: "hidden" }}>
              <div style={{ padding: "20px 22px", borderBottom: "1px solid rgba(0,0,0,0.07)" }}><div style={{ fontSize: 15, fontWeight: 700 }}>Selecionar Arquivo</div><div style={{ fontSize: 12, color: T.muted, marginTop: 3 }}>CSV, XLS ou XLSX</div></div>
              <div style={{ padding: 22 }}>
                <label htmlFor="import-file" style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 10, padding: "32px 20px", borderRadius: 14, cursor: "pointer", border: "2px dashed rgba(69,69,245,.3)", background: "#f9f9ff" }} onDragOver={(e) => e.preventDefault()} onDrop={(e) => { e.preventDefault(); handleFile(e.dataTransfer.files[0]); }}>
                  <div style={{ fontSize: 36 }}>{importFile ? "📄" : "📂"}</div>
                  {importFile ? (<><div style={{ fontSize: 14, fontWeight: 700, color: "#4545F5" }}>{importFile.name}</div><div style={{ fontSize: 12, color: T.muted }}>{(importFile.size / 1024).toFixed(1)} KB</div></>) : (<><div style={{ fontSize: 14, fontWeight: 600, color: T.sub }}>Arraste ou clique para selecionar</div><div style={{ fontSize: 11, color: T.muted }}>.csv · .xlsx · .xls</div></>)}
                </label>
                <input id="import-file" type="file" accept=".csv,.xlsx,.xls" style={{ display: "none" }} onChange={(e) => handleFile(e.target.files[0])} />
                {importErr && <div style={{ marginTop: 12, background: "#ffe5e3", border: "1px solid #ff3b3030", borderRadius: 10, padding: "10px 14px", fontSize: 12, color: "#ff3b30" }}>⚠️ {importErr}</div>}
                {importSaved && <div style={{ marginTop: 12, background: "#e9fbed", border: "1px solid #28cd4130", borderRadius: 10, padding: "10px 14px", fontSize: 12, color: "#28cd41", fontWeight: 600 }}>✓ {importRows?.length} registros importados com sucesso!</div>}
              </div>
            </div>
            <div className="ap-card" style={{ padding: 22 }}>
              <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 14 }}>Templates de Importação</div>
              {[{ icon: "👥", label: "Clientes", cols: ["nome", "email", "telefone", "cpf", "cidade", "uf"] }, { icon: "💰", label: "Vendas", cols: ["data", "cliente_email", "valor", "canal", "vendedor"] }, { icon: "🏷", label: "Produtos", cols: ["sku", "nome", "preco", "categoria", "estoque"] }].map((tmpl, i) => (
                <div key={i} style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 0", borderBottom: i < 2 ? "1px solid rgba(0,0,0,0.05)" : "none" }}>
                  <span style={{ fontSize: 18 }}>{tmpl.icon}</span>
                  <div style={{ flex: 1 }}><div style={{ fontSize: 13, fontWeight: 600 }}>{tmpl.label}</div><div style={{ fontSize: 10, color: T.muted, fontFamily: "var(--mono)" }}>{tmpl.cols.join(" · ")}</div></div>
                  <button className="ap-btn ap-btn-secondary ap-btn-sm" onClick={() => downloadText(toCSV([], tmpl.cols), `miner_template_${tmpl.label.toLowerCase()}.csv`)}>📄 Template</button>
                </div>
              ))}
            </div>
          </div>
          {importRows && importRows.length > 0 && (
            <div className="ap-card" style={{ padding: 0, overflow: "hidden", marginBottom: 16 }}>
              <div style={{ padding: "16px 22px", borderBottom: "1px solid rgba(0,0,0,0.07)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div><span style={{ fontSize: 15, fontWeight: 700 }}>Prévia da Importação</span><span style={{ fontSize: 12, color: T.muted, marginLeft: 10 }}>{importRows.length} registros</span></div>
                <button className="ap-btn ap-btn-primary" disabled={importing} onClick={doImport}>{importing ? `Importando… ${importProgress}%` : `✓ Importar ${importRows.length} registros`}</button>
              </div>
              <div style={{ overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse" }}>
                  <thead><tr style={{ background: "rgba(0,0,0,0.02)", borderBottom: "1px solid rgba(0,0,0,0.07)" }}>{Object.keys(importRows[0]).map((h) => <th key={h} className="ap-th">{h}</th>)}</tr></thead>
                  <tbody>{importRows.slice(0, 5).map((row, i) => <tr key={i} className="ap-tr">{Object.values(row).map((v, j) => <td key={j} className="ap-td"><span style={{ fontSize: 13 }}>{String(v)}</span></td>)}</tr>)}</tbody>
                </table>
              </div>
              {importRows.length > 5 && <div style={{ padding: "12px 22px", background: "rgba(0,0,0,0.02)", fontSize: 12, color: T.muted, textAlign: "center" }}>+ {importRows.length - 5} registros adicionais</div>}
            </div>
          )}
        </div>
      )}

      {tab === "historico" && (
        <div className="ap-card" style={{ padding: 0, overflow: "hidden" }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead><tr style={{ borderBottom: "1px solid rgba(0,0,0,0.07)", background: "rgba(0,0,0,0.02)" }}>{["Operação", "Arquivo", "Registros", "Usuário", "Data", "Status"].map((h) => <th key={h} className="ap-th">{h}</th>)}</tr></thead>
            <tbody>
              {[{ op: "Export", arq: "miner_clientes_2026-02-15.csv", reg: 1247, user: "Joao Souza", dt: "15 Fev 2026", st: "ok" }, { op: "Import", arq: "clientes_novo_lote.xlsx", reg: 48, user: "Joao Souza", dt: "12 Fev 2026", st: "ok" }, { op: "Export", arq: "miner_vendedores_2026-02-01.xlsx", reg: 4, user: "Fernanda G.", dt: "01 Fev 2026", st: "ok" }].map((r, i) => (
                <tr key={i} className="ap-tr">
                  <td className="ap-td"><Chip label={r.op} c={r.op === "Export" ? "#4545F5" : "#28cd41"} bg={r.op === "Export" ? "#eeeeff" : "#e9fbed"} /></td>
                  <td className="ap-td"><code style={{ fontSize: 12, fontFamily: "var(--mono)" }}>{r.arq}</code></td>
                  <td className="ap-td"><span className="num" style={{ fontSize: 13, fontWeight: 700 }}>{r.reg}</span></td>
                  <td className="ap-td"><span style={{ fontSize: 13, color: T.sub }}>{r.user}</span></td>
                  <td className="ap-td"><span style={{ fontSize: 12, color: T.muted }}>{r.dt}</span></td>
                  <td className="ap-td"><Chip label={r.st === "ok" ? "Sucesso" : "Falhou"} c={r.st === "ok" ? "#28cd41" : "#ff3b30"} bg={r.st === "ok" ? "#e9fbed" : "#ffe5e3"} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// ── ROOT ──────────────────────────────────────────────────────────────────────
export default function App() {
  const [user, setUser] = useState(null);

  const handleLogin = async (loginData) => {
    setUser(loginData);
  };

  const handleLogout = () => {
    apiLogout();
    setUser(null);
  };

  if (!user) return <Login onLogin={handleLogin} />;
  if (user.tipo === "owner") return <PortalOwner user={user} onLogout={handleLogout} />;
  if (user.tipo === "marca") return <PortalMarca user={user} onLogout={handleLogout} />;
  return <Login onLogin={handleLogin} />;
}
