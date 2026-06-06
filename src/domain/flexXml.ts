import type { DomainErrorCode, FlexOrder, FlexTrade, StatementAccountSummary, StatementProfile } from "./types";

export class DomainError extends Error {
  constructor(public readonly code: DomainErrorCode) {
    super(code);
    this.name = "DomainError";
  }
}

export interface FlexXmlParseResult {
  profile: StatementProfile;
  accounts: StatementAccountSummary[];
  selectedAccountIndex: number;
  trades: FlexTrade[];
  orders: FlexOrder[];
}

export function parseFlexXml(text: string, selectedAccountIndex = 0): FlexXmlParseResult {
  if (!looksLikeXml(text)) throw new DomainError("invalid_flex_xml");

  const statements = extractStatementBlocks(text);
  const selected = statements[Math.min(Math.max(selectedAccountIndex, 0), statements.length - 1)] || statements[0] || buildGlobalStatement(text);
  const tradeRows = extractTagAttrs(selected.content, "Trade");
  const orders = extractTagAttrs(selected.content, "Order") as FlexOrder[];
  const trades = applyMatchedRealizedPnl(tradeRows.map(normalizeFlexTrade));
  const accountId = selected.attrs.accountId || "";

  return {
    profile: {
      accountId,
      maskedAccountId: maskAccount(accountId),
      period: formatFlexPeriod(selected.attrs.fromDate, selected.attrs.toDate),
      baseCurrency: tradeRows.find((row) => row.currency)?.currency || "USD",
    },
    accounts: statements.map(statementSummary),
    selectedAccountIndex: selected.index,
    trades,
    orders,
  };
}

interface StatementBlock {
  index: number;
  attrs: Record<string, string>;
  content: string;
}

function extractStatementBlocks(text: string): StatementBlock[] {
  const pattern = /<FlexStatement\b([^>]*)>([\s\S]*?)<\/FlexStatement>/g;
  const statements: StatementBlock[] = [];
  let match: RegExpExecArray | null;
  while ((match = pattern.exec(text)) !== null) {
    statements.push({
      index: statements.length,
      attrs: parseXmlAttrs(match[1] || ""),
      content: match[2] || "",
    });
  }
  return statements.length ? statements : [buildGlobalStatement(text)];
}

function buildGlobalStatement(text: string): StatementBlock {
  return {
    index: 0,
    attrs: parseFirstTagAttrs(text, "FlexStatement"),
    content: text,
  };
}

function statementSummary(statement: StatementBlock): StatementAccountSummary {
  const tradeRows = extractTagAttrs(statement.content, "Trade");
  const orders = extractTagAttrs(statement.content, "Order");
  const accountId = statement.attrs.accountId || "";
  return {
    index: statement.index,
    accountId,
    maskedAccountId: maskAccount(accountId),
    period: formatFlexPeriod(statement.attrs.fromDate, statement.attrs.toDate),
    baseCurrency: tradeRows.find((row) => row.currency)?.currency || "USD",
    tradeCount: tradeRows.length,
    orderCount: orders.length,
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
    netCash: cashFlow(row),
    basis: num(row.cost),
    fifoRealizedPnl: num(row.fifoPnlRealized),
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

interface OpenExecutionLot {
  remaining: number;
  cashPerUnit: number;
}

function applyMatchedRealizedPnl(trades: FlexTrade[]): FlexTrade[] {
  const stacks = new Map<string, OpenExecutionLot[]>();
  const matchedTrades = [...trades];

  for (const { trade, index } of trades
    .map((trade, index) => ({ trade, index }))
    .sort((a, b) => tradeTime(a.trade) - tradeTime(b.trade))) {
      const quantity = Math.abs(trade.quantity);
      if (!quantity) continue;

      const key = positionKey(trade);
      const cashPerUnit = trade.netCash / quantity;

      if (!trade.close) {
        const stack = stacks.get(key) || [];
        stack.push({ remaining: quantity, cashPerUnit });
        stacks.set(key, stack);
        continue;
      }

      const stack = stacks.get(key) || [];
      let remaining = quantity;
      let matchedOpenCash = 0;

      while (remaining > 0 && stack.length) {
        const lot = stack[stack.length - 1];
        if (!lot) break;
        const matched = Math.min(remaining, lot.remaining);
        matchedOpenCash += lot.cashPerUnit * matched;
        lot.remaining -= matched;
        remaining -= matched;
        if (lot.remaining <= 1e-8) stack.pop();
      }

      if (remaining > 1e-8) continue;

      stacks.set(key, stack);
      matchedTrades[index] = {
        ...trade,
        realizedPnl: trade.netCash + matchedOpenCash,
      };
    }

  return matchedTrades;
}

function positionKey(trade: FlexTrade): string {
  return [
    trade.currency,
    trade.rawSymbol || trade.displaySymbol,
    trade.expiry,
    trade.putCall,
    trade.strike,
  ].join("|");
}

function tradeTime(trade: FlexTrade): number {
  return trade.date?.getTime() ?? 0;
}

function cashFlow(row: Record<string, string>): number {
  if (row.netCash) return num(row.netCash);
  return num(row.proceeds) + num(row.ibCommission);
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
    STK: "stock",
    OPT: "option",
    CASH: "cash",
    FUT: "future",
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
