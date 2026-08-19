<template>
  <!-- 自定义 copy 图标：CSS 绘制两个重叠矩形（通用复制图标） -->
  <view
    v-if="name === 'copy'"
    class="app-icon copy-icon"
    :class="[spin ? 'spin' : '']"
    :style="iconStyle"
  >
    <view class="copy-rect back" />
    <view class="copy-rect front" />
  </view>
  <!-- 普通图标 -->
  <text
    v-else
    class="app-icon"
    :class="[`icon-${name}`, spin ? 'spin' : '']"
    :style="style"
  >{{ iconChar }}</text>
</template>

<script setup>
import { computed } from 'vue';

const props = defineProps({
  name: { type: String, required: true },
  size: { type: [String, Number], default: '' },
  color: { type: String, default: '' },
  spin: { type: Boolean, default: false }
});

const MAP = {
  back: '‹',
  close: '✕',
  add: '＋',
  minus: '−',
  arrow: '❯',
  arrowDown: '∨',
  search: '🔍',
  eye: '👁',
  heart: '❤️',
  heartOutline: '🤍',
  star: '★',
  starOutline: '☆',
  home: '🏠',
  menu: '🍽️',
  order: '📋',
  profile: '👤',
  settings: '⚙️',
  upload: '📤',
  camera: '📷',
  location: '📍',
  warning: '⚠️',
  check: '✓',
  edit: '✎',
  trash: '🗑',
  refresh: '↻',
  send: '✉',
  gift: '🎁',
  sparkles: '✨',
  heartPulse: '💓',
  ribbon: '🎀',
  cart: '🛒',
  shield: '🛡️',
  fire: '🔥',
  chart: '📊',
  clock: '⏰',
  flag: '🚩',
  egg: '🥚',
  chopsticks: '🥢',
  loading: '⏳',
  question: '❓',
  checkCircle: '✅',
  cross: '❌',
  package: '📦',
  chef: '👨‍🍳',
  envelope: '💌',
  pray: '🙏',
  pouting: '🥺',
  hugging: '🤗',
  spicy: '🌶',
  cat: '🐱',
  cook: '👨‍🍳',
  more: '⋯',
  brush: '🎨',
  font: '🅰️',
  expand: '⛶',
  minimize: '◱'
};

const iconChar = computed(() => MAP[props.name] || props.name);

const style = computed(() => {
  const s = {};
  if (props.size) s.fontSize = typeof props.size === 'number' ? `${props.size}rpx` : props.size;
  if (props.color) s.color = props.color;
  return s;
});

// 自定义图标的尺寸 / 颜色样式
const iconStyle = computed(() => {
  const s = {};
  if (props.size) {
    const sz = typeof props.size === 'number' ? `${props.size}rpx` : props.size;
    s.width = sz;
    s.height = sz;
  }
  if (props.color) {
    s.color = props.color;
    s['--icon-color'] = props.color;
  }
  return s;
});
</script>

<style lang="scss" scoped>
.app-icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  line-height: 1;
  font-family: -apple-system, BlinkMacSystemFont, 'PingFang SC', sans-serif;
}

/* ============ copy 图标：两个重叠矩形 ============ */
.copy-icon {
  position: relative;
  width: 40rpx;
  height: 40rpx;

  .copy-rect {
    position: absolute;
    border: 3rpx solid var(--icon-color, currentColor);
    border-radius: 4rpx;
    background: transparent;
  }
  .copy-rect.back {
    width: 20rpx;
    height: 24rpx;
    top: 4rpx;
    left: 3rpx;
    opacity: 0.55;
  }
  .copy-rect.front {
    width: 20rpx;
    height: 24rpx;
    bottom: 6rpx;
    right: 8rpx;
    background: var(--icon-color, currentColor);
    opacity: 0.95;
  }
}

.icon-back {
  font-size: 1.35em;
  font-weight: 700;
  transform: translateX(-2rpx);
}
.spin {
  animation: spin 1.2s linear infinite;
}
@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}
</style>
