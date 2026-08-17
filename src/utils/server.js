/**
 * 服务端地址配置（统一管理）
 * -----------------------------------------------------------------------------
 * H5 / 小程序 / App 使用同一套策略：
 *   - dev（npm run dev:*）  → 本地后端，自动使用当前访问 IP + :5000
 *   - prod（npm run build:*）→ 线上后端 https://sdj.pythonanywhere.com
 *
 * 如需临时修改，可在「我的-设置-服务器地址」覆盖（值存 localStorage）。
 * 换部署地址时只改下方 PROD_BASE 即可（dev 自动跟随页面 IP）。
 */
import { storage } from './storage';

const SERVER_URL_KEY = 'oc_server_url';
const DEV_PORT = '5000';
const PROD_BASE = 'https://sdj.pythonanywhere.com';

function defaultUrl() {
  if (process.env.NODE_ENV === 'development') {
    // dev 模式下自动用当前页面访问的 hostname 拼接后端地址
    // H5：window.location.hostname 即为本机 IP（手机和电脑访问时自动一致）
    // 小程序：无 window.location，回退 固定 IP 地址
    let host = '192.168.8.54';
    // #ifdef H5
    if (typeof window !== 'undefined' && window.location) {
      host = window.location.hostname || 'localhost';
    }
    // #endif
    return `http://${host}:${DEV_PORT}`;
  }
  return PROD_BASE;
}

export const serverConfig = {
  getUrl() {
    return storage.get(SERVER_URL_KEY, defaultUrl());
  },
  setUrl(url) {
    const normalized = (url || '').trim().replace(/\/$/, '');
    storage.set(SERVER_URL_KEY, normalized || defaultUrl());
  },
  reset() {
    storage.remove(SERVER_URL_KEY);
  }
};

export function resolveUrl(path) {
  if (!path) return '';
  if (path.startsWith('http')) return path;
  const base = serverConfig.getUrl();
  if (path.startsWith('/')) return base + path;
  return base + '/' + path;
}
