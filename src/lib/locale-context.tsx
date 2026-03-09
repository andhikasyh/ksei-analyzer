"use client";

import {
  createContext,
  useContext,
  useCallback,
  useEffect,
  useState,
  useMemo,
  ReactNode,
} from "react";
import { useProContext } from "@/lib/pro-context";
import type { Locale } from "@/lib/i18n";
import {
  DEFAULT_LOCALE,
  LOCALE_STORAGE_KEY,
  getStoredLocale,
  setStoredLocale,
} from "@/lib/i18n";
import idTranslations from "@/locales/id.json";
import enTranslations from "@/locales/en.json";

type Translations = Record<string, unknown>;

const translationsMap: Record<Locale, Translations> = {
  id: idTranslations as Translations,
  en: enTranslations as Translations,
};

function getNested(obj: Record<string, unknown>, path: string): string | undefined {
  const parts = path.split(".");
  let current: unknown = obj;
  for (const part of parts) {
    if (current == null || typeof current !== "object") return undefined;
    current = (current as Record<string, unknown>)[part];
  }
  return typeof current === "string" ? current : undefined;
}

export interface LocaleContextValue {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  t: (key: string) => string;
  ready: boolean;
}

const LocaleContext = createContext<LocaleContextValue>({
  locale: DEFAULT_LOCALE,
  setLocale: () => {},
  t: (key: string) => key,
  ready: false,
});

export function useLocale() {
  return useContext(LocaleContext);
}

export function LocaleProvider({ children }: { children: ReactNode }) {
  const { user } = useProContext();
  const [locale, setLocaleState] = useState<Locale>(DEFAULT_LOCALE);
  const [ready, setReady] = useState(false);

  const t = useCallback(
    (key: string) => {
      const value = getNested(translationsMap[locale] as Record<string, unknown>, key);
      return value ?? key;
    },
    [locale]
  );

  const setLocale = useCallback(
    async (newLocale: Locale) => {
      setLocaleState(newLocale);
      setStoredLocale(newLocale);
      if (typeof document !== "undefined") {
        document.documentElement.lang = newLocale === "id" ? "id" : "en";
      }
      if (user) {
        try {
          await fetch("/api/user/locale", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ locale: newLocale }),
          });
        } catch {
          // non-critical
        }
      }
    },
    [user]
  );

  useEffect(() => {
    const stored = getStoredLocale();
    const initial: Locale = stored ?? DEFAULT_LOCALE;
    setLocaleState(initial);
    if (typeof document !== "undefined") {
      document.documentElement.lang = initial === "id" ? "id" : "en";
    }
    setReady(true);
  }, []);

  useEffect(() => {
    if (!ready || !user) return;
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/user/locale");
        if (!res.ok || cancelled) return;
        const data = await res.json();
        const cloudLocale = data.locale === "en" ? "en" : "id";
        setLocaleState(cloudLocale);
        setStoredLocale(cloudLocale);
        if (typeof document !== "undefined") {
          document.documentElement.lang = cloudLocale === "id" ? "id" : "en";
        }
      } catch {
        // keep local locale
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [ready, user?.id]);

  const value = useMemo<LocaleContextValue>(
    () => ({ locale, setLocale, t, ready }),
    [locale, setLocale, t, ready]
  );

  return (
    <LocaleContext.Provider value={value}>
      {children}
    </LocaleContext.Provider>
  );
}
