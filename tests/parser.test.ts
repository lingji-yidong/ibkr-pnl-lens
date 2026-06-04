import { readFile } from "node:fs/promises";
import assert from "node:assert/strict";
import { parseIbkrStatement } from "../src/domain/analytics";

const xml = await readFile("/Users/habseligkeiten/Downloads/Closed_Trades_Jan-Jun_2026 2.xml", "utf8");
const report = parseIbkrStatement(xml);

assert.equal(report.profile.maskedAccountId, "U******18");
assert.ok(report.trades.length > 100);
assert.ok(report.closedTrades.length > 50);
assert.equal(report.metrics.executionCount, 229);
assert.equal(report.metrics.canceledOrderCount, 0);
assert.ok(report.metrics.net < 0);
assert.ok(report.metrics.profitFactor > 0);
assert.ok(report.daily.length > 10);
assert.ok(report.symbols[0]?.symbol);
assert.ok(report.symbols.some((row) => row.symbol.startsWith("XSP ")));
assert.ok(!report.symbols.some((row) => ["C", "C;Ep", "C;L", "C;L;P", "C;Ex", "C;P"].includes(row.symbol)));
assert.ok(report.bestLoserWins.length >= 3);
assert.ok(report.metrics.autoExpiryCount > 0);
assert.ok(report.closedTrades.some((trade) => trade.autoExpiry && trade.code.includes("Ep")));
assert.ok(report.offlineAdvice.some((item) => item.title.includes("自動到期")));

console.log(JSON.stringify({
  trades: report.trades.length,
  closed: report.closedTrades.length,
  canceled: report.metrics.canceledOrderCount,
  net: Number(report.metrics.net.toFixed(2)),
  profitFactor: Number(report.metrics.profitFactor.toFixed(2)),
  winRate: Number((report.metrics.winRate * 100).toFixed(1)),
  topSymbol: report.symbols[0]?.symbol,
  autoExpiry: report.metrics.autoExpiryCount,
}, null, 2));
