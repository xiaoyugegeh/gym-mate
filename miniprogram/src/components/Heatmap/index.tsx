import React, { useMemo } from 'react';
import { View } from '@tarojs/components';
import type { HistoryRecord } from '@/types';
import { todayStr } from '@/utils/format';
import styles from './index.module.scss';

interface Props {
  history: HistoryRecord[];
}

/** 近 12 周打卡日历热力图 */
const Heatmap: React.FC<Props> = ({ history }) => {
  const weeks = useMemo(() => {
    const map: Record<string, number> = {};
    history.forEach(h => {
      const k = todayStr(h.t);
      map[k] = (map[k] || 0) + (h.durSec || 600);
    });
    const end = new Date();
    end.setHours(0, 0, 0, 0);
    const start = new Date(end);
    start.setDate(end.getDate() - 83);
    start.setDate(start.getDate() - ((start.getDay() + 6) % 7));
    const cols: { key: string; lv: number }[][] = [];
    let cur: { key: string; lv: number }[] = [];
    const d = new Date(start);
    while (d <= end) {
      const k = todayStr(d);
      const v = map[k] || 0;
      const lv = v === 0 ? 0 : v < 1800 ? 1 : v < 3600 ? 2 : v < 5400 ? 3 : 4;
      cur.push({ key: k, lv });
      if (cur.length === 7) {
        cols.push(cur);
        cur = [];
      }
      d.setDate(d.getDate() + 1);
    }
    if (cur.length) cols.push(cur);
    return cols;
  }, [history]);

  return (
    <View className={styles.heat}>
      {weeks.map((col, i) => (
        <View className={styles.col} key={i}>
          {col.map(cell => (
            <View key={cell.key} className={`${styles.cell} ${cell.lv ? styles['l' + cell.lv] : ''}`} />
          ))}
        </View>
      ))}
    </View>
  );
};

export default Heatmap;
