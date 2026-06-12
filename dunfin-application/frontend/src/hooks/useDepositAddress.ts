import { useCallback, useEffect, useState } from "react";
import { fetchUserDepositAddress } from "../api/client";
import type { DepositAddressResponse, DepositNetwork } from "../types/deposit";
import { useLocale } from "../i18n/LocaleContext";

export function useDepositAddress(network: DepositNetwork = "TRC20") {
  const { t } = useLocale();
  const [data, setData] = useState<DepositAddressResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await fetchUserDepositAddress(network);
      setData(result);
    } catch (e) {
      setData(null);
      setError(e instanceof Error ? e.message : t("errorLoadDepositAddress"));
    } finally {
      setLoading(false);
    }
  }, [network, t]);

  useEffect(() => {
    void load();
  }, [load]);

  return { data, loading, error, reload: load };
}
