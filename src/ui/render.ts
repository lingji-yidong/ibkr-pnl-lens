import { escapeHtml, money, percent, ratio } from "../domain/format";
import type { Insight, ParsedStatement, SymbolSummary } from "../domain/types";
import { drawDailyChart, drawDistributionChart } from "./chart";

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
  disciplineList: HTMLElement;
  bestLoserList: HTMLElement;
  symbolRows: HTMLElement;
  offlineAdvice: HTMLElement;
}

export function renderReport(els: AppElements, report: ParsedStatement): void {
  const { profile, metrics } = report;
  els.privacyStrip.hidden = false;
  els.metricsGrid.hidden = false;
  els.workspace.hidden = false;

  els.maskedAccount.textContent = profile.maskedAccountId || "--";
  els.maskedName.textContent = "--";
  els.period.textContent = profile.period || "--";
  els.baseCurrency.textContent = profile.baseCurrency || "USD";
  els.tradeCount.textContent = `${metrics.closedCount} 平倉 / ${metrics.executionCount} 成交`;

  els.metricsGrid.innerHTML = metricCards([
    ["淨已實現", money(metrics.net), "逐筆平倉合計"],
    ["Profit Factor", ratio(metrics.profitFactor), "總盈利 / 總虧損"],
    ["勝率", percent(metrics.winRate), `${metrics.winCount} 勝 / ${metrics.lossCount} 負`],
    ["盈虧比", ratio(metrics.payoffRatio), "平均盈利 / 平均虧損"],
    ["期望值", money(metrics.expectancy), "每筆平倉平均"],
    ["成交記錄", String(metrics.executionCount), "Flex XML 的 Trade 記錄"],
    ["取消委託", String(metrics.canceledOrderCount), metrics.canceledOrderCount ? "Flex XML 的 Order 取消記錄" : "此 XML 未提供取消委託"],
    ["佣金拖累", money(metrics.commissions), `${metrics.executionCount} 筆成交`],
  ]);

  drawDailyChart(els.dailyChart, report.daily);
  drawDistributionChart(els.distributionChart, report.closedTrades);
  renderInsights(els.disciplineList, report.discipline);
  renderInsights(els.bestLoserList, report.bestLoserWins);
  renderInsights(els.offlineAdvice, report.offlineAdvice);
  renderSymbols(els.symbolRows, report.symbols);
}

export function renderError(target: HTMLElement, message: string): void {
  target.innerHTML = `<div class="insight"><strong>匯入失敗</strong><p>${escapeHtml(message)}</p></div>`;
  window.setTimeout(() => {
    target.innerHTML = "";
  }, 2400);
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

function renderSymbols(target: HTMLElement, symbols: SymbolSummary[]): void {
  target.innerHTML = symbols.slice(0, 18).map((row) => {
    const tone = row.pnl >= 0 ? "win" : "loss";
    return `
      <tr>
        <td>${escapeHtml(row.symbol)}</td>
        <td>${escapeHtml(row.assetClass)}</td>
        <td class="num ${tone}">${money(row.pnl)}</td>
        <td class="num">${row.count}</td>
        <td class="num">${percent(row.winRate)}</td>
        <td class="num ${tone}">${money(row.average)}</td>
      </tr>
    `;
  }).join("");
}
