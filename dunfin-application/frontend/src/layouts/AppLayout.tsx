import { Outlet } from "react-router-dom";
import { ProfileMenuDrawer } from "../components/ProfileMenu";
import { Header } from "../components/Header";
import { useProfileMenu } from "../context/ProfileMenuContext";
import { useLocale } from "../i18n/LocaleContext";
import { BottomNav } from "./BottomNav";
import { DesktopSidebar } from "./DesktopSidebar";

export function AppLayout() {
  const { isOpen, close } = useProfileMenu();
  const { dir } = useLocale();

  return (
    <div
      className={`flex min-h-screen bg-df-page transition-all duration-300 ease-in-out ${
        dir === "rtl" ? "flex-row-reverse" : ""
      }`}
    >
      <DesktopSidebar />

      <div className="mx-auto flex min-h-screen w-full min-w-0 max-w-md flex-1 flex-col bg-white text-slate-900 transition-all duration-300 dark:bg-[#0a0e1a] dark:text-white md:max-w-none md:bg-df-page md:text-inherit">
        <div className="shrink-0 px-4 pt-4 md:hidden [&_h1]:text-df [&_button]:text-df-muted">
          <Header />
        </div>

        <main className="flex-1 overflow-y-auto px-4 pb-[calc(4.75rem+env(safe-area-inset-bottom))] transition-all duration-300 ease-in-out md:px-8 md:pb-6">
          <div className="mx-auto w-full md:max-w-6xl md:py-2">
            <Outlet />
          </div>
        </main>

        <BottomNav />
      </div>

      <ProfileMenuDrawer open={isOpen} onClose={close} />
    </div>
  );
}
