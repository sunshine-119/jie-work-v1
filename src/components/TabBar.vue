<template>
  <view class="tabbar safe-bottom">
    <view
      v-for="item in tabs"
      :key="item.path"
      class="tab"
      :class="{ active: current === item.key }"
      @click="onTab(item)"
    >
      <view class="icon-wrap">
        <view v-if="current === item.key" class="icon-bg" />
        <AppIcon
          class="icon"
          :name="current === item.key ? item.iconActive : item.icon"
          size="40"
          :color="current === item.key ? '#fff' : '#A89DA3'"
        />
      </view>
      <text class="label">{{ item.text }}</text>
    </view>
  </view>
</template>

<script setup>
import { computed } from 'vue';
import { useCoupleStore } from '@/store/couple';
import AppIcon from './AppIcon.vue';

defineProps({
  current: { type: String, default: 'index' }
});

const couple = useCoupleStore();

const tabs = computed(() => [
  { key: 'index', text: '首页', icon: couple.isBoyfriend ? '👨‍🍳' : '🏠', iconActive: couple.isBoyfriend ? '👨‍🍳' : '🏠', path: '/pages/index/index' },
  { key: 'menu', text: couple.isBoyfriend ? '菜品' : '点餐', icon: '🍴', iconActive: '🍴', path: '/pages/menu/menu' },
  { key: 'orders', text: '订单', icon: '📑', iconActive: '📑', path: '/pages/orders/orders' },
  { key: 'profile', text: '我的', icon: couple.isBoyfriend ? '🤵' : '💁‍♀️', iconActive: couple.isBoyfriend ? '🤵' : '💁‍♀️', path: '/pages/profile/profile' }
]);

function onTab(item) {
  uni.reLaunch({ url: item.path });
}
</script>

<style lang="scss" scoped>
.tabbar {
  position: fixed;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: 99;
  height: calc(108rpx + env(safe-area-inset-bottom));
  display: flex;
  background: var(--c-bg-alt, #fafafa);
  opacity: 0.96;
  backdrop-filter: blur(20rpx);
  box-shadow: 0 -2rpx 16rpx rgba(60, 30, 0, 0.04);
}
.tab {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  position: relative;
  .icon-wrap {
    position: relative;
    width: 72rpx;
    height: 72rpx;
    display: flex;
    align-items: center;
    justify-content: center;
  }
  .icon-bg {
    position: absolute;
    width: 72rpx;
    height: 72rpx;
    border-radius: 50%;
    background: linear-gradient(135deg, var(--c-primary, #F5B6C1), var(--c-primary-2, #FFD6DD));
    box-shadow: 0 4rpx 12rpx rgba(245, 182, 193, 0.4);
  }
  .icon {
    position: relative;
    z-index: 1;
    line-height: 1;
    transition: all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
  }
  .label {
    margin-top: 4rpx;
    font-size: 22rpx;
    color: $text-3;
    font-weight: 500;
    transition: color 0.2s ease;
  }
  &.active {
    .icon {
      transform: translateY(-4rpx) scale(1.05);
    }
    .label {
      color: var(--c-primary-dark, $brand-primary-dark);
      font-weight: 700;
    }
  }
}
</style>
