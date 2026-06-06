import assert from "node:assert/strict";
import { localeOptions, t, translationKeys, translations } from "../src/ui/i18n";

const optionReviewTitles = {
  "zh-Hant": "期權標的復盤",
  "zh-Hans": "期权标的复盘",
  en: "Option review by underlying",
  ja: "原資産別オプション復盤",
  ko: "기초자산별 옵션 리뷰",
  es: "Opciones por subyacente",
  de: "Optionen nach Basiswert",
  fr: "Options par sous-jacent",
  ru: "Опционы по базовому активу",
  fi: "Optiot kohde-etuuden mukaan",
};

const symbolLeaderboardTitles = {
  "zh-Hant": "標的排行榜",
  "zh-Hans": "标的排行榜",
  en: "Symbol leaderboard",
  ja: "銘柄ランキング",
  ko: "종목 순위",
  es: "Clasificación de símbolos",
  de: "Symbol-Rangliste",
  fr: "Classement des symboles",
  ru: "Рейтинг символов",
  fi: "Symbolien ranking",
};

for (const { code } of localeOptions) {
  const table = translations[code];
  assert.equal(Object.keys(table).length, translationKeys.length, `${code} should expose every translation key`);

  for (const key of translationKeys) {
    const value = t(code, key);
    assert.equal(typeof value, "string", `${code}.${key} should be a string`);
    assert.ok(value.trim().length > 0, `${code}.${key} should not be empty`);
  }

  assert.notEqual(t(code, "neutralName"), "Name", `${code}.neutralName must stay anonymized`);
  assert.equal(t(code, "optionReviewTitle"), optionReviewTitles[code], `${code}.optionReviewTitle should match aggregate design`);
  assert.equal(t(code, "symbolPerformance"), symbolLeaderboardTitles[code], `${code}.symbolPerformance should match leaderboard design`);
}

console.log(
  JSON.stringify(
    {
      locales: localeOptions.length,
      keys: translationKeys.length,
    },
    null,
    2,
  ),
);
