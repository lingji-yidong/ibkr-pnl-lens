export type Locale = "zh-Hant" | "zh-Hans" | "en" | "ja" | "ko" | "es" | "de" | "fr" | "ru" | "fi";

export interface LocaleOption {
  code: Locale;
  label: string;
}

export const localeOptions: LocaleOption[] = [
  { code: "zh-Hant", label: "繁中" },
  { code: "zh-Hans", label: "简中" },
  { code: "en", label: "English" },
  { code: "ja", label: "日本語" },
  { code: "ko", label: "한국어" },
  { code: "es", label: "Español" },
  { code: "de", label: "Deutsch" },
  { code: "fr", label: "Français" },
  { code: "ru", label: "Русский" },
  { code: "fi", label: "Suomi" },
];

export type TranslationKey =
  | "eyebrow"
  | "title"
  | "uploadMark"
  | "uploadTitle"
  | "uploadBody"
  | "nfaDisclaimer"
  | "chooseFile"
  | "account"
  | "name"
  | "neutralName"
  | "period"
  | "baseCurrency"
  | "closed"
  | "executions"
  | "netRealized"
  | "profitFactor"
  | "winRate"
  | "payoffRatio"
  | "expectancy"
  | "executionRecords"
  | "canceledOrders"
  | "commissionDrag"
  | "closedTradeSum"
  | "grossProfitLoss"
  | "averageWinLoss"
  | "perClosedTrade"
  | "flexTradeRecords"
  | "flexCanceledRecords"
  | "noCanceledRecords"
  | "equityCurve"
  | "dailyRealized"
  | "payoff"
  | "winLossDistribution"
  | "periodPerformance"
  | "periodHint"
  | "weekly"
  | "monthly"
  | "periodColumn"
  | "monthColumn"
  | "realized"
  | "pf"
  | "payoffShort"
  | "trades"
  | "assetBreakdown"
  | "assetBreakdownTitle"
  | "asset"
  | "average"
  | "optionReview"
  | "optionReviewTitle"
  | "underlying"
  | "date"
  | "dateCount"
  | "daysShort"
  | "autoExpiry"
  | "discipline"
  | "disciplineRisk"
  | "symbols"
  | "symbolPerformance"
  | "page"
  | "previousPage"
  | "nextPage"
  | "offlineCoach"
  | "offlineAdvice"
  | "bestLoserWins"
  | "theme"
  | "language"
  | "dark"
  | "light"
  | "stock"
  | "option"
  | "other"
  | "lossBucketSmall"
  | "lossBucketMedium"
  | "lossBucketLarge"
  | "winBucketSmall"
  | "winBucketMedium"
  | "winBucketLarge"
  | "chartEmpty"
  | "dailyChartLegend"
  | "periodChartLegend"
  | "importFailed"
  | "profitStatus"
  | "lossStatus"
  | "flatStatus"
  | "costStatus";

