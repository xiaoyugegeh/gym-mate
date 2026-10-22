import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, Image, Input } from '@tarojs/components';
import Taro, { useDidShow } from '@tarojs/taro';
import PageShell from '@/components/PageShell';
import Tag from '@/components/Tag';
import Empty from '@/components/Empty';
import Modal from '@/components/Modal';
import { DB } from '@/data/exercises';
import type { Goal } from '@/types';
import { useSettings } from '@/store/app';
import { EX, getCurated, hasCurated, suggestSets, restSeconds } from '@/utils/fitness';
import { guideOf } from '@/utils/guide';
import { gifUrl, LEVEL_CLASS } from '@/utils/images';
import { isFav, toggleFav, getHistory, getPlans, savePlans } from '@/utils/storage';
import { startWorkout } from '@/utils/session';
import { uid } from '@/utils/format';
import styles from './index.module.scss';

const GOALS: Goal[] = ['增肌', '力量', '耐力'];

const Detail: React.FC = () => {
  const id = Taro.getCurrentInstance().router?.params?.id || '';
  const { settings, update } = useSettings();
  const [fav, setFav] = useState(false);
  const [histCount, setHistCount] = useState(0);
  const [imgErr, setImgErr] = useState(false);
  const [planModal, setPlanModal] = useState(false);
  const [newPlanName, setNewPlanName] = useState('');
  const [plansVersion, setPlansVersion] = useState(0);

  const exercise = useMemo(() => EX(id), [id]);

  useDidShow(() => {
    setFav(isFav(id));
    setHistCount(getHistory().filter(h => h.items && h.items.some(i => i.exId === id)).length);
  });

  useEffect(() => {
    if (exercise) {
      Taro.setNavigationBarTitle({ title: exercise.name });
    }
  }, [exercise]);

  const curated = useMemo(() => (exercise ? getCurated(exercise) : null), [exercise]);
  const guide = useMemo(() => (exercise ? guideOf(exercise) : null), [exercise]);
  const suggestion = useMemo(() => (exercise ? suggestSets(exercise, settings.goal) : null), [exercise, settings.goal]);
  const related = useMemo(
    () => (exercise ? DB.exercises.filter(x => x.part === exercise.part && x.id !== exercise.id).slice(0, 8) : []),
    [exercise],
  );

  if (!exercise || !guide || !suggestion) {
    return (
      <PageShell>
        <Empty icon='🤔' text='动作不存在' />
      </PageShell>
    );
  }

  const steps = curated?.steps?.length ? curated.steps : guide.steps;
  const tips = curated?.tips?.length ? curated.tips : guide.tips;
  const mistakes = curated?.mistakes?.length ? curated.mistakes : guide.mistakes;
  const breathing = curated?.breathing || '发力时呼气，还原时吸气，全程别憋气。';

  const handleFav = () => {
    const on = toggleFav(exercise.id);
    setFav(on);
    Taro.showToast({ title: on ? '已收藏' : '已取消', icon: 'none', duration: 1200 });
  };

  const addToPlan = (planId: string) => {
    const plans = getPlans();
    const p = plans.find(x => x.id === planId);
    if (!p) return;
    p.items.push({ id: exercise.id, sets: 4, reps: suggestion.reps, rest: restSeconds(suggestion.rest) });
    savePlans(plans);
    setPlanModal(false);
    Taro.showToast({ title: '已加入「' + p.name + '」', icon: 'none' });
  };

  const createAndAdd = () => {
    const name = newPlanName.trim();
    if (!name) {
      Taro.showToast({ title: '先起个名字', icon: 'none' });
      return;
    }
    const plans = getPlans();
    const p = { id: uid(), name, emoji: '📋', items: [{ id: exercise.id, sets: 4, reps: suggestion.reps, rest: restSeconds(suggestion.rest) }] };
    plans.unshift(p);
    savePlans(plans);
    setNewPlanName('');
    setPlanModal(false);
    setPlansVersion(v => v + 1);
    Taro.showToast({ title: '已创建并加入', icon: 'none' });
  };

  const plans = planModal ? getPlans() : [];

  return (
    <PageShell>
      {/* GIF 演示 */}
      <View className={styles.gifBox}>
        {imgErr || !gifUrl(exercise) ? (
          <View className={styles.gifFallback}>
            <Text>暂无演示图</Text>
          </View>
        ) : (
          <Image
            className={styles.gif}
            src={gifUrl(exercise)}
            mode='aspectFit'
            onError={() => {
              console.error('[Detail] GIF 加载失败:', exercise.id);
              setImgErr(true);
            }}
          />
        )}
      </View>

      {/* 名称与标签 */}
      <View className={styles.nameBox}>
        <Text className={styles.name}>{exercise.name}</Text>
        <Text className={styles.nameEn}>
          {exercise.nameEn}
          {histCount ? ` · 你练过 ${histCount} 次` : ''}
        </Text>
        <View className={styles.tags}>
          <Tag text={exercise.part} type='p' />
          <Tag text={exercise.level} type={(LEVEL_CLASS[exercise.level] || 'g') as 'g'} />
          <Tag text={'🛠 ' + exercise.equip} type='b' />
          {hasCurated(exercise) ? <Tag text='✓ 教练详解' type='g' /> : null}
        </View>
      </View>

      {/* 锻炼哪里 */}
      <View className='g-card'>
        <Text className={styles.cardTitle}>🎯 锻炼哪里</Text>
        <View className={styles.infoGrid}>
          <View className={styles.ig}>
            <Text className={styles.igK}>主要目标肌群</Text>
            <Text className={styles.igV}>{exercise.muscles.join('、') || '—'}</Text>
          </View>
          <View className={styles.ig}>
            <Text className={styles.igK}>身体部位</Text>
            <Text className={styles.igV}>{exercise.parts.join('、')}</Text>
          </View>
          <View className={styles.ig}>
            <Text className={styles.igK}>需要器械</Text>
            <Text className={styles.igV}>{exercise.equip}</Text>
          </View>
          <View className={styles.ig}>
            <Text className={styles.igK}>动作类型</Text>
            <Text className={styles.igV}>{exercise.force || '—'}</Text>
          </View>
        </View>
      </View>

      {/* 练几组练几次 */}
      <View className='g-card'>
        <Text className={styles.cardTitle}>🔢 练几组？练几次？</Text>
        <View className={styles.goalSwitch}>
          {GOALS.map(g => (
            <View
              key={g}
              className={`${styles.goalBtn} ${settings.goal === g ? styles.goalOn : ''}`}
              onClick={() => update({ goal: g })}
            >
              <Text>
                {g}
                {g === '增肌' ? '(推荐)' : ''}
              </Text>
            </View>
          ))}
        </View>
        <View className={styles.srRow}>
          <View className={styles.sr}>
            <Text className={styles.srNum}>{suggestion.sets}</Text>
            <Text className={styles.srLabel}>组数</Text>
          </View>
          <View className={styles.sr}>
            <Text className={styles.srNum}>{suggestion.reps}</Text>
            <Text className={styles.srLabel}>每组次数</Text>
          </View>
          <View className={styles.sr}>
            <Text className={styles.srNum}>{suggestion.rest}</Text>
            <Text className={styles.srLabel}>组间休息</Text>
          </View>
        </View>
        <Text className={styles.srTip}>💡 增肌=练大块头；力量=举更重；耐力=更持久不易累。有疼痛就减量。</Text>
      </View>

      {/* 怎么练 */}
      <View className='g-card'>
        <Text className={styles.cardTitle}>📖 怎么练（{steps.length} 步）</Text>
        <View className={styles.stepList}>
          {steps.map((s, i) => (
            <View className={styles.stepItem} key={i}>
              <Text className={styles.stepIdx}>{i + 1}</Text>
              <Text className={styles.stepTxt}>{s}</Text>
            </View>
          ))}
        </View>
        <View className={styles.breathing}>
          <Text>🫁 <Text className={styles.breathBold}>呼吸</Text>：{breathing}</Text>
        </View>
      </View>

      {/* 对错要点 */}
      <View className='g-card'>
        <Text className={styles.cardTitle}>✅❌ 对错要点</Text>
        <View className={styles.okBad}>
          {tips.map((t, i) => (
            <View className={`${styles.ob} ${styles.obGood}`} key={'t' + i}>
              <Text>✅</Text>
              <Text className={styles.obTxt}>{t}</Text>
            </View>
          ))}
          {mistakes.map((t, i) => (
            <View className={`${styles.ob} ${styles.obBad}`} key={'m' + i}>
              <Text>❌</Text>
              <Text className={styles.obTxt}>{t}</Text>
            </View>
          ))}
        </View>
      </View>

      {/* 换着练 */}
      {related.length ? (
        <View className='g-card'>
          <Text className={styles.cardTitle}>🔄 换着练（同部位）</Text>
          <View className={styles.relatedWrap}>
            {related.map(r => (
              <View
                key={r.id}
                className={styles.relatedChip}
                onClick={() => Taro.redirectTo({ url: '/pkg/pages/detail/index?id=' + r.id })}
              >
                <Text>{r.name}</Text>
              </View>
            ))}
          </View>
        </View>
      ) : null}

      <View className={styles.bottomSpace} />

      {/* 底部操作栏 */}
      <View className={styles.actionBar}>
        <View className={styles.ghostBtn} onClick={handleFav}>
          <Text className={styles.ghostTxt}>{fav ? '★ 已收藏' : '☆ 收藏'}</Text>
        </View>
        <View className={styles.ghostBtn} onClick={() => setPlanModal(true)}>
          <Text className={styles.ghostTxt}>＋ 加入计划</Text>
        </View>
        <View
          className={styles.goBtn}
          onClick={() =>
            startWorkout(exercise.name, [{ id: exercise.id, sets: 4, reps: suggestion.reps, rest: restSeconds(suggestion.rest) }])
          }
        >
          <Text className={styles.goTxt}>▶ 立即开练</Text>
        </View>
      </View>

      {/* 加入计划弹层 */}
      <Modal visible={planModal} title='加入训练计划' onClose={() => setPlanModal(false)}>
        {plans.length ? (
          <View>
            <Text className={styles.modalSec}>选择已有计划</Text>
            {plans.map(p => (
              <View key={p.id + '-' + plansVersion} className={styles.planRow} onClick={() => addToPlan(p.id)}>
                <Text>
                  📋 {p.name}（{p.items.length}个动作）
                </Text>
              </View>
            ))}
          </View>
        ) : (
          <Text className={styles.modalEmpty}>还没有计划，新建一个吧</Text>
        )}
        <Text className={styles.modalSec}>新建计划</Text>
        <Input className={styles.nameInput} placeholder='如：增肌 · 胸' value={newPlanName} onInput={e => setNewPlanName(e.detail.value)} />
        <View className={styles.modalBtn} onClick={createAndAdd}>
          <Text className={styles.modalBtnTxt}>＋ 新建计划并加入</Text>
        </View>
      </Modal>
    </PageShell>
  );
};

export default Detail;
