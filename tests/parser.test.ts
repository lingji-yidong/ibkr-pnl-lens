import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { parseIbkrStatement } from "../src/domain/analytics";

const xml = await readFile(
  new URL("./fixtures/sample-ibkr-statement.xml", import.meta.url),
  "utf8",
);

const report = parseIbkrStatement(xml);

// Basic parsing
assert.ok(report.profile.maskedAccountId.includes("*"));
assert.ok(report.trades.length > 0);
assert.ok(report.closedTrades.length > 0);

// Metrics should be internally valid
assert.ok(Number.isFinite(report.metrics.net));
assert.ok(Number.isFinite(report.metrics.profitFactor));
assert.ok(Number.isFinite(report.metrics.winRate));
assert.ok(report.metrics.executionCount > 0);
assert.ok(report.metrics.canceledOrderCount >= 0);

// Time buckets should be generated
assert.ok(report.daily.length > 0);
assert.ok(report.weekly.length > 0);
assert.ok(report.monthly.length > 0);

// Weekly/monthly PnL should reconcile with total net PnL
assert.equal(
  round2(report.weekly.reduce((total, row) => total + row.pnl, 0)),
  round2(report.metrics.net),
);

assert.equal(
  round2(report.monthly.reduce((total, row) => total + row.pnl, 0)),
  round2(report.metrics.net),
);

// Win/loss counts should reconcile inside each bucket
assert.ok(report.weekly.every((row) => row.count === row.wins + row.losses));
assert.ok(report.monthly.every((row) => row.count === row.wins + row.losses));

// Asset and option-focused buckets should be available for review
assert.ok(report.assetGroups.some((row) => row.group === "option"));
assert.ok(report.assetGroups.some((row) => row.group === "stock"));
assert.ok(report.optionUnderlyingDays.length > 0);

// Symbols should be parsed and cleaned
assert.ok(report.symbols.length > 0);
assert.ok(report.symbols.every((row) => row.symbol.trim().length > 0));

assert.ok(
  !report.symbols.some((row) =>
    ["C", "C;Ep", "C;L", "C;L;P", "C;Ex", "C;P"].includes(row.symbol),
  ),
);

// Strategy / advice sections should be structurally valid
assert.ok(Array.isArray(report.bestLoserWins));
assert.ok(Array.isArray(report.offlineAdvice));

if (report.metrics.autoExpiryCount > 0) {
  assert.ok(
    report.closedTrades.some(
      (trade) => trade.autoExpiry && trade.code.includes("Ep"),
    ),
  );
}

console.log(
  JSON.stringify(
    {
      trades: report.trades.length,
      closed: report.closedTrades.length,
      canceled: report.metrics.canceledOrderCount,
      net: Number(report.metrics.net.toFixed(2)),
      profitFactor: Number(report.metrics.profitFactor.toFixed(2)),
      winRate: Number((report.metrics.winRate * 100).toFixed(1)),
      topSymbol: report.symbols[0]?.symbol,
      autoExpiry: report.metrics.autoExpiryCount,
      weeks: report.weekly.length,
      months: report.monthly.length,
      assetGroups: report.assetGroups.map((row) => row.group),
      optionDays: report.optionUnderlyingDays.length,
    },
    null,
    2,
  ),
);

function round2(value: number): number {
  return Number(value.toFixed(2));
}
