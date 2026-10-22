import type { Exercise } from '@/types';
import { GENERIC } from '@/data/generic';

/** 部位通用指导（仅分包页面使用，避免 generic 数据进入主包） */
export const guideOf = (e: Exercise) => GENERIC[e.part] || GENERIC['全身'];
