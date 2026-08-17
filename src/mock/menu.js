/**
 * 预制家常菜库
 * -----------------------------------------------------------------------------
 * 6 大分类：早餐 / 午餐 / 晚餐 / 夜宵 / 甜品 / 零食
 *
 * 每道菜的字段说明：
 * - id          唯一 id
 * - name        菜名
 * - desc        软糯文案描述
 * - price       参考价格（女友端不展示，仅男友端数据面板统计用）
 * - categoryId  分类 id（对应 categories）
 * - tags        小标签
 * - spicy       辣度 0/1/2/3
 * - sales       被点次数（女友端「她最常点的」榜单用）
 * - emoji       可爱美食 emoji 图标（手绘风可爱展示，无网络依赖）
 * - bgColor     卡片背景渐变色（奶粉/米白/淡芋紫系列）
 * - recommend   是否推荐（首页「猜你会喜欢」用）
 * - allergens   含过敏原（海鲜/花生/蛋/奶/芒果/小麦/坚果/大豆）
 * - dietTags    饮食标签（清淡/素食/甜/酸/辣 ...）女友忌口命中时高亮
 *
 * 图片方案：使用 emoji 美食图标 + 柔和渐变背景，符合「可爱手绘」风格，不依赖远程图片。
 */

export const categories = [
  { id: 'breakfast', name: '早餐', icon: '🍳', sort: 1, desc: '元气满满开启一天' },
  { id: 'lunch', name: '午餐', icon: '🍱', sort: 2, desc: '正正经经吃顿好的' },
  { id: 'dinner', name: '晚餐', icon: '🍲', sort: 3, desc: '慢慢吃，不着急' },
  { id: 'lateNight', name: '夜宵', icon: '🍜', sort: 4, desc: '饿了就吃点暖的' },
  { id: 'dessert', name: '甜品', icon: '🍰', sort: 5, desc: '生活需要点甜' },
  { id: 'snack', name: '零食', icon: '🍿', sort: 6, desc: '解馋小可爱' }
];

// 背景色（奶粉粉 / 米白 / 淡芋紫柔和渐变）
const bgPink = 'linear-gradient(135deg, #FFE8EE, #F5B6C1)';
const bgCream = 'linear-gradient(135deg, #FFF8F2, #F5E6D3)';
const bgTaro = 'linear-gradient(135deg, #EDE4F3, #C8B6D9)';
const bgMint = 'linear-gradient(135deg, #E8F5E9, #C8E6C9)';
const bgPeach = 'linear-gradient(135deg, #FFE5D9, #FFCDB2)';
const bgLemon = 'linear-gradient(135deg, #FFF9C4, #FFF176)';

