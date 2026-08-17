/**
 * uni Storage 简易封装，跨端可用。
 */
export const storage = {
  get(key, fallback = null) {
    try {
      const v = uni.getStorageSync(key);
      return v === '' || v === null || v === undefined ? fallback : v;
    } catch (e) {
      return fallback;
    }
  },
  set(key, value) {
    try {
      uni.setStorageSync(key, value);
    } catch (e) {
      /* ignore */
    }
  },
  remove(key) {
    try {
      uni.removeStorageSync(key);
    } catch (e) {
      /* ignore */
    }
  },
  clear() {
    try {
      uni.clearStorageSync();
    } catch (e) {
      /* ignore */
    }
  }
};
