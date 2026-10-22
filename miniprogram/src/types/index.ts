/** 单个动作（1324 个，源自 exercises-dataset 开源数据） */
export interface Exercise {
  id: string;
  name: string;
  nameEn: string;
  /** 主部位，如 胸/背/腿 */
  part: string;
  /** 覆盖的身体部位列表 */
  parts: string[];
  /** 主要目标肌群 */
  muscles: string[];
  /** 所需器械，如 杠铃/哑铃/自重 */
  equip: string;
  /** 初级/中级/高级 */
  level: string;
  /** 动作类型，如 推/拉/核心 */
  force: string;
  /** 力量/有氧 */
  cat: string;
  /** GIF 演示图文件名 */
  gif: string;
  /** 缩略图文件名 */
  thumb: string;
}

/** 动作数据库顶层结构 */
export interface DbData {
  count: number;
  partsList: string[];
  equipList: string[];
  partsIcons: Record<string, string>;
  exercises: Exercise[];
}

/** 教练详解内容 */
export interface CuratedInfo {
  steps?: string[];
  breathing?: string;
  tips?: string[];
  mistakes?: string[];
}

export type CuratedMap = Record<string, CuratedInfo>;

/** 计划中的一个动作条目 */
export interface PlanItem {
  id: string;
  sets: number;
  reps: string;
  /** 组间休息（秒） */
  rest: number;
}

export interface Plan {
  id: string;
  name: string;
  emoji?: string;
  desc?: string;
  items: PlanItem[];
  /** 每周固定训练日（0=周日…6=周六），空为不排期 */
  days?: number[];
}

export interface HistoryItem {
  exId: string;
  sets: number;
  reps: string;
  /** 每组实际重量(kg)，与完成组数对应（可选） */
  weights?: number[];
}

export interface HistoryRecord {
  id: string;
  t: number;
  name: string;
  durSec: number;
  setsDone: number;
  /** 各部位完成组数 */
  parts: Record<string, number>;
  items: HistoryItem[];
}

export type Goal = '增肌' | '力量' | '耐力';

export type Sex = '男' | '女';

export interface Settings {
  theme: 'light' | 'dark';
  goal: Goal;
  rest: number;
  /** 每周训练目标次数 */
  weekGoal: number;
  sex: Sex;
  /** 年龄 */
  age: number;
  /** 身高 cm */
  height: number;
}

/** 一次跟练会话（用于中断恢复） */
export interface WorkoutSession {
  name: string;
  items: PlanItem[];
  startT: number;
}

/** 跟练运行时状态 */
export interface WorkoutState extends WorkoutSession {
  exIdx: number;
  setIdx: number;
  phase: 'work' | 'rest' | 'done';
  /** 休息剩余秒数 */
  left: number;
  done: DoneSet[];
}

/** 完成的一组 */
export interface DoneSet {
  exId: string;
  set: number;
  /** 该组重量(kg)，可选 */
  weight?: number;
}

/** 组次建议 */
export interface SetSuggestion {
  sets: string;
  reps: string;
  rest: string;
}

/* ============ 饮食与身体数据 ============ */

export type MealType = '早餐' | '午餐' | '晚餐' | '加餐';

/** 食物（每份营养成分） */
export interface Food {
  id: string;
  name: string;
  emoji: string;
  /** 每份热量 kcal */
  kcal: number;
  /** 蛋白质 g */
  p: number;
  /** 碳水 g */
  c: number;
  /** 脂肪 g */
  f: number;
  /** 份量说明，如 1碗(200g) */
  unit: string;
}

/** 一条饮食记录 */
export interface DietEntry {
  id: string;
  t: number;
  meal: MealType;
  name: string;
  kcal: number;
  p: number;
  c: number;
  f: number;
}

/** 一条体重/体脂记录 */
export interface BodyLog {
  t: number;
  /** 体重 kg */
  weight: number;
  /** 体脂率 % */
  fat?: number;
}

/** 教练点评条目 */
export interface CoachTip {
  icon: string;
  text: string;
  type: 'good' | 'warn' | 'info';
}
