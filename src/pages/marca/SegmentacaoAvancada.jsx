import React, { useState, useEffect } from "react";
import { T } from "../../lib/theme";
import { fetchData } from "../../lib/api";

const FILTER_DEF = [
  { key: "segmento_rfm", label: "Segmento RFM", type: "select", options: ["champion", "loyal", "potential", "at_risk", "hibernating", "new"] },
  { key: "receita_total", label: "Receita Total (R$)", type: "number" },
  { key: "total_pedidos", label: "Total de Pedidos", type: "number" },
  { key: "ultimo_contato_dias", label: "Último contato (há mais de X dias)", type: "number" },
  { key: "nivel_fidelidade", label: "Nível de Fidelidade", type: "select", options: ["Diamante", "Ouro", "Prata", "Bronze"] },
  { key: "cidade", label: "Cidade", type: "string" },
  { key: "tags", label: "Tags", type: "multiselect" },
  { key: "loja_id", label: "Loja", type: "select", options: [] }
];

const OP_MAP = {
  number: [ { val: ">", lbl: "Maior que" }, { val: "<", lbl: "Menor que" }, { val: "==", lbl: "Igual a" } ],
  string: [ { val: "contains", lbl: "Contém" }, { val: "==", lbl: "Exatamente" } ],
  select: [ { val: "==", lbl: "É" }, { val: "!=", lbl: "Não é" } ],
  multiselect: [ { val: "contains", lbl: "Contém tag" }, { val: "not_contains", lbl: "Não contém tag" } ]
};

