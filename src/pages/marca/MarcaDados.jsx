import React, { useState } from "react";
import { T, RFM_CFG } from "../../lib/theme";
import { Chip, SectionHeader } from "../../components/UI";
import { useSupabaseQuery } from "../../lib/hooks";
import { importClientes } from "../../lib/api";

function MarcaDados({ user }) {
  const marcaId = user.marca_id || user.marcaId;
  const { data: dbClientes } = useSupabaseQuery("clientes", { eq: { marca_id: marcaId } });
  const { data: dbVendedores } = useSupabaseQuery("users", { eq: { marca_id: marcaId } });
  const { data: dbCampanhas } = useSupabaseQuery("campanhas", { eq: { marca_id: marcaId } });

  const clientes = dbClientes;
  const vendedores = dbVendedores.filter((u) => u.role === "vendedor");
  const campanhas = dbCampanhas;

  const [tab, setTab] = useState("exportar");
  const [importing, setImporting] = useState(false);
  const [importFile, setImportFile] = useState(null);
  const [importRows, setImportRows] = useState(null);
  const [importErr, setImportErr] = useState("");
  const [exported, setExported] = useState(null);
  const [exporting, setExporting] = useState(false);
  const [importSaved, setImportSaved] = useState(false);
  const [csvHeaders, setCsvHeaders] = useState([]);
  const [columnMap, setColumnMap] = useState({});
  const [importResult, setImportResult] = useState(null);
  const [dragOver, setDragOver] = useState(false);

  const toCSV = (rows, headers) => {
    const esc = (v) => { const s = String(v ?? ""); return s.includes(",") || s.includes('"') || s.includes("\n") ? `"${s.replace(/"/g, '""')}"` : s; };
    return [headers.join(","), ...rows.map((r) => headers.map((h) => esc(r[h])).join(","))].join("\n");
  };
  const downloadText = (text, filename) => {
    const blob = new Blob(["\uFEFF" + text], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = filename; a.click();
    URL.revokeObjectURL(url);
  };
  const loadSheetJS = () => new Promise((res, rej) => {
    if (window.XLSX) return res(window.XLSX);
    const s = document.createElement("script");
    s.src = "https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js";
    s.onload = () => res(window.XLSX);
    s.onerror = () => rej(new Error("Falha ao carregar SheetJS"));
    document.head.appendChild(s);
  });
  const downloadXLSX = async (data, sheetName, filename) => {
    const XLSX = await loadSheetJS();
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, sheetName);
    XLSX.writeFile(wb, filename);
  };

  const clienteRows = clientes.map((c) => ({
    nome: c.nome, email: c.email, telefone: c.telefone || c.tel || "",
    segmento: RFM_CFG[c.segmento_rfm || c.seg]?.label || c.segmento_rfm || c.seg || "",
    recencia: c.recencia_dias ?? c.rec ?? 0, pedidos: c.total_pedidos ?? c.pedidos ?? 0,
    receita: c.receita_total ?? c.receita ?? 0, vendedor: c.vendedor_nome || c.vend || "",
  }));
  const vendedorRows = vendedores.map((u) => ({
    nome: u.nome, email: u.email, loja: u.loja || "", meta: u.meta_mensal ?? u.meta ?? 0,
    faturamento: u.fat ?? 0, percentual: (u.meta_mensal || u.meta) > 0 ? Math.round((u.fat ?? 0) / (u.meta_mensal || u.meta || 1) * 100) + "%" : "—",
  }));
  const campanhaRows = campanhas.map((c) => ({
    nome: c.nome, canal: c.tipo || c.canal || "", status: c.status || "", enviados: c.enviados ?? 0, receita: c.receita ?? 0,
  }));

  const EXPORTS = [
    { id: "clientes", icon: "👥", label: "Base de Clientes", desc: "Todos os clientes com RFM, recência, receita e vendedor", rows: clienteRows, headers: ["nome", "email", "telefone", "segmento", "recencia", "pedidos", "receita", "vendedor"], count: clienteRows.length },
    { id: "vendedores", icon: "🏆", label: "Performance de Vendedores", desc: "Ranking, faturamento, metas e conversão", rows: vendedorRows, headers: ["nome", "email", "loja", "meta", "faturamento", "percentual"], count: vendedorRows.length },
    { id: "campanhas", icon: "📢", label: "Resultados de Campanhas", desc: "Canal, status, envios e receita gerada", rows: campanhaRows, headers: ["nome", "canal", "status", "enviados", "receita"], count: campanhaRows.length },
  ];

  const doExport = async (exp, format) => {
    setExporting(true);
    await new Promise((r) => setTimeout(r, 400));
    try {
      if (format === "csv") { downloadText(toCSV(exp.rows, exp.headers), `miner_${exp.id}_${new Date().toISOString().slice(0, 10)}.csv`); }
      else { await downloadXLSX(exp.rows, exp.label, `miner_${exp.id}_${new Date().toISOString().slice(0, 10)}.xlsx`); }
      setExported(exp.id + format);
      setTimeout(() => setExported(null), 3000);
    } catch (e) { console.error(e); }
    setExporting(false);
  };

  const parseSmartCSV = (text) => {
    // Strip UTF-8 BOM
    if (text.charCodeAt(0) === 0xFEFF) text = text.slice(1);
    const lines = text.split(/\r?\n/).filter(l => l.trim());
    if (lines.length < 2) return { headers: [], rows: [] };
    // Auto-detect delimiter
    const firstLine = lines[0];
    const semicolons = (firstLine.match(/;/g) || []).length;
    const commas = (firstLine.match(/,/g) || []).length;
    const delim = semicolons > commas ? ";" : ",";
    const parseLine = (line) => {
      const vals = []; let cur = "", inQ = false;
      for (let i = 0; i < line.length; i++) {
        const ch = line[i];
        if (ch === '"') { if (inQ && line[i + 1] === '"') { cur += '"'; i++; } else inQ = !inQ; }
        else if (ch === delim && !inQ) { vals.push(cur.trim()); cur = ""; }
        else cur += ch;
      }
      vals.push(cur.trim());
      return vals;
    };
    const headers = parseLine(lines[0]).map(h => h.replace(/^"|"$/g, "").trim());
    const rows = lines.slice(1).map(line => {
      const vals = parseLine(line);
      return Object.fromEntries(headers.map((h, i) => [h, (vals[i] || "").replace(/^"|"$/g, "").trim()]));
    }).filter(r => Object.values(r).some(v => v));
    return { headers, rows };
  };
  const CRM_FIELDS = [
    { value: "nome", label: "Nome" },
    { value: "email", label: "E-mail" },
    { value: "telefone", label: "Telefone" },
    { value: "tags", label: "Tags" },
    { value: "ignorar", label: "Ignorar" },
  ];
  const autoDetectMapping = (headers) => {
    const map = {};
    const rules = { nome: /^(nome|name|cliente|razao|razão)$/i, email: /^(email|e-mail|mail)$/i, telefone: /^(telefone|phone|tel|celular|fone|whatsapp)$/i, tags: /^(tags?|categoria|grupo|segmento)$/i };
    headers.forEach((h, i) => {
      for (const [field, rx] of Object.entries(rules)) { if (rx.test(h.trim())) { map[i] = field; break; } }
      if (!map[i]) map[i] = "ignorar";
    });
    return map;
  };
  const handleFile = async (file) => {
    if (!file) return;
    setImportFile(file); setImportErr(""); setImportRows(null); setCsvHeaders([]); setColumnMap({}); setImportResult(null);
    const ext = file.name.split(".").pop().toLowerCase();
    if (ext === "csv") {
      try {
        const { headers, rows } = parseSmartCSV(await file.text());
        if (!rows.length) { setImportErr("Arquivo vazio ou sem dados válidos."); return; }
        setCsvHeaders(headers);
        setColumnMap(autoDetectMapping(headers));
        setImportRows(rows);
      } catch { setImportErr("Erro ao ler CSV."); }
    } else if (ext === "xlsx" || ext === "xls") {
      try {
        const XLSX = await loadSheetJS();
        const wb = XLSX.read(await file.arrayBuffer(), { type: "array" });
        const rows = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]]);
        if (!rows.length) { setImportErr("Arquivo vazio."); return; }
        const headers = Object.keys(rows[0]);
        setCsvHeaders(headers);
        setColumnMap(autoDetectMapping(headers));
        setImportRows(rows);
      } catch { setImportErr("Erro ao ler XLSX."); }
    } else { setImportErr("Formato não suportado. Use .csv ou .xlsx"); }
  };
  const [importProgress, setImportProgress] = useState(0);
  const doImport = async () => {
    if (!importRows || importRows.length === 0) return;
    setImporting(true); setImportProgress(10); setImportResult(null);
    // Build mapped array
    const mapped = importRows.map(row => {
      const out = {};
      csvHeaders.forEach((h, i) => {
        const field = columnMap[i];
        if (field && field !== "ignorar") out[field] = row[h] || "";
      });
      return out;
    });
    try {
      setImportProgress(30);
      const result = await importClientes(mapped);
      setImportProgress(100);
      setImportResult(result);
    } catch (e) {
      setImportErr(e.message || "Erro ao importar.");
    }
    setImporting(false);
  };

  return (
    <div className="fade-up">
      <SectionHeader tag="Gestão de Dados" title="Dados & Export" />
      <div className="seg" style={{ marginBottom: 24 }}>
        {[{ k: "exportar", l: "Exportar Dados" }, { k: "importar", l: "Importar Dados" }, { k: "historico", l: "Histórico" }].map((t) => (
          <button key={t.k} className={`seg-btn ${tab === t.k ? "on" : ""}`} onClick={() => setTab(t.k)}>{t.l}</button>
        ))}
      </div>

      {tab === "exportar" && (
        <div>
          <div style={{ background: "#eeeeff", border: "1px solid #4545F522", borderRadius: 14, padding: "14px 18px", marginBottom: 20, fontSize: 13, color: T.sub }}>
            💡 Todos os exports incluem <b>BOM UTF-8</b> para compatibilidade com Excel e Google Sheets.
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
            {EXPORTS.map((exp, i) => (
              <div key={i} className="ap-card" style={{ padding: 22 }}>
                <div style={{ display: "flex", gap: 14, marginBottom: 16 }}>
                  <div style={{ width: 44, height: 44, borderRadius: 12, background: "#eeeeff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22, flexShrink: 0 }}>{exp.icon}</div>
                  <div>
                    <div style={{ fontSize: 15, fontWeight: 700 }}>{exp.label}</div>
                    <div style={{ fontSize: 12, color: T.muted, marginTop: 3 }}>{exp.desc}</div>
                    <div style={{ fontSize: 11, color: "#4545F5", fontWeight: 600, marginTop: 5 }}>{exp.count} registros</div>
                  </div>
                </div>
                <div style={{ display: "flex", gap: 8 }}>
                  <button className="ap-btn ap-btn-secondary ap-btn-sm" style={{ flex: 1 }} disabled={exporting} onClick={() => doExport(exp, "csv")}>{exported === exp.id + "csv" ? "✓ Baixado!" : "📄 CSV"}</button>
                  <button className="ap-btn ap-btn-primary ap-btn-sm" style={{ flex: 1 }} disabled={exporting} onClick={() => doExport(exp, "xlsx")}>{exported === exp.id + "xlsx" ? "✓ Baixado!" : "📊 XLSX"}</button>
                </div>
              </div>
            ))}
          </div>
          <div className="ap-card" style={{ marginTop: 14, padding: 22, display: "flex", alignItems: "center", gap: 16 }}>
            <div style={{ fontSize: 28 }}>📦</div>
            <div style={{ flex: 1 }}><div style={{ fontSize: 15, fontWeight: 700 }}>Export Completo</div><div style={{ fontSize: 12, color: T.muted }}>Todos os dados em um único arquivo XLSX</div></div>
            <button className="ap-btn ap-btn-primary" disabled={exporting} onClick={async () => {
              setExporting(true);
              try { const XLSX = await loadSheetJS(); const wb = XLSX.utils.book_new(); EXPORTS.forEach((exp) => { XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(exp.rows), exp.label.slice(0, 31)); }); XLSX.writeFile(wb, `miner_export_completo_${new Date().toISOString().slice(0, 10)}.xlsx`); } catch (e) { console.error(e); }
              setExporting(false);
            }}>{exporting ? "Gerando…" : "📦 Baixar Tudo (.xlsx)"}</button>
          </div>
        </div>
      )}

      {tab === "importar" && (
        <div>
          {/* Upload + Templates row */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20, marginBottom: 20 }}>
            <div className="ap-card" style={{ padding: 0, overflow: "hidden" }}>
              <div style={{ padding: "20px 22px", borderBottom: "1px solid rgba(0,0,0,0.07)" }}><div style={{ fontSize: 15, fontWeight: 700 }}>Importar Clientes via CSV</div><div style={{ fontSize: 12, color: T.muted, marginTop: 3 }}>Arraste um arquivo .csv ou selecione manualmente</div></div>
              <div style={{ padding: 22 }}>
                <label htmlFor="import-file-csv" style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 10, padding: "40px 20px", borderRadius: 18, cursor: "pointer", border: dragOver ? "2px solid rgba(69,69,245,.5)" : "2px dashed rgba(69,69,245,.3)", background: dragOver ? "rgba(69,69,245,0.06)" : "rgba(69,69,245,0.03)", transition: "all .2s" }}
                  onDragOver={(e) => { e.preventDefault(); setDragOver(true); }} onDragLeave={() => setDragOver(false)} onDrop={(e) => { e.preventDefault(); setDragOver(false); handleFile(e.dataTransfer.files[0]); }}>
                  <div style={{ fontSize: 40 }}>{importFile ? "📄" : "📂"}</div>
                  {importFile ? (<><div style={{ fontSize: 14, fontWeight: 700, color: "#4545F5" }}>{importFile.name}</div><div style={{ fontSize: 12, color: T.muted }}>{(importFile.size / 1024).toFixed(1)} KB</div></>) : (<><div style={{ fontSize: 14, fontWeight: 600, color: T.sub }}>Arraste o arquivo aqui</div><div style={{ fontSize: 12, color: T.muted, marginTop: 2 }}>ou clique para selecionar</div><div style={{ fontSize: 11, color: T.muted, marginTop: 6 }}>.csv · .xlsx · .xls</div></>)}
                </label>
                <input id="import-file-csv" type="file" accept=".csv,.xlsx,.xls" style={{ display: "none" }} onChange={(e) => handleFile(e.target.files[0])} />
                {importFile && !importResult && <button className="ap-btn ap-btn-secondary ap-btn-sm" style={{ marginTop: 12, width: "100%" }} onClick={() => { setImportFile(null); setImportRows(null); setCsvHeaders([]); setColumnMap({}); setImportResult(null); setImportErr(""); }}>✕ Limpar arquivo</button>}
                {importErr && <div style={{ marginTop: 12, background: "#ffe5e3", border: "1px solid #ff3b3030", borderRadius: 10, padding: "10px 14px", fontSize: 12, color: "#ff3b30" }}>⚠️ {importErr}</div>}
              </div>
            </div>
            <div className="ap-card" style={{ padding: 22 }}>
              <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 14 }}>Templates de Importação</div>
              {[{ icon: "👥", label: "Clientes", cols: ["nome", "email", "telefone", "tags"] }, { icon: "💰", label: "Vendas", cols: ["data", "cliente_email", "valor", "canal", "vendedor"] }, { icon: "🏷", label: "Produtos", cols: ["sku", "nome", "preco", "categoria", "estoque"] }].map((tmpl, i) => (
                <div key={i} style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 0", borderBottom: i < 2 ? "1px solid rgba(0,0,0,0.05)" : "none" }}>
                  <span style={{ fontSize: 18 }}>{tmpl.icon}</span>
                  <div style={{ flex: 1 }}><div style={{ fontSize: 13, fontWeight: 600 }}>{tmpl.label}</div><div style={{ fontSize: 10, color: T.muted, fontFamily: "var(--mono)" }}>{tmpl.cols.join(" · ")}</div></div>
                  <button className="ap-btn ap-btn-secondary ap-btn-sm" onClick={() => downloadText(toCSV([], tmpl.cols), `miner_template_${tmpl.label.toLowerCase()}.csv`)}>📄 Template</button>
                </div>
              ))}
              <div style={{ marginTop: 16, padding: "12px 14px", background: "#eeeeff", borderRadius: 10, fontSize: 12, color: T.sub }}>
                💡 Dica: o sistema detecta automaticamente delimitadores (vírgula ou ponto-e-vírgula) e mapeia colunas pelo nome do cabeçalho.
              </div>
            </div>
          </div>

          {/* Column Mapping + Preview */}
          {importRows && importRows.length > 0 && !importResult && (
            <div className="ap-card" style={{ padding: 0, overflow: "hidden", marginBottom: 16 }}>
              <div style={{ padding: "16px 22px", borderBottom: "1px solid rgba(0,0,0,0.07)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div><span style={{ fontSize: 15, fontWeight: 700 }}>Mapeamento de Colunas</span><span style={{ fontSize: 12, color: T.muted, marginLeft: 10 }}>{importRows.length} registros detectados</span></div>
                <button className="ap-btn ap-btn-primary" disabled={importing || !Object.values(columnMap).includes("nome")} onClick={doImport}>
                  {importing ? `Importando… ${importProgress}%` : `✓ Importar ${importRows.length} Clientes`}
                </button>
              </div>
              {!Object.values(columnMap).includes("nome") && (
                <div style={{ padding: "10px 22px", background: "#fff3cd", fontSize: 12, color: "#856404" }}>⚠️ Mapeie pelo menos a coluna <b>Nome</b> para continuar.</div>
              )}
              {importing && <div style={{ height: 3, background: "#eee" }}><div style={{ height: 3, background: "#4545F5", width: `${importProgress}%`, transition: "width .3s", borderRadius: 2 }} /></div>}
              <div style={{ overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse" }}>
                  <thead>
                    <tr style={{ background: "rgba(0,0,0,0.02)", borderBottom: "1px solid rgba(0,0,0,0.07)" }}>
                      {csvHeaders.map((h, i) => (
                        <th key={i} className="ap-th" style={{ verticalAlign: "top", minWidth: 120 }}>
                          <div style={{ fontSize: 11, color: T.muted, marginBottom: 4 }}>{h}</div>
                          <select value={columnMap[i] || "ignorar"} onChange={(e) => setColumnMap(prev => ({ ...prev, [i]: e.target.value }))} style={{ width: "100%", padding: "5px 8px", borderRadius: 8, border: "1px solid rgba(0,0,0,0.12)", fontSize: 12, background: columnMap[i] && columnMap[i] !== "ignorar" ? "#eeeeff" : "#fff", color: columnMap[i] && columnMap[i] !== "ignorar" ? "#4545F5" : T.sub, fontWeight: 600 }}>
                            {CRM_FIELDS.map(f => <option key={f.value} value={f.value}>{f.label}</option>)}
                          </select>
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {importRows.slice(0, 5).map((row, i) => (
                      <tr key={i} className="ap-tr">{csvHeaders.map((h, j) => <td key={j} className="ap-td"><span style={{ fontSize: 13 }}>{String(row[h] || "")}</span></td>)}</tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {importRows.length > 5 && <div style={{ padding: "12px 22px", background: "rgba(0,0,0,0.02)", fontSize: 12, color: T.muted, textAlign: "center" }}>+ {importRows.length - 5} registros adicionais</div>}
            </div>
          )}

          {/* Import Results */}
          {importResult && (
            <div className="ap-card" style={{ padding: 22, marginBottom: 16 }}>
              <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 16 }}>Resultado da Importação</div>
              <div className="kpi-grid-4" style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12, marginBottom: 16 }}>
                {[
                  { label: "Total", value: importResult.total, icon: "📋", bg: "#f5f5ff" },
                  { label: "Importados", value: importResult.imported, icon: "✅", bg: "#e9fbed" },
                  { label: "Ignorados", value: importResult.skipped, icon: "⏭", bg: "#fff8e1" },
                  { label: "Erros", value: importResult.errors?.length || 0, icon: "❌", bg: "#ffe5e3" },
                ].map((s, i) => (
                  <div key={i} style={{ background: s.bg, borderRadius: 14, padding: "16px 18px", textAlign: "center" }}>
                    <div style={{ fontSize: 22, marginBottom: 4 }}>{s.icon}</div>
                    <div className="num" style={{ fontSize: 24, fontWeight: 800 }}>{s.value}</div>
                    <div style={{ fontSize: 11, color: T.muted, marginTop: 2 }}>{s.label}</div>
                  </div>
                ))}
              </div>
              {importResult.errors && importResult.errors.length > 0 && (
                <div style={{ background: "#ffe5e3", borderRadius: 10, padding: "12px 16px" }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: "#ff3b30", marginBottom: 8 }}>Erros encontrados:</div>
                  {importResult.errors.map((e, i) => (
                    <div key={i} style={{ fontSize: 12, color: "#cc2200", padding: "3px 0" }}>• <b>{e.nome}</b>: {e.error}</div>
                  ))}
                </div>
              )}
              <button className="ap-btn ap-btn-primary" style={{ marginTop: 16 }} onClick={() => { setImportFile(null); setImportRows(null); setCsvHeaders([]); setColumnMap({}); setImportResult(null); setImportErr(""); }}>Nova Importação</button>
            </div>
          )}
        </div>
      )}

      {tab === "historico" && (
        <div className="ap-card" style={{ padding: 0, overflow: "hidden" }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead><tr style={{ borderBottom: "1px solid rgba(0,0,0,0.07)", background: "rgba(0,0,0,0.02)" }}>{["Operação", "Arquivo", "Registros", "Usuário", "Data", "Status"].map((h) => <th key={h} className="ap-th">{h}</th>)}</tr></thead>
            <tbody>
              {[{ op: "Export", arq: "miner_clientes_2026-02-15.csv", reg: 1247, user: "Joao Souza", dt: "15 Fev 2026", st: "ok" }, { op: "Import", arq: "clientes_novo_lote.xlsx", reg: 48, user: "Joao Souza", dt: "12 Fev 2026", st: "ok" }, { op: "Export", arq: "miner_vendedores_2026-02-01.xlsx", reg: 4, user: "Fernanda G.", dt: "01 Fev 2026", st: "ok" }].map((r, i) => (
                <tr key={i} className="ap-tr">
                  <td className="ap-td"><Chip label={r.op} c={r.op === "Export" ? "#4545F5" : "#28cd41"} bg={r.op === "Export" ? "#eeeeff" : "#e9fbed"} /></td>
                  <td className="ap-td"><code style={{ fontSize: 12, fontFamily: "var(--mono)" }}>{r.arq}</code></td>
                  <td className="ap-td"><span className="num" style={{ fontSize: 13, fontWeight: 700 }}>{r.reg}</span></td>
                  <td className="ap-td"><span style={{ fontSize: 13, color: T.sub }}>{r.user}</span></td>
                  <td className="ap-td"><span style={{ fontSize: 12, color: T.muted }}>{r.dt}</span></td>
                  <td className="ap-td"><Chip label={r.st === "ok" ? "Sucesso" : "Falhou"} c={r.st === "ok" ? "#28cd41" : "#ff3b30"} bg={r.st === "ok" ? "#e9fbed" : "#ffe5e3"} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}


export default MarcaDados;
