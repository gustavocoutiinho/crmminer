import React, { useState, useEffect } from "react";
import { T } from "../lib/theme";
import { fetchNotificacoes, markAllRead, markRead } from "../lib/api";
import { timeAgo, NOTIF_ICONS } from "../utils/helpers";

function NotificationBell({ onViewAll }) {
  const [notifs, setNotifs] = useState([]);
  const [unread, setUnread] = useState(0);
  const [open, setOpen] = useState(false);

  const load = async () => {
    try {
      const res = await fetchNotificacoes();
      setNotifs(res?.data || []);
      setUnread(res?.unread_count || 0);
    } catch (e) { /* silent */ }
  };

  useEffect(() => {
    load();
    const iv = setInterval(load, 20000);
    return () => clearInterval(iv);
  }, []);

  const handleMarkAll = async () => {
    try { await markAllRead(); setNotifs((n) => n.map((x) => ({ ...x, lida: true }))); setUnread(0); } catch {}
  };
  const handleMarkOne = async (n) => {
    if (n.lida) return;
    try { await markRead(n.id); setNotifs((prev) => prev.map((x) => x.id === n.id ? { ...x, lida: true } : x)); setUnread((c) => Math.max(0, c - 1)); } catch {}
  };

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    const handler = (e) => {
      if (!e.target.closest(".notif-bell-wrap")) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  return (
    <div className="notif-bell-wrap" style={{ position: "relative" }}>
      <div className="notif-bell" onClick={() => setOpen(!open)}>
        <span style={{ fontSize: 18 }}>🔔</span>
        {unread > 0 && <span className="notif-badge">{unread > 99 ? "99+" : unread}</span>}
      </div>
      {open && (
        <div className="notif-panel">
          <div style={{ padding: "14px 16px 10px", borderBottom: "1px solid rgba(0,0,0,0.06)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ fontSize: 14, fontWeight: 700 }}>Notificações</span>
            {unread > 0 && <button className="ap-btn-ghost" style={{ fontSize: 11 }} onClick={handleMarkAll}>Marcar todas como lidas</button>}
          </div>
          {notifs.length === 0 && <div style={{ padding: "24px 16px", textAlign: "center", color: T.muted, fontSize: 13 }}>Nenhuma notificação</div>}
          {notifs.slice(0, 20).map((n) => (
            <div key={n.id} className={`notif-item ${!n.lida ? "unread" : ""}`} onClick={() => handleMarkOne(n)}>
              <span style={{ fontSize: 16, flexShrink: 0, marginTop: 2 }}>{NOTIF_ICONS[n.tipo] || "ℹ️"}</span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13, fontWeight: n.lida ? 500 : 700, marginBottom: 2 }}>{n.titulo}</div>
                <div style={{ fontSize: 11, color: T.muted, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{n.mensagem}</div>
              </div>
              <span style={{ fontSize: 10, color: T.muted, flexShrink: 0, whiteSpace: "nowrap" }}>{timeAgo(n.created_at)}</span>
            </div>
          ))}
          {onViewAll && (
            <div onClick={() => { onViewAll(); setOpen(false); }} style={{ padding: "10px 16px", borderTop: "1px solid rgba(0,0,0,0.06)", textAlign: "center", cursor: "pointer", fontSize: 12, fontWeight: 600, color: "#007aff" }}>
              Ver todas →
            </div>
          )}
        </div>
      )}
    </div>
  );
}


export default NotificationBell;
