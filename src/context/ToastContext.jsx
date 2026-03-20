import React, { useState, useCallback, createContext, useContext } from "react";

const ToastContext = createContext(() => {});
export const useToast = () => useContext(ToastContext);

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const addToast = useCallback((message, type = "success", duration = 3500) => {
    const id = Date.now() + Math.random();
    setToasts(prev => {
      const next = [...prev, { id, message, type }];
      return next.length > 5 ? next.slice(-5) : next;
    });
    setTimeout(() => setToasts(prev => prev.map(t => t.id === id ? { ...t, exiting: true } : t)), duration);
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), duration + 400);
  }, []);

  return (
    <ToastContext.Provider value={addToast}>
      {children}
      <div style={{ position: "fixed", bottom: 24, right: 24, zIndex: 99999, display: "flex", flexDirection: "column-reverse", gap: 10, pointerEvents: "none" }}>
        {toasts.map(t => (
          <div key={t.id} style={{
            padding: "12px 20px", borderRadius: 14, fontSize: 14, fontWeight: 600, fontFamily: "var(--sf)",
            display: "flex", alignItems: "center", gap: 10,
            backdropFilter: "blur(20px) saturate(1.8)", WebkitBackdropFilter: "blur(20px) saturate(1.8)",
            boxShadow: "0 8px 32px rgba(0,0,0,0.12), 0 1px 3px rgba(0,0,0,0.06)",
            pointerEvents: "auto",
            animation: t.exiting ? "toastOut 0.35s ease forwards" : "toastIn 0.35s cubic-bezier(.34,1.2,.64,1)",
            ...(t.type === "success" ? { background: "rgba(40,205,65,0.95)", color: "#fff" } :
               t.type === "error" ? { background: "rgba(255,59,48,0.95)", color: "#fff" } :
               t.type === "warning" ? { background: "rgba(255,149,0,0.95)", color: "#fff" } :
               { background: "rgba(255,255,255,0.95)", color: "#1d1d1f", border: "1px solid rgba(0,0,0,0.08)" }),
          }}>
            <span style={{ fontSize: 18 }}>
              {t.type === "success" ? "✅" : t.type === "error" ? "❌" : t.type === "warning" ? "⚠️" : "ℹ️"}
            </span>
            <span>{t.message}</span>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export default ToastContext;
