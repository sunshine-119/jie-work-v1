import { defineStore } from 'pinia';
import { storage } from '@/utils/storage';
import { getDishById } from '@/mock/menu';
import { api } from '@/utils/api';
import { useDishStore } from './dish';
import { useCoupleStore } from './couple';

const CART_KEY = 'oc_cart';

/**
 * 购物车 Store
 * -----------------------------------------------------------------------------
 * 每条购物车项支持「辣度 + 忌口备注」（女友端每道菜可单独标注）
 * - 同一道菜如果辣度/忌口不同，会作为独立行项目存在
 * - lineKey = dishId + '|' + spicy + '|' + dietNote 用于区分不同备注的同款菜
 * - 数据同步到后端（按 coupleId 持久化），退出登录后重新登录数据不丢失
 */
export const useCartStore = defineStore('cart', {
  state: () => ({
    items: [] // [{ id, lineKey, name, price, emoji, bgColor, qty, spicy, dietNote, isCustom }]
  }),
  getters: {
    count: (s) => s.items.reduce((a, b) => a + b.qty, 0),
    totalPrice: (s) => s.items.reduce((a, b) => a + b.price * b.qty, 0),
    isEmpty: (s) => s.items.length === 0,
    detailList: (s) =>
      s.items.map((i) => ({
        ...i,
        subtotal: i.price * i.qty
      }))
  },
  actions: {
    init() {
      // 先从本地恢复，再从后端同步
      this.items = storage.get(CART_KEY, []);
      this.fetchFromServer().catch(() => {
        // 后端不可用时也尝试从dishStore同步
        this.syncFromDishStore();
      });
    },
    persist() {
      storage.set(CART_KEY, this.items);
    },
    /** 从后端拉取购物车（登录后恢复数据） */
    async fetchFromServer() {
      const couple = useCoupleStore();
      if (!couple.coupleId || couple.isDemo) return;
      try {
        const data = await api.getCart(couple.coupleId);
        if (Array.isArray(data)) {
          this.items = data;
          this.syncFromDishStore();
          this.persist();
        }
      } catch (e) {
        // 后端不可用则保留本地
        this.syncFromDishStore();
      }
    },
    /**
     * 从菜品 Store 同步菜品最新数据到购物车
     * 当菜品被编辑（如添加图片）后，购物车中的数据需要更新
     */
    syncFromDishStore() {
      try {
        const dishStore = useDishStore();
        if (!dishStore.dishes || dishStore.dishes.length === 0) return;
        let changed = false;
        this.items.forEach((item) => {
          const dish = dishStore.getDishById(item.id);
          if (dish) {
            // 同步关键字段
            if (dish.image && item.image !== dish.image) {
              item.image = dish.image;
              changed = true;
            }
            if (dish.emoji && item.emoji !== dish.emoji) {
              item.emoji = dish.emoji;
              changed = true;
            }
            if (dish.bgColor && item.bgColor !== dish.bgColor) {
              item.bgColor = dish.bgColor;
              changed = true;
            }
            if (dish.name && item.name !== dish.name) {
              item.name = dish.name;
              changed = true;
            }
            if (dish.price != null && item.price !== dish.price) {
              item.price = dish.price;
              changed = true;
            }
          }
        });
        if (changed) {
          this.persist();
        }
      } catch (e) {
        // dishStore 未初始化时忽略
      }
    },
    /** 生成行项目 key：相同菜品 + 相同备注视为同一行 */
    makeLineKey(dishId, spicy, dietNote) {
      return `${dishId}|${spicy || 0}|${dietNote || ''}`;
    },
    /** 后端同步：新增/累加 */
    _syncAdd(item) {
      const couple = useCoupleStore();
      if (!couple.coupleId || couple.isDemo) return;
      api.addCartItem({
        coupleId: couple.coupleId,
        id: item.id,
        lineKey: item.lineKey,
        name: item.name,
        price: item.price,
        emoji: item.emoji,
        bgColor: item.bgColor,
        image: item.image || '',
        qty: item.qty,
        spicy: item.spicy,
        dietNote: item.dietNote,
        isCustom: item.isCustom
      }).catch(() => {});
    },
    /** 后端同步：更新数量 */
    _syncUpdate(lineKey, qty) {
      const couple = useCoupleStore();
      if (!couple.coupleId || couple.isDemo) return;
      api.updateCartItem(lineKey, { coupleId: couple.coupleId, qty }).catch(() => {});
    },
    /** 后端同步：删除行 */
    _syncRemove(lineKey) {
      const couple = useCoupleStore();
      if (!couple.coupleId || couple.isDemo) return;
      api.deleteCartItem(lineKey, couple.coupleId).catch(() => {});
    },
    /** 后端同步：清空 */
    _syncClear() {
      const couple = useCoupleStore();
      if (!couple.coupleId || couple.isDemo) return;
      api.clearCart(couple.coupleId).catch(() => {});
    },
    /** 快速加入（无备注） */
    add(dishId, qty = 1) {
      return this.addWithNote(dishId, qty, { spicy: 0, dietNote: '' });
    },
    /**
     * 带备注加入购物车
     * @param {string} dishId  菜品 id
     * @param {number} qty     数量
     * @param {object} note    { spicy: 0-3, dietNote: '不要葱' }
     */
    addWithNote(dishId, qty = 1, note = {}) {
      // 先从 mock 查找，找不到再从 dishStore 查找（新上传的菜品在 store 里）
      let dish = getDishById(dishId);
      if (!dish) {
        try {
          const dishStore = useDishStore();
          dish = dishStore.getDishById(dishId);
        } catch (e) {
          // dishStore 未初始化时忽略
        }
      }
      if (!dish) return;
      const spicy = note.spicy != null ? note.spicy : dish.spicy || 0;
      const dietNote = note.dietNote || '';
      const lineKey = this.makeLineKey(dishId, spicy, dietNote);
      const existing = this.items.find((i) => i.lineKey === lineKey);
      if (existing) {
        existing.qty += qty;
        this._syncUpdate(lineKey, existing.qty);
      } else {
        const item = {
          id: dish.id,
          lineKey,
          name: dish.name,
          price: dish.price,
          emoji: dish.emoji || '🍽️',
          bgColor: dish.bgColor || 'linear-gradient(135deg, #FFF8F2, #F5E6D3)',
          image: dish.image || '',
          qty,
          spicy,
          dietNote,
          isCustom: !!dish.isCustom
        };
        this.items.push(item);
        this._syncAdd(item);
      }
      this.persist();
    },
    /** 直接加入一个自定义菜品对象（女友端「想吃别的？」手动输入） */
    addCustomDish(dish, qty = 1, note = {}) {
      const spicy = note.spicy != null ? note.spicy : dish.spicy || 0;
      const dietNote = note.dietNote || dish.dietNote || '';
      const lineKey = this.makeLineKey(dish.id, spicy, dietNote);
      const existing = this.items.find((i) => i.lineKey === lineKey);
      if (existing) {
        existing.qty += qty;
        this._syncUpdate(lineKey, existing.qty);
      } else {
        const item = {
          id: dish.id,
          lineKey,
          name: dish.name,
          price: dish.price,
          emoji: dish.emoji || '🍽️',
          bgColor: dish.bgColor || 'linear-gradient(135deg, #FFF8F2, #F5E6D3)',
          image: dish.image || '',
          qty,
          spicy,
          dietNote,
          isCustom: true
        };
        this.items.push(item);
        this._syncAdd(item);
      }
      this.persist();
    },
    /** 快速减一：按菜品 id 减（默认减第一条匹配行，用于菜品卡片上的 − 按钮） */
    minus(dishId) {
      const item = this.items.find((i) => i.id === dishId);
      if (!item) return;
      if (item.qty > 1) {
        item.qty -= 1;
        this._syncUpdate(item.lineKey, item.qty);
      } else {
        this.items = this.items.filter((i) => i.lineKey !== item.lineKey);
        this._syncRemove(item.lineKey);
      }
      this.persist();
    },
    /** 按行 key 精确减一（用于购物车弹层，区分不同备注的同款菜） */
    minusLine(lineKey) {
      const idx = this.items.findIndex((i) => i.lineKey === lineKey);
      if (idx === -1) return;
      const item = this.items[idx];
      if (item.qty > 1) {
        item.qty -= 1;
        this._syncUpdate(lineKey, item.qty);
      } else {
        this.items.splice(idx, 1);
        this._syncRemove(lineKey);
      }
      this.persist();
    },
    setQty(lineKey, qty) {
      const item = this.items.find((i) => i.lineKey === lineKey);
      if (!item) return;
      if (qty <= 0) {
        this.remove(lineKey);
      } else {
        item.qty = qty;
        this._syncUpdate(lineKey, qty);
        this.persist();
      }
    },
    remove(lineKey) {
      this.items = this.items.filter((i) => i.lineKey !== lineKey);
      this._syncRemove(lineKey);
      this.persist();
    },
    /** 移除某菜品的全部行（不同备注的同款菜一并清掉） */
    removeDish(dishId) {
      const removed = this.items.filter((i) => i.id === dishId);
      this.items = this.items.filter((i) => i.id !== dishId);
      removed.forEach((i) => this._syncRemove(i.lineKey));
      this.persist();
    },
    clear() {
      this.items = [];
      this._syncClear();
      this.persist();
    },
    /** 某菜品的总份数（所有备注行加总，用于菜品卡片显示已加数量） */
    qtyOf(dishId) {
      return this.items
        .filter((i) => i.id === dishId)
        .reduce((a, b) => a + b.qty, 0);
    }
  }
});
