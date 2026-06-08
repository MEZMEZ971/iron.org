import { useLocale } from "../../i18n/LocaleContext";
import type { TeamContributionLog } from "../../api/client";

interface Props {
  logs: TeamContributionLog[];
}

export function ContributionLogs({ logs }: Props) {
  const { t } = useLocale();

  return (
    <div className="space-y-3">
      <h2 className="text-sm font-bold text-df">{t("teamContributionTitle")}</h2>
      <div className="df-table-shell overflow-hidden rounded-2xl">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[340px] text-xs">
            <thead>
              <tr className="border-b border-df text-[10px] uppercase tracking-wide text-df-faint">
                <th className="px-3 py-3 text-start">{t("teamColAccount")}</th>
                <th className="px-3 py-3 text-center">{t("teamColHierarchy")}</th>
                <th className="px-3 py-3 text-center">{t("teamColExecuted")}</th>
                <th className="px-3 py-3 text-end">{t("teamColPayout")}</th>
              </tr>
            </thead>
            <tbody>
              {logs.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-3 py-8 text-center text-df-faint">
                    {t("teamNoLogs")}
                  </td>
                </tr>
              ) : (
                logs.map((log, i) => (
                  <tr
                    key={`${log.account}-${log.executionTime}-${i}`}
                    className="border-b border-df hover:bg-df-hover"
                  >
                    <td className="px-3 py-3 font-mono text-df">{log.account}</td>
                    <td className="px-3 py-3 text-center text-[#f0b90b]">
                      {log.generation === 1
                        ? t("teamGen1Short")
                        : log.generation === 2
                          ? t("teamGen2Short")
                          : t("teamGen3Short")}
                    </td>
                    <td className="px-3 py-3 text-center tabular-nums text-df-muted">
                      {log.executionTime}
                    </td>
                    <td className="px-3 py-3 text-end font-semibold tabular-nums text-[#00d4aa]">
                      {log.earningsPayout.toFixed(6)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
