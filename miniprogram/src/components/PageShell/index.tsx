import React, { useEffect } from 'react';
import { View } from '@tarojs/components';
import Taro from '@tarojs/taro';
import { useSettings } from '@/store/app';

interface Props {
  /** 是否去掉页面默认内边距（全屏页用） */
  flush?: boolean;
  children: React.ReactNode;
}

/** 页面外壳：深色模式类 + 导航栏配色同步 */
const PageShell: React.FC<Props> = ({ flush, children }) => {
  const { settings } = useSettings();
  const dark = settings.theme === 'dark';

  useEffect(() => {
    try {
      Taro.setNavigationBarColor({
        backgroundColor: dark ? '#1e2126' : '#ffffff',
        frontColor: dark ? '#ffffff' : '#000000',
      });
    } catch (e) {
      console.error('[PageShell] setNavigationBarColor failed', e);
    }
  }, [dark]);

  return <View className={`page-root ${dark ? 'theme-dark' : ''} ${flush ? 'page-flush' : ''}`}>{children}</View>;
};

export default PageShell;
