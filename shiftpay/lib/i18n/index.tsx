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

interface LocaleCtx {
  locale: Locale;
  setLocale: (l: Locale) => Promise<void>;
}

const LocaleContext = createContext<LocaleCtx>({
  locale: "nb",
  setLocale: async () => {},
});

export function LocaleProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>("nb");

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY).then((saved) => {
      if (saved && SUPPORTED_LOCALES.includes(saved as Locale)) {
        i18n.locale = saved;
        setLocaleState(saved as Locale);
      } else {
        const device = Localization.getLocales()[0]?.languageCode ?? "nb";
        const detected = SUPPORTED_LOCALES.includes(device as Locale)
          ? (device as Locale)
          : "nb";
        i18n.locale = detected;
        setLocaleState(detected);
      }
    });
  }, []);

  const setLocale = useCallback(async (l: Locale) => {
    i18n.locale = l;
    setLocaleState(l);
    await AsyncStorage.setItem(STORAGE_KEY, l);
  }, []);

  return (
    <LocaleContext.Provider value={{ locale, setLocale }}>
      {children}
    </LocaleContext.Provider>
  );
}

export function useTranslation() {
  const { locale, setLocale } = useContext(LocaleContext);
  const t = useCallback(
    (key: string, options?: object) => i18n.t(key, options),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [locale]
  );
  return { t, locale, setLocale };
}

/** Non-React translation function — reads current i18n locale from singleton. */
export function getTranslation(key: string, options?: object): string {
  return i18n.t(key, options);
}
