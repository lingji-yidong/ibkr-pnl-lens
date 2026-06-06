import { money, percent, ratio } from "../domain/format";
import type { Insight, ParsedStatement } from "../domain/types";
import type { Locale } from "./i18n";

export interface AdviceBundle {
  discipline: Insight[];
  bestLoserWins: Insight[];
  offlineAdvice: Insight[];
}

type SupportedLocale = "zh-Hant" | "zh-Hans" | "en";

type AdviceGroup = keyof AdviceBundle;

type Severity = "info" | "warning" | "danger";

interface AdviceSignal<T = Record<string, unknown>> {
  id: string;
  group: AdviceGroup;
  severity: Severity;
  data: T;
}

interface AdviceContext {
  report: ParsedStatement;
  metrics: ParsedStatement["metrics"];
  option?: ParsedStatement["assetGroups"][number];
  stock?: ParsedStatement["assetGroups"][number];

  closedTradeCount: number;
  autoExpiryLossCount: number;

  largeLossThreshold: number;
  largeLossCount: number;

  overTradeLossDayCount: number;
  weakOptionUnderlyingDays: ParsedStatement["optionUnderlyingDays"];
}

export function buildLocalizedAdvice(
  report: ParsedStatement,
  locale: Locale,
): AdviceBundle {
  const supportedLocale = normalizeLocale(locale);
  const context = buildAdviceContext(report);
  const signals = buildAdviceSignals(context);

  return renderAdviceBundle(signals, supportedLocale);
}

function normalizeLocale(locale: Locale): SupportedLocale {
  if (locale === "zh-Hant" || locale === "zh-Hans") return locale;
  return "en";
}

function buildAdviceContext(report: ParsedStatement): AdviceContext {
  const { metrics } = report;

  const option = report.assetGroups.find((row) => row.group === "option");
  const stock = report.assetGroups.find((row) => row.group === "stock");

  const closedTrades = report.closedTrades ?? [];
  const daily = report.daily ?? [];
  const optionUnderlyingDays = report.optionUnderlyingDays ?? [];

  const avgWin = safePositive(metrics.avgWin);
  const largeLossThreshold = Math.max(100, avgWin);

  const autoExpiryLossCount = closedTrades.filter(
    (trade) => trade.autoExpiry && safeNumber(trade.realizedPnl) < 0,
  ).length;

  const largeLossCount = closedTrades.filter(
    (trade) => safeNumber(trade.realizedPnl) < -largeLossThreshold,
  ).length;

  const overTradeLossDayCount = daily.filter(
    (day) => safeNumber(day.count) >= 6 && safeNumber(day.pnl) < 0,
  ).length;

  const weakOptionUnderlyingDays = optionUnderlyingDays
    .filter(
      (row) => safeNumber(row.count) >= 3 && safeNumber(row.profitFactor) < 1,
    )
    .slice(0, 2);

  return {
    report,
    metrics,
    option,
    stock,
    closedTradeCount: closedTrades.length,
    autoExpiryLossCount,
    largeLossThreshold,
    largeLossCount,
    overTradeLossDayCount,
    weakOptionUnderlyingDays,
  };
}

function buildAdviceSignals(context: AdviceContext): AdviceSignal[] {
  const signals: AdviceSignal[] = [];

  signals.push(buildProfitFactorSignal(context));

  const payoffSignal = buildPayoffSignal(context);
  if (payoffSignal) signals.push(payoffSignal);

  if (context.overTradeLossDayCount > 0) {
    signals.push({
      id: "overtrade_loss_days",
      group: "discipline",
      severity: "warning",
      data: {
        days: context.overTradeLossDayCount,
      },
    });
  }

  if (context.autoExpiryLossCount > 0) {
    signals.push({
      id: "auto_expiry_losses",
      group: "discipline",
      severity: "warning",
      data: {
        count: context.autoExpiryLossCount,
      },
    });
  }

  signals.push({
    id: "good_loser_base",
    group: "bestLoserWins",
    severity: "info",
    data: {
      avgWin: safeNumber(context.metrics.avgWin),
      avgLoss: safeNumber(context.metrics.avgLoss),
    },
  });

  signals.push({
    id: "detach_outcome_from_ego",
    group: "bestLoserWins",
    severity: "info",
    data: {},
  });

  if (context.largeLossCount > 0) {
    signals.push({
      id: "large_tail_losses",
      group: "bestLoserWins",
      severity: "danger",
      data: {
        count: context.largeLossCount,
        threshold: context.largeLossThreshold,
      },
    });
  }

  const assetSignal = buildAssetSignal(context);
  if (assetSignal) signals.push(assetSignal);

  if (context.weakOptionUnderlyingDays.length > 0) {
    signals.push({
      id: "weak_option_underlying_days",
      group: "offlineAdvice",
      severity: "warning",
      data: {
        rows: context.weakOptionUnderlyingDays,
      },
    });
  }

  ensureGroupFallback(signals, "offlineAdvice", {
    id: "clean_sample",
    group: "offlineAdvice",
    severity: "info",
    data: {},
  });

  return signals;
}

