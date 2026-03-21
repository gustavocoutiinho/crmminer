import { useState, useCallback, useMemo } from "react";
import { DB_FALLBACK } from "../data/fallback";

const DEFAULT_PERMISSOES = DB_FALLBACK.permissoes_config;

const PERMISSOES_LABELS = {
  ver_dashboard: "Ver Dashboard",
  ver_todos_clientes: "Ver Todos os Clientes",
  editar_clientes: "Editar Clientes",
  transferir_clientes: "Transferir Clientes",
  ver_campanhas: "Ver Campanhas",
  criar_campanhas: "Criar Campanhas",
  ver_relatorios: "Ver Relatórios",
  exportar_dados: "Exportar Dados",
  configurar_marca: "Configurar Marca",
  gerenciar_equipe: "Gerenciar Equipe",
  ver_financeiro: "Ver Financeiro",
  ver_fidelidade: "Ver Fidelidade",
  config_automacoes: "Configurar Automações",
};

export function usePermissoes(user) {
  const role = user?.role || "vendedor";
  const isAdmin = role === "admin" || role === "miner";

  const [permissoes, setPermissoes] = useState(() => {
    try {
      const saved = localStorage.getItem("crm_permissoes");
      if (saved) return JSON.parse(saved);
    } catch (e) { /* ignore */ }
    return DEFAULT_PERMISSOES;
  });

  const pode = useCallback((acao) => {
    if (isAdmin) return true;
    return permissoes[role]?.[acao] ?? false;
  }, [role, isAdmin, permissoes]);

  const salvarPermissoes = useCallback((novasPermissoes) => {
    setPermissoes(novasPermissoes);
    localStorage.setItem("crm_permissoes", JSON.stringify(novasPermissoes));
  }, []);

  const restaurarPadrao = useCallback(() => {
    setPermissoes(DEFAULT_PERMISSOES);
    localStorage.removeItem("crm_permissoes");
  }, []);

  return {
    pode,
    permissoes,
    isAdmin,
    salvarPermissoes,
    restaurarPadrao,
    labels: PERMISSOES_LABELS,
    defaultPermissoes: DEFAULT_PERMISSOES,
  };
}

export default usePermissoes;
