import { defineStore } from 'pinia';
import { api } from '@/utils/api';
import { storage } from '@/utils/storage';
import { useCoupleStore } from './couple';
import { useCartStore } from './cart';
import { categories as mockCats, dishes as mockDishes, createCustomDish as mockCreateCustom, getDishById as mockGetDishById } from '@/mock/menu';

const CUSTOM_CATS_KEY = 'oc_custom_categories';
const DELETED_DEFAULT_CATS_KEY = 'oc_deleted_default_categories';

const DEFAULT_CAT_DEFS = [
  { id: 'breakfast', name: '早餐', icon: '🍳', desc: '元气满满开启一天', sort: 1 },
  { id: 'lunch', name: '午餐', icon: '🍱', desc: '正正经经吃顿好的', sort: 2 },
  { id: 'dinner', name: '晚餐', icon: '🍲', desc: '慢慢吃，不着急', sort: 3 },
  { id: 'lateNight', name: '夜宵', icon: '🍜', desc: '饿了就吃点暖的', sort: 4 },
  { id: 'dessert', name: '甜品', icon: '🍰', desc: '生活需要点甜', sort: 5 },
  { id: 'snack', name: '零食', icon: '🍿', desc: '解馋小可爱', sort: 6 }
];

/**
 * 菜品 Store（v3 - 后端同步版）
 * -----------------------------------------------------------------------------
 * 自定义分类优先从后端加载，localStorage 仅做离线兜底
 */
