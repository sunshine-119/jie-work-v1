/**
 * 通道式轮询管理器
 * -----------------------------------------------------------------------------
 * 按通道分离轮询，页面 onShow 时 acquire，onHide 时 release，
 * 只有有订阅者的通道才运行定时器；应用切后台暂停全部，切回前台恢复。
 *
 * 通道：
 * - couple  → /couple/profile  8s  情侣资料（头像/昵称/主题/字体等）
 * - orders  → /orders          8s  订单列表（状态变更/新订单等）
 * - dishes  → /dishes          8s  菜品列表
 * - preferences → /preferences 10s 偏好设置
 * - miss    → /miss/latest     5s  想念点击（男友端专用，女友点击→男友弹窗）
 *
 * 规则：
 * 1. 必须处于登录状态且有 coupleId（或 isDemo）才发请求
 * 2. 通道引用计数 > 0 才启动定时器，归零即停止
 * 3. 应用切后台暂停所有通道，切回前台恢复有订阅者的通道
 * 4. 每个通道有独立 cooldown，防止前后台切换或页面快速切换时频繁请求
 * 5. 用户登出/Token 过期时，stopAll() 强制停止所有通道，防止残留请求
 */
import { onShow, onHide, onUnload } from '@dcloudio/uni-app';
import { useCoupleStore } from '@/store/couple';
import { useOrderStore } from '@/store/order';
import { useDishStore } from '@/store/dish';
import { usePreferenceStore } from '@/store/preference';
import { api, getToken } from './api';

// ── 通道配置 ──
const CHANNELS = {
  couple: { interval: 8000, cooldown: 5000 },
  orders: { interval: 8000, cooldown: 5000 },
  dishes: { interval: 8000, cooldown: 5000 },
  preferences: { interval: 10000, cooldown: 5000 },
  miss: { interval: 5000, cooldown: 3000 }
};

// ── 通道状态 ──
const channelState = {};
for (const key of Object.keys(CHANNELS)) {
  channelState[key] = { count: 0, timer: null, lastTick: 0, fetching: false };
}

// ── miss 专用状态 ──
let lastMissId = '';
let lastMissCount = 0;
let missShowing = false;

let appVisible = true;
let forceStopped = false;

// ── 通用守卫：检查登录状态 ──
function canPoll() {
  if (forceStopped) return false;
  const couple = useCoupleStore();
  // 游客模式不轮询,使用本地 mock 数据即可
  if (couple.isDemo) return false;
  if (!couple.isLoggedIn) return false;
  if (!getToken()) return false;
  return true;
}

// ── 各通道 tick 函数 ──
function tickCouple() {
  const s = channelState.couple;
  if (s.fetching) return;
  if (Date.now() - s.lastTick < CHANNELS.couple.cooldown) return;
  if (!canPoll()) return;
  const couple = useCoupleStore();
  s.fetching = true;
  s.lastTick = Date.now();
  couple.fetchFromServer().catch(() => {}).finally(() => {
    s.fetching = false;
  });
}

function tickOrders() {
  const s = channelState.orders;
  if (s.fetching) return;
  if (Date.now() - s.lastTick < CHANNELS.orders.cooldown) return;
  if (!canPoll()) return;
  const couple = useCoupleStore();
  if (!couple.coupleId && !couple.isDemo) return;
  s.fetching = true;
  s.lastTick = Date.now();
  const order = useOrderStore();
  order.fetchFromServer().catch(() => {}).finally(() => {
    s.fetching = false;
  });
}

function tickDishes() {
  const s = channelState.dishes;
  if (s.fetching) return;
  if (Date.now() - s.lastTick < CHANNELS.dishes.cooldown) return;
  if (!canPoll()) return;
  const couple = useCoupleStore();
  if (!couple.coupleId && !couple.isDemo) return;
  s.fetching = true;
  s.lastTick = Date.now();
  const dish = useDishStore();
  dish.fetchAll().catch(() => {}).finally(() => {
    s.fetching = false;
  });
}

function tickPreferences() {
  const s = channelState.preferences;
  if (s.fetching) return;
  if (Date.now() - s.lastTick < CHANNELS.preferences.cooldown) return;
  if (!canPoll()) return;
  const couple = useCoupleStore();
  if (!couple.coupleId && !couple.isDemo) return;
  s.fetching = true;
  s.lastTick = Date.now();
  const pref = usePreferenceStore();
  pref.fetchFromServer().catch(() => {}).finally(() => {
    s.fetching = false;
  });
}

