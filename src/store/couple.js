/**
 * 情侣配对 Store（v2 - 注册/登录/配对三段式）
 * -----------------------------------------------------------------------------
 * 流程：注册(选角色+用户名+密码) → 登录 → 配对(生成/输入邀请码) → 进入首页
 *
 * 角色规则：
 * 1) 注册时选择角色，之后不可更改
 * 2) 女友端(girlfriend)：点餐、上传菜品、饮食档案、下单
 * 3) 男友端(boyfriend)：接单、菜品管理(会做/不会做)、伴侣档案(只读)
 * 4) Demo 模式保留，跳过注册登录直接体验
 */
import { defineStore } from 'pinia';
import { storage } from '@/utils/storage';
import { api, setToken, clearToken, getToken } from '@/utils/api';
import { resolveUrl } from '@/utils/server';
import { themeStyle, defaultPresetForRole, fontStyleObj, applyFontFamily } from '@/utils/theme';
import { useDishStore } from './dish';
import { useOrderStore } from './order';
import { useAddressStore } from './address';
import { usePreferenceStore } from './preference';
import { useCartStore } from './cart';

function absAvatar(u) {
  if (!u || !u.id) return null;
  if (!u.avatar) return u;
  if (u.avatar.startsWith('http')) return u;
  return { ...u, avatar: resolveUrl(u.avatar) };
}

const COUPLE_KEY = 'oc_couple';
const MIN_FETCH_INTERVAL = 2000; // 情侣资料最小拉取间隔 2s

const DEFAULT_STATE = {
  userId: '',
  username: '',
  coupleId: '',
  isBound: false,
  role: '',
  inviteCode: '',
  me: {},
  partner: {},
  boundAt: 0,
  online: true,
  lastFetchAt: 0,
  themeColor: '',
  fontFamily: '',
  pageConfig: '',
  expandConfig: '',
  useDefaultDishes: true
};

function defaultSelfName(role) {
  return role === 'boyfriend' ? '大厨哥' : '小馋猫';
}
function defaultPartnerName(role) {
  return role === 'boyfriend' ? '小馋猫' : '大厨哥';
}

const DEMO_COUPLE_GF = {
  userId: 'gf_001',
  username: '',
  coupleId: 'couple_demo_001',
  isBound: true,
  role: 'girlfriend',
  inviteCode: 'LOVE2024',
  me: { id: 'gf_001', nickname: '小馋猫', avatar: '', gender: 'female', themeColor: '' },
  partner: { id: 'bf_001', nickname: '大厨哥', avatar: '', gender: 'male', themeColor: '' },
  boundAt: Date.now(),
  themeColor: '',
  fontFamily: '',
  pageConfig: ''
};

const DEMO_COUPLE_BF = {
  userId: 'bf_001',
  username: '',
  coupleId: 'couple_demo_001',
  isBound: true,
  role: 'boyfriend',
  inviteCode: 'LOVE2024',
  me: { id: 'bf_001', nickname: '大厨哥', avatar: '', gender: 'male', themeColor: '' },
  partner: { id: 'gf_001', nickname: '小馋猫', avatar: '', gender: 'female', themeColor: '' },
  boundAt: Date.now(),
  themeColor: '',
  fontFamily: '',
  pageConfig: ''
};

