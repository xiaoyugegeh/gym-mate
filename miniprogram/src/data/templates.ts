import { DB } from '@/data/exercises';
import type { PlanItem } from '@/types';

/** 官方计划模板条目（m 为正则源码，运行时编译匹配动作） */
export interface TemplateItem {
  m: string;
  sets: number;
  reps: string;
  rest: number;
}

export interface PlanTemplate {
  name: string;
  emoji: string;
  desc: string;
  items: TemplateItem[];
}

export const TEMPLATES: PlanTemplate[] = [
  {
    name: '新手全身适应', emoji: '🌱', desc: '适合头两个月，学动作打基础', items: [
      { m: '深蹲|squat', sets: 3, reps: '10-12', rest: 90 },
      { m: '卧推|bench press', sets: 3, reps: '8-10', rest: 90 },
      { m: '高位下拉|lat pulldown', sets: 3, reps: '10-12', rest: 90 },
      { m: '肩上推举|overhead press|shoulder press', sets: 3, reps: '10-12', rest: 90 },
      { m: '平板支撑|plank', sets: 3, reps: '30-45秒', rest: 60 },
    ],
  },
  {
    name: '胸肩三头日', emoji: '🫁', desc: '推力日：胸+肩+三头', items: [
      { m: '卧推|bench press', sets: 4, reps: '8-12', rest: 90 },
      { m: '上斜|incline', sets: 3, reps: '8-12', rest: 90 },
      { m: '飞鸟|fly', sets: 3, reps: '12-15', rest: 60 },
      { m: '肩(上)?推举|overhead|shoulder press', sets: 4, reps: '8-12', rest: 90 },
      { m: '侧平举|lateral raise', sets: 4, reps: '12-15', rest: 60 },
      { m: '三头|triceps', sets: 3, reps: '10-15', rest: 60 },
    ],
  },
  {
    name: '背二头日', emoji: '🔙', desc: '拉力日：背+二头', items: [
      { m: '引体|pull[- ]?up', sets: 4, reps: '6-10', rest: 120 },
      { m: '划船|row', sets: 4, reps: '8-12', rest: 90 },
      { m: '高位下拉|lat pulldown', sets: 3, reps: '10-12', rest: 90 },
      { m: '直臂下压|pullover', sets: 3, reps: '12-15', rest: 60 },
      { m: '弯举|curl', sets: 4, reps: '10-15', rest: 60 },
    ],
  },
  {
    name: '腿臀核心日', emoji: '🦵', desc: '下肢日：腿+臀+核心', items: [
      { m: '深蹲|squat', sets: 4, reps: '8-12', rest: 120 },
      { m: '腿举|press.*leg|leg press', sets: 4, reps: '10-12', rest: 90 },
      { m: '硬拉|deadlift', sets: 3, reps: '8-10', rest: 120 },
      { m: '腿弯举|leg curl', sets: 3, reps: '12-15', rest: 60 },
      { m: '臀桥|hip thrust|glute bridge', sets: 4, reps: '12-15', rest: 60 },
      { m: '卷腹|crunch', sets: 3, reps: '15-20', rest: 45 },
    ],
  },
  {
    name: '减脂燃脂循环', emoji: '🔥', desc: '动起来就瘦：全身循环+有氧', items: [
      { m: '深蹲|squat', sets: 3, reps: '15-20', rest: 40 },
      { m: '俯卧撑|push[- ]?up', sets: 3, reps: '12-15', rest: 40 },
      { m: '划船|row', sets: 3, reps: '15-20', rest: 40 },
      { m: '卷腹|crunch', sets: 3, reps: '20', rest: 30 },
      { m: '跑步机|treadmill|跑步', sets: 1, reps: '25-35分钟', rest: 0 },
    ],
  },
  {
    name: '手臂专项日', emoji: '💪', desc: '二头+三头专项轰炸', items: [
      { m: '站姿.*弯举|barbell curl|bar.*curl', sets: 4, reps: '8-12', rest: 75 },
      { m: '锤式弯举|hammer curl', sets: 3, reps: '10-12', rest: 60 },
      { m: '绳索下压|triceps pushdown|pushdown', sets: 4, reps: '10-15', rest: 60 },
      { m: '仰卧臂屈伸|skull|lying triceps', sets: 3, reps: '10-12', rest: 75 },
      { m: '弯举.*反手|reverse curl', sets: 3, reps: '12-15', rest: 60 },
    ],
  },
];

/** 把模板解析成具体动作条目 */
export function resolveTemplate(t: PlanTemplate): PlanItem[] {
  const items: PlanItem[] = [];
  for (const it of t.items) {
    try {
      const re = new RegExp(it.m, 'i');
      const ex = DB.exercises.find(e => re.test(e.name) || re.test(e.nameEn));
      if (ex) items.push({ id: ex.id, sets: it.sets, reps: it.reps, rest: it.rest });
    } catch (err) {
      console.error('[Templates] 解析模板失败', it.m, err);
    }
  }
  return items;
}
