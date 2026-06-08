import { useEffect, useId, useRef, useState } from "react";
import {
  COUNTRIES_BY_ISO,
  COUNTRY_DIAL_CODES,
  filterCountries,
  findCountryByDialCode,
  getCountryLabel,
  isoToFlag,
  type CountryDialEntry,
} from "../../data/countryDialCodes";
import { useLocale } from "../../i18n/LocaleContext";

interface CountryCodeSelectProps {
  value: string;
  /** Disambiguates shared dial codes (e.g. +1 for US vs CA) */
  selectedIso?: string;
  onChange: (dialCode: string, country?: CountryDialEntry) => void;
  className?: string;
}

function formatRow(entry: CountryDialEntry, locale: "en" | "ar") {
  const name = getCountryLabel(entry, locale);
  return {
    primary: `${isoToFlag(entry.iso2)} ${entry.iso2} · ${name}`,
    secondary: entry.dialCode,
  };
}

export function CountryCodeSelect({
  value,
  selectedIso,
  onChange,
  className = "",
}: CountryCodeSelectProps) {
  const { t, locale, dir } = useLocale();
  const countryLabelLocale = locale === "ar" ? "ar" : "en";
  const listId = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);

  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [highlight, setHighlight] = useState(0);

  const selected =
    (selectedIso ? COUNTRIES_BY_ISO.get(selectedIso) : undefined) ??
    findCountryByDialCode(value) ??
    COUNTRY_DIAL_CODES.find((c) => c.dialCode === value);

  const filtered = filterCountries(search, countryLabelLocale);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) {
        setOpen(false);
        setSearch("");
      }
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setOpen(false);
        setSearch("");
      }
    };
    document.addEventListener("mousedown", onDoc);
    window.addEventListener("keydown", onKey);
    const tmr = setTimeout(() => searchRef.current?.focus(), 50);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      window.removeEventListener("keydown", onKey);
      clearTimeout(tmr);
    };
  }, [open]);

  useEffect(() => {
    setHighlight(0);
  }, [search]);

  function pick(entry: CountryDialEntry) {
    onChange(entry.dialCode, entry);
    setOpen(false);
    setSearch("");
  }

  function onSearchKeyDown(e: React.KeyboardEvent) {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setHighlight((h) => Math.min(h + 1, filtered.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlight((h) => Math.max(h - 1, 0));
    } else if (e.key === "Enter" && filtered[highlight]) {
      e.preventDefault();
      pick(filtered[highlight]);
    }
  }

  const rtl = dir === "rtl";

  return (
    <div ref={rootRef} className={`relative shrink-0 ${className}`} dir={dir}>
      <button
        type="button"
        aria-expanded={open}
        aria-haspopup="listbox"
        aria-controls={listId}
        onClick={() => setOpen((o) => !o)}
        className="flex min-w-[5.5rem] items-center gap-1.5 rounded-xl border border-df-strong bg-df-inset px-2.5 py-2.5 text-sm text-df transition-all duration-300 ease-in-out hover:border-[#f0b90b]/40 focus:border-[#f0b90b]/50 focus:outline-none"
      >
        <span className="text-base leading-none" aria-hidden>
          {selected ? isoToFlag(selected.iso2) : "🌐"}
        </span>
        <span className="font-semibold tabular-nums text-[#f0b90b]">
          {value || "+1"}
        </span>
        <i
          className={`fa-solid fa-chevron-down text-[10px] text-df-muted transition-transform duration-300 ${open ? "rotate-180" : ""}`}
          aria-hidden
        />
      </button>

      {open && (
        <div
          className={`glass-card absolute top-[calc(100%+6px)] z-[120] w-[min(100vw-2rem,20rem)] overflow-hidden rounded-2xl shadow-2xl transition-all duration-300 ease-in-out ${
            rtl ? "right-0" : "left-0"
          }`}
        >
          <div className="border-b border-df p-2">
            <div className="relative">
              <i
                className={`fa-solid fa-magnifying-glass pointer-events-none absolute top-1/2 -translate-y-1/2 text-df-muted text-xs ${
                  rtl ? "right-3" : "left-3"
                }`}
                aria-hidden
              />
              <input
                ref={searchRef}
                type="search"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                onKeyDown={onSearchKeyDown}
                placeholder={t("countryCodeSearch")}
                className={`w-full rounded-xl border border-df-strong bg-df-inset py-2 text-sm text-df placeholder:text-df-faint focus:border-[#f0b90b]/50 focus:outline-none ${
                  rtl ? "pe-9 ps-3 text-end" : "ps-9 pe-3"
                }`}
                autoComplete="off"
              />
            </div>
          </div>

          <ul
            id={listId}
            role="listbox"
            className="max-h-56 overflow-y-auto overscroll-contain py-1"
          >
            {filtered.length === 0 ? (
              <li className="px-3 py-4 text-center text-xs text-df-muted">
                {t("countryCodeNoResults")}
              </li>
            ) : (
              filtered.map((entry, index) => {
                const row = formatRow(entry, countryLabelLocale);
                const active = index === highlight;
                const isSelected =
                  selectedIso === entry.iso2 ||
                  (!selectedIso && entry.dialCode === value);
                return (
                  <li key={`${entry.iso2}-${entry.dialCode}`} role="option">
                    <button
                      type="button"
                      onMouseEnter={() => setHighlight(index)}
                      onClick={() => pick(entry)}
                      className={`flex w-full items-center gap-2 px-3 py-2.5 text-start transition-all duration-200 ${
                        active || isSelected
                          ? "bg-amber-500/10 text-df"
                          : "text-df-muted hover:bg-white/[0.04]"
                      }`}
                    >
                      <span className="min-w-0 flex-1 text-xs leading-snug">
                        <span className="font-medium">{row.primary}</span>
                        <span className="mx-1 text-df-faint">·</span>
                        <span className="font-semibold tabular-nums text-[#f0b90b]">
                          {row.secondary}
                        </span>
                      </span>
                      {isSelected && (
                        <i className="fa-solid fa-check text-[10px] text-[#00d4aa]" aria-hidden />
                      )}
                    </button>
                  </li>
                );
              })
            )}
          </ul>
        </div>
      )}
    </div>
  );
}
