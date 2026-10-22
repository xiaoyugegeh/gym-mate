import React, { useEffect, useMemo, useRef, useState } from 'react';
import { View, Text, Input, ScrollView, Picker } from '@tarojs/components';
import Taro, { useDidShow, useReachBottom } from '@tarojs/taro';
import { DB } from '@/data/exercises';
import PageShell from '@/components/PageShell';
import ExerciseCard from '@/components/ExerciseCard';
import Empty from '@/components/Empty';
import { isFav, takePendingPart, toggleFav } from '@/utils/storage';
import { hasCurated } from '@/utils/fitness';
import styles from './index.module.scss';

const PER_PAGE = 30;
const LEVELS = ['初级', '中级', '高级'];

const Library: React.FC = () => {
  const [q, setQ] = useState('');
  const [part, setPart] = useState('');
  const [equip, setEquip] = useState('');
  const [level, setLevel] = useState('');
  const [page, setPage] = useState(1);
  /** 收藏切换后强制刷新列表 */
  const [favTick, setFavTick] = useState(0);
  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useDidShow(() => {
    const p = takePendingPart();
    if (p) {
      setPart(p);
      setPage(1);
    }
  });

  useEffect(() => {
    setPage(1);
  }, [q, part, equip, level]);

  const all = useMemo(() => {
    const kw = q.trim().toLowerCase();
    return DB.exercises.filter(
      e =>
        (!part || e.part === part || e.parts.includes(part)) &&
        (!equip || e.equip === equip) &&
        (!level || e.level === level) &&
        (!kw || (e.name + ' ' + e.nameEn + ' ' + e.muscles.join(' ') + ' ' + e.equip + ' ' + e.parts.join(' ')).toLowerCase().includes(kw)),
    );
  }, [q, part, equip, level]);

  const showList = useMemo(() => all.slice(0, page * PER_PAGE), [all, page]);
  const hasMore = all.length > showList.length;

  useReachBottom(() => {
    if (hasMore) setPage(p => p + 1);
  });

  const onSearchInput = (v: string) => {
    if (searchTimer.current) clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(() => setQ(v), 250);
  };

  const handleFav = (id: string) => {
    const on = toggleFav(id);
    setFavTick(t => t + 1);
    Taro.showToast({ title: on ? '已收藏' : '已取消收藏', icon: 'none', duration: 1200 });
  };

  const goDetail = (id: string) => {
    Taro.navigateTo({ url: '/pkg/pages/detail/index?id=' + id });
  };

  return (
    <PageShell>
      {/* 搜索框 */}
      <View className={styles.searchBox}>
        <Text className={styles.searchIcon}>⌕</Text>
        <Input
          className={styles.searchInput}
          placeholder='搜动作 / 肌肉 / 器械，如：卧推'
          placeholderClass={styles.placeholder}
          confirmType='search'
          onInput={e => onSearchInput(e.detail.value)}
        />
      </View>

      {/* 部位筛选 */}
      <ScrollView className={styles.chipsScroll} scrollX enhanced showScrollbar={false}>
        <View className={styles.chipsInner}>
          <View className={`${styles.chip} ${!part ? styles.chipOn : ''}`} onClick={() => setPart('')}>
            <Text>全部</Text>
          </View>
          {DB.partsList.map(p => (
            <View key={p} className={`${styles.chip} ${part === p ? styles.chipOn : ''}`} onClick={() => setPart(p)}>
              <Text>{p}</Text>
            </View>
          ))}
        </View>
      </ScrollView>

      {/* 器械 / 难度筛选 */}
      <View className={styles.filterRow}>
        <Picker
          mode='selector'
          range={['全部器械', ...DB.equipList]}
          onChange={e => setEquip(Number(e.detail.value) === 0 ? '' : DB.equipList[Number(e.detail.value) - 1])}
        >
          <View className={styles.pickerBtn}>
            <Text className={equip ? styles.pickerOn : styles.pickerTxt}>{equip || '全部器械'}</Text>
            <Text className={styles.pickerArr}>▾</Text>
          </View>
        </Picker>
        <Picker
          mode='selector'
          range={['全部难度', ...LEVELS]}
          onChange={e => setLevel(Number(e.detail.value) === 0 ? '' : LEVELS[Number(e.detail.value) - 1])}
        >
          <View className={styles.pickerBtn}>
            <Text className={level ? styles.pickerOn : styles.pickerTxt}>{level || '全部难度'}</Text>
            <Text className={styles.pickerArr}>▾</Text>
          </View>
        </Picker>
        <Text className={styles.count}>共 {all.length} 个</Text>
      </View>

      {/* 动作列表 */}
      {showList.length ? (
        <View className={styles.list}>
          {showList.map(e => (
            <ExerciseCard
              key={e.id + '-' + favTick}
              exercise={e}
              fav={isFav(e.id)}
              curated={hasCurated(e)}
              onClick={() => goDetail(e.id)}
              onFav={() => handleFav(e.id)}
            />
          ))}
          <Text className={styles.moreTip}>{hasMore ? '上拉加载更多…' : '没有更多了'}</Text>
        </View>
      ) : (
        <Empty icon='🔍' text='没找到，换个词试试' />
      )}
    </PageShell>
  );
};

export default Library;
