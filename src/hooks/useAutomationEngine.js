// ── Automation Engine Hook ────────────────────────────────────────────────────
// Client-side engine that evaluates automations against clients and simulates execution

import { useState, useCallback, useRef } from "react";
import { useToast } from "../context/ToastContext";

const TRIGGER_EVALUATORS = {
  tempo_sem_compra: (client, config) => {
    const dias = config?.dias || 30;
    return (client.recencia_dias || 999) >= dias;
  },
  carrinho_abandonado: (client) => {
    return client.segmento_rfm === "at_risk" || client.segmento_rfm === "hibernating";
  },
  pos_venda: (client) => {
    return (client.recencia_dias || 999) <= 7 && (client.total_pedidos || 0) >= 1;
  },
  aniversario: (client) => {
    if (!client.data_nascimento) return false;
    const hoje = new Date();
    const nasc = new Date(client.data_nascimento);
    return hoje.getMonth() === nasc.getMonth() && hoje.getDate() === nasc.getDate();
  },
  segmento_rfm: (client, config) => {
    const segmentos = config?.segmentos || [];
    return segmentos.includes(client.segmento_rfm);
  },
  data_especial: () => false,
  pedido_criado: (client) => (client.total_pedidos || 0) >= 1,
  novo_cliente: (client) => (client.recencia_dias || 999) <= 3 && (client.total_pedidos || 0) <= 1,
  recorrente: (client) => (client.total_pedidos || 0) >= 3,
  mudanca_rfm: () => true,
  reativacao: (client) => (client.recencia_dias || 999) >= 60,
};

export default function useAutomationEngine({ automacoes = [], clientes = [], execucoes = [] }) {
  const toast = useToast();
  const [filaExecucao, setFilaExecucao] = useState([]);
  const [executando, setExecutando] = useState(null);
  const executadosRef = useRef(new Set());

  // Build set of already-executed pairs
  const executedSet = new Set(
    execucoes
      .filter((e) => e.status === "enviado" || e.status === "pendente")
      .map((e) => `${e.automacao_id}__${e.cliente_id}`)
  );
  executadosRef.current = executedSet;

  const avaliarAutomacao = useCallback(
    (automacao) => {
      if (!automacao.ativo) return [];
      const tipo = automacao.tipo || "custom";
      const evaluator = TRIGGER_EVALUATORS[tipo] || (() => true);
      const config = automacao.config || {};

      return clientes.filter((c) => {
        const key = `${automacao.id}__${c.id}`;
        if (executadosRef.current.has(key)) return false;
        try {
          return evaluator(c, config);
        } catch {
          return false;
        }
      });
    },
    [clientes]
  );

  const clientesImpactados = useCallback(() => {
    const impacted = new Map();
    automacoes
      .filter((a) => a.ativo)
      .forEach((a) => {
        const matched = avaliarAutomacao(a);
        matched.forEach((c) => {
          if (!impacted.has(c.id)) impacted.set(c.id, []);
          impacted.get(c.id).push(a.id);
        });
      });
    return impacted;
  }, [automacoes, avaliarAutomacao]);

  const execucoesPendentes = useCallback(() => {
    const pendentes = [];
    automacoes
      .filter((a) => a.ativo)
      .forEach((a) => {
        const matched = avaliarAutomacao(a);
        matched.forEach((c) => {
          pendentes.push({
            automacao_id: a.id,
            automacao_nome: a.nome,
            cliente_id: c.id,
            cliente_nome: c.nome,
            canal: a.canal || "whatsapp",
            status: "pendente",
          });
        });
      });
    return pendentes;
  }, [automacoes, avaliarAutomacao]);

  const executar = useCallback(
    (automacaoId) => {
      const automacao = automacoes.find((a) => a.id === automacaoId);
      if (!automacao) return { success: false, error: "Automação não encontrada" };

      setExecutando(automacaoId);
      const matched = avaliarAutomacao(automacao);

      const resultados = matched.map((c) => {
        const rand = Math.random();
        let status;
        if (rand < 0.85) status = "enviado";
        else if (rand < 0.93) status = "falhou";
        else status = "bounce";

        const key = `${automacaoId}__${c.id}`;
        executadosRef.current.add(key);

        return {
          id: `exec_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
          automacao_id: automacaoId,
          automacao_nome: automacao.nome,
          cliente_id: c.id,
          cliente_nome: c.nome,
          canal: automacao.canal || "whatsapp",
          status,
          created_at: new Date().toISOString(),
        };
      });

      setFilaExecucao((prev) => [...prev, ...resultados]);

      const enviados = resultados.filter((r) => r.status === "enviado").length;
      const falhou = resultados.filter((r) => r.status === "falhou").length;
      const bounce = resultados.filter((r) => r.status === "bounce").length;

      setTimeout(() => setExecutando(null), 1500);

      if (matched.length === 0) {
        toast("Nenhum cliente na fila para esta automação", "warning");
      } else {
        toast(
          `${automacao.nome}: ${enviados} enviados, ${falhou} falharam, ${bounce} bounce`,
          enviados > 0 ? "success" : "warning"
        );
      }

      return { success: true, total: matched.length, enviados, falhou, bounce, resultados };
    },
    [automacoes, avaliarAutomacao, toast]
  );

  const statsAutomacao = useCallback(
    (automacaoId) => {
      const all = [...execucoes, ...filaExecucao].filter((e) => e.automacao_id === automacaoId);
      const enviados = all.filter((e) => e.status === "enviado").length;
      const falhou = all.filter((e) => e.status === "falhou").length;
      const bounce = all.filter((e) => e.status === "bounce").length;
      const pendentes = all.filter((e) => e.status === "pendente").length;
      const total = all.length;
      const taxa = total > 0 ? Math.round((enviados / total) * 100) : 0;
      return { total, enviados, falhou, bounce, pendentes, taxa };
    },
    [execucoes, filaExecucao]
  );

  const todasExecucoes = [...execucoes, ...filaExecucao];

  return {
    clientesImpactados,
    execucoesPendentes,
    executar,
    statsAutomacao,
    filaExecucao,
    todasExecucoes,
    executando,
  };
}
