/**
 * 主题色工具
 * ---------------------------------------------------------------------------
 * 支持按主色生成一整套 CSS 自定义属性，实现女友端/男友端自定义主题。
 * 提供几组预设主题，也可通过主色 hex 动态生成衍生色。
 */

const PRESETS = {
  milkPink: {
    '--c-primary': '#F5B6C1',
    '--c-primary-2': '#FFD6DD',
    '--c-primary-dark': '#E89AA8',
    '--c-primary-bg': 'rgba(245, 182, 193, 0.15)',
    '--c-accent': '#C8B6D9',
    '--c-taro': '#B8A2C7',
    '--c-mango': '#FFE5B4',
    '--c-cream': '#FFF1E5',
    '--c-bg-page': '#FFF8F2',
    '--c-bg-alt': '#FFF0F3',
    '--c-bg-hover': '#FBE7EC',
    '--c-bg-taro': '#F4EEF8',
    '--c-border': '#F2E1E6',
    '--c-divider': '#FAEEF2'
  },
  hazeBlue: {
    '--c-primary': '#7BA5D9',
    '--c-primary-2': '#A8C8E8',
    '--c-primary-dark': '#5A8BC4',
    '--c-primary-bg': 'rgba(123, 165, 217, 0.15)',
    '--c-accent': '#8BB8D0',
    '--c-taro': '#6A9BC0',
    '--c-mango': '#B8D4E8',
    '--c-cream': '#EBF2F9',
    '--c-bg-page': '#F0F5FA',
    '--c-bg-alt': '#E8F0F8',
    '--c-bg-hover': '#DDE8F2',
    '--c-bg-taro': '#E8F0F8',
    '--c-border': '#D8E4F0',
    '--c-divider': '#E0EAF2'
  },
  lightTaro: {
    '--c-primary': '#C8B6D9',
    '--c-primary-2': '#DDD0EA',
    '--c-primary-dark': '#A690BC',
    '--c-primary-bg': 'rgba(200, 182, 217, 0.15)',
    '--c-accent': '#B8A2C7',
    '--c-taro': '#9C82B0',
    '--c-mango': '#E8DDF3',
    '--c-cream': '#F6F1FA',
    '--c-bg-page': '#FAF7FC',
    '--c-bg-alt': '#F4EEF8',
    '--c-bg-hover': '#EDE5F4',
    '--c-bg-taro': '#F0E8F7',
    '--c-border': '#E5DBEE',
    '--c-divider': '#F0E8F7'
  },
  mintGreen: {
    '--c-primary': '#8FD1B8',
    '--c-primary-2': '#B8E5D4',
    '--c-primary-dark': '#6BB89C',
    '--c-primary-bg': 'rgba(143, 209, 184, 0.15)',
    '--c-accent': '#A8D8C8',
    '--c-taro': '#7FC4AC',
    '--c-mango': '#D4F0E6',
    '--c-cream': '#EAF8F3',
    '--c-bg-page': '#F4FBF8',
    '--c-bg-alt': '#E8F6F1',
    '--c-bg-hover': '#DDF1E9',
    '--c-bg-taro': '#E3F4ED',
    '--c-border': '#D2ECE2',
    '--c-divider': '#E3F4ED'
  },
  warmSun: {
    '--c-primary': '#F2C66C',
    '--c-primary-2': '#F9E2A8',
    '--c-primary-dark': '#D9A84C',
    '--c-primary-bg': 'rgba(242, 198, 108, 0.15)',
    '--c-accent': '#E8C58B',
    '--c-taro': '#D4A85E',
    '--c-mango': '#FFF1CC',
    '--c-cream': '#FFF8E5',
    '--c-bg-page': '#FFFCF5',
    '--c-bg-alt': '#FFF7E0',
    '--c-bg-hover': '#FFF2CC',
    '--c-bg-taro': '#FFF5D9',
    '--c-border': '#F5E6C8',
    '--c-divider': '#FFF2CC'
  },
  coralOrange: {
    '--c-primary': '#F2A88C',
    '--c-primary-2': '#F7C8B4',
    '--c-primary-dark': '#D98A6C',
    '--c-primary-bg': 'rgba(242, 168, 140, 0.15)',
    '--c-accent': '#E8B89C',
    '--c-taro': '#CC8E70',
    '--c-mango': '#FFE4D6',
    '--c-cream': '#FFF2EC',
    '--c-bg-page': '#FFF8F5',
    '--c-bg-alt': '#FFEDE5',
    '--c-bg-hover': '#FFE2D6',
    '--c-bg-taro': '#FFE8DE',
    '--c-border': '#F5D8CC',
    '--c-divider': '#FFE8DE'
  },
  roseRed: {
    '--c-primary': '#E8929C',
    '--c-primary-2': '#F4B8C0',
    '--c-primary-dark': '#D06A78',
    '--c-primary-bg': 'rgba(232, 146, 156, 0.15)',
    '--c-accent': '#E8B4BC',
    '--c-taro': '#C97A86',
    '--c-mango': '#FFE0E4',
    '--c-cream': '#FFF0F2',
    '--c-bg-page': '#FFF5F6',
    '--c-bg-alt': '#FFE8EB',
    '--c-bg-hover': '#FFD9DE',
    '--c-bg-taro': '#FFE2E6',
    '--c-border': '#F5CCD2',
    '--c-divider': '#FFE2E6'
  },
  lavender: {
    '--c-primary': '#B8A9E8',
    '--c-primary-2': '#D4CBF5',
    '--c-primary-dark': '#9685C8',
    '--c-primary-bg': 'rgba(184, 169, 232, 0.15)',
    '--c-accent': '#C4B8E8',
    '--c-taro': '#8F7EC5',
    '--c-mango': '#EDE8FC',
    '--c-cream': '#F6F4FF',
    '--c-bg-page': '#FAF8FF',
    '--c-bg-alt': '#F2EEFF',
    '--c-bg-hover': '#E8E2FC',
    '--c-bg-taro': '#EDE8FC',
    '--c-border': '#E0D8F5',
    '--c-divider': '#EDE8FC'
  },
  skyBlue: {
    '--c-primary': '#87CEEB',
    '--c-primary-2': '#B2E2F5',
    '--c-primary-dark': '#5AA8C9',
    '--c-primary-bg': 'rgba(135, 206, 235, 0.15)',
    '--c-accent': '#9BD8F2',
    '--c-taro': '#6BA8C4',
    '--c-mango': '#E0F4FC',
    '--c-cream': '#F0FAFF',
    '--c-bg-page': '#F5FBFF',
    '--c-bg-alt': '#E8F6FC',
    '--c-bg-hover': '#D9F0F9',
    '--c-bg-taro': '#E0F4FC',
    '--c-border': '#CFE8F2',
    '--c-divider': '#E0F4FC'
  }
};

