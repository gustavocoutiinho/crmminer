// ── Custom Hooks para acesso a dados Supabase ──────────────────────────────
import { useState, useEffect, useCallback } from "react";
import { db } from "./supabase";

// Hook genérico para carregar dados de uma tabela
export function useSupabaseQuery(table, { select = "*", eq = {}, order = null, limit = null } = {}) {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const refetch = useCallback(async () => {
    setLoading(true);
    let query = db.from(table).select(select);
    Object.entries(eq).forEach(([col, val]) => {
      query = query.eq(col, val);
    });
    if (order) query = query.order(order.col, { ascending: order.asc ?? true });
    if (limit) query = query.limit(limit);
    const { data: result, error: err } = await query.execute();
    setData(result || []);
    setError(err);
    setLoading(false);
  }, [table, select, JSON.stringify(eq), JSON.stringify(order), limit]);

  useEffect(() => {
    refetch();
  }, [refetch]);

  return { data, loading, error, refetch };
}

// Hook para mutações (insert, update, delete)
export function useSupabaseMutation(table) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const insert = async (record) => {
    setLoading(true);
    const { data, error } = await db.from(table).insert(record).execute();
    setError(error);
    setLoading(false);
    return { data, error };
  };

  const update = async (id, changes) => {
    setLoading(true);
    const { data, error } = await db.from(table).update(changes).eq("id", id).execute();
    setError(error);
    setLoading(false);
    return { data, error };
  };

  const remove = async (id) => {
    setLoading(true);
    const { data, error } = await db.from(table).delete().eq("id", id).execute();
    setError(error);
    setLoading(false);
    return { data, error };
  };

  return { insert, update, remove, loading, error };
}
