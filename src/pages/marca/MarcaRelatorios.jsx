import React, { useState } from "react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line, Legend } from "recharts";
import { T, RFM_CFG } from "../../lib/theme";
import { Chip, KpiCard, SectionHeader } from "../../components/UI";
import { useToast } from "../../context/ToastContext";

const PIE_COLORS = ["#4545F5", "#28cd41", "#ff9500", "#ff3b30", "#8e44ef", "#00c7be", "#ffd60a"];

function MarcaRelatorios({ user }) {
  const [tab, setTab] = useState("vendas");
  const toast = useToast();
  const mock = {};
  const clientes = [];
  const fidelidade = [];

  const tabs = [
    { k: "vendas", l: "💰 Vendas" },
    { k: "campanhas", l: "📢 Campanhas" },
    { k: "equipe", l: "👥 Equipe" },
    { k: "clientes", l: "🙍 Clientes" },
    { k: "exportar", l: "📥 Exportar" },
  ];

  const fmtR = (v) => `R$ ${Number(v || 0).toLocaleString("pt-BR", { minimumFractionDigits: 0 })}`;

  // RFM distribution from actual clients
  const rfmDist = {};
  clientes.forEach(c => {
    const seg = c.segmento_rfm || "other";
    rfmDist[seg] = (rfmDist[seg] || 0) + 1;
  });
  const rfmPieData = Object.entries(rfmDist).map(([key, count]) => ({
    name: RFM_CFG[key]?.label || key, value: count, key,
  }));

  // Fidelidade distribution
  const nivelDist = {};
  fidelidade.forEach(f => { nivelDist[f.nivel] = (nivelDist[f.nivel] || 0) + 1; });
  const nivelPieData = Object.entries(nivelDist).map(([key, count]) => ({ name: key, value: count }));
  const nivelColors = { Bronze: "#cd7f32", Prata: "#c0c0c0", Ouro: "#ffd700", Diamante: "#4545F5" };

  // Vendas comparativo
  const vendasArr = mock.vendas_mensal || [];
  const mesAtual = vendasArr[vendasArr.length - 1];
  const mesAnterior = vendasArr[vendasArr.length - 2];
  const varReceita = mesAnterior ? (((mesAtual?.receita || 0) - mesAnterior.receita) / mesAnterior.receita * 100).toFixed(1) : 0;

  // Top clientes
  const topClientes = [...clientes].sort((a, b) => (b.receita_total || 0) - (a.receita_total || 0)).slice(0, 10);

  // CSV export
  const exportCSV = (data, filename, headers) => {
    const BOM = "\uFEFF";
    let csv = BOM + headers.join(",") + "\n";
    data.forEach(row => { csv += headers.map(h => `"${row[h] ?? ""}"`).join(",") + "\n"; });
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = filename;
    document.body.appendChild(a); a.click();
    document.body.removeChild(a); URL.revokeObjectURL(url);
    toast("CSV exportado!", "success");
  };

  // PDF export (print)
  const exportPDF = (title, content) => {
    const w = window.open("", "_blank");
    if (!w) return;
    w.document.write(`<!DOCTYPE html><html><head><meta charset="utf-8"><title>${title}</title>
      <style>*{box-sizing:border-box;margin:0;padding:0}body{font-family:-apple-system,sans-serif;padding:40px;color:#1d1d1f;max-width:900px;margin:0 auto}
      h1{font-size:24px;margin-bottom:4px}h2{font-size:16px;color:#4545F5;margin:24px 0 12px}
      .sub{color:#6e6e73;font-size:13px;margin-bottom:32px}
      table{width:100%;border-collapse:collapse;margin:12px 0}th{text-align:left;padding:8px 12px;border-bottom:2px solid #e5e5e7;font-size:10px;color:#6e6e73;text-transform:uppercase}
      td{padding:8px 12px;border-bottom:1px solid #f0f0f2;font-size:13px}.footer{margin-top:48px;text-align:center;color:#aeaeb2;font-size:10px;border-top:1px solid #e5e5e7;padding-top:16px}
      @media print{body{padding:20px}}</style></head><body>
      <h1>${title}</h1><div class="sub">Gerado em ${new Date().toLocaleDateString("pt-BR")} às ${new Date().toLocaleTimeString("pt-BR")}</div>
      ${content}
      <div class="footer">CRM Miner · Relatório gerado automaticamente</div></body></html>`);
    w.document.close();
    setTimeout(() => w.print(), 600);
  };

  return (
    <div className="fade-up">
      <SectionHeader tag="BI" title="Relatórios & Analytics" />

      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 24, flexWrap: "wrap", gap: 12 }}>
        <div className="seg" style={{ display: "flex", gap: 4, background: "rgba(0,0,0,0.04)", borderRadius: 10, padding: 4 }}>
          {tabs.map(t => (
            <button key={t.k} className={`seg-btn ${tab === t.k ? "on" : ""}`} onClick={() => setTab(t.k)}>{t.l}</button>
          ))}
        </div>
      </div>

      {/* ── TAB VENDAS ── */}
      {tab === "vendas" && (
        <div className="fade-up">
          {/* KPIs comparativo */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 14, marginBottom: 20 }}>
            <KpiCard label="Receita Mês Atual" value={fmtR(mesAtual?.receita)} sub={`${mesAtual?.pedidos || 0} pedidos`} color="#4545F5" icon="💰" />
            <KpiCard label="Receita Mês Anterior" value={fmtR(mesAnterior?.receita)} sub={`${mesAnterior?.pedidos || 0} pedidos`} color="#aeaeb2" icon="📊" />
            <KpiCard label="Variação" value={`${varReceita > 0 ? "+" : ""}${varReceita}%`} sub="mês vs anterior" color={varReceita >= 0 ? "#28cd41" : "#ff3b30"} icon={varReceita >= 0 ? "📈" : "📉"} />
            <KpiCard label="Ticket Médio" value={fmtR(mesAtual?.receita && mesAtual?.pedidos ? mesAtual.receita / mesAtual.pedidos : 0)} sub="mês atual" color="#8e44ef" icon="🎫" />
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 16 }}>
            {/* Receita por período */}
            <div className="ap-card" style={{ padding: "22px 24px" }}>
              <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 16 }}>Receita por Período</h3>
              <ResponsiveContainer width="100%" height={240}>
                <LineChart data={vendasArr}>
                  <XAxis dataKey="mes" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip formatter={(v) => fmtR(v)} />
                  <Line type="monotone" dataKey="receita" stroke="#4545F5" strokeWidth={2.5} dot={{ r: 4, fill: "#4545F5" }} name="Receita" />
                </LineChart>
              </ResponsiveContainer>
            </div>

            {/* Ticket médio por vendedor */}
            <div className="ap-card" style={{ padding: "22px 24px" }}>
              <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 16 }}>Ticket Médio por Vendedor</h3>
              <ResponsiveContainer width="100%" height={240}>
                <BarChart data={mock.equipe_performance || []}>
                  <XAxis dataKey="vendedor" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip formatter={(v) => fmtR(v)} />
                  <Bar dataKey="ticket_medio" fill="#8e44ef" radius={[6, 6, 0, 0]} name="Ticket Médio" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Top 10 clientes */}
          <div className="ap-card" style={{ padding: 0, overflow: "hidden" }}>
            <div style={{ padding: "16px 22px", borderBottom: "1px solid rgba(0,0,0,0.06)" }}>
              <span style={{ fontSize: 15, fontWeight: 700 }}>Top 10 Clientes por Receita</span>
            </div>
            {topClientes.map((cl, i) => (
              <div key={cl.id} style={{ display: "flex", alignItems: "center", gap: 14, padding: "10px 22px", borderBottom: i < 9 ? "1px solid rgba(0,0,0,0.05)" : "none" }}>
                <span className="num" style={{ fontSize: 12, color: T.muted, fontWeight: 700, width: 20, textAlign: "right" }}>{i + 1}</span>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 13, fontWeight: 600 }}>{cl.nome}</div>
                  <div style={{ fontSize: 11, color: T.muted }}>{cl.total_pedidos} pedidos</div>
                </div>
                <span className="num" style={{ fontSize: 14, fontWeight: 700, color: "#4545F5" }}>{fmtR(cl.receita_total)}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── TAB CAMPANHAS ── */}
      {tab === "campanhas" && (
        <div className="fade-up">
          <div className="ap-card" style={{ padding: 0, overflow: "hidden", marginBottom: 16 }}>
            <div style={{ padding: "16px 22px", borderBottom: "1px solid rgba(0,0,0,0.06)" }}>
              <span style={{ fontSize: 15, fontWeight: 700 }}>Performance por Campanha</span>
            </div>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ borderBottom: "1px solid rgba(0,0,0,0.08)" }}>
                  {["Campanha", "Tipo", "Enviados", "Abertos", "Convertidos", "Taxa Conv.", "Receita", "ROI"].map(h => (
                    <th key={h} style={{ padding: "10px 14px", textAlign: "left", fontSize: 10, fontWeight: 700, color: T.muted, textTransform: "uppercase" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {(mock.campanhas_performance || []).map((c, i) => {
                  const taxa = c.enviados > 0 ? ((c.convertidos / c.enviados) * 100).toFixed(1) : 0;
                  const roi = c.enviados > 0 ? ((c.receita / (c.enviados * 0.5)) * 100).toFixed(0) : 0;
                  return (
                    <tr key={i} style={{ borderBottom: "1px solid rgba(0,0,0,0.04)" }}>
                      <td style={{ padding: "10px 14px", fontSize: 13, fontWeight: 600 }}>{c.nome}</td>
                      <td style={{ padding: "10px 14px" }}><Chip label={c.tipo === "whatsapp" ? "💬 WhatsApp" : "📧 Email"} c={c.tipo === "whatsapp" ? "#28cd41" : "#4545F5"} bg={c.tipo === "whatsapp" ? "#e9fbed" : "#eeeeff"} /></td>
                      <td style={{ padding: "10px 14px", fontSize: 13 }}>{c.enviados}</td>
                      <td style={{ padding: "10px 14px", fontSize: 13 }}>{c.abertos}</td>
                      <td style={{ padding: "10px 14px", fontSize: 13, fontWeight: 700, color: "#28cd41" }}>{c.convertidos}</td>
                      <td style={{ padding: "10px 14px", fontSize: 13, fontWeight: 600 }}>{taxa}%</td>
                      <td style={{ padding: "10px 14px", fontSize: 13, fontWeight: 700, color: "#4545F5" }}>{fmtR(c.receita)}</td>
                      <td style={{ padding: "10px 14px", fontSize: 13, fontWeight: 600, color: "#28cd41" }}>{roi}%</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Conversão por tipo */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
            <div className="ap-card" style={{ padding: "22px 24px" }}>
              <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 16 }}>Conversão por Tipo</h3>
              {(() => {
                const byTipo = {};
                (mock.campanhas_performance || []).forEach(c => {
                  if (!byTipo[c.tipo]) byTipo[c.tipo] = { enviados: 0, convertidos: 0 };
                  byTipo[c.tipo].enviados += c.enviados;
                  byTipo[c.tipo].convertidos += c.convertidos;
                });
                const data = Object.entries(byTipo).map(([tipo, v]) => ({
                  tipo: tipo === "whatsapp" ? "WhatsApp" : "Email",
                  taxa: v.enviados > 0 ? +((v.convertidos / v.enviados) * 100).toFixed(1) : 0,
                }));
                return (
                  <ResponsiveContainer width="100%" height={200}>
                    <BarChart data={data}>
                      <XAxis dataKey="tipo" tick={{ fontSize: 12 }} />
                      <YAxis tick={{ fontSize: 12 }} />
                      <Tooltip formatter={(v) => `${v}%`} />
                      <Bar dataKey="taxa" fill="#4545F5" radius={[6, 6, 0, 0]} name="Taxa de Conversão %" />
                    </BarChart>
                  </ResponsiveContainer>
                );
              })()}
            </div>
            <div className="ap-card" style={{ padding: "22px 24px" }}>
              <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 16 }}>Receita por Campanha</h3>
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={mock.campanhas_performance || []} layout="vertical">
                  <XAxis type="number" tick={{ fontSize: 11 }} />
                  <YAxis type="category" dataKey="nome" tick={{ fontSize: 10 }} width={100} />
                  <Tooltip formatter={(v) => fmtR(v)} />
                  <Bar dataKey="receita" fill="#28cd41" radius={[0, 6, 6, 0]} name="Receita" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      )}

      {/* ── TAB EQUIPE ── */}
      {tab === "equipe" && (
        <div className="fade-up">
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 16 }}>
            <div className="ap-card" style={{ padding: "22px 24px" }}>
              <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 16 }}>Contatos Realizados por Vendedor</h3>
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={mock.equipe_performance || []}>
                  <XAxis dataKey="vendedor" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip />
                  <Bar dataKey="contatos" fill="#4545F5" radius={[6, 6, 0, 0]} name="Contatos" />
                </BarChart>
              </ResponsiveContainer>
            </div>
            <div className="ap-card" style={{ padding: "22px 24px" }}>
              <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 16 }}>Meta vs Realizado (%)</h3>
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={mock.equipe_performance || []}>
                  <XAxis dataKey="vendedor" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} domain={[0, 100]} />
                  <Tooltip formatter={(v) => `${v}%`} />
                  <Bar dataKey="meta_pct" fill="#28cd41" radius={[6, 6, 0, 0]} name="Meta %" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Ranking */}
          <div className="ap-card" style={{ padding: 0, overflow: "hidden" }}>
            <div style={{ padding: "16px 22px", borderBottom: "1px solid rgba(0,0,0,0.06)" }}>
              <span style={{ fontSize: 15, fontWeight: 700 }}>🏆 Ranking de Performance</span>
            </div>
            {[...(mock.equipe_performance || [])].sort((a, b) => b.meta_pct - a.meta_pct).map((v, i) => {
              const medals = { 0: "🥇", 1: "🥈", 2: "🥉" };
              return (
                <div key={i} style={{ display: "flex", alignItems: "center", gap: 14, padding: "12px 22px", borderBottom: "1px solid rgba(0,0,0,0.04)" }}>
                  <span style={{ fontSize: 18, width: 24, textAlign: "center" }}>{medals[i] || `${i + 1}°`}</span>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 14, fontWeight: 700 }}>{v.vendedor}</div>
                    <div style={{ fontSize: 11, color: T.muted }}>{v.contatos} contatos · {fmtR(v.vendas)}</div>
                  </div>
                  <span className="num" style={{ fontSize: 18, fontWeight: 800, color: v.meta_pct >= 80 ? "#28cd41" : v.meta_pct >= 50 ? "#ff9500" : "#ff3b30" }}>{v.meta_pct}%</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── TAB CLIENTES ── */}
      {tab === "clientes" && (
        <div className="fade-up">
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 14, marginBottom: 20 }}>
            <KpiCard label="Total Clientes" value={clientes.length} sub="cadastrados" color="#4545F5" icon="👥" />
            <KpiCard label="Taxa de Recompra" value={`${mock.taxa_recompra || 0}%`} sub="com 2+ pedidos" color="#28cd41" icon="🔄" />
            <KpiCard label="Churn Mensal" value={`${mock.churn_mensal || 0}%`} sub="taxa de inativação" color="#ff3b30" icon="📉" />
            <KpiCard label="Novos Este Mês" value={(mock.clientes_novos_mensal || []).slice(-1)[0]?.novos || 0} sub="março" color="#8e44ef" icon="🆕" />
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 16 }}>
            {/* RFM Distribution */}
            <div className="ap-card" style={{ padding: "22px 24px" }}>
              <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 16 }}>Distribuição RFM</h3>
              <ResponsiveContainer width="100%" height={220}>
                <PieChart>
                  <Pie data={rfmPieData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80}
                    label={({ name, value }) => `${name}: ${value}`}>
                    {rfmPieData.map((r, i) => (
                      <Cell key={i} fill={RFM_CFG[r.key]?.c || PIE_COLORS[i % PIE_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>

            {/* Novos por mês */}
            <div className="ap-card" style={{ padding: "22px 24px" }}>
              <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 16 }}>Novos Clientes por Mês</h3>
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={mock.clientes_novos_mensal || []}>
                  <XAxis dataKey="mes" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip />
                  <Bar dataKey="novos" fill="#8e44ef" radius={[6, 6, 0, 0]} name="Novos" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Fidelidade distribution */}
          <div className="ap-card" style={{ padding: "22px 24px" }}>
            <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 16 }}>Clientes por Nível de Fidelidade</h3>
            <div style={{ display: "flex", gap: 16, alignItems: "center", justifyContent: "center" }}>
              <ResponsiveContainer width="50%" height={200}>
                <PieChart>
                  <Pie data={nivelPieData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={70}
                    label={({ name, value }) => `${name}: ${value}`}>
                    {nivelPieData.map((item, i) => (
                      <Cell key={i} fill={nivelColors[item.name] || PIE_COLORS[i]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {nivelPieData.map((item, i) => (
                  <div key={i} style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13 }}>
                    <span style={{ width: 12, height: 12, borderRadius: 3, background: nivelColors[item.name] || PIE_COLORS[i] }} />
                    <span style={{ fontWeight: 600 }}>{item.name}</span>
                    <span style={{ color: T.muted }}>{item.value} clientes</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── TAB EXPORTAR ── */}
      {tab === "exportar" && (
        <div className="fade-up">
          <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 16 }}>
            {[
              { title: "📊 Relatório de Vendas", desc: "Receita mensal, pedidos e ticket médio", pdfFn: () => {
                const rows = (mock.vendas_mensal || []).map(v => `<tr><td>${v.mes}</td><td>R$ ${v.receita.toLocaleString("pt-BR")}</td><td>${v.pedidos}</td></tr>`).join("");
                exportPDF("Relatório de Vendas", `<h2>Vendas Mensais</h2><table><thead><tr><th>Mês</th><th>Receita</th><th>Pedidos</th></tr></thead><tbody>${rows}</tbody></table>`);
              }, csvFn: () => exportCSV(mock.vendas_mensal || [], "vendas.csv", ["mes", "receita", "pedidos"]) },
              { title: "📢 Relatório de Campanhas", desc: "Performance de todas as campanhas", pdfFn: () => {
                const rows = (mock.campanhas_performance || []).map(c => `<tr><td>${c.nome}</td><td>${c.tipo}</td><td>${c.enviados}</td><td>${c.convertidos}</td><td>R$ ${c.receita.toLocaleString("pt-BR")}</td></tr>`).join("");
                exportPDF("Relatório de Campanhas", `<h2>Campanhas</h2><table><thead><tr><th>Nome</th><th>Tipo</th><th>Enviados</th><th>Convertidos</th><th>Receita</th></tr></thead><tbody>${rows}</tbody></table>`);
              }, csvFn: () => exportCSV(mock.campanhas_performance || [], "campanhas.csv", ["nome", "tipo", "enviados", "abertos", "convertidos", "receita"]) },
              { title: "👥 Relatório da Equipe", desc: "Performance por vendedor", pdfFn: () => {
                const rows = (mock.equipe_performance || []).map(v => `<tr><td>${v.vendedor}</td><td>${v.contatos}</td><td>${v.meta_pct}%</td><td>R$ ${v.vendas.toLocaleString("pt-BR")}</td></tr>`).join("");
                exportPDF("Relatório da Equipe", `<h2>Equipe</h2><table><thead><tr><th>Vendedor</th><th>Contatos</th><th>Meta %</th><th>Vendas</th></tr></thead><tbody>${rows}</tbody></table>`);
              }, csvFn: () => exportCSV(mock.equipe_performance || [], "equipe.csv", ["vendedor", "contatos", "meta_pct", "vendas", "ticket_medio"]) },
              { title: "🙍 Relatório de Clientes", desc: "Base completa de clientes com RFM", pdfFn: () => {
                const rows = clientes.slice(0, 20).map(c => `<tr><td>${c.nome}</td><td>${c.segmento_rfm}</td><td>R$ ${(c.receita_total || 0).toLocaleString("pt-BR")}</td><td>${c.total_pedidos || 0}</td></tr>`).join("");
                exportPDF("Relatório de Clientes", `<h2>Clientes</h2><table><thead><tr><th>Nome</th><th>Segmento</th><th>Receita</th><th>Pedidos</th></tr></thead><tbody>${rows}</tbody></table>`);
              }, csvFn: () => exportCSV(clientes.map(c => ({ nome: c.nome, email: c.email, segmento: c.segmento_rfm, receita: c.receita_total, pedidos: c.total_pedidos })), "clientes.csv", ["nome", "email", "segmento", "receita", "pedidos"]) },
            ].map((item, i) => (
              <div key={i} className="ap-card" style={{ padding: "22px 24px" }}>
                <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 4 }}>{item.title}</div>
                <div style={{ fontSize: 12, color: T.muted, marginBottom: 14 }}>{item.desc}</div>
                <div style={{ display: "flex", gap: 8 }}>
                  <button className="ap-btn ap-btn-primary ap-btn-sm" onClick={item.pdfFn} style={{ fontSize: 12 }}>📄 PDF</button>
                  <button className="ap-btn ap-btn-sm" onClick={item.csvFn} style={{ fontSize: 12 }}>📊 CSV</button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default MarcaRelatorios;
