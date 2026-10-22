import React, { useState } from 'react';
import { View, Text, Input } from '@tarojs/components';
import Taro, { useDidShow } from '@tarojs/taro';
import PageShell from '@/components/PageShell';
import Empty from '@/components/Empty';
import Modal from '@/components/Modal';
import { TEMPLATES, resolveTemplate } from '@/data/templates';
import type { Plan } from '@/types';
import { EX } from '@/utils/fitness';
import { getPlans, savePlans } from '@/utils/storage';
import { startWorkout } from '@/utils/session';
import { uid } from '@/utils/format';
import styles from './index.module.scss';

const Plans: React.FC = () => {
  const [plans, setPlans] = useState<Plan[]>([]);
  const [createModal, setCreateModal] = useState(false);
  const [newName, setNewName] = useState('');
  const [version, setVersion] = useState(0);

  useDidShow(() => {
    setPlans(getPlans());
  });

  const refresh = () => {
    setPlans(getPlans());
    setVersion(v => v + 1);
  };

  const createPlan = () => {
    const name = newName.trim();
    if (!name) {
      Taro.showToast({ title: '先起个名字', icon: 'none' });
      return;
    }
    const list = getPlans();
    const p: Plan = { id: uid(), name, emoji: '📋', items: [] };
    list.unshift(p);
    savePlans(list);
    setNewName('');
    setCreateModal(false);
    Taro.navigateTo({ url: '/pkg/pages/plan-detail/index?id=' + p.id });
  };

  const useTemplate = (idx: number) => {
    const t = TEMPLATES[idx];
    const items = resolveTemplate(t);
    if (!items.length) {
      Taro.showToast({ title: '模板动作在素材里没找到', icon: 'none' });
      return;
    }
    const list = getPlans();
    if (list.some(p => p.name === t.name)) {
      Taro.showToast({ title: '已存在同名计划', icon: 'none' });
      return;
    }
    list.unshift({ id: uid(), name: t.name, emoji: t.emoji, desc: t.desc, items });
    savePlans(list);
    refresh();
    Taro.showToast({ title: '已添加到我的计划', icon: 'none' });
  };

  const partsOf = (p: Plan) =>
    [...new Set(p.items.map(i => EX(i.id)?.part).filter(Boolean))].join('/');

  return (
    <PageShell>
      <View className={styles.newBtn} onClick={() => setCreateModal(true)}>
        <Text className={styles.newBtnTxt}>＋ 新建计划</Text>
      </View>

      <Text className='g-sec-title'>我的计划（{plans.length}）</Text>
      {plans.length ? (
        plans.map(p => {
          const est = p.items.reduce((s, i) => s + i.sets * 45 + i.rest, 0);
          return (
            <View key={p.id + '-' + version} className='g-card'>
              <View className={styles.planHead}>
                <Text className={styles.planIcon}>{p.emoji || '📋'}</Text>
                <View className={styles.planInfo}>
                  <Text className={styles.planName}>{p.name}</Text>
                  <Text className={styles.planMeta}>
                    {p.items.length} 个动作 · 约 {Math.round(est / 60)} 分钟 · {partsOf(p) || '—'}
                  </Text>
                </View>
              </View>
              <View className={styles.planBtns}>
                <View className={styles.ghostBtn} onClick={() => Taro.navigateTo({ url: '/pkg/pages/plan-detail/index?id=' + p.id })}>
                  <Text className={styles.ghostTxt}>查看</Text>
                </View>
                {p.items.length ? (
                  <View className={styles.goBtn} onClick={() => startWorkout(p.name, p.items)}>
                    <Text className={styles.goTxt}>▶ 开始训练</Text>
                  </View>
                ) : null}
              </View>
            </View>
          );
        })
      ) : (
        <Empty icon='📋' text='还没有自己的计划，从下面模板挑一个吧' />
      )}

      <Text className='g-sec-title'>官方模板（一键添加）</Text>
      {TEMPLATES.map((t, i) => {
        const items = resolveTemplate(t);
        const parts = [...new Set(items.map(it => EX(it.id)?.part).filter(Boolean))].join('/');
        return (
          <View key={t.name} className='g-card'>
            <View className={styles.planHead}>
              <Text className={styles.planIcon}>{t.emoji}</Text>
              <View className={styles.planInfo}>
                <Text className={styles.planName}>{t.name}</Text>
                <Text className={styles.planMeta}>{t.desc}</Text>
              </View>
            </View>
            <Text className={styles.templateMeta}>
              {items.length} 个动作 · 覆盖 {parts || '—'}
              {items.length ? '' : '（素材缺失）'}
            </Text>
            {items.length ? (
              <View className={styles.goBtn} onClick={() => useTemplate(i)}>
                <Text className={styles.goTxt}>使用此模板</Text>
              </View>
            ) : null}
          </View>
        );
      })}

      <Modal visible={createModal} title='新建计划' onClose={() => setCreateModal(false)}>
        <Input className={styles.nameInput} placeholder='如：我的增肌计划' value={newName} onInput={e => setNewName(e.detail.value)} />
        <View className={styles.goBtn} style='margin-top:20rpx' onClick={createPlan}>
          <Text className={styles.goTxt}>创建计划</Text>
        </View>
      </Modal>
    </PageShell>
  );
};

export default Plans;
