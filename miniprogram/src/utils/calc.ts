import type { Sex } from '@/types';

/** BMI = 体重kg / 身高m² */
export function calcBmi(heightCm: number, weightKg: number): number {
  if (!heightCm || !weightKg) return 0;
  const m = heightCm / 100;
  return Math.round((weightKg / (m * m)) * 10) / 10;
}

/** BMI 分级 */
export function bmiLabel(v: number): { label: string; type: 'good' | 'warn' | 'bad' } {
  if (v < 18.5) return { label: '偏瘦', type: 'warn' };
  if (v < 24) return { label: '正常', type: 'good' };
  if (v < 28) return { label: '超重', type: 'warn' };
  return { label: '肥胖', type: 'bad' };
}

/** 基础代谢 BMR（Mifflin-St Jeor 公式） */
export function calcBmr(sex: Sex, weightKg: number, heightCm: number, age: number): number {
  if (!weightKg || !heightCm || !age) return 0;
  // 男：10w + 6.25h - 5a + 5；女：10w + 6.25h - 5a - 161
  const base = 10 * weightKg + 6.25 * heightCm - 5 * age;
  return Math.round(sex === '男' ? base + 5 : base - 161);
}

/** 每日消耗 TDEE = BMR × 中等活动系数1.55 */
export function calcTdee(sex: Sex, weightKg: number, heightCm: number, age: number): number {
  const b = calcBmr(sex, weightKg, heightCm, age);
  return b ? Math.round(b * 1.55) : 0;
}

/** Epley 公式估算 1RM（一次能举起的最大重量） */
export function oneRm(weightKg: number, reps: number): number {
  if (!weightKg || !reps) return 0;
  if (reps === 1) return weightKg;
  return Math.round(weightKg * (1 + reps / 30) * 10) / 10;
}

/** 百分比训练重量对应的参考次数 */
export const PERCENT_TABLE: { pct: number; reps: string }[] = [
  { pct: 95, reps: '2 次' },
  { pct: 90, reps: '4 次' },
  { pct: 85, reps: '6 次' },
  { pct: 80, reps: '8 次' },
  { pct: 75, reps: '10 次' },
  { pct: 70, reps: '12 次' },
  { pct: 60, reps: '15-20 次' },
];

/** 常用杠铃片（kg，按大到小尝试） */
export const PLATES = [25, 20, 15, 10, 5, 2.5, 1.25];
/** 标准奥杆重量 kg */
export const BAR_KG = 20;

export interface PlateResult {
  ok: boolean;
  /** 提示文案 */
  msg: string;
  /** 每边配重片列表（如 [20, 10, 2.5]） */
  plates: number[];
  perSide: number;
}

/** 杠铃配重计算：目标总重量（含杆）→ 每边要加哪些片 */
export function plateCalc(targetKg: number, barKg: number = BAR_KG): PlateResult {
  if (!targetKg || targetKg < barKg) {
    return { ok: false, msg: `目标至少要 ${barKg}kg（空杆）`, plates: [], perSide: 0 };
  }
  let side = (targetKg - barKg) / 2;
  // 误差容忍 0.01，解决浮点问题
  const cannot = side % 1.25 > 0.011;
  if (cannot) {
    const rounded = Math.floor(side / 1.25) * 1.25;
    const real = barKg + rounded * 2;
    side = rounded;
    const plates: number[] = [];
    let rest = side;
    for (const p of PLATES) {
      while (rest >= p - 0.001) {
        plates.push(p);
        rest = Math.round((rest - p) * 100) / 100;
      }
    }
    return {
      ok: true,
      msg: `没有刚好凑齐的片，最近能到 ${real}kg`,
      plates,
      perSide: side,
    };
  }
  const plates: number[] = [];
  let rest = side;
  for (const p of PLATES) {
    while (rest >= p - 0.001) {
      plates.push(p);
      rest = Math.round((rest - p) * 100) / 100;
    }
  }
  return { ok: true, msg: '刚好凑齐', plates, perSide: side };
}

/** kg -> lb */
export const kgToLb = (kg: number): number => Math.round(kg * 2.20462 * 10) / 10;
/** lb -> kg */
export const lbToKg = (lb: number): number => Math.round((lb / 2.20462) * 10) / 10;
