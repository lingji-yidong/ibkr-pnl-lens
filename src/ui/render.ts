import { escapeHtml, money, percent, ratio } from "../domain/format";
import type { AssetGroup, AssetGroupSummary, Insight, OptionUnderlyingDaySummary, ParsedStatement, PeriodPerformance, SymbolSummary } from "../domain/types";
import { buildLocalizedAdvice } from "./advice";
import { drawDailyChart, drawDistributionChart, drawPeriodPerformanceChart } from "./chart";
import type { Locale, TranslationKey } from "./i18n";
import { t } from "./i18n";

export type PeriodMode = "weekly" | "monthly";
export type ThemeMode = "light" | "dark";

export interface RenderOptions {
  locale: Locale;
  periodMode: PeriodMode;
  theme: ThemeMode;
}

export interface AppElements {
  privacyStrip: HTMLElement;
  maskedAccount: HTMLElement;
  maskedName: HTMLElement;
  period: HTMLElement;
  baseCurrency: HTMLElement;
  metricsGrid: HTMLElement;
  workspace: HTMLElement;
  tradeCount: HTMLElement;
  dailyChart: HTMLCanvasElement;
  distributionChart: HTMLCanvasElement;
  periodChart: HTMLCanvasElement;
  periodTitle: HTMLElement;
  periodColumnLabel: HTMLElement;
  periodWeekly: HTMLButtonElement;
  periodMonthly: HTMLButtonElement;
  disciplineList: HTMLElement;
  bestLoserList: HTMLElement;
  periodRows: HTMLElement;
  assetRows: HTMLElement;
  optionRows: HTMLElement;
  symbolRows: HTMLElement;
  offlineAdvice: HTMLElement;
}

export function renderReport(els: AppElements, report: ParsedStatement, options: RenderOptions): void {
  const { profile, metrics } = report;
  els.privacyStrip.hidden = false;
  els.metricsGrid.hidden = false;
  els.workspace.hidden = false;

  els.maskedAccount.textContent = profile.maskedAccountId || "--";
  els.maskedName.textContent = t(options.locale, "neutralName");
  els.period.textContent = profile.period || "--";
  els.baseCurrency.textContent = profile.baseCurrency || "USD";
  els.tradeCount.textContent = `${metrics.closedCount} ${t(options.locale, "closed")} / ${metrics.executionCount} ${t(options.locale, "executions")}`;

  els.metricsGrid.innerHTML = metricCards([
    [t(options.locale, "netRealized"), money(metrics.net), t(options.locale, "closedTradeSum")],
    [t(options.locale, "profitFactor"), ratio(metrics.profitFactor), t(options.locale, "grossProfitLoss")],
    [t(options.locale, "winRate"), percent(metrics.winRate), `${metrics.winCount} / ${metrics.lossCount}`],
    [t(options.locale, "payoffRatio"), ratio(metrics.payoffRatio), t(options.locale, "averageWinLoss")],
    [t(options.locale, "expectancy"), money(metrics.expectancy), t(options.locale, "perClosedTrade")],
    [t(options.locale, "executionRecords"), String(metrics.executionCount), t(options.locale, "flexTradeRecords")],
    [t(options.locale, "canceledOrders"), String(metrics.canceledOrderCount), metrics.canceledOrderCount ? t(options.locale, "flexCanceledRecords") : t(options.locale, "noCanceledRecords")],
    [t(options.locale, "commissionDrag"), money(metrics.commissions), `${metrics.executionCount} ${t(options.locale, "executions")}`],
  ]);

  const chartOptions = { locale: options.locale, theme: cssChartTheme() };
  const periods = options.periodMode === "weekly" ? report.weekly : report.monthly;
  els.periodTitle.textContent = options.periodMode === "weekly"
    ? `${t(options.locale, "weekly")} ${t(options.locale, "payoffRatio")}`
    : `${t(options.locale, "monthly")} ${t(options.locale, "payoffRatio")}`;
  els.periodColumnLabel.textContent = options.periodMode === "weekly" ? t(options.locale, "periodColumn") : t(options.locale, "monthColumn");
  els.periodWeekly.classList.toggle("active", options.periodMode === "weekly");
  els.periodMonthly.classList.toggle("active", options.periodMode === "monthly");

  drawDailyChart(els.dailyChart, report.daily, chartOptions);
  drawDistributionChart(els.distributionChart, report.closedTrades, chartOptions);
  drawPeriodPerformanceChart(els.periodChart, periods, chartOptions);

  const advice = buildLocalizedAdvice(report, options.locale);
  renderInsights(els.disciplineList, advice.discipline);
  renderInsights(els.bestLoserList, advice.bestLoserWins);
  renderInsights(els.offlineAdvice, advice.offlineAdvice);
  renderPeriods(els.periodRows, periods, options.periodMode === "weekly" ? 12 : 12);
  renderAssetGroups(els.assetRows, report.assetGroups, options.locale);
  renderOptionRows(els.optionRows, report.optionUnderlyingDays, options.locale);
  renderSymbols(els.symbolRows, report.symbols, options.locale);
}

export function renderError(target: HTMLElement, message: string): void {
  target.innerHTML = `<div class="insight"><strong>匯入失敗</strong><p>${escapeHtml(message)}</p></div>`;
  window.setTimeout(() => {
    target.innerHTML = "";
  }, 2400);
}