export const dishes = [
  // ===================== 早餐 breakfast 🍳 =====================
  {
    id: 'b001',
    name: '豆浆油条',
    desc: '热腾腾豆浆配现炸油条，经典中式暖晨',
    price: 8,
    categoryId: 'breakfast',
    tags: [],
    spicy: 0,
    sales: 0,
    emoji: '🥛🥖',
    bgColor: bgCream,
    recommend: true,
    allergens: ['小麦', '大豆'],
    dietTags: [],
    dislikeTags: []
  },
  {
    id: 'b002',
    name: '皮蛋瘦肉粥',
    desc: '慢熬白粥配皮蛋瘦肉，暖胃好消化',
    price: 12,
    categoryId: 'breakfast',
    tags: [],
    spicy: 0,
    sales: 0,
    emoji: '🍚',
    bgColor: bgCream,
    recommend: true,
    allergens: ['蛋'],
    dietTags: [],
    dislikeTags: []
  },
  {
    id: 'b003',
    name: '鸡蛋灌饼',
    desc: '现烤酥脆饼皮裹嫩滑鸡蛋，一口满足',
    price: 10,
    categoryId: 'breakfast',
    tags: [],
    spicy: 0,
    sales: 0,
    emoji: '🥞',
    bgColor: bgPeach,
    allergens: ['蛋', '小麦'],
    dietTags: [],
    dislikeTags: []
  },
  {
    id: 'b004',
    name: '小笼包',
    desc: '薄皮多汁肉馅，咬一口汤汁四溢',
    price: 15,
    categoryId: 'breakfast',
    tags: [],
    spicy: 0,
    sales: 0,
    emoji: '🥟',
    bgColor: bgCream,
    allergens: ['小麦'],
    dietTags: [],
    dislikeTags: []
  },
  {
    id: 'b005',
    name: '牛奶燕麦',
    desc: '温牛奶泡软燕麦，加点水果更健康',
    price: 10,
    categoryId: 'breakfast',
    tags: [],
    spicy: 0,
    sales: 0,
    emoji: '🥣',
    bgColor: bgMint,
    allergens: ['奶', '小麦'],
    dietTags: [],
    dislikeTags: []
  },
  {
    id: 'b006',
    name: '三明治',
    desc: '火腿蛋生菜夹吐司，快手又营养',
    price: 14,
    categoryId: 'breakfast',
    tags: [],
    spicy: 0,
    sales: 0,
    emoji: '🥪',
    bgColor: bgMint,
    allergens: ['蛋', '小麦', '奶'],
    dietTags: [],
    dislikeTags: []
  },

  // ===================== 午餐 lunch 🍱 =====================
  {
    id: 'l001',
    name: '番茄炒蛋',
    desc: '酸甜开胃经典菜，拌米饭绝了',
    price: 16,
    categoryId: 'lunch',
    tags: [],
    spicy: 0,
    sales: 0,
    emoji: '🍳',
    bgColor: bgPeach,
    recommend: true,
    allergens: ['蛋'],
    dietTags: [],
    dislikeTags: []
  },
  {
    id: 'l002',
    name: '宫保鸡丁',
    desc: '花生鸡丁微辣甜口，经典川菜代表',
    price: 28,
    categoryId: 'lunch',
    tags: [],
    spicy: 2,
    sales: 0,
    emoji: '🍗',
    bgColor: bgPink,
    allergens: ['花生'],
    dietTags: [],
    dislikeTags: []
  },
  {
    id: 'l003',
    name: '红烧肉',
    desc: '肥而不腻入口即化，下饭神器',
    price: 32,
    categoryId: 'lunch',
    tags: [],
    spicy: 0,
    sales: 0,
    emoji: '🥩',
    bgColor: bgPeach,
    allergens: [],
    dietTags: [],
    dislikeTags: []
  },
  {
    id: 'l004',
    name: '鱼香肉丝',
    desc: '酸甜咸辣四味俱全，拌饭超好吃',
    price: 26,
    categoryId: 'lunch',
    tags: [],
    spicy: 1,
    sales: 0,
    emoji: '🥘',
    bgColor: bgPink,
    allergens: ['小麦'],
    dietTags: [],
    dislikeTags: []
  },
  {
    id: 'l005',
    name: '麻婆豆腐',
    desc: '麻辣鲜香嫩豆腐，一勺一碗饭',
    price: 18,
    categoryId: 'lunch',
    tags: [],
    spicy: 2,
    sales: 0,
    emoji: '🍲',
    bgColor: bgPink,
    allergens: ['大豆'],
    dietTags: [],
    dislikeTags: []
  },
  {
    id: 'l006',
    name: '糖醋排骨',
    desc: '外酥里嫩酸甜可口，她的最爱',
    price: 35,
    categoryId: 'lunch',
    tags: [],
    spicy: 0,
    sales: 0,
    emoji: '🍖',
    bgColor: bgPeach,
    recommend: true,
    allergens: ['小麦'],
    dietTags: [],
    dislikeTags: []
  },
  {
    id: 'l007',
    name: '清炒时蔬',
    desc: '当季青菜蒜蓉清炒，清爽解腻',
    price: 14,
    categoryId: 'lunch',
    tags: [],
    spicy: 0,
    sales: 0,
    emoji: '🥬',
    bgColor: bgMint,
    allergens: [],
    dietTags: [],
    dislikeTags: []
  },
  {
    id: 'l008',
    name: '可乐鸡翅',
    desc: '可乐上色焖煮鸡翅，甜嫩多汁',
    price: 28,
    categoryId: 'lunch',
    tags: [],
    spicy: 0,
    sales: 0,
    emoji: '🍗',
    bgColor: bgPeach,
    allergens: ['小麦'],
    dietTags: [],
    dislikeTags: []
  },

  // ===================== 晚餐 dinner 🍲 =====================
  {
    id: 'd001',
    name: '酸辣汤',
    desc: '胡椒酸辣开胃汤，冬天喝超暖',
    price: 16,
    categoryId: 'dinner',
    tags: [],
    spicy: 1,
    sales: 0,
    emoji: '🍜',
    bgColor: bgPink,
    allergens: ['蛋', '大豆'],
    dietTags: [],
    dislikeTags: []
  },
  {
    id: 'd002',
    name: '红烧鱼',
    desc: '整鱼红烧入味，年年有余好寓意',
    price: 42,
    categoryId: 'dinner',
    tags: [],
    spicy: 0,
    sales: 0,
    emoji: '🐟',
    bgColor: bgCream,
    allergens: ['海鲜'],
    dietTags: [],
    dislikeTags: []
  },
  {
    id: 'd003',
    name: '蒜蓉西兰花',
    desc: '翠绿西兰花配蒜香，健康又好吃',
    price: 16,
    categoryId: 'dinner',
    tags: [],
    spicy: 0,
    sales: 0,
    emoji: '🥦',
    bgColor: bgMint,
    allergens: [],
    dietTags: [],
    dislikeTags: []
  },
  {
    id: 'd004',
    name: '紫菜蛋花汤',
    desc: '简简单单一碗汤，暖到心里',
    price: 10,
    categoryId: 'dinner',
    tags: [],
    spicy: 0,
    sales: 0,
    emoji: '🥣',
    bgColor: bgTaro,
    recommend: true,
    allergens: ['蛋', '海鲜'],
    dietTags: [],
    dislikeTags: []
  },
  {
    id: 'd005',
    name: '土豆炖牛肉',
    desc: '软糯土豆吸满肉汁，牛肉酥烂',
    price: 38,
    categoryId: 'dinner',
    tags: [],
    spicy: 0,
    sales: 0,
    emoji: '🍖',
    bgColor: bgPeach,
    allergens: ['小麦'],
    dietTags: [],
    dislikeTags: []
  },
  {
    id: 'd006',
    name: '蒸蛋羹',
    desc: '滑嫩如布丁的蒸蛋，入口即化',
    price: 12,
    categoryId: 'dinner',
    tags: [],
    spicy: 0,
    sales: 0,
    emoji: '🍮',
    bgColor: bgCream,
    allergens: ['蛋'],
    dietTags: [],
    dislikeTags: []
  },

  // ===================== 夜宵 lateNight 🍜 =====================
  {
    id: 'n001',
    name: '泡面加蛋',
    desc: '深夜灵魂料理，加个蛋更满足',
    price: 8,
    categoryId: 'lateNight',
    tags: [],
    spicy: 1,
    sales: 0,
    emoji: '🍜',
    bgColor: bgLemon,
    recommend: true,
    allergens: ['蛋', '小麦'],
    dietTags: [],
    dislikeTags: []
  },
  {
    id: 'n002',
    name: '烤串',
    desc: '孜然辣椒烤羊肉串，深夜的快乐',
    price: 30,
    categoryId: 'lateNight',
    tags: [],
    spicy: 2,
    sales: 0,
    emoji: '🍢',
    bgColor: bgPink,
    allergens: [],
    dietTags: [],
    dislikeTags: []
  },
  {
    id: 'n003',
    name: '煎饺',
    desc: '底脆皮软汁多，配醋吃超香',
    price: 18,
    categoryId: 'lateNight',
    tags: [],
    spicy: 0,
    sales: 0,
    emoji: '🥟',
    bgColor: bgPeach,
    allergens: ['小麦'],
    dietTags: [],
    dislikeTags: []
  },
  {
    id: 'n004',
    name: '小馄饨',
    desc: '清汤小馄饨，深夜暖胃小确幸',
    price: 14,
    categoryId: 'lateNight',
    tags: [],
    spicy: 0,
    sales: 0,
    emoji: '🥟',
    bgColor: bgCream,
    allergens: ['小麦', '蛋'],
    dietTags: [],
    dislikeTags: []
  },
  {
    id: 'n005',
    name: '麻辣烫',
    desc: '想吃什么烫什么，麻辣鲜香',
    price: 25,
    categoryId: 'lateNight',
    tags: [],
    spicy: 3,
    sales: 0,
    emoji: '🍲',
    bgColor: bgPink,
    allergens: ['大豆', '花生'],
    dietTags: [],
    dislikeTags: []
  },

  // ===================== 甜品 dessert 🍰 =====================
  {
    id: 'ds001',
    name: '芒果布丁',
    desc: '香甜芒果配滑嫩布丁，超治愈',
    price: 16,
    categoryId: 'dessert',
    tags: [],
    spicy: 0,
    sales: 0,
    emoji: '🥭',
    bgColor: bgLemon,
    recommend: true,
    allergens: ['奶', '芒果', '蛋'],
    dietTags: [],
    dislikeTags: []
  },
  {
    id: 'ds002',
    name: '草莓蛋糕',
    desc: '鲜奶油草莓蛋糕，甜到心里',
    price: 28,
    categoryId: 'dessert',
    tags: [],
    spicy: 0,
    sales: 0,
    emoji: '🍰',
    bgColor: bgPink,
    allergens: ['奶', '蛋', '小麦'],
    dietTags: [],
    dislikeTags: []
  },
  {
    id: 'ds003',
    name: '芋圆烧仙草',
    desc: 'Q弹芋圆配凉草，夏天来一碗',
    price: 18,
    categoryId: 'dessert',
    tags: [],
    spicy: 0,
    sales: 0,
    emoji: '🍨',
    bgColor: bgTaro,
    allergens: ['奶'],
    dietTags: [],
    dislikeTags: []
  },
  {
    id: 'ds004',
    name: '红豆双皮奶',
    desc: '滑嫩双皮奶配蜜红豆，港式经典',
    price: 16,
    categoryId: 'dessert',
    tags: [],
    spicy: 0,
    sales: 0,
    emoji: '🍮',
    bgColor: bgCream,
    allergens: ['奶'],
    dietTags: [],
    dislikeTags: []
  },
  {
    id: 'ds005',
    name: '巧克力冰淇淋',
    desc: '浓郁巧克力味冰淇淋，开心加倍',
    price: 14,
    categoryId: 'dessert',
    tags: [],
    spicy: 0,
    sales: 0,
    emoji: '🍦',
    bgColor: bgCream,
    allergens: ['奶', '坚果'],
    dietTags: [],
    dislikeTags: []
  },
  {
    id: 'ds006',
    name: '水果拼盘',
    desc: '当季新鲜水果切好，不用洗',
    price: 20,
    categoryId: 'dessert',
    tags: [],
    spicy: 0,
    sales: 0,
    emoji: '🍓',
    bgColor: bgMint,
    allergens: ['芒果'],
    dietTags: [],
    dislikeTags: []
  },

  // ===================== 零食 snack 🍿 =====================
  {
    id: 's001',
    name: '薯片',
    desc: '咔嚓咔嚓停不下来，追剧必备',
    price: 8,
    categoryId: 'snack',
    tags: [],
    spicy: 0,
    sales: 0,
    emoji: '🥔',
    bgColor: bgLemon,
    allergens: [],
    dietTags: [],
    dislikeTags: []
  },
  {
    id: 's002',
    name: '坚果拼盘',
    desc: '核桃腰果杏仁，补脑又好吃',
    price: 20,
    categoryId: 'snack',
    tags: [],
    spicy: 0,
    sales: 0,
    emoji: '🥜',
    bgColor: bgPeach,
    allergens: ['坚果', '花生'],
    dietTags: [],
    dislikeTags: []
  },
  {
    id: 's003',
    name: '酸奶',
    desc: '浓稠酸奶助消化，冰镇更好喝',
    price: 8,
    categoryId: 'snack',
    tags: [],
    spicy: 0,
    sales: 0,
    emoji: '🥛',
    bgColor: bgMint,
    allergens: ['奶'],
    dietTags: [],
    dislikeTags: []
  },
  {
    id: 's004',
    name: '果冻',
    desc: 'QQ弹弹果味果冻，童年味道',
    price: 6,
    categoryId: 'snack',
    tags: [],
    spicy: 0,
    sales: 0,
    emoji: '🍮',
    bgColor: bgPink,
    allergens: ['芒果'],
    dietTags: [],
    dislikeTags: []
  },
  {
    id: 's005',
    name: '辣条',
    desc: '偶尔来一包，快乐似神仙',
    price: 5,
    categoryId: 'snack',
    tags: [],
    spicy: 3,
    sales: 0,
    emoji: '🌶️',
    bgColor: bgPink,
    allergens: ['小麦', '大豆'],
    dietTags: [],
    dislikeTags: []
  },
  {
    id: 's006',
    name: '巧克力',
    desc: '甜甜的巧克力，心情不好来一块',
    price: 12,
    categoryId: 'snack',
    tags: [],
    spicy: 0,
    sales: 0,
    emoji: '🍫',
    bgColor: bgCream,
    allergens: ['奶', '坚果', '大豆'],
    dietTags: [],
    dislikeTags: []
  }
];

