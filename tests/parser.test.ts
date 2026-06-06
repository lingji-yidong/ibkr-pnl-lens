import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { parseIbkrStatement } from "../src/domain/analytics";
import { buildAdviceSignals } from "../src/ui/advice";

const xml = await readFile(
  new URL("./fixtures/sample-ibkr-statement.xml", import.meta.url),
  "utf8",
);

const multiAccountXml = `
<FlexStatements>
  <FlexStatement accountId="DEMO-A" fromDate="20260101" toDate="20260131">
    <Trades>
      <Trade assetCategory="STK" currency="USD" symbol="AAA" description="AAA" underlyingSymbol="AAA" dateTime="20260102;100000" tradeDate="20260102" quantity="1" tradePrice="10" proceeds="10" ibCommission="-1" cost="0" fifoPnlRealized="125" mtmPnl="125" openCloseIndicator="C" notes="P" transactionType="Sell" />
    </Trades>
    <Orders>
      <Order status="Submitted" transactionType="Buy" />
    </Orders>
  </FlexStatement>
  <FlexStatement accountId="DEMO-B" fromDate="20260101" toDate="20260131">
    <Trades>
      <Trade assetCategory="STK" currency="USD" symbol="BBB" description="BBB" underlyingSymbol="BBB" dateTime="20260103;100000" tradeDate="20260103" quantity="1" tradePrice="10" proceeds="10" ibCommission="-1" cost="100" fifoPnlRealized="-75" mtmPnl="-75" openCloseIndicator="C" notes="L" transactionType="Sell" />
    </Trades>
    <Orders>
      <Order status="Canceled" transactionType="Buy" />
    </Orders>
  </FlexStatement>
</FlexStatements>
`;

const xmlWithMisleadingClosedLot = `
<FlexStatement accountId="DEMO-META" fromDate="20260101" toDate="20260131">
  <Trades>
    <Trade assetCategory="STK" currency="USD" symbol="META" description="META" underlyingSymbol="META" dateTime="20260115;100000" tradeDate="20260115" quantity="1" tradePrice="500" proceeds="500" ibCommission="-1" cost="450" fifoPnlRealized="50" mtmPnl="50" openCloseIndicator="C" notes="P" transactionType="Sell" />
  </Trades>
  <ClosedLots>
    <Lot symbol="META" fifoPnlRealized="-9999" proceeds="-9999" />
  </ClosedLots>
</FlexStatement>
`;

const xmlWithMultipleMetaOptionLots = `
<FlexStatement accountId="DEMO-META" fromDate="20260528" toDate="20260604">
  <Trades>
    <Trade assetCategory="OPT" currency="USD" symbol="META  260717C00750000" description="META 17JUL26 750 C" underlyingSymbol="META" dateTime="20260528;093730" tradeDate="20260528" quantity="1" tradePrice="5.1904825" proceeds="-519.04825" ibCommission="0" netCash="-519.04825" cost="519.04825" fifoPnlRealized="0" mtmPnl="0" openCloseIndicator="O" transactionType="ExchTrade" expiry="20260717" putCall="C" strike="750" multiplier="100" />
    <Trade assetCategory="OPT" currency="USD" symbol="META  260717C00750000" description="META 17JUL26 750 C" underlyingSymbol="META" dateTime="20260601;101045" tradeDate="20260601" quantity="1" tradePrice="3.85" proceeds="-385" ibCommission="-0.76825" netCash="-385.76825" cost="385.76825" fifoPnlRealized="0" mtmPnl="32.5" openCloseIndicator="O" transactionType="ExchTrade" expiry="20260717" putCall="C" strike="750" multiplier="100" />
    <Trade assetCategory="OPT" currency="USD" symbol="META  260717C00750000" description="META 17JUL26 750 C" underlyingSymbol="META" dateTime="20260604;093351" tradeDate="20260604" quantity="-1" tradePrice="5.2" proceeds="520" ibCommission="-0.782252" netCash="519.217748" cost="-519.04825" fifoPnlRealized="0.169498" mtmPnl="152.5" openCloseIndicator="C" transactionType="ExchTrade" expiry="20260717" putCall="C" strike="750" multiplier="100" />
  </Trades>
  <ClosedLots>
    <Lot symbol="META  260717C00750000" fifoPnlRealized="0.169498" />
  </ClosedLots>
</FlexStatement>
`;

const report = parseIbkrStatement(xml);
const multiAccountReport = parseIbkrStatement(multiAccountXml);
const secondAccountReport = parseIbkrStatement(multiAccountXml, 1);
const misleadingLotReport = parseIbkrStatement(xmlWithMisleadingClosedLot);
const multipleMetaLotsReport = parseIbkrStatement(xmlWithMultipleMetaOptionLots);

// Basic parsing
assert.ok(report.profile.maskedAccountId.includes("*"));
assert.ok(report.trades.length > 0);
assert.ok(report.closedTrades.length > 0);
assert.equal(multiAccountReport.accounts.length, 2);
assert.equal(multiAccountReport.selectedAccountIndex, 0);
assert.equal(secondAccountReport.selectedAccountIndex, 1);
assert.equal(multiAccountReport.trades.length, 1);
assert.equal(secondAccountReport.trades.length, 1);
assert.equal(multiAccountReport.metrics.net, 125);
assert.equal(secondAccountReport.metrics.net, -75);
assert.equal(multiAccountReport.metrics.canceledOrderCount, 0);
assert.equal(secondAccountReport.metrics.canceledOrderCount, 1);
assert.equal(misleadingLotReport.metrics.net, 50);
assert.equal(misleadingLotReport.metrics.executionCount, 1);
assert.equal(misleadingLotReport.metrics.closedCount, 1);
assert.equal(misleadingLotReport.metrics.winRate, 1);
assert.equal(misleadingLotReport.metrics.payoffRatio, Infinity);
assert.equal(round2(multipleMetaLotsReport.metrics.net), 133.45);
assert.equal(multipleMetaLotsReport.metrics.closedCount, 1);
assert.equal(round2(multipleMetaLotsReport.closedTrades[0]?.fifoRealizedPnl || 0), 0.17);
assert.equal(round2(multipleMetaLotsReport.closedTrades[0]?.realizedPnl || 0), 133.45);

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

// Strategy / advice signals should stay in the UI boundary.
const advice = buildAdviceSignals(report);
assert.ok(Array.isArray(advice.bestLoserWins));
assert.ok(Array.isArray(advice.offlineAdvice));
assert.ok(advice.discipline.every((signal) => signal.id && signal.group === "discipline"));

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
