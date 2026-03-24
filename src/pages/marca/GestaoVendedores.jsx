import React, { useState, useEffect } from "react";
import { AreaChart, Area, ResponsiveContainer } from "recharts";
import { T, ROLE_CFG } from "../../lib/theme";
import { Avatar, Chip, SectionHeader, Modal, Lbl, ProgressBar } from "../../components/UI";
import { useToast } from "../../context/ToastContext";
import { fetchData } from "../../lib/api";

const STATUS_CFG = {
  ativo: { label: "Ativo", c: "#28cd41", bg: "#e9fbed", icon: "🟢" },
  ferias: { label: "Férias", c: "#4545F5", bg: "#eeeeff", icon: "🏖" },
  folga: { label: "Folga", c: "#ff9500", bg: "#fff3e0", icon: "😴" },
  atestado: { label: "Atestado", c: "#8e44ef", bg: "#f3ebff", icon: "🏥" },
  desligado: { label: "Desligado", c: "#ff3b30", bg: "#ffe5e3", icon: "❌" },
};

function GestaoVendedores({ user }) {
  const marcaId = user?.marca_id || user?.marcaId || "demo";
  const [usuarios, setUsuarios] = useState([]);
  const [editUser, setEditUser] = useState(null);
  const [showAusencia, setShowAusencia] = useState(null);
  const toast = useToast();

  const [clientes, setClientes] = useState([]);
  const [metas, setMetas] = useState([]);
  const [search, setSearch] = useState("");
  const [filterLoja, setFilterLoja] = useState("");

  useEffect(() => {
    Promise.all([
      fetchData("users", { limit: 200 }),
      fetchData("clientes", { limit: 5000 }),
      fetchData("metas", { limit: 200 }),
    ]).then(([u, c, m]) => {
      setUsuarios(u.data || []);
      setClientes(c.data || []);
      setMetas(m.data || []);
    }).catch(() => {});
  }, []);

  const getVendedorStats = (vendedor) => {
    const clis = clientes.filter(c => c.vendedor_id === vendedor.id);
    const metaVendas = metas.find(m => m.user_id === vendedor.id && m.tipo === "vendas_mensais");
    const metaContatos = metas.find(m => m.user_id === vendedor.id && m.tipo === "contatos_diarios");
    const pctMeta = metaVendas && metaVendas.valor_meta > 0
      ? Math.round((metaVendas.valor_atual / metaVendas.valor_meta) * 100) : 0;
    return {
      carteira: clis.length,
      contatosHoje: metaContatos?.valor_atual || 0,
      metaPct: pctMeta,
      vendasMes: vendedor.fat || 0,
    };
  };

  const handleStatusChange = (userId, novoStatus) => {
    setUsuarios(prev => prev.map(u =>
      u.id === userId ? { ...u, status_trabalho: novoStatus } : u
    ));
    const label = STATUS_CFG[novoStatus]?.label || novoStatus;
    toast(`Status atualizado para ${label}`, "success");
    setShowAusencia(null);
  };

  const totalAtivos = usuarios.filter(u => u.status_trabalho === "ativo").length;
  const totalAusentes = usuarios.filter(u => u.status_trabalho !== "ativo" && u.status_trabalho !== "desligado").length;

  return (
    <div className="fade-up">
      <SectionHeader tag="EQUIPE" title="Gestão de Vendedores" />

      {/* KPIs */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 14, marginBottom: 20 }}>
        <div className="ap-card" style={{ padding: "18px 22px", textAlign: "center" }}>
          <div style={{ fontSize: 28, fontWeight: 800, color: "#28cd41" }}>{totalAtivos}</div>
          <div style={{ fontSize: 12, color: T.muted }}>Ativos</div>
        </div>
        <div className="ap-card" style={{ padding: "18px 22px", textAlign: "center" }}>
          <div style={{ fontSize: 28, fontWeight: 800, color: "#ff9500" }}>{totalAusentes}</div>
          <div style={{ fontSize: 12, color: T.muted }}>Ausentes</div>
        </div>
        <div className="ap-card" style={{ padding: "18px 22px", textAlign: "center" }}>
          <div style={{ fontSize: 28, fontWeight: 800, color: "#4545F5" }}>{usuarios.length}</div>
          <div style={{ fontSize: 12, color: T.muted }}>Total na Equipe</div>
        </div>
      </div>

      {/* Filtros */}
      <div style={{ display: "flex", gap: 8, marginBottom: 14, flexWrap: "wrap" }}>
        <input className="ap-inp" placeholder="Buscar..." style={{ flex: 1, minWidth: 200, fontSize: 12, padding: "6px 12px" }} value={search} onChange={e => setSearch(e.target.value)} />
        <select className="ap-inp" style={{ fontSize: 12, padding: "6px 12px", minWidth: 140 }} value={filterLoja} onChange={e => setFilterLoja(e.target.value)}>
          <option value="">Todas as lojas</option>
          {[...new Set(usuarios.map(u => u.loja).filter(Boolean))].map(l => <option key={l} value={l}>{l}</option>)}
        </select>
      </div>

      {/* Vendedor cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(380px, 1fr))", gap: 16 }}>
        {usuarios.filter(v => {
          const s = search.toLowerCase();
          if (s && !(v.nome || "").toLowerCase().includes(s) && !(v.email || "").toLowerCase().includes(s)) return false;
          if (filterLoja && v.loja !== filterLoja) return false;
          return true;
        }).map(v => {
          const st = getVendedorStats(v);
          const statusCfg = STATUS_CFG[v.status_trabalho] || STATUS_CFG.ativo;
          const rd = ROLE_CFG[v.role] || ROLE_CFG.vendedor;
          const sparkData = (v.performance_30d || []).map((val, i) => ({ d: i, v: val }));

          return (
            <div key={v.id} className="ap-card" style={{ padding: "20px 24px" }}>
              {/* Header */}
              <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 14 }}>
                <Avatar nome={v.nome} size={42} />
                <div style={{ flex: 1 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <span style={{ fontSize: 15, fontWeight: 700 }}>{v.nome}</span>
                    <Chip label={rd.label} c={rd.c} bg={rd.bg} />
                  </div>
                  <div style={{ fontSize: 12, color: T.muted }}>{v.email} · {v.loja}</div>
                </div>
                <Chip label={`${statusCfg.icon} ${statusCfg.label}`} c={statusCfg.c} bg={statusCfg.bg} />
              </div>

              {/* KPIs inline */}
              <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 10, marginBottom: 14 }}>
                <div style={{ textAlign: "center" }}>
                  <div className="num" style={{ fontSize: 18, fontWeight: 800, color: "#4545F5" }}>{st.carteira}</div>
                  <div style={{ fontSize: 10, color: T.muted }}>Clientes</div>
                </div>
                <div style={{ textAlign: "center" }}>
                  <div className="num" style={{ fontSize: 18, fontWeight: 800, color: "#28cd41" }}>{st.contatosHoje}</div>
                  <div style={{ fontSize: 10, color: T.muted }}>Contatos Hoje</div>
                </div>
                <div style={{ textAlign: "center" }}>
                  <div className="num" style={{ fontSize: 18, fontWeight: 800, color: st.metaPct >= 80 ? "#28cd41" : st.metaPct >= 50 ? "#ff9500" : "#ff3b30" }}>{st.metaPct}%</div>
                  <div style={{ fontSize: 10, color: T.muted }}>Meta</div>
                </div>
                <div style={{ textAlign: "center" }}>
                  <div className="num" style={{ fontSize: 18, fontWeight: 800 }}>R$ {(st.vendasMes / 1000).toFixed(1)}k</div>
                  <div style={{ fontSize: 10, color: T.muted }}>Vendas Mês</div>
                </div>
              </div>

              {/* Meta progress */}
              <div style={{ marginBottom: 12 }}>
                <ProgressBar value={st.metaPct} max={100} height={6} />
              </div>

              {/* Sparkline */}
              {sparkData.length > 0 && (
                <div style={{ height: 40, marginBottom: 12 }}>
                  <ResponsiveContainer width="100%" height={40}>
                    <AreaChart data={sparkData}>
                      <defs>
                        <linearGradient id={`spark-${v.id}`} x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#4545F5" stopOpacity={0.3} />
                          <stop offset="95%" stopColor="#4545F5" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <Area type="monotone" dataKey="v" stroke="#4545F5" strokeWidth={1.5} fill={`url(#spark-${v.id})`} dot={false} />
                    </AreaChart>
                  </ResponsiveContainer>
                  <div style={{ fontSize: 10, color: T.muted, textAlign: "center" }}>Performance 30 dias</div>
                </div>
              )}

              {/* Actions */}
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                <button className="ap-btn ap-btn-sm" style={{ fontSize: 11 }} onClick={() => setEditUser(v)}>✏️ Editar</button>
                <button className="ap-btn ap-btn-sm" style={{ fontSize: 11 }} onClick={() => setShowAusencia(v)}>📋 Status</button>
                {v.status_trabalho !== "ativo" && v.status_trabalho !== "desligado" && (
                  <button className="ap-btn ap-btn-sm" style={{ fontSize: 11, color: "#ff9500" }}
                    onClick={() => toast("⚠️ Redistribuição de clientes disponível em breve", "warning")}>
                    🔄 Redistribuir
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Ausencia Modal */}
      {showAusencia && (
        <Modal title={`Status — ${showAusencia.nome}`} onClose={() => setShowAusencia(null)} width={400}>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {Object.entries(STATUS_CFG).map(([key, cfg]) => (
              <button key={key} className="ap-btn ap-btn-sm" onClick={() => handleStatusChange(showAusencia.id, key)}
                style={{
                  fontSize: 13, padding: "12px 16px", textAlign: "left",
                  display: "flex", alignItems: "center", gap: 10,
                  background: showAusencia.status_trabalho === key ? `${cfg.c}18` : undefined,
                  border: showAusencia.status_trabalho === key ? `2px solid ${cfg.c}` : undefined,
                }}>
                <span style={{ fontSize: 16 }}>{cfg.icon}</span>
                <span style={{ fontWeight: showAusencia.status_trabalho === key ? 700 : 400 }}>{cfg.label}</span>
              </button>
            ))}
          </div>
        </Modal>
      )}

      {/* Edit Modal */}
      {editUser && (
        <EditVendedorModal
          vendedor={editUser}
          onClose={() => setEditUser(null)}
          onSave={(updated) => {
            setUsuarios(prev => prev.map(u => u.id === updated.id ? { ...u, ...updated } : u));
            setEditUser(null);
            toast("Vendedor atualizado!", "success");
          }}
        />
      )}
    </div>
  );
}

