import { money, percent, ratio } from "../domain/format";
import type { Insight, ParsedStatement } from "../domain/types";
import type { Locale } from "./i18n";

export interface AdviceBundle {
  discipline: Insight[];
  bestLoserWins: Insight[];
  offlineAdvice: Insight[];
}

export function buildLocalizedAdvice(report: ParsedStatement, locale: Locale): AdviceBundle {
  const { metrics } = report;
  const option = report.assetGroups.find((row) => row.group === "option");
  const stock = report.assetGroups.find((row) => row.group === "stock");
  const autoExpiryLosses = report.closedTrades.filter((trade) => trade.autoExpiry && trade.realizedPnl < 0);
  const largeLossThreshold = Math.max(100, metrics.avgWin);
  const largeLosses = report.closedTrades.filter((trade) => trade.realizedPnl < -largeLossThreshold);
  const overTradeDays = report.daily.filter((day) => day.count >= 6 && day.pnl < 0);

  if (locale !== "zh-Hant" && locale !== "zh-Hans") {
    return buildEnglishFallback(report);
  }

  const discipline: Insight[] = [];
  if (metrics.profitFactor < 1) {
    discipline.push({
      title: "PF 低於 1，先處理虧損尾巴",
      body: `目前 PF ${ratio(metrics.profitFactor)}，代表總盈利還蓋不住總虧損。下一步優先降低單筆大虧與到期歸零，而不是增加交易次數。`,
    });
  } else if (metrics.profitFactor < 1.5) {
    discipline.push({
      title: "PF 有基礎，但容錯不高",
      body: `目前 PF ${ratio(metrics.profitFactor)}。這類狀態最怕一兩筆失控虧損吃掉整段成果，適合加強單日最大虧損與最晚離場規則。`,
    });
  } else {
    discipline.push({
      title: "PF 結構相對健康",
      body: `目前 PF ${ratio(metrics.profitFactor)}，可以開始檢查哪些標的與時段最穩，保留高品質交易而不是盲目放大頻率。`,
    });
  }

  if (metrics.payoffRatio < 1 && metrics.winRate < 0.55) {
    discipline.push({
      title: "勝率與盈虧比不能同時偏弱",
      body: `勝率 ${percent(metrics.winRate)}、盈虧比 ${ratio(metrics.payoffRatio)}。若平均虧損大於平均盈利，進場前要更嚴格確認目標空間。`,
    });
  } else if (metrics.payoffRatio < 1) {
    discipline.push({
      title: "勝率在補洞，但平均虧損仍偏重",
      body: `勝率 ${percent(metrics.winRate)} 還能支撐部分結果，但盈虧比 ${ratio(metrics.payoffRatio)} 代表一筆壞交易會吃掉多筆好交易。`,
    });
  }

  if (overTradeDays.length) {
    discipline.push({
      title: "虧損日有加速跡象",
      body: `${overTradeDays.length} 天同時出現高交易數與負損益。虧損日的第二、第三筆交易要特別檢查是否仍符合原計畫。`,
    });
  }

  if (autoExpiryLosses.length) {
    discipline.push({
      title: "自動到期不是雜訊",
      body: `${autoExpiryLosses.length} 筆 Ep 自動到期虧損已納入。建議把「最後可接受離場時間」寫成規則，而不是等到收盤前靠臨場判斷。`,
    });
  }

  const bestLoserWins: Insight[] = [
    {
      title: "好的輸家會保護下一筆交易",
      body: `本期平均盈利 ${money(metrics.avgWin)}、平均虧損 ${money(metrics.avgLoss)}。虧損若超出計畫，就不是市場問題，而是風險定義需要收窄。`,
    },
    {
      title: "把輸贏從自尊裡拿出來",
      body: "復盤時先問：這筆虧損是不是按計畫發生？如果答案是肯定的，它只是交易成本；如果是否定的，它才是紀律問題。",
    },
  ];

  if (largeLosses.length) {
    bestLoserWins.push({
      title: "先讓最大虧損變小",
      body: `${largeLosses.length} 筆虧損超過 ${money(largeLossThreshold)}。改善盈虧比最快的方式，通常是砍掉尾部虧損，而不是追求更高勝率。`,
    });
  }

  const offlineAdvice: Insight[] = [];
  if (option && stock) {
    const stronger = option.profitFactor >= stock.profitFactor ? "期權" : "股票";
    offlineAdvice.push({
      title: `${stronger} 目前相對更有優勢`,
      body: `期權 PF ${ratio(option.profitFactor)}、股票 PF ${ratio(stock.profitFactor)}。先把資金與注意力放在 PF 更穩的類別，再檢查另一類是否只是偶發試單。`,
    });
  } else if (option) {
    offlineAdvice.push({
      title: "目前樣本主要是期權",
      body: `期權 PF ${ratio(option.profitFactor)}、勝率 ${percent(option.winRate)}。請特別追蹤到期、行權與最後交易時段的決策品質。`,
    });
  }

  const weakOptionDays = report.optionUnderlyingDays.filter((row) => row.count >= 3 && row.profitFactor < 1).slice(0, 2);
  if (weakOptionDays.length) {
    offlineAdvice.push({
      title: "期權弱勢標的日期要單獨復盤",
      body: weakOptionDays.map((row) => `${row.underlying} ${row.day} PF ${ratio(row.profitFactor)}`).join("；") + "。這些組合比總表更接近實際決策場景。",
    });
  }

  if (!offlineAdvice.length) {
    offlineAdvice.push({
      title: "先保持樣本乾淨",
      body: "目前沒有明顯單一資產類別拖累。下一步可以累積更多樣本，再看週期性與標的集中度。",
    });
  }

  return localizeChineseAdvice({ discipline, bestLoserWins, offlineAdvice }, locale);
}

