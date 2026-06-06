import { money, percent, ratio } from "./format";
import { parseFlexXml } from "./flexXml";
import type {
  AssetGroup,
  AssetGroupSummary,
  ClosedTrade,
  DailyPnl,
  FlexOrder,
  FlexTrade,
  Insight,
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
    discipline: buildDiscipline(closedTrades),
    bestLoserWins: buildBestLoserWins({ closedTrades, metrics }),
    offlineAdvice: buildOfflineAdvice({ closedTrades, metrics }),
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
  return /cancel|cancelled|canceled|取消/i.test(status);
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
    const key = trade.displaySymbol || trade.symbol || "Unknown";
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
        label: assetGroupLabel(group),
        ...summarizePnls(trades.map((trade) => trade.realizedPnl)),
      };
    });
}

function buildOptionUnderlyingDays(closedTrades: ClosedTrade[]): OptionUnderlyingDaySummary[] {
  const byKey = new Map<string, { underlying: string; day: string; trades: ClosedTrade[] }>();
  for (const trade of closedTrades) {
    if (assetGroup(trade) !== "option" || !trade.day || trade.realizedPnl === 0) continue;
    const underlying = trade.underlyingSymbol || extractUnderlying(trade.displaySymbol) || "Unknown";
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

function buildDiscipline(closedTrades: ClosedTrade[]): Insight[] {
  const daily = buildDaily(closedTrades);
  const counts = daily.map((day) => day.count).sort((a, b) => a - b);
  const p75 = counts.length ? counts[Math.floor((counts.length - 1) * 0.75)] ?? 0 : 0;
  const biggestLoss = daily.reduce<DailyPnl | null>((worst, day) => (worst === null || day.pnl < worst.pnl ? day : worst), null);
  const overTradeDays = daily.filter((day) => day.count > Math.max(4, p75) && day.pnl < 0);
  const expiryLosses = closedTrades.filter((trade) => trade.expired && trade.realizedPnl < 0);
  const autoExpiryLosses = closedTrades.filter((trade) => trade.autoExpiry && trade.realizedPnl < 0);
  const smallWins = closedTrades.filter((trade) => trade.realizedPnl > 0 && trade.realizedPnl < 10);
  const largeLosses = closedTrades.filter((trade) => trade.realizedPnl < -100);
  const insights: Insight[] = [];

  if (biggestLoss) {
    insights.push({
      title: `最大單日虧損 ${money(biggestLoss.pnl)}`,
      body: `${biggestLoss.day} 有 ${biggestLoss.count} 筆平倉，當天結果對總績效影響最大。`,
    });
  }
  if (overTradeDays.length) {
    insights.push({
      title: "虧損日交易頻率偏高",
      body: `${overTradeDays.length} 天同時出現高交易數與負損益，可檢查是否有加碼追回或連續試單。`,
    });
  }
  if (expiryLosses.length) {
    insights.push({
      title: "到期/行權造成的歸零風險",
      body: `${expiryLosses.length} 筆平倉帶有到期或行權代碼且為虧損，適合設定最晚離場時間。`,
    });
  }
  if (autoExpiryLosses.length) {
    insights.push({
      title: "自動到期被完整計入",
      body: `${autoExpiryLosses.length} 筆 Ep 自動到期虧損已納入統計；這些不是資料錯誤，而是需要單獨復盤的歸零交易。`,
    });
  }
  if (smallWins.length > largeLosses.length && largeLosses.length) {
    insights.push({
      title: "小賺大虧結構",
      body: `小額盈利 ${smallWins.length} 筆，大額虧損 ${largeLosses.length} 筆；盈虧比比勝率更需要優先改善。`,
    });
  }
  if (!insights.length) {
    insights.push({
      title: "暫無明顯紀律警訊",
      body: "目前樣本未觸發高頻虧損、到期歸零或明顯小賺大虧規則。",
    });
  }

  return insights;
}

function buildBestLoserWins({ closedTrades, metrics }: { closedTrades: ClosedTrade[]; metrics: MetricSummary }): Insight[] {
  const losers = closedTrades.filter((trade) => trade.realizedPnl < 0);
  const winners = closedTrades.filter((trade) => trade.realizedPnl > 0);
  const largeLossThreshold = Math.max(metrics.avgWin, 100);
  const largeLosses = losers.filter((trade) => Math.abs(trade.realizedPnl) > largeLossThreshold);
  const tinyWins = winners.filter((trade) => trade.realizedPnl < metrics.avgLoss * 0.25);
  const guidance: Insight[] = [
    {
      title: "先練習成為好的輸家",
      body: "把虧損視為執行成本，而不是需要立刻贏回來的錯誤；重點是這筆虧損是否符合預先定義的風險。",
    },
    {
      title: "用盈虧比約束衝動",
      body: `目前平均盈利 ${money(metrics.avgWin)}、平均虧損 ${money(metrics.avgLoss)}；進場前要能說清楚目標回報是否足以覆蓋常見虧損。`,
    },
    {
      title: "虧損後降低速度",
      body: "連續虧損或最大單日虧損後，下一筆交易應先縮小尺寸或暫停，讓決策重新回到計畫，而不是情緒。",
    },
  ];

  if (largeLosses.length) {
    guidance.push({
      title: "防止單筆虧損定義整段績效",
      body: `${largeLosses.length} 筆虧損大於 ${money(largeLossThreshold)}，適合加入硬停損、最晚離場時間、或單日最大虧損熔斷。`,
    });
  }
  if (tinyWins.length > winners.length * 0.35 && metrics.avgLoss > metrics.avgWin) {
    guidance.push({
      title: "別急著拿走小盈利",
      body: "小額獲利比例偏高且平均虧損較大，代表心理上可能更願意兌現舒服感，而不是等待合理回報。",
    });
  }

  return guidance;
}

function buildOfflineAdvice({ closedTrades, metrics }: { closedTrades: ClosedTrade[]; metrics: MetricSummary }): Insight[] {
  const autoExpiry = closedTrades.filter((trade) => trade.autoExpiry);
  const bigLosses = closedTrades.filter((trade) => trade.realizedPnl < -Math.max(100, metrics.avgWin));
  const advice: Insight[] = [
    {
      title: "先看 Profit Factor，再看勝率",
      body: `目前 Profit Factor ${ratio(metrics.profitFactor)}，勝率 ${percent(metrics.winRate)}。若 PF 低於 1，勝率再接近五成也不足以抵消平均虧損。`,
    },
    {
      title: "盈虧比要高於舒適區",
      body: `平均盈利 ${money(metrics.avgWin)}，平均虧損 ${money(metrics.avgLoss)}。下一步不是增加交易數，而是提高單筆盈利相對於虧損的幅度。`,
    },
    {
      title: "虧損日設熔斷",
      body: "若當日連續虧損或達到預設最大虧損，停止開新倉。這比事後靠意志力控制更可靠。",
    },
  ];

  if (autoExpiry.length) {
    advice.push({
      title: "自動到期要當成一類策略結果",
      body: `${autoExpiry.length} 筆自動到期交易已被納入。建議單獨追蹤 Ep 交易的總虧損、平均持倉時間與最後可接受離場時間。`,
    });
  }
  if (bigLosses.length) {
    advice.push({
      title: "大虧損優先處理",
      body: `${bigLosses.length} 筆虧損超過 ${money(Math.max(100, metrics.avgWin))}。先把尾部虧損砍短，通常比提升勝率更快改善盈虧比。`,
    });
  }

  return advice;
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
  if (source.includes("option") || source.includes("期權") || trade.putCall || trade.expiry || trade.strike) return "option";
  if (source.includes("stock") || source.includes("股票")) return "stock";
  return "other";
}

function assetGroupLabel(group: AssetGroup): string {
  const labels: Record<AssetGroup, string> = {
    option: "期權",
    stock: "股票",
    other: "其他",
  };
  return labels[group];
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
