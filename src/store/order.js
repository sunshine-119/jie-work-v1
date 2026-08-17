import { defineStore } from 'pinia';
import { storage } from '@/utils/storage';
import { api } from '@/utils/api';
import { useCoupleStore } from './couple';
import { useDishStore } from './dish';

const ORDER_KEY = 'oc_orders';
const MIN_FETCH_INTERVAL = 5000; // 最小拉取间隔 5s，配合 8s 轮询保证两端近实时同步

/**
 * 订单状态机
 * -----------------------------------------------------------------------------
 * 0 待接单  - 女友刚下单，等男友接单
 * 1 制作中  - 男友已接单，开始备餐
 * 2 做好啦  - 男友制作完成，等女友享用 / 等外卖送达
 * 3 已完成  - 女友确认吃完，可打分评价（永久存档到回忆相册）
 * 4 已取消  - 女友主动取消
 * 5 已拒绝  - 男友拒绝（必须填写拒绝理由，女友端会展示理由 + 安抚文案）
 */
export const ORDER_STATUS = {
  0: { text: '待接单', color: '#E8B86C' },
  1: { text: '制作中', color: '#FF9966' },
  2: { text: '开饭啦', color: '#7FB6A8' },
  3: { text: '已完成', color: '#7FB6A8' },
  4: { text: '已取消', color: '#C9BFC4' },
  5: { text: '已拒绝', color: '#E08B8B' }
};

let orderSeq = 1000;

function nowTs() { return Date.now(); }

