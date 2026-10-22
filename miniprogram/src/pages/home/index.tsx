import React, { useMemo, useState } from 'react';
import { View, Text, Image } from '@tarojs/components';
import Taro, { useDidShow } from '@tarojs/taro';
import { DB } from '@/data/exercises';
import PageShell from '@/components/PageShell';
import { useSettings } from '@/store/app';
import { getHistory, getPlans, setPendingPart } from '@/utils/storage';
import type { Plan } from '@/types';
import { calcStreak, countThisWeek, todayPlan } from '@/utils/fitness';
import { thumbUrl } from '@/utils/images';
import { startWorkout } from '@/utils/session';
import { greet, WEEKCN } from '@/utils/format';
import styles from './index.module.scss';

const TIPS: [string, string][] = [
  ['✅', '空杆先学动作，动作稳了再加重量'],
  ['✅', '大重量一定找人保护，别自己硬上'],
  ['❌', '练完不作拉伸、猛喝冰水'],
  ['❌', '关节刺痛还硬练 —— 疼就停'],
];

const Home: React.FC = () => {
  const { settings } = useSettings();
  const [stats, setStats] = useState({ streak: 0, week: 0, total: 0 });
  const [scheduled, setScheduled] = useState<Plan | null>(null);

  useDidShow(() => {
    const hist = getHistory();
    setStats({ streak: calcStreak(hist), week: countThisWeek(hist), total: hist.length });
    /* 今天该练的计划（周排期） */
    const day = new Date().getDay();
    const hit = getPlans().find(p => (p.days || []).includes(day) && p.items.length);
    setScheduled(hit || null);
  });

  const goalPct = Math.min(100, Math.round((stats.week / Math.max(1, settings.weekGoal)) * 100));
  const goalDone = stats.week >= settings.weekGoal;

  const today = useMemo(() => todayPlan(), []);
  const parts = DB.partsList;
  const icons = DB.partsIcons;

  const goPart = (p: string) => {
    setPendingPart(p);
    Taro.switchTab({ url: '/pages/library/index' });
  };

  const goTodayDetail = (id: string) => {
    Taro.navigateTo({ url: '/pkg/pages/detail/index?id=' + id });
  };

  return (
    <PageShell>
      {/* 顶部统计 */}
      <View className={styles.hero}>
        <Text className={styles.heroTitle}>{greet()}，练起来！💪</Text>
        <Text className={styles.heroSub}>坚持记录，进步看得见</Text>
        <View className={styles.heroStats}>
          <View className={styles.hs}>
            <Text className={styles.hsNum}>{stats.streak}</Text>
            <Text className={styles.hsLabel}>连续打卡(天)</Text>
          </View>
          <View className={styles.hs}>
            <Text className={styles.hsNum}>{stats.week}</Text>
            <Text className={styles.hsLabel}>本周训练</Text>
          </View>
          <View className={styles.hs}>
            <Text className={styles.hsNum}>{stats.total}</Text>
            <Text className={styles.hsLabel}>累计次数</Text>
          </View>
        </View>

        {/* 周目标进度 */}
        <View className={styles.goalBox}>
          <Text className={styles.goalTxt}>
            🎯 本周目标 {stats.week}/{settings.weekGoal} 次{goalDone ? ' · 已达成 🎉' : ''}
          </Text>
          <View className={styles.goalTrack}>
            <View className={`${styles.goalFill} ${goalDone ? styles.goalFillDone : ''}`} style={`width:${goalPct}%`} />
          </View>
        </View>
      </View>

      {/* 今天该练（周排期提醒） */}
      {scheduled ? (
        <View className='g-card'>
          <View className={styles.cardHead}>
            <Text className={styles.cardTitle}>📌 今天该练</Text>
            <Text className={styles.cardMore}>按你的排期</Text>
          </View>
          <Text className={styles.schedName}>
            {scheduled.emoji || '📋'} {scheduled.name}
          </Text>
          <Text className={styles.schedMeta}>
            {scheduled.items.length} 个动作，排在了今天
          </Text>
          <View
            className={styles.primaryBtn}
            onClick={() =>
              startWorkout(
                scheduled.name,
                scheduled.items.map(i => ({ id: i.id, sets: i.sets, reps: i.reps, rest: i.rest || settings.rest })),
              )
            }
          >
            <Text className={styles.primaryBtnTxt}>▶ 开始训练</Text>
          </View>
        </View>
      ) : null}

      {/* 今天练哪里 */}
      <View className='g-card'>
        <View className={styles.cardHead}>
          <Text className={styles.cardTitle}>📍 今天练哪里</Text>
          <Text className={styles.cardMore}>{WEEKCN[new Date().getDay()]}推荐</Text>
        </View>
        {today.map((ex, i) => (
          <View className={styles.todayCard} key={ex.id} onClick={() => goTodayDetail(ex.id)}>
            <Image
              className={styles.todayImg}
              src={thumbUrl(ex)}
              mode='aspectFill'
              lazyLoad
              onError={() => console.error('[Home] 缩略图加载失败:', ex.id)}
            />
            <View className={styles.todayInfo}>
              <Text className={styles.todayName}>
                {i + 1}. {ex.name}
              </Text>
              <Text className={styles.todayMeta}>
                {ex.muscles.join('、')} · {ex.equip}
              </Text>
            </View>
            <Text className={styles.todayArr}>›</Text>
          </View>
        ))}
        <View className={styles.primaryBtn} onClick={() => startWorkout('今日推荐', today.map(ex => ({ id: ex.id, sets: 4, reps: '8-12', rest: settings.rest })))}>
          <Text className={styles.primaryBtnTxt}>▶ 一键开练（{today.length}个动作）</Text>
        </View>
      </View>

      {/* 按部位找动作 */}
      <Text className='g-sec-title'>按部位找动作</Text>
      <View className={styles.partGrid}>
        {parts.map(p => (
          <View className={styles.partCell} key={p} onClick={() => goPart(p)}>
            <Text className={styles.partIcon}>{icons[p] || '🏋️'}</Text>
            <Text className={styles.partName}>{p}</Text>
          </View>
        ))}
      </View>

      {/* 快捷入口 */}
      <Text className='g-sec-title'>快捷入口</Text>
      <View className={styles.quickGrid}>
        <View className={styles.quickCell} onClick={() => Taro.navigateTo({ url: '/pkg/pages/tools/index' })}>
          <Text className={styles.partIcon}>⏱️</Text>
          <Text className={styles.partName}>计时器</Text>
        </View>
        <View className={styles.quickCell} onClick={() => Taro.navigateTo({ url: '/pkg/pages/tools/index' })}>
          <Text className={styles.partIcon}>🔥</Text>
          <Text className={styles.partName}>HIIT</Text>
        </View>
        <View className={styles.quickCell} onClick={() => Taro.switchTab({ url: '/pages/plans/index' })}>
          <Text className={styles.partIcon}>📋</Text>
          <Text className={styles.partName}>训练计划</Text>
        </View>
        <View className={styles.quickCell} onClick={() => Taro.navigateTo({ url: '/pkg/pages/diet/index' })}>
          <Text className={styles.partIcon}>🍽️</Text>
          <Text className={styles.partName}>饮食记录</Text>
        </View>
        <View className={styles.quickCell} onClick={() => Taro.navigateTo({ url: '/pkg/pages/body/index' })}>
          <Text className={styles.partIcon}>⚖️</Text>
          <Text className={styles.partName}>身体数据</Text>
        </View>
        <View className={styles.quickCell} onClick={() => Taro.navigateTo({ url: '/pkg/pages/tools/index' })}>
          <Text className={styles.partIcon}>🏋️</Text>
          <Text className={styles.partName}>1RM计算</Text>
        </View>
        <View className={styles.quickCell} onClick={() => Taro.switchTab({ url: '/pages/log/index' })}>
          <Text className={styles.partIcon}>📊</Text>
          <Text className={styles.partName}>训练统计</Text>
        </View>
      </View>

      {/* 新手安全红线 */}
      <View className='g-card'>
        <Text className={styles.cardTitle}>🚨 新手安全红线</Text>
        <View className={styles.tips}>
          {TIPS.map((t, i) => (
            <View className={`${styles.tip} ${t[0] === '✅' ? styles.good : styles.bad}`} key={i}>
              <Text>{t[0]}</Text>
              <Text className={styles.tipTxt}>{t[1]}</Text>
            </View>
          ))}
        </View>
      </View>
    </PageShell>
  );
};

export default Home;
