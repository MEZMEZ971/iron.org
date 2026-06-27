import { useCallback, useEffect, useState } from "react";
import { fetchKycStatus, type KycStatusResponse } from "../api/client";
import { useLocale } from "../i18n/LocaleContext";
import { resolveUserFacingError } from "../lib/userFacingError";

export function useKyc(userId: string) {
  const { t } = useLocale();
  const [data, setData] = useState<KycStatusResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setError(null);
    try {
      const result = await fetchKycStatus(userId);
      setData(result);
    } catch (e) {
      setError(
        resolveUserFacingError(e, t, {
          fallbackKey: "errorLoadKyc",
          context: "kyc",
        })
      );
    } finally {
      setLoading(false);
    }
  }, [userId, t]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return { data, loading, error, refresh };
}