export const useOrderStore = defineStore('order', {
  state: () => ({
    orders: [],
    online: true, // 是否走后端 API，失败时自动降级
    fetching: false, // 防止并发请求
    lastFetchAt: 0 // 上次成功拉取时间
  }),
  getters: {
    allOrders: (s) =>
      [...s.orders].sort((a, b) => b.createdAt - a.createdAt),
    activeOrders: (s) =>
      s.orders
        .filter((o) => o.status >= 0 && o.status <= 2)
        .sort((a, b) => b.createdAt - a.createdAt),
    historyOrders: (s) =>
      s.orders
        .filter((o) => o.status === 3)
        .sort((a, b) => b.createdAt - a.createdAt),
    cancelledOrders: (s) =>
      s.orders
        .filter((o) => o.status === 4)
        .sort((a, b) => b.createdAt - a.createdAt),
    rejectedOrders: (s) =>
      s.orders
        .filter((o) => o.status === 5)
        .sort((a, b) => b.createdAt - a.createdAt),
    memoryOrders: (s) =>
      s.orders
        .filter((o) => o.status === 3)
        .sort((a, b) => b.createdAt - a.createdAt),
    getById: (s) => (id) => s.orders.find((o) => o.id === id)
  },
  actions: {
    init() {
      const couple = useCoupleStore();
      // 游客模式下不展示任何真实订单数据
      this.orders = couple.isDemo ? [] : storage.get(ORDER_KEY, []);
      const maxSeq = this.orders.reduce((m, o) => Math.max(m, Number(o.no) || 0), 1000);
      orderSeq = maxSeq;
      // 不再在 init 时主动拉取，统一由 App.vue 全局同步器调度，
      // 避免每个页面 onShow 都触发 /orders 请求。
    },
    async fetchFromServer(force = false) {
      if (this.fetching) return;
      const couple = useCoupleStore();
      // 未登录 / 未配对 / Demo 模式均不走后端拉取
      if (!couple.isLoggedIn || !couple.coupleId || couple.isDemo) return;
      this.fetching = true;
      // 非强制拉取时，遵守最小间隔，避免 tab 切换 / 轮询导致频繁请求
      if (!force && Date.now() - this.lastFetchAt < MIN_FETCH_INTERVAL) {
        this.fetching = false;
        return;
      }
      try {
        const list = await api.listOrders(couple.coupleId, 'all');
        const serverIds = new Set((list || []).map((o) => o.id));
        // 保留本地暂存但服务端尚不存在的订单（创建后立刻拉取可能延迟）
        const locals = this.orders.filter((o) => !serverIds.has(o.id));
        this.orders = [...(list || []), ...locals].sort((a, b) => b.createdAt - a.createdAt);
        this.online = true;
        this.lastFetchAt = Date.now();
        this.persist();
      } catch (e) {
        this.online = false;
        // 失败也记录时间，避免失败场景下立即重试导致频繁请求
        this.lastFetchAt = Date.now();
      } finally {
        this.fetching = false;
      }
    },
    /** 根据 ID 从后端拉取单个订单（详情页兜底） */
    async fetchById(id, force = false) {
      if (!id) return null;
      // 同一订单 5s 内非强制不重复拉取，避免详情页 onShow / 轮询叠加
      const key = `_fetchById_${id}`;
      const last = this[key] || 0;
      if (!force && Date.now() - last < 5000) return this.getById(id);
      this[key] = Date.now();
      try {
        const o = await api.getOrder(id);
        if (o) this._upsertLocal(o);
        return o;
      } catch (e) {
        this.online = false;
        return null;
      }
    },
    persist() {
      storage.set(ORDER_KEY, this.orders);
    },
    _upsertLocal(order) {
      const idx = this.orders.findIndex((o) => o.id === order.id);
      if (idx >= 0) this.orders[idx] = order;
      else this.orders.unshift(order);
      this.persist();
      return order;
    },

    /**
     * 创建订单
     */
    async create(payload) {
      const couple = useCoupleStore();
      // 只要有 coupleId 就优先走后端，失败再本地降级
      if (couple.coupleId) {
        try {
          const body = {
            coupleId: couple.coupleId,
            girlId: couple.me?.id || 'gf_local',
            type: payload.type,
            dineMode: payload.dineMode || 'now',
            reserveTime: payload.reserveTime || '',
            table: payload.table || {},
            address: payload.address || {},
            items: payload.items.map((i) => ({
              id: i.id, name: i.name, price: i.price, qty: i.qty,
              emoji: i.emoji || '🍽️', bgColor: i.bgColor || '',
              image: i.image || '',
              spicy: i.spicy || 0, dietNote: i.dietNote || '',
              isCustom: !!i.isCustom
            })),
            remark: payload.remark || '',
            sweetNote: payload.sweetNote || '',
            people: payload.people || 2
          };
          const order = await api.createOrder(body);
          this._upsertLocal(order);
          this.online = true;
          // 创建成功后由全局同步器在 5s 内同步，不再立即拉取全量列表，
          // 减少创建瞬间的 /orders 并发请求。
          return order;
        } catch (e) {
          this.online = false;
        }
      }
      // 本地降级
      return this._createLocal(payload);
    },
    _createLocal({ type, table, address, items, remark, sweetNote, dineMode, reserveTime, people }) {
      const couple = useCoupleStore();
      const id = `O${Date.now()}`;
      const no = ++orderSeq;
      const order = {
        id, no, type, dineMode,
        reserveTime: reserveTime || '',
        table: table || null,
        address: address || null,
        items: items.map((i, idx) => ({ ...i, itemId: `${id}_${idx}` })),
        remark: remark || '', sweetNote: sweetNote || '', people: people || 0,
        status: 0, createdAt: nowTs(),
        timeline: [{ label: couple.myDisplayName + '下单啦', time: nowTs(), done: true }],
        urges: [], rejectReason: '',
        rating: 0, ratingComment: '', ratedAt: 0
      };
      this.orders.unshift(order);
      this.persist();
      return order;
    },

    async accept(id) {
      if (this.online) {
        try { const o = await api.acceptOrder(id); this._upsertLocal(o); return o; }
        catch (e) { this.online = false; }
      }
      const couple = useCoupleStore();
      const o = this.orders.find((x) => x.id === id);
      if (!o || o.status !== 0) return;
      o.status = 1;
      o.timeline.push({ label: couple.myDisplayName + '已接单', time: nowTs(), done: true });
      this.persist();
    },
    async finish(id) {
      if (this.online) {
        try { const o = await api.completeCooking(id); this._upsertLocal(o); return o; }
        catch (e) { this.online = false; }
      }
      const o = this.orders.find((x) => x.id === id);
      if (!o || o.status !== 1) return;
      o.status = 2;
      o.timeline.push({ label: '开饭啦', time: nowTs(), done: true });
      this.persist();
    },
    async complete(id) {
      if (this.online) {
        try {
          const o = await api.finishOrder(id);
          this._upsertLocal(o);
          // 订单完成后刷新菜品 sales 数据
          setTimeout(() => {
            try { const dishStore = useDishStore(); dishStore.fetchAll(); } catch (e) {}
          }, 1000);
          return o;
        }
        catch (e) { this.online = false; }
      }
      const o = this.orders.find((x) => x.id === id);
      if (!o || o.status !== 2) return;
      o.status = 3;
      o.timeline.push({ label: '吃光光啦', time: nowTs(), done: true });
      this.persist();
      // 订单完成后刷新菜品 sales 数据
      setTimeout(() => {
        try { const dishStore = useDishStore(); dishStore.fetchAll(); } catch (e) {}
      }, 1000);
    },
    /** 稍后再做 */
    async later(id) {
      if (this.online) {
        try { const o = await api.laterOrder(id); this._upsertLocal(o); return o; }
        catch (e) { this.online = false; }
      }
    },
    advance(id) {
      const couple = useCoupleStore();
      const o = this.orders.find((x) => x.id === id);
      if (!o || o.status >= 3 || o.status === 4 || o.status === 5) return;
      o.status += 1;
      const map = [couple.myDisplayName + '已接单', '开饭啦', '吃光光啦'];
      if (map[o.status - 1]) o.timeline.push({ label: map[o.status - 1], time: nowTs(), done: true });
      this.persist();
    },
    async cancel(id) {
      if (this.online) {
        try { const o = await api.cancelOrder(id); this._upsertLocal(o); return o; }
        catch (e) { this.online = false; }
      }
      const o = this.orders.find((x) => x.id === id);
      if (!o || o.status >= 3) return;
      o.status = 4;
      o.timeline.push({ label: '订单已取消', time: nowTs(), done: true });
      this.persist();
    },
    async reject(id, reason) {
      if (this.online) {
        try { const o = await api.rejectOrder(id, reason); this._upsertLocal(o); return o; }
        catch (e) { this.online = false; }
      }
      const couple = useCoupleStore();
      const o = this.orders.find((x) => x.id === id);
      if (!o || o.status !== 0) return;
      o.status = 5;
      o.rejectReason = reason || '暂时没法做';
      o.timeline.push({ label: couple.myDisplayName + '这次没法做', time: nowTs(), done: true });
      this.persist();
    },
    async urge(id) {
      if (this.online) {
        try { const r = await api.urgeOrder(id); return r.count; }
        catch (e) { this.online = false; }
      }
      const o = this.orders.find((x) => x.id === id);
      if (!o) return 0;
      o.urges.push({ time: nowTs() });
      this.persist();
      return o.urges.length;
    },
    async rate(id, rating, comment) {
      if (this.online) {
        try { await api.rateOrder(id, rating, comment); const o = this.getById(id); if (o) { o.rating = rating; o.ratingComment = comment; o.ratedAt = nowTs(); this.persist(); } return; }
        catch (e) { this.online = false; }
      }
      const o = this.orders.find((x) => x.id === id);
      if (!o || o.status !== 3) return;
      o.rating = Math.max(1, Math.min(5, rating));
      o.ratingComment = comment || '';
      o.ratedAt = nowTs();
      this.persist();
    },
    clear() {
      this.orders = [];
      storage.remove(ORDER_KEY);
    }
  }
});
