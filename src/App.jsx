import React, { useState, useEffect } from "react";
import { ToastProvider } from "./context/ToastContext";
import { registerServiceWorker } from "./lib/push";
import { logout as apiLogout } from "./lib/api";
import Login from "./pages/Login";
import PortalOwner from "./pages/owner/PortalOwner";
import PortalMarca from "./pages/marca/PortalMarca";

export default function App() {
  const [user, setUser] = useState(null);
  const [dark, setDark] = useState(() => { try { return localStorage.getItem("crm_dark")==="true" } catch{return false} });
  useEffect(() => { document.documentElement.setAttribute("data-theme", dark?"dark":"light") }, [dark]);
  useEffect(() => { registerServiceWorker() }, []);
  const onToggleDark = () => setDark(d=>{const n=!d;localStorage.setItem("crm_dark",String(n));return n});

  const handleLogin = async (loginData) => {
    setUser(loginData);
  };

  const handleLogout = () => {
    apiLogout();
    setUser(null);
  };

  if (!user) return <ToastProvider><Login onLogin={handleLogin} /></ToastProvider>;
  if (user.role === "miner") return <ToastProvider><PortalOwner user={user} onLogout={handleLogout} dark={dark} onToggleDark={onToggleDark} /></ToastProvider>;
  return <ToastProvider><PortalMarca user={user} onLogout={handleLogout} dark={dark} onToggleDark={onToggleDark} /></ToastProvider>;
}
