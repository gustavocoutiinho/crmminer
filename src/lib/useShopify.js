// ── Hook para dados Shopify ──────────────────────────────────────────────────
import { useState, useEffect, useCallback } from "react";
import {
  fetchShopifyCustomers,
  fetchShopifyOrders,
  fetchShopifyCustomerCount,
  fetchShopifyOrderCount,
} from "./shopify";

export function useShopifyData() {
  const [customers, setCustomers] = useState([]);
  const [orders, setOrders] = useState([]);
  const [counts, setCounts] = useState({ customers: 0, orders: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const refetch = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [custs, ords, custCount, ordCount] = await Promise.all([
        fetchShopifyCustomers({ limit: 250 }),
        fetchShopifyOrders({ limit: 250 }),
        fetchShopifyCustomerCount(),
        fetchShopifyOrderCount(),
      ]);
      setCustomers(custs);
      setOrders(ords);
      setCounts({ customers: custCount, orders: ordCount });
    } catch (err) {
      console.error("[useShopifyData]", err.message);
      setError(err.message);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    refetch();
  }, [refetch]);

  // Métricas derivadas
  const totalReceita = orders.reduce((s, o) => s + (o.status === "aprovado" ? o.valor : 0), 0);
  const ticketMedio = orders.length > 0 ? totalReceita / orders.filter(o => o.status === "aprovado").length : 0;

  // Segmentação RFM
  const rfmCounts = { campiao: 0, fiel: 0, potencial: 0, em_risco: 0, inativo: 0 };
  customers.forEach((c) => { if (rfmCounts[c.seg] !== undefined) rfmCounts[c.seg]++; });

  return {
    customers,
    orders,
    counts,
    loading,
    error,
    refetch,
    totalReceita,
    ticketMedio,
    rfmCounts,
  };
}
