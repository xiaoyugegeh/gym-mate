import React, { useState } from 'react';
import { View, Text } from '@tarojs/components';
import Taro, { useDidShow } from '@tarojs/taro';
import PageShell from '@/components/PageShell';
import Modal from '@/components/Modal';
import Empty from '@/components/Empty';
import { DB } from '@/data/exercises';
import type { Exercise } from '@/types';
import { useSettings } from '@/store/app';
import { getFavs, getPlans, getHistory, clearAllData, exportData } from '@/utils/storage';
import { EX } from '@/utils/fitness';
import classnames from 'classnames';
import styles from './index.module.scss';

const GUIDE = [
  ['1️⃣ 想练某个部位？', '首页点部位（胸/背/腿…）→ 挑一个动作 → 看演示 GIF + 步骤 + 对错要点。不认识器械？筛选栏选器械名就能找到对应动作。'],
  ['2️⃣ 不知道练几组几次？', '每个动作详情页有【练几组】卡片，切换 增肌/力量/耐力 三种目标看建议。'],
  ['3️⃣ 想照着计划练？', '计划页 → 挑一个官方模板点【使用此模板】→ 可以设置每周几练，到点首页会提醒 → 点【开始训练】一组一组带你练。'],
  ['4️⃣ 怎么记录重量和进步？', '跟练时每组可以填重量，练完自动记 PR。记录页能看到教练点评、每周训练量、个人纪录排行。'],
  ['5️⃣ 想管住嘴？', '先去「身体数据」记体重身高，再去「饮食记录」三餐打卡，热量和蛋白质/碳水/脂肪一目了然。'],
  ['6️⃣ 只想要个计时器？', '首页快捷入口 → 计时器，休息计时、HIIT 间歇、1RM 和配重计算都有。'],
];

const GOAL_OPTIONS = [2, 3, 4, 5, 6, 7];