function SegmentacaoAvancada({ user, setPage }) {
  const [clientes, setClientes] = useState([]);
  const [lojas, setLojas] = useState([]);
  const [savedSegments, setSavedSegments] = useState([]);
  const [view, setView] = useState("list");
  
  const [builderId, setBuilderId] = useState(null);
  const [builderName, setBuilderName] = useState("Novo Segmento");
  const [builderLogic, setBuilderLogic] = useState("AND");
  const [builderFilters, setBuilderFilters] = useState([]);
  const [previewCount, setPreviewCount] = useState(0);

  useEffect(() => {
    fetchData("clientes").then(res => setClientes(res.data || [])).catch(() => {});
    setLojas([]);

    const localSaved = localStorage.getItem("crm_segmentos_salvos");
    if (localSaved) {
      setSavedSegments(JSON.parse(localSaved));
    } else {
      const mock = [];
      setSavedSegments(mock);
      localStorage.setItem("crm_segmentos_salvos", JSON.stringify(mock));
    }
  }, []);

  useEffect(() => {
    if (view === "builder") {
      const filtered = clientes.filter(c => {
        if (builderFilters.length === 0) return true;
        const results = builderFilters.map(f => {
          if (!f.key || !f.op || f.value === "") return true;
          let cVal = c[f.key];
          if (f.key === "ultimo_contato_dias") {
            cVal = c.ultimo_contato ? Math.floor((new Date() - new Date(c.ultimo_contato)) / (1000 * 60 * 60 * 24)) : 9999;
          } else if (f.key === "tags") {
            cVal = c.tags || [];
          }
          const val = f.value;
          if (f.op === "==") return String(cVal).toLowerCase() === String(val).toLowerCase();
          if (f.op === "!=") return String(cVal).toLowerCase() !== String(val).toLowerCase();
          if (f.op === ">") return Number(cVal) > Number(val);
          if (f.op === "<") return Number(cVal) < Number(val);
          if (f.op === "contains") {
            if (Array.isArray(cVal)) return cVal.some(t => String(t).toLowerCase().includes(String(val).toLowerCase()));
            return String(cVal || "").toLowerCase().includes(String(val).toLowerCase());
          }
          if (f.op === "not_contains") {
            if (Array.isArray(cVal)) return !cVal.some(t => String(t).toLowerCase().includes(String(val).toLowerCase()));
            return !String(cVal || "").toLowerCase().includes(String(val).toLowerCase());
          }
          return true;
        });
        if (builderLogic === "AND") return results.every(r => r);
        if (builderLogic === "OR") return results.some(r => r);
        return true;
      });
      setPreviewCount(filtered.length);
    }
  }, [builderFilters, builderLogic, clientes, view]);

  const filtersCfg = FILTER_DEF.map(fd => {
    if (fd.key === "loja_id") return { ...fd, options: lojas.map(l => ({ val: l.id, lbl: l.nome })) };
    return fd;
  });

  const handleEdit = (seg) => {
    setBuilderId(seg.id);
    setBuilderName(seg.nome);
    setBuilderLogic(seg.logic || "AND");
    setBuilderFilters(seg.filtros || []);
    setView("builder");
  };

  const handleCreate = () => {
    setBuilderId(null);
    setBuilderName("Novo Segmento");
    setBuilderLogic("AND");
    setBuilderFilters([{ id: Date.now(), key: "segmento_rfm", op: "==", value: "champion" }]);
    setView("builder");
  };

  const handleSave = () => {
    const isNew = !builderId;
    const newId = isNew ? `seg_${Date.now()}` : builderId;
    const obj = { id: newId, nome: builderName, logic: builderLogic, filtros: builderFilters.filter(f => f.key && f.op && f.value !== ""), count: previewCount, updated_at: new Date().toISOString() };
    let newList;
    if (isNew) newList = [...savedSegments, obj];
    else newList = savedSegments.map(s => s.id === newId ? obj : s);
    setSavedSegments(newList);
    localStorage.setItem("crm_segmentos_salvos", JSON.stringify(newList));
    setView("list");
  };
  
  const handleDelete = (id) => {
    if (confirm("Tem certeza que deseja remover este segmento?")) {
      const newList = savedSegments.filter(s => s.id !== id);
      setSavedSegments(newList);
      localStorage.setItem("crm_segmentos_salvos", JSON.stringify(newList));
    }
  };

  const setFilterField = (idx, field, val) => {
    const nf = [...builderFilters];
    nf[idx] = { ...nf[idx], [field]: val };
    if (field === "key") {
      const fd = filtersCfg.find(f => f.key === val);
      if (fd) nf[idx].op = OP_MAP[fd.type][0].val;
      nf[idx].value = "";
    }
    setBuilderFilters(nf);
  };

  return (
    <div style={{ maxWidth: 1000, margin: "0 auto", paddingBottom: 60 }}>
      {view === "list" ? (
        <>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
            <div>
              <h2 style={{ fontSize: 22, fontWeight: 700, margin: 0 }}>Segmentação Avançada</h2>
              <div style={{ fontSize: 13, color: T.muted, marginTop: 4 }}>Crie e gerencie públicos-alvo específicos para suas campanhas.</div>
            </div>
            <button className="ap-btn ap-btn-primary" onClick={handleCreate}>+ Criar Segmento</button>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {savedSegments.length === 0 && (
              <div style={{ textAlign: "center", padding: 40, border: "1px dashed rgba(0,0,0,0.1)", borderRadius: 12, color: T.muted }}>
                Você ainda não tem segmentos salvos.<br/>Crie um para agrupar clientes!
              </div>
            )}
            {savedSegments.map(seg => (
              <div key={seg.id} className="ap-card" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div>
                  <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 4 }}>{seg.nome}</div>
                  <div style={{ fontSize: 12, color: T.sub, display: "flex", gap: 10 }}>
                    <span>{seg.filtros?.length} filtro(s)</span>
                    <span>•</span>
                    <span style={{ fontWeight: 600, color: "#4545F5" }}>{seg.count} clientes</span>
                  </div>
                </div>
                <div style={{ display: "flex", gap: 8 }}>
                  <button className="ap-btn ap-btn-sm" onClick={() => setPage("campanhas")} style={{ background: "rgba(69, 69, 245, 0.08)", color: "#4545F5", border: "none" }}>Usar em Campanha</button>
                  <button className="ap-btn ap-btn-secondary ap-btn-sm" onClick={() => handleEdit(seg)}>Editar</button>
                  <button className="ap-btn ap-btn-sm" onClick={() => handleDelete(seg.id)} style={{ color: "#ff3b30", background: "rgba(255, 59, 48, 0.08)", border: "none" }}>Remover</button>
                </div>
              </div>
            ))}
          </div>
        </>
      ) : (
        <>
          <div style={{ display: "flex", gap: 10, alignItems: "center", marginBottom: 20 }}>
            <button className="ap-btn ap-btn-sm" onClick={() => setView("list")}>← Voltar</button>
            <div style={{ fontSize: 13, color: T.muted }}>/</div>
            <div style={{ fontSize: 14, fontWeight: 600 }}>Criar/Editar Segmento</div>
          </div>
          <div style={{ display: "flex", gap: 24, alignItems: "flex-start" }}>
            <div style={{ flex: 1 }}>
              <div className="ap-card">
                <label className="lbl">Nome do Segmento</label>
                <input className="ap-inp" value={builderName} onChange={e => setBuilderName(e.target.value)} placeholder="Ex: Clientes VIP..." style={{ marginBottom: 24 }} />
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                  <label className="lbl" style={{ margin: 0 }}>Regras de Filtragem</label>
                  <select className="ap-inp" style={{ width: "auto", padding: "4px 8px", fontSize: 12 }} value={builderLogic} onChange={e => setBuilderLogic(e.target.value)}>
                    <option value="AND">Atender TODAS as regras (AND)</option>
                    <option value="OR">Atender QUALQUER regra (OR)</option>
                  </select>
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 10, padding: 14, background: "rgba(0,0,0,0.02)", borderRadius: 12, border: "1px solid rgba(0,0,0,0.05)" }}>
                  {builderFilters.length === 0 && <div style={{ fontSize: 12, color: T.muted, textAlign: "center", padding: 10 }}>Nenhum filtro adicionado</div>}
                  {builderFilters.map((flt, i) => {
                    const fDef = filtersCfg.find(f => f.key === flt.key) || filtersCfg[0];
                    const ops = OP_MAP[fDef.type] || OP_MAP.string;
                    return (
                      <div key={flt.id || i} style={{ display: "flex", gap: 8, alignItems: "center" }}>
                        <select className="ap-inp" style={{ flex: 2, fontSize: 13 }} value={flt.key} onChange={e => setFilterField(i, "key", e.target.value)}>
                          {filtersCfg.map(f => <option key={f.key} value={f.key}>{f.label}</option>)}
                        </select>
                        <select className="ap-inp" style={{ flex: 1.5, fontSize: 13 }} value={flt.op} onChange={e => setFilterField(i, "op", e.target.value)}>
                          {ops.map(o => <option key={o.val} value={o.val}>{o.lbl}</option>)}
                        </select>
                        <div style={{ flex: 2 }}>
                          {fDef.type === "select" ? (
                            <select className="ap-inp" style={{ fontSize: 13, width: "100%" }} value={flt.value} onChange={e => setFilterField(i, "value", e.target.value)}>
                              <option value="">Selecione...</option>
                              {fDef.options.map(opt => {
                                const val = typeof opt === "string" ? opt : opt.val;
                                const lbl = typeof opt === "string" ? opt : opt.lbl;
                                return <option key={val} value={val}>{lbl}</option>;
                              })}
                            </select>
                          ) : (
                            <input 
                              type={fDef.type === "number" ? "number" : "text"} 
                              className="ap-inp" style={{ fontSize: 13, width: "100%" }} 
                              placeholder={fDef.type === "number" ? "" : ""}
                              value={flt.value} onChange={e => setFilterField(i, "value", e.target.value)} 
                            />
                          )}
                        </div>
                        <button style={{ background: "none", border: "none", color: "#ff3b30", cursor: "pointer", fontSize: 16, padding: "0 8px" }} onClick={() => setBuilderFilters(builderFilters.filter((_, idx) => idx !== i))} title="Remover regra">×</button>
                      </div>
                    );
                  })}
                  <button className="ap-btn ap-btn-sm" style={{ alignSelf: "flex-start", marginTop: 4 }} onClick={() => setBuilderFilters([...builderFilters, { id: Date.now(), key: "receita_total", op: ">", value: "" }])}>+ Adicionar Regra</button>
                </div>
              </div>
            </div>
            <div style={{ width: 280, flexShrink: 0 }}>
              <div className="ap-card" style={{ position: "sticky", top: 24, textAlign: "center" }}>
                <div style={{ fontSize: 12, color: T.muted, fontWeight: 600, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 8 }}>Preview em tempo real</div>
                <div style={{ fontSize: 42, fontWeight: 800, color: "#4545F5", lineHeight: 1 }}>{previewCount}</div>
                <div style={{ fontSize: 13, fontWeight: 600, color: T.text, marginTop: 4, marginBottom: 20 }}>clientes encontrados</div>
                <button className="ap-btn ap-btn-primary" style={{ width: "100%" }} onClick={handleSave} disabled={!builderName.trim() || builderFilters.length === 0}>
                  Salvar Segmento
                </button>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

export default SegmentacaoAvancada;
