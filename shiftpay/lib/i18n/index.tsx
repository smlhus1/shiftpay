import { I18n } from "i18n-js";
import * as Localization from "expo-localization";
import { createContext, useContext, useEffect, useState, useCallback, type ReactNode } from "react";
import { getString, migrateAsyncStorageKey, setString } from "../storage";
import nb from "./nb";
import en from "./en";
import sv from "./sv";
import da from "./da";

export const SUPPORTED_LOCALES = ["nb", "en", "sv", "da"] as const;
export type Locale = (typeof SUPPORTED_LOCALES)[number];

export const SUPPORTED_CURRENCIES = ["NOK", "GBP", "SEK", "DKK", "EUR"] as const;
export type Currency = (typeof SUPPORTED_CURRENCIES)[number];

const LOCALE_DEFAULT_CURRENCY: Record<Locale, Currency> = {
  nb: "NOK",
  en: "GBP",
  sv: "SEK",
  da: "DKK",
};

const i18n = new I18n({
  nb,
  en,
  sv,
  da,
  "nb-NO": nb,
  "en-US": en,
  "en-GB": en,
  "sv-SE": sv,
  "da-DK": da,
});
i18n.defaultLocale = "nb";
i18n.enableFallback = true;

const LOCALE_STORAGE_KEY = "shiftpay_locale";
const CURRENCY_STORAGE_KEY = "shiftpay_currency";

interface LocaleCtx {
  locale: Locale;
  setLocale: (l: Locale) => void;
  currency: Currency;
  setCurrency: (c: Currency) => void;
}

const LocaleContext = createContext<LocaleCtx>({
  locale: "nb",
  setLocale: () => {},
  currency: "NOK",
  setCurrency: () => {},
});

function isLocale(v: string): v is Locale {
  return (SUPPORTED_LOCALES as readonly string[]).includes(v);
}

function isCurrency(v: string): v is Currency {
  return (SUPPORTED_CURRENCIES as readonly string[]).includes(v);
}

/**
 * Read the persisted locale synchronously from MMKV. On a miss (first
 * boot, or pre-migration), fall back to device language → 'nb' default.
 */
function readInitialLocale(): Locale {
  const stored = getString(LOCALE_STORAGE_KEY);
  if (stored && isLocale(stored)) return stored;
  const device = Localization.getLocales()[0]?.languageCode ?? "nb";
  return isLocale(device) ? device : "nb";
}

function readInitialCurrency(locale: Locale): Currency {
  const stored = getString(CURRENCY_STORAGE_KEY);
  if (stored && isCurrency(stored)) return stored;
  return LOCALE_DEFAULT_CURRENCY[locale];
}

// Sync the singleton at module load so non-React translation calls get
// the right locale on first read, before any provider mounts.
const initialLocale = readInitialLocale();
i18n.locale = initialLocale;

export function LocaleProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>(initialLocale);
  const [currency, setCurrencyState] = useState<Currency>(() => readInitialCurrency(initialLocale));

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const migratedLocale = await migrateAsyncStorageKey<Locale>(LOCALE_STORAGE_KEY, (raw) =>
        isLocale(raw) ? raw : null
      );
      if (!cancelled && migratedLocale) {
        i18n.locale = migratedLocale;
        setLocaleState(migratedLocale);
      }
      const migratedCurrency = await migrateAsyncStorageKey<Currency>(
        CURRENCY_STORAGE_KEY,
        (raw) => (isCurrency(raw) ? raw : null)
      );
      if (!cancelled && migratedCurrency) setCurrencyState(migratedCurrency);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const setLocale = useCallback((l: Locale) => {
    i18n.locale = l;
    setLocaleState(l);
    setString(LOCALE_STORAGE_KEY, l);
  }, []);

  const setCurrency = useCallback((c: Currency) => {
    setCurrencyState(c);
    setString(CURRENCY_STORAGE_KEY, c);
  }, []);

  return (
    <LocaleContext.Provider value={{ locale, setLocale, currency, setCurrency }}>
      {children}
    </LocaleContext.Provider>
  );
}

export function useTranslation() {
  const { locale, setLocale, currency, setCurrency } = useContext(LocaleContext);
  const t = useCallback(
    (key: string, options?: object) => i18n.t(key, options),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [locale]
  );
  return { t, locale, setLocale, currency, setCurrency };
}

/** Non-React translation function — reads current i18n locale from singleton. */
export function getTranslation(key: string, options?: object): string {
  return i18n.t(key, options);
}
