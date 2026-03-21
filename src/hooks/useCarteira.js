import { useMemo } from "react";

/**
 * Filtra clientes por role do usuário (carteira isolada)
 * vendedor → só seus clientes (vendedor_id === user.id)
 * gerente → clientes da loja (loja_id === user.loja_id)
 * admin → todos da marca (marca_id === user.marca_id)
 * miner → todos
 */
export function useCarteira(user, clientes) {
  const meusClientes = useMemo(() => {
    if (!clientes || !user) return [];
    const role = user.role;
    if (role === "miner") return clientes;
    if (role === "admin") return clientes.filter(c => c.marca_id === (user.marca_id || user.marcaId));
    if (role === "gerente") return clientes.filter(c => c.loja_id === user.loja_id);
    if (role === "vendedor") return clientes.filter(c => c.vendedor_id === user.id);
    return [];
  }, [user, clientes]);

  const todosMarca = useMemo(() => {
    if (!clientes || !user) return [];
    const role = user.role;
    if (role === "miner") return clientes;
    return clientes.filter(c => c.marca_id === (user.marca_id || user.marcaId));
  }, [user, clientes]);

  const now = new Date();

  const filtros = useMemo(() => {
    const diasSemContato = (c) => {
      if (!c.ultimo_contato) return 999;
      const diff = now - new Date(c.ultimo_contato);
      return Math.floor(diff / (1000 * 60 * 60 * 24));
    };

    const semana = new Date(now);
    semana.setDate(semana.getDate() - 7);

    const src = meusClientes;
    return {
      sem30d: src.filter(c => diasSemContato(c) >= 30),
      sem60d: src.filter(c => diasSemContato(c) >= 60),
      sem90d: src.filter(c => diasSemContato(c) >= 90),
      novos: src.filter(c => c.created_at && new Date(c.created_at) >= semana),
      emRisco: src.filter(c => c.segmento_rfm === "at_risk" || c.segmento_rfm === "hibernating"),
    };
  }, [meusClientes]);

  return { meusClientes, todosMarca, filtros };
}
