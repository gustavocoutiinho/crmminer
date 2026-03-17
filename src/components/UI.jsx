// ── Componentes Atômicos Reutilizáveis ──────────────────────────────────────
import { T } from "../lib/theme";

// ── Avatar ──────────────────────────────────────────────────────────────────
export const Avatar = ({ nome = "?", size = 36 }) => {
  const safe = (nome || "?").trim() || "?";
  const ini = safe.split(" ").filter(Boolean).slice(0, 2).map(n => n[0]).join("").toUpperCase();
  const COLS = ["#4545F5", "#28cd41", "#8e44ef", "#ff9500", "#ff3b30", "#34aadc"];
  const c = COLS[(safe.charCodeAt(0) || 0) % COLS.length];
  return (
    <div style={{
      width: size, height: size, borderRadius: size * 0.30,
      background: `${c}15`, border: `1.5px solid ${c}28`,
      display: "flex", alignItems: "center", justifyContent: "center",
      fontSize: size * 0.36, fontWeight: 700, color: c, flexShrink: 0,
    }}>
      {ini}
    </div>
  );
};

// ── Chip ────────────────────────────────────────────────────────────────────
export const Chip = ({ label, c, bg }) => (
  <span className="chip" style={{ background: bg || "#f5f5f7", color: c || "#6e6e73" }}>{label}</span>
);

// ── Toggle ──────────────────────────────────────────────────────────────────
export const Toggle = ({ checked, onChange }) => (
  <label className="ap-toggle">
    <input type="checkbox" checked={checked} onChange={onChange} />
    <span className="ap-toggle-track" />
  </label>
);

// ── ProgressBar ─────────────────────────────────────────────────────────────
export const ProgressBar = ({ value, max = 100, height = 6 }) => {
  const pct = Math.min(Math.round((value / max) * 100), 100);
  const c = pct >= 100 ? "#28cd41" : pct >= 70 ? "#4545F5" : pct >= 40 ? "#ff9500" : "#ff3b30";
  return (
    <div className="ap-progress" style={{ height }}>
      <div className="ap-progress-fill" style={{ width: `${pct}%`, background: c }} />
    </div>
  );
};

// ── Lbl ─────────────────────────────────────────────────────────────────────
export const Lbl = ({ children, sub }) => (
  <div style={{ marginBottom: 8 }}>
    <label className="lbl">{children}</label>
    {sub && <span className="sublbl">{sub}</span>}
  </div>
);

// ── Divider ─────────────────────────────────────────────────────────────────
export const Divider = () => <hr className="divider" />;

// ── FormRow ─────────────────────────────────────────────────────────────────
export const FormRow = ({ children, cols }) => {
  const arr = children ? (Array.isArray(children) ? children : [children]).filter(Boolean) : [];
  return (
    <div style={{ display: "grid", gridTemplateColumns: `repeat(${cols || arr.length || 1},1fr)`, gap: 12 }}>
      {arr}
    </div>
  );
};

// ── ApTooltip (para Recharts) ───────────────────────────────────────────────
export const ApTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div style={{
      background: "rgba(255,255,255,0.97)", backdropFilter: "blur(20px)",
      border: "1px solid rgba(0,0,0,0.08)", borderRadius: 12, padding: "10px 16px",
      boxShadow: "0 4px 20px rgba(0,0,0,0.10)",
    }}>
      <p style={{ color: "#aeaeb2", fontSize: 11, fontWeight: 600, marginBottom: 4 }}>{label}</p>
      {payload.map((p, i) => (
        <p key={i} className="num" style={{ color: p.color || "#4545F5", fontWeight: 700, fontSize: 14 }}>
          {p.value > 999 ? `R$ ${p.value.toLocaleString("pt-BR")}` : p.value}
        </p>
      ))}
    </div>
  );
};

// ── Modal ───────────────────────────────────────────────────────────────────
export const Modal = ({ title, subtitle, onClose, children, width = 520 }) => (
  <div className="modal-overlay" onClick={onClose}>
    <div className="modal-box" style={{ maxWidth: width }} onClick={e => e.stopPropagation()}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 24 }}>
        <div>
          <h2 style={{ fontSize: 20, fontWeight: 700, color: T.text }}>{title}</h2>
          {subtitle && <p style={{ fontSize: 13, color: T.sub, marginTop: 4 }}>{subtitle}</p>}
        </div>
        <button onClick={onClose} aria-label="Fechar modal"
          style={{
            background: "rgba(0,0,0,0.06)", border: "none", width: 30, height: 30,
            borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center",
            cursor: "pointer", color: T.sub, fontSize: 18, flexShrink: 0, lineHeight: 1,
          }}>×</button>
      </div>
      {children}
    </div>
  </div>
);

// ── SectionHeader ───────────────────────────────────────────────────────────
export const SectionHeader = ({ tag, title, action }) => (
  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: 28 }}>
    <div>
      {tag && <div style={{ fontSize: 10, fontWeight: 700, color: T.muted, textTransform: "uppercase", letterSpacing: 1, marginBottom: 5 }}>{tag}</div>}
      <h1 style={{ fontSize: 26, fontWeight: 700, color: T.text }}>{title}</h1>
    </div>
    {action}
  </div>
);

// ── KpiCard ─────────────────────────────────────────────────────────────────
export const KpiCard = ({ label, value, sub, color = "#4545F5", icon, trend }) => (
  <div className="ap-card" style={{ padding: "20px 22px" }}>
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 14 }}>
      <span style={{ fontSize: 11, fontWeight: 700, color: T.muted, textTransform: "uppercase", letterSpacing: 0.6 }}>{label}</span>
      {icon && <div style={{
        width: 32, height: 32, borderRadius: 9, background: `${color}14`,
        display: "flex", alignItems: "center", justifyContent: "center", fontSize: 15,
      }}>{icon}</div>}
    </div>
    <div className="num" style={{ fontSize: 28, fontWeight: 700, color, marginBottom: 4 }}>{value}</div>
    {sub && <div style={{ fontSize: 12, color: T.muted }}>{sub}</div>}
    {trend !== undefined && (
      <div style={{ fontSize: 11, color: trend > 0 ? "#28cd41" : "#ff3b30", fontWeight: 600, marginTop: 5 }}>
        {trend > 0 ? "+" : ""}{trend}% vs mês anterior
      </div>
    )}
  </div>
);

// ── MinerLogo ───────────────────────────────────────────────────────────────
export const MinerLogo = ({ height = 26 }) => (
  <div style={{
    display: "inline-flex", alignItems: "center", justifyContent: "center",
    background: "#000", borderRadius: 10, padding: `5px ${Math.round(height * 0.55)}px`,
  }}>
    <img src="/logo-main.png" alt="Miner CRM" style={{ height, display: "block", objectFit: "contain" }} />
  </div>
);
