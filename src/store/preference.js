/**
 * 饮食偏好 & 想吃收藏 Store
 * -----------------------------------------------------------------------------
 * 女友端「个人中心」核心数据：
 * 1) allergens   永久过敏原（海鲜 / 花生 / 蛋 / 奶 / 芒果 ...）
 * 2) dislikes    永久不吃食材（香菜 / 葱 / 姜 / 蒜 ...）
 * 3) tastePrefs  口味偏好（清淡 / 少辣 / 偏甜 / 偏咸 ...）
 * 4) favorites   想吃收藏清单（dishId 数组）
 *
 * 男友端「伴侣饮食档案」直接读这个 store：
 * - 接单顶部高亮提醒女友忌口，避免踩雷
 * - 菜品触犯过敏原时，男友端会红色标记
 */
import { defineStore } from 'pinia';
import { storage } from '@/utils/storage';
import { api } from '@/utils/api';
import { useCoupleStore } from './couple';

const PREF_KEY = 'oc_preferences';
const FAV_KEY = 'oc_favorites';

// 默认偏好（首次进入演示用，可在个人中心修改）
const SEED_PREFS = {
  allergens: ['海鲜'],
  dislikes: ['香菜', '葱'],
  tastePrefs: ['清淡', '少辣']
};

// 候选词条库（个人中心选择用，避免自由输入造成脏数据）
export const ALLERGEN_OPTIONS = ['海鲜', '花生', '蛋', '奶', '芒果', '小麦', '坚果', '大豆'];
export const DISLIKE_OPTIONS = ['香菜', '葱', '姜', '蒜', '辣椒', '洋葱', '芹菜', '胡萝卜'];
export const TASTE_OPTIONS = ['清淡', '少辣', '中辣', '重辣', '偏甜', '偏咸', '偏酸', '偏油'];

export const TAG_OPTIONS = [
  '招牌', '经典', '她爱', '必点', '硬菜', '下饭', '快手',
  '暖胃', '养生', '健康', '清爽', '嫩滑', '浓香',
  '深夜', '儿童', '家常', '灵魂', '甜点', '下午茶',
  '治愈', '甜蜜', 'Q弹', '冰爽', '追剧', '快乐'
];

export const DIET_TAG_OPTIONS = [
  '少油', '少盐', '少糖', '不要葱', '不要蒜', '不要姜',
  '清淡', '低脂', '高蛋白', '低卡', '养胃', '温补',
  '温热', '去冰', '加冰', '不要太甜', '多加点辣', '多加点醋',
  '煮软点', '不要太咸', '微辣', '重辣', '辣', '甜', '酸', '素食'
];

