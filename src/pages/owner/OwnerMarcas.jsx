import React, { useState } from "react";
import { T, STATUS_CFG, PLANO_CFG } from "../../lib/theme";
import { Avatar, Chip, Modal, FormRow, Lbl, SectionHeader, KpiCard } from "../../components/UI";
import { createRecord, updateRecord } from "../../lib/api";
import { computeMRR, PLANOS } from "../../utils/helpers";

function OwnerMarcas({ marcas, setMarcas, refetchMarcas }) {
  const [showModal, setShowModal] = useState(false);
  const [detail, setDetail] = useState(null);
  const [saving, setSaving] = useState(false);

  const handleCreateMarca = async (f) => {
    setSaving(true);
    try {
      const record = {
        nome: f.nome, segmento: f.seg, cnpj: f.cnpj, email: f.email,
        responsavel: f.resp, cidade: f.cidade, plano: f.plano,
        status: "trial", lojas: 1,
      };
      await createRecord("marcas", record);
      if (refetchMarcas) await refetchMarcas();
    } catch (e) {
      // Fallback to local state
      setMarcas((a) => [...a, { ...f, id: `m${Date.now()}`, lojas: 1, usuarios: 1, clientes: 0, mrr: PLANOS.find((p) => p.id === f.plano)?.preco || 0, status: "trial", created_at: "Agora" }]);
    }
    setSaving(false);
  };

  const handleStatusChange = async (id, newStatus) => {
    try {
      await updateRecord("marcas", id, { status: newStatus });
      if (refetchMarcas) await refetchMarcas();
    } catch (e) {
      setMarcas((a) => a.map((x) => x.id === id ? { ...x, status: newStatus } : x));
    }
  };

  function NovaMarca({ onClose, onSave }) {
    const [f, setF] = useState({ nome: "", seg: "", cnpj: "", email: "", resp: "", cidade: "", plano: "starter" });
    const s = (k, v) => setF((x) => ({ ...x, [k]: v }));
    return (
      <Modal title="Cadastrar Nova Marca" subtitle="Preencha os dados para criar o acesso" onClose={onClose} width={560}>
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <FormRow>
            <div><Lbl>Nome *</Lbl><input className="ap-inp" value={f.nome} onChange={(e) => s("nome", e.target.value)} placeholder="Ex: Minha Loja" /></div>
            <div><Lbl>Segmento *</Lbl><input className="ap-inp" value={f.seg} onChange={(e) => s("seg", e.target.value)} placeholder="Ex: Moda" /></div>
          </FormRow>
          <FormRow>
            <div><Lbl>CNPJ</Lbl><input className="ap-inp mono" value={f.cnpj} onChange={(e) => s("cnpj", e.target.value)} placeholder="00.000.000/0001-00" /></div>
            <div><Lbl>Email Admin *</Lbl><input className="ap-inp" type="email" value={f.email} onChange={(e) => s("email", e.target.value)} placeholder="admin@marca.com.br" /></div>
          </FormRow>
          <FormRow>
            <div><Lbl>Responsável *</Lbl><input className="ap-inp" value={f.resp} onChange={(e) => s("resp", e.target.value)} placeholder="Nome completo" /></div>
            <div><Lbl>Cidade</Lbl><input className="ap-inp" value={f.cidade} onChange={(e) => s("cidade", e.target.value)} placeholder="Cidade" /></div>
          </FormRow>
          <div>
            <label className="lbl">Plano</label>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 10 }}>
              {PLANOS.map((p) => (
                <div key={p.id} onClick={() => s("plano", p.id)} style={{ padding: 14, borderRadius: 14, border: `2px solid ${f.plano === p.id ? PLANO_CFG[p.id].c : "rgba(0,0,0,0.08)"}`, background: f.plano === p.id ? PLANO_CFG[p.id].bg : "#fff", cursor: "pointer", textAlign: "center", transition: "all .15s" }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: f.plano === p.id ? PLANO_CFG[p.id].c : T.sub }}>{p.label}</div>
                  <div className="num" style={{ fontSize: 20, fontWeight: 800, color: PLANO_CFG[p.id].c }}>R$ {p.preco}</div>
                  <div style={{ fontSize: 10, color: T.muted }}>/ mês</div>
                </div>
              ))}
            </div>
          </div>
          <button className="ap-btn ap-btn-primary" disabled={!f.nome || !f.email || !f.resp || saving} onClick={() => { if (f.nome && f.email && f.resp) { onSave(f); onClose(); } }}>
            {saving ? "Salvando…" : "Cadastrar Marca →"}
          </button>
        </div>
      </Modal>
    );
  }

  return (
    <div className="fade-up">
      <SectionHeader tag="Gestão" title="Marcas Cadastradas" action={<button className="ap-btn ap-btn-primary" onClick={() => setShowModal(true)}>+ Cadastrar Marca</button>} />

      <div style={{ display: "flex", gap: 8, marginBottom: 20 }}>
        {["ativo", "trial", "inativo"].map((s) => (
          <div key={s} style={{ background: STATUS_CFG[s].bg, border: `1px solid ${STATUS_CFG[s].c}22`, borderRadius: 20, padding: "6px 14px", fontSize: 12, fontWeight: 700, color: STATUS_CFG[s].c, display: "flex", alignItems: "center", gap: 6 }}>
            <span style={{ width: 7, height: 7, borderRadius: "50%", background: STATUS_CFG[s].c, display: "inline-block", animation: "pulse 2s infinite" }} />
            {STATUS_CFG[s].label} · {marcas.filter((m) => m.status === s).length}
          </div>
        ))}
      </div>

      <div className="ap-card" style={{ padding: 0, overflow: "hidden" }}>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ borderBottom: "1px solid rgba(0,0,0,0.07)", background: "rgba(0,0,0,0.02)" }}>
              {["Marca", "Segmento", "Plano", "Status", "Clientes", "MRR", "Ações"].map((h) => <th key={h} className="ap-th">{h}</th>)}
            </tr>
          </thead>
          <tbody>
            {marcas.map((m, i) => (
              <tr key={i} className="ap-tr">
                <td className="ap-td">
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <div style={{ width: 38, height: 38, borderRadius: 11, background: "rgba(0,0,0,0.06)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, fontWeight: 800, flexShrink: 0 }}>{m.nome[0]}</div>
                    <div><div style={{ fontSize: 14, fontWeight: 700 }}>{m.nome}</div><div style={{ fontSize: 11, color: T.muted }}>{m.responsavel || m.resp}</div></div>
                  </div>
                </td>
                <td className="ap-td"><span style={{ fontSize: 13, color: T.sub }}>{m.segmento || m.seg}</span></td>
                <td className="ap-td"><Chip label={PLANOS.find((p) => p.id === m.plano)?.label} c={PLANO_CFG[m.plano]?.c} bg={PLANO_CFG[m.plano]?.bg} /></td>
                <td className="ap-td"><Chip label={STATUS_CFG[m.status]?.label} c={STATUS_CFG[m.status]?.c} bg={STATUS_CFG[m.status]?.bg} /></td>
                <td className="ap-td"><span className="num" style={{ fontSize: 13 }}>{(m.clientes || 0).toLocaleString("pt-BR")}</span></td>
                <td className="ap-td"><span className="num" style={{ fontSize: 13, fontWeight: 700, color: "#4545F5" }}>R$ {m.mrr || PLANOS.find((p) => p.id === m.plano)?.preco || 0}</span></td>
                <td className="ap-td">
                  <div style={{ display: "flex", gap: 6 }}>
                    <button className="ap-btn ap-btn-secondary ap-btn-sm" onClick={() => setDetail(m)}>Ver</button>
                    {m.status === "ativo" && <button className="ap-btn ap-btn-danger ap-btn-sm" onClick={() => handleStatusChange(m.id, "inativo")}>Suspender</button>}
                    {m.status === "inativo" && <button className="ap-btn ap-btn-success ap-btn-sm" onClick={() => handleStatusChange(m.id, "ativo")}>Reativar</button>}
                    {m.status === "trial" && <button className="ap-btn ap-btn-success ap-btn-sm" onClick={() => handleStatusChange(m.id, "ativo")}>Ativar</button>}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {showModal && <NovaMarca onClose={() => setShowModal(false)} onSave={handleCreateMarca} />}
      {detail && (
        <Modal title={detail.nome} subtitle={detail.segmento || detail.seg} onClose={() => setDetail(null)} width={520}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            {[["Responsável", detail.responsavel || detail.resp], ["Email", detail.email], ["CNPJ", detail.cnpj], ["Cadastro", detail.created_at], ["Cidade/UF", `${detail.cidade || ""}/${detail.estado || ""}`], ["MRR", `R$ ${computeMRR(detail)}/mês`], ["Clientes", detail.clientes], ["Lojas", detail.lojas]].map(([k, v], i) => (
              <div key={i} style={{ background: "rgba(0,0,0,0.03)", borderRadius: 10, padding: "10px 14px" }}>
                <div style={{ fontSize: 10, color: T.muted, fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 4 }}>{k}</div>
                <div style={{ fontSize: 13, fontWeight: 600 }}>{v || "—"}</div>
              </div>
            ))}
          </div>
        </Modal>
      )}
    </div>
  );
}

export default OwnerMarcas;
