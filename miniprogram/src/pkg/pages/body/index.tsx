import React, { useMemo, useState } from 'react';
import { View, Text, Input } from '@tarojs/components';
import Taro, { useDidShow } from '@tarojs/taro';
import PageShell from '@/components/PageShell';
import Empty from '@/components/Empty';
import type { BodyLog, Sex } from '@/types';
import { useSettings } from '@/store/app';
import { getBodyLogs, addBodyLog } from '@/utils/storage';
import { calcBmi, bmiLabel, calcBmr, calcTdee } from '@/utils/calc';
import { todayStr } from '@/utils/format';
import styles from './index.module.scss';

const Body: React.FC = () => {
  const { settings, update } = useSettings();
  const [logs, setLogs] = useState<BodyLog[]>([]);
  const [w, setW] = useState('');
  const [fat, setFat] = useState('');
  const [ageInput, setAgeInput] = useState(String(settings.age));
  const [hInput, setHInput] = useState(String(settings.height));

  useDidShow(() => {
    setLogs(getBodyLogs());
  });

  const latest = logs[0];
  const bmiVal = useMemo(() => (latest ? calcBmi(settings.height, latest.weight) : 0), [latest, settings.height]);
  const bmiInfo = bmiVal ? bmiLabel(bmiVal) : null;
  const bmrVal = useMemo(
    () => (latest ? calcBmr(settings.sex, latest.weight, settings.height, settings.age) : 0),
    [latest, settings],
  );
  const tdeeVal = useMemo(
    () => (latest ? calcTdee(settings.sex, latest.weight, settings.height, settings.age) : 0),
    [latest, settings],
  );

  /* 趋势图：最近 10 条 */
  const trend = useMemo(() => logs.slice(0, 10).reverse(), [logs]);
  const minW = trend.length ? Math.min(...trend.map(l => l.weight)) : 0;
  const maxW = trend.length ? Math.max(...trend.map(l => l.weight)) : 0;
  const range = Math.max(maxW - minW, 1);

  const saveLog = () => {
    const weight = Math.round(Number(w) * 10) / 10;
    if (!weight || weight < 20 || weight > 300) {
      Taro.showToast({ title: '填个合理的体重(kg)', icon: 'none' });
      return;
    }
    const fatV = Math.round(Number(fat) * 10) / 10;
    const log: BodyLog = { t: Date.now(), weight };
    if (fatV > 0 && fatV < 70) log.fat = fatV;
    addBodyLog(log);
    setLogs(getBodyLogs());
    setW('');
    setFat('');
    Taro.showToast({ title: '已记录，坚持每周同一时间称', icon: 'none' });
  };

  const saveProfile = () => {
    const age = Math.round(Number(ageInput));
    const h = Math.round(Number(hInput));
    if (!age || age < 10 || age > 90 || !h || h < 100 || h > 250) {
      Taro.showToast({ title: '年龄或身高不合理', icon: 'none' });
      return;
    }
    update({ age, height: h });
    Taro.showToast({ title: '已保存', icon: 'none', duration: 1000 });
  };

  return (
    <PageShell>
      {/* 记录体重 */}
      <View className='g-card'>
        <Text className={styles.cardTitle}>⚖️ 记录体重</Text>
        <View className={styles.formRow}>
          <View className={styles.formCol}>
            <Text className={styles.formLabel}>体重 (kg)</Text>
            <Input className={styles.formInput} type='digit' value={w} placeholder='如 65.5' onInput={e => setW(e.detail.value)} />
          </View>
          <View className={styles.formCol}>
            <Text className={styles.formLabel}>体脂率 (%)，可选</Text>
            <Input className={styles.formInput} type='digit' value={fat} placeholder='如 18' onInput={e => setFat(e.detail.value)} />
          </View>
        </View>
        <View className={styles.primaryBtn} onClick={saveLog}>
          <Text className={styles.primaryBtnTxt}>保存今天的体重</Text>
        </View>
        <Text className={styles.cardSub}>💡 同一天重复记录会覆盖。建议每周固定 1~2 天、早上空腹称。</Text>
      </View>

      {/* 指标 */}
      {latest ? (
        <View className='g-card'>
          <Text className={styles.cardTitle}>📊 你的指标</Text>
          <View className={styles.metricGrid}>
            <View className={styles.metric}>
              <Text className={styles.mNum}>
                {latest.weight}
                <Text className={styles.mUnit}>kg</Text>
              </Text>
              <Text className={styles.mLabel}>最新体重</Text>
            </View>
            <View className={styles.metric}>
              <Text className={styles.mNum}>{bmiVal || '—'}</Text>
              <Text className={styles.mLabel}>
                BMI{bmiInfo ? `（${bmiInfo.label}）` : ''}
              </Text>
            </View>
            <View className={styles.metric}>
              <Text className={styles.mNum}>{bmrVal || '—'}</Text>
              <Text className={styles.mLabel}>基础代谢 BMR</Text>
            </View>
            <View className={styles.metric}>
              <Text className={styles.mNum}>{tdeeVal || '—'}</Text>
              <Text className={styles.mLabel}>每日消耗 TDEE</Text>
            </View>
          </View>
          <Text className={styles.cardSub}>
            TDEE 是你一天大概消耗的热量，去「饮食记录」按它安排三餐。BMI {bmiInfo ? `目前${bmiInfo.label}` : ''}
            {bmiInfo?.type === 'good' ? '，保持！' : '，配合力量训练调整。'}
          </Text>
        </View>
      ) : null}

      {/* 体重趋势 */}
      {trend.length >= 2 ? (
        <View className='g-card'>
          <Text className={styles.cardTitle}>📉 体重趋势（最近 {trend.length} 次）</Text>
          <View className={styles.trendChart}>
            {trend.map(l => (
              <View className={styles.tCol} key={l.t}>
                <Text className={styles.tVal}>{l.weight}</Text>
                <View className={styles.tTrack}>
                  <View
                    className={styles.tBar}
                    style={`height:${Math.max(8, Math.round(((l.weight - minW) / range) * 88 + 12))}%`}
                  />
                </View>
                <Text className={styles.tLabel}>{new Date(l.t).getMonth() + 1}/{new Date(l.t).getDate()}</Text>
              </View>
            ))}
          </View>
          <Text className={styles.cardSub}>
            {maxW > minW ? `区间 ${minW}~${maxW}kg，波动 ${Math.round((maxW - minW) * 10) / 10}kg` : '体重很稳定'}
          </Text>
        </View>
      ) : null}

      {/* 基础信息 */}
      <View className='g-card'>
        <Text className={styles.cardTitle}>🧍 基本信息（算 BMI/代谢用）</Text>
        <View className={styles.sexRow}>
          {(['男', '女'] as Sex[]).map(s => (
            <View key={s} className={`${styles.sexBtn} ${settings.sex === s ? styles.sexOn : ''}`} onClick={() => update({ sex: s })}>
              <Text>{s === '男' ? '👨 男' : '👩 女'}</Text>
            </View>
          ))}
        </View>
        <View className={styles.formRow}>
          <View className={styles.formCol}>
            <Text className={styles.formLabel}>年龄</Text>
            <Input className={styles.formInput} type='number' value={ageInput} onInput={e => setAgeInput(e.detail.value)} />
          </View>
          <View className={styles.formCol}>
            <Text className={styles.formLabel}>身高 (cm)</Text>
            <Input className={styles.formInput} type='digit' value={hInput} onInput={e => setHInput(e.detail.value)} />
          </View>
        </View>
        <View className={styles.primaryBtn} onClick={saveProfile}>
          <Text className={styles.primaryBtnTxt}>保存基本信息</Text>
        </View>
      </View>

      {/* 历史 */}
      <Text className='g-sec-title'>历史记录</Text>
      <View className='g-card'>
        {logs.length ? (
          logs.map(l => (
            <View className={styles.logRow} key={l.t}>
              <Text className={styles.logDate}>
                {todayStr(l.t)}（体重变化趋势见上）
              </Text>
              <Text className={styles.logVal}>{l.weight}kg</Text>
              {l.fat ? <Text className={styles.logFat}>体脂 {l.fat}%</Text> : null}
            </View>
          ))
        ) : (
          <Empty icon='⚖️' text='还没有体重记录，上面填一个吧' />
        )}
      </View>
    </PageShell>
  );
};

export default Body;