function EditVendedorModal({ vendedor, onClose, onSave }) {
  const [nome, setNome] = useState(vendedor.nome);
  const [email, setEmail] = useState(vendedor.email);
  const [loja, setLoja] = useState(vendedor.loja);
  const [metaDiaria, setMetaDiaria] = useState(vendedor.meta_contatos_diarios || 0);

  return (
    <Modal title={`Editar — ${vendedor.nome}`} onClose={onClose} width={420}>
      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        <div><Lbl>Nome</Lbl><input className="ap-inp" value={nome} onChange={e => setNome(e.target.value)} /></div>
        <div><Lbl>Email</Lbl><input className="ap-inp" value={email} onChange={e => setEmail(e.target.value)} /></div>
        <div><Lbl>Loja</Lbl><input className="ap-inp" value={loja} onChange={e => setLoja(e.target.value)} /></div>
        <div><Lbl>Meta Diária de Contatos</Lbl><input className="ap-inp" type="number" value={metaDiaria} onChange={e => setMetaDiaria(+e.target.value)} /></div>
        <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
          <button className="ap-btn ap-btn-sm" onClick={onClose}>Cancelar</button>
          <button className="ap-btn ap-btn-primary ap-btn-sm" onClick={() => onSave({ id: vendedor.id, nome, email, loja, meta_contatos_diarios: metaDiaria })}>
            Salvar
          </button>
        </div>
      </div>
    </Modal>
  );
}

export default GestaoVendedores;