async function tickMiss() {
  const s = channelState.miss;
  if (s.fetching || missShowing) return;
  if (!canPoll()) return;
  const couple = useCoupleStore();
  if (!couple.isBoyfriend || !couple.coupleId || couple.isDemo) return;
  s.fetching = true;
  s.lastTick = Date.now();
  try {
    const res = await api.getLatestMiss(couple.coupleId);
    const miss = res && res.miss;
    if (!miss || !miss.id) return;
    if (miss.id === lastMissId && miss.count <= lastMissCount) return;
    lastMissId = miss.id;
    lastMissCount = miss.count || 1;
    missShowing = true;
    const name = couple.partnerDisplayName || 'TA';
    uni.showModal({
      title: `${name}想你啦`,
      content: `${name}在暖心角点了 ${miss.count} 次'想你了'，快去回应一下吧～`,
      showCancel: false,
      confirmText: '我也想你',
      confirmColor: couple.themeStyle['--c-primary'] || '#7BA5D9'
    });
    api.markMissRead(miss.id).catch(() => {});
    setTimeout(() => {
      missShowing = false;
    }, 800);
  } catch (e) {
    // 静默失败，避免网络波动时弹错
  } finally {
    s.fetching = false;
  }
}

const TICKERS = { couple: tickCouple, orders: tickOrders, dishes: tickDishes, preferences: tickPreferences, miss: tickMiss };

// ── 内部：启停单个通道 ──
function startChannel(ch) {
  const s = channelState[ch];
  if (s.timer) return;
  // 首次启动立即 tick（受 cooldown 保护，不会重复请求）
  TICKERS[ch]();
  s.timer = setInterval(() => {
    if (!appVisible || forceStopped) return;
    TICKERS[ch]();
  }, CHANNELS[ch].interval);
}

function stopChannel(ch) {
  const s = channelState[ch];
  if (s.timer) {
    clearInterval(s.timer);
    s.timer = null;
  }
  s.fetching = false;
}

// ── 对外 API ──
export const pollManager = {
  /** 页面 onShow 时调用，订阅指定通道 */
  acquire(ch) {
    const s = channelState[ch];
    if (!s) return;
    s.count++;
    if (s.count === 1 && appVisible && !forceStopped) {
      startChannel(ch);
    }
  },
  /** 页面 onHide 时调用，取消订阅 */
  release(ch) {
    const s = channelState[ch];
    if (!s) return;
    s.count = Math.max(0, s.count - 1);
    if (s.count === 0) {
      stopChannel(ch);
    }
  },
  /** 应用切后台：暂停所有通道定时器（不改变引用计数） */
  pauseAll() {
    appVisible = false;
    for (const ch of Object.keys(channelState)) {
      const s = channelState[ch];
      if (s.timer) {
        clearInterval(s.timer);
        s.timer = null;
      }
    }
  },
  /** 应用回前台：恢复有订阅者的通道 */
  resumeAll() {
    appVisible = true;
    if (forceStopped) return;
    for (const ch of Object.keys(channelState)) {
      const s = channelState[ch];
      if (s.count > 0 && !s.timer) {
        startChannel(ch);
      }
    }
  },
  /**
   * 强制停止所有通道（登出/Token 过期时调用）
   * 清除所有定时器，重置引用计数，防止残留请求
   */
  stopAll() {
    forceStopped = true;
    for (const ch of Object.keys(channelState)) {
      const s = channelState[ch];
      if (s.timer) {
        clearInterval(s.timer);
        s.timer = null;
      }
      s.fetching = false;
      s.count = 0;
    }
    lastMissId = '';
    lastMissCount = 0;
    missShowing = false;
  },
  /** 重新登录后恢复轮询 */
  resumeAfterLogin() {
    forceStopped = false;
  },
  /** 强制立即 tick 指定通道（跳过 cooldown） */
  forceTick(ch) {
    const s = channelState[ch];
    if (!s) return;
    s.lastTick = 0;
    TICKERS[ch]();
  },
  /** 重置 miss 状态 */
  resetMiss() {
    lastMissId = '';
    lastMissCount = 0;
    missShowing = false;
  }
};

/**
 * 页面级 composable：在 onShow 时自动 acquire，onHide/onUnload 时自动 release
 * 用法：在页面 <script setup> 顶部调用 usePoll(['couple', 'orders'])
 * @param {string[]} channels - 需要轮询的通道名数组
 */
export function usePoll(channels) {
  const acquire = () => channels.forEach((ch) => pollManager.acquire(ch));
  const release = () => channels.forEach((ch) => pollManager.release(ch));
  onShow(acquire);
  onHide(release);
  onUnload(release);
}
