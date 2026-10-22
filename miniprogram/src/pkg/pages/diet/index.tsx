import React, { useCallback, useMemo, useState } from 'react';
import { View, Text, Input } from '@tarojs/components';
import Taro, { useDidShow } from '@tarojs/taro';
import PageShell from '@/components/PageShell';
import Modal from '@/components/Modal';
import Empty from '@/components/Empty';
import type { DietEntry, Food, MealType } from '@/types';
import { useSettings } from '@/store/app';
import { FOODS } from '@/data/foods';
import { getDietByDate, addDietEntry, removeDietEntry, getCustomFoods, addCustomFood, latestWeight } from '@/utils/storage';
import { calcTdee } from '@/utils/calc';
import { todayStr, uid } from '@/utils/format';
import styles from './index.module.scss';

const MEALS: MealType[] = ['早餐', '午餐', '晚餐', '加餐'];
const MEAL_ICON: Record<MealType, string> = { 早餐: '🌅', 午餐: '☀️', 晚餐: '🌙', 加餐: '🍎' };

/** 按当前时间猜该吃哪餐 */
function guessMeal(): MealType {
  const h = new Date().getHours();
  if (h < 10) return '早餐';
  if (h < 14) return '午餐';
  if (h < 21) return '晚餐';
  return '加餐';
}

function shiftDate(ds: string, delta: number): string {
  const d = new Date(ds + 'T00:00:00');
  d.setDate(d.getDate() + delta);
  return todayStr(d);
}

