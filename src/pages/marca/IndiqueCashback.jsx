import React, { useState, useEffect, useMemo } from "react";
import { T } from "../../lib/theme";
import { Chip, KpiCard, SectionHeader } from "../../components/UI";
import { useToast } from "../../context/ToastContext";
import { fetchData } from "../../lib/api";

function IndiqueCashback({ user }) {
  const toast = useToast();
  const marcaId = user?.marca_id || user?.marcaId || "demo";
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("todas");

  const [indicacoes, setIndicacoes] = useState([]);
  const [clientes, setClientes] = useState([]);

  useEffect(() => {
    Promise.all([
      fetchData("indicacoes", { limit: 500 }),
      fetchData("clientes", { limit: 5000 }),
    ]).then(([ind, cl]) => {
      setIndicacoes(ind.data || []);
      setClientes(cl.data || []);
    }).catch(() => {});
  }, [marcaId]);

  const totalIndicacoes = indicacoes.length;
  const convertidas = indicacoes.filter((i) => i.status === "convertida").length;
  const receitaGerada = indicacoes.reduce((s, i) => s + (i.receita_gerada || 0), 0);
  const pontosCredtados = indicacoes.reduce((s, i) => s + (i.pontos_creditados || 0), 0);

  const filtered = indicacoes.filter((i) => {
    if (filterStatus !== "todas" && i.status !== filterStatus) return false;
    if (search) {
      const s = search.toLowerCase();
      const indicador = clientes.find((c) => c.id === i.indicador_id);
      return (
        (indicador?.nome || "").toLowerCase().includes(s) ||
        (i.indicado_nome || "").toLowerCase().includes(s) ||
        (i.indicado_email || "").toLowerCase().includes(s)
      );
    }
    return true;
  });

  const STATUS_MAP = {
    convertida: { c: "#28cd41", bg: "#e9fbed", icon: "✅" },
    pendente: { c: "#ff9500", bg: "#fff3e0", icon: "⏳" },
    expirada: { c: "#6e6e73", bg: "#f0f0f0", icon: "⏰" },
  };

  const copiarLink = (clienteId) => {
    const link = `https://minerbz.com.br/indicacao?ref=${clienteId}`;
    navigator.clipboard.writeText(link).catch(() => {});
    toast("Link de indicação copiado!", "success");
  };

  const compartilharWhatsApp = (clienteId) => {
    const link = `https://minerbz.com.br/indicacao?ref=${clienteId}`;
    const texto = encodeURIComponent(`Conheça essa loja incrível! Use meu link e ganhe desconto na primeira compra: ${link}`);
    window.open(`https://wa.me/?text=${texto}`, "_blank");
  };

  return (
    <div className="fade-up">
      <SectionHeader tag="Retenção" title="Indique e Ganhe" />

      <div className="kpi-grid-4" style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 12, marginBottom: 20 }}>
        <KpiCard label="Total indicações" value={totalIndicacoes} icon="🤝" color="#4545F5" />
        <KpiCard label="Convertidas" value={convertidas} icon="✅" color="#28cd41" />
        <KpiCard label="Receita gerada" value={`R$ ${receitaGerada.toLocaleString("pt-BR")}`} icon="💰" color="#8e44ef" />
        <KpiCard label="Pontos creditados" value={pontosCredtados.toLocaleString("pt-BR")} icon="⭐" color="#ff9500" />
      </div>

      {/* How it works */}
      <div className="ap-card" style={{ padding: "18px 22px", marginBottom: 16 }}>
        <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 10 }}>📋 Como funciona</div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 16 }}>
          <div style={{ textAlign: "center" }}>
            <div style={{ fontSize: 28, marginBottom: 6 }}>🔗</div>
            <div style={{ fontSize: 13, fontWeight: 600 }}>1. Compartilha o link</div>
            <div style={{ fontSize: 12, color: T.muted }}>Cada cliente tem um link/código único</div>
          </div>
          <div style={{ textAlign: "center" }}>
            <div style={{ fontSize: 28, marginBottom: 6 }}>🛍</div>
            <div style={{ fontSize: 13, fontWeight: 600 }}>2. Amigo compra</div>
            <div style={{ fontSize: 12, color: T.muted }}>O indicado ganha desconto na 1ª compra</div>
          </div>
          <div style={{ textAlign: "center" }}>
            <div style={{ fontSize: 28, marginBottom: 6 }}>⭐</div>
            <div style={{ fontSize: 13, fontWeight: 600 }}>3. Ambos ganham</div>
            <div style={{ fontSize: 12, color: T.muted }}>Quem indicou ganha pontos de fidelidade</div>
          </div>
        </div>
      </div>

      {/* Actions for first client */}
      <div className="ap-card" style={{ padding: "14px 18px", marginBottom: 16, display: "flex", gap: 8, flexWrap: "wrap" }}>
        <span style={{ fontSize: 13, fontWeight: 600, display: "flex", alignItems: "center", gap: 6, marginRight: 8 }}>
          🔗 Compartilhar links:
        </span>
        {clientes.slice(0, 3).map((c) => (
          <div key={c.id} style={{ display: "flex", gap: 4, alignItems: "center" }}>
            <span style={{ fontSize: 12, fontWeight: 600 }}>{c.nome.split(" ")[0]}:</span>
            <button className="ap-btn ap-btn-sm" style={{ fontSize: 11 }} onClick={() => copiarLink(c.id)}>📋 Copiar</button>
            <button className="ap-btn ap-btn-sm" style={{ fontSize: 11, color: "#128C7E" }} onClick={() => compartilharWhatsApp(c.id)}>💬 WhatsApp</button>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div style={{ display: "flex", gap: 8, marginBottom: 14, alignItems: "center" }}>
        <input className="ap-inp" placeholder="Buscar indicação..." value={search} onChange={(e) => setSearch(e.target.value)} style={{ maxWidth: 250, fontSize: 13 }} />
        <div className="seg" style={{ display: "inline-flex", gap: 2 }}>
          {[
            { k: "todas", l: "Todas" },
            { k: "convertida", l: "✅ Convertidas" },
            { k: "pendente", l: "⏳ Pendentes" },
            { k: "expirada", l: "⏰ Expiradas" },
          ].map((t) => (
            <button key={t.k} className={`seg-btn ${filterStatus === t.k ? "on" : ""}`} onClick={() => setFilterStatus(t.k)} style={{ fontSize: 12 }}>
              {t.l}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="ap-card" style={{ padding: 0, overflow: "hidden" }}>
        {filtered.length === 0 ? (
          <div style={{ textAlign: "center", padding: 40, color: T.muted, fontSize: 13 }}>Nenhuma indicação encontrada</div>
        ) : (
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
            <thead>
              <tr style={{ borderBottom: "1px solid rgba(0,0,0,0.06)" }}>
                <th style={{ textAlign: "left", padding: "12px 16px", fontSize: 11, fontWeight: 700, color: T.muted, textTransform: "uppercase" }}>Indicador</th>
                <th style={{ textAlign: "left", padding: "12px 16px", fontSize: 11, fontWeight: 700, color: T.muted, textTransform: "uppercase" }}>Indicado</th>
                <th style={{ textAlign: "left", padding: "12px 16px", fontSize: 11, fontWeight: 700, color: T.muted, textTransform: "uppercase" }}>Status</th>
                <th style={{ textAlign: "right", padding: "12px 16px", fontSize: 11, fontWeight: 700, color: T.muted, textTransform: "uppercase" }}>Pontos</th>
                <th style={{ textAlign: "right", padding: "12px 16px", fontSize: 11, fontWeight: 700, color: T.muted, textTransform: "uppercase" }}>Receita</th>
                <th style={{ textAlign: "right", padding: "12px 16px", fontSize: 11, fontWeight: 700, color: T.muted, textTransform: "uppercase" }}>Data</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((ind) => {
                const indicador = clientes.find((c) => c.id === ind.indicador_id);
                const st = STATUS_MAP[ind.status] || STATUS_MAP.pendente;
                return (
                  <tr key={ind.id} style={{ borderBottom: "1px solid rgba(0,0,0,0.04)" }}>
                    <td style={{ padding: "10px 16px", fontWeight: 600 }}>{indicador?.nome || "—"}</td>
                    <td style={{ padding: "10px 16px" }}>
                      <div>{ind.indicado_nome}</div>
                      <div style={{ fontSize: 11, color: T.muted }}>{ind.indicado_email}</div>
                    </td>
                    <td style={{ padding: "10px 16px" }}>
                      <Chip label={`${st.icon} ${ind.status}`} c={st.c} bg={st.bg} />
                    </td>
                    <td style={{ padding: "10px 16px", textAlign: "right", fontWeight: 600, color: "#ff9500" }}>
                      +{ind.pontos_creditados}
                    </td>
                    <td style={{ padding: "10px 16px", textAlign: "right", fontWeight: 600, color: "#28cd41" }}>
                      R$ {(ind.receita_gerada || 0).toLocaleString("pt-BR")}
                    </td>
                    <td style={{ padding: "10px 16px", textAlign: "right", color: T.muted, fontSize: 12 }}>
                      {ind.created_at ? new Date(ind.created_at).toLocaleDateString("pt-BR") : "—"}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

export default IndiqueCashback;
