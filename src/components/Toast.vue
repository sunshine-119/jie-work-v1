<template>
  <view
    v-if="visible"
    class="toast-mask"
    :class="[`is-${type}`, { 'is-bf': isBf }]"
    @click="handleMaskTap"
  >
    <view class="toast-box" :class="[`is-${type}`, { 'is-bf': isBf }]" @click.stop>
      <view v-if="iconSrc" class="toast-icon-wrap">
        <text class="toast-icon">{{ iconSrc }}</text>
      </view>
      <view v-else class="toast-icon-wrap">
        <view class="toast-spinner" />
      </view>
      <text class="toast-text">{{ title }}</text>
    </view>
  </view>
</template>

<script setup>
import { ref, computed, onMounted, onBeforeUnmount } from 'vue';
import { useCoupleStore } from '@/store/couple';

const couple = useCoupleStore();
const isBf = computed(() => couple.isBoyfriend);

const visible = ref(false);
const title = ref('');
const type = ref('info'); // success | error | info | loading
let hideTimer = null;
let currentDuration = 0;

const ICON_MAP = {
  success: '✓',
  error: '✕',
  info: 'i',
  loading: ''
};

const iconSrc = computed(() => (type.value === 'loading' ? '' : ICON_MAP[type.value] || 'i'));

function show(options = {}) {
  const t = typeof options === 'string' ? { title: options } : options;
  title.value = t.title || '';
  type.value = t.type || 'info';
  currentDuration = t.duration === undefined ? 1800 : t.duration;
  visible.value = true;
  if (hideTimer) clearTimeout(hideTimer);
  if (currentDuration > 0) {
    hideTimer = setTimeout(() => {
      hide();
      if (typeof t.complete === 'function') t.complete();
    }, currentDuration);
  }
}

function hide() {
  visible.value = false;
  if (hideTimer) {
    clearTimeout(hideTimer);
    hideTimer = null;
  }
}

function handleMaskTap() {
  // 点击遮罩不关闭，避免误触；仅 loading 不可点关闭
}

onMounted(() => {
  uni.$on('app:toast', show);
  uni.$on('app:toast:hide', hide);
});

onBeforeUnmount(() => {
  uni.$off('app:toast', show);
  uni.$off('app:toast:hide', hide);
  if (hideTimer) clearTimeout(hideTimer);
});
</script>

<style lang="scss" scoped>
.toast-mask {
  position: fixed;
  inset: 0;
  z-index: 9999;
  display: flex;
  align-items: center;
  justify-content: center;
  pointer-events: none;
  background: transparent;
}

.toast-box {
  min-width: 220rpx;
  max-width: 70%;
  padding: 28rpx 36rpx;
  border-radius: 24rpx;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 16rpx;
  animation: toastPop 0.22s ease-out;
  pointer-events: auto;
  /* 默认深色兜底 */
  background: rgba(40, 40, 50, 0.92);
  box-shadow: 0 12rpx 36rpx rgba(0, 0, 0, 0.25);
}

@keyframes toastPop {
  0% {
    transform: scale(0.85);
    opacity: 0;
  }
  100% {
    transform: scale(1);
    opacity: 1;
  }
}

.toast-icon-wrap {
  width: 64rpx;
  height: 64rpx;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 36rpx;
  font-weight: 800;
  color: #fff;
}

.toast-icon {
  font-size: 40rpx;
  line-height: 1;
}

.toast-text {
  font-size: 26rpx;
  color: #fff;
  text-align: center;
  line-height: 1.4;
  word-break: break-all;
}

/* loading */
.toast-spinner {
  width: 40rpx;
  height: 40rpx;
  border: 4rpx solid rgba(255, 255, 255, 0.3);
  border-top-color: #fff;
  border-radius: 50%;
  animation: toastSpin 0.7s linear infinite;
}
@keyframes toastSpin {
  to {
    transform: rotate(360deg);
  }
}

/* ═══════════════════════════════════════════════════
   主题跟随：使用 CSS 变量 --c-primary / --c-primary-2 / --c-primary-dark
   切换主题后页面根节点变量会更新，弹窗自动跟随当前主题色
   ═══════════════════════════════════════════════════ */

/* success：使用当前主题主色 */
.toast-box.is-success {
  background: linear-gradient(135deg, var(--c-primary, #F5B6C1), var(--c-primary-2, #FFD6DD));
  box-shadow: 0 12rpx 36rpx rgba(0, 0, 0, 0.18);
}
.toast-box.is-success .toast-icon-wrap {
  background: rgba(255, 255, 255, 0.25);
}

/* info：使用当前主题淡化版本 */
.toast-box.is-info {
  background: linear-gradient(135deg, var(--c-primary, #F5B6C1), var(--c-primary-dark, #E89AA8));
  box-shadow: 0 12rpx 36rpx rgba(0, 0, 0, 0.18);
}
.toast-box.is-info .toast-icon-wrap {
  background: rgba(255, 255, 255, 0.25);
}

/* error：使用当前主题色的深/暗版本，保证所有 toast 都跟随主题 */
.toast-box.is-error {
  background: linear-gradient(135deg, var(--c-primary-dark, #E89AA8), var(--c-primary, #F5B6C1));
  box-shadow: 0 12rpx 36rpx rgba(0, 0, 0, 0.2);
}
.toast-box.is-error .toast-icon-wrap {
  background: rgba(255, 255, 255, 0.25);
}

/* loading：半透明主题色 */
.toast-box.is-loading {
  background: rgba(255, 255, 255, 0.92);
  border: 1rpx solid var(--c-primary, #F5B6C1);
  box-shadow: 0 12rpx 36rpx rgba(0, 0, 0, 0.12);
}
.toast-box.is-loading .toast-text {
  color: var(--c-primary-dark, #E89AA8);
  font-weight: 600;
}
.toast-box.is-loading .toast-icon-wrap {
  background: transparent;
}
.toast-box.is-loading .toast-spinner {
  border-color: rgba(0, 0, 0, 0.08);
  border-top-color: var(--c-primary, #F5B6C1);
}
</style>
