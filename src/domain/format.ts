export function money(value: number): string {
  const sign = value < 0 ? "-" : "";
  return `${sign}$${Math.abs(value).toLocaleString(undefined, { maximumFractionDigits: 2 })}`;
}

export function percent(value: number): string {
  return `${(value * 100).toFixed(1)}%`;
}

export function ratio(value: number): string {
  if (value === Infinity) return "∞";
  return Number.isFinite(value) ? value.toFixed(2) : "0.00";
}

export function escapeHtml(value: unknown): string {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}
