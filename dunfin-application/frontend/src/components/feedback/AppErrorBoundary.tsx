import { Component, type ErrorInfo, type ReactNode } from "react";
import { isLocale, type Locale } from "../../i18n/locales";
import { resolveTranslation } from "../../i18n/translations";

type Props = { children: ReactNode };

type State = { hasError: boolean };

function readLocale(): Locale {
  const stored = localStorage.getItem("dunfin_locale");
  return isLocale(stored) ? stored : "en";
}

export class AppErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("[AppErrorBoundary]", error, info.componentStack);
  }

  private handleReload = () => {
    window.location.reload();
  };

  render() {
    if (!this.state.hasError) {
      return this.props.children;
    }

    const locale = readLocale();
    const title = resolveTranslation(locale, "errorBoundaryTitle");
    const body = resolveTranslation(locale, "errorNetworkBusy");
    const action = resolveTranslation(locale, "errorBoundaryRefresh");

    return (
      <div className="flex min-h-screen items-center justify-center bg-[#0a0e1a] p-6 text-white">
        <div className="w-full max-w-md rounded-2xl border border-[#f0b90b]/25 bg-gradient-to-b from-[#1a1f2e] to-[#0a0e1a] p-6 text-center shadow-xl shadow-[#f0b90b]/10">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-[#f0b90b]/15 text-2xl text-[#f0b90b]">
            <i className="fa-solid fa-shield-halved" aria-hidden />
          </div>
          <h1 className="text-lg font-bold text-[#f0b90b]">{title}</h1>
          <p className="mt-3 text-sm leading-relaxed text-slate-300">{body}</p>
          <button
            type="button"
            onClick={this.handleReload}
            className="mt-6 w-full rounded-xl bg-gradient-to-r from-[#f0b90b] via-[#fcd535] to-[#f0b90b] py-3 text-sm font-bold text-[#0a0e1a] transition hover:brightness-110"
          >
            {action}
          </button>
        </div>
      </div>
    );
  }
}
