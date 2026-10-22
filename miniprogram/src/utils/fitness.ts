import { DB } from '@/data/exercises';
import { CURATED_BY_KEY } from '@/data/curated';
import type { CuratedInfo, Exercise, Goal, HistoryRecord, SetSuggestion } from '@/types';

/** 按 id 找动作 */
export const EX = (id: string): Exercise | undefined => DB.exercises.find(e => e.id === id);

/** 教练详解（按英文名匹配） */
export function getCurated(e: Exercise): CuratedInfo | null {
  return CURATED_BY_KEY[(e.nameEn || '').toLowerCase()] || null;
}

export const hasCurated = (e: Exercise): boolean => !!getCurated(e);

/** 组次建议引擎：目标 x 难度/部位 */
export function suggestSets(ex: Exercise, goal: Goal): SetSuggestion {
  if (ex.cat === '有氧' || ex.part === '有氧') {
    if (goal === '力量') return { sets: '—', reps: '20-30分钟', rest: '—' };
    if (goal === '耐力') return { sets: '—', reps: '30-45分钟', rest: '—' };
    return { sets: '—', reps: '20-40分钟', rest: '—' };
  }
  const hard =
    ex.level === '高级' ||
    /深蹲|硬拉|卧推|挺举|抓举|bench|squat|deadlift|press|clean|jerk/i.test(ex.nameEn || '');
  if (goal === '力量') return { sets: hard ? '4-5组' : '4组', reps: hard ? '3-6次' : '6-8次', rest: '2-3分钟' };
  if (goal === '耐力') return { sets: '3组', reps: '15-20次', rest: '30-45秒' };
  return { sets: hard ? '4-5组' : '3-4组', reps: '8-12次', rest: '60-90秒' }; // 增肌
}

/** 休息文本 -> 秒数 */
export function restSeconds(restStr?: string): number {
  if (!restStr) return 75;
  const m = String(restStr).match(/(\d+)/);
  if (!m) return 75;
  let n = Number(m[1]);
  if (/分钟/.test(restStr)) n *= 60;
  return n;
}

/** 连续打卡天数 */
export function calcStreak(hist: HistoryRecord[]): number {
  if (!hist.length) return 0;
  const days = new Set(hist.map(h => todayStrOf(h.t)));
  let d = new Date();
  let streak = 0;
  const dayKey = (x: Date) =>
    x.getFullYear() + '-' + String(x.getMonth() + 1).padStart(2, '0') + '-' + String(x.getDate()).padStart(2, '0');
  if (!days.has(dayKey(d))) {
    d.setDate(d.getDate() - 1);
    if (!days.has(dayKey(d))) return 0;
  }
  while (days.has(dayKey(d))) {
    streak++;
    d.setDate(d.getDate() - 1);
  }
  return streak;
}

function todayStrOf(t: number): string {
  const x = new Date(t);
  return x.getFullYear() + '-' + String(x.getMonth() + 1).padStart(2, '0') + '-' + String(x.getDate()).padStart(2, '0');
}

/** 本周（周一起算）训练次数 */
export function countThisWeek(hist: HistoryRecord[]): number {
  const now = new Date();
  const day = (now.getDay() + 6) % 7;
  const monday = new Date(now);
  monday.setDate(now.getDate() - day);
  monday.setHours(0, 0, 0, 0);
  return hist.filter(h => new Date(h.t) >= monday).length;
}

/** 今日推荐（按星期挑动作） */
export function todayPlan(): Exercise[] {
  const day = new Date().getDay();
  const dayConf: Record<number, { kw: string[]; extra?: string }> = {
    1: { kw: ['胸'], extra: '手臂' },
    2: { kw: ['背'], extra: '手臂' },
    3: { kw: ['腿'] },
    4: { kw: ['核心'] },
    5: { kw: ['肩'] },
    6: { kw: ['手臂'], extra: '核心' },
    0: { kw: ['全身', '胸', '背', '腿'] },
  };
  const conf = dayConf[day] || { kw: ['全身'] };
  const pool = DB.exercises.filter(e => conf.kw.some(k => e.part === k || e.parts.includes(k)));
  const extra = conf.extra ? DB.exercises.filter(e => e.part === conf.extra) : [];
  const picks: Exercise[] = [];
  const used = new Set<string>();
  const pick = (arr: Exercise[]) => {
    for (const e of arr) {
      if (!used.has(e.id) && picks.length < 5) {
        picks.push(e);
        used.add(e.id);
        return;
      }
    }
  };
  conf.kw.forEach(k => {
    const w = pool.filter(e => e.part === k || e.parts.includes(k));
    pick(w.filter(e => /杠铃|哑铃|复合|器械/.test(e.equip)));
    pick(w);
  });
  if (extra.length) {
    pick(extra.filter(e => /绳索|哑铃|器械/.test(e.equip)));
    pick(extra);
  }
  return picks.slice(0, 5);
}
