import React, { useState, useEffect } from "react";
import { T } from "../../lib/theme";
import { KpiCard, SectionHeader } from "../../components/UI";
import { fetchAdminSystem, checkHealth, recalculateRFM, clearExpiredSessions } from "../../lib/api";

function OwnerSistema() {
  const [sysData, setSysData] = useState(null);
  const [healthData, setHealthData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [actionMsg, setActionMsg] = useState("");

  useEffect(() => {
    Promise.all([fetchAdminSystem(), checkHealth()])
      .then(([sys, health]) => { setSysData(sys); setHealthData(health); })
      .catch(e => console.error(e))
      .finally(() => setLoading(false));
  }, []);

  const handleRecalcRFM = async () => {
    setActionMsg("Recalculando RFM...");
    try { await recalculateRFM(); setActionMsg("✅ RFM recalculado!"); } catch (e) { setActionMsg("❌ Erro: " + e.message); }
    setTimeout(() => setActionMsg(""), 3000);
  };

  const handleClearSessions = async () => {
    setActionMsg("Limpando sessões expiradas...");
    try { const r = await clearExpiredSessions(); setActionMsg(`✅ Sessões limpas: ${r.cleared || 0} removidas`); } catch (e) { setActionMsg("❌ Erro: " + e.message); }
    setTimeout(() => setActionMsg(""), 3000);
  };

  const formatUptime = (seconds) => {
    const d = Math.floor(seconds / 86400);
    const h = Math.floor((seconds % 86400) / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    return `${d}d ${h}h ${m}m`;
  };

  const formatBytes = (bytes) => {
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
    return (bytes / (1024 * 1024)).toFixed(1) + " MB";
  };

  if (loading) return <div style={{ textAlign: "center", padding: 60, color: T.muted }}>Carregando dados do sistema...</div>;

  return (
    <div className="fade-up">
      <SectionHeader tag="Admin" title="Sistema" />

      {/* Server Health */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 14, marginBottom: 20 }}>
        <KpiCard label="Status do Servidor" value={healthData?.status === "ok" ? "✅ Online" : "❌ Offline"} sub={healthData?.ts ? new Date(healthData.ts).toLocaleString("pt-BR") : ""} color={healthData?.status === "ok" ? "#28cd41" : "#ff3b30"} icon="🖥" />
        <KpiCard label="Uptime" value={sysData?.uptime ? formatUptime(sysData.uptime) : "—"} sub="Tempo desde último restart" color="#4545F5" icon="⏱" />
        <KpiCard label="Memória (Heap)" value={sysData?.memory ? formatBytes(sysData.memory.heapUsed) : "—"} sub={sysData?.memory ? `de ${formatBytes(sysData.memory.heapTotal)}` : ""} color="#8e44ef" icon="💾" />
        <KpiCard label="Sessões Ativas" value={sysData?.db?.sessions_active || 0} sub="tokens válidos" color="#ff9500" icon="🔐" />
      </div>

      {/* Database Stats */}
      <div className="ap-card" style={{ padding: "22px 24px", marginBottom: 20 }}>
        <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 16 }}>📊 Estatísticas do Banco</div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: 14 }}>
          {sysData?.db && Object.entries(sysData.db).map(([key, val]) => (
            <div key={key} style={{ textAlign: "center", padding: "14px 8px", background: "rgba(0,0,0,0.02)", borderRadius: 12 }}>
              <div style={{ fontSize: 24, fontWeight: 800, color: "#4545F5" }}>{typeof val === 'number' ? val.toLocaleString("pt-BR") : val}</div>
              <div style={{ fontSize: 11, color: T.muted, marginTop: 4, textTransform: "capitalize" }}>{key.replace(/_/g, " ")}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Quick Actions */}
      <div className="ap-card" style={{ padding: "22px 24px" }}>
        <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 16 }}>⚡ Ações Rápidas</div>
        {actionMsg && <div style={{ padding: "10px 16px", marginBottom: 14, borderRadius: 10, background: actionMsg.includes("✅") ? "#28cd4115" : actionMsg.includes("❌") ? "#ff3b3015" : "#4545F515", color: actionMsg.includes("✅") ? "#28cd41" : actionMsg.includes("❌") ? "#ff3b30" : "#4545F5", fontSize: 13, fontWeight: 600 }}>{actionMsg}</div>}
        <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
          <button onClick={handleRecalcRFM} style={{ background: "#4545F510", color: "#4545F5", border: "1px solid #4545F530", padding: "12px 24px", borderRadius: 12, fontSize: 13, fontWeight: 700, cursor: "pointer", display: "flex", alignItems: "center", gap: 8 }}>🧠 Recalcular RFM</button>
          <button onClick={handleClearSessions} style={{ background: "#ff950010", color: "#ff9500", border: "1px solid #ff950030", padding: "12px 24px", borderRadius: 12, fontSize: 13, fontWeight: 700, cursor: "pointer", display: "flex", alignItems: "center", gap: 8 }}>🧹 Limpar Sessões Expiradas</button>
        </div>
      </div>
    </div>
  );
}

export default OwnerSistema;
