import { escapeHtml, money, percent, ratio } from "../domain/format";
import type { AssetGroup, AssetGroupSummary, Insight, OptionUnderlyingDaySummary, ParsedStatement, PeriodPerformance, SymbolSummary } from "../domain/types";
import { buildLocalizedAdvice } from "./advice";
import { drawDailyChart, drawDistributionChart, drawPeriodPerformanceChart } from "./chart";
import type { Locale, TranslationKey } from "./i18n";
import { t } from "./i18n";

export type PeriodMode = "weekly" | "monthly";
export type ThemeMode = "light" | "dark";
export type SortDirection = "asc" | "desc";
export type SortTable = "period" | "option" | "symbol";

export interface SortState {
  table: SortTable;
  key: string;
  direction: SortDirection;
}

export interface RenderOptions {
  locale: Locale;
  periodMode: PeriodMode;
  theme: ThemeMode;
  sorts: Partial<Record<SortTable, SortState>>;
}

export interface AppElements {
  privacyStrip: HTMLElement;
  maskedAccount: HTMLElement;
  accountSelect: HTMLSelectElement;
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
  renderAccountPicker(els, report);
  els.maskedName.textContent = t(options.locale, "neutralName");
  els.period.textContent = profile.period || "--";
  els.baseCurrency.textContent = profile.baseCurrency || "USD";
  els.tradeCount.textContent = `${metrics.closedCount} ${t(options.locale, "closed")} / ${metrics.executionCount} ${t(options.locale, "executions")}`;

  els.metricsGrid.innerHTML = metricCards([
    [t(options.locale, "netRealized"), money(metrics.net), t(options.locale, "closedTradeSum"), pnlTone(metrics.net), statusLabel(options.locale, metrics.net)],
    [t(options.locale, "profitFactor"), ratio(metrics.profitFactor), t(options.locale, "grossProfitLoss"), thresholdTone(metrics.profitFactor), thresholdStatusLabel(options.locale, metrics.profitFactor)],
    [t(options.locale, "winRate"), percent(metrics.winRate), `${metrics.winCount} / ${metrics.lossCount}`],
    [t(options.locale, "payoffRatio"), ratio(metrics.payoffRatio), t(options.locale, "averageWinLoss"), thresholdTone(metrics.payoffRatio), thresholdStatusLabel(options.locale, metrics.payoffRatio)],
    [t(options.locale, "expectancy"), money(metrics.expectancy), t(options.locale, "perClosedTrade"), pnlTone(metrics.expectancy), statusLabel(options.locale, metrics.expectancy)],
    [t(options.locale, "executionRecords"), String(metrics.executionCount), t(options.locale, "flexTradeRecords")],
    [t(options.locale, "canceledOrders"), String(metrics.canceledOrderCount), metrics.canceledOrderCount ? t(options.locale, "flexCanceledRecords") : t(options.locale, "noCanceledRecords")],
    [t(options.locale, "commissionDrag"), money(metrics.commissions), `${metrics.executionCount} ${t(options.locale, "executions")}`, "loss", t(options.locale, "costStatus")],
  ]);

  const chartOptions = { locale: options.locale, theme: cssChartTheme() };
  drawDailyChart(els.dailyChart, report.daily, chartOptions);
  drawDistributionChart(els.distributionChart, report.closedTrades, chartOptions);
  renderPeriodSection(els, report, options);

  const advice = buildLocalizedAdvice(report, options.locale);
  renderInsights(els.disciplineList, advice.discipline);
  renderInsights(els.bestLoserList, advice.bestLoserWins);
  renderInsights(els.offlineAdvice, advice.offlineAdvice);
  renderAssetGroups(els.assetRows, report.assetGroups, options.locale);
  renderOptionRows(els.optionRows, report.optionUnderlyingDays, options.locale, options.sorts.option);
  renderSymbols(els.symbolRows, sortRows(report.symbols, options.sorts.symbol), options.locale);
  updateSortButtons(options.sorts);
}

function renderAccountPicker(els: AppElements, report: ParsedStatement): void {
  const hasMultipleAccounts = report.accounts.length > 1;
  els.maskedAccount.hidden = hasMultipleAccounts;
  els.accountSelect.hidden = !hasMultipleAccounts;
  if (!hasMultipleAccounts) return;

  els.accountSelect.innerHTML = report.accounts
    .map((account) => {
      const selected = account.index === report.selectedAccountIndex ? " selected" : "";
      const label = `${account.maskedAccountId || "--"} · ${account.tradeCount} trades`;
      return `<option value="${account.index}"${selected}>${escapeHtml(label)}</option>`;
    })
    .join("");
}