// 自定义菜（女友「想吃别的？」时创建）emoji 和背景色随机
const customEmojis = ['🍳', '🥘', '🍲', '🥗', '🍜', '🍝', '🍛', '🍣', '🥟', '🍕', '🌮', '🥪', '🧆', '🥙', '🍱'];
const customBgs = [bgPink, bgCream, bgTaro, bgMint, bgPeach];

export function getDishById(id) {
  return dishes.find((d) => d.id === id);
}

export function createCustomDish({ name, spicy, dietNote }) {
  const emoji = customEmojis[Math.floor(Math.random() * customEmojis.length)];
  const bgColor = customBgs[Math.floor(Math.random() * customBgs.length)];
  return {
    id: `custom_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    name,
    desc: '小馋猫点名要吃的',
    price: 0,
    categoryId: 'custom',
    tags: [],
    spicy: spicy || 0,
    sales: 0,
    emoji,
    bgColor,
    isCustom: true,
    dietNote: dietNote || '',
    allergens: [],
    dietTags: [],
    dislikeTags: []
  };
}

// 兼容字段：emoji 方案不需要 image 字段，但为兼容老代码保留 image 字段（空字符串）
// DishCard 组件会检测 emoji 字段优先使用 emoji 展示
dishes.forEach((d) => {
  d.image = '';
});
