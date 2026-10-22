import Taro from '@tarojs/taro';
import type { PlanItem, WorkoutSession } from '@/types';
import { EX } from '@/utils/fitness';
import { setPendingWorkout } from '@/utils/storage';

/** 发起一次跟练：写入待练会话并跳转跟练页 */
export function startWorkout(name: string, items: PlanItem[]): void {
  if (!items || !items.length) {
    Taro.showToast({ title: '计划是空的', icon: 'none' });
    return;
  }
  const valid = items.filter(i => EX(i.id));
  if (!valid.length) {
    Taro.showToast({ title: '素材里找不到这些动作', icon: 'none' });
    return;
  }
  const session: WorkoutSession = { name, items: valid, startT: Date.now() };
  setPendingWorkout(session);
  Taro.navigateTo({ url: '/pkg/pages/workout/index' });
}
