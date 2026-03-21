import React, { useMemo } from "react";
import { T } from "../../lib/theme";
import { Avatar } from "../../components/UI";
import { DB_FALLBACK } from "../../data/fallback";

const MEDALS = { 1: "🥇", 2: "🥈", 3: "🥉" };

function RankingLoja({ user }) {
  const ranking = useMemo(() => {
    const vendedores = DB_FALLBACK.usuarios.filter(u =>
      u.role === "vendedor" && u.marca_id === (user.marca_id || user.marcaId || "demo")
    );

    return vendedores.map(v => {
      const metaVendas = DB_FALLBACK.metas.find(m => m.user_id === v.id && m.tipo === "vendas_mensais");
      const metaContatos = DB_FALLBACK.metas.find(m => m.user_id === v.id && m.tipo === "contatos_diarios");
      const pctVendas = metaVendas && metaVendas.valor_meta > 0
        ? Math.round((metaVendas.valor_atual / metaVendas.valor_meta) * 100)
        : 0;
      const pctContatos = metaContatos && metaContatos.valor_meta > 0
        ? Math.round((metaContatos.valor_atual / metaContatos.valor_meta) * 100)
        : 0;

      return {
        ...v,
        pctVendas,
        pctContatos,
        pctGeral: Math.round((pctVendas + pctContatos) / 2),
        metaVendas,
        metaContatos,
      };
    }).sort((a, b) => b.pctGeral - a.pctGeral);
  }, [user]);

  return (
    <div>
      {ranking.length === 0 ? (
        <div className="ap-card" style={{ padding: 40, textAlign: "center", color: "var(--muted, #aeaeb2)" }}>
          Nenhum vendedor encontrado.
        </div>
      ) : (
        <div className="ap-card" style={{ padding: 0, overflow: "hidden" }}>
          <div style={{ padding: "16px 22px", borderBottom: "1px solid rgba(0,0,0,0.06)" }}>
            <span style={{ fontSize: 15, fontWeight: 700 }}>🏆 Ranking de Vendedores</span>
          </div>
          {ranking.map((v, i) => {
            const pos = i + 1;
            const isMe = v.id === user.id;
            return (
              <div
                key={v.id}
                style={{
                  display: "flex", alignItems: "center", gap: 14,
                  padding: "14px 22px",
                  borderBottom: i < ranking.length - 1 ? "1px solid rgba(0,0,0,0.05)" : "none",
                  background: isMe ? "var(--brand-light, rgba(69,69,245,0.06))" : "transparent",
                  transition: "background .15s",
                }}
              >
                <span className="num" style={{
                  fontSize: pos <= 3 ? 22 : 14,
                  fontWeight: 800,
                  width: 32, textAlign: "center",
                  color: pos <= 3 ? "#ff9500" : "var(--muted, #aeaeb2)",
                }}>
                  {MEDALS[pos] || `${pos}°`}
                </span>

                <Avatar nome={v.nome} size={36} />

                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    <span style={{ fontSize: 14, fontWeight: 700, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                      {v.nome}
                    </span>
                    {isMe && (
                      <span style={{
                        fontSize: 10, fontWeight: 700, color: "var(--brand, #4545F5)",
                        background: "var(--brand-light, rgba(69,69,245,0.1))",
                        padding: "2px 8px", borderRadius: 10,
                      }}>
                        Você
                      </span>
                    )}
                  </div>
                  <div style={{ fontSize: 11, color: "var(--muted, #aeaeb2)" }}>
                    {v.loja || "Sem loja"} · {v.metaVendas ? `R$ ${Number(v.metaVendas.valor_atual).toLocaleString("pt-BR")}` : "—"}
                  </div>
                </div>

                {/* Mini progress bar */}
                <div style={{ width: 120 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                    <span style={{ fontSize: 10, color: "var(--muted, #aeaeb2)" }}>Meta</span>
                    <span className="num" style={{ fontSize: 11, fontWeight: 700, color: v.pctGeral >= 100 ? "#28cd41" : "var(--brand, #4545F5)" }}>
                      {v.pctGeral}%
                    </span>
                  </div>
                  <div style={{
                    width: "100%", height: 6, borderRadius: 3,
                    background: "var(--input-bg, rgba(0,0,0,0.04))",
                    overflow: "hidden",
                  }}>
                    <div style={{
                      width: `${Math.min(100, v.pctGeral)}%`,
                      height: "100%", borderRadius: 3,
                      background: v.pctGeral >= 100
                        ? "linear-gradient(90deg, #28cd41, #20b838)"
                        : "linear-gradient(90deg, var(--brand, #4545F5), #8e44ef)",
                      transition: "width 0.8s ease",
                    }} />
                  </div>
                </div>

                {v.metaContatos?.streak > 0 && (
                  <span style={{ fontSize: 12, color: "#ff9500" }} title={`${v.metaContatos.streak} dias de streak`}>
                    🔥{v.metaContatos.streak}
                  </span>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default RankingLoja;
