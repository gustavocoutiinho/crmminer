import { useState, useEffect, useRef, useCallback } from "react";
import { T } from "../lib/theme";
import { globalSearch } from "../lib/api";

const TIPO_ICONS = { cliente: "🙍", tarefa: "📋", campanha: "📢" };
const TIPO_LABELS = { cliente: "Clientes", tarefa: "Tarefas", campanha: "Campanhas" };
const TIPO_PAGE = { cliente: "clientes", tarefa: "agenda", campanha: "campanhas" };

const OVERLAY_STYLE = {
  position: "fixed", inset: 0, zIndex: 9999,
  background: "rgba(0,0,0,0.45)", backdropFilter: "blur(8px)", WebkitBackdropFilter: "blur(8px)",
  display: "flex", alignItems: "flex-start", justifyContent: "center", paddingTop: "18vh",
  animation: "gsOverlayIn .18s ease-out",
};

const BOX_STYLE = {
  width: "100%", maxWidth: 580, background: "rgba(255,255,255,0.97)",
  borderRadius: 22, boxShadow: "0 24px 80px rgba(0,0,0,0.22), 0 0 0 1px rgba(255,255,255,0.15)",
  overflow: "hidden", animation: "gsBoxIn .2s ease-out",
};

const INPUT_STYLE = {
  width: "100%", fontSize: 18, fontWeight: 500, padding: "18px 22px",
  border: "none", outline: "none", background: "transparent",
  fontFamily: "var(--sf)", color: T.text,
};

const RESULT_STYLE = {
  display: "flex", alignItems: "center", gap: 12, padding: "11px 20px",
  cursor: "pointer", transition: "background .12s",
};

const CSS = `
@keyframes gsOverlayIn { from { opacity:0 } to { opacity:1 } }
@keyframes gsBoxIn { from { opacity:0; transform:scale(.96) translateY(-8px) } to { opacity:1; transform:scale(1) translateY(0) } }
`;

export default function GlobalSearch({ setPage }) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [highlight, setHighlight] = useState(0);
  const inputRef = useRef(null);
  const timerRef = useRef(null);
  const flatRef = useRef([]);

  // Cmd+K / Ctrl+K global listener
  useEffect(() => {
    const handler = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setOpen((v) => !v);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  // Reset state on open
  useEffect(() => {
    if (open) {
      setQuery(""); setResults([]); setHighlight(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [open]);

  // Debounced search
  useEffect(() => {
    clearTimeout(timerRef.current);
    if (!query.trim()) { setResults([]); setLoading(false); return; }
    setLoading(true);
    timerRef.current = setTimeout(async () => {
      try {
        const data = await globalSearch(query);
        setResults(data.results || []);
        setHighlight(0);
      } catch { setResults([]); }
      setLoading(false);
    }, 300);
    return () => clearTimeout(timerRef.current);
  }, [query]);

  // Build flat list for keyboard nav
  const grouped = {};
  results.forEach((r) => { (grouped[r.tipo] = grouped[r.tipo] || []).push(r); });
  const flat = [];
  Object.keys(grouped).forEach((tipo) => grouped[tipo].forEach((r) => flat.push(r)));
  flatRef.current = flat;

  const navigate = useCallback((r) => {
    setOpen(false);
    const pg = TIPO_PAGE[r.tipo] || "dashboard";
    setPage(pg);
  }, [setPage]);

  const onKeyDown = (e) => {
    if (e.key === "Escape") { setOpen(false); return; }
    if (e.key === "ArrowDown") { e.preventDefault(); setHighlight((h) => Math.min(h + 1, flat.length - 1)); return; }
    if (e.key === "ArrowUp") { e.preventDefault(); setHighlight((h) => Math.max(h - 1, 0)); return; }
    if (e.key === "Enter" && flat[highlight]) { e.preventDefault(); navigate(flat[highlight]); return; }
  };

  if (!open) return <style>{CSS}</style>;

  let flatIdx = -1;
  return (
    <>
      <style>{CSS}</style>
      <div style={OVERLAY_STYLE} onClick={(e) => { if (e.target === e.currentTarget) setOpen(false); }}>
        <div style={BOX_STYLE} onKeyDown={onKeyDown}>
          <div style={{ display: "flex", alignItems: "center", borderBottom: `1px solid ${T.border}` }}>
            <span style={{ paddingLeft: 20, fontSize: 18, color: T.muted }}>🔍</span>
            <input
              ref={inputRef}
              style={INPUT_STYLE}
              placeholder="Buscar clientes, tarefas, campanhas..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={onKeyDown}
            />
            <span
              onClick={() => setOpen(false)}
              style={{ marginRight: 16, fontSize: 11, fontWeight: 600, color: T.muted, background: T.bg, borderRadius: 6, padding: "3px 8px", cursor: "pointer", whiteSpace: "nowrap" }}
            >ESC</span>
          </div>

          <div style={{ maxHeight: 400, overflow: "auto" }}>
            {loading && (
              <div style={{ padding: "24px 20px", textAlign: "center", color: T.muted, fontSize: 14 }}>Buscando...</div>
            )}

            {!loading && !query.trim() && (
              <div style={{ padding: "24px 20px", textAlign: "center", color: T.muted, fontSize: 14 }}>
                Digite para buscar clientes, tarefas, campanhas...
              </div>
            )}

            {!loading && query.trim() && flat.length === 0 && (
              <div style={{ padding: "24px 20px", textAlign: "center", color: T.muted, fontSize: 14 }}>
                Nenhum resultado para "{query}"
              </div>
            )}

            {!loading && Object.keys(grouped).map((tipo) => (
              <div key={tipo}>
                <div style={{ padding: "10px 20px 4px", fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", color: T.muted }}>
                  {TIPO_LABELS[tipo] || tipo}
                </div>
                {grouped[tipo].map((r) => {
                  flatIdx++;
                  const idx = flatIdx;
                  const isHl = idx === highlight;
                  return (
                    <div
                      key={`${r.tipo}-${r.id}`}
                      style={{ ...RESULT_STYLE, background: isHl ? T.blueLt : "transparent" }}
                      onClick={() => navigate(r)}
                      onMouseEnter={() => setHighlight(idx)}
                    >
                      <span style={{ fontSize: 20, width: 28, textAlign: "center", flexShrink: 0 }}>{TIPO_ICONS[r.tipo] || "📄"}</span>
                      <div style={{ minWidth: 0, flex: 1 }}>
                        <div style={{ fontSize: 14, fontWeight: 600, color: T.text, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{r.titulo}</div>
                        {(r.subtitulo || r.extra) && (
                          <div style={{ fontSize: 12, color: T.sub, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                            {r.subtitulo}{r.subtitulo && r.extra ? " · " : ""}{r.extra}
                          </div>
                        )}
                      </div>
                      {r.segmento && (
                        <span style={{ fontSize: 10, fontWeight: 600, padding: "2px 8px", borderRadius: 8, background: T.blueLt, color: T.blue, flexShrink: 0 }}>{r.segmento}</span>
                      )}
                    </div>
                  );
                })}
              </div>
            ))}
          </div>

          {flat.length > 0 && (
            <div style={{ borderTop: `1px solid ${T.border}`, padding: "8px 20px", display: "flex", gap: 16, justifyContent: "center" }}>
              <span style={{ fontSize: 11, color: T.muted }}>↑↓ navegar</span>
              <span style={{ fontSize: 11, color: T.muted }}>↵ abrir</span>
              <span style={{ fontSize: 11, color: T.muted }}>esc fechar</span>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
