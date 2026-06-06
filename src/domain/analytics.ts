import { parseFlexXml } from "./flexXml";
import type {
  AssetGroup,
  AssetGroupSummary,
  ClosedTrade,
  DailyPnl,
  FlexOrder,
  FlexTrade,
  MetricSummary,
  OptionUnderlyingDaySummary,
  ParsedStatement,
  PeriodPerformance,
  SymbolSummary,
} from "./types";

export function parseIbkrStatement(text: string, selectedAccountIndex = 0): ParsedStatement {
  const flex = parseFlexXml(text, selectedAccountIndex);
  const closedTrades = flex.trades.filter(isClosedTrade);
  const canceledOrders = flex.orders.filter(isCanceledOrder);
  const metrics = buildMetrics({
    trades: flex.trades,
    closedTrades,
    canceledOrders,
  });

  return {
    profile: flex.profile,
    accounts: flex.accounts,
    selectedAccountIndex: flex.selectedAccountIndex,
    trades: flex.trades,
    closedTrades,
    canceledOrders,
    metrics,
    daily: buildDaily(closedTrades),
    weekly: buildPeriodPerformance(closedTrades, weekLabel),
    monthly: buildPeriodPerformance(closedTrades, monthLabel),
    symbols: buildSymbols(closedTrades),
    assetGroups: buildAssetGroups(closedTrades),
    optionUnderlyingDays: buildOptionUnderlyingDays(closedTrades),
    optionTrades: buildOptionTrades(closedTrades),
  };
}

function isClosedTrade(trade: FlexTrade): trade is ClosedTrade {
  return trade.close || trade.realizedPnl !== 0;
}

function isCanceledOrder(row: FlexOrder): boolean {
  const status = [
    row.status,
    row.orderStatus,
    row.openCloseIndicator,
    row.notes,
    row.transactionType,
  ].join(" ");
  return /cancel|cancelled|canceled/i.test(status);
}

function buildMetrics({
  trades,
  closedTrades,
  canceledOrders,
}: {
  trades: FlexTrade[];
  closedTrades: ClosedTrade[];
  canceledOrders: FlexOrder[];
}): MetricSummary {
  const pnls = closedTrades.map((trade) => trade.realizedPnl).filter((value) => value !== 0);
  const wins = pnls.filter((value) => value > 0);
  const losses = pnls.filter((value) => value < 0);
  const grossProfit = sum(wins);
  const grossLoss = Math.abs(sum(losses));
  const net = sum(pnls);
  const avgWin = avg(wins);
  const avgLoss = Math.abs(avg(losses));
  const profitFactor = grossLoss ? grossProfit / grossLoss : grossProfit ? Infinity : 0;
  const payoffRatio = avgLoss ? avgWin / avgLoss : avgWin ? Infinity : 0;
  const winRate = pnls.length ? wins.length / pnls.length : 0;
  const expectancy = pnls.length ? net / pnls.length : 0;
  const commissions = Math.abs(sum(trades.map((trade) => trade.commission)));

  return {
    net,
    realizedTotal: net,
    grossProfit,
    grossLoss,
    tradeCount: trades.length,
    executionCount: trades.length,
    closedCount: pnls.length,
    canceledOrderCount: canceledOrders.length,
    winCount: wins.length,
    lossCount: losses.length,
    winRate,
    profitFactor,
    payoffRatio,
    avgWin,
    avgLoss,
    expectancy,
    commissions,
    endingNav: 0,
    deposits: 0,
    openPositions: 0,
    unrealizedPnl: 0,
    autoExpiryCount: closedTrades.filter((trade) => trade.autoExpiry).length,
  };
}

function buildDaily(closedTrades: ClosedTrade[]): DailyPnl[] {
  const byDay = new Map<string, Omit<DailyPnl, "cumulative">>();
  for (const trade of closedTrades) {
    if (!trade.day) continue;
    const current = byDay.get(trade.day) || { day: trade.day, pnl: 0, count: 0, wins: 0, losses: 0 };
    current.pnl += trade.realizedPnl;
    current.count += 1;
    if (trade.realizedPnl > 0) current.wins += 1;
    if (trade.realizedPnl < 0) current.losses += 1;
    byDay.set(trade.day, current);
  }

  let cumulative = 0;
  return [...byDay.values()]
    .sort((a, b) => a.day.localeCompare(b.day))
    .map((day) => {
      cumulative += day.pnl;
      return { ...day, cumulative };
    });
}

function buildPeriodPerformance(closedTrades: ClosedTrade[], getLabel: (trade: ClosedTrade) => string): PeriodPerformance[] {
  const byPeriod = new Map<string, { label: string; pnls: number[] }>();
  for (const trade of closedTrades) {
    if (!trade.day || trade.realizedPnl === 0) continue;
    const label = getLabel(trade);
    const current = byPeriod.get(label) || { label, pnls: [] };
    current.pnls.push(trade.realizedPnl);
    byPeriod.set(label, current);
  }

  return [...byPeriod.values()].sort((a, b) => a.label.localeCompare(b.label)).map(({ label, pnls }) => ({
    label,
    ...summarizePnls(pnls),
  }));
}

