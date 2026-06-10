import { de } from "./locales/de.js";
import { en } from "./locales/en.js";
import { es } from "./locales/es.js";
import { fi } from "./locales/fi.js";
import { fr } from "./locales/fr.js";
import { ja } from "./locales/ja.js";
import { ko } from "./locales/ko.js";
import { ru } from "./locales/ru.js";
import { zhHans } from "./locales/zh-Hans.js";
import { zhHant } from "./locales/zh-Hant.js";
import { localeOptions, translationKeys, type Locale, type TranslationKey, type Translations } from "./keys.js";

export type { Locale, LocaleOption, MessageFunctionKey, MessageParams, TranslationKey, Translations } from "./keys.js";
export { adviceSignalIds, adviceTranslationKeys, baseTranslationKeys, localeOptions, messageFunctionKeys, translationKeys } from "./keys.js";
export { formatMessage, renderAdvice } from "./format.js";

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
