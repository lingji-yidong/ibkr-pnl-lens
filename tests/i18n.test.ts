import assert from "node:assert/strict";
import { localeOptions, t, translationKeys, translations } from "../src/ui/i18n";

for (const { code } of localeOptions) {
  const table = translations[code];
  assert.equal(Object.keys(table).length, translationKeys.length, `${code} should expose every translation key`);

  for (const key of translationKeys) {
    const value = t(code, key);
    assert.equal(typeof value, "string", `${code}.${key} should be a string`);
    assert.ok(value.trim().length > 0, `${code}.${key} should not be empty`);
  }

  assert.notEqual(t(code, "neutralName"), "Name", `${code}.neutralName must stay anonymized`);
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
