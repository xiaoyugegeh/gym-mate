import React, { useCallback, useEffect, useState } from 'react';
import { View, Text, Image, Input } from '@tarojs/components';
import Taro, { useDidShow, useUnload } from '@tarojs/taro';
import PageShell from '@/components/PageShell';
import Empty from '@/components/Empty';
import Modal from '@/components/Modal';
import type { Plan, PlanItem } from '@/types';
import { EX } from '@/utils/fitness';
import { gifUrl } from '@/utils/images';
import { getPlans, savePlans } from '@/utils/storage';
import { startWorkout } from '@/utils/session';
import { WEEKCN } from '@/utils/format';
import styles from './index.module.scss';

const PlanDetail: React.FC = () => {
  const id = Taro.getCurrentInstance().router?.params?.id || '';
  const [plan, setPlan] = useState<Plan | null>(null);
  const [version, setVersion] = useState(0);
  const [editModal, setEditModal] = useState(false);
  const [editIdx, setEditIdx] = useState(0);
  const [editSets, setEditSets] = useState('4');
  const [editReps, setEditReps] = useState('8-12');
  const [editRest, setEditRest] = useState('75');
  const [renameModal, setRenameModal] = useState(false);
  const [renameVal, setRenameVal] = useState('');

  const reload = useCallback(() => {
    const p = getPlans().find(x => x.id === id);
    setPlan(p ? { ...p } : null);
    setVersion(v => v + 1);
  }, [id]);

  useDidShow(() => reload());

  // 监听动作选择器返回
  useEffect(() => {
    const handler = (items: PlanItem[]) => {
      const plans = getPlans();
      const p = plans.find(x => x.id === id);
      if (p) {
        p.items.push(...items);
        savePlans(plans);
        reload();
      }
    };
    Taro.eventCenter.on('pickerDone', handler);
    return () => {
      Taro.eventCenter.off('pickerDone', handler);
    };
  }, [id, reload]);

  useUnload(() => {
    Taro.eventCenter.off('pickerDone');
  });

  if (!plan) {
    return (
      <PageShell>
        <Empty icon='🤔' text='计划不存在' />
      </PageShell>
    );
  }

  const est = plan.items.reduce((s, i) => s + i.sets * 45 + i.rest, 0);

  const mutate = (fn: (p: Plan) => void) => {
    const plans = getPlans();
    const p = plans.find(x => x.id === id);
    if (!p) return;
    fn(p);
    savePlans(plans);
    reload();
  };

  const removePlan = () => {
    Taro.showModal({
      title: '删除计划',
      content: '确定删除计划「' + plan.name + '」？',
      confirmColor: '#F53F3F',
      success: r => {
        if (r.confirm) {
          savePlans(getPlans().filter(x => x.id !== id));
          Taro.navigateBack();
        }
      },
    });
  };

  const openEdit = (idx: number) => {
    const it = plan.items[idx];
    if (!it) return;
    setEditIdx(idx);
    setEditSets(String(it.sets));
    setEditReps(it.reps);
    setEditRest(String(it.rest));
    setEditModal(true);
  };

  const saveEdit = () => {
    mutate(p => {
      const it = p.items[editIdx];
      if (it) {
        it.sets = Math.max(1, Number(editSets) || 1);
        it.reps = editReps.trim() || '10';
        it.rest = Math.max(0, Number(editRest) || 0);
      }
    });
    setEditModal(false);
  };

  const saveRename = () => {
    const n = renameVal.trim();
    if (!n) {
      Taro.showToast({ title: '名称不能为空', icon: 'none' });
      return;
    }
    mutate(p => {
      p.name = n;
    });
    setRenameModal(false);
  };

  return (
    <PageShell>
      <View className='g-card'>
        <Text className={styles.desc}>
          {plan.desc || '我的自定义计划'} · {plan.items.length} 个动作 · 约 {Math.round(est / 60)} 分钟
        </Text>
      </View>

      <View className='g-card'>
        {plan.items.length ? (
          plan.items.map((i, idx) => {
            const e = EX(i.id);
            if (!e) return null;
            return (
              <View key={i.id + '-' + idx + '-' + version} className={styles.item}>
                <Image className={styles.itemImg} src={gifUrl(e)} mode='aspectFill' lazyLoad />
                <View className={styles.itemInfo}>
                  <Text className={styles.itemName}>
                    {idx + 1}. {e.name}
                  </Text>
                  <Text className={styles.itemMeta}>
                    {i.sets} 组 × {i.reps} · 休 {i.rest}s
                  </Text>
                </View>
                <View
                  className={styles.opBtn}
                  onClick={() =>
                    mutate(p => {
                      if (idx > 0) {
                        const t = p.items[idx - 1];
                        p.items[idx - 1] = p.items[idx];
                        p.items[idx] = t;
                      }
                    })
                  }
                >
                  <Text>▲</Text>
                </View>
                <View className={styles.opBtn} onClick={() => openEdit(idx)}>
                  <Text>✎</Text>
                </View>
                <View
                  className={styles.opBtn}
                  onClick={() =>
                    mutate(p => {
                      p.items.splice(idx, 1);
                    })
                  }
                >
                  <Text>✕</Text>
                </View>
              </View>
            );
          })
        ) : (
          <Empty icon='📋' text='还没有动作，去添加' />
        )}
        <View className={styles.addBtn} onClick={() => Taro.navigateTo({ url: '/pkg/pages/picker/index' })}>
          <Text className={styles.addTxt}>＋ 添加动作</Text>
        </View>
      </View>

      {plan.items.length ? (
        <View className={styles.startBtn} onClick={() => startWorkout(plan.name, plan.items)}>
          <Text className={styles.startTxt}>▶ 开始训练</Text>
        </View>
      ) : null}

      {/* 每周排期 */}
      <View className='g-card'>
        <Text className={styles.cardTitle || styles.secTitle}>📅 每周固定排期</Text>
        <Text className={styles.schedHint}>勾选周几练这个计划，到那天首页会提醒你</Text>
        <View className={styles.weekRow}>
          {WEEKCN.map((label, idx) => {
            const dayNum = (idx + 1) % 7;
            const on = (plan.days || []).includes(dayNum);
            return (
              <View
                key={label}
                className={`${styles.weekCell} ${on ? styles.weekOn : ''}`}
                onClick={() =>
                  mutate(p => {
                    const days = new Set(p.days || []);
                    if (days.has(dayNum)) days.delete(dayNum);
                    else days.add(dayNum);
                    p.days = [...days].sort();
                  })
                }
              >
                <Text>{label.replace('周', '')}</Text>
              </View>
            );
          })}
        </View>
      </View>

      <View className={styles.subBtn} onClick={() => { setRenameVal(plan.name); setRenameModal(true); }}>
        <Text className={styles.subTxt}>✎ 修改计划名称</Text>
      </View>
      <View className={styles.subBtnDanger} onClick={removePlan}>
        <Text className={styles.subTxtDanger}>🗑 删除计划</Text>
      </View>

      {/* 编辑组次弹层 */}
      <Modal visible={editModal} title='编辑组次' onClose={() => setEditModal(false)}>
        <View className={styles.formRow3}>
          <View className={styles.formCol}>
            <Text className={styles.formLabel}>组数</Text>
            <Input className={styles.formInput} type='number' value={editSets} onInput={e => setEditSets(e.detail.value)} />
          </View>
          <View className={styles.formCol}>
            <Text className={styles.formLabel}>次数</Text>
            <Input className={styles.formInput} value={editReps} onInput={e => setEditReps(e.detail.value)} />
          </View>
          <View className={styles.formCol}>
            <Text className={styles.formLabel}>休息(秒)</Text>
            <Input className={styles.formInput} type='number' value={editRest} onInput={e => setEditRest(e.detail.value)} />
          </View>
        </View>
        <View className={styles.modalBtn} onClick={saveEdit}>
          <Text className={styles.modalBtnTxt}>保存</Text>
        </View>
      </Modal>

      {/* 重命名弹层 */}
      <Modal visible={renameModal} title='修改计划名称' onClose={() => setRenameModal(false)}>
        <Input className={styles.nameInput} value={renameVal} onInput={e => setRenameVal(e.detail.value)} />
        <View className={styles.modalBtn} onClick={saveRename}>
          <Text className={styles.modalBtnTxt}>保存</Text>
        </View>
      </Modal>
    </PageShell>
  );
};

export default PlanDetail;
