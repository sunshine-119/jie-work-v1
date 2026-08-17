/**
 * 游客模式权限控制
 * ---------------------------------------------------------------------------
 * Demo/体验模式下仅允许预览，所有会修改数据或发起交互请求的入口都需先调用
 * requireLogin 检查；未登录时弹出提示并可一键跳转登录页。
 */
import { storage } from './storage';
import { toast } from './toast';

const COUPLE_KEY = 'oc_couple';
const DEMO_COUPLE_ID = 'couple_demo_001';

/** 从本地存储判断当前是否处于游客体验模式 */
export function isDemoMode() {
  const saved = storage.get(COUPLE_KEY, null);
  return !!(saved && saved.coupleId === DEMO_COUPLE_ID);
}

/**
 * 检查是否已登录（非游客模式）
 * @param {object} couple - couple store 实例，优先使用；未传时读取本地缓存
 * @returns {boolean} true 表示可以继续操作
 */
export function requireLogin(couple) {
  const isDemo = couple && couple.isDemo !== undefined ? couple.isDemo : isDemoMode();
  if (!isDemo) return true;

  uni.showModal({
    title: '需要登录',
    content: '体验模式仅可预览，登录后即可使用该功能',
    confirmText: '去登录',
    cancelText: '再看看',
    confirmColor: '#E89AA8',
    success: (r) => {
      if (r.confirm) {
        uni.reLaunch({ url: '/pages/login/login' });
      }
    }
  });
  return false;
}

/**
 * 轻量提示版（不跳转登录页，仅 toast）
 */
export function requireLoginToast(couple) {
  const isDemo = couple && couple.isDemo !== undefined ? couple.isDemo : isDemoMode();
  if (!isDemo) return true;
  toast.info('体验模式仅可预览，请登录后使用');
  return false;
}
