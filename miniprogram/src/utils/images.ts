import type { Exercise } from '@/types';

/** 动作演示图 CDN（jsdelivr 国内可直连镜像） */
const CDN = 'https://testingcf.jsdelivr.net/gh/hasaneyldrm/exercises-dataset@main';

/** GIF 动图完整 URL */
export const gifUrl = (e: Exercise | null | undefined): string => {
  if (!e || !e.gif) return '';
  const name = e.gif.split('/').pop() || '';
  return CDN + '/videos/' + name;
};

/** 缩略图完整 URL（无缩略图时回退 GIF） */
export const thumbUrl = (e: Exercise | null | undefined): string => {
  if (!e) return '';
  if (e.thumb) return CDN + '/images/' + (e.thumb.split('/').pop() || '');
  return gifUrl(e);
};

/** 难度 -> 标签色类型 */
export const LEVEL_CLASS: Record<string, string> = { '初级': 'g', '中级': 'o', '高级': 'r' };
