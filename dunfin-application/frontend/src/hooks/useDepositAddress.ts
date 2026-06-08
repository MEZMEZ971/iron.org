import { useCallback, useEffect, useState } from "react";
import { fetchDepositAddress } from "../api/client";
import type { DepositAddressResponse, DepositNetwork } from "../types/deposit";

export function useDepositAddress(
  userId: string,
  network: DepositNetwork,
  enabled = true,
) {
  const [data, setData] = useState<DepositAddressResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!userId) return;
    setLoading(true);
    setError(null);
    try {
      const result = await fetchDepositAddress(userId, network);
      setData(result);
    } catch (e) {
      setData(null);
      setError(e instanceof Error ? e.message : "Failed to load deposit address");
    } finally {
      setLoading(false);
    }
  }, [userId, network]);

  useEffect(() => {
    if (enabled) {
      load();
    }
  }, [load, enabled]);

  return { data, loading, error, reload: load };
}