const zh: Record<TranslationKey, string> = {
  eyebrow: "IBKR Activity Statement",
  title: "盈虧比報表分析",
  uploadMark: "Flex XML",
  uploadTitle: "拖入或選擇 IBKR XML",
  uploadBody: "名稱、帳戶、地址會在畫面與本地分析中脫敏。",
  nfaDisclaimer: "僅供學習與交易復盤，不構成投資建議。",
  chooseFile: "選擇文件",
  account: "帳戶",
  name: "名稱",
  neutralName: "已脫敏",
  period: "期間",
  baseCurrency: "基礎貨幣",
  closed: "平倉",
  executions: "成交",
  netRealized: "淨已實現",
  profitFactor: "Profit Factor",
  winRate: "勝率",
  payoffRatio: "盈虧比",
  expectancy: "期望值",
  executionRecords: "成交記錄",
  canceledOrders: "取消委託",
  commissionDrag: "佣金拖累",
  closedTradeSum: "逐筆平倉合計",
  grossProfitLoss: "總盈利 / 總虧損",
  averageWinLoss: "平均盈利 / 平均虧損",
  perClosedTrade: "每筆平倉平均",
  flexTradeRecords: "Flex XML 的 Trade 記錄",
  flexCanceledRecords: "Flex XML 的 Order 取消記錄",
  noCanceledRecords: "此 XML 未提供取消委託",
  equityCurve: "Equity Curve",
  dailyRealized: "每日已實現損益",
  payoff: "Payoff",
  winLossDistribution: "贏虧分布",
  periodPerformance: "Period",
  periodHint: "綠柱為盈利，紅柱為虧損；PF 與盈虧比請看下方表格。",
  weekly: "週度",
  monthly: "月度",
  periodColumn: "週期",
  monthColumn: "月份",
  realized: "已實現",
  pf: "PF",
  payoffShort: "盈虧比",
  trades: "筆數",
  assetBreakdown: "Assets",
  assetBreakdownTitle: "股票 / 期權統計",
  asset: "資產",
  average: "平均",
  optionReview: "Options",
  optionReviewTitle: "期權標的復盤",
  underlying: "標的",
  date: "日期",
  dateCount: "日期數",
  daysShort: "天",
  autoExpiry: "自動到期",
  discipline: "Discipline",
  disciplineRisk: "紀律風險",
  symbols: "Symbols",
  symbolPerformance: "標的排行榜",
  page: "頁",
  previousPage: "上一頁",
  nextPage: "下一頁",
  offlineCoach: "Offline Coach",
  offlineAdvice: "離線建議",
  bestLoserWins: "Best Loser Wins",
  theme: "主題",
  language: "語言",
  dark: "深色",
  light: "淺色",
  stock: "股票",
  option: "期權",
  other: "其他",
  winBucketSmall: "小贏",
  winBucketMedium: "中贏",
  winBucketLarge: "大贏",
  lossBucketSmall: "小虧",
  lossBucketMedium: "中虧",
  lossBucketLarge: "大虧",
  chartEmpty: "沒有可繪製的平倉資料",
  dailyChartLegend: "柱狀：每日，線條：累計",
  periodChartLegend: "PF 點：參考 1.00，上限",
  importFailed: "匯入失敗",
  profitStatus: "盈利",
  lossStatus: "虧損",
  flatStatus: "持平",
  costStatus: "成本",
};

const sharedTerms: Partial<Record<TranslationKey, string>> = {
  eyebrow: "IBKR Activity Statement",
  uploadMark: "Flex XML",
  profitFactor: "Profit Factor",
  equityCurve: "Equity Curve",
  payoff: "Payoff",
  periodPerformance: "Period",
  pf: "PF",
  assetBreakdown: "Assets",
  optionReview: "Options",
  discipline: "Discipline",
  symbols: "Symbols",
  offlineCoach: "Offline Coach",
};

