<template>
  <view
    v-show="visible"
    class="sheet-mask"
    :class="{ show: visible }"
    @click="onClose"
    @touchmove.stop.prevent
  >
    <view class="sheet-popup" @click.stop @touchmove.stop.prevent>
      <view class="sp-head">
        <text class="sp-title">{{ title }}</text>
        <view class="sp-close" @click="onClose">
          <AppIcon name="close" size="24" color="#999" />
        </view>
      </view>
      <scroll-view scroll-y class="sp-list" :show-scrollbar="false">
        <view
          v-for="(item, idx) in items"
          :key="idx"
          class="sp-item"
          :class="{ active: idx === currentIndex }"
          @click="onPick(idx, item)"
        >
          <text class="item-text">{{ item.label }}</text>
          <text v-if="idx === currentIndex" class="item-check">✓</text>
        </view>
      </scroll-view>
    </view>
  </view>
</template>

<script setup>
import AppIcon from './AppIcon.vue';

const props = defineProps({
  visible: { type: Boolean, default: false },
  items: { type: Array, default: () => [] },
  currentIndex: { type: Number, default: -1 },
  title: { type: String, default: '请选择' }
});

const emit = defineEmits(['update:visible', 'change']);

function onClose() {
  emit('update:visible', false);
}

function onPick(idx, item) {
  emit('change', idx, item);
}
</script>

<style lang="scss" scoped>
.sheet-mask {
  position: fixed;
  inset: 0;
  z-index: 1100;
  background: rgba(74, 40, 60, 0.45);
  display: flex !important;
  align-items: flex-end;
  justify-content: center;
  opacity: 0;
  pointer-events: none;
  transition: opacity 0.25s ease-out;
  &.show {
    opacity: 1;
    pointer-events: auto;
  }
}
.sheet-popup {
  width: 100%;
  background: #fff;
  border-top-left-radius: 40rpx;
  border-top-right-radius: 40rpx;
  padding: 32rpx 28rpx;
  padding-bottom: calc(16px + env(safe-area-inset-bottom));
  transform: translateY(100%);
  transition: transform 0.25s ease-out;
}
.sheet-mask.show .sheet-popup {
  transform: translateY(0);
}
.sp-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 24rpx;
}
.sp-title {
  font-size: 36rpx;
  font-weight: 600;
  color: #333;
}
.sp-close {
  padding: 12rpx;
}
.sp-list {
  max-height: 50vh;
}
.sp-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 28rpx 16rpx;
  border-radius: 16rpx;
  margin-bottom: 8rpx;
  transition: background 0.2s;
  &:active {
    background: #f5f5f5;
  }
  &.active {
    background: linear-gradient(135deg, var(--c-primary, #F5B6C1), var(--c-accent, #C8B6D9));
  }
  &.active .item-text,
  &.active .item-check {
    color: #fff;
  }
}
.item-text {
  font-size: 32rpx;
  color: #333;
}
.item-check {
  font-size: 32rpx;
  color: var(--c-primary, #F5B6C1);
  font-weight: 600;
}
</style>