function buildProfitFactorSignal(context: AdviceContext): AdviceSignal {
  const profitFactor = safeNumber(context.metrics.profitFactor);

  if (profitFactor < 1) {
    return {
      id: "profit_factor_below_one",
      group: "discipline",
      severity: "danger",
      data: { profitFactor },
    };
  }

  if (profitFactor < 1.5) {
    return {
      id: "profit_factor_thin_edge",
      group: "discipline",
      severity: "warning",
      data: { profitFactor },
    };
  }

  return {
    id: "profit_factor_healthy",
    group: "discipline",
    severity: "info",
    data: { profitFactor },
  };
}

function buildPayoffSignal(context: AdviceContext): AdviceSignal | undefined {
  const winRate = safeNumber(context.metrics.winRate);
  const payoffRatio = safeNumber(context.metrics.payoffRatio);

  if (payoffRatio >= 1) return undefined;

  if (winRate < 0.55) {
    return {
      id: "winrate_and_payoff_weak",
      group: "discipline",
      severity: "danger",
      data: {
        winRate,
        payoffRatio,
      },
    };
  }

  return {
    id: "high_winrate_weak_payoff",
    group: "discipline",
    severity: "warning",
    data: {
      winRate,
      payoffRatio,
    },
  };
}

function buildAssetSignal(context: AdviceContext): AdviceSignal | undefined {
  const { option, stock } = context;

  if (option && stock) {
    const optionPf = safeNumber(option.profitFactor);
    const stockPf = safeNumber(stock.profitFactor);
    const stronger = optionPf >= stockPf ? "option" : "stock";

    return {
      id: "asset_group_relative_edge",
      group: "offlineAdvice",
      severity: "info",
      data: {
        stronger,
        optionProfitFactor: optionPf,
        stockProfitFactor: stockPf,
      },
    };
  }

  if (option) {
    return {
      id: "option_sample_dominant",
      group: "offlineAdvice",
      severity: "info",
      data: {
        optionProfitFactor: safeNumber(option.profitFactor),
        optionWinRate: safeNumber(option.winRate),
      },
    };
  }

  if (stock) {
    return {
      id: "stock_sample_dominant",
      group: "offlineAdvice",
      severity: "info",
      data: {
        stockProfitFactor: safeNumber(stock.profitFactor),
        stockWinRate: safeNumber(stock.winRate),
      },
    };
  }

  return undefined;
}

function ensureGroupFallback(
  signals: AdviceSignal[],
  group: AdviceGroup,
  fallback: AdviceSignal,
): void {
  if (!signals.some((signal) => signal.group === group)) {
    signals.push(fallback);
  }
}

function renderAdviceBundle(
  signals: AdviceSignal[],
  locale: SupportedLocale,
): AdviceBundle {
  const bundle: AdviceBundle = {
    discipline: [],
    bestLoserWins: [],
    offlineAdvice: [],
  };

  for (const signal of signals) {
    const insight = renderSignal(signal, locale);
    if (insight) bundle[signal.group].push(insight);
  }

  return bundle;
}

function renderSignal(
  signal: AdviceSignal,
  locale: SupportedLocale,
): Insight | undefined {
  const renderer = copy[locale][signal.id] ?? copy.en[signal.id];
  if (!renderer) return undefined;
  return renderer(signal.data);
}

type CopyRenderer = (data: Record<string, unknown>) => Insight;

