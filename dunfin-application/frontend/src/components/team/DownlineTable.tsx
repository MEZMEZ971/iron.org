import { useLocale } from "../../i18n/LocaleContext";
import type { TeamMemberRow } from "../../api/client";

interface Props {
  members: TeamMemberRow[];
}

export function DownlineTable({ members }: Props) {
  const { t } = useLocale();

  return (
    <div className="df-table-shell overflow-hidden rounded-2xl">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[300px] text-xs">
          <thead>
            <tr className="border-b border-df text-[10px] uppercase tracking-wide text-df-faint">
              <th className="px-3 py-3 text-start">{t("teamColAccount")}</th>
              <th className="px-3 py-3 text-start">{t("teamColNickname")}</th>
              <th className="px-3 py-3 text-end">{t("teamColRegistered")}</th>
            </tr>
          </thead>
          <tbody>
            {members.length === 0 ? (
              <tr>
                <td colSpan={3} className="px-3 py-8 text-center text-df-faint">
                  {t("teamNoMembers")}
                </td>
              </tr>
            ) : (
              members.map((m, i) => (
                <tr
                  key={`${m.account}-${i}`}
                  className="border-b border-df hover:bg-df-hover"
                >
                  <td className="px-3 py-3 font-mono text-df">{m.account}</td>
                  <td className="px-3 py-3 text-df-muted">
                    {m.nickname}
                    {m.isActive && (
                      <span className="ms-1.5 inline-block h-1.5 w-1.5 rounded-full bg-[#00d4aa]" title={t("teamActive")} />
                    )}
                  </td>
                  <td className="px-3 py-3 text-end tabular-nums text-df-muted">
                    {m.registrationTime}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
