export const WEEKCN = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];

/** 生成唯一 id */
export const uid = (): string => Date.now().toString(36) + Math.random().toString(36).slice(2, 7);

/** 今天（或指定时间）的 YYYY-MM-DD */
export const todayStr = (input?: number | Date): string => {
  const t = input ? new Date(input) : new Date();
  return t.getFullYear() + '-' + String(t.getMonth() + 1).padStart(2, '0') + '-' + String(t.getDate()).padStart(2, '0');
};

/** 秒 -> x小时x分 / x分x秒 */
export const fmtDur = (sec: number): string => {
  const s = Math.max(0, Math.round(sec));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const ss = s % 60;
  return h ? `${h}小时${m}分` : m ? `${m}分${ss}秒` : `${ss}秒`;
};

/** 秒 -> MM:SS */
export const fmtClock = (sec: number): string => {
  const s = Math.max(0, Math.round(sec));
  const m = Math.floor(s / 60);
  const ss = s % 60;
  return String(m).padStart(2, '0') + ':' + String(ss).padStart(2, '0');
};

/** 休息秒数 -> 展示文本 */
export const restLabel = (sec: number): string =>
  sec < 60 ? `${sec}秒` : sec % 60 === 0 ? `${sec / 60}分钟` : `${sec}秒`;

/** 按当前时段问候 */
export const greet = (): string => {
  const h = new Date().getHours();
  return h < 6 ? '夜猫子' : h < 11 ? '早上好' : h < 14 ? '中午好' : h < 18 ? '下午好' : '晚上好';
};
