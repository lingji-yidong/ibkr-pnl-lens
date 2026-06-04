import type { FlexOrder, FlexTrade, StatementProfile } from "./types";

export interface FlexXmlParseResult {
  profile: StatementProfile;
  trades: FlexTrade[];
  lots: Record<string, string>[];
  orders: FlexOrder[];
}

export function parseFlexXml(text: string): FlexXmlParseResult {
  if (!looksLikeXml(text)) throw new Error("請上傳 IBKR Flex XML 文件。");

  const statementAttrs = parseFirstTagAttrs(text, "FlexStatement");
  const tradeRows = extractTagAttrs(text, "Trade");
  const lots = extractTagAttrs(text, "Lot");
  const orders = extractTagAttrs(text, "Order") as FlexOrder[];
  const trades = tradeRows.map(normalizeFlexTrade);
  const accountId = statementAttrs.accountId || "";

  return {
    profile: {
      accountId,
      maskedAccountId: maskAccount(accountId),
      period: formatFlexPeriod(statementAttrs.fromDate, statementAttrs.toDate),
      baseCurrency: tradeRows.find((row) => row.currency)?.currency || "USD",
    },
    trades,
    lots,
    orders,
  };
}

function normalizeFlexTrade(row: Record<string, string>): FlexTrade {
  const rawDate = row.dateTime || row.tradeDate || "";
  const date = parseFlexDate(rawDate);
  const notes = splitCodes(row.notes);
  const openCloseIndicator = row.openCloseIndicator || "";
  const actionCodes = [openCloseIndicator, ...notes].filter(Boolean);
  const displaySymbol = row.description || row.symbol || "";

  return {
    assetClass: flexAssetClass(row.assetCategory),
    currency: row.currency || "",
    symbol: displaySymbol,
    rawSymbol: row.symbol || "",
    displaySymbol,
    underlyingSymbol: row.underlyingSymbol || "",
    description: row.description || "",
    date,
    day: date ? date.toISOString().slice(0, 10) : formatFlexDay(row.tradeDate),
    quantity: num(row.quantity),
    tradePrice: num(row.tradePrice),
    proceeds: num(row.proceeds),
    commission: num(row.ibCommission),
    basis: num(row.cost),
    realizedPnl: num(row.fifoPnlRealized),
    mtmPnl: num(row.mtmPnl),
    code: actionCodes.join(";"),
    actionCodes,
    close: openCloseIndicator === "C",
    expired: notes.includes("Ep") || notes.includes("Ex"),
    autoExpiry: notes.includes("Ep"),
    closeReason: notes.includes("Ep") ? "expired" : notes.includes("Ex") ? "exercise_or_assignment" : "",
    transactionType: row.transactionType || "",
    expiry: row.expiry || "",
    putCall: row.putCall || "",
    strike: row.strike || "",
    multiplier: num(row.multiplier || 1),
  };
}

function looksLikeXml(text: string): boolean {
  return /^\s*</.test(text);
}

function parseFirstTagAttrs(text: string, tagName: string): Record<string, string> {
  return extractTagAttrs(text, tagName)[0] || {};
}

function extractTagAttrs(text: string, tagName: string): Record<string, string>[] {
  const pattern = new RegExp(`<${tagName}\\s+([^>]*?)(?:/?>)`, "g");
  const rows: Record<string, string>[] = [];
  let match: RegExpExecArray | null;
  while ((match = pattern.exec(text)) !== null) {
    rows.push(parseXmlAttrs(match[1] || ""));
  }
  return rows;
}

function parseXmlAttrs(source: string): Record<string, string> {
  const attrs: Record<string, string> = {};
  const pattern = /([A-Za-z_][\w:.-]*)="([^"]*)"/g;
  let match: RegExpExecArray | null;
  while ((match = pattern.exec(source)) !== null) {
    attrs[match[1] || ""] = decodeXml(match[2] || "");
  }
  return attrs;
}

function decodeXml(value: string): string {
  return value
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&amp;/g, "&");
}

function parseFlexDate(value: string): Date | null {
  if (!value) return null;
  const [datePart, timePart = "000000"] = value.split(";");
  if (!datePart || !/^\d{8}$/.test(datePart)) return null;
  const iso = `${datePart.slice(0, 4)}-${datePart.slice(4, 6)}-${datePart.slice(6, 8)}T${timePart.slice(0, 2) || "00"}:${timePart.slice(2, 4) || "00"}:${timePart.slice(4, 6) || "00"}`;
  const date = new Date(iso);
  return Number.isNaN(date.getTime()) ? null : date;
}

function formatFlexDay(value = ""): string {
  if (!/^\d{8}$/.test(value)) return "";
  return `${value.slice(0, 4)}-${value.slice(4, 6)}-${value.slice(6, 8)}`;
}

function formatFlexPeriod(fromDate = "", toDate = ""): string {
  const from = formatFlexDay(fromDate);
  const to = formatFlexDay(toDate);
  return from && to ? `${from} - ${to}` : "";
}

function splitCodes(value = ""): string[] {
  return value
    .split(";")
    .map((code) => code.trim())
    .filter(Boolean);
}

function flexAssetClass(value = ""): string {
  const map: Record<string, string> = {
    STK: "股票",
    OPT: "股票和指數期權",
    CASH: "現金",
    FUT: "期貨",
  };
  return map[value] || value;
}

function num(value: unknown): number {
  if (value === undefined || value === null) return 0;
  const cleaned = String(value).replace(/,/g, "").replace(/%$/, "").trim();
  if (!cleaned || cleaned === "--") return 0;
  const parsed = Number(cleaned);
  return Number.isFinite(parsed) ? parsed : 0;
}

function maskAccount(value = ""): string {
  if (value.length <= 4) return "****";
  return `${value.slice(0, 1)}${"*".repeat(Math.max(4, value.length - 3))}${value.slice(-2)}`;
}
