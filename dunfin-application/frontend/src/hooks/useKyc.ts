import { useCallback, useEffect, useState } from "react";
import { fetchKycStatus, type KycStatusResponse } from "../api/client";

export function useKyc(userId: string) {
  const [data, setData] = useState<KycStatusResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setError(null);
    try {
      const result = await fetchKycStatus(userId);
      setData(result);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load KYC status");
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return { data, loading, error, refresh };
}
