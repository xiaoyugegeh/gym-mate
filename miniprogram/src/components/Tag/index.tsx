import React from 'react';
import { Text } from '@tarojs/components';
import styles from './index.module.scss';

interface Props {
  text: string;
  /** p=部位 g/o/r=难度 b=器械 */
  type?: 'p' | 'g' | 'o' | 'r' | 'b';
}

const Tag: React.FC<Props> = ({ text, type = 'p' }) => {
  return <Text className={`${styles.tag} ${styles[type] || styles.p}`}>{text}</Text>;
};

export default Tag;
