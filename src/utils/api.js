/**
 * 统一 HTTP 请求封装
 * -----------------------------------------------------------------------------
 * 对接 Python Flask 后端
 * 使用 uni.request，自动处理 baseURL、错误提示、JSON 解析、Token 携带
 * 基地址由 serverConfig 统一管理（dev 本地 / prod 线上），见 server.js
 */

import { serverConfig } from './server';
import { toast } from './toast';
import { isDemoMode } from './auth';
import { storage } from './storage';
import { encryptPassword } from './crypto';
import { pollManager } from './sync';
import { useCoupleStore } from '@/store/couple';

const TOKEN_KEY = 'oc_token';
let reLaunching = false;

function handle401() {
  if (reLaunching) return;
  // 游客模式下不触发 401 跳转(游客本就无 token)
  if (isDemoMode()) return;
  reLaunching = true;
  // 1. 立即停止所有轮询，防止残留请求
  pollManager.stopAll();
  // 2. 清除 token 和本地持久化
  clearToken();
  storage.remove('oc_couple');
  // 3. 重置 store 内存状态
  try {
    const couple = useCoupleStore();
    couple.logout();
  } catch (e) {}
  // 4. 显示提示并跳转
  toast.error('登录已过期,请重新登录');
  setTimeout(() => {
    uni.reLaunch({ url: '/pages/login/login' });
    setTimeout(() => { reLaunching = false; }, 500);
  }, 1500);
}

// 游客模式下仍允许调用的写入接口（登录/注册）
const DEMO_ALLOW_POST = ['/api/user/login', '/api/user/register'];

// 公开接口:401 不触发登出(登录/注册时密码错误返回 401 属于业务错误)
const PUBLIC_AUTH_ENDPOINTS = ['/api/user/login', '/api/user/register'];

class APIError extends Error {
  constructor(code, msg) {
    super(msg);
    this.code = code;
  }
}

/** 获取本地存储的 Token */
export function getToken() {
  return storage.get(TOKEN_KEY, '');
}

/** 保存 Token 到本地 */
export function setToken(token) {
  storage.set(TOKEN_KEY, token);
}

/** 清除 Token */
export function clearToken() {
  storage.remove(TOKEN_KEY);
}

function request(method, url, data) {
  return new Promise((resolve, reject) => {
    // 游客模式禁止所有后端请求(登录/注册除外),使用本地 mock 数据
    if (isDemoMode() && !DEMO_ALLOW_POST.some((u) => url.startsWith(u))) {
      reject(new APIError(-2, '体验模式仅可预览'));
      return;
    }
    const header = {
      'Content-Type': 'application/json'
    };
    // 携带 Token（公开接口 register/login 不带也可,带了不影响）
    const token = getToken();
    if (token) {
      header['Authorization'] = 'Bearer ' + token;
    }
    const params = {
      url: serverConfig.getUrl() + url,
      method,
      header,
      timeout: 10000,
      success: (res) => {
        if (res.statusCode >= 200 && res.statusCode < 300 && res.data && res.data.code === 0) {
          resolve(res.data.data);
        } else if (res.statusCode === 401) {
          // 公开认证接口(登录/注册)的 401 属于业务错误(密码错误),不触发登出
          if (!PUBLIC_AUTH_ENDPOINTS.some((u) => url.startsWith(u))) {
            handle401();
          }
          const msg = (res.data && res.data.msg) || '用户名或密码错误';
          reject(new APIError(401, msg));
        } else {
          const msg = (res.data && res.data.msg) || `请求失败(${res.statusCode})`;
          const isStaleCouple = url.startsWith('/api/couple/profile') && res.statusCode === 404 && msg.includes('情侣不存在');
          if (!url.startsWith('/api/upload') && !isStaleCouple) {
            toast.error(msg);
          }
          reject(new APIError(res.data?.code || res.statusCode, msg));
        }
      },
      fail: (err) => {
        const msg = '网络异常';
        console.warn('[API] request failed:', url, err);
        reject(new APIError(-1, msg));
      }
    };
    if (data !== undefined && data !== null) {
      params.data = data;
    }
    uni.request(params);
  });
}