function weekLabel(trade: ClosedTrade): string {
  const date = new Date(`${trade.day}T00:00:00Z`);
  const mondayOffset = (date.getUTCDay() + 6) % 7;
  date.setUTCDate(date.getUTCDate() - mondayOffset);
  const start = date.toISOString().slice(0, 10);
  const end = new Date(date);
  end.setUTCDate(end.getUTCDate() + 6);
  return `${start} - ${end.toISOString().slice(5, 10)}`;
}

function monthLabel(trade: ClosedTrade): string {
  return trade.day.slice(0, 7);
}

function buildSymbols(closedTrades: ClosedTrade[]): SymbolSummary[] {
  const bySymbol = new Map<string, Omit<SymbolSummary, "winRate" | "average">>();
  for (const trade of closedTrades) {
    const key = trade.displaySymbol || trade.symbol || "";
    const current = bySymbol.get(key) || {
      symbol: key,
      assetClass: trade.assetClass,
      pnl: 0,
      count: 0,
      wins: 0,
      losses: 0,
    };
    current.pnl += trade.realizedPnl;
    current.count += 1;
    if (trade.realizedPnl > 0) current.wins += 1;
    if (trade.realizedPnl < 0) current.losses += 1;
    bySymbol.set(key, current);
  }

  return [...bySymbol.values()]
    .map((row) => ({
      ...row,
      winRate: row.count ? row.wins / row.count : 0,
      average: row.count ? row.pnl / row.count : 0,
    }))
    .sort((a, b) => Math.abs(b.pnl) - Math.abs(a.pnl));
}

function buildAssetGroups(closedTrades: ClosedTrade[]): AssetGroupSummary[] {
  const byGroup = new Map<AssetGroup, ClosedTrade[]>();
  for (const trade of closedTrades) {
    if (trade.realizedPnl === 0) continue;
    const group = assetGroup(trade);
    byGroup.set(group, [...(byGroup.get(group) || []), trade]);
  }

  const order: AssetGroup[] = ["option", "stock", "other"];
  return order
    .filter((group) => byGroup.has(group))
    .map((group) => {
      const trades = byGroup.get(group) || [];
      return {
        group,
        ...summarizePnls(trades.map((trade) => trade.realizedPnl)),
      };
    });
}

function buildOptionUnderlyingDays(closedTrades: ClosedTrade[]): OptionUnderlyingDaySummary[] {
  const byKey = new Map<string, { underlying: string; day: string; trades: ClosedTrade[] }>();
  for (const trade of closedTrades) {
    if (assetGroup(trade) !== "option" || !trade.day || trade.realizedPnl === 0) continue;
    const underlying = trade.underlyingSymbol || extractUnderlying(trade.displaySymbol) || "";
    const key = `${underlying}|${trade.day}`;
    const current = byKey.get(key) || { underlying, day: trade.day, trades: [] };
    current.trades.push(trade);
    byKey.set(key, current);
  }

  return [...byKey.values()]
    .map(({ underlying, day, trades }) => ({
      underlying,
      day,
      ...summarizePnls(trades.map((trade) => trade.realizedPnl)),
      autoExpiryCount: trades.filter((trade) => trade.autoExpiry).length,
    }))
    .sort((a, b) => Math.abs(b.pnl) - Math.abs(a.pnl));
}

function buildOptionTrades(closedTrades: ClosedTrade[]): ClosedTrade[] {
  return closedTrades
    .filter((trade) => assetGroup(trade) === "option" && trade.realizedPnl !== 0)
    .sort((a, b) => {
      const byDay = b.day.localeCompare(a.day);
      if (byDay) return byDay;
      return Math.abs(b.realizedPnl) - Math.abs(a.realizedPnl);
    });
}

function summarizePnls(pnls: number[]) {
  const wins = pnls.filter((value) => value > 0);
  const losses = pnls.filter((value) => value < 0);
  const grossProfit = sum(wins);
  const grossLoss = Math.abs(sum(losses));
  const avgWin = avg(wins);
  const avgLoss = Math.abs(avg(losses));
  const pnl = sum(pnls);

  return {
    pnl,
    grossProfit,
    grossLoss,
    profitFactor: grossLoss ? grossProfit / grossLoss : grossProfit ? Infinity : 0,
    payoffRatio: avgLoss ? avgWin / avgLoss : avgWin ? Infinity : 0,
    winRate: pnls.length ? wins.length / pnls.length : 0,
    count: pnls.length,
    wins: wins.length,
    losses: losses.length,
    average: pnls.length ? pnl / pnls.length : 0,
  };
}

function assetGroup(trade: FlexTrade): AssetGroup {
  const source = `${trade.assetClass} ${trade.putCall} ${trade.expiry} ${trade.strike} ${trade.rawSymbol} ${trade.displaySymbol}`.toLowerCase();
  if (source.includes("option") || trade.putCall || trade.expiry || trade.strike) return "option";
  if (source.includes("stock")) return "stock";
  return "other";
}

function extractUnderlying(symbol: string): string {
  return symbol.trim().split(/\s+/)[0] || "";
}

function sum(values: number[]): number {
  return values.reduce((total, value) => total + (Number.isFinite(value) ? value : 0), 0);
}

function avg(values: number[]): number {
  return values.length ? sum(values) / values.length : 0;
}
