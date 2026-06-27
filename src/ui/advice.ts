import type { OptionUnderlyingDaySummary, ParsedStatement } from "../domain/types.js";

export type AdviceGroup = "discipline" | "bestLoserWins" | "offlineAdvice";
export type AdviceSeverity = "info" | "warning" | "danger";

export type AdviceSignal =
  | AdviceSignalOf<"profit_factor_below_one", "discipline", { profitFactor: number }>
  | AdviceSignalOf<"profit_factor_thin_edge", "discipline", { profitFactor: number }>
  | AdviceSignalOf<"profit_factor_healthy", "discipline", { profitFactor: number }>
  | AdviceSignalOf<"winrate_and_payoff_weak", "discipline", { winRate: number; payoffRatio: number }>
  | AdviceSignalOf<"high_winrate_weak_payoff", "discipline", { winRate: number; payoffRatio: number }>
  | AdviceSignalOf<"overtrade_loss_days", "discipline", { days: number }>
  | AdviceSignalOf<"auto_expiry_losses", "discipline", { count: number }>
  | AdviceSignalOf<"good_loser_base", "bestLoserWins", { avgWin: number; avgLoss: number }>
  | AdviceSignalOf<"detach_outcome_from_ego", "bestLoserWins", Record<string, never>>
  | AdviceSignalOf<"large_tail_losses", "bestLoserWins", { count: number; threshold: number }>
  | AdviceSignalOf<"asset_group_relative_edge", "offlineAdvice", { stronger: "option" | "stock"; optionProfitFactor: number; stockProfitFactor: number }>
  | AdviceSignalOf<"option_sample_dominant", "offlineAdvice", { optionProfitFactor: number; optionWinRate: number }>
  | AdviceSignalOf<"stock_sample_dominant", "offlineAdvice", { stockProfitFactor: number; stockWinRate: number }>
  | AdviceSignalOf<"weak_option_underlying_days", "offlineAdvice", { rows: OptionUnderlyingDaySummary[] }>
  | AdviceSignalOf<"clean_sample", "offlineAdvice", Record<string, never>>;

export type AdviceSignalId = AdviceSignal["id"];

export interface AdviceSignalBundle {
  discipline: AdviceSignal[];
  bestLoserWins: AdviceSignal[];
  offlineAdvice: AdviceSignal[];
}

type AdviceSignalOf<Id extends string, Group extends AdviceGroup, Data extends Record<string, unknown>> = {
  id: Id;
  group: Group;
  severity: AdviceSeverity;
  data: Data;
};

interface AdviceContext {
  report: ParsedStatement;
  metrics: ParsedStatement["metrics"];
  option?: ParsedStatement["assetGroups"][number];
  stock?: ParsedStatement["assetGroups"][number];
  autoExpiryLossCount: number;
  largeLossThreshold: number;
  largeLossCount: number;
  overTradeLossDayCount: number;
  weakOptionUnderlyingDays: OptionUnderlyingDaySummary[];
}

export const adviceSignalIds = [
  "profit_factor_below_one",
  "profit_factor_thin_edge",
  "profit_factor_healthy",
  "winrate_and_payoff_weak",
  "high_winrate_weak_payoff",
  "overtrade_loss_days",
  "auto_expiry_losses",
  "good_loser_base",
  "detach_outcome_from_ego",
  "large_tail_losses",
  "asset_group_relative_edge",
  "option_sample_dominant",
  "stock_sample_dominant",
  "weak_option_underlying_days",
  "clean_sample",
] as const satisfies readonly AdviceSignalId[];

export function buildAdviceSignals(report: ParsedStatement): AdviceSignalBundle {
  const signals = buildSignals(buildAdviceContext(report));
  return {
    discipline: signals.filter((signal) => signal.group === "discipline"),
    bestLoserWins: signals.filter((signal) => signal.group === "bestLoserWins"),
    offlineAdvice: signals.filter((signal) => signal.group === "offlineAdvice"),
  };
}

function buildAdviceContext(report: ParsedStatement): AdviceContext {
  const { metrics } = report;
  const option = report.assetGroups.find((row) => row.group === "option");
  const stock = report.assetGroups.find((row) => row.group === "stock");
  const closedTrades = report.closedTrades ?? [];
  const daily = report.daily ?? [];
  const avgWin = Math.max(0, safeNumber(metrics.avgWin));
  const largeLossThreshold = Math.max(100, avgWin);

  return {
    report,
    metrics,
    option,
    stock,
    autoExpiryLossCount: closedTrades.filter((trade) => trade.autoExpiry && safeNumber(trade.realizedPnl) < 0).length,
    largeLossThreshold,
    largeLossCount: closedTrades.filter((trade) => safeNumber(trade.realizedPnl) < -largeLossThreshold).length,
    overTradeLossDayCount: daily.filter((day) => safeNumber(day.count) >= 6 && safeNumber(day.pnl) < 0).length,
    weakOptionUnderlyingDays: (report.optionUnderlyingDays ?? [])
      .filter((row) => safeNumber(row.count) >= 3 && safeNumber(row.profitFactor) < 1)
      .slice(0, 2),
  };
}

