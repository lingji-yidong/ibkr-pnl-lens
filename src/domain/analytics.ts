import { parseFlexXml } from "./flexXml.js";
import type {
  AssetGroup,
  AssetGroupSummary,
  ClosedTrade,
  ClosedPositionSlice,
  DirectionSummary,
  DailyPnl,
  FlexOrder,
  FlexTrade,
  HoldingBucket,
  HoldingPeriodSummary,
  MetricSummary,
  OptionUnderlyingDaySummary,
  ParsedStatement,
  PositionDirection,
  PeriodPerformance,
  SymbolSummary,
} from "./types.js";

export function parseIbkrStatement(text: string, selectedAccountIndex = 0): ParsedStatement {
  const flex = parseFlexXml(text, selectedAccountIndex);
  const closedTrades = flex.trades.filter(isClosedTrade);
  const canceledOrders = flex.orders.filter(isCanceledOrder);
  const positionAnalytics = buildPositionAnalytics(flex.trades);
  const metrics = buildMetrics({
    trades: flex.trades,
    closedTrades,
    canceledOrders,
    closedPositionSlices: positionAnalytics.closedPositionSlices,
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
    closedPositionSlices: positionAnalytics.closedPositionSlices,
    holdingPeriods: positionAnalytics.holdingPeriods,
    directionSummaries: positionAnalytics.directionSummaries,
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
  closedPositionSlices,
}: {
  trades: FlexTrade[];
  closedTrades: ClosedTrade[];
  canceledOrders: FlexOrder[];
  closedPositionSlices: ClosedPositionSlice[];
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
  const medianHoldingDays = median(closedPositionSlices.map((slice) => slice.holdingDays));

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
    medianHoldingDays,
    holdingSampleCount: closedPositionSlices.length,
  };
}

interface PositionAnalytics {
  closedPositionSlices: ClosedPositionSlice[];
  holdingPeriods: HoldingPeriodSummary[];
  directionSummaries: DirectionSummary[];
}

interface OpenPositionLot {
  remaining: number;
  direction: PositionDirection;
  openedAt: Date | null;
  openDay: string;
}

function buildPositionAnalytics(trades: FlexTrade[]): PositionAnalytics {
  const stacks = new Map<string, OpenPositionLot[]>();
  const closedPositionSlices: ClosedPositionSlice[] = [];

  for (const trade of [...trades].sort((a, b) => tradeTime(a) - tradeTime(b))) {
    const quantity = Math.abs(trade.quantity);
    if (!quantity) continue;

    const key = positionKey(trade);
    if (!trade.close) {
      const stack = stacks.get(key) || [];
      stack.push({
        remaining: quantity,
        direction: trade.quantity >= 0 ? "long" : "short",
        openedAt: trade.date,
        openDay: trade.day,
      });
      stacks.set(key, stack);
      continue;
    }

    const stack = stacks.get(key) || [];
    let remaining = quantity;
    while (remaining > 0 && stack.length) {
      const lot = stack[stack.length - 1];
      if (!lot) break;
      const matched = Math.min(remaining, lot.remaining);
      const pnl = quantity ? trade.realizedPnl * (matched / quantity) : trade.realizedPnl;
      const holdingDays = holdingDaysBetween(lot.openedAt, trade.date);
      if (holdingDays !== null) {
        closedPositionSlices.push({
          symbol: trade.displaySymbol || trade.rawSymbol || "",
          assetClass: trade.assetClass,
          direction: lot.direction,
          openDay: lot.openDay,
          closeDay: trade.day,
          holdingDays,
          quantity: matched,
          pnl,
        });
      }
      lot.remaining -= matched;
      remaining -= matched;
      if (lot.remaining <= 1e-8) stack.pop();
    }
    stacks.set(key, stack);
  }

  return {
    closedPositionSlices,
    holdingPeriods: buildHoldingPeriods(closedPositionSlices),
    directionSummaries: buildDirectionSummaries(closedPositionSlices),
  };
}

function positionKey(trade: FlexTrade): string {
  return [
    trade.currency,
    trade.rawSymbol || trade.displaySymbol,
    trade.expiry,
    trade.putCall,
    trade.strike,
  ].join("|");
}

function tradeTime(trade: FlexTrade): number {
  return trade.date?.getTime() ?? 0;
}

function holdingDaysBetween(openedAt: Date | null, closedAt: Date | null): number | null {
  if (!openedAt || !closedAt) return null;
  const diff = closedAt.getTime() - openedAt.getTime();
  if (!Number.isFinite(diff) || diff < 0) return null;
  return Math.max(0, diff / 86_400_000);
}

function buildHoldingPeriods(slices: ClosedPositionSlice[]): HoldingPeriodSummary[] {
  const byBucket = new Map<HoldingBucket, ClosedPositionSlice[]>();
  for (const slice of slices) {
    const bucket = holdingBucket(slice.holdingDays);
    byBucket.set(bucket, [...(byBucket.get(bucket) || []), slice]);
  }

  const order: HoldingBucket[] = ["intraday", "swing", "position", "long_term"];
  return order
    .filter((bucket) => byBucket.has(bucket))
    .map((bucket) => summarizePositionSlices(bucket, byBucket.get(bucket) || []));
}

function buildDirectionSummaries(slices: ClosedPositionSlice[]): DirectionSummary[] {
  const byDirection = new Map<PositionDirection, ClosedPositionSlice[]>();
  for (const slice of slices) {
    byDirection.set(slice.direction, [...(byDirection.get(slice.direction) || []), slice]);
  }

  return (["long", "short"] as const)
    .filter((direction) => byDirection.has(direction))
    .map((direction) => ({
      direction,
      ...summarizePositionSliceValues(byDirection.get(direction) || []),
    }));
}

function summarizePositionSlices(bucket: HoldingBucket, slices: ClosedPositionSlice[]): HoldingPeriodSummary {
  return {
    bucket,
    ...summarizePositionSliceValues(slices),
  };
}

function summarizePositionSliceValues(slices: ClosedPositionSlice[]) {
  return {
    ...summarizePnls(slices.map((slice) => slice.pnl).filter((value) => value !== 0)),
    medianHoldingDays: median(slices.map((slice) => slice.holdingDays)),
  };
}

function holdingBucket(days: number): HoldingBucket {
  if (days < 1) return "intraday";
  if (days <= 7) return "swing";
  if (days <= 30) return "position";
  return "long_term";
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

function median(values: number[]): number {
  const sorted = values.filter(Number.isFinite).sort((a, b) => a - b);
  if (!sorted.length) return 0;
  const middle = Math.floor(sorted.length / 2);
  if (sorted.length % 2) return sorted[middle] || 0;
  return ((sorted[middle - 1] || 0) + (sorted[middle] || 0)) / 2;
}
