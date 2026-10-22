import type { Food } from '@/types';

/**
 * 常见食物库（每份数据，来源：中国食物成分表常见值取整）
 * kcal=热量 p=蛋白质g c=碳水g f=脂肪g
 */
export const FOODS: Food[] = [
  /* 主食碳水 */
  { id: 'f_rice', name: '米饭', emoji: '🍚', kcal: 232, p: 5, c: 52, f: 1, unit: '1碗(200g)' },
  { id: 'f_noodle', name: '面条', emoji: '🍜', kcal: 280, p: 9, c: 55, f: 2, unit: '1碗(250g)' },
  { id: 'f_bun', name: '馒头', emoji: '🍞', kcal: 223, p: 7, c: 47, f: 1, unit: '1个(100g)' },
  { id: 'f_bread', name: '全麦面包', emoji: '🍞', kcal: 156, p: 6, c: 28, f: 2, unit: '2片(60g)' },
  { id: 'f_oat', name: '燕麦片', emoji: '🥣', kcal: 150, p: 5, c: 27, f: 3, unit: '1份(40g干)' },
  { id: 'f_sweetpotato', name: '红薯', emoji: '🍠', kcal: 172, p: 3, c: 40, f: 0, unit: '1个(200g)' },
  { id: 'f_corn', name: '玉米', emoji: '🌽', kcal: 112, p: 4, c: 25, f: 1, unit: '1根' },
  { id: 'f_dumpling', name: '饺子', emoji: '🥟', kcal: 420, p: 16, c: 50, f: 16, unit: '10个' },
  { id: 'f_baozi', name: '肉包子', emoji: '🥟', kcal: 230, p: 8, c: 30, f: 8, unit: '1个' },
  { id: 'f_potato', name: '土豆泥', emoji: '🥔', kcal: 130, p: 3, c: 25, f: 2, unit: '1份(150g)' },

  /* 优质蛋白 */
  { id: 'f_chicken', name: '鸡胸肉', emoji: '🍗', kcal: 133, p: 24, c: 0, f: 3, unit: '100g' },
  { id: 'f_egg', name: '鸡蛋', emoji: '🥚', kcal: 72, p: 7, c: 1, f: 5, unit: '1个(50g)' },
  { id: 'f_beef', name: '瘦牛肉', emoji: '🥩', kcal: 143, p: 21, c: 0, f: 6, unit: '100g' },
  { id: 'f_pork', name: '猪里脊', emoji: '🥓', kcal: 155, p: 20, c: 0, f: 8, unit: '100g' },
  { id: 'f_salmon', name: '三文鱼', emoji: '🐟', kcal: 208, p: 20, c: 0, f: 13, unit: '100g' },
  { id: 'f_cod', name: '鳕鱼', emoji: '🐟', kcal: 88, p: 20, c: 0, f: 1, unit: '100g' },
  { id: 'f_shrimp', name: '虾仁', emoji: '🦐', kcal: 93, p: 21, c: 0, f: 1, unit: '100g' },
  { id: 'f_milk', name: '牛奶', emoji: '🥛', kcal: 135, p: 8, c: 13, f: 6, unit: '1盒(250ml)' },
  { id: 'f_yogurt', name: '无糖酸奶', emoji: '🍶', kcal: 120, p: 7, c: 9, f: 5, unit: '1杯(200g)' },
  { id: 'f_tofu', name: '豆腐', emoji: '🧈', kcal: 120, p: 12, c: 4, f: 6, unit: '1块(150g)' },
  { id: 'f_whey', name: '蛋白粉', emoji: '🥛', kcal: 120, p: 24, c: 3, f: 1, unit: '1勺(30g)' },
  { id: 'f_soymilk', name: '豆浆', emoji: '🥛', kcal: 80, p: 7, c: 8, f: 4, unit: '1杯(300ml)' },

  /* 蔬果 */
  { id: 'f_broccoli', name: '西兰花', emoji: '🥦', kcal: 34, p: 3, c: 7, f: 0, unit: '100g' },
  { id: 'f_banana', name: '香蕉', emoji: '🍌', kcal: 105, p: 1, c: 27, f: 0, unit: '1根' },
  { id: 'f_apple', name: '苹果', emoji: '🍎', kcal: 95, p: 0, c: 25, f: 0, unit: '1个' },
  { id: 'f_orange', name: '橙子', emoji: '🍊', kcal: 62, p: 1, c: 15, f: 0, unit: '1个' },
  { id: 'f_blueberry', name: '蓝莓', emoji: '🫐', kcal: 57, p: 1, c: 14, f: 0, unit: '100g' },
  { id: 'f_tomato', name: '番茄', emoji: '🍅', kcal: 22, p: 1, c: 5, f: 0, unit: '1个' },
  { id: 'f_cucumber', name: '黄瓜', emoji: '🥒', kcal: 16, p: 1, c: 4, f: 0, unit: '1根' },
  { id: 'f_lettuce', name: '生菜', emoji: '🥬', kcal: 15, p: 1, c: 3, f: 0, unit: '100g' },
  { id: 'f_avocado', name: '牛油果', emoji: '🥑', kcal: 240, p: 3, c: 12, f: 22, unit: '1个' },

  /* 零食饮料 */
  { id: 'f_nuts', name: '混合坚果', emoji: '🥜', kcal: 180, p: 5, c: 6, f: 16, unit: '1小袋(30g)' },
  { id: 'f_choco', name: '巧克力', emoji: '🍫', kcal: 140, p: 2, c: 15, f: 8, unit: '1块(25g)' },
  { id: 'f_cake', name: '蛋糕', emoji: '🍰', kcal: 350, p: 5, c: 45, f: 16, unit: '1块(100g)' },
  { id: 'f_chips', name: '薯片', emoji: '🥔', kcal: 350, p: 4, c: 35, f: 21, unit: '1包(70g)' },
  { id: 'f_cola', name: '可乐', emoji: '🥤', kcal: 142, p: 0, c: 35, f: 0, unit: '1瓶(330ml)' },
  { id: 'f_milktea', name: '奶茶(全糖)', emoji: '🧋', kcal: 470, p: 5, c: 70, f: 18, unit: '1杯(500ml)' },
  { id: 'f_beer', name: '啤酒', emoji: '🍺', kcal: 140, p: 1, c: 11, f: 0, unit: '1罐(330ml)' },
  { id: 'f_coffee', name: '黑咖啡', emoji: '☕', kcal: 5, p: 0, c: 1, f: 0, unit: '1杯' },
  { id: 'f_latte', name: '拿铁', emoji: '☕', kcal: 190, p: 10, c: 18, f: 8, unit: '1杯(中杯)' },
  { id: 'f_sportsdrink', name: '运动饮料', emoji: '🧴', kcal: 80, p: 0, c: 20, f: 0, unit: '1瓶(500ml)' },

  /* 快餐 */
  { id: 'f_burger', name: '汉堡', emoji: '🍔', kcal: 550, p: 25, c: 50, f: 27, unit: '1个' },
  { id: 'f_pizza', name: '披萨', emoji: '🍕', kcal: 570, p: 22, c: 65, f: 24, unit: '2块' },
  { id: 'f_friedchicken', name: '炸鸡', emoji: '🍗', kcal: 480, p: 30, c: 20, f: 30, unit: '2块' },
  { id: 'f_fries', name: '薯条', emoji: '🍟', kcal: 340, p: 4, c: 44, f: 17, unit: '1份(中)' },
  { id: 'f_hotpot', name: '火锅(清水涮)', emoji: '🍲', kcal: 500, p: 35, c: 20, f: 28, unit: '1顿(估算)' },
];
