export type Locale = "id" | "en";

export const DEFAULT_LOCALE: Locale = "id";

export const LOCALE_STORAGE_KEY = "gunaa_locale";

export function getStoredLocale(): Locale | null {
  if (typeof window === "undefined") return null;
  const raw = localStorage.getItem(LOCALE_STORAGE_KEY);
  if (raw === "id" || raw === "en") return raw;
  return null;
}

export function setStoredLocale(locale: Locale): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(LOCALE_STORAGE_KEY, locale);
}
