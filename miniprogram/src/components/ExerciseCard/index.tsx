import React, { useState } from 'react';
import { View, Text, Image } from '@tarojs/components';
import classnames from 'classnames';
import type { Exercise } from '@/types';
import { thumbUrl, LEVEL_CLASS } from '@/utils/images';
import Tag from '@/components/Tag';
import styles from './index.module.scss';

interface Props {
  exercise: Exercise;
  fav?: boolean;
  curated?: boolean;
  onClick: () => void;
  onFav?: () => void;
}

/** 动作库列表卡片 */
const ExerciseCard: React.FC<Props> = ({ exercise, fav, curated, onClick, onFav }) => {
  const [imgErr, setImgErr] = useState(false);

  return (
    <View className={styles.card} onClick={onClick}>
      {imgErr ? (
        <View className={styles.imgFallback}>
          <Text>🏋️</Text>
        </View>
      ) : (
        <Image
          className={styles.img}
          src={thumbUrl(exercise)}
          mode='aspectFill'
          lazyLoad
          onError={() => {
            console.error('[ExerciseCard] 缩略图加载失败:', exercise.id);
            setImgErr(true);
          }}
        />
      )}
      <View className={styles.info}>
        <Text className={styles.name}>{exercise.name}</Text>
        <Text className={styles.meta}>
          {exercise.muscles.join('、')} · {exercise.equip}
        </Text>
        <View className={styles.tags}>
          <Tag text={exercise.part} type='p' />
          <Tag text={exercise.level} type={(LEVEL_CLASS[exercise.level] || 'g') as 'g'} />
          {curated ? <Tag text='详解' type='g' /> : null}
        </View>
      </View>
      {onFav ? (
        <View
          className={classnames(styles.favBtn, fav && styles.favOn)}
          onClick={e => {
            e.stopPropagation();
            onFav();
          }}
        >
          <Text>{fav ? '★' : '☆'}</Text>
        </View>
      ) : null}
    </View>
  );
};

export default ExerciseCard;
