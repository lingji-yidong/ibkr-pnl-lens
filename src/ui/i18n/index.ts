import { de } from "./locales/de";
import { en } from "./locales/en";
import { es } from "./locales/es";
import { fi } from "./locales/fi";
import { fr } from "./locales/fr";
import { ja } from "./locales/ja";
import { ko } from "./locales/ko";
import { ru } from "./locales/ru";
import { zhHans } from "./locales/zh-Hans";
import { zhHant } from "./locales/zh-Hant";
import { localeOptions, translationKeys, type Locale, type TranslationKey, type Translations } from "./keys";

export type { Locale, LocaleOption, MessageFunctionKey, MessageParams, TranslationKey, Translations } from "./keys";
export { adviceSignalIds, adviceTranslationKeys, baseTranslationKeys, localeOptions, messageFunctionKeys, translationKeys } from "./keys";
export { formatMessage, renderAdvice } from "./format";

export const translations: Record<Locale, Translations> = {
  "zh-Hant": zhHant,
  "zh-Hans": zhHans,
  en,
  ja,
  ko,
  es,
  de,
  fr,
  ru,
  fi,
};

export function t(locale: Locale, key: TranslationKey): string {
  const table = translations[locale];
  if (!table) throw new Error(`Unsupported locale: ${String(locale)}`);
  const value = table[key];
  if (typeof value !== "string") throw new Error(`Missing translation: ${locale}.${key}`);
  if (!value.trim()) throw new Error(`Empty translation: ${locale}.${key}`);
  return value;
}

export function normalizeLocale(value: string | null | undefined): Locale {
  return localeOptions.some((option) => option.code === value) ? (value as Locale) : "zh-Hant";
}

export function assertCompleteTranslations(): void {
  for (const { code } of localeOptions) {
    const table = translations[code];
    for (const key of translationKeys) {
      t(code, key);
    }
    const extraKeys = Object.keys(table).filter((key) => !translationKeys.includes(key as TranslationKey));
    if (extraKeys.length) throw new Error(`Unknown translation keys in ${code}: ${extraKeys.join(", ")}`);
  }
}