export const useCoupleStore = defineStore('couple', {
  state: () => {
    // 启动时立即从本地恢复持久化数据，避免首屏（如 PageLoading）读到空主题/角色
    const saved = storage.get(COUPLE_KEY, null);
    return { ...DEFAULT_STATE, ...(saved || {}) };
  },
  getters: {
    isGirlfriend: (s) => s.role === 'girlfriend',
    isBoyfriend: (s) => s.role === 'boyfriend',
    isDemo: (s) => s.coupleId === 'couple_demo_001',
    isLoggedIn: (s) => !!s.userId && !!getToken(),
    isPaired: (s) => !!s.coupleId && s.isBound,
    partnerNickname: (s) => (s.partner && s.partner.nickname) || '另一半',
    myNickname: (s) => (s.me && s.me.nickname) || '我',
    myDisplayName: (s) => (s.me && s.me.nickname) || defaultSelfName(s.role) || '我',
    partnerDisplayName: (s) =>
      (s.me && s.me.partnerCallName) ||
      (s.partner && s.partner.nickname) ||
      defaultPartnerName(s.role) ||
      '另一半',
    themeStyle: (s) => ({
      ...themeStyle(s.me?.themeColor || s.themeColor, s.role),
      ...fontStyleObj(s.fontFamily)
    }),
    themeClass: (s) => (s.role === 'boyfriend' ? 'bf-theme' : 'gf-theme'),
    currentThemeKey: (s) => s.me?.themeColor || s.themeColor || defaultPresetForRole(s.role),
    currentFontKey: (s) => s.fontFamily || 'system',
    /** 解析后的页面配置对象，空配置返回 {} 表示全部默认显示 */
    pageConfigParsed: (s) => {
      const raw = (s.me?.pageConfig || s.pageConfig || '').trim();
      if (!raw) return {};
      try { return JSON.parse(raw); } catch (e) { return {}; }
    },
    /** 解析后的折叠面板默认展开配置
     *  返回格式: { customized: true, sections: [...] } 或 null (null 表示未自定义，使用前端默认)
     */
    expandConfigParsed: (s) => {
      const raw = (s.me?.expandConfig || s.expandConfig || '').trim();
      if (!raw) return null;
      try {
        const obj = JSON.parse(raw);
        if (obj && typeof obj === 'object' && 'customized' in obj) return obj;
        return null;
      } catch (e) {
        return null;
      }
    }
  },
  actions: {
    init() {
      const saved = storage.get(COUPLE_KEY, null);
      if (saved) {
        Object.assign(this, saved);
      } else {
        Object.assign(this, DEFAULT_STATE);
        this.persist();
      }
      // 校验 Token 是否存在,若 userId 存在但 token 缺失则清除登录态
      if (this.userId && !getToken()) {
        this.logout();
      }
    },
    persist() {
      storage.set(COUPLE_KEY, {
        userId: this.userId,
        username: this.username,
        coupleId: this.coupleId,
        isBound: this.isBound,
        role: this.role,
        inviteCode: this.inviteCode,
        me: this.me,
        partner: this.partner,
        boundAt: this.boundAt,
        themeColor: this.themeColor,
        fontFamily: this.fontFamily,
        pageConfig: this.pageConfig,
        expandConfig: this.expandConfig,
        useDefaultDishes: this.useDefaultDishes
      });
    },
    /** 注册 */
    async register(username, password, role, nickname) {
      try {
        const data = await api.register(username, password, role, nickname);
        if (data.token) {
          setToken(data.token);
        }
        this.userId = data.userId;
        this.username = username;
        this.role = data.role;
        this.coupleId = '';
        this.isBound = false;
        this.me = { id: data.userId, nickname: data.nickname, avatar: '', gender: role === 'girlfriend' ? 'female' : 'male' };
        this.partner = {};
        this.online = true;
        this.persist();
        return { ok: true };
      } catch (e) {
        return { ok: false, msg: e.message || '注册失败' };
      }
    },
    /** 登录 */
    async login(username, password) {
      try {
        const data = await api.login(username, password);
        if (data.token) {
          setToken(data.token);
        }
        this.userId = data.userId;
        this.username = username;
        this.role = data.role;
        this.coupleId = data.coupleId || '';
        this.isBound = data.isBound || false;
        this.inviteCode = data.inviteCode || '';
        const meRaw = {
        id: data.userId,
        nickname: data.nickname,
        avatar: data.avatar || '',
        'themeColor': data.themeColor || '',
        'fontFamily': data.fontFamily || '',
        'partnerCallName': data.partnerCallName || '',
        'pageConfig': data.pageConfig || '',
        gender: data.role === 'girlfriend' ? 'female' : 'male'
      };
        this.me = absAvatar(meRaw);
        this.partner = {};
        this.themeColor = data.themeColor || '';
        this.fontFamily = data.fontFamily || '';
        this.pageConfig = data.pageConfig || '';
        this.expandConfig = data.expandConfig || '';
        this.online = true;
        // 已配对则拉取双方资料
        if (this.coupleId && this.isBound) {
          await this.fetchFromServer();
        }
        this.persist();
        return { ok: true, isBound: this.isBound };
      } catch (e) {
        return { ok: false, msg: e.message || '登录失败' };
      }
    },
    async fetchFromServer(force = false) {
      if (!this.userId || !this.isLoggedIn || !this.coupleId || this.isDemo) return;
      // 非强制拉取时遵守最小间隔
      if (!force && Date.now() - (this.lastFetchAt || 0) < MIN_FETCH_INTERVAL) return;
      try {
        const data = await api.getCouple(this.coupleId);
        if (data) {
          if (this.role === 'girlfriend') {
            const gf = absAvatar(data.girlfriend);
            const bf = absAvatar(data.boyfriend);
            if (gf) this.me = gf;
            if (bf) this.partner = bf;
          } else {
            const bf = absAvatar(data.boyfriend);
            const gf = absAvatar(data.girlfriend);
            if (bf) this.me = bf;
            if (gf) this.partner = gf;
          }
          // 同步自己的主题色和字体（自己端以自身为准）
          this.themeColor = (this.me && this.me.themeColor) || this.themeColor || '';
          this.fontFamily = (this.me && this.me.fontFamily) || this.fontFamily || '';
          this.pageConfig = (this.me && this.me.pageConfig) || this.pageConfig || '';
          this.expandConfig = (this.me && this.me.expandConfig) || this.expandConfig || '';
          // 同步情侣级别的设置
          if (data.useDefaultDishes !== undefined) {
            this.useDefaultDishes = data.useDefaultDishes;
          }
          // 同步自己对对方的爱称（只有自己能修改自己的 partnerCallName）
          if (this.me && this.me.partnerCallName === undefined) {
            this.me = { ...this.me, partnerCallName: '' };
          }
          this.inviteCode = data.inviteCode || this.inviteCode;
          this.boundAt = data.boundAt || this.boundAt;
          // 后端以双方资料都存在为已配对；始终以后端状态为准，避免本地状态滞后
          const bound = !!(data.girlfriend && data.boyfriend);
          this.isBound = bound;
          if (bound && !this.boundAt) {
            this.boundAt = data.boundAt || Date.now();
          }
          this.online = true;
          this.lastFetchAt = Date.now();
          this.persist();
        }
      } catch (e) {
        this.online = false;
        // 情侣不存在（coupleId 失效）：只清配对状态，保留登录态，跳配对页
        if (e && (e.code === 404 || (e.message && e.message.includes('情侣不存在')))) {
          this.coupleId = '';
          this.isBound = false;
          this.inviteCode = '';
          this.partner = {};
          this.persist();
          uni.reLaunch({ url: '/pages/pairing/pairing' });
        }
      }
    },
    /** 生成邀请码（登录后调用） */
    async generateInvite() {
      if (!this.userId) return { ok: false, msg: '请先登录' };
      try {
        const data = await api.generateInvite(this.userId);
        this.coupleId = data.coupleId;
        this.inviteCode = data.inviteCode;
        // 后端会返回当前是否已配对（另一方已加入时）
        const bound = !!data.isBound;
        this.isBound = bound;
        if (bound) {
          this.boundAt = data.boundAt || Date.now();
          await this.fetchFromServer();
        }
        this.online = true;
        this.persist();
        return { ok: true, inviteCode: data.inviteCode, isBound: bound };
      } catch (e) {
        if (e.code === -1) this.online = false;
        return { ok: false, msg: e.message || '生成失败' };
      }
    },
    /** 用邀请码配对（登录后调用） */
    async bindWithCode(code) {
      if (!this.userId) return { ok: false, msg: '请先登录' };
      if (!code) return { ok: false, msg: '请输入邀请码' };
      try {
        const data = await api.joinCouple(this.userId, code.toUpperCase());
        this.coupleId = data.coupleId;
        this.isBound = true;
        this.boundAt = Date.now();
        await this.fetchFromServer();
        this.persist();
        return { ok: true };
      } catch (e) {
        if (e.code === -1) this.online = false;
        return { ok: false, msg: e.message || '邀请码有误或网络异常' };
      }
    },
    /** 更新我的昵称头像 / 主题色 */
    async updateMe(data) {
      this.me = { ...this.me, ...data };
      if (data.themeColor !== undefined) {
        this.themeColor = data.themeColor;
      }
      this.persist();
      if (this.online && this.me.id && !this.isDemo) {
        try {
          const res = await api.updateProfile({ userId: this.me.id, ...data });
          if (res && res.nickname !== undefined) {
            // 后端返回的头像可能是相对路径，转绝对路径后再写入本地，避免显示断裂
            const normalized = absAvatar({ ...this.me, nickname: res.nickname, avatar: res.avatar });
            this.me = { ...this.me, nickname: normalized.nickname, avatar: normalized.avatar };
            this.persist();
          }
          // 更新后立即同步一次情侣资料，让自己端状态最新，也让对方端下一轮同步能拿到新头像/昵称/主题色
          await this.fetchFromServer(true).catch(() => {});
        } catch (e) {
          this.online = false;
        }
      }
    },
    /** 更新主题色（同时同步后端） */
    async updateThemeColor(themeKey) {
      if (!this.me.id || this.isDemo) {
        this.me = { ...this.me, themeColor: themeKey };
        this.themeColor = themeKey;
        this.persist();
        return;
      }
      try {
        await api.updateProfile({ userId: this.me.id, themeColor: themeKey });
        this.me = { ...this.me, themeColor: themeKey };
        this.themeColor = themeKey;
        this.persist();
      } catch (e) {
        // 离线时仅本地生效
        this.me = { ...this.me, themeColor: themeKey };
        this.themeColor = themeKey;
        this.persist();
      }

    },
    /** 更新字体（同步后端） */
    async updateFont(fontKey) {
      const key = fontKey || '';
      this.fontFamily = key;
      this.me = { ...this.me, fontFamily: key };
      this.persist();
      // 立即把字体变量同步到页面根节点，H5 可直接生效
      applyFontFamily(key);
      if (this.online && this.me.id && !this.isDemo) {
        try {
          await api.updateProfile({ userId: this.me.id, fontFamily: key });
          await this.fetchFromServer(true).catch(() => {});
        } catch (e) {
          this.online = false;
        }
      }

    },
    /** 更新页面模块显示配置（同步后端）
     *  config 为对象，如 { dietProfile: true, favorites: false, ... }
     *  存储为 JSON 字符串，空字符串表示默认全部显示
     */
    async updatePageConfig(config) {
      const str = config && Object.keys(config).length > 0 ? JSON.stringify(config) : '';
      this.pageConfig = str;
      this.me = { ...this.me, pageConfig: str };
      this.persist();
      if (this.online && this.me.id && !this.isDemo) {
        try {
          await api.updateProfile({ userId: this.me.id, pageConfig: str });
        } catch (e) {
          this.online = false;
        }
      }
    },

    /** 更新折叠面板默认展开配置（同步后端）
     *  sections 为数组，如 ['dietProfile', 'favorites']
     *  存储为 JSON 字符串: { customized: true, sections: [...] }
     */
    async updateExpandConfig(sections) {
      const payload = { customized: true, sections: Array.isArray(sections) ? sections : [] };
      const str = JSON.stringify(payload);
      this.expandConfig = str;
      this.me = { ...this.me, expandConfig: str };
      this.persist();
      if (this.online && this.me.id && !this.isDemo) {
        try {
          await api.updateProfile({ userId: this.me.id, expandConfig: str });
        } catch (e) {
          this.online = false;
        }
      }
    },

    /** 清空折叠面板配置，回退到默认行为（默认全部展开） */
    async resetExpandConfig() {
      const str = '';
      this.expandConfig = str;
      this.me = { ...this.me, expandConfig: str };
      this.persist();
      if (this.online && this.me.id && !this.isDemo) {
        try {
          await api.updateProfile({ userId: this.me.id, expandConfig: str });
        } catch (e) {
          this.online = false;
        }
      }
    },

    /** 更新是否使用默认菜品（情侣级设置） */
    async updateUseDefaultDishes(enabled) {
      this.useDefaultDishes = !!enabled;
      this.persist();
      if (this.online && this.coupleId && !this.isDemo) {
        try {
          await api.updateCoupleSettings({
            coupleId: this.coupleId,
            useDefaultDishes: !!enabled
          });
        } catch (e) {
          this.online = false;
        }
      }
    },

    /** 更新伴侣头像（女友端给男友换头像） */
    async updatePartnerAvatar(url) {
      if (!this.partner || !this.partner.id) return;
      const normalized = resolveUrl(url);
      // 先乐观更新本地，让 UI 立刻反馈
      this.partner = { ...this.partner, avatar: normalized };
      this.persist();
      try {
        const res = await api.updateUser(this.partner.id, { avatar: url });
        // 后端返回的 avatar 可能是相对路径，转绝对路径保持一致
        this.partner = { ...this.partner, avatar: resolveUrl(res && res.avatar ? res.avatar : url) };
        this.persist();
      } catch (e) {
        // 离线时保留本地已乐观更新的头像
        this.online = false;
      }
    },
    /** 退出登录 */
    logout() {
      // 通知后端注销 Token(忽略网络错误)
      api.logout().catch(() => {});
      clearToken();
      const rememberAuth = storage.get('oc_remember_auth', null);
      storage.clear();
      if (rememberAuth) {
        storage.set('oc_remember_auth', rememberAuth);
      }
      // 清空所有 store 内存数据
      useDishStore().clear();
      Object.assign(this, DEFAULT_STATE);
    },
    /** Demo 模式 */
    useDemo(role = 'girlfriend') {
      clearToken();
      const demo = role === 'boyfriend' ? DEMO_COUPLE_BF : DEMO_COUPLE_GF;
      Object.assign(this, JSON.parse(JSON.stringify(demo)));
      this.online = true;
      this.persist();
      // 游客模式下清空所有 store 数据,避免泄露上一个登录用户的信息
      useDishStore().clear();
      useOrderStore().clear?.();
      useAddressStore().clear?.();
      usePreferenceStore().clear?.();
      useCartStore().clear?.();
      // 同时清理本地持久化数据
      storage.remove('oc_orders');
      storage.remove('oc_addresses');
      storage.remove('oc_preferences');
      storage.remove('oc_favorites');
      storage.remove('oc_cart');
    },
    /** 解绑伴侣 */
    async unbind() {
      if (this.online && this.coupleId && !this.isDemo) {
        try { await api.unbind(this.coupleId); } catch (e) {}
      }
      this.isBound = false;
      this.coupleId = '';
      this.boundAt = 0;
      this.persist();
    }
  }
});
