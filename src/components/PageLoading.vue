<template>
  <view
    v-if="visible"
    class="page-loading"
    :class="couple.themeClass"
    :style="rootStyle"
  >
    <view
      class="pl-spinner"
      :style="spinnerStyle"
    />
    <text class="pl-text" :style="textStyle">{{ text }}</text>
  </view>
</template>

<script setup>
import { computed, watch } from 'vue';
import { useCoupleStore } from '@/store/couple';

const props = defineProps({
  visible: { type: Boolean, default: false },
  text: { type: String, default: '加载中...' },
  timeout: { type: Number, default: 5000 }
});

const emit = defineEmits(['timeout']);

const couple = useCoupleStore();

// 直接缓存主题色对象，保证响应式同时避免频繁重新创建
const theme = computed(() => couple.themeStyle || {});

const spinColor = computed(() => theme.value['--c-primary'] || '#f5b6c1');
const trackColor = computed(() => theme.value['--c-primary-2'] || 'rgba(245, 182, 193, 0.2)');
const bgColor = computed(() => theme.value['--c-bg-page'] || '#fff');

const rootStyle = computed(() => ({
  background: bgColor.value,
  ...theme.value
}));

const spinnerStyle = computed(() => ({
  borderColor: trackColor.value,
  borderTopColor: spinColor.value
}));

const textStyle = computed(() => ({
  color: spinColor.value
}));

let timer = null;

function startTimer() {
  clearTimer();
  if (props.timeout > 0) {
    timer = setTimeout(() => {
      emit('timeout');
    }, props.timeout);
  }
}

function clearTimer() {
  if (timer) {
    clearTimeout(timer);
    timer = null;
  }
}

watch(
  () => props.visible,
  (val) => {
    if (val) {
      startTimer();
    } else {
      clearTimer();
    }
  },
  { immediate: true }
);
</script>

<style lang="scss" scoped>
.page-loading {
  position: fixed;
  inset: 0;
  z-index: 9999;
  background: var(--c-bg-page, #fff);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 20rpx;
  .pl-spinner {
    width: 60rpx;
    height: 60rpx;
    border: 4rpx solid var(--c-primary-2, rgba(245, 182, 193, 0.2));
    border-top-color: var(--c-primary, #f5b6c1);
    border-radius: 50%;
    animation: pl-spin 0.8s linear infinite;
  }
  .pl-text {
    font-size: 24rpx;
    color: var(--c-primary, #f5b6c1);
  }
}
@keyframes pl-spin {
  to {
    transform: rotate(360deg);
  }
}
</style>
