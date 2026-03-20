import React, { useState, useEffect } from "react";
import { T } from "../../lib/theme";
import { Avatar, Modal, Chip } from "../../components/UI";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Cell } from "recharts";
import { DB_FALLBACK } from "../../data/fallback";

export default function GestaoLojas({ user, setPage }) {
  const [lojas, setLojas] = useState([]);
  const [usuarios, setUsuarios] = useState([]);
  const [clientes, setClientes] = useState([]);
  
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [formData, setFormData] = useState({ nome: "", cidade: "", estado: "", gerente_id: "", status: "ativo" });

  const loadData = () => {
    setLoading(true);
    // Using DB_FALLBACK directly for UI demonstration without requiring active mock API
    setLojas(DB_FALLBACK.lojas || []);
    setUsuarios(DB_FALLBACK.usuarios || []);
    setClientes(DB_FALLBACK.clientes || []);
    setLoading(false);
  };

  useEffect(() => {
    loadData();
  }, []);

  const gerentes = usuarios.filter(u => u.role === "gerente" || u.role === "dono");

  const handleSave = () => {
    if (!formData.nome) return;
    if (editingId) {
      setLojas(prev => prev.map(l => l.id === editingId ? { ...l, ...formData } : l));
    } else {
      setLojas(prev => [...prev, { id: "l_" + Date.now(), ...formData, marca_id: user?.marca_id || "prls", created_at: new Date().toISOString() }]);
    }
    setIsModalOpen(false);
  };

  const openEdit = (loja) => {
    setEditingId(loja.id);
    setFormData({ nome: loja.nome, cidade: loja.cidade, estado: loja.estado, gerente_id: loja.gerente_id || "", status: loja.status || "ativo" });
    setIsModalOpen(true);
  };

  const openCreate = () => {
    setEditingId(null);
    setFormData({ nome: "", cidade: "", estado: "", gerente_id: "", status: "ativo" });
    setIsModalOpen(true);
  };

  const dataLojas = lojas.map(l => {
    const vends = usuarios.filter(u => u.loja_id === l.id && u.role === "vendedor");
    const clis = clientes.filter(c => c.loja_id === l.id);
    
    const totalVendas = vends.reduce((acc, v) => acc + (Number(v.fat) || 0), 0);
    const qtdVendas = vends.reduce((acc, v) => acc + (Number(v.vendas) || 0), 0);
    const tkMedio = qtdVendas > 0 ? (totalVendas / qtdVendas) : 0;
    const clisAtivos = clis.filter(c => c.recencia_dias <= 30).length;

    return {
      ...l,
      vendedoresCount: vends.length,
      clientesCount: clis.length,
      clientesAtivosCount: clisAtivos,
      vendasMes: totalVendas,
      ticketMedio: tkMedio,
      gerenteObj: gerentes.find(g => g.id === l.gerente_id)
    };
  });

  const chartData = dataLojas.map(l => ({
    name: l.nome.replace("PRLS ", "").substring(0, 15),
    vendas: l.vendasMes,
    clientes: l.clientesCount
  }));

  if (loading) return <div style={{ padding: 40, textAlign: "center", color: T.muted }}>⏳ Carregando dados das lojas...</div>;

  return (
    <div style={{ maxWidth: 1100, margin: "0 auto", paddingBottom: 60 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
        <div>
          <h2 style={{ fontSize: 24, fontWeight: 800, margin: 0, letterSpacing: "-0.5px" }}>Gestão de Lojas</h2>
          <div style={{ fontSize: 14, color: T.muted, marginTop: 4 }}>Controle filiais, gerentes e acompanhe a performance.</div>
        </div>
        <button className="ap-btn ap-btn-primary" onClick={openCreate} style={{ padding: "8px 20px" }}>+ Adicionar Loja</button>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: 24, alignItems: "start" }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {dataLojas.map(loja => (
            <div key={loja.id} className="ap-card" style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                <div>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                    <h3 style={{ margin: 0, fontSize: 18 }}>{loja.nome}</h3>
                    {loja.status === "inativo" && <Chip label="Inativa" c="#ff3b30" bg="#ffe5e3" />}
                  </div>
                  <div style={{ fontSize: 13, color: T.sub }}>📍 {loja.cidade || "?"}, {loja.estado || "?"}</div>
                </div>
                <div style={{ display: "flex", gap: 8 }}>
                  <button className="ap-btn ap-btn-secondary ap-btn-sm" onClick={() => openEdit(loja)}>Editar</button>
                </div>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 12, background: "rgba(0,0,0,0.02)", padding: 14, borderRadius: 10, border: "1px solid rgba(0,0,0,0.04)" }}>
                <div>
                  <div style={{ fontSize: 11, color: T.muted, textTransform: "uppercase", fontWeight: 700 }}>Gerente</div>
                  <div style={{ fontSize: 13, fontWeight: 600, marginTop: 4, display: "flex", alignItems: "center", gap: 6 }}>
                    {loja.gerenteObj ? (
                      <><Avatar nome={loja.gerenteObj.nome} size={18} /> {loja.gerenteObj.nome.split(" ")[0]}</>
                    ) : "Não atribuído"}
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: 11, color: T.muted, textTransform: "uppercase", fontWeight: 700 }}>Vendedores</div>
                  <div style={{ fontSize: 16, fontWeight: 700, marginTop: 4 }}>{loja.vendedoresCount}</div>
                </div>
                <div>
                  <div style={{ fontSize: 11, color: T.muted, textTransform: "uppercase", fontWeight: 700 }}>Clientes</div>
                  <div style={{ fontSize: 16, fontWeight: 700, marginTop: 4 }}>
                    {loja.clientesCount} <span style={{ fontSize: 11, color: "#28cd41", fontWeight: 600 }}>({loja.clientesAtivosCount} ativos)</span>
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: 11, color: T.muted, textTransform: "uppercase", fontWeight: 700 }}>Vendas (Mês)</div>
                  <div style={{ fontSize: 16, fontWeight: 700, marginTop: 4, color: "#4545F5" }}>R$ {loja.vendasMes.toLocaleString("pt-BR")}</div>
                </div>
                <div>
                  <div style={{ fontSize: 11, color: T.muted, textTransform: "uppercase", fontWeight: 700 }}>Ticket Médio</div>
                  <div style={{ fontSize: 16, fontWeight: 700, marginTop: 4 }}>R$ {loja.ticketMedio.toLocaleString("pt-BR", { maximumFractionDigits: 0 })}</div>
                </div>
              </div>
            </div>
          ))}
          {dataLojas.length === 0 && <div style={{ padding: 40, textAlign: "center", border: "1px dashed #ccc", borderRadius: 12 }}>Nenhuma loja cadastrada.</div>}
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 24, position: "sticky", top: 24 }}>
          <div className="ap-card">
            <h4 style={{ margin: "0 0 16px 0", fontSize: 14, color: T.muted, textTransform: "uppercase", letterSpacing: 0.5 }}>📊 Vendas por Loja</h4>
            <div style={{ height: 220 }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} margin={{ top: 0, right: 0, bottom: 0, left: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(0,0,0,0.06)" />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: T.sub }} />
                  <Tooltip cursor={{ fill: "rgba(0,0,0,0.04)" }} contentStyle={{ borderRadius: 8, border: "none", boxShadow: "0 4px 12px rgba(0,0,0,0.1)" }} formatter={(val) => `R$ ${val.toLocaleString("pt-BR")}`} />
                  <Bar dataKey="vendas" radius={[4, 4, 0, 0]}>
                    {chartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={index === 0 ? "#4545F5" : index === 1 ? "#8e44ef" : "#00c7be"} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
          
          <div className="ap-card">
            <h4 style={{ margin: "0 0 16px 0", fontSize: 14, color: T.muted, textTransform: "uppercase", letterSpacing: 0.5 }}>👥 Clientes na Base</h4>
            <div style={{ height: 180 }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} layout="vertical" margin={{ top: 0, right: 20, bottom: 0, left: -20 }}>
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="rgba(0,0,0,0.06)" />
                  <XAxis type="number" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: T.sub }} />
                  <YAxis dataKey="name" type="category" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: T.text, fontWeight: 500 }} width={80} />
                  <Tooltip cursor={{ fill: "rgba(0,0,0,0.04)" }} contentStyle={{ borderRadius: 8, border: "none", boxShadow: "0 4px 12px rgba(0,0,0,0.1)" }} />
                  <Bar dataKey="clientes" radius={[0, 4, 4, 0]} barSize={20}>
                    {chartData.map((entry, index) => (
                      <Cell key={`cell2-${index}`} fill={index === 0 ? "#ff9500" : index === 1 ? "#ff2d55" : "#5856d6"} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      </div>

      {isModalOpen && (
        <Modal title={editingId ? "Editar Loja" : "Nova Loja"} onClose={() => setIsModalOpen(false)}>
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <div>
              <label className="lbl">Nome da Loja</label>
              <input className="ap-inp" value={formData.nome} onChange={e => setFormData({...formData, nome: e.target.value})} placeholder="Ex: Shopping Iguatemi" />
            </div>
            <div style={{ display: "flex", gap: 12 }}>
              <div style={{ flex: 2 }}>
                <label className="lbl">Cidade</label>
                <input className="ap-inp" value={formData.cidade} onChange={e => setFormData({...formData, cidade: e.target.value})} />
              </div>
              <div style={{ flex: 1 }}>
                <label className="lbl">Estado</label>
                <input className="ap-inp" value={formData.estado} onChange={e => setFormData({...formData, estado: e.target.value})} maxLength={2} placeholder="UF" />
              </div>
            </div>
            <div>
              <label className="lbl">Gerente Responsável</label>
              <select className="ap-inp" value={formData.gerente_id} onChange={e => setFormData({...formData, gerente_id: e.target.value})}>
                <option value="">Não atribuído</option>
                {gerentes.map(g => (
                  <option key={g.id} value={g.id}>{g.nome}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="lbl">Status</label>
              <select className="ap-inp" value={formData.status} onChange={e => setFormData({...formData, status: e.target.value})}>
                <option value="ativo">Ativa (Operando)</option>
                <option value="inativo">Inativa / Fechada</option>
              </select>
            </div>
            <div style={{ marginTop: 12, display: "flex", justifyContent: "flex-end", gap: 12 }}>
              <button className="ap-btn" onClick={() => setIsModalOpen(false)}>Cancelar</button>
              <button className="ap-btn ap-btn-primary" onClick={handleSave} disabled={!formData.nome}>Salvar Loja</button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
