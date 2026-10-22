import React from 'react';
import { View, Text } from '@tarojs/components';
import styles from './index.module.scss';

interface Props {
  visible: boolean;
  title: string;
  onClose: () => void;
  children: React.ReactNode;
}

/** 底部弹层（加入计划/新建/编辑/指南通用） */
const Modal: React.FC<Props> = ({ visible, title, onClose, children }) => {
  if (!visible) return null;
  return (
    <View className={styles.mask} onClick={onClose}>
      <View className={styles.sheet} onClick={e => e.stopPropagation()}>
        <View className={styles.head}>
          <Text className={styles.title}>{title}</Text>
          <View className={styles.close} onClick={onClose}>
            <Text>✕</Text>
          </View>
        </View>
        {children}
      </View>
    </View>
  );
};

export default Modal;