export function renderPeriodSection(els: AppElements, report: ParsedStatement, options: RenderOptions): void {
  const periods = options.periodMode === "weekly" ? report.weekly : report.monthly;
  els.periodTitle.textContent = options.periodMode === "weekly"
    ? `${t(options.locale, "weekly")} ${t(options.locale, "realized")}`
    : `${t(options.locale, "monthly")} ${t(options.locale, "realized")}`;
  els.periodColumnLabel.textContent = options.periodMode === "weekly" ? t(options.locale, "periodColumn") : t(options.locale, "monthColumn");
  els.periodWeekly.classList.toggle("active", options.periodMode === "weekly");
  els.periodMonthly.classList.toggle("active", options.periodMode === "monthly");

  drawPeriodPerformanceChart(els.periodChart, periods, { locale: options.locale, theme: cssChartTheme() });
  renderPeriods(els.periodRows, sortRows(periods, options.sorts.period), 12, Boolean(options.sorts.period));
  updateSortButtons(options.sorts);
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

type MetricTone = "win" | "loss" | "neutral";

function metricCards(cards: Array<[string, string, string, MetricTone?, string?]>): string {
  return cards
    .map(([label, value, note, tone = "neutral", status]) => `
      <article class="metric-card ${tone}">
        <span>${escapeHtml(label)}</span>
        <strong class="${tone}">${escapeHtml(value)}</strong>
        <small>${escapeHtml(note)}</small>
        ${status ? `<em>${escapeHtml(status)}</em>` : ""}
      </article>
    `)
    .join("");
}

function pnlTone(value: number): MetricTone {
  if (value > 0) return "win";
  if (value < 0) return "loss";
  return "neutral";
}

function thresholdTone(value: number): MetricTone {
  if (value >= 1) return "win";
  if (value > 0) return "loss";
  return "neutral";
}

function statusLabel(locale: Locale, value: number): string {
  if (value > 0) return t(locale, "profitStatus");
  if (value < 0) return t(locale, "lossStatus");
  return t(locale, "flatStatus");
}

function thresholdStatusLabel(locale: Locale, value: number): string {
  if (value >= 1) return t(locale, "profitStatus");
  if (value > 0) return t(locale, "lossStatus");
  return t(locale, "flatStatus");
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

function renderPeriods(target: HTMLElement, periods: PeriodPerformance[], limit: number, sorted: boolean): void {
  const visibleRows = sorted ? periods.slice(0, limit) : periods.slice(-limit);
  target.innerHTML = visibleRows.map((row) => {
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

function sortRows<T extends object>(rows: T[], sort: SortState | undefined): T[] {
  if (!sort) return rows;
  const direction = sort.direction === "asc" ? 1 : -1;
  return [...rows].sort((a, b) => {
    const left = sortableValue((a as Record<string, unknown>)[sort.key]);
    const right = sortableValue((b as Record<string, unknown>)[sort.key]);
    if (typeof left === "string" || typeof right === "string") {
      const compared = String(left).localeCompare(String(right), undefined, { numeric: true, sensitivity: "base" });
      return compared * direction;
    }
    if (left === right) return 0;
    return left > right ? direction : -direction;
  });
}

function sortableValue(value: unknown): string | number {
  if (typeof value === "number") {
    if (value === Infinity) return Number.MAX_SAFE_INTEGER;
    if (value === -Infinity) return Number.MIN_SAFE_INTEGER;
    return Number.isFinite(value) ? value : 0;
  }
  if (typeof value === "string") return value;
  return 0;
}

function updateSortButtons(sorts: RenderOptions["sorts"]): void {
  for (const button of document.querySelectorAll<HTMLButtonElement>(".sort-button")) {
    const table = button.dataset.sortTable as SortTable | undefined;
    const key = button.dataset.sortKey;
    const sort = table ? sorts[table] : undefined;
    const active = Boolean(sort && sort.key === key);
    button.classList.toggle("active", active);
    button.dataset.direction = active ? sort?.direction || "" : "";
  }
}

interface OptionUnderlyingSummary {
  underlying: string;
  day: string;
  pnl: number;
  grossProfit: number;
  grossLoss: number;
  profitFactor: number;
  payoffRatio: number;
  winRate: number;
  average: number;
  count: number;
  wins: number;
  losses: number;
  autoExpiryCount: number;
  details: OptionUnderlyingDaySummary[];
}

function renderOptionRows(target: HTMLElement, rows: OptionUnderlyingDaySummary[], locale: Locale, sort: SortState | undefined): void {
  const summaries = sortRows(buildOptionUnderlyingSummaries(rows), sort);
  target.innerHTML = summaries.slice(0, 18).map((summary, index) => {
    const detailRows = sortRows(summary.details, sort?.key === "day" ? sort : undefined);
    const groupKey = `option-${index}`;
    return [renderOptionSummaryRow(summary, groupKey, locale), ...detailRows.map((row) => renderOptionDetailRow(row, groupKey))].join("");
  }).join("");
  if (!rows.length) {
    target.innerHTML = `<tr><td colspan="9">${escapeHtml(t(locale, "chartEmpty"))}</td></tr>`;
  }
}

function renderOptionSummaryRow(row: OptionUnderlyingSummary, groupKey: string, locale: Locale): string {
  const tone = row.pnl >= 0 ? "win" : "loss";
  return `
    <tr class="group-row">
      <td>
        <span class="option-underlying">
          <button class="collapse-button" type="button" data-option-group="${escapeHtml(groupKey)}" aria-expanded="false" aria-label="Toggle details">+</button>
          <span class="option-symbol">${escapeHtml(row.underlying)}</span>
        </span>
      </td>
      <td>${row.details.length}${escapeHtml(t(locale, "daysShort"))}</td>
      <td class="num ${tone}">${money(row.pnl)}</td>
      <td class="num">${ratio(row.profitFactor)}</td>
      <td class="num">${ratio(row.payoffRatio)}</td>
      <td class="num">${percent(row.winRate)}</td>
      <td class="num ${tone}">${money(row.average)}</td>
      <td class="num">${row.autoExpiryCount}</td>
      <td class="num">${row.count}</td>
    </tr>
  `;
}

function renderOptionDetailRow(row: OptionUnderlyingDaySummary, groupKey: string): string {
    const tone = row.pnl >= 0 ? "win" : "loss";
    return `
      <tr class="detail-row" data-option-group="${escapeHtml(groupKey)}" hidden>
        <td></td>
        <td>${escapeHtml(row.day)}</td>
        <td class="num ${tone}">${money(row.pnl)}</td>
        <td class="num">${ratio(row.profitFactor)}</td>
        <td class="num">${ratio(row.payoffRatio)}</td>
        <td class="num">${percent(row.winRate)}</td>
        <td class="num ${tone}">${money(row.count ? row.pnl / row.count : 0)}</td>
        <td class="num">${row.autoExpiryCount}</td>
        <td class="num">${row.count}</td>
      </tr>
    `;
}

function buildOptionUnderlyingSummaries(rows: OptionUnderlyingDaySummary[]): OptionUnderlyingSummary[] {
  const groups = new Map<string, OptionUnderlyingDaySummary[]>();
  for (const row of rows) {
    groups.set(row.underlying, [...(groups.get(row.underlying) || []), row]);
  }

  return [...groups.entries()].map(([underlying, details]) => {
    const pnl = details.reduce((total, row) => total + row.pnl, 0);
    const grossProfit = details.reduce((total, row) => total + row.grossProfit, 0);
    const grossLoss = details.reduce((total, row) => total + row.grossLoss, 0);
    const wins = details.reduce((total, row) => total + row.wins, 0);
    const losses = details.reduce((total, row) => total + row.losses, 0);
    const count = details.reduce((total, row) => total + row.count, 0);
    const avgWin = wins ? grossProfit / wins : 0;
    const avgLoss = losses ? grossLoss / losses : 0;
    return {
      underlying,
      day: String(details.length),
      pnl,
      grossProfit,
      grossLoss,
      profitFactor: grossLoss ? grossProfit / grossLoss : grossProfit ? Infinity : 0,
      payoffRatio: avgLoss ? avgWin / avgLoss : avgWin ? Infinity : 0,
      winRate: count ? wins / count : 0,
      average: count ? pnl / count : 0,
      count,
      wins,
      losses,
      autoExpiryCount: details.reduce((total, row) => total + row.autoExpiryCount, 0),
      details: [...details].sort((a, b) => a.day.localeCompare(b.day)),
    };
  });
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
    accentSoft: styles.getPropertyValue("--accent-soft").trim() || "#9bcbbb",
  };
}
