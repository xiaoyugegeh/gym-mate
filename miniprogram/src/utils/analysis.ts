import type { CoachTip, HistoryRecord } from '@/types';
import { calcStreak, countThisWeek } from './fitness';

/** 周一 0 点 */
function mondayOf(d: Date): Date {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  x.setDate(x.getDate() - ((x.getDay() + 6) % 7));
  return x;
}

/**
 * 教练点评：基于训练记录的规则分析（本地版 AI 建议）
 * 返回 3~5 条建议，按重要性排序
 */
export function coachTips(hist: HistoryRecord[], weekGoal: number): CoachTip[] {
  const tips: CoachTip[] = [];
  if (!hist.length) {
    return [
      { icon: '👋', text: '还没有训练记录，先去「计划」挑一个模板开练，练完会自动打卡。', type: 'info' },
    ];
  }

  const now = new Date();
  const thisMon = mondayOf(now);
  const lastMon = new Date(thisMon);
  lastMon.setDate(lastMon.getDate() - 7);

  const thisWeek = hist.filter(h => new Date(h.t) >= thisMon);
  const lastWeek = hist.filter(h => new Date(h.t) >= lastMon && new Date(h.t) < thisMon);
  const thisSets = thisWeek.reduce((s, h) => s + (h.setsDone || 0), 0);
  const lastSets = lastWeek.reduce((s, h) => s + (h.setsDone || 0), 0);

  /* 1. 本周目标 */
  const week = countThisWeek(hist);
  if (week >= weekGoal) {
    tips.push({ icon: '🎉', text: `本周已练 ${week} 次，达成周目标（${weekGoal} 次），稳！`, type: 'good' });
  } else {
    tips.push({
      icon: '🎯',
      text: `本周已练 ${week} 次，离周目标（${weekGoal} 次）还差 ${weekGoal - week} 次，加油。`,
      type: 'info',
    });
  }

  /* 2. 容量趋势 */
  if (lastWeek.length > 0) {
    if (thisSets > lastSets) {
      tips.push({ icon: '📈', text: `本周 ${thisSets} 组 vs 上周 ${lastSets} 组，训练量在涨，进步了。`, type: 'good' });
    } else if (thisSets < lastSets) {
      tips.push({ icon: '📉', text: `本周 ${thisSets} 组比上周 ${lastSets} 组少，状态不好就减重不减组。`, type: 'warn' });
    }
  }

  /* 3. 部位均衡 */
  const partCnt: Record<string, number> = {};
  thisWeek.forEach(h => Object.entries(h.parts || {}).forEach(([p, n]) => (partCnt[p] = (partCnt[p] || 0) + n)));
  const sorted = Object.entries(partCnt).sort((a, b) => b[1] - a[1]);
  const sum = sorted.reduce((s, [, n]) => s + n, 0);
  if (sorted.length && sum >= 10 && sorted[0][1] / sum > 0.6) {
    tips.push({ icon: '⚖️', text: `本周 ${sorted[0][0]} 部位占比太高（${Math.round((sorted[0][1] / sum) * 100)}%），练均衡点不容易受伤。`, type: 'warn' });
  }

  /* 4. 腿部提醒：近 14 天没练腿 */
  const twoWeeksAgo = new Date(now);
  twoWeeksAgo.setDate(twoWeeksAgo.getDate() - 14);
  const legSets = hist
    .filter(h => new Date(h.t) >= twoWeeksAgo)
    .reduce((s, h) => s + (h.parts?.['腿'] || 0) + (h.parts?.['臀腿'] || 0) + (h.parts?.['大腿'] || 0), 0);
  if (!legSets) {
    tips.push({ icon: '🦵', text: '快两周没练腿了，下肢是全身力量的根，这周安排上。', type: 'warn' });
  }

  /* 5. 打卡连续性 */
  const streak = calcStreak(hist);
  if (streak >= 3) {
    tips.push({ icon: '🔥', text: `连续打卡 ${streak} 天，习惯已经养成，别断。`, type: 'good' });
  }

  /* 6. 间隔提醒 */
  const lastT = hist[0]?.t || 0;
  const daysSince = Math.floor((now.getTime() - lastT) / 86400000);
  if (daysSince >= 4) {
    tips.push({ icon: '⏰', text: `已经 ${daysSince} 天没练了，肌肉有记忆，回来练 30 分钟也行。`, type: 'warn' });
  }

  /* 7. 训练时长 */
  const avg = hist.slice(0, 10).reduce((s, h) => s + (h.durSec || 0), 0) / Math.min(10, hist.length);
  if (avg > 5400) {
    tips.push({ icon: '⌛', text: '最近单次训练偏长（超 90 分钟），超过 1 小时后效率会掉，可以拆成一天两练。', type: 'info' });
  }

  return tips.slice(0, 4);
}

/** 个人纪录：每个动作的历史最大重量 */
export interface PrItem {
  exId: string;
  name: string;
  weight: number;
  reps: string;
  t: number;
}

export function topPr(hist: HistoryRecord[], limit = 5): PrItem[] {
  const best = new Map<string, PrItem>();
  hist.forEach(h => {
    (h.items || []).forEach(it => {
      (it.weights || []).forEach(w => {
        if (!w || w <= 0) return;
        const prev = best.get(it.exId);
        if (!prev || w > prev.weight) {
          best.set(it.exId, { exId: it.exId, name: '', weight: w, reps: it.reps, t: h.t });
        }
      });
    });
  });
  return [...best.values()].sort((a, b) => b.weight - a.weight).slice(0, limit);
}

/** 近 8 周每周训练组数（最后一项为本周） */
export interface WeekBucket {
  label: string;
  sets: number;
  count: number;
}

export function weeklyVolume(hist: HistoryRecord[], weeks = 8): WeekBucket[] {
  const now = new Date();
  const thisMon = mondayOf(now);
  const buckets: WeekBucket[] = [];
  for (let i = weeks - 1; i >= 0; i--) {
    const start = new Date(thisMon);
    start.setDate(start.getDate() - i * 7);
    const end = new Date(start);
    end.setDate(end.getDate() + 7);
    const inRange = hist.filter(h => new Date(h.t) >= start && new Date(h.t) < end);
    buckets.push({
      label: start.getMonth() + 1 + '/' + start.getDate(),
      sets: inRange.reduce((s, h) => s + (h.setsDone || 0), 0),
      count: inRange.length,
    });
  }
  return buckets;
}
