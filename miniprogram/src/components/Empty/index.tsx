import React from 'react';
import { View, Text } from '@tarojs/components';
import styles from './index.module.scss';

interface Props {
  icon?: string;
  text: string;
}

const Empty: React.FC<Props> = ({ icon = '🏋️', text }) => {
  return (
    <View className={styles.empty}>
      <Text className={styles.big}>{icon}</Text>
      <Text className={styles.txt}>{text}</Text>
    </View>
  );
};

export default Empty;
