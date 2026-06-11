export type AssetClass = "stock" | "option" | "cash" | "future" | string;
export type AssetGroup = "stock" | "option" | "other";
export type DomainErrorCode = "invalid_flex_xml";

export interface StatementProfile {
  accountId: string;
  maskedAccountId: string;
  period: string;
  baseCurrency: string;
}

export interface StatementAccountSummary {
  index: number;
  accountId: string;
  maskedAccountId: string;
  period: string;
  baseCurrency: string;
  tradeCount: number;
  orderCount: number;
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
  netCash: number;
  basis: number;
  fifoRealizedPnl: number;
  realizedPnl: number;
  mtmPnl: number;
  code: string;
  actionCodes: string[];
  close: boolean;
  expired: boolean;
  autoExpiry: boolean;
  closeReason: "" | "expired" | "exercise_or_assignment";
  transactionType: string;
  strategyGroupId: string;
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
  autoExpiryCount: number;
  medianHoldingDays: number;
  holdingSampleCount: number;
}

export type PositionDirection = "long" | "short" | "neutral";
export type HoldingBucket = "intraday" | "swing" | "position" | "long_term";
export type IntradaySession = "morning" | "midday" | "late";

export interface ClosedPositionSlice {
  symbol: string;
  assetClass: AssetClass;
  direction: PositionDirection;
  openDay: string;
  closeDay: string;
  holdingDays: number;
  quantity: number;
  pnl: number;
  underlyingSymbol?: string;
  expiry?: string;
  putCall?: string;
  strike?: number;
  openingQuantity?: number;
  strategyGroupId?: string;
}

export interface HoldingPeriodSummary {
  bucket: HoldingBucket;
  medianHoldingDays: number;
  pnl: number;
  grossProfit: number;
  grossLoss: number;
  profitFactor: number;
  payoffRatio: number;
  winRate: number;
  count: number;
  wins: number;
  losses: number;
  average: number;
}

export interface DirectionSummary {
  direction: PositionDirection;
  medianHoldingDays: number;
  pnl: number;
  grossProfit: number;
  grossLoss: number;
  profitFactor: number;
  payoffRatio: number;
  winRate: number;
  count: number;
  wins: number;
  losses: number;
  average: number;
}

export interface DailyPnl {
  day: string;
  pnl: number;
  count: number;
  wins: number;
  losses: number;
  cumulative: number;
}

export interface PeriodPerformance {
  label: string;
  pnl: number;
  grossProfit: number;
  grossLoss: number;
  profitFactor: number;
  payoffRatio: number;
  winRate: number;
  count: number;
  wins: number;
  losses: number;
}

export interface IntradaySessionSummary {
  session: IntradaySession;
  pnl: number;
  medianPnl: number;
  grossProfit: number;
  grossLoss: number;
  profitFactor: number;
  payoffRatio: number;
  winRate: number;
  count: number;
  wins: number;
  losses: number;
  average: number;
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

export interface AssetGroupSummary {
  group: AssetGroup;
  pnl: number;
  grossProfit: number;
  grossLoss: number;
  profitFactor: number;
  payoffRatio: number;
  winRate: number;
  count: number;
  wins: number;
  losses: number;
  average: number;
}

export interface OptionUnderlyingDaySummary {
  underlying: string;
  day: string;
  pnl: number;
  grossProfit: number;
  grossLoss: number;
  profitFactor: number;
  payoffRatio: number;
  winRate: number;
  count: number;
  wins: number;
  losses: number;
  autoExpiryCount: number;
}

export interface ParsedStatement {
  profile: StatementProfile;
  accounts: StatementAccountSummary[];
  selectedAccountIndex: number;
  trades: FlexTrade[];
  closedTrades: ClosedTrade[];
  canceledOrders: FlexOrder[];
  metrics: MetricSummary;
  daily: DailyPnl[];
  weekly: PeriodPerformance[];
  monthly: PeriodPerformance[];
  intradaySessions: IntradaySessionSummary[];
  symbols: SymbolSummary[];
  assetGroups: AssetGroupSummary[];
  optionUnderlyingDays: OptionUnderlyingDaySummary[];
  optionTrades: ClosedTrade[];
  closedPositionSlices: ClosedPositionSlice[];
  holdingPeriods: HoldingPeriodSummary[];
  directionSummaries: DirectionSummary[];
}