const overrides: Record<Exclude<Locale, "zh-Hant">, Partial<Record<TranslationKey, string>>> = {
  "zh-Hans": {
    title: "盈亏比报表分析", uploadTitle: "拖入或选择 IBKR XML", uploadBody: "名称、账户、地址会在画面与本地分析中脱敏。", nfaDisclaimer: "仅供学习与交易复盘，不构成投资建议。", chooseFile: "选择文件", account: "账户", name: "名称", neutralName: "已脱敏", period: "期间", baseCurrency: "基础货币", closed: "平仓", executions: "成交", netRealized: "净已实现", winRate: "胜率", payoffRatio: "盈亏比", expectancy: "期望值", executionRecords: "成交记录", canceledOrders: "取消委托", commissionDrag: "佣金拖累", closedTradeSum: "逐笔平仓合计", grossProfitLoss: "总盈利 / 总亏损", averageWinLoss: "平均盈利 / 平均亏损", perClosedTrade: "每笔平仓平均", flexTradeRecords: "Flex XML 的 Trade 记录", flexCanceledRecords: "Flex XML 的 Order 取消记录", noCanceledRecords: "此 XML 未提供取消委托", dailyRealized: "每日已实现损益", winLossDistribution: "盈亏分布", periodHint: "绿柱为盈利，红柱为亏损；PF 与盈亏比请看下方表格。", weekly: "周度", monthly: "月度", periodColumn: "周期", monthColumn: "月份", realized: "已实现", payoffShort: "盈亏比", trades: "笔数", assetBreakdownTitle: "股票 / 期权统计", asset: "资产", average: "平均", optionReviewTitle: "期权标的复盘", underlying: "标的", date: "日期", dateCount: "日期数", daysShort: "天", autoExpiry: "自动到期", disciplineRisk: "纪律风险", symbolPerformance: "标的排行榜", offlineAdvice: "离线建议", theme: "主题", language: "语言", dark: "深色", light: "浅色", stock: "股票", option: "期权", other: "其他", winBucketSmall: "小赢", winBucketMedium: "中赢", winBucketLarge: "大赢", lossBucketSmall: "小亏", lossBucketMedium: "中亏", lossBucketLarge: "大亏", chartEmpty: "没有可绘制的平仓资料", dailyChartLegend: "柱状：每日，线条：累计", periodChartLegend: "PF 点：参考 1.00，上限", importFailed: "导入失败", profitStatus: "盈利", lossStatus: "亏损", flatStatus: "持平", costStatus: "成本",
  },
  en: {
    title: "Profit Ratio Report", uploadTitle: "Drop or choose IBKR XML", uploadBody: "Names, accounts, and addresses are masked locally.", nfaDisclaimer: "For education and trade review only. Not financial advice.", chooseFile: "Choose file", account: "Account", name: "Name", neutralName: "Redacted", period: "Period", baseCurrency: "Base currency", closed: "closed", executions: "executions", netRealized: "Net realized", winRate: "Win rate", payoffRatio: "Payoff ratio", expectancy: "Expectancy", executionRecords: "Executions", canceledOrders: "Canceled orders", commissionDrag: "Commissions", closedTradeSum: "Closed trade total", grossProfitLoss: "Gross profit / gross loss", averageWinLoss: "Avg win / avg loss", perClosedTrade: "Per closed trade", flexTradeRecords: "Trade records in Flex XML", flexCanceledRecords: "Canceled Order records in Flex XML", noCanceledRecords: "No canceled orders in this XML", dailyRealized: "Daily realized P/L", winLossDistribution: "Win/loss distribution", periodHint: "Green bars are profit, red bars are loss. PF and payoff are in the table below.", weekly: "Weekly", monthly: "Monthly", periodColumn: "Period", monthColumn: "Month", realized: "Realized", payoffShort: "Payoff", trades: "Trades", assetBreakdownTitle: "Stock / option stats", asset: "Asset", average: "Average", optionReviewTitle: "Option review by underlying", underlying: "Underlying", date: "Date", dateCount: "Dates", daysShort: "d", autoExpiry: "Auto expiry", disciplineRisk: "Discipline risk", symbolPerformance: "Symbol leaderboard", offlineAdvice: "Offline advice", theme: "Theme", language: "Language", dark: "Dark", light: "Light", stock: "Stock", option: "Option", other: "Other", winBucketSmall: "Small win", winBucketMedium: "Mid win", winBucketLarge: "Large win", lossBucketSmall: "Small loss", lossBucketMedium: "Mid loss", lossBucketLarge: "Large loss", chartEmpty: "No closed trades to chart", dailyChartLegend: "bars: daily, line: cumulative", periodChartLegend: "PF, ref 1.00, cap", importFailed: "Import failed",
  },
  ja: {
    title: "損益比レポート", uploadTitle: "IBKR XML をドロップまたは選択", uploadBody: "氏名、口座、住所は画面上でマスクされます。", chooseFile: "ファイル選択", account: "口座", name: "氏名", period: "期間", baseCurrency: "基準通貨", closed: "決済", executions: "約定", netRealized: "実現損益", winRate: "勝率", payoffRatio: "損益比", expectancy: "期待値", executionRecords: "約定記録", canceledOrders: "取消注文", commissionDrag: "手数料", closedTradeSum: "決済取引合計", grossProfitLoss: "総利益 / 総損失", averageWinLoss: "平均利益 / 平均損失", perClosedTrade: "決済ごとの平均", flexTradeRecords: "Flex XML の Trade 記録", noCanceledRecords: "取消注文は含まれていません", dailyRealized: "日次実現損益", winLossDistribution: "勝敗分布", periodHint: "棒は純損益、折れ線の点は PF", weekly: "週次", monthly: "月次", periodColumn: "期間", monthColumn: "月", realized: "実現", payoffShort: "損益比", trades: "件数", assetBreakdownTitle: "株式 / オプション統計", asset: "資産", average: "平均", optionReviewTitle: "原資産別オプション復盤", underlying: "原資産", date: "日付", autoExpiry: "自動満期", disciplineRisk: "規律リスク", symbolPerformance: "銘柄ランキング", offlineAdvice: "オフライン助言", theme: "テーマ", language: "言語", dark: "ダーク", light: "ライト", stock: "株式", option: "オプション", other: "その他", chartEmpty: "表示できる決済取引がありません", importFailed: "読み込み失敗",
  },
  ko: {
    title: "손익비 리포트", uploadTitle: "IBKR XML 드롭 또는 선택", uploadBody: "이름, 계좌, 주소는 화면에서 마스킹됩니다.", chooseFile: "파일 선택", account: "계좌", name: "이름", period: "기간", baseCurrency: "기준 통화", closed: "청산", executions: "체결", netRealized: "실현 손익", winRate: "승률", payoffRatio: "손익비", expectancy: "기대값", executionRecords: "체결 기록", canceledOrders: "취소 주문", commissionDrag: "수수료", closedTradeSum: "청산 합계", grossProfitLoss: "총이익 / 총손실", averageWinLoss: "평균 이익 / 평균 손실", perClosedTrade: "청산 1건 평균", flexTradeRecords: "Flex XML Trade 기록", noCanceledRecords: "취소 주문 없음", dailyRealized: "일별 실현 손익", winLossDistribution: "승패 분포", periodHint: "막대는 순손익, 선의 점은 PF", weekly: "주간", monthly: "월간", periodColumn: "기간", monthColumn: "월", realized: "실현", payoffShort: "손익비", trades: "건수", assetBreakdownTitle: "주식 / 옵션 통계", asset: "자산", average: "평균", optionReviewTitle: "기초자산별 옵션 리뷰", underlying: "기초자산", date: "날짜", autoExpiry: "자동 만기", disciplineRisk: "규율 리스크", symbolPerformance: "종목 순위", offlineAdvice: "오프라인 조언", theme: "테마", language: "언어", dark: "다크", light: "라이트", stock: "주식", option: "옵션", other: "기타", chartEmpty: "표시할 청산 거래가 없습니다", importFailed: "가져오기 실패",
  },
  es: {
    title: "Informe de relación P/L", uploadTitle: "Suelta o elige XML de IBKR", uploadBody: "Nombre, cuenta y dirección se muestran anonimizados.", chooseFile: "Elegir archivo", account: "Cuenta", name: "Nombre", period: "Periodo", baseCurrency: "Divisa base", closed: "cerradas", executions: "ejecuciones", netRealized: "Realizado neto", winRate: "Tasa de acierto", payoffRatio: "Relación P/L", expectancy: "Expectativa", executionRecords: "Ejecuciones", canceledOrders: "Órdenes canceladas", commissionDrag: "Comisiones", closedTradeSum: "Total de cierres", grossProfitLoss: "Ganancia bruta / pérdida bruta", averageWinLoss: "Ganancia media / pérdida media", perClosedTrade: "Media por cierre", flexTradeRecords: "Registros Trade en Flex XML", noCanceledRecords: "Sin órdenes canceladas en este XML", dailyRealized: "P/L diario realizado", winLossDistribution: "Distribución de ganancias y pérdidas", periodHint: "Barras: P/L neto; puntos de línea: PF", weekly: "Semanal", monthly: "Mensual", periodColumn: "Periodo", monthColumn: "Mes", realized: "Realizado", payoffShort: "P/L", trades: "Trades", assetBreakdownTitle: "Estadísticas acciones / opciones", asset: "Activo", average: "Media", optionReviewTitle: "Opciones por subyacente", underlying: "Subyacente", date: "Fecha", autoExpiry: "Vencimiento auto", disciplineRisk: "Riesgo de disciplina", symbolPerformance: "Clasificación de símbolos", offlineAdvice: "Consejos offline", theme: "Tema", language: "Idioma", dark: "Oscuro", light: "Claro", stock: "Acciones", option: "Opciones", other: "Otros", chartEmpty: "No hay cierres para graficar", importFailed: "Error al importar",
  },
  de: {
    title: "Chance-Risiko-Bericht", uploadTitle: "IBKR XML ablegen oder wählen", uploadBody: "Name, Konto und Adresse werden lokal maskiert.", chooseFile: "Datei wählen", account: "Konto", name: "Name", period: "Zeitraum", baseCurrency: "Basiswährung", closed: "geschlossen", executions: "Ausführungen", netRealized: "Realisierter Netto-P/L", winRate: "Trefferquote", payoffRatio: "Payoff-Ratio", expectancy: "Erwartungswert", executionRecords: "Ausführungen", canceledOrders: "Stornierte Orders", commissionDrag: "Provisionen", closedTradeSum: "Summe geschlossener Trades", grossProfitLoss: "Bruttogewinn / Bruttoverlust", averageWinLoss: "Ø Gewinn / Ø Verlust", perClosedTrade: "Je geschlossenem Trade", flexTradeRecords: "Trade-Datensätze in Flex XML", noCanceledRecords: "Keine stornierten Orders im XML", dailyRealized: "Täglich realisierter P/L", winLossDistribution: "Gewinn-/Verlustverteilung", periodHint: "Balken: Netto-P/L, Linienpunkte: PF", weekly: "Wöchentlich", monthly: "Monatlich", periodColumn: "Zeitraum", monthColumn: "Monat", realized: "Realisiert", payoffShort: "Payoff", trades: "Trades", assetBreakdownTitle: "Aktien- / Optionsstatistik", asset: "Asset", average: "Durchschnitt", optionReviewTitle: "Optionen nach Basiswert", underlying: "Basiswert", date: "Datum", autoExpiry: "Auto-Verfall", disciplineRisk: "Disziplinrisiko", symbolPerformance: "Symbol-Rangliste", offlineAdvice: "Offline-Hinweise", theme: "Theme", language: "Sprache", dark: "Dunkel", light: "Hell", stock: "Aktien", option: "Optionen", other: "Andere", chartEmpty: "Keine geschlossenen Trades für das Diagramm", importFailed: "Import fehlgeschlagen",
  },
  fr: {
    title: "Rapport ratio gain/perte", uploadTitle: "Déposez ou choisissez un XML IBKR", uploadBody: "Nom, compte et adresse sont masqués localement.", chooseFile: "Choisir fichier", account: "Compte", name: "Nom", period: "Période", baseCurrency: "Devise de base", closed: "clôturées", executions: "exécutions", netRealized: "Réalisé net", winRate: "Taux de réussite", payoffRatio: "Ratio gain/perte", expectancy: "Espérance", executionRecords: "Exécutions", canceledOrders: "Ordres annulés", commissionDrag: "Commissions", closedTradeSum: "Total des clôtures", grossProfitLoss: "Gain brut / perte brute", averageWinLoss: "Gain moyen / perte moyenne", perClosedTrade: "Par trade clôturé", flexTradeRecords: "Enregistrements Trade Flex XML", noCanceledRecords: "Aucun ordre annulé dans ce XML", dailyRealized: "P/L réalisé quotidien", winLossDistribution: "Distribution gains/pertes", periodHint: "Barres : P/L net ; points de ligne : PF", weekly: "Hebdo", monthly: "Mensuel", periodColumn: "Période", monthColumn: "Mois", realized: "Réalisé", payoffShort: "Ratio", trades: "Trades", assetBreakdownTitle: "Stats actions / options", asset: "Actif", average: "Moyenne", optionReviewTitle: "Options par sous-jacent", underlying: "Sous-jacent", date: "Date", autoExpiry: "Expiration auto", disciplineRisk: "Risque de discipline", symbolPerformance: "Classement des symboles", offlineAdvice: "Conseils hors ligne", theme: "Thème", language: "Langue", dark: "Sombre", light: "Clair", stock: "Actions", option: "Options", other: "Autres", chartEmpty: "Aucun trade clôturé à afficher", importFailed: "Échec import",
  },
  ru: {
    title: "Отчет по соотношению P/L", uploadTitle: "Перетащите или выберите XML IBKR", uploadBody: "Имя, счет и адрес маскируются локально.", chooseFile: "Выбрать файл", account: "Счет", name: "Имя", period: "Период", baseCurrency: "Базовая валюта", closed: "закрыто", executions: "исполнений", netRealized: "Чистый реализ. P/L", winRate: "Доля побед", payoffRatio: "Payoff ratio", expectancy: "Ожидание", executionRecords: "Исполнения", canceledOrders: "Отмененные заявки", commissionDrag: "Комиссии", closedTradeSum: "Итог закрытых сделок", grossProfitLoss: "Валовая прибыль / убыток", averageWinLoss: "Средняя прибыль / убыток", perClosedTrade: "На закрытую сделку", flexTradeRecords: "Записи Trade в Flex XML", noCanceledRecords: "Отмененных заявок нет", dailyRealized: "Дневной реализ. P/L", winLossDistribution: "Распределение побед/убытков", periodHint: "Столбцы: P/L; точки линии: PF", weekly: "Неделя", monthly: "Месяц", periodColumn: "Период", monthColumn: "Месяц", realized: "Реализ.", payoffShort: "Payoff", trades: "Сделки", assetBreakdownTitle: "Статистика акций / опционов", asset: "Актив", average: "Среднее", optionReviewTitle: "Опционы по базовому активу", underlying: "Базовый актив", date: "Дата", autoExpiry: "Автоэксп.", disciplineRisk: "Риск дисциплины", symbolPerformance: "Рейтинг символов", offlineAdvice: "Офлайн-советы", theme: "Тема", language: "Язык", dark: "Темная", light: "Светлая", stock: "Акции", option: "Опционы", other: "Другое", chartEmpty: "Нет закрытых сделок для графика", importFailed: "Ошибка импорта",
  },
  fi: {
    title: "Tuotto-riskisuhteen raportti", uploadTitle: "Pudota tai valitse IBKR XML", uploadBody: "Nimi, tili ja osoite peitetään paikallisesti.", chooseFile: "Valitse tiedosto", account: "Tili", name: "Nimi", neutralName: "Peitetty", period: "Jakso", baseCurrency: "Perusvaluutta", closed: "suljettua", executions: "toteutusta", netRealized: "Nettorealisoitu", winRate: "Voittoprosentti", payoffRatio: "Tuotto-riskisuhde", expectancy: "Odotusarvo", executionRecords: "Toteutukset", canceledOrders: "Perutut toimeksiannot", commissionDrag: "Palkkiot", closedTradeSum: "Suljettujen kauppojen summa", grossProfitLoss: "Bruttovoitto / bruttotappio", averageWinLoss: "Keskivoitto / keskitappio", perClosedTrade: "Per suljettu kauppa", flexTradeRecords: "Flex XML:n Trade-rivit", flexCanceledRecords: "Flex XML:n perutut Order-rivit", noCanceledRecords: "Tässä XML:ssä ei ole peruttuja toimeksiantoja", dailyRealized: "Päivittäinen realisoitu P/L", winLossDistribution: "Voittojen ja tappioiden jakauma", periodHint: "Vihreät pylväät ovat voittoa, punaiset tappiota. PF ja suhde ovat alla taulukossa.", weekly: "Viikko", monthly: "Kuukausi", periodColumn: "Jakso", monthColumn: "Kuukausi", realized: "Realisoitu", payoffShort: "Suhde", trades: "Kaupat", assetBreakdownTitle: "Osake- / optiotilastot", asset: "Omaisuuslaji", average: "Keskiarvo", optionReviewTitle: "Optiot kohde-etuuden mukaan", underlying: "Kohde-etuus", date: "Päivä", autoExpiry: "Automaattinen erääntyminen", disciplineRisk: "Kurinalaisuuden riski", symbolPerformance: "Symbolien ranking", offlineAdvice: "Offline-neuvot", theme: "Teema", language: "Kieli", dark: "Tumma", light: "Vaalea", stock: "Osakkeet", option: "Optiot", other: "Muut", winBucketSmall: "Pieni voitto", winBucketMedium: "Keskivoitto", winBucketLarge: "Suuri voitto", lossBucketSmall: "Pieni tappio", lossBucketMedium: "Keskitappio", lossBucketLarge: "Suuri tappio", chartEmpty: "Ei suljettuja kauppoja kaavioon", dailyChartLegend: "pylväät: päivä, viiva: kumulatiivinen", periodChartLegend: "PF, viite 1.00, yläraja", importFailed: "Tuonti epäonnistui",
  },
};