export const usePreferenceStore = defineStore('preference', {
  state: () => ({
    allergens: [],
    dislikes: [],
    tastePrefs: [],
    favorites: [],
    // 标签选项（从后端同步，含默认 + 情侣自定义）
    dishTagOptions: [],    // 菜品标签选项
    dietTagOptions: [],    // 饮食标签选项
    customDishTags: [],    // 自定义菜品标签（含ID，用于删除）
    customDietTags: [],    // 自定义饮食标签（含ID，用于删除）
    hiddenDishTags: [],    // 被隐藏的默认菜品标签
    hiddenDietTags: []     // 被隐藏的默认饮食标签
  }),
  getters: {
    isFavorite: (s) => (dishId) => s.favorites.includes(dishId),
    /** 全部忌口文案（用于男友端顶部高亮提醒） */
    allRestrictions: (s) => [...s.allergens, ...s.dislikes],
    /** 菜品是否触犯女友过敏原（红色警告） */
    isDishAllergen: (s) => (dish) => {
      if (!dish || !dish.allergens) return false;
      return dish.allergens.some((a) => s.allergens.includes(a));
    },
    /** 菜品是否触犯女友不吃食材（黄色提醒）—— 过敏原标签命中忌口食材 */
    isDishDislike: (s) => (dish) => {
      if (!dish || !dish.allergens) return false;
      return dish.allergens.some((a) => s.dislikes.includes(a));
    },
    /** 前端使用的菜品标签选项（优先后端同步，fallback 本地常量） */
    getDishTagOptions: (s) => s.dishTagOptions.length ? s.dishTagOptions : TAG_OPTIONS,
    /** 前端使用的饮食标签选项（优先后端同步，fallback 本地常量） */
    getDietTagOptions: (s) => s.dietTagOptions.length ? s.dietTagOptions : DIET_TAG_OPTIONS
  },
  actions: {
    init() {
      const couple = useCoupleStore();
      const saved = storage.get(PREF_KEY, null);
      if (couple.isDemo) {
        // 游客模式下不展示任何真实饮食偏好数据
        this.allergens = [];
        this.dislikes = [];
        this.tastePrefs = [];
      } else if (saved) {
        this.allergens = saved.allergens || [];
        this.dislikes = saved.dislikes || [];
        this.tastePrefs = saved.tastePrefs || [];
      } else {
        this.allergens = [...SEED_PREFS.allergens];
        this.dislikes = [...SEED_PREFS.dislikes];
        this.tastePrefs = [...SEED_PREFS.tastePrefs];
        this.persist();
      }
      this.favorites = couple.isDemo ? [] : storage.get(FAV_KEY, []);
      // 尝试从后端同步（失败保留本地）
      this.fetchFromServer().catch(() => {});
      // 加载标签选项
      this.fetchTagOptions().catch(() => {});
    },
    persist() {
      storage.set(PREF_KEY, {
        allergens: this.allergens,
        dislikes: this.dislikes,
        tastePrefs: this.tastePrefs
      });
    },
    persistFavorites() {
      storage.set(FAV_KEY, this.favorites);
    },
    /** 获取女友的饮食档案（男友端看伴侣档案 / 女友端看自己档案都走这个） */
    async fetchFromServer() {
      const couple = useCoupleStore();
      if (!couple.coupleId || couple.isDemo) return;
      // 当前视角：女友看自己，男友看女友（partner）
      const userId = couple.isGirlfriend ? couple.me?.id : couple.partner?.id;
      if (!userId) return;
      try {
        const data = await api.getPreferences(userId);
        if (data) {
          this.allergens = data.allergens || [];
          this.dislikes = data.dislikes || [];
          this.tastePrefs = data.tastePrefs || [];
          this.persist();
        }
        // 同步 favorites（后端返回的是 dishId 数组）
        if (data && Array.isArray(data.favorites)) {
          this.favorites = data.favorites;
          this.persistFavorites();
        }
      } catch (e) {
        // 后端不可用则保留本地
      }
    },
    async _syncBackend() {
      const couple = useCoupleStore();
      if (!couple.me?.id || couple.isDemo) return;
      try {
        await api.updatePreferences({
          userId: couple.me.id,
          allergens: this.allergens,
          dislikes: this.dislikes,
          tastePrefs: this.tastePrefs
        });
      } catch (e) {
        // 离线时仅本地生效，下次上线再同步
      }
    },
    toggleAllergen(v) {
      const i = this.allergens.indexOf(v);
      if (i === -1) this.allergens.push(v);
      else this.allergens.splice(i, 1);
      this.persist();
      this._syncBackend();
    },
    toggleDislike(v) {
      const i = this.dislikes.indexOf(v);
      if (i === -1) this.dislikes.push(v);
      else this.dislikes.splice(i, 1);
      this.persist();
      this._syncBackend();
    },
    toggleTastePref(v) {
      const i = this.tastePrefs.indexOf(v);
      if (i === -1) this.tastePrefs.push(v);
      else this.tastePrefs.splice(i, 1);
      this.persist();
      this._syncBackend();
    },
    addAllergen(v) {
      v = (v || '').trim();
      if (!v || this.allergens.includes(v)) return;
      this.allergens.push(v);
      this.persist();
      this._syncBackend();
    },
    addDislike(v) {
      v = (v || '').trim();
      if (!v || this.dislikes.includes(v)) return;
      this.dislikes.push(v);
      this.persist();
      this._syncBackend();
    },
    addTastePref(v) {
      v = (v || '').trim();
      if (!v || this.tastePrefs.includes(v)) return;
      this.tastePrefs.push(v);
      this.persist();
      this._syncBackend();
    },
    removeAllergen(v) {
      this.allergens = this.allergens.filter((x) => x !== v);
      this.persist();
      this._syncBackend();
    },
    removeDislike(v) {
      this.dislikes = this.dislikes.filter((x) => x !== v);
      this.persist();
      this._syncBackend();
    },
    removeTastePref(v) {
      this.tastePrefs = this.tastePrefs.filter((x) => x !== v);
      this.persist();
      this._syncBackend();
    },
    /** 想吃清单：收藏 / 取消收藏 */
    toggleFavorite(dishId) {
      const couple = useCoupleStore();
      const i = this.favorites.indexOf(dishId);
      if (i === -1) this.favorites.push(dishId);
      else this.favorites.splice(i, 1);
      this.persistFavorites();
      // 同步后端
      if (couple.me?.id && !couple.isDemo) {
        api.toggleFavorite(couple.me.id, dishId).catch(() => {});
      }
    },
    clear() {
      this.allergens = [];
      this.dislikes = [];
      this.tastePrefs = [];
      this.favorites = [];
      this.dishTagOptions = [];
      this.dietTagOptions = [];
      this.customDishTags = [];
      this.customDietTags = [];
      storage.remove(PREF_KEY);
      storage.remove(FAV_KEY);
    },
    /** 从后端获取标签选项（默认 - 隐藏 + 情侣自定义） */
    async fetchTagOptions() {
      const couple = useCoupleStore();
      if (!couple.coupleId || couple.isDemo) {
        this.dishTagOptions = [...TAG_OPTIONS];
        this.dietTagOptions = [...DIET_TAG_OPTIONS];
        this.hiddenDishTags = [];
        this.hiddenDietTags = [];
        return;
      }
      try {
        const data = await api.getTagOptions(couple.coupleId);
        if (data) {
          this.dishTagOptions = data.tags || [];
          this.dietTagOptions = data.dietTags || [];
        }
      } catch (e) {
        this.dishTagOptions = [...TAG_OPTIONS];
        this.dietTagOptions = [...DIET_TAG_OPTIONS];
      }
      // 加载自定义标签（含 ID）
      try {
        const customDish = await api.getCustomTagOptions(couple.coupleId, 'tags');
        const customDiet = await api.getCustomTagOptions(couple.coupleId, 'dietTags');
        this.customDishTags = customDish || [];
        this.customDietTags = customDiet || [];
      } catch (e) {}
      // 加载被隐藏的默认标签
      try {
        const hiddenDish = await api.getHiddenTagOptions(couple.coupleId, 'tags');
        const hiddenDiet = await api.getHiddenTagOptions(couple.coupleId, 'dietTags');
        this.hiddenDishTags = hiddenDish || [];
        this.hiddenDietTags = hiddenDiet || [];
      } catch (e) {}
    },
    /** 添加自定义标签选项 */
    async addCustomTag(tagType, tagValue) {
      const couple = useCoupleStore();
      if (!couple.coupleId) return;
      tagValue = (tagValue || '').trim();
      if (!tagValue) return;
      if (tagType === 'tags' && this.dishTagOptions.includes(tagValue)) return;
      if (tagType === 'dietTags' && this.dietTagOptions.includes(tagValue)) return;
      try {
        await api.addTagOption(couple.coupleId, tagType, tagValue);
        await this.fetchTagOptions();
      } catch (e) {
        if (tagType === 'tags' && !this.dishTagOptions.includes(tagValue)) {
          this.dishTagOptions.push(tagValue);
        } else if (tagType === 'dietTags' && !this.dietTagOptions.includes(tagValue)) {
          this.dietTagOptions.push(tagValue);
        }
      }
    },
    /** 隐藏默认标签选项 */
    async hideDefaultTag(tagType, tagValue) {
      const couple = useCoupleStore();
      if (!couple.coupleId) return;
      try {
        await api.hideDefaultTag(couple.coupleId, tagType, tagValue);
        await this.fetchTagOptions();
      } catch (e) {
        // 本地先更新
        const list = tagType === 'tags' ? this.dishTagOptions : this.dietTagOptions;
        const idx = list.indexOf(tagValue);
        if (idx !== -1) list.splice(idx, 1);
      }
    },
    /** 恢复被隐藏的默认标签 */
    async restoreDefaultTag(tagType, tagValue) {
      const couple = useCoupleStore();
      if (!couple.coupleId) return;
      try {
        await api.restoreDefaultTag(couple.coupleId, tagType, tagValue);
        await this.fetchTagOptions();
      } catch (e) {
        // 本地先更新
        const list = tagType === 'tags' ? this.dishTagOptions : this.dietTagOptions;
        if (!list.includes(tagValue)) list.push(tagValue);
      }
    },
    /** 删除自定义标签选项 */
    async removeCustomTag(id) {
      try {
        await api.deleteTagOption(id);
      } catch (e) {}
      await this.fetchTagOptions();
    }
  }
});
