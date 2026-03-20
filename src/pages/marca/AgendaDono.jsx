import React, { useState, useEffect } from "react";
import { T } from "../../lib/theme";
import { Avatar } from "../../components/UI";
import { useToast } from "../../context/ToastContext";
import { fetchAgenda, fetchData } from "../../lib/api";

function AgendaDono({ onViewCliente }) {
  const toast = useToast();
  const [acoes, setAcoes] = useState([]);
  const [tarefas, setTarefas] = useState([]);
  const [vendas, setVendas] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let done = 0;
    const check = () => { done++; if (done >= 3) setLoading(false); };
    fetchAgenda().then(r => setAcoes(r.acoes || [])).catch(() => {}).finally(check);
    fetchData("tarefas", { limit: 5, status: "pendente" }).then(r => setTarefas(r.data || [])).catch(() => {}).finally(check);
    fetchData("pedidos", { limit: 5, order_by: "created_at", order_dir: "desc" }).then(r => setVendas(r.data || [])).catch(() => {}).finally(check);
  }, []);

  const urgColor = { alta: "#ff3b30", media: "#ff9500", baixa: "#28cd41" };
  const urgBg = { alta: "#ff3b3008", media: "#ff950008", baixa: "#28cd4108" };
  const urgBorder = { alta: "2px solid #ff3b3025", media: "2px solid #ff950025", baixa: "1px solid rgba(0,0,0,0.06)" };
  const urgLabel = { alta: "URGENTE", media: "IMPORTANTE", baixa: "OPORTUNIDADE" };

  if (loading) return <div className="ap-card" style={{ padding: "22px 24px", marginBottom: 20, textAlign: "center" }}><span style={{ fontSize: 13, color: T.muted }}>⏳ Carregando agenda...</span></div>;

  return (
    <div className="ap-card" style={{ padding: "22px 24px", marginBottom: 20, border: "2px solid #4545F518" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 18 }}>
        <div>
          <div style={{ fontSize: 16, fontWeight: 700 }}>📋 Agenda do Dia</div>
          <div style={{ fontSize: 12, color: T.sub }}>Ações prioritárias baseadas nos seus dados reais</div>
        </div>
        <div style={{ fontSize: 11, color: "#4545F5", background: "#4545F508", padding: "4px 10px", borderRadius: 8, fontWeight: 600 }}>🤖 IA Miner</div>
      </div>

      {/* Tarefas */}
      {tarefas.length > 0 && (
        <div style={{ marginBottom: 18 }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: T.sub, marginBottom: 8, textTransform: "uppercase", letterSpacing: 0.5 }}>📌 Tarefas pendentes</div>
          {tarefas.map((t, i) => (
            <div key={t.id || i} style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 12px", borderRadius: 8, border: "1px solid rgba(0,0,0,0.06)", marginBottom: 6 }}>
              <span style={{ fontSize: 14 }}>☑️</span>
              <div style={{ flex: 1, fontSize: 13, fontWeight: 500 }}>{t.titulo}</div>
              <span style={{ fontSize: 10, fontWeight: 700, color: t.prioridade === "alta" ? "#ff3b30" : t.prioridade === "media" ? "#ff9500" : "#8e8e93", background: t.prioridade === "alta" ? "#ff3b3012" : t.prioridade === "media" ? "#ff950012" : "#8e8e9312", padding: "2px 8px", borderRadius: 6 }}>{(t.prioridade || "normal").toUpperCase()}</span>
            </div>
          ))}
        </div>
      )}

      {/* Ações IA */}
      {acoes.length > 0 && (
        <div style={{ marginBottom: 18 }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: T.sub, marginBottom: 8, textTransform: "uppercase", letterSpacing: 0.5 }}>🧠 Ações sugeridas pela IA</div>
          {acoes.map((a, i) => (
            <div key={a.id + "-" + i} style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 14px", borderRadius: 10, border: urgBorder[a.urgencia] || "1px solid rgba(0,0,0,0.06)", background: urgBg[a.urgencia] || "transparent", marginBottom: 8, transition: "all .15s" }}>
              <span style={{ fontSize: 22 }}>{a.icon}</span>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 13, fontWeight: 600 }}>{a.texto}</div>
                <div style={{ fontSize: 11, color: T.muted, marginTop: 2 }}>{a.detalhe}</div>
              </div>
              <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                <span style={{ fontSize: 9, fontWeight: 700, color: urgColor[a.urgencia] || "#666", background: (urgColor[a.urgencia] || "#666") + "15", padding: "2px 6px", borderRadius: 4 }}>{urgLabel[a.urgencia] || ""}</span>
                <button onClick={() => onViewCliente && onViewCliente(a.id)} style={{ fontSize: 11, fontWeight: 600, color: "#fff", background: "#4545F5", border: "none", borderRadius: 6, padding: "5px 10px", cursor: "pointer", whiteSpace: "nowrap" }}>{a.acao_btn || "Ver"}</button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Últimas vendas */}
      {vendas.length > 0 && (
        <div>
          <div style={{ fontSize: 12, fontWeight: 700, color: T.sub, marginBottom: 8, textTransform: "uppercase", letterSpacing: 0.5 }}>🛍 Últimas vendas</div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: 8 }}>
            {vendas.slice(0, 5).map((v, i) => (
              <div key={v.id || i} style={{ padding: "10px 12px", borderRadius: 8, border: "1px solid rgba(0,0,0,0.06)", textAlign: "center" }}>
                <div style={{ fontSize: 15, fontWeight: 700, color: "#28cd41" }}>R$ {(+v.valor).toFixed(0)}</div>
                <div style={{ fontSize: 11, color: T.muted, marginTop: 2 }}>{new Date(v.created_at).toLocaleDateString("pt-BR")}</div>
                <div style={{ fontSize: 10, color: T.sub, marginTop: 1 }}>{v.status}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {!acoes.length && !tarefas.length && !vendas.length && (
        <div style={{ textAlign: "center", padding: "24px 0", color: T.muted }}>Nenhuma ação pendente 🎉</div>
      )}
    </div>
  );
}

export default AgendaDono;
