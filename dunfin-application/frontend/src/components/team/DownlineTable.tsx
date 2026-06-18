import { useLocale } from "../../i18n/LocaleContext";
import type { TeamMemberRow } from "../../api/client";

interface Props {
  members: TeamMemberRow[];
}

export function DownlineTable({ members }: Props) {
  const { t } = useLocale();

  return (
    <div className="df-table-shell overflow-hidden rounded-2xl">
      <div className="space-y-2 p-3 md:hidden">
        {members.length === 0 ? (
          <p className="py-6 text-center text-xs text-df-faint">{t("teamNoMembers")}</p>
        ) : (
          members.map((m, i) => (
            <div key={`${m.account}-${i}`} className="df-mobile-card space-y-1.5">
              <div className="flex items-start justify-between gap-2">
                <p className="break-all font-mono text-xs font-semibold text-df">{m.account}</p>
                {m.isActive && (
                  <span
                    className="mt-1 inline-block h-2 w-2 shrink-0 rounded-full bg-[#00d4aa]"
                    title={t("teamActive")}
                  />
                )}
              </div>
              <p className="break-words text-xs text-df-muted">{m.nickname}</p>
              <p className="text-[10px] text-df-faint">
                {t("teamColRegistered")}:{" "}
                <span className="tabular-nums text-df-muted">{m.registrationTime}</span>
              </p>
            </div>
          ))
        )}
      </div>

      <div className="hidden overflow-x-auto md:block">
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
                      <span
                        className="ms-1.5 inline-block h-1.5 w-1.5 rounded-full bg-[#00d4aa]"
                        title={t("teamActive")}
                      />
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
