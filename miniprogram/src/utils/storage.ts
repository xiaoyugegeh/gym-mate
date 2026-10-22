import Taro from '@tarojs/taro';
import type { Plan, Settings, HistoryRecord, WorkoutSession, BodyLog, DietEntry, Food } from '@/types';
import { todayStr } from './format';

const KEY = (k: string) => 'gym_' + k;

/** 读取本地存储 */
export function load<T>(key: string, def: T): T {
  try {
    const v = Taro.getStorageSync(KEY(key));
    return v === '' || v == null ? def : (v as T);
  } catch (e) {
    console.error('[Storage] load failed:', key, e);
    return def;
  }
}

/** 写入本地存储 */
export function save(key: string, value: unknown): void {
  try {
    Taro.setStorageSync(KEY(key), value);
  } catch (e) {
    console.error('[Storage] save failed:', key, e);
    Taro.showToast({ title: '存储失败：空间不足', icon: 'none' });
  }
}

/* ---------------- 收藏 ---------------- */
export const getFavs = (): string[] => load<string[]>('favs', []);
export const isFav = (id: string): boolean => getFavs().includes(id);
/** 切换收藏，返回切换后是否已收藏 */
export function toggleFav(id: string): boolean {
  const f = getFavs();
  const i = f.indexOf(id);
  if (i >= 0) f.splice(i, 1);
  else f.unshift(id);
  save('favs', f);
  return i < 0;
}

/* ---------------- 计划 ---------------- */
export const getPlans = (): Plan[] => load<Plan[]>('plans', []);
export const savePlans = (p: Plan[]): void => save('plans', p);

/* ---------------- 训练历史 ---------------- */
export const getHistory = (): HistoryRecord[] => load<HistoryRecord[]>('history', []);
export function addHistory(h: HistoryRecord): void {
  const a = getHistory();
  a.unshift(h);
  save('history', a.slice(0, 500));
}

/* ---------------- 设置 ---------------- */
export const DEFAULT_SETTINGS: Settings = { theme: 'light', goal: '增肌', rest: 75, weekGoal: 3, sex: '男', age: 25, height: 175 };
export const getSettings = (): Settings => ({ ...DEFAULT_SETTINGS, ...load<Partial<Settings>>('settings', {}) });
export const saveSettings = (s: Settings): void => save('settings', s);

/* ---------------- 跟练会话（中断恢复） ---------------- */
export const saveWorkoutSession = (s: WorkoutSession): void => save('wk', s);
export const getWorkoutSession = (): WorkoutSession | null => load<WorkoutSession | null>('wk', null);
export const clearWorkoutSession = (): void => {
  try {
    Taro.removeStorageSync(KEY('wk'));
  } catch (e) {
    console.error('[Storage] clear session failed', e);
  }
};

/** 待开练的会话（页面跳转前写入，workout 页读取） */
export const setPendingWorkout = (s: WorkoutSession): void => save('pending_wk', s);
export const takePendingWorkout = (): WorkoutSession | null => {
  const v = load<WorkoutSession | null>('pending_wk', null);
  if (v) {
    try {
      Taro.removeStorageSync(KEY('pending_wk'));
    } catch (e) {
      console.error('[Storage] take pending failed', e);
    }
  }
  return v;
};

/** 从动作库跳转时预选的部位 */
export const setPendingPart = (part: string): void => save('pending_part', part);
export const takePendingPart = (): string => {
  const v = load<string>('pending_part', '');
  if (v) {
    try {
      Taro.removeStorageSync(KEY('pending_part'));
    } catch (e) {
      console.error('[Storage] take part failed', e);
    }
  }
  return v;
};

/* ---------------- 身体数据（体重/体脂） ---------------- */
export const getBodyLogs = (): BodyLog[] => load<BodyLog[]>('body', []);
/** 记录体重（同一天覆盖旧记录，最新的排最前） */
export function addBodyLog(l: BodyLog): void {
  const a = getBodyLogs();
  const ds = todayStr(l.t);
  const idx = a.findIndex(x => todayStr(x.t) === ds);
  if (idx >= 0) a.splice(idx, 1);
  a.unshift(l);
  save('body', a.slice(0, 200));
}
/** 最新体重（没有记录返回 0） */
export const latestWeight = (): number => getBodyLogs()[0]?.weight || 0;

/* ---------------- 饮食记录（按日期分组） ---------------- */
const DIET_KEY = 'diet';
export function getDietByDate(ds: string): DietEntry[] {
  const all = load<Record<string, DietEntry[]>>(DIET_KEY, {});
  return all[ds] || [];
}
export function addDietEntry(ds: string, e: DietEntry): void {
  const all = load<Record<string, DietEntry[]>>(DIET_KEY, {});
  if (!all[ds]) all[ds] = [];
  all[ds].push(e);
  save(DIET_KEY, all);
}
export function removeDietEntry(ds: string, id: string): void {
  const all = load<Record<string, DietEntry[]>>(DIET_KEY, {});
  all[ds] = (all[ds] || []).filter(x => x.id !== id);
  save(DIET_KEY, all);
}

/* ---------------- 自定义食物 ---------------- */
export const getCustomFoods = (): Food[] => load<Food[]>('foods', []);
export function addCustomFood(f: Food): void {
  const a = getCustomFoods();
  a.unshift(f);
  save('foods', a.slice(0, 100));
}

/* ---------------- 数据导出 ---------------- */
/** 聚合全部业务数据为 JSON 文本 */
export function exportData(): string {
  return JSON.stringify(
    {
      app: 'GymMate',
      exportedAt: new Date().toISOString(),
      settings: getSettings(),
      favs: getFavs(),
      plans: getPlans(),
      history: getHistory(),
      body: getBodyLogs(),
      diet: load<Record<string, DietEntry[]>>(DIET_KEY, {}),
      customFoods: getCustomFoods(),
    },
    null,
    2,
  );
}

/** 清空全部业务数据（保留设置） */
export function clearAllData(): void {
  ['favs', 'plans', 'history', 'wk', 'pending_wk', 'body', DIET_KEY, 'foods'].forEach(k => {
    try {
      Taro.removeStorageSync(KEY(k));
    } catch (e) {
      console.error('[Storage] clear failed:', k, e);
    }
  });
}
