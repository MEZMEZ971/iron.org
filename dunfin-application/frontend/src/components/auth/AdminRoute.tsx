import { useEffect, useState } from "react";
import { Navigate, Outlet } from "react-router-dom";
import { fetchAdminMe } from "../../api/client";
import { useAuth } from "../../context/AuthContext";
import { isAdminRole } from "../../lib/authStorage";
import { useLocale } from "../../i18n/LocaleContext";

export function AdminRoute() {
  const { isAuthenticated, user, patchUser } = useAuth();
  const { t } = useLocale();
  const [checking, setChecking] = useState(true);
  const [allowed, setAllowed] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function verify() {
      if (!isAuthenticated) {
        setAllowed(false);
        setChecking(false);
        return;
      }

      if (isAdminRole(user?.role)) {
        setAllowed(true);
        setChecking(false);
        return;
      }

      try {
        const res = await fetchAdminMe();
        if (!cancelled) {
          patchUser({ role: res.user.role });
          setAllowed(isAdminRole(res.user.role));
        }
      } catch {
        if (!cancelled) setAllowed(false);
      } finally {
        if (!cancelled) setChecking(false);
      }
    }

    verify();
    return () => {
      cancelled = true;
    };
  }, [isAuthenticated, user?.role, patchUser]);

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (checking) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center bg-[#0a0e1a] px-4">
        <p className="text-sm text-df-muted">{t("adminLoading")}</p>
      </div>
    );
  }

  if (!allowed) {
    return <Navigate to="/" replace />;
  }

  return <Outlet />;
}