function buildSignals(context: AdviceContext): AdviceSignal[] {
  const signals: AdviceSignal[] = [buildProfitFactorSignal(context)];
  const payoffSignal = buildPayoffSignal(context);
  if (payoffSignal) signals.push(payoffSignal);

  if (context.overTradeLossDayCount > 0) {
    signals.push(signal("overtrade_loss_days", "discipline", "warning", { days: context.overTradeLossDayCount }));
  }
  if (context.autoExpiryLossCount > 0) {
    signals.push(signal("auto_expiry_losses", "discipline", "warning", { count: context.autoExpiryLossCount }));
  }

  signals.push(signal("good_loser_base", "bestLoserWins", "info", {
    avgWin: safeNumber(context.metrics.avgWin),
    avgLoss: safeNumber(context.metrics.avgLoss),
  }));
  signals.push(signal("detach_outcome_from_ego", "bestLoserWins", "info", {}));

  if (context.largeLossCount > 0) {
    signals.push(signal("large_tail_losses", "bestLoserWins", "danger", {
      count: context.largeLossCount,
      threshold: context.largeLossThreshold,
    }));
  }

  const assetSignal = buildAssetSignal(context);
  if (assetSignal) signals.push(assetSignal);
  if (context.weakOptionUnderlyingDays.length > 0) {
    signals.push(signal("weak_option_underlying_days", "offlineAdvice", "warning", { rows: context.weakOptionUnderlyingDays }));
  }
  if (!signals.some((item) => item.group === "offlineAdvice")) {
    signals.push(signal("clean_sample", "offlineAdvice", "info", {}));
  }

  return signals;
}

function buildProfitFactorSignal(context: AdviceContext): AdviceSignal {
  const profitFactor = safeRatioNumber(context.metrics.profitFactor);
  if (profitFactor < 1) return signal("profit_factor_below_one", "discipline", "danger", { profitFactor });
  if (profitFactor < 1.5) return signal("profit_factor_thin_edge", "discipline", "warning", { profitFactor });
  return signal("profit_factor_healthy", "discipline", "info", { profitFactor });
}

function buildPayoffSignal(context: AdviceContext): AdviceSignal | undefined {
  const winRate = safeNumber(context.metrics.winRate);
  const payoffRatio = safeRatioNumber(context.metrics.payoffRatio);
  if (payoffRatio >= 1) return undefined;
  if (winRate < 0.55) return signal("winrate_and_payoff_weak", "discipline", "danger", { winRate, payoffRatio });
  return signal("high_winrate_weak_payoff", "discipline", "warning", { winRate, payoffRatio });
}

function buildAssetSignal(context: AdviceContext): AdviceSignal | undefined {
  const { option, stock } = context;
  if (option && stock) {
    const optionProfitFactor = safeRatioNumber(option.profitFactor);
    const stockProfitFactor = safeRatioNumber(stock.profitFactor);
    return signal("asset_group_relative_edge", "offlineAdvice", "info", {
      stronger: optionProfitFactor >= stockProfitFactor ? "option" : "stock",
      optionProfitFactor,
      stockProfitFactor,
    });
  }
  if (option) {
    return signal("option_sample_dominant", "offlineAdvice", "info", {
      optionProfitFactor: safeRatioNumber(option.profitFactor),
      optionWinRate: safeNumber(option.winRate),
    });
  }
  if (stock) {
    return signal("stock_sample_dominant", "offlineAdvice", "info", {
      stockProfitFactor: safeRatioNumber(stock.profitFactor),
      stockWinRate: safeNumber(stock.winRate),
    });
  }
  return undefined;
}

function signal<const Id extends AdviceSignalId>(
  id: Id,
  group: Extract<AdviceSignal, { id: Id }>["group"],
  severity: AdviceSeverity,
  data: Extract<AdviceSignal, { id: Id }>["data"],
): Extract<AdviceSignal, { id: Id }> {
  return { id, group, severity, data } as Extract<AdviceSignal, { id: Id }>;
}

function safeNumber(value: unknown): number {
  return typeof value === "number" && Number.isFinite(value) ? value : 0;
}

function safeRatioNumber(value: unknown): number {
  return typeof value === "number" && !Number.isNaN(value) ? value : 0;
}
