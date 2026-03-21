import { useMemo } from "react";
import { DB_FALLBACK } from "../data/fallback";

export function useContatosProativos(user, marcaId) {
  return useMemo(() => {
    const mId = marcaId || user?.marca_id || user?.marcaId || "demo";
    const clientes = DB_FALLBACK.clientes.filter(c => c.marca_id === mId);
    const now = new Date();
    const todayStr = now.toISOString().slice(0, 10);
    const meta = user?.meta_contatos_diarios || 20;

    const sugestoes = [];

    clientes.forEach(cli => {
      // Only for this vendor (if vendedor), or all (if gerente/admin)
      if (user.role === "vendedor" && cli.vendedor_id !== user.id) return;

      const motivos = [];
      const diasSemContato = cli.recencia_dias || 999;

      // Sem contato há muito tempo
      if (diasSemContato > 30) {
        motivos.push({ tipo: "sem_contato", texto: `🕐 Sem contato há ${diasSemContato} dias`, urgencia: Math.min(diasSemContato / 10, 10), cor: "#ff9500", bg: "#fff3e0" });
      }

      // Aniversário próximo (7 dias)
      if (cli.data_nascimento) {
        const aniv = new Date(cli.data_nascimento);
        const anivEsteAno = new Date(now.getFullYear(), aniv.getMonth(), aniv.getDate());
        const diffDias = Math.ceil((anivEsteAno - now) / (1000 * 60 * 60 * 24));
        if (diffDias >= 0 && diffDias <= 7) {
          motivos.push({ tipo: "aniversario", texto: diffDias === 0 ? "🎂 Aniversário HOJE!" : `🎂 Aniversário em ${diffDias} dia${diffDias > 1 ? "s" : ""}`, urgencia: 10 - diffDias, cor: "#8e44ef", bg: "#f3ebff" });
        }
      }

      // Em risco
      if (cli.segmento_rfm === "at_risk" || cli.segmento_rfm === "em_risco") {
        motivos.push({ tipo: "em_risco", texto: "⚠️ Cliente em risco", urgencia: 8, cor: "#ff3b30", bg: "#ffe5e3" });
      }

      // Hibernating
      if (cli.segmento_rfm === "hibernating") {
        motivos.push({ tipo: "inativo", texto: "💤 Cliente inativo", urgencia: 6, cor: "#aeaeb2", bg: "#f5f5f7" });
      }

      // Compra recente (pós-venda em até 7 dias)
      if (cli.ultimo_pedido_data) {
        const diffPedido = Math.ceil((now - new Date(cli.ultimo_pedido_data)) / (1000 * 60 * 60 * 24));
        if (diffPedido >= 1 && diffPedido <= 7) {
          motivos.push({ tipo: "pos_venda", texto: `🛒 Comprou há ${diffPedido} dia${diffPedido > 1 ? "s" : ""} — pós-venda`, urgencia: 7, cor: "#28cd41", bg: "#e9fbed" });
        }
      }

      // Alto valor
      if (cli.receita_total >= 5000) {
        motivos.push({ tipo: "alto_valor", texto: `💰 Alto valor — R$ ${cli.receita_total.toLocaleString("pt-BR")}`, urgencia: 5, cor: "#4545F5", bg: "#eeeeff" });
      }

      if (motivos.length > 0) {
        const maxUrgencia = Math.max(...motivos.map(m => m.urgencia));
        sugestoes.push({
          cliente: cli,
          motivos,
          urgenciaMax: maxUrgencia,
          motivoPrincipal: motivos.sort((a, b) => b.urgencia - a.urgencia)[0],
        });
      }
    });

    // Sort by urgency desc, then by revenue desc
    sugestoes.sort((a, b) => {
      if (b.urgenciaMax !== a.urgenciaMax) return b.urgenciaMax - a.urgenciaMax;
      return (b.cliente.receita_total || 0) - (a.cliente.receita_total || 0);
    });

    // Limit to daily goal
    return {
      sugestoes: sugestoes.slice(0, meta),
      total: sugestoes.length,
      meta,
    };
  }, [user, marcaId]);
}

export default useContatosProativos;
