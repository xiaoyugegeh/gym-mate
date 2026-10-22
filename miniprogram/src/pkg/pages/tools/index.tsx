import React, { useEffect, useRef, useState } from 'react';
import { View, Text, Input } from '@tarojs/components';
import Taro from '@tarojs/taro';
import PageShell from '@/components/PageShell';
import { fmtClock } from '@/utils/format';
import { tickVibrate, endVibrate } from '@/utils/feedback';
import { oneRm, PERCENT_TABLE, plateCalc, kgToLb, lbToKg } from '@/utils/calc';
import styles from './index.module.scss';

const REST_OPTIONS = [30, 45, 60, 75, 90, 120, 180];

type HiitPhase = 'idle' | 'work' | 'rest';

const Tools: React.FC = () => {
  /* 休息计时 */
  const [restLeft, setRestLeft] = useState<number | null>(null);
  /* HIIT */
  const [hiitWork, setHiitWork] = useState('40');
  const [hiitRest, setHiitRest] = useState('20');
  const [hiitRounds, setHiitRounds] = useState('8');
  const [phase, setPhase] = useState<HiitPhase>('idle');
  const [round, setRound] = useState(1);
  const [hiitLeft, setHiitLeft] = useState(0);
  /* 1RM 计算器 */
  const [rmWeight, setRmWeight] = useState('');
  const [rmReps, setRmReps] = useState('5');
  /* 杠铃配重 */
  const [plateTarget, setPlateTarget] = useState('');
  /* kg/lb 换算 */
  const [kgVal, setKgVal] = useState('');
  const [lbVal, setLbVal] = useState('');

  const tickRef = useRef(tickVibrate);
  tickRef.current = tickVibrate;

  /* 休息倒计时 */
  useEffect(() => {
    if (restLeft === null) return undefined;
    if (restLeft <= 0) {
      endVibrate();
      setRestLeft(null);
      Taro.showToast({ title: '休息结束，开练！', icon: 'none' });
      return undefined;
    }
    if (restLeft <= 3) tickRef.current();
    const t = setTimeout(() => setRestLeft(v => (v === null ? null : v - 1)), 1000);
    return () => clearTimeout(t);
  }, [restLeft]);

  /* HIIT 倒计时 */
  useEffect(() => {
    if (phase === 'idle') return undefined;
    if (hiitLeft <= 0) {
      // 切换阶段
      if (phase === 'work') {
        tickRef.current();
        setPhase('rest');
        setHiitLeft(Math.max(1, Number(hiitRest) || 20));
      } else {
        if (round >= (Number(hiitRounds) || 8)) {
          endVibrate();
          setPhase('idle');
          Taro.showToast({ title: 'HIIT 完成！太棒了', icon: 'none' });
          return undefined;
        }
        tickRef.current();
        setRound(r => r + 1);
        setPhase('work');
        setHiitLeft(Math.max(1, Number(hiitWork) || 40));
      }
      return undefined;
    }
    if (hiitLeft <= 3) tickRef.current();
    const t = setTimeout(() => setHiitLeft(v => v - 1), 1000);
    return () => clearTimeout(t);
  }, [hiitLeft, phase, hiitRest, hiitWork, hiitRounds, round]);

  const startRest = (sec: number) => setRestLeft(sec);

  const startHiit = () => {
    const w = Number(hiitWork);
    const r = Number(hiitRest);
    const n = Number(hiitRounds);
    if (!w || !r || !n || n > 50) {
      Taro.showToast({ title: '填正确的数字', icon: 'none' });
      return;
    }
    setRound(1);
    setPhase('work');
    setHiitLeft(w);
  };

  const restLabel = (s: number) => (s < 60 ? s + '秒' : s % 60 === 0 ? s / 60 + '分钟' : s + '秒');

  const inHiit = phase !== 'idle';
  const isRest = phase === 'rest';

  /* 计算器派生值 */
  const rm = oneRm(Number(rmWeight), Number(rmReps));
  const plateRes = plateCalc(Number(plateTarget));
  const kgNum = Number(kgVal);
  const lbNum = Number(lbVal);

  return (
    <PageShell>
      {/* 组间休息计时 */}
      <View className='g-card'>
        <Text className={styles.cardTitle}>⏱️ 组间休息计时</Text>
        <Text className={styles.cardSub}>点一下就开始倒计时，结束会震动提醒</Text>
        <View className={styles.chips}>
          {REST_OPTIONS.map(s => (
            <View key={s} className={styles.chip} onClick={() => startRest(s)}>
              <Text>{restLabel(s)}</Text>
            </View>
          ))}
        </View>
        {restLeft !== null ? (
          <View className={styles.timerBox}>
            <Text className={styles.timerNum}>{fmtClock(restLeft)}</Text>
            <View className={styles.timerBtns}>
              <View className={styles.okBtn} onClick={() => setRestLeft(null)}>
                <Text className={styles.okTxt}>✓ 提前结束</Text>
              </View>
            </View>
          </View>
        ) : null}
      </View>

      {/* HIIT */}
      <View className='g-card'>
        <Text className={styles.cardTitle}>🔥 HIIT 间歇计时</Text>
        <View className={styles.formRow3}>
          <View className={styles.formCol}>
            <Text className={styles.formLabel}>运动(秒)</Text>
            <Input className={styles.formInput} type='number' value={hiitWork} onInput={e => setHiitWork(e.detail.value)} />
          </View>
          <View className={styles.formCol}>
            <Text className={styles.formLabel}>休息(秒)</Text>
            <Input className={styles.formInput} type='number' value={hiitRest} onInput={e => setHiitRest(e.detail.value)} />
          </View>
          <View className={styles.formCol}>
            <Text className={styles.formLabel}>轮数</Text>
            <Input className={styles.formInput} type='number' value={hiitRounds} onInput={e => setHiitRounds(e.detail.value)} />
          </View>
        </View>
        {inHiit ? (
          <View className={styles.timerBox}>
            <Text className={styles.hiitPhase}>{isRest ? '😮‍💨 休息' : '💪 运动！'}</Text>
            <Text className={`${styles.timerNum} ${isRest ? styles.restNum : ''}`}>{fmtClock(hiitLeft)}</Text>
            <Text className={styles.hiitRound}>
              第 {round} / {Number(hiitRounds) || 8} 轮
            </Text>
            <View className={styles.timerBtns}>
              <View
                className={styles.okBtn}
                onClick={() => {
                  // 跳过当前阶段
                  setHiitLeft(0);
                }}
              >
                <Text className={styles.okTxt}>跳过本阶段 ▶</Text>
              </View>
              <View
                className={styles.quitBtn}
                onClick={() => {
                  setPhase('idle');
                  setRound(1);
                }}
              >
                <Text className={styles.quitTxt}>✕ 结束</Text>
              </View>
            </View>
          </View>
        ) : (
          <View className={styles.startBtn} onClick={startHiit}>
            <Text className={styles.startTxt}>开始 HIIT</Text>
          </View>
        )}
      </View>

      {/* 1RM 计算器 */}
      <View className='g-card'>
        <Text className={styles.cardTitle}>🏋️ 1RM 最大重量计算</Text>
        <Text className={styles.cardSub}>填一组能举的重量和次数，估算你一次能举起的极限</Text>
        <View className={styles.formRow3}>
          <View className={styles.formCol}>
            <Text className={styles.formLabel}>重量(kg)</Text>
            <Input className={styles.formInput} type='digit' value={rmWeight} placeholder='如 60' onInput={e => setRmWeight(e.detail.value)} />
          </View>
          <View className={styles.formCol}>
            <Text className={styles.formLabel}>完成次数</Text>
            <Input className={styles.formInput} type='number' value={rmReps} onInput={e => setRmReps(e.detail.value)} />
          </View>
        </View>
        {rm > 0 ? (
          <View>
            <View className={styles.rmBox}>
              <Text className={styles.rmNum}>{rm} kg</Text>
              <Text className={styles.rmLabel}>你的估算 1RM</Text>
            </View>
            {PERCENT_TABLE.map(row => (
              <View className={styles.pctRow} key={row.pct}>
                <Text className={styles.pctPct}>{row.pct}%</Text>
                <Text className={styles.pctKg}>{Math.round(rm * row.pct) / 100} kg</Text>
                <Text className={styles.pctReps}>约 {row.reps}</Text>
              </View>
            ))}
          </View>
        ) : null}
      </View>

      {/* 杠铃配重计算 */}
      <View className='g-card'>
        <Text className={styles.cardTitle}>🔩 杠铃配重计算</Text>
        <Text className={styles.cardSub}>标准 20kg 杆，算每边要加哪些片</Text>
        <Input className={styles.plateInput} type='digit' value={plateTarget} placeholder='目标总重量 kg，如 77.5' onInput={e => setPlateTarget(e.detail.value)} />
        {Number(plateTarget) > 0 ? (
          <View className={styles.plateResult}>
            <Text className={styles.plateMsg}>{plateRes.msg}</Text>
            {plateRes.ok ? (
              <>
                <Text className={styles.plateSide}>每边加 {plateRes.perSide}kg：</Text>
                <View className={styles.plateChips}>
                  {plateRes.plates.map((p, i) => (
                    <View className={styles.plateChip} key={i}>
                      <Text className={styles.plateChipTxt}>{p}kg</Text>
                    </View>
                  ))}
                  {!plateRes.plates.length ? <Text className={styles.plateMsg}>空杆就是目标重量</Text> : null}
                </View>
              </>
            ) : null}
          </View>
        ) : null}
      </View>

      {/* kg/lb 换算 */}
      <View className='g-card'>
        <Text className={styles.cardTitle}>🔄 kg ⇄ lb 换算</Text>
        <Text className={styles.cardSub}>看国外视频用磅、健身房用公斤，互相填自动换算</Text>
        <View className={styles.convRow}>
          <View className={styles.convCol}>
            <Text className={styles.formLabel}>公斤 kg</Text>
            <Input
              className={styles.formInput}
              type='digit'
              value={kgVal}
              placeholder='0'
              onInput={e => {
                const v = e.detail.value;
                setKgVal(v);
                setLbVal(v && Number(v) > 0 ? String(kgToLb(Number(v))) : '');
              }}
            />
          </View>
          <Text className={styles.convEq}>=</Text>
          <View className={styles.convCol}>
            <Text className={styles.formLabel}>磅 lb</Text>
            <Input
              className={styles.formInput}
              type='digit'
              value={lbVal}
              placeholder='0'
              onInput={e => {
                const v = e.detail.value;
                setLbVal(v);
                setKgVal(v && Number(v) > 0 ? String(lbToKg(Number(v))) : '');
              }}
            />
          </View>
        </View>
        {kgNum > 0 ? (
          <Text className={styles.convTip}>
            {kgNum}kg = {kgToLb(kgNum)}lb ｜ {lbNum > 0 ? `${lbNum}lb = ${lbToKg(lbNum)}kg` : ''}
          </Text>
        ) : null}
      </View>
    </PageShell>
  );
};

export default Tools;
