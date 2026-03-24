import React, { useMemo, useState } from "react";
import { T } from "../../lib/theme";
import { Avatar, SectionHeader } from "../../components/UI";
import { useToast } from "../../context/ToastContext";

function GestaoQRCodes({ user }) {
  const toast = useToast();
  const marcaId = user.marca_id || user.marcaId || "demo";
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("");

  const vendedores = useMemo(() => {
    return [];
  }, [marcaId]);

  const marca = null;
  const marcaDomain = marca?.email?.split("@")[1] || "minerbz.com.br";

  const totais = useMemo(() => {
    return vendedores.reduce((acc, v) => {
      const s = v.qr_stats || { escaneados: 0, vendas: 0, receita: 0 };
      acc.escaneados += s.escaneados;
      acc.vendas += s.vendas;
      acc.receita += s.receita;
      return acc;
    }, { escaneados: 0, vendas: 0, receita: 0 });
  }, [vendedores]);

  const handleGerarCodigo = (vendedor) => {
    toast(`Código gerado para ${vendedor.nome}! ✅`, "success");
  };

  return (
    <div className="fade-up">
      <SectionHeader tag="QR Codes" title="Gestão de QR Codes" />

      {/* Totais */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 14, marginBottom: 20 }}>
        <div className="ap-card" style={{ padding: "18px 22px", textAlign: "center" }}>
          <div className="num" style={{ fontSize: 28, fontWeight: 800, color: "var(--brand, #4545F5)" }}>{totais.escaneados}</div>
          <div style={{ fontSize: 12, color: "var(--muted, #aeaeb2)" }}>Total Escaneamentos</div>
        </div>
        <div className="ap-card" style={{ padding: "18px 22px", textAlign: "center" }}>
          <div className="num" style={{ fontSize: 28, fontWeight: 800, color: "#28cd41" }}>{totais.vendas}</div>
          <div style={{ fontSize: 12, color: "var(--muted, #aeaeb2)" }}>Total Vendas</div>
        </div>
        <div className="ap-card" style={{ padding: "18px 22px", textAlign: "center" }}>
          <div className="num" style={{ fontSize: 28, fontWeight: 800, color: "#8e44ef" }}>R$ {totais.receita.toLocaleString("pt-BR")}</div>
          <div style={{ fontSize: 12, color: "var(--muted, #aeaeb2)" }}>Receita via QR</div>
        </div>
      </div>

      {/* Filtros */}
      <div style={{ display: "flex", gap: 8, marginBottom: 14, flexWrap: "wrap" }}>
        <input className="ap-inp" placeholder="Buscar..." style={{ flex: 1, minWidth: 200, fontSize: 12, padding: "6px 12px" }} value={search} onChange={e => setSearch(e.target.value)} />
        <select className="ap-inp" style={{ fontSize: 12, padding: "6px 12px", minWidth: 130 }} value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
          <option value="">Todos os status</option>
          <option value="ativo">Com código (Ativo)</option>
          <option value="inativo">Sem código (Inativo)</option>
        </select>
      </div>

      {/* Table */}
      <div className="ap-card" style={{ padding: 0, overflow: "hidden" }}>
        <div style={{ padding: "16px 22px", borderBottom: "1px solid rgba(0,0,0,0.06)" }}>
          <span style={{ fontSize: 15, fontWeight: 700 }}>Vendedores & QR Codes</span>
        </div>

        {vendedores.filter(v => {
          const s = search.toLowerCase();
          if (s && !(v.nome || "").toLowerCase().includes(s)) return false;
          if (filterStatus === "ativo" && !v.codigo_vendedor) return false;
          if (filterStatus === "inativo" && v.codigo_vendedor) return false;
          return true;
        }).length === 0 ? (
          <div style={{ padding: 40, textAlign: "center", color: "var(--muted, #aeaeb2)" }}>
            Nenhum vendedor encontrado.
          </div>
        ) : (
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ borderBottom: "1px solid rgba(0,0,0,0.07)", background: "rgba(0,0,0,0.02)" }}>
                <th className="ap-th">Vendedor</th>
                <th className="ap-th">Código</th>
                <th className="ap-th" style={{ textAlign: "center" }}>Escaneamentos</th>
                <th className="ap-th" style={{ textAlign: "center" }}>Vendas</th>
                <th className="ap-th" style={{ textAlign: "right" }}>Receita</th>
                <th className="ap-th" style={{ textAlign: "center" }}>Ações</th>
              </tr>
            </thead>
            <tbody>
              {vendedores.filter(v => {
                const s = search.toLowerCase();
                if (s && !(v.nome || "").toLowerCase().includes(s)) return false;
                if (filterStatus === "ativo" && !v.codigo_vendedor) return false;
                if (filterStatus === "inativo" && v.codigo_vendedor) return false;
                return true;
              }).map(v => {
                const stats = v.qr_stats || { escaneados: 0, vendas: 0, receita: 0 };
                const temCodigo = !!v.codigo_vendedor;
                const link = temCodigo ? `https://${marcaDomain}/?ref=${v.codigo_vendedor}` : "";
                const qrThumb = temCodigo
                  ? `https://api.qrserver.com/v1/create-qr-code/?data=${encodeURIComponent(link)}&size=60x60`
                  : null;

                return (
                  <tr key={v.id} className="ap-tr">
                    <td className="ap-td">
                      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                        <Avatar nome={v.nome} size={32} />
                        <div>
                          <div style={{ fontSize: 14, fontWeight: 700 }}>{v.nome}</div>
                          <div style={{ fontSize: 11, color: "var(--muted, #aeaeb2)" }}>{v.loja || "—"}</div>
                        </div>
                      </div>
                    </td>
                    <td className="ap-td">
                      {temCodigo ? (
                        <span style={{ fontSize: 12, fontWeight: 700, fontFamily: "monospace", color: "var(--brand, #4545F5)" }}>
                          {v.codigo_vendedor}
                        </span>
                      ) : (
                        <span style={{ fontSize: 12, color: "var(--muted, #aeaeb2)" }}>Sem código</span>
                      )}
                    </td>
                    <td className="ap-td" style={{ textAlign: "center" }}>
                      <span className="num" style={{ fontSize: 14, fontWeight: 700 }}>{stats.escaneados}</span>
                    </td>
                    <td className="ap-td" style={{ textAlign: "center" }}>
                      <span className="num" style={{ fontSize: 14, fontWeight: 700, color: "#28cd41" }}>{stats.vendas}</span>
                    </td>
                    <td className="ap-td" style={{ textAlign: "right" }}>
                      <span className="num" style={{ fontSize: 14, fontWeight: 700 }}>R$ {stats.receita.toLocaleString("pt-BR")}</span>
                    </td>
                    <td className="ap-td" style={{ textAlign: "center" }}>
                      {temCodigo ? (
                        <div style={{ display: "flex", gap: 6, justifyContent: "center" }}>
                          {qrThumb && (
                            <img src={qrThumb} alt="QR" style={{ width: 32, height: 32, borderRadius: 4 }} />
                          )}
                          <button
                            className="ap-btn ap-btn-secondary ap-btn-sm"
                            onClick={() => {
                              navigator.clipboard.writeText(link);
                              toast(`Link de ${v.nome.split(" ")[0]} copiado!`, "success");
                            }}
                          >
                            📋
                          </button>
                        </div>
                      ) : (
                        <button className="ap-btn ap-btn-primary ap-btn-sm" onClick={() => handleGerarCodigo(v)}>
                          Gerar
                        </button>
                      )}
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

export default GestaoQRCodes;