const Me: React.FC = () => {
  const { settings, update } = useSettings();
  const [favs, setFavs] = useState<Exercise[]>([]);
  const [guideOpen, setGuideOpen] = useState(false);
  const [goalOpen, setGoalOpen] = useState(false);

  useDidShow(() => {
    setFavs(getFavs().map(EX).filter(Boolean) as Exercise[]);
  });

  const toggleTheme = () => {
    update({ theme: settings.theme === 'dark' ? 'light' : 'dark' });
  };

  const resetData = () => {
    Taro.showModal({
      title: '清空数据',
      content: '将清空收藏、计划、训练记录、体重和饮食数据（设置保留），确定吗？',
      confirmColor: '#F53F3F',
      success: r => {
        if (r.confirm) {
          clearAllData();
          setFavs([]);
          Taro.showToast({ title: '已清空', icon: 'none' });
        }
      },
    });
  };

  const doExport = () => {
    const json = exportData();
    Taro.setClipboardData({
      data: json,
      success: () => Taro.showToast({ title: '全部数据已复制到剪贴板', icon: 'none' }),
      fail: e => {
        console.error('[Me] export failed', e);
        Taro.showToast({ title: '复制失败，重试一下', icon: 'none' });
      },
    });
  };

  const goDetail = (id: string) => Taro.navigateTo({ url: '/pkg/pages/detail/index?id=' + id });

  return (
    <PageShell>
      {/* 收藏 */}
      <View className='g-card'>
        <Text className={styles.secTitle}>⭐ 收藏的动作（{favs.length}）</Text>
        {favs.length ? (
          favs.slice(0, 10).map(e => (
            <View className={styles.meRow} key={e.id} onClick={() => goDetail(e.id)}>
              <Text className={styles.meIcon}>🏋️</Text>
              <View className={styles.meMid}>
                <Text className={styles.meName}>{e.name}</Text>
                <Text className={styles.meMeta}>
                  {e.part} · {e.equip}
                </Text>
              </View>
              <Text className={styles.meArr}>›</Text>
            </View>
          ))
        ) : (
          <Empty icon='⭐' text='去动作库点 ☆ 收藏' />
        )}
        {favs.length > 10 ? <Text className={styles.moreFavs}>…等 {favs.length} 个</Text> : null}
      </View>

      {/* 功能行 */}
      <View className='g-card'>
        <View className={styles.meRow} onClick={() => Taro.navigateTo({ url: '/pkg/pages/diet/index' })}>
          <Text className={styles.meIcon}>🍽️</Text>
          <View className={styles.meMid}>
            <Text className={styles.meName}>饮食记录</Text>
            <Text className={styles.meMeta}>三餐热量打卡，蛋白碳水脂肪一目了然</Text>
          </View>
          <Text className={styles.meArr}>›</Text>
        </View>
        <View className={styles.meRow} onClick={() => Taro.navigateTo({ url: '/pkg/pages/body/index' })}>
          <Text className={styles.meIcon}>⚖️</Text>
          <View className={styles.meMid}>
            <Text className={styles.meName}>身体数据</Text>
            <Text className={styles.meMeta}>体重趋势 · BMI · 基础代谢</Text>
          </View>
          <Text className={styles.meArr}>›</Text>
        </View>
        <View className={styles.meRow} onClick={() => Taro.navigateTo({ url: '/pkg/pages/tools/index' })}>
          <Text className={styles.meIcon}>⏱️</Text>
          <View className={styles.meMid}>
            <Text className={styles.meName}>计时工具</Text>
            <Text className={styles.meMeta}>休息计时 / HIIT / 1RM / 配重计算</Text>
          </View>
          <Text className={styles.meArr}>›</Text>
        </View>
        <View className={styles.meRow} onClick={() => setGoalOpen(true)}>
          <Text className={styles.meIcon}>🎯</Text>
          <View className={styles.meMid}>
            <Text className={styles.meName}>每周训练目标</Text>
            <Text className={styles.meMeta}>当前目标：每周 {settings.weekGoal} 次</Text>
          </View>
          <Text className={styles.meArr}>›</Text>
        </View>
        <View className={styles.meRow} onClick={toggleTheme}>
          <Text className={styles.meIcon}>🌙</Text>
          <View className={styles.meMid}>
            <Text className={styles.meName}>深色模式</Text>
            <Text className={styles.meMeta}>晚上练不刺眼</Text>
          </View>
          <View className={classnames(styles.switch, settings.theme === 'dark' && styles.switchOn)}>
            <View className={styles.switchDot} />
          </View>
        </View>
        <View className={styles.meRow} onClick={doExport}>
          <Text className={styles.meIcon}>📤</Text>
          <View className={styles.meMid}>
            <Text className={styles.meName}>导出数据</Text>
            <Text className={styles.meMeta}>全部数据复制成 JSON，自己备份</Text>
          </View>
          <Text className={styles.meArr}>›</Text>
        </View>
        <View className={styles.meRow} onClick={resetData}>
          <Text className={styles.meIcon}>🗑️</Text>
          <View className={styles.meMid}>
            <Text className={styles.meName}>清空数据</Text>
            <Text className={styles.meMeta}>清空收藏、计划、记录与饮食</Text>
          </View>
          <Text className={styles.meArr}>›</Text>
        </View>
      </View>

      {/* 关于 */}
      <View className='g-card'>
        <Text className={styles.secTitle}>ℹ️ 关于</Text>
        <View className={styles.about}>
          <Text className={styles.aboutBold}>铁馆伴侣 GymMate</Text>
          <Text className={styles.aboutLine}>— 给健身馆伙伴用的动作查询 + 跟练打卡工具。</Text>
          <Text className={styles.aboutLine}>· {DB.exercises.length} 个动作，全中文，配动态演示图</Text>
          <Text className={styles.aboutLine}>· 动作数据基于开源项目 exercises-dataset 整理翻译</Text>
          <Text className={styles.aboutLine}>· 数据只存在你手机里，不上传服务器</Text>
          <Text className={styles.aboutLine}>· 当前已有 {getPlans().length} 个计划 · {getHistory().length} 次训练</Text>
        </View>
        <View className={styles.guideBtn} onClick={() => setGuideOpen(true)}>
          <Text className={styles.guideBtnTxt}>📖 使用指南</Text>
        </View>
      </View>

      <Modal visible={guideOpen} title='📖 使用指南（大白话版）' onClose={() => setGuideOpen(false)}>
        {GUIDE.map(([t, d]) => (
          <View key={t} className={styles.guideItem}>
            <Text className={styles.guideTitle}>{t}</Text>
            <Text className={styles.guideDesc}>{d}</Text>
          </View>
        ))}
      </Modal>

      {/* 周目标弹层 */}
      <Modal visible={goalOpen} title='🎯 每周练几次？' onClose={() => setGoalOpen(false)}>
        <Text className={styles.guideDesc}>新手每周 3 次、进阶 4~5 次最容易坚持。首页会显示完成进度。</Text>
        <View className={styles.goalChips}>
          {GOAL_OPTIONS.map(n => (
            <View
              key={n}
              className={`${styles.goalChip} ${settings.weekGoal === n ? styles.goalChipOn : ''}`}
              onClick={() => {
                update({ weekGoal: n });
                setGoalOpen(false);
                Taro.showToast({ title: `周目标：每周 ${n} 次`, icon: 'none' });
              }}
            >
              <Text>{n} 次</Text>
            </View>
          ))}
        </View>
      </Modal>
    </PageShell>
  );
};

export default Me;