export function translateStaticText(locale: Locale): void {
  for (const element of document.querySelectorAll<HTMLElement>("[data-i18n]")) {
    const key = element.dataset.i18n;
    if (!key) continue;
    element.textContent = t(locale, key as TranslationKey);
  }
}

function metricCards(cards: Array<[string, string, string]>): string {
  return cards
    .map(([label, value, note]) => `
      <article class="metric-card">
        <span>${escapeHtml(label)}</span>
        <strong>${escapeHtml(value)}</strong>
        <small>${escapeHtml(note)}</small>
      </article>
    `)
    .join("");
}

function renderInsights(target: HTMLElement, items: Insight[]): void {
  target.innerHTML = items
    .map((item) => `
      <div class="insight">
        <strong>${escapeHtml(item.title)}</strong>
        <p>${escapeHtml(item.body)}</p>
      </div>
    `)
    .join("");
}

function renderSymbols(target: HTMLElement, symbols: SymbolSummary[], locale: Locale): void {
  target.innerHTML = symbols.slice(0, 18).map((row) => {
    const tone = row.pnl >= 0 ? "win" : "loss";
    return `
      <tr>
        <td>${escapeHtml(row.symbol)}</td>
        <td>${escapeHtml(localizeAssetClass(row.assetClass, locale))}</td>
        <td class="num ${tone}">${money(row.pnl)}</td>
        <td class="num">${row.count}</td>
        <td class="num">${percent(row.winRate)}</td>
        <td class="num ${tone}">${money(row.average)}</td>
      </tr>
    `;
  }).join("");
}

function renderPeriods(target: HTMLElement, periods: PeriodPerformance[], limit: number): void {
  target.innerHTML = periods.slice(-limit).map((row) => {
    const tone = row.pnl >= 0 ? "win" : "loss";
    return `
      <tr>
        <td>${escapeHtml(row.label)}</td>
        <td class="num ${tone}">${money(row.pnl)}</td>
        <td class="num">${ratio(row.profitFactor)}</td>
        <td class="num">${ratio(row.payoffRatio)}</td>
        <td class="num">${percent(row.winRate)}</td>
        <td class="num">${row.count}</td>
      </tr>
    `;
  }).join("");
}

function renderAssetGroups(target: HTMLElement, rows: AssetGroupSummary[], locale: Locale): void {
  target.innerHTML = rows.map((row) => {
    const tone = row.pnl >= 0 ? "win" : "loss";
    return `
      <article class="asset-card">
        <div class="asset-card-head">
          <span>${escapeHtml(assetGroupName(row.group, locale))}</span>
          <strong class="${tone}">${money(row.pnl)}</strong>
        </div>
        <dl>
          <div><dt>${escapeHtml(t(locale, "pf"))}</dt><dd>${ratio(row.profitFactor)}</dd></div>
          <div><dt>${escapeHtml(t(locale, "payoffShort"))}</dt><dd>${ratio(row.payoffRatio)}</dd></div>
          <div><dt>${escapeHtml(t(locale, "winRate"))}</dt><dd>${percent(row.winRate)}</dd></div>
          <div><dt>${escapeHtml(t(locale, "average"))}</dt><dd class="${tone}">${money(row.average)}</dd></div>
          <div><dt>${escapeHtml(t(locale, "trades"))}</dt><dd>${row.count}</dd></div>
        </dl>
      </article>
    `;
  }).join("");
}

function renderOptionRows(target: HTMLElement, rows: OptionUnderlyingDaySummary[], locale: Locale): void {
  target.innerHTML = rows.slice(0, 24).map((row) => {
    const tone = row.pnl >= 0 ? "win" : "loss";
    return `
      <tr>
        <td>${escapeHtml(row.underlying)}</td>
        <td>${escapeHtml(row.day)}</td>
        <td class="num ${tone}">${money(row.pnl)}</td>
        <td class="num">${ratio(row.profitFactor)}</td>
        <td class="num">${ratio(row.payoffRatio)}</td>
        <td class="num">${percent(row.winRate)}</td>
        <td class="num">${row.autoExpiryCount}</td>
        <td class="num">${row.count}</td>
      </tr>
    `;
  }).join("");
  if (!rows.length) {
    target.innerHTML = `<tr><td colspan="8">${escapeHtml(t(locale, "chartEmpty"))}</td></tr>`;
  }
}

function assetGroupName(group: AssetGroup, locale: Locale): string {
  if (group === "stock") return t(locale, "stock");
  if (group === "option") return t(locale, "option");
  return t(locale, "other");
}

function localizeAssetClass(value: string, locale: Locale): string {
  if (value.includes("期權") || value.toLowerCase().includes("option")) return t(locale, "option");
  if (value.includes("股票") || value.toLowerCase().includes("stock")) return t(locale, "stock");
  return value || t(locale, "other");
}

function cssChartTheme() {
  const styles = getComputedStyle(document.documentElement);
  return {
    background: styles.getPropertyValue("--chart-bg").trim() || "#fbfcfb",
    ink: styles.getPropertyValue("--ink").trim() || "#17211d",
    muted: styles.getPropertyValue("--muted").trim() || "#66746e",
    line: styles.getPropertyValue("--line").trim() || "#dce4df",
    win: styles.getPropertyValue("--win").trim() || "#119c65",
    loss: styles.getPropertyValue("--loss").trim() || "#c54747",
    accent: styles.getPropertyValue("--accent").trim() || "#0f8f72",
  };
}
