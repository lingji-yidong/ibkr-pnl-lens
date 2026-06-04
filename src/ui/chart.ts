import { money } from "../domain/format";
import type { ClosedTrade, DailyPnl } from "../domain/types";

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
