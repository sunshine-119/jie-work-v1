<template>
  <text
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
  // 补充常用图标
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
  copy: '📋',
  brush: '🎨',
  font: '🅰️',
  loading: '⏳',
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
</script>

<style lang="scss" scoped>
.app-icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  line-height: 1;
  font-family: -apple-system, BlinkMacSystemFont, 'PingFang SC', sans-serif;
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
