import React, { useMemo, useState } from 'react';
import { View, Text } from '@tarojs/components';
import Taro, { useDidShow } from '@tarojs/taro';
import PageShell from '@/components/PageShell';
import Heatmap from '@/components/Heatmap';
import Empty from '@/components/Empty';
import type { HistoryRecord } from '@/types';
import { useSettings } from '@/store/app';
import { getHistory, getBodyLogs } from '@/utils/storage';
import { coachTips, weeklyVolume, topPr } from '@/utils/analysis';
import { calcBmi, bmiLabel } from '@/utils/calc';
import { calcStreak, EX } from '@/utils/fitness';
import { fmtDur, WEEKCN } from '@/utils/format';
import styles from './index.module.scss';

const Log: React.FC = () => {
  const { settings } = useSettings();
  const [hist, setHist] = useState<HistoryRecord[]>([]);
  const [body, setBody] = useState<{ weight: number; fat?: number } | null>(null);

  useDidShow(() => {
    setHist(getHistory());
    const b = getBodyLogs()[0];
    setBody(b ? { weight: b.weight, fat: b.fat } : null);
  });

  const tips = useMemo(() => coachTips(hist, settings.weekGoal), [hist, settings.weekGoal]);
  const weeks = useMemo(() => weeklyVolume(hist), [hist]);
  const maxSets = useMemo(() => Math.max(...weeks.map(w => w.sets), 1), [weeks]);
  const prs = useMemo(() => topPr(hist), [hist]);

  const totalSets = hist.reduce((s, h) => s + (h.setsDone || 0), 0);
  const totalDur = hist.reduce((s, h) => s + (h.durSec || 0), 0);
  const partCnt: Record<string, number> = {};
  hist.forEach(h => {
    Object.entries(h.parts || {}).forEach(([p, n]) => {
      partCnt[p] = (partCnt[p] || 0) + n;
    });
  });
  const parts = Object.entries(partCnt)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 6);
  const maxP = parts.length ? parts[0][1] : 1;

  return (
    <PageShell>
      {/* 总览 */}
      <View className='g-card'>
        <Text className={styles.cardTitle}>📊 总览</Text>
        <View className={styles.statGrid}>
          <View className={styles.sg}>
            <Text className={styles.sgNum}>{hist.length}</Text>
            <Text className={styles.sgLabel}>累计训练(次)</Text>
          </View>
          <View className={styles.sg}>
            <Text className={styles.sgNum}>{calcStreak(hist)}</Text>
            <Text className={styles.sgLabel}>连续打卡(天)</Text>
          </View>
          <View className={styles.sg}>
            <Text className={styles.sgNum}>{totalSets}</Text>
            <Text className={styles.sgLabel}>累计总组数</Text>
          </View>
          <View className={styles.sg}>
            <Text className={styles.sgNum}>{fmtDur(totalDur)}</Text>
            <Text className={styles.sgLabel}>累计总时长</Text>
          </View>
        </View>
      </View>

      {/* 教练点评 */}
      <View className='g-card'>
        <Text className={styles.cardTitle}>💡 教练点评</Text>
        <View className={styles.tipList}>
          {tips.map((t, i) => (
            <View
              key={i}
              className={`${styles.coachItem} ${t.type === 'good' ? styles.coachGood : t.type === 'warn' ? styles.coachWarn : ''}`}
            >
              <Text>{t.icon}</Text>
              <Text className={styles.coachTxt}>{t.text}</Text>
            </View>
          ))}
        </View>
      </View>

      {/* 打卡日历 */}
      <View className='g-card'>
        <Text className={styles.cardTitle}>🔥 打卡日历（近12周）</Text>
        <Heatmap history={hist} />
        <View className={styles.legend}>
          <Text className={styles.legendTxt}>少</Text>
          {[0, 1, 2, 3, 4].map(lv => (
            <View key={lv} className={`${styles.legendCell} ${lv ? styles['l' + lv] : ''}`} />
          ))}
          <Text className={styles.legendTxt}>多（练得越久颜色越深）</Text>
        </View>
      </View>

      {/* 每周训练量 */}
      <View className='g-card'>
        <Text className={styles.cardTitle}>📈 每周训练量（近8周）</Text>
        <View className={styles.wkChart}>
          {weeks.map(w => (
            <View className={styles.wkCol} key={w.label}>
              <Text className={styles.wkVal}>{w.sets || '·'}</Text>
              <View className={styles.wkTrack}>
                <View
                  className={`${styles.wkBar} ${w.sets > 0 && w.sets >= maxSets ? styles.wkBarMax : ''}`}
                  style={`height:${Math.max(6, Math.round((w.sets / maxSets) * 100))}%`}
                />
              </View>
              <Text className={styles.wkLabel}>{w.label}</Text>
            </View>
          ))}
        </View>
        <Text className={styles.chartSub}>柱子越高 = 完成组数越多，最后一格是本周</Text>
      </View>

      {/* 部位分布 */}
      {parts.length ? (
        <View className='g-card'>
          <Text className={styles.cardTitle}>💪 部位分布（按组数）</Text>
          {parts.map(([p, n]) => (
            <View className={styles.barRow} key={p}>
              <Text className={styles.barLabel}>{p}</Text>
              <View className={styles.barTrack}>
                <View className={styles.barFill} style={`width:${Math.round((n / maxP) * 100)}%`} />
              </View>
              <Text className={styles.barVal}>{n}组</Text>
            </View>
          ))}
        </View>
      ) : null}

      {/* 个人纪录 */}
      {prs.length ? (
        <View className='g-card'>
          <Text className={styles.cardTitle}>🏆 个人纪录（重量）</Text>
          {prs.map((p, i) => (
            <View className={styles.prRow} key={p.exId}>
              <Text className={styles.prRank}>{i + 1}</Text>
              <Text className={styles.prName}>{EX(p.exId)?.name || '动作'}</Text>
              <Text className={styles.prMeta}>
                {p.weight}kg × {p.reps}次
              </Text>
            </View>
          ))}
          <Text className={styles.chartSub}>跟练时填了重量，就会自动记 PR</Text>
        </View>
      ) : null}

      {/* 身体数据入口 */}
      <View className='g-card' onClick={() => Taro.navigateTo({ url: '/pkg/pages/body/index' })}>
        <View className={styles.bodyRow}>
          <View className={styles.bodyLeft}>
            <Text className={styles.cardTitle}>⚖️ 身体数据</Text>
            <Text className={styles.bodyMeta}>
              {body ? `最新体重 ${body.weight}kg${body.fat ? ` · 体脂 ${body.fat}%` : ''}` : '还没记录过体重，点这里去记录'}
            </Text>
          </View>
          {body ? (
            <View className={styles.bmiBox}>
              <Text className={styles.bmiNum}>{calcBmi(settings.height, body.weight)}</Text>
              <Text className={styles.bmiLabel}>BMI {bmiLabel(calcBmi(settings.height, body.weight)).label}</Text>
            </View>
          ) : (
            <Text className={styles.liArr}>›</Text>
          )}
        </View>
      </View>

      {/* 历史记录 */}
      <Text className='g-sec-title'>历史记录</Text>
      <View className='g-card'>
        {hist.length ? (
          hist.slice(0, 30).map(h => {
            const d = new Date(h.t);
            return (
              <View className={styles.logItem} key={h.id}>
                <View className={styles.liDate}>
                  <Text className={styles.liDay}>
                    {d.getMonth() + 1}/{d.getDate()}
                  </Text>
                  <Text className={styles.liWeek}>{WEEKCN[d.getDay()]}</Text>
                </View>
                <View className={styles.liMid}>
                  <Text className={styles.liName}>{h.name}</Text>
                  <Text className={styles.liMeta}>
                    {h.setsDone} 组 · {fmtDur(h.durSec)}
                  </Text>
                </View>
                <Text className={styles.liArr}>›</Text>
              </View>
            );
          })
        ) : (
          <Empty icon='🏋️' text='还没有记录，去练一发！' />
        )}
      </View>
    </PageShell>
  );
};

export default Log;
