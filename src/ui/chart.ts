import { money, ratio } from "../domain/format";
import type { ClosedTrade, DailyPnl, PeriodPerformance } from "../domain/types";

export function drawDailyChart(canvas: HTMLCanvasElement, daily: DailyPnl[]): void {
  drawCanvas(canvas, ({ ctx, width, height, pad }) => {
    const values = daily.map((row) => row.pnl);
    const cumulative = daily.map((row) => row.cumulative);
    const all = [...values, ...cumulative, 0];
    const min = Math.min(...all);
    const max = Math.max(...all);
    const y = scale(min, max, height - pad, pad);
    const step = daily.length > 1 ? (width - pad * 2) / (daily.length - 1) : width - pad * 2;
    const zeroY = y(0);

    ctx.strokeStyle = "#dce4df";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(pad, zeroY);
    ctx.lineTo(width - pad, zeroY);
    ctx.stroke();

    values.forEach((value, index) => {
      const x = pad + index * step;
      const barWidth = Math.max(6, Math.min(18, step * 0.42));
      ctx.fillStyle = value >= 0 ? "#119c65" : "#c54747";
      ctx.fillRect(x - barWidth / 2, Math.min(zeroY, y(value)), barWidth, Math.abs(y(value) - zeroY) || 2);
    });

    ctx.strokeStyle = "#17211d";
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    cumulative.forEach((value, index) => {
      const x = pad + index * step;
      const pointY = y(value);
      if (index === 0) ctx.moveTo(x, pointY);
      else ctx.lineTo(x, pointY);
    });
    ctx.stroke();

    drawAxisLabels(ctx, { width, height, pad, min, max });
  });
}

export function drawDistributionChart(canvas: HTMLCanvasElement, trades: ClosedTrade[]): void {
  drawCanvas(canvas, ({ ctx, width, height, pad }) => {
    const wins = trades.filter((trade) => trade.realizedPnl > 0).map((trade) => trade.realizedPnl);
    const losses = trades.filter((trade) => trade.realizedPnl < 0).map((trade) => Math.abs(trade.realizedPnl));
    const buckets: Array<[string, number, string]> = [
      ["小贏", wins.filter((value) => value < 50).length, "#7bc8a4"],
      ["中贏", wins.filter((value) => value >= 50 && value < 150).length, "#119c65"],
      ["大贏", wins.filter((value) => value >= 150).length, "#09624f"],
      ["小虧", losses.filter((value) => value < 50).length, "#e6a2a2"],
      ["中虧", losses.filter((value) => value >= 50 && value < 150).length, "#c54747"],
      ["大虧", losses.filter((value) => value >= 150).length, "#812f35"],
    ];
    const max = Math.max(...buckets.map((bucket) => bucket[1]), 1);
    const chartWidth = width - pad * 2;
    const barGap = 12;
    const barWidth = (chartWidth - barGap * (buckets.length - 1)) / buckets.length;

    buckets.forEach(([label, value, color], index) => {
      const x = pad + index * (barWidth + barGap);
      const barHeight = ((height - pad * 2) * value) / max;
      ctx.fillStyle = color;
      ctx.fillRect(x, height - pad - barHeight, barWidth, barHeight || 2);
      ctx.fillStyle = "#66746e";
      ctx.font = "12px system-ui";
      ctx.textAlign = "center";
      ctx.fillText(label, x + barWidth / 2, height - 16);
      ctx.fillStyle = "#17211d";
      ctx.font = "700 13px system-ui";
      ctx.fillText(String(value), x + barWidth / 2, height - pad - barHeight - 8);
    });
  });
}