const copy: Record<SupportedLocale, Record<string, CopyRenderer>> = {
  "zh-Hant": {
    profit_factor_below_one: (data) => ({
      title: "PF 低於 1，先處理虧損尾巴",
      body: `目前 PF ${ratio(n(data.profitFactor))}，代表總盈利還蓋不住總虧損。下一步優先降低單筆大虧、到期歸零與失控加倉，而不是增加交易次數。`,
    }),

    profit_factor_thin_edge: (data) => ({
      title: "PF 有基礎，但容錯很薄",
      body: `目前 PF ${ratio(n(data.profitFactor))}。這種狀態不是不能交易，而是不能讓一兩筆失控虧損吃掉整段成果。先定義單日最大虧損、最晚離場時間與停手機制。`,
    }),

    profit_factor_healthy: (data) => ({
      title: "PF 結構相對健康",
      body: `目前 PF ${ratio(n(data.profitFactor))}。接下來不要盲目放大頻率，應該找出哪些標的、時段與策略最穩，保留可重複的高品質交易。`,
    }),

    winrate_and_payoff_weak: (data) => ({
      title: "勝率與盈虧比不能同時偏弱",
      body: `勝率 ${percent(n(data.winRate))}、盈虧比 ${ratio(n(data.payoffRatio))}。這代表你既沒有足夠命中率，也沒有足夠單筆收益補償錯誤。進場前要更嚴格確認目標空間與止損距離。`,
    }),

    high_winrate_weak_payoff: (data) => ({
      title: "勝率在補洞，但平均虧損仍偏重",
      body: `勝率 ${percent(n(data.winRate))} 還能支撐部分結果，但盈虧比 ${ratio(n(data.payoffRatio))} 代表一筆壞交易會吃掉多筆好交易。這通常不是看不準，而是離場與風險定義太鬆。`,
    }),

    overtrade_loss_days: (data) => ({
      title: "虧損日有加速跡象",
      body: `${n(data.days)} 天同時出現高交易數與負損益。這類日子要單獨復盤第二筆以後的交易：它們是原計畫，還是想把虧損追回來？`,
    }),

    auto_expiry_losses: (data) => ({
      title: "自動到期不是雜訊",
      body: `${n(data.count)} 筆自動到期虧損已納入。到期歸零應該被視為可管理風險，而不是收盤前才處理的意外。建議寫死「最晚離場時間」。`,
    }),

    good_loser_base: (data) => ({
      title: "好的輸家會保護下一筆交易",
      body: `本期平均盈利 ${money(n(data.avgWin))}、平均虧損 ${money(n(data.avgLoss))}。虧損若在計畫內，是交易成本；虧損若超出計畫，就是風險定義需要收窄。`,
    }),

    detach_outcome_from_ego: () => ({
      title: "把輸贏從自尊裡拿出來",
      body: "復盤時先問：這筆虧損是不是按計畫發生？如果答案是肯定的，它只是成本；如果是否定的，它才是紀律問題。",
    }),

    large_tail_losses: (data) => ({
      title: "先讓最大虧損變小",
      body: `${n(data.count)} 筆虧損超過 ${money(n(data.threshold))}。改善 PF 最快的方式，通常不是提高勝率，而是砍掉會摧毀整週成果的尾部虧損。`,
    }),

    asset_group_relative_edge: (data) => {
      const stronger = data.stronger === "option" ? "期權" : "股票";
      return {
        title: `${stronger} 目前相對更有優勢`,
        body: `期權 PF ${ratio(n(data.optionProfitFactor))}、股票 PF ${ratio(n(data.stockProfitFactor))}。先把資金與注意力放在 PF 更穩的類別，再檢查另一類是否只是偶發試單或情緒交易。`,
      };
    },

    option_sample_dominant: (data) => ({
      title: "目前樣本主要是期權",
      body: `期權 PF ${ratio(n(data.optionProfitFactor))}、勝率 ${percent(n(data.optionWinRate))}。請把到期、行權、最後交易時段與 IV 變化分開復盤，不要只看總盈虧。`,
    }),

    stock_sample_dominant: (data) => ({
      title: "目前樣本主要是股票",
      body: `股票 PF ${ratio(n(data.stockProfitFactor))}、勝率 ${percent(n(data.stockWinRate))}。下一步應檢查持倉時間、止損一致性與是否追高，而不是直接把股票結果和期權混在一起看。`,
    }),

    weak_option_underlying_days: (data) => ({
      title: "期權弱勢標的日期要單獨復盤",
      body: `${formatWeakOptionRows(data.rows)}。這些組合比總表更接近實際決策場景，應優先檢查當天方向、入場時間與是否接近到期。`,
    }),

    clean_sample: () => ({
      title: "先保持樣本乾淨",
      body: "目前沒有明顯單一資產類別拖累。下一步可以累積更多樣本，再看週期性、標的集中度與策略穩定性。",
    }),
  },

  "zh-Hans": {
    profit_factor_below_one: (data) => ({
      title: "PF 低于 1，先处理亏损尾巴",
      body: `目前 PF ${ratio(n(data.profitFactor))}，代表总盈利还盖不住总亏损。下一步优先降低单笔大亏、到期归零与失控加仓，而不是增加交易次数。`,
    }),

    profit_factor_thin_edge: (data) => ({
      title: "PF 有基础，但容错很薄",
      body: `目前 PF ${ratio(n(data.profitFactor))}。这种状态不是不能交易，而是不能让一两笔失控亏损吃掉整段成果。先定义单日最大亏损、最晚离场时间与停手机制。`,
    }),

    profit_factor_healthy: (data) => ({
      title: "PF 结构相对健康",
      body: `目前 PF ${ratio(n(data.profitFactor))}。接下来不要盲目放大频率，应该找出哪些标的、时段与策略最稳，保留可重复的高质量交易。`,
    }),

    winrate_and_payoff_weak: (data) => ({
      title: "胜率与盈亏比不能同时偏弱",
      body: `胜率 ${percent(n(data.winRate))}、盈亏比 ${ratio(n(data.payoffRatio))}。这代表你既没有足够命中率，也没有足够单笔收益补偿错误。进场前要更严格确认目标空间与止损距离。`,
    }),

    high_winrate_weak_payoff: (data) => ({
      title: "胜率在补洞，但平均亏损仍偏重",
      body: `胜率 ${percent(n(data.winRate))} 还能支撑部分结果，但盈亏比 ${ratio(n(data.payoffRatio))} 代表一笔坏交易会吃掉多笔好交易。这通常不是看不准，而是离场与风险定义太松。`,
    }),

    overtrade_loss_days: (data) => ({
      title: "亏损日有加速迹象",
      body: `${n(data.days)} 天同时出现高交易数与负损益。这类日子要单独复盘第二笔以后的交易：它们是原计划，还是想把亏损追回来？`,
    }),

    auto_expiry_losses: (data) => ({
      title: "自动到期不是噪声",
      body: `${n(data.count)} 笔自动到期亏损已纳入。到期归零应该被视为可管理风险，而不是收盘前才处理的意外。建议写死“最晚离场时间”。`,
    }),

    good_loser_base: (data) => ({
      title: "好的输家会保护下一笔交易",
      body: `本期平均盈利 ${money(n(data.avgWin))}、平均亏损 ${money(n(data.avgLoss))}。亏损若在计划内，是交易成本；亏损若超出计划，就是风险定义需要收窄。`,
    }),

    detach_outcome_from_ego: () => ({
      title: "把输赢从自尊里拿出来",
      body: "复盘时先问：这笔亏损是不是按计划发生？如果答案是肯定的，它只是成本；如果是否定的，它才是纪律问题。",
    }),

    large_tail_losses: (data) => ({
      title: "先让最大亏损变小",
      body: `${n(data.count)} 笔亏损超过 ${money(n(data.threshold))}。改善 PF 最快的方式，通常不是提高胜率，而是砍掉会摧毁整周成果的尾部亏损。`,
    }),

    asset_group_relative_edge: (data) => {
      const stronger = data.stronger === "option" ? "期权" : "股票";
      return {
        title: `${stronger} 目前相对更有优势`,
        body: `期权 PF ${ratio(n(data.optionProfitFactor))}、股票 PF ${ratio(n(data.stockProfitFactor))}。先把资金与注意力放在 PF 更稳的类别，再检查另一类是否只是偶发试单或情绪交易。`,
      };
    },

    option_sample_dominant: (data) => ({
      title: "目前样本主要是期权",
      body: `期权 PF ${ratio(n(data.optionProfitFactor))}、胜率 ${percent(n(data.optionWinRate))}。请把到期、行权、最后交易时段与 IV 变化分开复盘，不要只看总盈亏。`,
    }),

    stock_sample_dominant: (data) => ({
      title: "目前样本主要是股票",
      body: `股票 PF ${ratio(n(data.stockProfitFactor))}、胜率 ${percent(n(data.stockWinRate))}。下一步应检查持仓时间、止损一致性与是否追高，而不是直接把股票结果和期权混在一起看。`,
    }),

    weak_option_underlying_days: (data) => ({
      title: "期权弱势标的日期要单独复盘",
      body: `${formatWeakOptionRows(data.rows)}。这些组合比总表更接近实际决策场景，应优先检查当天方向、入场时间与是否接近到期。`,
    }),

    clean_sample: () => ({
      title: "先保持样本干净",
      body: "目前没有明显单一资产类别拖累。下一步可以累积更多样本，再看周期性、标的集中度与策略稳定性。",
    }),
  },

  en: {
    profit_factor_below_one: (data) => ({
      title: "Profit factor is below 1",
      body: `PF is ${ratio(n(data.profitFactor))}. Total gains are not covering total losses yet. Focus first on reducing large losses, expiry losses, and uncontrolled add-ons before increasing trade count.`,
    }),

    profit_factor_thin_edge: (data) => ({
      title: "Profit factor has a thin edge",
      body: `PF is ${ratio(n(data.profitFactor))}. This is tradable, but one or two uncontrolled losses can erase the whole period. Define max daily loss, latest exit time, and pause rules first.`,
    }),

    profit_factor_healthy: (data) => ({
      title: "Profit factor structure looks healthier",
      body: `PF is ${ratio(n(data.profitFactor))}. Do not blindly increase frequency. Identify which symbols, sessions, and setups are repeatable, then keep only the higher-quality trades.`,
    }),

    winrate_and_payoff_weak: (data) => ({
      title: "Win rate and payoff cannot both be weak",
      body: `Win rate is ${percent(n(data.winRate))} and payoff ratio is ${ratio(n(data.payoffRatio))}. That means neither hit rate nor average reward is compensating enough. Confirm target room and stop distance before entry.`,
    }),

    high_winrate_weak_payoff: (data) => ({
      title: "Win rate is patching a weak payoff structure",
      body: `Win rate is ${percent(n(data.winRate))}, but payoff ratio is ${ratio(n(data.payoffRatio))}. One bad trade can consume several good trades. This is usually an exit and risk-definition issue, not just a direction issue.`,
    }),

    overtrade_loss_days: (data) => ({
      title: "Losing days show acceleration",
      body: `${n(data.days)} days had both high trade count and negative PnL. Review trades after the first loss separately: were they still part of the plan, or were they attempts to win it back?`,
    }),

    auto_expiry_losses: (data) => ({
      title: "Auto-expiry losses are not noise",
      body: `${n(data.count)} auto-expiry losses were included. Expiry-to-zero should be treated as manageable risk, not an end-of-day accident. Write down the latest acceptable exit time.`,
    }),

    good_loser_base: (data) => ({
      title: "A good loser protects the next trade",
      body: `Average win is ${money(n(data.avgWin))} and average loss is ${money(n(data.avgLoss))}. Losses inside the plan are business costs; losses outside the plan mean risk must be narrowed.`,
    }),

    detach_outcome_from_ego: () => ({
      title: "Separate PnL from ego",
      body: "During review, ask first: did this loss happen according to plan? If yes, it is cost. If no, it is a discipline problem.",
    }),

    large_tail_losses: (data) => ({
      title: "Reduce the largest losses first",
      body: `${n(data.count)} losses exceeded ${money(n(data.threshold))}. The fastest way to improve PF is usually not raising win rate, but cutting the tail losses that destroy a whole week of progress.`,
    }),

    asset_group_relative_edge: (data) => {
      const stronger = data.stronger === "option" ? "Options" : "Stocks";
      return {
        title: `${stronger} currently show a relative edge`,
        body: `Option PF is ${ratio(n(data.optionProfitFactor))}; stock PF is ${ratio(n(data.stockProfitFactor))}. Put capital and attention where PF is more stable, then check whether the weaker bucket is just occasional testing or emotional trading.`,
      };
    },

    option_sample_dominant: (data) => ({
      title: "The current sample is mainly options",
      body: `Option PF is ${ratio(n(data.optionProfitFactor))} with ${percent(n(data.optionWinRate))} win rate. Review expiry, assignment/exercise, final-session decisions, and IV changes separately instead of only looking at total PnL.`,
    }),

    stock_sample_dominant: (data) => ({
      title: "The current sample is mainly stocks",
      body: `Stock PF is ${ratio(n(data.stockProfitFactor))} with ${percent(n(data.stockWinRate))} win rate. Check holding time, stop consistency, and chase entries before mixing stock results with options.`,
    }),

    weak_option_underlying_days: (data) => ({
      title: "Review weak option symbol-days separately",
      body: `${formatWeakOptionRows(data.rows)}. These combinations are closer to the real decision context than the summary table. Check direction, entry timing, and proximity to expiry first.`,
    }),

    clean_sample: () => ({
      title: "Keep the sample clean",
      body: "No single asset group is clearly dragging the result. Keep collecting clean closed-trade samples, then review cyclicality, symbol concentration, and setup stability.",
    }),
  },
};

function formatWeakOptionRows(value: unknown): string {
  if (!Array.isArray(value)) return "";

  return value
    .map((row) => {
      const underlying = String(row?.underlying ?? "Unknown");
      const day = String(row?.day ?? "Unknown day");
      const pf = ratio(safeNumber(row?.profitFactor));
      return `${underlying} ${day} PF ${pf}`;
    })
    .join("；");
}

function n(value: unknown): number {
  return safeNumber(value);
}

function safeNumber(value: unknown): number {
  return typeof value === "number" && Number.isFinite(value) ? value : 0;
}

function safePositive(value: unknown): number {
  return Math.max(0, safeNumber(value));
}