const Diet: React.FC = () => {
  const { settings } = useSettings();
  const [ds, setDs] = useState(todayStr());
  const [entries, setEntries] = useState<DietEntry[]>([]);
  const [addOpen, setAddOpen] = useState(false);
  const [meal, setMeal] = useState<MealType>(guessMeal());
  const [query, setQuery] = useState('');
  /* 自定义食物 */
  const [cName, setCName] = useState('');
  const [cKcal, setCKcal] = useState('');
  const [cP, setCP] = useState('');
  const [cC, setCC] = useState('');
  const [cF, setCF] = useState('');

  const reload = useCallback((dateStr: string) => {
    setEntries(getDietByDate(dateStr));
  }, []);

  useDidShow(() => reload(ds));

  const isToday = ds === todayStr();
  const dateLabel = useMemo(() => {
    if (isToday) return '今天';
    const yest = shiftDate(todayStr(), -1);
    if (ds === yest) return '昨天';
    const d = new Date(ds + 'T00:00:00');
    return `${d.getMonth() + 1}月${d.getDate()}日`;
  }, [ds, isToday]);

  /* 汇总 */
  const sum = useMemo(
    () =>
      entries.reduce(
        (acc, e) => ({ kcal: acc.kcal + e.kcal, p: acc.p + e.p, c: acc.c + e.c, f: acc.f + e.f }),
        { kcal: 0, p: 0, c: 0, f: 0 },
      ),
    [entries],
  );

  /* 目标：TDEE + 体重推导的宏量参考 */
  const weight = latestWeight();
  const tdee = weight ? calcTdee(settings.sex, weight, settings.height, settings.age) : 0;
  const targets = { kcal: tdee, p: weight ? Math.round(weight * 1.5) : 0, c: weight ? Math.round(weight * 4) : 0, f: weight ? Math.round(weight * 1) : 0 };

  const pct = targets.kcal ? Math.round((sum.kcal / targets.kcal) * 100) : 0;
  const fillCls = pct > 110 ? styles.fillOver : pct > 90 ? styles.fillWarn : styles.fill;

  /* 食物列表（内置 + 自定义，按搜索过滤） */
  const foods = useMemo(() => {
    const all = [...getCustomFoods(), ...FOODS];
    const q = query.trim().toLowerCase();
    const filtered = q ? all.filter(f => f.name.toLowerCase().includes(q)) : all;
    return filtered.slice(0, 14);
  }, [query, addOpen]);

  const openAdd = () => {
    setMeal(guessMeal());
    setQuery('');
    setAddOpen(true);
  };

  const addFood = (f: Food) => {
    const entry: DietEntry = { id: uid(), t: Date.now(), meal, name: `${f.name} ${f.unit}`, kcal: f.kcal, p: f.p, c: f.c, f: f.f };
    addDietEntry(ds, entry);
    reload(ds);
    Taro.showToast({ title: `已记入${meal}`, icon: 'none', duration: 900 });
  };

  const saveCustom = () => {
    const name = cName.trim();
    const kcal = Math.round(Number(cKcal));
    if (!name || !kcal || kcal <= 0) {
      Taro.showToast({ title: '至少填名字和热量', icon: 'none' });
      return;
    }
    const food: Food = {
      id: 'c_' + uid(),
      name,
      emoji: '🍽️',
      kcal,
      p: Math.max(0, Number(cP) || 0),
      c: Math.max(0, Number(cC) || 0),
      f: Math.max(0, Number(cF) || 0),
      unit: '1份',
    };
    addCustomFood(food);
    setCName('');
    setCKcal('');
    setCP('');
    setCC('');
    setCF('');
    setQuery(name);
    Taro.showToast({ title: '已保存自定义食物', icon: 'none' });
  };

  const goBody = () => Taro.navigateTo({ url: '/pkg/pages/body/index' });

  return (
    <PageShell>
      {/* 日期切换 */}
      <View className={styles.dateRow}>
        <View className={styles.dateBtn} onClick={() => { const d = shiftDate(ds, -1); setDs(d); reload(d); }}>
          <Text>‹</Text>
        </View>
        <Text className={styles.dateTxt}>{dateLabel}</Text>
        <View
          className={`${styles.dateBtn} ${isToday ? styles.dateBtnDisabled : ''}`}
          onClick={() => {
            if (isToday) return;
            const d = shiftDate(ds, 1);
            setDs(d);
            reload(d);
          }}
        >
          <Text>›</Text>
        </View>
      </View>

      {/* 热量预算 */}
      <View className='g-card'>
        <Text className={styles.cardTitle}>🔥 今日热量</Text>
        {targets.kcal ? (
          <>
            <View className={styles.kcalRow}>
              <Text className={styles.kcalNum}>{Math.round(sum.kcal)}</Text>
              <Text className={styles.kcalUnit}>kcal</Text>
              <Text className={styles.kcalTarget}>/ 目标 {targets.kcal} kcal</Text>
            </View>
            <View className={styles.track}>
              <View className={`${styles.fill} ${fillCls}`} style={`width:${Math.min(100, pct)}%`} />
            </View>
            <Text className={styles.cardSub}>
              已吃 {pct}% 的每日消耗{pct > 110 ? '，超了不少，晚上收着点' : pct > 90 ? '，刚好在区间内' : '，还有余量'}
            </Text>
            <View className={styles.macroRow}>
              {([
                ['蛋白质', sum.p, targets.p, styles.macroFillP],
                ['碳水', sum.c, targets.c, styles.macroFillC],
                ['脂肪', sum.f, targets.f, styles.macroFillF],
              ] as [string, number, number, string][]).map(([label, v, target, cls]) => (
                <View className={styles.macro} key={label}>
                  <View className={styles.macroHead}>
                    <Text>{label}</Text>
                    <Text>
                      {Math.round(v)}/{target}g
                    </Text>
                  </View>
                  <View className={styles.macroTrack}>
                    <View className={cls} style={`width:${target ? Math.min(100, Math.round((v / target) * 100)) : 0}%`} />
                  </View>
                </View>
              ))}
            </View>
          </>
        ) : (
          <>
            <View className={styles.kcalRow}>
              <Text className={styles.kcalNum}>{Math.round(sum.kcal)}</Text>
              <Text className={styles.kcalUnit}>kcal 已记录</Text>
            </View>
            <Text className={styles.cardSub}>
              还没有体重数据，算不出热量目标。先去「身体数据」记录体重和身高，就能按你的代谢安排三餐。
            </Text>
            <View className={styles.addBtn} onClick={goBody}>
              <Text className={styles.addBtnTxt}>⚖️ 去记录体重</Text>
            </View>
          </>
        )}
      </View>

      {/* 四餐 */}
      {MEALS.map(m => {
        const list = entries.filter(e => e.meal === m);
        const kcal = list.reduce((s, e) => s + e.kcal, 0);
        return (
          <View className='g-card' key={m}>
            <View className={styles.mealHead}>
              <Text className={styles.mealTitle}>
                {MEAL_ICON[m]} {m}
              </Text>
              <Text className={styles.mealKcal}>{kcal ? `${Math.round(kcal)} kcal` : ''}</Text>
            </View>
            {list.length ? (
              list.map(e => (
                <View className={styles.entryRow} key={e.id}>
                  <Text className={styles.entryName}>{e.name}</Text>
                  <Text className={styles.entryKcal}>{Math.round(e.kcal)} kcal</Text>
                  <View className={styles.delBtn} onClick={() => { removeDietEntry(ds, e.id); reload(ds); }}>
                    <Text>✕</Text>
                  </View>
                </View>
              ))
            ) : (
              <Text className={styles.emptyMeal}>这餐还没记录</Text>
            )}
          </View>
        );
      })}

      {/* 添加入口 */}
      <View className={styles.addBtn} onClick={openAdd}>
        <Text className={styles.addBtnTxt}>＋ 记一笔吃的</Text>
      </View>

      {isToday && entries.length === 0 ? (
        <Empty icon='🍽️' text='记录饮食才能管住热量，点上面开始' />
      ) : null}

      {/* 添加食物弹层 */}
      <Modal visible={addOpen} title={`添加到「${meal}」`} onClose={() => setAddOpen(false)}>
        <View className={styles.mealChips}>
          {MEALS.map(m => (
            <View key={m} className={`${styles.mealChip} ${meal === m ? styles.mealChipOn : ''}`} onClick={() => setMeal(m)}>
              <Text>
                {MEAL_ICON[m]} {m}
              </Text>
            </View>
          ))}
        </View>
        <Input className={styles.searchInput} placeholder='搜索食物，如：鸡胸' value={query} onInput={e => setQuery(e.detail.value)} />
        <View className={styles.foodList}>
          {foods.length ? (
            foods.map(f => (
              <View className={styles.foodRow} key={f.id} onClick={() => addFood(f)}>
                <Text className={styles.foodEmoji}>{f.emoji}</Text>
                <View className={styles.foodMid}>
                  <Text className={styles.foodName}>{f.name}</Text>
                  <Text className={styles.foodUnit}>
                    {f.unit} · 蛋白{f.p}g 碳水{f.c}g 脂肪{f.f}g
                  </Text>
                </View>
                <Text className={styles.foodKcal}>{f.kcal} kcal</Text>
                <View className={styles.foodKcalAdd}>
                  <Text>＋</Text>
                </View>
              </View>
            ))
          ) : (
            <Text className={styles.modalEmpty}>没找到「{query}」，在下面自己建一个</Text>
          )}
        </View>
        <Text className={styles.modalSec}>没有找到？自定义食物（填一份的量）</Text>
        <View className={styles.grid2}>
          <View className={styles.grid2Col}>
            <Text className={styles.gLabel}>名称</Text>
            <Input className={styles.gInput} value={cName} placeholder='如：妈妈牌红烧肉' onInput={e => setCName(e.detail.value)} />
          </View>
          <View className={styles.grid2Col}>
            <Text className={styles.gLabel}>热量 kcal</Text>
            <Input className={styles.gInput} type='number' value={cKcal} placeholder='必填' onInput={e => setCKcal(e.detail.value)} />
          </View>
        </View>
        <View className={styles.grid2}>
          <View className={styles.grid2Col}>
            <Text className={styles.gLabel}>蛋白质 g</Text>
            <Input className={styles.gInput} type='digit' value={cP} onInput={e => setCP(e.detail.value)} />
          </View>
          <View className={styles.grid2Col}>
            <Text className={styles.gLabel}>碳水 g</Text>
            <Input className={styles.gInput} type='digit' value={cC} onInput={e => setCC(e.detail.value)} />
          </View>
          <View className={styles.grid2Col}>
            <Text className={styles.gLabel}>脂肪 g</Text>
            <Input className={styles.gInput} type='digit' value={cF} onInput={e => setCF(e.detail.value)} />
          </View>
        </View>
        <View className={styles.modalBtn} onClick={saveCustom}>
          <Text className={styles.modalBtnTxt}>保存自定义食物</Text>
        </View>
      </Modal>
    </PageShell>
  );
};

export default Diet;
