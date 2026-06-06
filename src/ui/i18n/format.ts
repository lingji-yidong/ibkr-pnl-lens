import { money, percent, ratio } from "../../domain/format";
import type { Insight } from "../render";
import type { AdviceSignal } from "../advice";
import type { Locale, MessageFunctionKey, MessageParams, TranslationKey } from "./keys";
import { t } from "./index";

type Formatter<K extends MessageFunctionKey> = (locale: Locale, params: MessageParams[K]) => string;

const formatters: { [K in MessageFunctionKey]: Formatter<K> } = {
  tradeCountSummary(locale, params) {
    return `${params.closed} ${t(locale, "closed")} / ${params.executions} ${t(locale, "executions")}`;
  },
  accountOptionLabel(locale, params) {
    return `${params.account || "--"} · ${params.trades} ${t(locale, "trades")}`;
  },
  pageStatus(locale, params) {
    const compactLocales: Locale[] = ["zh-Hant", "zh-Hans", "ja", "ko"];
    return compactLocales.includes(locale)
      ? `${params.page} / ${params.pageCount} ${t(locale, "page")}`
      : `${t(locale, "page")} ${params.page} / ${params.pageCount}`;
  },
  periodTitle(locale, params) {
    const periodKey = params.period === "weekly" ? "weekly" : "monthly";
    return `${t(locale, periodKey)} ${t(locale, "realized")}`;
  },
  datePlusCount(_locale, params) {
    return params.count > 1 ? `${params.date} +${params.count - 1}` : params.date;
  },
  importError(locale, params) {
    return `${t(locale, "importFailed")}: ${params.message}`;
  },
  adviceWeakOptionRows(_locale, params) {
    return params.rows
      .map((row) => `${row.underlying || "--"} ${row.day || "--"} PF ${ratio(row.profitFactor)}`)
      .join("; ");
  },
};

export function formatMessage<K extends MessageFunctionKey>(
  locale: Locale,
  key: K,
  params: MessageParams[K],
): string {
  return formatters[key](locale, params);
}

export function renderAdvice(locale: Locale, signal: AdviceSignal): Insight {
  const vars = buildAdviceVars(locale, signal);
  return {
    title: interpolate(t(locale, adviceKey(signal.id, "title")), vars),
    body: interpolate(t(locale, adviceKey(signal.id, "body")), vars),
  };
}

function adviceKey(id: AdviceSignal["id"], part: "title" | "body"): TranslationKey {
  return `advice.${id}.${part}`;
}

function buildAdviceVars(locale: Locale, signal: AdviceSignal): Record<string, string> {
  switch (signal.id) {
    case "profit_factor_below_one":
    case "profit_factor_thin_edge":
    case "profit_factor_healthy":
      return { profitFactor: ratio(signal.data.profitFactor) };
    case "winrate_and_payoff_weak":
    case "high_winrate_weak_payoff":
      return {
        winRate: percent(signal.data.winRate),
        payoffRatio: ratio(signal.data.payoffRatio),
      };
    case "overtrade_loss_days":
      return { days: String(signal.data.days) };
    case "auto_expiry_losses":
      return { count: String(signal.data.count) };
    case "good_loser_base":
      return {
        avgWin: money(signal.data.avgWin),
        avgLoss: money(signal.data.avgLoss),
      };
    case "detach_outcome_from_ego":
    case "clean_sample":
      return {};
    case "large_tail_losses":
      return {
        count: String(signal.data.count),
        threshold: money(signal.data.threshold),
      };
    case "asset_group_relative_edge":
      return {
        stronger: t(locale, signal.data.stronger),
        optionProfitFactor: ratio(signal.data.optionProfitFactor),
        stockProfitFactor: ratio(signal.data.stockProfitFactor),
      };
    case "option_sample_dominant":
      return {
        optionProfitFactor: ratio(signal.data.optionProfitFactor),
        optionWinRate: percent(signal.data.optionWinRate),
      };
    case "stock_sample_dominant":
      return {
        stockProfitFactor: ratio(signal.data.stockProfitFactor),
        stockWinRate: percent(signal.data.stockWinRate),
      };
    case "weak_option_underlying_days":
      return { rows: formatMessage(locale, "adviceWeakOptionRows", { rows: signal.data.rows }) };
  }
}

function interpolate(template: string, vars: Record<string, string>): string {
  return template.replace(/\{([A-Za-z0-9_]+)\}/g, (_match, key: string) => {
    const value = vars[key];
    if (value === undefined) throw new Error(`Missing i18n variable: ${key}`);
    return value;
  });
}
