import { I18n } from "i18n-js";
import * as Localization from "expo-localization";
import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  type ReactNode,
} from "react";
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

const STORAGE_KEY = "shiftpay_locale";
const CURRENCY_STORAGE_KEY = "shiftpay_currency";

interface LocaleCtx {
  locale: Locale;
  setLocale: (l: Locale) => Promise<void>;
  currency: Currency;
  setCurrency: (c: Currency) => Promise<void>;
}

const LocaleContext = createContext<LocaleCtx>({
  locale: "nb",
  setLocale: async () => {},
  currency: "NOK",
  setCurrency: async () => {},
});

export function LocaleProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>("nb");
  const [currency, setCurrencyState] = useState<Currency>("NOK");

  useEffect(() => {
    Promise.all([
      AsyncStorage.getItem(STORAGE_KEY),
      AsyncStorage.getItem(CURRENCY_STORAGE_KEY),
    ]).then(([savedLocale, savedCurrency]) => {
      let detectedLocale: Locale = "nb";
      if (savedLocale && SUPPORTED_LOCALES.includes(savedLocale as Locale)) {
        detectedLocale = savedLocale as Locale;
      } else {
        const device = Localization.getLocales()[0]?.languageCode ?? "nb";
        detectedLocale = SUPPORTED_LOCALES.includes(device as Locale)
          ? (device as Locale)
          : "nb";
      }
      i18n.locale = detectedLocale;
      setLocaleState(detectedLocale);

      if (savedCurrency && SUPPORTED_CURRENCIES.includes(savedCurrency as Currency)) {
        setCurrencyState(savedCurrency as Currency);
      } else {
        setCurrencyState(LOCALE_DEFAULT_CURRENCY[detectedLocale]);
      }
    });
  }, []);

  const setLocale = useCallback(async (l: Locale) => {
    i18n.locale = l;
    setLocaleState(l);
    await AsyncStorage.setItem(STORAGE_KEY, l);
  }, []);

  const setCurrency = useCallback(async (c: Currency) => {
    setCurrencyState(c);
    await AsyncStorage.setItem(CURRENCY_STORAGE_KEY, c);
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