export const useDishStore = defineStore('dish', {
  state: () => ({
    categories: [],
    dishes: [],
    customCategories: [],
    loaded: false,
    online: false,
    loadedCoupleId: '',
    lastUseDefaultDishes: null
  }),
  getters: {
    allCategories(s) {
      const map = new Map();
      for (const c of s.categories) {
        map.set(c.id, { ...c, isDefault: true });
      }
      for (const c of s.customCategories) {
        map.set(c.id, c);
      }
      return Array.from(map.values()).sort((a, b) => (a.sort || 0) - (b.sort || 0));
    },
    dishMap: (s) => {
      const m = {};
      s.dishes.forEach((d) => { m[d.id] = d; });
      return m;
    },
    dishByCat: (s) => {
      const m = {};
      const all = [...(s.categories || []), ...(s.customCategories || [])];
      all.forEach((c) => { m[c.id] = []; });
      s.dishes.forEach((d) => {
        if (!m[d.categoryId]) m[d.categoryId] = [];
        m[d.categoryId].push(d);
      });
      return m;
    },
    customDishes: (s) => s.dishes.filter((d) => d.isCustom)
  },
  actions: {
    _loadCustomCats() {
      const stored = storage.get(CUSTOM_CATS_KEY, []);
      this.customCategories = Array.isArray(stored) ? stored : [];
    },
    _saveCustomCats() {
      storage.set(CUSTOM_CATS_KEY, this.customCategories);
    },
    _loadDeletedDefaultCats() {
      return storage.get(DELETED_DEFAULT_CATS_KEY, []);
    },
    _saveDeletedDefaultCats(ids) {
      storage.set(DELETED_DEFAULT_CATS_KEY, ids);
    },
    async init() {
      const couple = useCoupleStore();
      if (couple.isDemo) {
        if (this.loaded) return;
        this._loadDemo();
        return;
      }
      const coupleId = couple.coupleId || '';
      // 如果 useDefaultDishes 设置变化了，需要重新拉取
      const needReload = this.lastUseDefaultDishes !== couple.useDefaultDishes;
      if (this.loaded && this.loadedCoupleId === coupleId && !needReload) return;
      await this.fetchAll();
    },
    async fetchAll() {
      const couple = useCoupleStore();
      if (couple.isDemo) {
        if (this.loaded) return;
        this._loadDemo();
        return;
      }
      const coupleId = couple.coupleId || '';
      try {
        const [cats, dishList] = await Promise.all([
          api.getCategories(coupleId),
          api.getDishes('', coupleId)
        ]);
        this._applyCategories(cats || [], dishList || []);
        this.dishes = dishList || [];
        this.loaded = true;
        this.loadedCoupleId = coupleId;
        this.lastUseDefaultDishes = couple.useDefaultDishes;
        this.online = true;
        try {
          const cart = useCartStore();
          cart.syncFromDishStore();
        } catch (e) {}
      } catch (e) {
        this.categories = mockCats;
        this.dishes = mockDishes;
        this._loadCustomCats();
        this.loaded = true;
        this.loadedCoupleId = coupleId;
        this.lastUseDefaultDishes = couple.useDefaultDishes;
        this.online = false;
      }
    },
    _applyCategories(cats, dishList) {
      const defaults = cats.filter((c) => c.isDefault);
      const customs = cats.filter((c) => c.isCustom && !c.isDefault);
      this.categories = defaults;
      this.customCategories = customs;
      this._saveCustomCats();
      // 当默认菜品被禁用时，自定义菜品可能引用默认分类 ID（如 dinner）
      // 需要把这些被引用的默认分类补回来，否则菜品无法在菜单页显示
      if (dishList && dishList.length > 0) {
        const missingCatIds = new Set();
        for (const d of dishList) {
          if (!this.categories.find((c) => c.id === d.categoryId) &&
              !this.customCategories.find((c) => c.id === d.categoryId)) {
            missingCatIds.add(d.categoryId);
          }
        }
        if (missingCatIds.size > 0) {
          for (const def of DEFAULT_CAT_DEFS) {
            if (missingCatIds.has(def.id)) {
              this.categories.push({
                id: def.id,
                name: def.name,
                icon: def.icon,
                desc: def.desc || '',
                sort: def.sort || 100,
                isDefault: true,
                isCustom: false
              });
            }
          }
          this.categories.sort((a, b) => (a.sort || 0) - (b.sort || 0));
        }
      }
    },
    _loadDemo() {
      const deletedIds = this._loadDeletedDefaultCats();
      this.categories = mockCats.filter((c) => !deletedIds.includes(c.id));
      this.dishes = mockDishes.filter((d) => !deletedIds.includes(d.categoryId));
      this._loadCustomCats();
      this.loaded = true;
      this.loadedCoupleId = 'couple_demo_001';
      this.online = false;
    },
    clear() {
      this.categories = [];
      this.dishes = [];
      this.customCategories = [];
      this.loaded = false;
      this.online = false;
      this.loadedCoupleId = '';
      this.lastUseDefaultDishes = null;
    },
    getDishById(id) {
      return this.dishMap[id] || mockGetDishById(id);
    },
    createCustomDish(opts) {
      return mockCreateCustom(opts);
    },

    // ── 自定义分类管理 ──
    async addCategory(cat) {
      if (!cat || !cat.id) return;
      const exists = this.customCategories.some((c) => c.id === cat.id);
      if (exists) return;

      const couple = useCoupleStore();
      if (couple.isDemo || !couple.coupleId) {
        this.customCategories.push(cat);
        this._saveCustomCats();
        return cat;
      }
      const data = await api.createCategory({
        coupleId: couple.coupleId,
        name: cat.name,
        icon: cat.icon || '🍽️',
        desc: cat.desc || '',
        sort: cat.sort || 100
      });
      this.customCategories.push({ ...data, isCustom: true, isDefault: false });
      this._saveCustomCats();
      return { ...data, isCustom: true, isDefault: false };
    },

    async removeCategory(id) {
      const inCustom = this.customCategories.findIndex((c) => c.id === id);
      const inDefault = this.categories.findIndex((c) => c.id === id);
      if (inCustom === -1 && inDefault === -1) return;

      const couple = useCoupleStore();

      // Demo mode: update in-memory + persist, no API call
      if (couple.isDemo) {
        this.dishes = this.dishes.filter((d) => d.categoryId !== id);
        if (inCustom !== -1) {
          this.customCategories = this.customCategories.filter((c) => c.id !== id);
          this._saveCustomCats();
        }
        if (inDefault !== -1) {
          this.categories = this.categories.filter((c) => c.id !== id);
          const deletedIds = this._loadDeletedDefaultCats();
          if (!deletedIds.includes(id)) {
            deletedIds.push(id);
            this._saveDeletedDefaultCats(deletedIds);
          }
        }
        return;
      }

      // Non-demo: call API first, then update local state on success
      if (couple.coupleId) {
        await api.deleteCategory(id, couple.coupleId);
      }
      // API succeeded, now update local state
      this.dishes = this.dishes.filter((d) => d.categoryId !== id);
      if (inCustom !== -1) {
        this.customCategories = this.customCategories.filter((c) => c.id !== id);
        this._saveCustomCats();
      }
      if (inDefault !== -1) {
        this.categories = this.categories.filter((c) => c.id !== id);
      }
      this.loaded = false;
    },

    async updateCategory(id, patch) {
      const inCustom = this.customCategories.findIndex((c) => c.id === id);
      const inDefault = this.categories.findIndex((c) => c.id === id);
      if (inCustom === -1 && inDefault === -1) return;

      const couple = useCoupleStore();

      if (inCustom !== -1) {
        const prev = { ...this.customCategories[inCustom] };
        this.customCategories.splice(inCustom, 1, { ...prev, ...patch });
        this._saveCustomCats();
        if (!couple.isDemo && couple.coupleId) {
          try {
            await api.updateCategory(id, {
              ...patch,
              coupleId: couple.coupleId
            });
          } catch (e) {
            this.customCategories.splice(inCustom, 1, prev);
            this._saveCustomCats();
            throw e;
          }
        }
      } else {
        const prev = { ...this.categories[inDefault] };
        this.categories.splice(inDefault, 1, { ...prev, ...patch });
        if (!couple.isDemo && couple.coupleId) {
          try {
            await api.updateCategory(id, {
              ...patch,
              coupleId: couple.coupleId
            });
          } catch (e) {
            this.categories.splice(inDefault, 1, prev);
            throw e;
          }
        }
      }
    },

    async reorderCategories(orderedIds) {
      const couple = useCoupleStore();
      const all = this.allCategories;
      const updated = orderedIds.map((id, i) => {
        const cat = all.find((c) => c.id === id);
        return { id, sort: i * 10, isDefault: cat && cat.isDefault };
      });

      // Demo mode: update in-memory only
      if (couple.isDemo) {
        updated.forEach(({ id, sort }) => {
          const inDefault = this.categories.find((c) => c.id === id);
          if (inDefault) inDefault.sort = sort;
          const inCustom = this.customCategories.find((c) => c.id === id);
          if (inCustom) inCustom.sort = sort;
        });
        this._saveCustomCats();
        return;
      }

      // Non-demo: call API first, then update local state on success
      if (couple.coupleId) {
        await api.sortCategories({
          coupleId: couple.coupleId,
          items: updated.map(({ id, sort }) => ({ id, sort }))
        });
      }
      // API succeeded, now update local state
      updated.forEach(({ id, sort }) => {
        const inDefault = this.categories.find((c) => c.id === id);
        if (inDefault) inDefault.sort = sort;
        const inCustom = this.customCategories.find((c) => c.id === id);
        if (inCustom) inCustom.sort = sort;
      });
      this._saveCustomCats();
    },

    async refreshCategories() {
      const couple = useCoupleStore();
      if (couple.isDemo) return;
      try {
        const cats = await api.getCategories(couple.coupleId || '');
        this._applyCategories(cats || []);
      } catch (e) {}
    },

    // ── 菜品 CRUD ──
    async createDish(payload) {
      const couple = useCoupleStore();
      if (couple.isDemo) {
        const d = mockCreateCustom(payload);
        this.dishes.push(d);
        return d;
      }
      const data = await api.createDish({
        ...payload,
        coupleId: couple.coupleId,
        userId: couple.userId
      });
      this.dishes.push(data);
      this.loaded = false;
      return data;
    },
    async updateDish(id, payload) {
      const couple = useCoupleStore();
      const idx = this.dishes.findIndex((d) => d.id === id);
      const prev = idx !== -1 ? { ...this.dishes[idx] } : null;
      if (idx !== -1) {
        this.dishes.splice(idx, 1, { ...this.dishes[idx], ...payload });
      }
      if (couple.isDemo) {
        return this.dishes[idx];
      }
      try {
        const data = await api.updateDish(id, {
          ...payload,
          coupleId: couple.coupleId
        });
        if (idx !== -1) {
          this.dishes.splice(idx, 1, { ...this.dishes[idx], ...data });
        }
        this.loaded = false;
        try {
          const cart = useCartStore();
          cart.syncFromDishStore();
        } catch (e) {}
        return data;
      } catch (e) {
        if (idx !== -1 && prev) {
          this.dishes.splice(idx, 1, prev);
        }
        throw e;
      }
    },
    async deleteDish(id) {
      const couple = useCoupleStore();
      if (!couple.isDemo) {
        if (!couple.coupleId) {
          throw new Error('情侣ID缺失，请重新登录');
        }
        await api.deleteDish(id, couple.coupleId);
        this.loaded = false;
      }
      this.dishes = this.dishes.filter((d) => d.id !== id);
    }
  }
});
