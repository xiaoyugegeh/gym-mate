import React, { useMemo, useRef, useState } from 'react';
import { View, Text, Input, Image, ScrollView } from '@tarojs/components';
import Taro from '@tarojs/taro';
import PageShell from '@/components/PageShell';
import Empty from '@/components/Empty';
import { DB } from '@/data/exercises';
import type { PlanItem } from '@/types';
import { thumbUrl } from '@/utils/images';
import classnames from 'classnames';
import styles from './index.module.scss';

const PickerPage: React.FC = () => {
  const [q, setQ] = useState('');
  const [sel, setSel] = useState<Map<string, PlanItem>>(new Map());
  const [, setTick] = useState(0);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const list = useMemo(() => {
    const kw = q.trim().toLowerCase();
    return DB.exercises
      .filter(e => !kw || (e.name + e.nameEn + e.muscles.join('')).toLowerCase().includes(kw))
      .slice(0, 60);
  }, [q]);

  const onSearchInput = (v: string) => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => setQ(v), 250);
  };

  const toggle = (id: string) => {
    setSel(prev => {
      const m = new Map(prev);
      if (m.has(id)) m.delete(id);
      else m.set(id, { id, sets: 4, reps: '8-12', rest: 75 });
      return m;
    });
    setTick(t => t + 1);
  };

  const done = () => {
    if (!sel.size) {
      Taro.showToast({ title: '至少选一个动作', icon: 'none' });
      return;
    }
    Taro.eventCenter.trigger('pickerDone', [...sel.values()]);
    Taro.navigateBack();
  };

  return (
    <PageShell>
      <View className={styles.searchBox}>
        <Text className={styles.searchIcon}>⌕</Text>
        <Input
          className={styles.searchInput}
          placeholder='搜索动作'
          placeholderClass={styles.placeholder}
          confirmType='search'
          onInput={e => onSearchInput(e.detail.value)}
        />
      </View>

      <ScrollView className={styles.listScroll} scrollY>
        {list.length ? (
          list.map(e => {
            const on = sel.has(e.id);
            return (
              <View key={e.id} className={classnames(styles.row, on && styles.rowOn)} onClick={() => toggle(e.id)}>
                <Image className={styles.img} src={thumbUrl(e)} mode='aspectFill' lazyLoad />
                <View className={styles.info}>
                  <Text className={styles.name}>{e.name}</Text>
                  <Text className={styles.meta}>
                    {e.part} · {e.equip}
                  </Text>
                </View>
                <View className={classnames(styles.check, on && styles.checkOn)}>
                  <Text>{on ? '✓' : ''}</Text>
                </View>
              </View>
            );
          })
        ) : (
          <Empty icon='🔍' text='没找到，换个词试试' />
        )}
        <View className={styles.listBottomSpace} />
      </ScrollView>

      <View className={styles.bottomBar}>
        <View className={styles.doneBtn} onClick={done}>
          <Text className={styles.doneTxt}>完成（已选 {sel.size} 个）</Text>
        </View>
      </View>
    </PageShell>
  );
};

export default PickerPage;
