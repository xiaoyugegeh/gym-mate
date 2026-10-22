import Taro from '@tarojs/taro';

/** 轻点震动（倒计时最后几秒提醒） */
export const tickVibrate = (): void => {
  try {
    Taro.vibrateShort({ type: 'light' });
  } catch (e) {
    console.error('[Feedback] vibrateShort failed', e);
  }
};

/** 结束长震动 */
export const endVibrate = (): void => {
  try {
    Taro.vibrateLong();
  } catch (e) {
    console.error('[Feedback] vibrateLong failed', e);
  }
};