export function drawPeriodPerformanceChart(canvas: HTMLCanvasElement, periods: PeriodPerformance[]): void {
  drawCanvas(canvas, ({ ctx, width, height, pad }) => {
    if (!periods.length) {
      drawEmptyState(ctx, width, height, "沒有可繪製的平倉資料");
      return;
    }

    const plotBottom = height - pad - 22;
    const pnlValues = periods.map((period) => period.pnl);
    const pnlMin = Math.min(...pnlValues, 0);
    const pnlMax = Math.max(...pnlValues, 0);
    const pnlY = scale(pnlMin, pnlMax, plotBottom, pad);
    const finitePf = periods.map((period) => period.profitFactor).filter(Number.isFinite);
    const pfMax = Math.max(...finitePf, 1.25);
    const pfY = scale(0, pfMax, plotBottom, pad);
    const step = periods.length > 1 ? (width - pad * 2) / (periods.length - 1) : width - pad * 2;
    const zeroY = pnlY(0);

    ctx.strokeStyle = "#dce4df";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(pad, zeroY);
    ctx.lineTo(width - pad, zeroY);
    ctx.stroke();

    periods.forEach((period, index) => {
      const x = pad + index * step;
      const barWidth = Math.max(10, Math.min(24, step * 0.46));
      const y = pnlY(period.pnl);
      ctx.fillStyle = period.pnl >= 0 ? "#119c65" : "#c54747";
      ctx.fillRect(x - barWidth / 2, Math.min(zeroY, y), barWidth, Math.abs(y - zeroY) || 2);
    });

    ctx.strokeStyle = "#17211d";
    ctx.lineWidth = 2.25;
    ctx.beginPath();
    periods.forEach((period, index) => {
      const x = pad + index * step;
      const boundedPf = Number.isFinite(period.profitFactor) ? period.profitFactor : pfMax;
      const y = pfY(Math.min(boundedPf, pfMax));
      if (index === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    });
    ctx.stroke();

    periods.forEach((period, index) => {
      const x = pad + index * step;
      const boundedPf = Number.isFinite(period.profitFactor) ? period.profitFactor : pfMax;
      const y = pfY(Math.min(boundedPf, pfMax));
      ctx.fillStyle = "#fbfcfb";
      ctx.strokeStyle = "#17211d";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(x, y, 4, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
    });

    ctx.fillStyle = "#66746e";
    ctx.font = "12px system-ui";
    ctx.textAlign = "left";
    ctx.fillText(money(pnlMax), pad, 18);
    ctx.fillText(money(pnlMin), pad, height - 8);
    ctx.textAlign = "right";
    ctx.fillText(`line: PF up to ${ratio(pfMax)}`, width - pad, 18);

    drawPeriodLabels(ctx, periods, { width, height, pad, step });
  });
}

function drawCanvas(
  canvas: HTMLCanvasElement,
  painter: (args: { ctx: CanvasRenderingContext2D; width: number; height: number; pad: number }) => void,
): void {
  const ratioValue = window.devicePixelRatio || 1;
  const rect = canvas.getBoundingClientRect();
  canvas.width = Math.max(320, rect.width) * ratioValue;
  canvas.height = Number(canvas.getAttribute("height")) * ratioValue;
  const ctx = canvas.getContext("2d");
  if (!ctx) return;
  ctx.scale(ratioValue, ratioValue);
  const width = canvas.width / ratioValue;
  const height = canvas.height / ratioValue;
  ctx.clearRect(0, 0, width, height);
  ctx.fillStyle = "#fbfcfb";
  ctx.fillRect(0, 0, width, height);
  painter({ ctx, width, height, pad: 38 });
}

function drawEmptyState(ctx: CanvasRenderingContext2D, width: number, height: number, text: string): void {
  ctx.fillStyle = "#66746e";
  ctx.font = "14px system-ui";
  ctx.textAlign = "center";
  ctx.fillText(text, width / 2, height / 2);
}

function drawAxisLabels(
  ctx: CanvasRenderingContext2D,
  { width, height, pad, min, max }: { width: number; height: number; pad: number; min: number; max: number },
): void {
  ctx.fillStyle = "#66746e";
  ctx.font = "12px system-ui";
  ctx.textAlign = "left";
  ctx.fillText(money(max), pad, 18);
  ctx.fillText(money(min), pad, height - 8);
  ctx.textAlign = "right";
  ctx.fillText("bars: daily, line: cumulative", width - pad, 18);
}

function scale(min: number, max: number, outMin: number, outMax: number): (value: number) => number {
  if (min === max) return () => (outMin + outMax) / 2;
  return (value) => outMin + ((value - min) / (max - min)) * (outMax - outMin);
}

function drawPeriodLabels(
  ctx: CanvasRenderingContext2D,
  periods: PeriodPerformance[],
  { width, height, pad, step }: { width: number; height: number; pad: number; step: number },
): void {
  const maxLabels = width < 620 ? 4 : 7;
  const interval = Math.max(1, Math.ceil(periods.length / maxLabels));
  ctx.fillStyle = "#66746e";
  ctx.font = "11px system-ui";
  ctx.textAlign = "center";
  periods.forEach((period, index) => {
    if (index % interval !== 0 && index !== periods.length - 1) return;
    const x = pad + index * step;
    ctx.fillText(shortPeriodLabel(period.label), x, height - 24);
  });
}

function shortPeriodLabel(label: string): string {
  if (label.includes(" - ")) return label.slice(5);
  return label;
}