function localizeChineseAdvice(bundle: AdviceBundle, locale: Locale): AdviceBundle {
  if (locale !== "zh-Hans") return bundle;
  return {
    discipline: bundle.discipline.map(simplifyInsight),
    bestLoserWins: bundle.bestLoserWins.map(simplifyInsight),
    offlineAdvice: bundle.offlineAdvice.map(simplifyInsight),
  };
}

function simplifyInsight(item: Insight): Insight {
  return {
    title: simplifyChinese(item.title),
    body: simplifyChinese(item.body),
  };
}

function simplifyChinese(value: string): string {
  const map: Record<string, string> = {
    於: "于", 處: "处", 虧: "亏", 損: "损", 總: "总", 還: "还", 蓋: "盖", 單: "单", 筆: "笔", 與: "与",
    歸: "归", 零: "零", 增: "增", 類: "类", 狀: "状", 態: "态", 錯: "错", 兩: "两", 強: "强", 場: "场",
    規: "规", 則: "则", 結: "结", 構: "构", 對: "对", 開: "开", 檢: "检", 查: "查", 標: "标", 時: "时",
    段: "段", 穩: "稳", 留: "留", 質: "质", 頻: "频", 勝: "胜", 率: "率", 嚴: "严", 認: "认", 識: "识",
    進: "进", 補: "补", 撐: "撑", 壞: "坏", 會: "会", 號: "号", 跡: "迹", 同: "同", 數: "数", 負: "负",
    益: "益", 特: "特", 別: "别", 計: "计", 畫: "划", 動: "动", 期: "期", 雜: "杂", 訊: "讯", 納: "纳",
    議: "议", 寫: "写", 後: "后", 間: "间", 盤: "盘", 臨: "临", 輸: "输", 護: "护", 風: "风", 險: "险",
    定: "定", 義: "义", 窄: "窄", 贏: "赢", 裡: "里", 問: "问", 發: "发", 答: "答", 肯: "肯", 才: "才",
    紀: "纪", 律: "律", 讓: "让", 過: "过", 改: "改", 善: "善", 通: "通", 常: "常", 砍: "砍", 追: "追",
    權: "权", 優: "优", 勢: "势", 資: "资", 金: "金", 類別: "类别", 另: "另", 偶: "偶",
    試: "试", 樣: "样", 請: "请", 蹤: "踪", 行: "行", 策: "策", 品: "品", 弱: "弱", 獨: "独", 複: "复",
    這: "这", 組: "组", 實: "实", 淨: "净", 顯: "显", 產: "产", 週: "周", 集: "集",
  };
  return value.replace(/[於處虧損總還蓋單筆與歸增類狀態錯兩強場規則結構對開檢標時穩質頻勝嚴認識進補撐壞會號跡數負別計畫動雜訊納議寫後間盤臨輸護風險義裡問發答紀律讓過權優勢資類請蹤樣顯產週複實淨]/g, (char) => map[char] || char)
    .replace(/類別/g, "类别")
    .replace(/標的/g, "标的")
    .replace(/期權/g, "期权")
    .replace(/復盤/g, "复盘");
}

function buildEnglishFallback(report: ParsedStatement): AdviceBundle {
  const { metrics } = report;
  const option = report.assetGroups.find((row) => row.group === "option");
  const largeLosses = report.closedTrades.filter((trade) => trade.realizedPnl < -Math.max(100, metrics.avgWin));
  const pfLabel = ratio(metrics.profitFactor);

  return {
    discipline: [
      {
        title: metrics.profitFactor < 1 ? "Profit factor is below 1" : "Profit factor has a workable base",
        body: metrics.profitFactor < 1
          ? `PF is ${pfLabel}. Focus first on cutting large losses and expiry losses before increasing trade count.`
          : `PF is ${pfLabel}. Keep reviewing whether the best symbols and sessions are repeatable.`,
      },
      {
        title: "Check payoff before win rate",
        body: `Win rate is ${percent(metrics.winRate)} and payoff ratio is ${ratio(metrics.payoffRatio)}. A high win rate cannot rescue a weak average win/loss structure forever.`,
      },
    ],
    bestLoserWins: [
      {
        title: "A good loser protects the next trade",
        body: `Average win is ${money(metrics.avgWin)} and average loss is ${money(metrics.avgLoss)}. Losses inside plan are business costs; losses outside plan are discipline signals.`,
      },
      {
        title: largeLosses.length ? "Reduce tail losses first" : "Slow down after losses",
        body: largeLosses.length
          ? `${largeLosses.length} losses are larger than your average win threshold. Shortening the tail can improve PF faster than chasing win rate.`
          : "After a losing sequence, reduce size or pause so the next decision comes from the plan, not urgency.",
      },
    ],
    offlineAdvice: [
      {
        title: option ? "Review option quality separately" : "Keep the sample clean",
        body: option
          ? `Option PF is ${ratio(option.profitFactor)} with ${percent(option.winRate)} win rate. Track expiry and last-exit rules separately.`
          : "No dominant option bucket was found. Keep collecting clean closed-trade samples before drawing stronger conclusions.",
      },
    ],
  };
}
