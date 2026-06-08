import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { NoticeToast, type NoticeToastState } from "../components/feedback/NoticeToast";
import { SuccessTransactionModal } from "../components/feedback/SuccessTransactionModal";
import type { TranslationKey } from "../i18n/translations";

const AUTO_DISMISS_MS = 4200;

export type SuccessFeedbackState = {
  titleKey: TranslationKey;
  messageKey: TranslationKey;
  detail?: string;
};

export type SuccessPreset = "trade" | "copyAddress" | "generic";

type ShowSuccessOptions = {
  preset?: SuccessPreset;
  titleKey?: TranslationKey;
  messageKey?: TranslationKey;
  detail?: string;
};

type SuccessFeedbackContextValue = {
  showSuccess: (options: ShowSuccessOptions) => void;
  showTradeSuccess: (detail?: string) => void;
  showCopyAddressSuccess: () => void;
  showStrategyLockedNotice: () => void;
  dismissSuccess: () => void;
};

const PRESET_KEYS: Record<
  SuccessPreset,
  Pick<SuccessFeedbackState, "titleKey" | "messageKey">
> = {
  trade: {
    titleKey: "successTradeTitle",
    messageKey: "successTradeMessage",
  },
  copyAddress: {
    titleKey: "successCopyAddressTitle",
    messageKey: "successCopyAddressMessage",
  },
  generic: {
    titleKey: "successGenericTitle",
    messageKey: "successGenericMessage",
  },
};

const SuccessFeedbackContext = createContext<SuccessFeedbackContextValue | null>(
  null
);

const NOTICE_DISMISS_MS = 4800;

export function SuccessFeedbackProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<SuccessFeedbackState | null>(null);
  const [notice, setNotice] = useState<NoticeToastState | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const noticeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const dismissSuccess = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    setState(null);
  }, []);

  const showSuccess = useCallback(
    (options: ShowSuccessOptions) => {
      if (timerRef.current) clearTimeout(timerRef.current);

      const preset = options.preset ?? "generic";
      const keys = PRESET_KEYS[preset];

      setState({
        titleKey: options.titleKey ?? keys.titleKey,
        messageKey: options.messageKey ?? keys.messageKey,
        detail: options.detail,
      });

      timerRef.current = setTimeout(() => {
        setState(null);
        timerRef.current = null;
      }, AUTO_DISMISS_MS);
    },
    []
  );

  const showTradeSuccess = useCallback(
    (detail?: string) => showSuccess({ preset: "trade", detail }),
    [showSuccess]
  );

  const showCopyAddressSuccess = useCallback(
    () => showSuccess({ preset: "copyAddress" }),
    [showSuccess]
  );

  const dismissNotice = useCallback(() => {
    if (noticeTimerRef.current) {
      clearTimeout(noticeTimerRef.current);
      noticeTimerRef.current = null;
    }
    setNotice(null);
  }, []);

  const showStrategyLockedNotice = useCallback(() => {
    if (noticeTimerRef.current) clearTimeout(noticeTimerRef.current);
    setNotice({
      titleKey: "strategyNotUnlockedTitle",
      messageKey: "strategyNotUnlockedMessage",
    });
    noticeTimerRef.current = setTimeout(() => {
      setNotice(null);
      noticeTimerRef.current = null;
    }, NOTICE_DISMISS_MS);
  }, []);

  useEffect(
    () => () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      if (noticeTimerRef.current) clearTimeout(noticeTimerRef.current);
    },
    []
  );

  const value = useMemo(
    () => ({
      showSuccess,
      showTradeSuccess,
      showCopyAddressSuccess,
      showStrategyLockedNotice,
      dismissSuccess,
    }),
    [
      showSuccess,
      showTradeSuccess,
      showCopyAddressSuccess,
      showStrategyLockedNotice,
      dismissSuccess,
    ]
  );

  return (
    <SuccessFeedbackContext.Provider value={value}>
      {children}
      {state && (
        <SuccessTransactionModal state={state} onDismiss={dismissSuccess} />
      )}
      {notice && <NoticeToast state={notice} onDismiss={dismissNotice} />}
    </SuccessFeedbackContext.Provider>
  );
}

export function useSuccessFeedback() {
  const ctx = useContext(SuccessFeedbackContext);
  if (!ctx) {
    throw new Error("useSuccessFeedback must be used within SuccessFeedbackProvider");
  }
  return ctx;
}