export const THEME_PRESETS = Object.keys(PRESETS);

export const THEME_LABELS = {
  milkPink: '奶粉粉',
  hazeBlue: '雾霾蓝',
  lightTaro: '淡芋紫',
  mintGreen: '薄荷绿',
  warmSun: '暖阳黄',
  coralOrange: '珊瑚橘',
  roseRed: '玫瑰红',
  lavender: '薰衣草紫',
  skyBlue: '天空蓝'
};

export const THEME_ICONS = {
  milkPink: '🌸',
  hazeBlue: '☁️',
  lightTaro: '💜',
  mintGreen: '🌿',
  warmSun: '☀️',
  coralOrange: '🍊',
  roseRed: '🌹',
  lavender: '🔮',
  skyBlue: '🌤️'
};

function hexToRgb(hex) {
  const h = hex.replace('#', '');
  const bigint = parseInt(h.length === 3 ? h.split('').map((c) => c + c).join('') : h, 16);
  if (Number.isNaN(bigint)) return null;
  return { r: (bigint >> 16) & 255, g: (bigint >> 8) & 255, b: bigint & 255 };
}

function rgbToHex(r, g, b) {
  return '#' + [r, g, b].map((x) => Math.max(0, Math.min(255, Math.round(x))).toString(16).padStart(2, '0')).join('');
}

function mix(hex, targetHex, weight) {
  const a = hexToRgb(hex);
  const b = hexToRgb(targetHex);
  if (!a || !b) return hex;
  const w = Math.max(0, Math.min(1, weight));
  return rgbToHex(
    a.r * (1 - w) + b.r * w,
    a.g * (1 - w) + b.g * w,
    a.b * (1 - w) + b.b * w
  );
}

/**
 * 根据主色生成一套主题变量（主色不在预设中时回退到动态计算）
 */
export function getThemeVars(presetKey, role = 'girlfriend') {
  const key = presetKey || defaultPresetForRole(role);
  const vars = PRESETS[key] || PRESETS[defaultPresetForRole(role)];
  return { ...vars };
}

export function defaultPresetForRole(role) {
  return role === 'boyfriend' ? 'hazeBlue' : 'milkPink';
}

/**
 * 把主题变量对象转成 style 对象，可直接绑定到页面根节点
 */
export function themeStyle(presetKey, role = 'girlfriend') {
  return getThemeVars(presetKey, role);
}

/**
 * 校验 preset key 是否合法
 */
export function isValidPreset(key) {
  return !!PRESETS[key];
}

/**
 * 字体预设
 * ---------------------------------------------------------------------------
 * 部分字体通过 CDN 外部加载，保证移动端（尤其小程序）切换真正生效。
 * H5 动态插入 link 加载 CSS；小程序通过 wx.loadFontFace 加载字体文件。
 */
