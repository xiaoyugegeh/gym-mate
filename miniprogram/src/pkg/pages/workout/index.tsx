import React, { useEffect, useMemo, useRef, useState } from 'react';
import { View, Text, Image, Input } from '@tarojs/components';
import Taro from '@tarojs/taro';
import PageShell from '@/components/PageShell';
import type { HistoryRecord, WorkoutState } from '@/types';
import { EX } from '@/utils/fitness';
import { guideOf } from '@/utils/guide';
import { gifUrl } from '@/utils/images';
import { addHistory, clearWorkoutSession, getWorkoutSession, saveWorkoutSession, takePendingWorkout } from '@/utils/storage';
import { fmtClock, fmtDur, uid } from '@/utils/format';
import { tickVibrate, endVibrate } from '@/utils/feedback';
import styles from './index.module.scss';

/** 把完成组整理成每个动作的重量数组 */
function weightsOf(done: { exId: string; weight?: number }[]): Record<string, number[]> {
  const map: Record<string, number[]> = {};
  done.forEach(d => {
    if (d.weight && d.weight > 0) {
      (map[d.exId] ||= []).push(d.weight);
    }
  });
  return map;
}

const Workout: React.FC = () => {
  const [st, setSt] = useState<WorkoutState | null>(null);
  const savedRef = useRef(false);
  /* 每组重量输入（kg，可选） */
  const [weightInput, setWeightInput] = useState('');
  const lastWeightRef = useRef<Record<string, string>>({});

  /* 初始化：优先读取待练会话，其次恢复中断会话 */
  useEffect(() => {
    const pending = takePendingWorkout();
    const session = pending || getWorkoutSession();
    if (!session) {
      Taro.showModal({
        title: '没有进行中的训练',
        content: '从计划或动作详情页发起跟练',
        showCancel: false,
        success: () => Taro.navigateBack(),
      });
      return;
    }
    setSt({
      ...session,
      exIdx: 0,
      setIdx: 0,
      phase: 'work',
      left: 0,
      done: [],
    });
  }, []);

  const ex = useMemo(() => (st ? EX(st.items[st.exIdx]?.id || '') : undefined), [st]);
  const item = st ? st.items[st.exIdx] : undefined;

  /* 切换动作时带上次输入的重量 */
  useEffect(() => {
    if (st && ex) {
      setWeightInput(lastWeightRef.current[ex.id] || '');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [st?.exIdx]);

  /* 持久化会话 + 倒计时 */
  useEffect(() => {
    if (!st) return undefined;
    if (st.phase !== 'done') {
      saveWorkoutSession({ name: st.name, items: st.items, startT: st.startT });
    }
    if (st.phase !== 'rest' || st.left <= 0) return undefined;
    if (st.left <= 3) tickVibrate();
    const t = setTimeout(() => {
      setSt(prev => (prev && prev.phase === 'rest' ? { ...prev, left: prev.left - 1 } : prev));
    }, 1000);
    return () => clearTimeout(t);
  }, [st]);

  if (!st || !ex || !item) {
    return (
      <PageShell>
        <View className={styles.center}>
          <Text>正在准备…</Text>
        </View>
      </PageShell>
    );
  }

  const guide = guideOf(ex);
  const totalSets = st.items.reduce((s, i) => s + i.sets, 0);
  const doneSets = st.done.length;

  /* 完成当前一组 */
  const finishSet = () => {
    const w = Math.round(Number(weightInput) * 10) / 10;
    const done = [...st.done, { exId: ex.id, set: st.setIdx + 1, weight: w > 0 ? w : undefined }];
    if (w > 0) lastWeightRef.current[ex.id] = weightInput;
    const nextGlobal = done.length;
    // 找下一个组
    let ei = st.exIdx;
    let si = st.setIdx + 1;
    while (ei < st.items.length && si >= st.items[ei].sets) {
      ei++;
      si = 0;
    }
    if (ei >= st.items.length) {
      /* 全部完成 */
      endVibrate();
      const durSec = Math.max(60, Math.round((Date.now() - st.startT) / 1000));
      const parts: Record<string, number> = {};
      st.items.forEach(it => {
        const e = EX(it.id);
        if (e) parts[e.part] = (parts[e.part] || 0) + it.sets;
      });
      const rec: HistoryRecord = {
        id: uid(),
        t: Date.now(),
        name: st.name,
        durSec,
        setsDone: done.length,
        parts,
        items: st.items.map(i => ({ exId: i.id, sets: i.sets, reps: i.reps, weights: weightsOf(done)[i.id] })),
      };
      addHistory(rec);
      clearWorkoutSession();
      savedRef.current = true;
      setSt(prev => (prev ? { ...prev, phase: 'done', done } : prev));
      void nextGlobal;
      return;
    }
    /* 进入休息 */
    endVibrate();
    setSt(prev =>
      prev
        ? {
            ...prev,
            done,
            phase: 'rest',
            left: item.rest > 0 ? item.rest : 0,
            exIdx: ei,
            setIdx: si,
          }
        : prev,
    );
    if (item.rest <= 0) {
      // 无休息直接进入下一组
      setSt(prev => (prev ? { ...prev, phase: 'work' } : prev));
    }
  };

  /* 休息：跳过 / 加时 */
  const skipRest = () => setSt(prev => (prev ? { ...prev, left: 0, phase: 'work' } : prev));
  const addRest = () => setSt(prev => (prev && prev.phase === 'rest' ? { ...prev, left: prev.left + 15 } : prev));

  /* 中途退出 */
  const quit = () => {
    Taro.showModal({
      title: '结束训练？',
      content: doneSets ? `已练 ${doneSets}/${totalSets} 组，练过的会记入打卡` : '一组还没练完，确定退出？',
      confirmText: doneSets ? '结束并打卡' : '退出',
      cancelText: '继续练',
      success: r => {
        if (!r.confirm) return;
        if (doneSets && st) {
          const durSec = Math.max(60, Math.round((Date.now() - st.startT) / 1000));
          const parts: Record<string, number> = {};
          st.done.forEach(d => {
            const e = EX(d.exId);
            if (e) parts[e.part] = (parts[e.part] || 0) + 1;
          });
          addHistory({
            id: uid(),
            t: Date.now(),
            name: st.name,
            durSec,
            setsDone: st.done.length,
            parts,
            items: st.items.map(i => ({ exId: i.id, sets: i.sets, reps: i.reps, weights: weightsOf(st.done)[i.id] })),
          });
        }
        clearWorkoutSession();
        Taro.navigateBack();
      },
    });
  };

  const isResting = st.phase === 'rest';
  const curName = st.items[st.exIdx] ? EX(st.items[st.exIdx].id)?.name || '' : '';

  /* 完成页 */
  if (st.phase === 'done') {
    const durSec = Math.max(60, Math.round((Date.now() - st.startT) / 1000));
    return (
      <PageShell>
        <View className={styles.doneBox}>
          <Text className={styles.doneEmoji}>🎉</Text>
          <Text className={styles.doneTitle}>训练完成！</Text>
          <Text className={styles.doneSub}>已自动记入打卡，明天见</Text>
          <View className={styles.doneStats}>
            <View className={styles.ds}>
              <Text className={styles.dsNum}>{doneSets}</Text>
              <Text className={styles.dsLabel}>总组数</Text>
            </View>
            <View className={styles.ds}>
              <Text className={styles.dsNum}>{fmtDur(durSec)}</Text>
              <Text className={styles.dsLabel}>时长</Text>
            </View>
            <View className={styles.ds}>
              <Text className={styles.dsNum}>{st.items.length}</Text>
              <Text className={styles.dsLabel}>动作数</Text>
            </View>
          </View>
          <View
            className={styles.doneBtn}
            onClick={() => {
              clearWorkoutSession();
              Taro.switchTab({ url: '/pages/log/index' });
            }}
          >
            <Text className={styles.doneBtnTxt}>看训练记录</Text>
          </View>
          <View
            className={styles.doneGhost}
            onClick={() => {
              clearWorkoutSession();
              Taro.switchTab({ url: '/pages/home/index' });
            }}
          >
            <Text className={styles.doneGhostTxt}>回首页</Text>
          </View>
        </View>
      </PageShell>
    );
  }

  return (
    <PageShell>
      {/* 顶部进度 */}
      <View className={styles.topBar}>
        <View className={styles.quit} onClick={quit}>
          <Text>✕</Text>
        </View>
        <View className={styles.progressInfo}>
          <Text className={styles.progressTxt}>
            {st.name} · 第 {st.exIdx + 1}/{st.items.length} 个动作
          </Text>
          <View className={styles.progressTrack}>
            <View className={styles.progressFill} style={`width:${Math.round((doneSets / totalSets) * 100)}%`} />
          </View>
        </View>
        <Text className={styles.progressNum}>
          {doneSets}/{totalSets}组
        </Text>
      </View>

      {/* 休息中浮层 */}
      {isResting ? (
        <View className={styles.restCard}>
          <Text className={styles.restTitle}>😮‍💨 休息一下</Text>
          <Text className={styles.restNum}>{fmtClock(st.left)}</Text>
          <Text className={styles.restNext}>下一个：{curName}</Text>
          <View className={styles.restBtns}>
            <View className={styles.restBtn} onClick={addRest}>
              <Text className={styles.restBtnTxt}>＋15秒</Text>
            </View>
            <View className={`${styles.restBtn} ${styles.restBtnGo}`} onClick={skipRest}>
              <Text className={styles.restBtnGoTxt}>跳过，下一组！</Text>
            </View>
          </View>
        </View>
      ) : (
        <>
          {/* 动作演示 */}
          <View className={styles.gifBox}>
            <Image className={styles.gif} src={gifUrl(ex)} mode='aspectFit' />
          </View>

          {/* 当前动作 */}
          <View className={styles.nowBox}>
            <Text className={styles.nowName}>{ex.name}</Text>
            <Text className={styles.nowMeta}>
              第 {st.setIdx + 1}/{item.sets} 组 · 目标 {item.reps} 次 · 动作要领看下方
            </Text>
            <View className={styles.nowTips}>
              {guide.tips.slice(0, 2).map((t, i) => (
                <Text className={styles.nowTip} key={i}>
                  ✅ {t}
                </Text>
              ))}
            </View>
          </View>

          {/* 重量输入（可选） */}
          <View className={styles.weightRow}>
            <Text className={styles.weightLabel}>🏋️ 本次重量</Text>
            <Input
              className={styles.weightInput}
              type='digit'
              value={weightInput}
              placeholder='kg，可不填'
              onInput={e => setWeightInput(e.detail.value)}
            />
          </View>

          {/* 完成按钮 */}
          <View className={styles.workBtn} onClick={finishSet}>
            <Text className={styles.workBtnTxt}>✓ 完成这一组</Text>
          </View>
        </>
      )}
    </PageShell>
  );
};

export default Workout;
