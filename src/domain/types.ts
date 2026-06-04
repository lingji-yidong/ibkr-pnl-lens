export type AssetClass = "股票" | "股票和指數期權" | "現金" | "期貨" | string;

export interface StatementProfile {
  accountId: string;
  maskedAccountId: string;
  period: string;
  baseCurrency: string;
}

export interface FlexTrade {
  assetClass: AssetClass;
  currency: string;
  symbol: string;
  rawSymbol: string;
  displaySymbol: string;
  underlyingSymbol: string;
  description: string;
  date: Date | null;
  day: string;
  quantity: number;
  tradePrice: number;
  proceeds: number;
  commission: number;
  basis: number;
  realizedPnl: number;
  mtmPnl: number;
  code: string;
  actionCodes: string[];
  close: boolean;
  expired: boolean;
  autoExpiry: boolean;
  closeReason: "" | "expired" | "exercise_or_assignment";
  transactionType: string;
  expiry: string;
  putCall: string;
  strike: string;
  multiplier: number;
}

export interface ClosedTrade extends FlexTrade {
  close: true;
}

export interface FlexOrder {
  status?: string;
  orderStatus?: string;
  openCloseIndicator?: string;
  notes?: string;
  transactionType?: string;
  [key: string]: string | undefined;
}

export interface MetricSummary {
  net: number;
  realizedTotal: number;
  grossProfit: number;
  grossLoss: number;
  tradeCount: number;
  executionCount: number;
  closedCount: number;
  canceledOrderCount: number;
  winCount: number;
  lossCount: number;
  winRate: number;
  profitFactor: number;
  payoffRatio: number;
  avgWin: number;
  avgLoss: number;
  expectancy: number;
  commissions: number;
  endingNav: number;
  deposits: number;
  openPositions: number;
  unrealizedPnl: number;
  lotCount: number;
  autoExpiryCount: number;
}

export interface DailyPnl {
  day: string;
  pnl: number;
  count: number;
  wins: number;
  losses: number;
  cumulative: number;
}

export interface SymbolSummary {
  symbol: string;
  assetClass: AssetClass;
  pnl: number;
  count: number;
  wins: number;
  losses: number;
  winRate: number;
  average: number;
}

export interface Insight {
  title: string;
  body: string;
}

export interface ParsedStatement {
  profile: StatementProfile;
  trades: FlexTrade[];
  closedTrades: ClosedTrade[];
  canceledOrders: FlexOrder[];
  metrics: MetricSummary;
  daily: DailyPnl[];
  symbols: SymbolSummary[];
  discipline: Insight[];
  bestLoserWins: Insight[];
  offlineAdvice: Insight[];
}