const FONTS = {
  system: {
    label: '系统默认',
    icon: '📱',
    family: "-apple-system, BlinkMacSystemFont, 'Helvetica Neue', 'PingFang SC', 'Microsoft YaHei', sans-serif"
  },
  rounded: {
    label: '圆润体',
    icon: '🫧',
    family: "'PingFang SC', 'Hiragino Sans GB', 'Microsoft YaHei', 'Source Han Sans SC', sans-serif"
  },
  serif: {
    label: '宋雅体',
    icon: '📖',
    family: "'Noto Serif SC', 'Songti SC', 'SimSun', 'Source Han Serif SC', serif"
  },
  kai: {
    label: '楷书体',
    icon: '✍️',
    family: "'LXGW WenKai', 'LXGW WenKai Screen', 'Kaiti SC', 'STKaiti', 'KaiTi', cursive",
    external: 'lxgw-wenkai'
  },
  mono: {
    label: '等宽体',
    icon: '🔢',
    family: "'SF Mono', 'Fira Code', 'Source Code Pro', 'Consolas', monospace"
  },
  cute: {
    label: '可爱圆体',
    icon: '🎀',
    family: "'Hiragino Maru Gothic ProN', 'Yu Gothic UI', 'Comic Sans MS', 'PingFang SC', 'Microsoft YaHei', sans-serif"
  },
  elegant: {
    label: '优雅宋体',
    icon: '🪶',
    family: "'Noto Serif SC', 'New York', 'Songti SC', 'SimSun', 'Source Han Serif SC', serif"
  },
  handwriting: {
    label: '手写体',
    icon: '✒️',
    family: "'Bradley Hand', 'Chalkboard SE', 'Kaiti SC', 'STKaiti', cursive"
  },
  wenkai: {
    label: '霞鹜文楷',
    icon: '🪶',
    family: "'LXGW WenKai', 'LXGW WenKai Screen', serif",
    external: 'lxgw-wenkai'
  }
};

// 外部字体资源（key 对应 FONTS 中的 external 字段）
const EXTERNAL_FONTS = {
  'lxgw-wenkai': {
    family: 'LXGW WenKai',
    // H5 走 CSS 分片加载，节省流量；小程序加载 3500 常用字子集，控制体积
    css: 'https://unpkg.com/@chinese-fonts/lxgwwenkai@3.0.0/dist/LXGWWenKai-Regular/result.css',
    file: 'https://cdn.jsdelivr.net/gh/WinterholdPrime/CDN@main/LXGWWenKai_Regular_3500.woff2'
  }
};

const loadedFonts = new Set();

export const FONT_PRESETS = Object.keys(FONTS);
export const FONT_LABELS = Object.fromEntries(FONT_PRESETS.map((k) => [k, FONTS[k].label]));
export const FONT_ICONS = Object.fromEntries(FONT_PRESETS.map((k) => [k, FONTS[k].icon]));

export function getFontFamily(key) {
  const f = FONTS[key] || FONTS.system;
  return f.family;
}

export function fontStyleObj(fontKey) {
  const family = getFontFamily(fontKey);
  return {
    '--app-font-family': family,
    fontFamily: family
  };
}

function getExternalKey(fontKey) {
  const f = FONTS[fontKey];
  return f && f.external ? f.external : '';
}

/** H5：通过动态插入 link 加载字体 CSS */
function loadFontCssForH5(fontKey) {
  const extKey = getExternalKey(fontKey);
  if (!extKey) return;
  const cfg = EXTERNAL_FONTS[extKey];
  if (!cfg) return;
  // #ifdef H5
  if (typeof document === 'undefined') return;
  if (loadedFonts.has(extKey)) return;
  loadedFonts.add(extKey);
  const id = `font-css-${extKey}`;
  if (document.getElementById(id)) return;
  const link = document.createElement('link');
  link.id = id;
  link.rel = 'stylesheet';
  link.href = cfg.css;
  document.head.appendChild(link);
  // #endif
}

/** 小程序：通过 wx.loadFontFace 加载字体文件 */
function loadFontFaceForMp(fontKey) {
  const extKey = getExternalKey(fontKey);
  if (!extKey) return;
  const cfg = EXTERNAL_FONTS[extKey];
  if (!cfg) return;
  // #ifdef MP-WEIXIN
  if (!wx.loadFontFace) return;
  if (loadedFonts.has(extKey)) return;
  loadedFonts.add(extKey);
  wx.loadFontFace({
    family: cfg.family,
    source: `url("${cfg.file}")`,
    global: true,
    success: () => {},
    fail: () => {
      loadedFonts.delete(extKey);
    }
  });
  // #endif
}

/** 预加载字体（H5 插 CSS / 小程序 loadFontFace） */
function preloadFont(fontKey) {
  loadFontCssForH5(fontKey);
  loadFontFaceForMp(fontKey);
}

/** 预加载所有外部字体（字体选择弹层打开时调用，保证选项预览正确） */
export function preloadAllFonts() {
  FONT_PRESETS.forEach((k) => preloadFont(k));
}

/** 将字体变量同步到页面根节点（H5 直接操作 documentElement） */
export function applyFontFamily(fontKey) {
  const key = fontKey || 'system';
  preloadFont(key);
  const family = fontStyleObj(key).fontFamily;
  // #ifdef H5
  if (typeof document !== 'undefined') {
    document.documentElement.style.setProperty('--app-font-family', family);
  }
  // #endif
}
