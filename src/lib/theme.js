// ── Design Tokens & Configurações ───────────────────────────────────────────

export const BRAND = "#4545F5";

export const LIGHT = {
  bg: "#f5f5f7",
  card: "rgba(255,255,255,0.92)",
  text: "#1d1d1f",
  sub: "#6e6e73",
  muted: "#aeaeb2",
  border: "rgba(0,0,0,0.08)",
  hover: "rgba(0,0,0,0.04)",
  inputBg: "rgba(0,0,0,0.04)",
  inputBorder: "rgba(0,0,0,0.09)",
};

export const DARK = {
  bg: "#1c1c1e",
  card: "rgba(44,44,46,0.92)",
  text: "#f5f5f7",
  sub: "#aeaeb2",
  muted: "#6e6e73",
  border: "rgba(255,255,255,0.08)",
  hover: "rgba(255,255,255,0.06)",
  inputBg: "rgba(255,255,255,0.06)",
  inputBorder: "rgba(255,255,255,0.10)",
};

export const getTheme = (dark) => dark ? DARK : LIGHT;

export const T = {
  bg: "#f5f5f7",
  bgCard: "rgba(255,255,255,0.92)",
  blue: "#4545F5",
  blueDk: "#2f2fb8",
  blueLt: "#eeeeff",
  green: "#28cd41",
  greenLt: "#e9fbed",
  orange: "#ff9500",
  orangeLt: "#fff3e0",
  red: "#ff3b30",
  redLt: "#ffe5e3",
  purple: "#8e44ef",
  purpleLt: "#f3ebff",
  text: "#1d1d1f",
  sub: "#6e6e73",
  muted: "#aeaeb2",
  border: "rgba(0,0,0,0.08)",
};

export const STATUS_CFG = {
  ativo: { label: "Ativo", bg: "#e9fbed", c: "#28cd41" },
  inativo: { label: "Inativo", bg: "#ffe5e3", c: "#ff3b30" },
  trial: { label: "Trial", bg: "#fff3e0", c: "#ff9500" },
};

export const PLANO_CFG = {
  starter: { c: "#28cd41", bg: "#e9fbed" },
  pro: { c: "#4545F5", bg: "#eeeeff" },
  enterprise: { c: "#8e44ef", bg: "#f3ebff" },
};

export const ROLE_CFG = {
  miner: { label: "Miner", c: "#ff3b30", bg: "#ffe5e3", icon: "👑" },
  dono: { label: "Dono", c: "#4545F5", bg: "#eeeeff", icon: "🔐" },
  gerente: { label: "Gerente", c: "#8e44ef", bg: "#f3ebff", icon: "📊" },
  vendedor: { label: "Vendedor", c: "#ff9500", bg: "#fff3e0", icon: "🏷" },
};

export const RFM_CFG = {
  campiao: { label: "Campeão", c: "#4545F5", bg: "#eeeeff" },
  fiel: { label: "Fiel", c: "#28cd41", bg: "#e9fbed" },
  potencial: { label: "Potencial", c: "#ff9500", bg: "#fff3e0" },
  em_risco: { label: "Em Risco", c: "#ff3b30", bg: "#ffe5e3" },
  inativo: { label: "Inativo", c: "#aeaeb2", bg: "#f5f5f7" },
};
