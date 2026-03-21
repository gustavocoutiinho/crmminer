import { useState, useEffect, useCallback } from "react";
import { fetchData, createRecord, updateRecord, deleteRecord } from "./api";

export function useSupabaseQuery(table, { eq = {}, limit } = {}) {
  const [data, setData] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const refetch = useCallback(async () => {
    setLoading(true);
    try {
      const opts = { limit: limit || 250 };
      if (eq.segmento_rfm) opts.segmento_rfm = eq.segmento_rfm;
      if (eq.search) opts.search = eq.search;
      if (eq.status) opts.status = eq.status;
      const result = await fetchData(table, opts);
      setData(result.data || []);
      setTotal(result.total || 0);
      setError(null);
    } catch (err) {
      setData([]);
      setError(err.message);
    }
    setLoading(false);
  }, [table, JSON.stringify(eq), limit]);

  useEffect(() => { refetch(); }, [refetch]);
  return { data, total, loading, error, refetch };
}

export function useSupabaseMutation(table) {
  const [loading, setLoading] = useState(false);

  const insert = async (record) => {
    setLoading(true);
    try { const r = await createRecord(table, record); setLoading(false); return r; }
    catch (e) { setLoading(false); return { error: e.message }; }
  };

  const update = async (id, changes) => {
    setLoading(true);
    try { const r = await updateRecord(table, id, changes); setLoading(false); return r; }
    catch (e) { setLoading(false); return { error: e.message }; }
  };

  const remove = async (id) => {
    setLoading(true);
    try { const r = await deleteRecord(table, id); setLoading(false); return r; }
    catch (e) { setLoading(false); return { error: e.message }; }
  };

  return { insert, update, remove, loading };
}