export const api = {
  // ── 用户注册 / 登录 ──
  register: (username, password, role, nickname) => {
    const encPwd = encryptPassword(password);
    return request('POST', '/api/user/register', { username, password: encPwd, role, nickname });
  },
  login: (username, password) => {
    const encPwd = encryptPassword(password);
    return request('POST', '/api/user/login', { username, password: encPwd });
  },
  logout: () =>
    request('POST', '/api/user/logout'),

  // ── 情侣配对（需先登录） ──
  generateInvite: (userId) =>
    request('POST', '/api/couple/bind', { action: 'generate', userId }),
  joinCouple: (userId, inviteCode) =>
    request('POST', '/api/couple/bind', { action: 'join', userId, inviteCode }),
  unbind: (coupleId) => request('POST', '/api/couple/unbind', { coupleId }),
  getCouple: (coupleId) => request('GET', `/api/couple/profile?coupleId=${coupleId}`),
  updateProfile: (payload) => request('PUT', '/api/couple/profile', payload),
  updateCoupleSettings: (payload) => request('PUT', '/api/couple/settings', payload),
  updateUser: (id, payload) => request('PUT', `/api/user/${id}`, payload),

  // ── 菜品 / 分类 ──
  getCategories: (coupleId = '') => {
    const qs = coupleId ? `?coupleId=${coupleId}` : '';
    return request('GET', `/api/categories${qs}`);
  },
  createCategory: (payload) => request('POST', '/api/categories', payload),
  updateCategory: (id, payload) => request('PUT', `/api/categories/${id}`, payload),
  deleteCategory: (id, coupleId) => {
    const qs = coupleId ? `?coupleId=${coupleId}` : '';
    return request('DELETE', `/api/categories/${id}${qs}`);
  },
  sortCategories: (payload) => request('PUT', '/api/categories/sort', payload),
  getTagOptions: (coupleId = '') => {
    const qs = coupleId ? `?coupleId=${coupleId}` : '';
    return request('GET', `/api/tag-options${qs}`);
  },
  getCustomTagOptions: (coupleId, tagType = '') => {
    let qs = `?coupleId=${coupleId}`;
    if (tagType) qs += `&tagType=${tagType}`;
    return request('GET', `/api/tag-options/custom${qs}`);
  },
  addTagOption: (coupleId, tagType, tagValue) =>
    request('POST', '/api/tag-options', { coupleId, tagType, tagValue }),
  deleteTagOption: (id) =>
    request('DELETE', `/api/tag-options/${id}`),
  hideDefaultTag: (coupleId, tagType, tagValue) =>
    request('POST', '/api/tag-options/hide', { coupleId, tagType, tagValue }),
  restoreDefaultTag: (coupleId, tagType, tagValue) =>
    request('POST', '/api/tag-options/restore', { coupleId, tagType, tagValue }),
  getHiddenTagOptions: (coupleId, tagType = '') => {
    let qs = `?coupleId=${coupleId}`;
    if (tagType) qs += `&tagType=${tagType}`;
    return request('GET', `/api/tag-options/hidden${qs}`);
  },
  getDishes: (categoryId = '', coupleId = '') => {
    let qs = '';
    if (categoryId) qs += `categoryId=${categoryId}`;
    if (coupleId) qs += (qs ? '&' : '') + `coupleId=${coupleId}`;
    return request('GET', `/api/dishes${qs ? '?' + qs : ''}`);
  },
  createDish: (payload) => request('POST', '/api/dishes', payload),
  updateDish: (id, payload) => request('PUT', `/api/dishes/${id}`, payload),
  deleteDish: (id, coupleId) => request('DELETE', `/api/dishes/${id}?coupleId=${coupleId}`),

  // ── 订单 ──
  listOrders: (coupleId, status = 'all') => request('GET', `/api/orders?coupleId=${coupleId}&status=${status}`),
  createOrder: (payload) => request('POST', '/api/orders', payload),
  getOrder: (id) => request('GET', `/api/orders/${id}`),
  acceptOrder: (id) => request('PUT', `/api/orders/${id}/accept`),
  completeCooking: (id) => request('PUT', `/api/orders/${id}/complete`),
  finishOrder: (id) => request('PUT', `/api/orders/${id}/finish`),
  laterOrder: (id) => request('PUT', `/api/orders/${id}/later`),
  rejectOrder: (id, reason) => request('PUT', `/api/orders/${id}/reject`, { reason }),
  cancelOrder: (id) => request('PUT', `/api/orders/${id}/cancel`),
  urgeOrder: (id) => request('POST', `/api/orders/${id}/urge`),
  rateOrder: (id, rating, comment) => request('PUT', `/api/orders/${id}/rate`, { rating, comment }),

  // ── 偏好 ──
  getPreferences: (userId) => request('GET', `/api/preferences?userId=${userId}`),
  updatePreferences: (payload) => request('PUT', '/api/preferences', payload),
  getFavorites: (userId) => request('GET', `/api/preferences/favorites?userId=${userId}`),
  toggleFavorite: (userId, dishId) => request('POST', `/api/preferences/favorites/${dishId}`, { userId }),

  // ── 购物车(想吃清单) ──
  getCart: (coupleId) => request('GET', `/api/cart?coupleId=${coupleId}`),
  addCartItem: (payload) => request('POST', '/api/cart', payload),
  updateCartItem: (lineKey, payload) => request('PUT', `/api/cart/${lineKey}`, payload),
  deleteCartItem: (lineKey, coupleId) => request('DELETE', `/api/cart/${lineKey}?coupleId=${coupleId}`),
  clearCart: (coupleId) => request('DELETE', `/api/cart?coupleId=${coupleId}`),

  // ── 地址 ──
  listAddresses: (coupleId) => request('GET', `/api/addresses?coupleId=${coupleId}`),
  createAddress: (payload) => request('POST', '/api/addresses', payload),
  updateAddress: (id, payload) => request('PUT', `/api/addresses/${id}`, payload),
  deleteAddress: (id, coupleId) => request('DELETE', `/api/addresses/${id}?coupleId=${coupleId}`),

  // ── 桌台 ──
  listTables: () => request('GET', '/api/tables'),
  createTable: (payload) => request('POST', '/api/tables', payload),
  updateTable: (id, payload) => request('PUT', `/api/tables/${id}`, payload),
  deleteTable: (id) => request('DELETE', `/api/tables/${id}`),

  // ── 统计 ──
  monthlyStats: (coupleId) => request('GET', `/api/stats/monthly?coupleId=${coupleId}`),
  topDishes: (coupleId) => request('GET', `/api/stats/top-dishes?coupleId=${coupleId}`),

  // ── 上传 ──
  uploadImage: (filePath) => new Promise((resolve, reject) => {
    if (isDemoMode()) {
      toast.info('体验模式仅可预览,请登录后使用');
      reject(new APIError(-2, '体验模式仅可预览'));
      return;
    }
    const header = {};
    const token = getToken();
    if (token) {
      header['Authorization'] = 'Bearer ' + token;
    }
    uni.uploadFile({
      url: serverConfig.getUrl() + '/api/upload',
      filePath,
      name: 'file',
      header,
      success: (res) => {
        let data = res.data;
        try { data = JSON.parse(data); } catch (e) {}
        if (res.statusCode >= 200 && res.statusCode < 300 && data && data.code === 0) {
          resolve(data.data);
        } else if (res.statusCode === 401) {
          handle401();
          reject(new APIError(401, '登录已过期'));
        } else {
          const msg = (data && data.msg) || `上传失败(${res.statusCode})`;
          toast.error(msg);
          reject(new APIError(data?.code || res.statusCode, msg));
        }
      },
      fail: (err) => {
        toast.error('上传失败');
        reject(new APIError(-1, err && err.errMsg));
      }
    });
  }),

  // ── 情话 ──
  getSweetDaily: () => request('GET', '/api/sweet/daily'),

  // ── 个性化弹窗 ──
  createSurprise: (payload) => request('POST', '/api/surprise', payload),
  getLatestSurprise: (coupleId) => request('GET', `/api/surprise/latest?couple_id=${coupleId}`),
  markSurpriseRead: (id) => request('POST', `/api/surprise/${id}/read`),
  listSurprises: (coupleId) => request('GET', `/api/surprise/list?couple_id=${coupleId}`),

  // ── 想念点击 ──
  tapMiss: (coupleId) => request('POST', '/api/miss/tap', { couple_id: coupleId }),
  getLatestMiss: (coupleId) => request('GET', `/api/miss/latest?couple_id=${coupleId}`),
  markMissRead: (id) => request('POST', `/api/miss/${id}/read`),

  // ── 心愿单 ──
  listWishlist: (coupleId) => request('GET', `/api/wishlist/list?couple_id=${coupleId}`),
  getLatestWishlist: (coupleId) => request('GET', `/api/wishlist/latest?couple_id=${coupleId}`),
  createWishlist: (payload) => request('POST', '/api/wishlist', payload),
  updateWishlist: (id, payload) => request('PUT', `/api/wishlist/${id}`, payload),
  deleteWishlist: (id) => request('DELETE', `/api/wishlist/${id}`),
  toggleWishlistDone: (id, done) => request('PUT', `/api/wishlist/${id}/done`, { done })
};

export default api;
