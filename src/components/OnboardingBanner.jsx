import React from "react";

const ONBOARD_STEPS = [
  { key: "dados_marca", icon: "🏢", label: "Dados da Marca", page: "config", desc: "Preencha email e segmento" },
  { key: "equipe", icon: "👥", label: "Adicione sua Equipe", page: "usuarios", desc: "Convide vendedores e supervisores" },
  { key: "clientes", icon: "🙍", label: "Importe Clientes", page: "exportar", desc: "CSV ou sincronize com Shopify" },
  { key: "integracoes", icon: "🔌", label: "Conecte Integrações", page: "integracoes", desc: "WhatsApp, Shopify, etc" },
];

function OnboardingBanner({ steps, setPage, onDismiss }) {
  const done = Object.values(steps).filter(Boolean).length;
  const total = ONBOARD_STEPS.length;
  const pct = Math.round((done / total) * 100);
  return (
    <div style={{
      background: "linear-gradient(135deg, #007aff 0%, #8e44ef 100%)",
      borderRadius: 20, padding: "32px 36px", marginBottom: 28, color: "#fff",
      boxShadow: "0 8px 32px rgba(0,122,255,0.18)", position: "relative", overflow: "hidden"
    }}>
      {/* Decorative circles */}
      <div style={{ position: "absolute", top: -40, right: -40, width: 160, height: 160, borderRadius: "50%", background: "rgba(255,255,255,0.06)" }} />
      <div style={{ position: "absolute", bottom: -30, left: -30, width: 120, height: 120, borderRadius: "50%", background: "rgba(255,255,255,0.04)" }} />

      <div style={{ position: "relative", zIndex: 1 }}>
        <h2 style={{ margin: 0, fontSize: 26, fontWeight: 800, letterSpacing: -0.5 }}>Bem-vindo ao CRM Miner! 🚀</h2>
        <p style={{ margin: "6px 0 24px", opacity: 0.85, fontSize: 15, fontWeight: 400 }}>Complete a configuração para começar</p>

        {/* Progress bar */}
        <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 24 }}>
          <div style={{ flex: 1, height: 8, background: "rgba(255,255,255,0.2)", borderRadius: 8, overflow: "hidden" }}>
            <div style={{ width: `${pct}%`, height: "100%", background: "#fff", borderRadius: 8, transition: "width 0.5s ease" }} />
          </div>
          <span style={{ fontSize: 13, fontWeight: 700, whiteSpace: "nowrap" }}>{done} de {total}</span>
        </div>

        {/* Step cards */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 14 }}>
          {ONBOARD_STEPS.map(s => {
            const completed = steps[s.key];
            return (
              <div key={s.key} onClick={() => !completed && setPage(s.page)}
                style={{
                  background: completed ? "rgba(255,255,255,0.18)" : "rgba(255,255,255,0.1)",
                  borderRadius: 14, padding: "18px 16px", cursor: completed ? "default" : "pointer",
                  border: "1px solid rgba(255,255,255,0.15)",
                  transition: "all 0.2s ease", backdropFilter: "blur(8px)",
                }}
                onMouseEnter={e => { if (!completed) { e.currentTarget.style.background = "rgba(255,255,255,0.22)"; e.currentTarget.style.transform = "translateY(-2px)"; }}}
                onMouseLeave={e => { if (!completed) { e.currentTarget.style.background = "rgba(255,255,255,0.1)"; e.currentTarget.style.transform = "none"; }}}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
                  <span style={{ fontSize: 22 }}>{s.icon}</span>
                  <span style={{ fontSize: 18 }}>{completed ? "✅" : "⭕"}</span>
                </div>
                <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 4 }}>{s.label}</div>
                <div style={{ fontSize: 12, opacity: 0.75, lineHeight: 1.4 }}>{completed ? "Concluído" : s.desc}</div>
              </div>
            );
          })}
        </div>

        {/* Skip link */}
        <div style={{ textAlign: "right", marginTop: 18 }}>
          <span onClick={onDismiss}
            style={{ fontSize: 13, opacity: 0.7, cursor: "pointer", textDecoration: "underline", fontWeight: 500 }}
            onMouseEnter={e => e.currentTarget.style.opacity = 1}
            onMouseLeave={e => e.currentTarget.style.opacity = 0.7}
          >Pular Setup →</span>
        </div>
      </div>
    </div>
  );
}

export { ONBOARD_STEPS };
export default OnboardingBanner;