const completionOverrides: Record<Exclude<Locale, "zh-Hant">, Partial<Record<TranslationKey, string>>> = {
  "zh-Hans": {
    ...sharedTerms,
    page: "页",
    previousPage: "上一页",
    nextPage: "下一页",
  },
  en: {
    ...sharedTerms,
    neutralName: "Redacted",
    optionReviewTitle: "Option review by underlying",
    page: "Page",
    previousPage: "Previous page",
    nextPage: "Next page",
    periodHint: "Green bars are profit, red bars are loss. PF and payoff are in the table below.",
    dateCount: "Dates",
    daysShort: "d",
    profitStatus: "Profit",
    lossStatus: "Loss",
    flatStatus: "Flat",
    costStatus: "Cost",
  },
  ja: {
    ...sharedTerms,
    nfaDisclaimer: "学習と取引レビュー目的のみで、投資助言ではありません。",
    neutralName: "マスク済み",
    optionReviewTitle: "原資産別オプション復盤",
    page: "ページ",
    previousPage: "前のページ",
    nextPage: "次のページ",
    periodHint: "緑の棒は利益、赤の棒は損失です。PF と損益比は下の表で確認できます。",
    dateCount: "日数",
    daysShort: "日",
    flexCanceledRecords: "Flex XML の取消 Order 記録",
    lossBucketSmall: "小損",
    lossBucketMedium: "中損",
    lossBucketLarge: "大損",
    winBucketSmall: "小勝",
    winBucketMedium: "中勝",
    winBucketLarge: "大勝",
    dailyChartLegend: "棒：日次、線：累積",
    periodChartLegend: "PF 点、基準 1.00、上限",
    profitStatus: "利益",
    lossStatus: "損失",
    flatStatus: "横ばい",
    costStatus: "コスト",
  },
  ko: {
    ...sharedTerms,
    nfaDisclaimer: "학습과 거래 리뷰용이며 투자 조언이 아닙니다.",
    neutralName: "마스킹됨",
    optionReviewTitle: "기초자산별 옵션 리뷰",
    page: "페이지",
    previousPage: "이전 페이지",
    nextPage: "다음 페이지",
    periodHint: "녹색 막대는 이익, 빨간 막대는 손실입니다. PF와 손익비는 아래 표에서 확인하세요.",
    dateCount: "날짜 수",
    daysShort: "일",
    flexCanceledRecords: "Flex XML의 취소 Order 기록",
    lossBucketSmall: "소액 손실",
    lossBucketMedium: "중간 손실",
    lossBucketLarge: "큰 손실",
    winBucketSmall: "소액 이익",
    winBucketMedium: "중간 이익",
    winBucketLarge: "큰 이익",
    dailyChartLegend: "막대: 일별, 선: 누적",
    periodChartLegend: "PF 점, 기준 1.00, 상한",
    profitStatus: "이익",
    lossStatus: "손실",
    flatStatus: "보합",
    costStatus: "비용",
  },
  es: {
    ...sharedTerms,
    nfaDisclaimer: "Solo para aprendizaje y revisión de operaciones. No es asesoramiento financiero.",
    neutralName: "Anonimizado",
    optionReviewTitle: "Opciones por subyacente",
    page: "Página",
    previousPage: "Página anterior",
    nextPage: "Página siguiente",
    periodHint: "Barras verdes: ganancia; rojas: pérdida. PF y ratio P/L están en la tabla inferior.",
    dateCount: "Fechas",
    daysShort: "d",
    flexCanceledRecords: "Registros Order cancelados en Flex XML",
    lossBucketSmall: "Pérdida pequeña",
    lossBucketMedium: "Pérdida media",
    lossBucketLarge: "Pérdida grande",
    winBucketSmall: "Ganancia pequeña",
    winBucketMedium: "Ganancia media",
    winBucketLarge: "Ganancia grande",
    dailyChartLegend: "barras: diario, línea: acumulado",
    periodChartLegend: "puntos PF, ref. 1.00, límite",
    profitStatus: "Ganancia",
    lossStatus: "Pérdida",
    flatStatus: "Plano",
    costStatus: "Coste",
  },
  de: {
    ...sharedTerms,
    nfaDisclaimer: "Nur für Lernen und Trade-Review. Keine Finanzberatung.",
    neutralName: "Maskiert",
    optionReviewTitle: "Optionen nach Basiswert",
    page: "Seite",
    previousPage: "Vorherige Seite",
    nextPage: "Nächste Seite",
    periodHint: "Grüne Balken zeigen Gewinn, rote Verlust. PF und Payoff stehen in der Tabelle unten.",
    dateCount: "Tage",
    daysShort: "T",
    flexCanceledRecords: "Stornierte Order-Datensätze in Flex XML",
    lossBucketSmall: "Kleiner Verlust",
    lossBucketMedium: "Mittlerer Verlust",
    lossBucketLarge: "Großer Verlust",
    winBucketSmall: "Kleiner Gewinn",
    winBucketMedium: "Mittlerer Gewinn",
    winBucketLarge: "Großer Gewinn",
    dailyChartLegend: "Balken: täglich, Linie: kumuliert",
    periodChartLegend: "PF-Punkte, Ref. 1.00, Obergrenze",
    profitStatus: "Gewinn",
    lossStatus: "Verlust",
    flatStatus: "Neutral",
    costStatus: "Kosten",
  },
  fr: {
    ...sharedTerms,
    nfaDisclaimer: "Réservé à l'apprentissage et à la revue de trades. Pas un conseil financier.",
    neutralName: "Masqué",
    optionReviewTitle: "Options par sous-jacent",
    page: "Page",
    previousPage: "Page précédente",
    nextPage: "Page suivante",
    periodHint: "Barres vertes : gain ; rouges : perte. PF et ratio sont dans le tableau ci-dessous.",
    dateCount: "Dates",
    daysShort: "j",
    flexCanceledRecords: "Enregistrements Order annulés dans Flex XML",
    lossBucketSmall: "Petite perte",
    lossBucketMedium: "Perte moyenne",
    lossBucketLarge: "Grande perte",
    winBucketSmall: "Petit gain",
    winBucketMedium: "Gain moyen",
    winBucketLarge: "Grand gain",
    dailyChartLegend: "barres : quotidien, ligne : cumulé",
    periodChartLegend: "points PF, réf. 1.00, plafond",
    profitStatus: "Gain",
    lossStatus: "Perte",
    flatStatus: "Stable",
    costStatus: "Coût",
  },
  ru: {
    ...sharedTerms,
    nfaDisclaimer: "Только для обучения и разбора сделок. Не является финансовым советом.",
    neutralName: "Скрыто",
    optionReviewTitle: "Опционы по базовому активу",
    page: "Страница",
    previousPage: "Предыдущая страница",
    nextPage: "Следующая страница",
    periodHint: "Зеленые столбцы: прибыль, красные: убыток. PF и payoff указаны в таблице ниже.",
    dateCount: "Даты",
    daysShort: "д",
    flexCanceledRecords: "Отмененные записи Order в Flex XML",
    lossBucketSmall: "Малый убыток",
    lossBucketMedium: "Средний убыток",
    lossBucketLarge: "Крупный убыток",
    winBucketSmall: "Малая прибыль",
    winBucketMedium: "Средняя прибыль",
    winBucketLarge: "Крупная прибыль",
    dailyChartLegend: "столбцы: день, линия: накоплено",
    periodChartLegend: "точки PF, ориентир 1.00, лимит",
    profitStatus: "Прибыль",
    lossStatus: "Убыток",
    flatStatus: "Без изм.",
    costStatus: "Затраты",
  },
  fi: {
    ...sharedTerms,
    nfaDisclaimer: "Vain opiskeluun ja kaupankäynnin läpikäyntiin. Ei sijoitusneuvo.",
    neutralName: "Peitetty",
    optionReviewTitle: "Optiot kohde-etuuden mukaan",
    page: "Sivu",
    previousPage: "Edellinen sivu",
    nextPage: "Seuraava sivu",
    periodHint: "Vihreät pylväät ovat voittoa, punaiset tappiota. PF ja suhde ovat alla taulukossa.",
    dateCount: "Päivät",
    daysShort: "pv",
    profitStatus: "Voitto",
    lossStatus: "Tappio",
    flatStatus: "Tasainen",
    costStatus: "Kulu",
  },
};

export const translationKeys = Object.keys(zh) as TranslationKey[];

export const translations: Record<Locale, Record<TranslationKey, string>> = {
  "zh-Hant": zh,
  "zh-Hans": completeLocale("zh-Hans"),
  en: completeLocale("en"),
  ja: completeLocale("ja"),
  ko: completeLocale("ko"),
  es: completeLocale("es"),
  de: completeLocale("de"),
  fr: completeLocale("fr"),
  ru: completeLocale("ru"),
  fi: completeLocale("fi"),
};

export function t(locale: Locale, key: TranslationKey): string {
  return translations[locale][key];
}

export function normalizeLocale(value: string | null | undefined): Locale {
  return localeOptions.some((option) => option.code === value) ? (value as Locale) : "zh-Hant";
}

function completeLocale(locale: Exclude<Locale, "zh-Hant">): Record<TranslationKey, string> {
  return {
    ...zh,
    ...completionOverrides[locale],
    ...overrides[locale],
    ...completionOverrides[locale],
  };
}
