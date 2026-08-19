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
        <view class="icon-bg" :class="{ show: current === item.key }" />
        <text
          class="icon"
          :class="{ active: current === item.key }"
        >{{ current === item.key ? item.iconActive : item.icon }}</text>
      </view>
      <text class="label">{{ item.text }}</text>
      <view class="indicator" :class="{ show: current === item.key }" />
    </view>
  </view>
</template>

<script setup>
import { computed } from 'vue';
import { useCoupleStore } from '@/store/couple';

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
  height: calc(120rpx + env(safe-area-inset-bottom));
  display: flex;
  background: var(--c-bg-page, #fff);
  border-top: 2rpx solid rgba(0, 0, 0, 0.04);
  padding-bottom: env(safe-area-inset-bottom);
}

.tab {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  position: relative;
  padding: 10rpx 0;

  .icon-wrap {
    position: relative;
    width: 80rpx;
    height: 80rpx;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  // 选中时的柔和圆形背景（弹性缩放动画）
  .icon-bg {
    position: absolute;
    width: 68rpx;
    height: 68rpx;
    border-radius: 50%;
    background: var(--c-primary, #F5B6C1);
    opacity: 0.2;
    transform: scale(0);
    transition: transform 0.35s cubic-bezier(0.34, 1.56, 0.64, 1),
                opacity 0.25s ease;
    &.show {
      transform: scale(1);
      opacity: 0.22;
    }
  }

  // emoji 图标
  .icon {
    position: relative;
    z-index: 1;
    font-size: 44rpx;
    line-height: 1;
    transition: transform 0.35s cubic-bezier(0.34, 1.56, 0.64, 1);
    transform-origin: center;
    &.active {
      transform: scale(1.08) translateY(-4rpx);
    }
  }

  .label {
    margin-top: 6rpx;
    font-size: 22rpx;
    color: $text-3;
    font-weight: 500;
    letter-spacing: 1rpx;
    transition: all 0.25s ease;
  }

  // 底部指示条（pill 形状）
  .indicator {
    position: absolute;
    bottom: 2rpx;
    width: 28rpx;
    height: 6rpx;
    border-radius: 4rpx;
    background: var(--c-primary, #F5B6C1);
    opacity: 0;
    transform: scaleX(0);
    transform-origin: center;
    transition: all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
    &.show {
      opacity: 1;
      transform: scaleX(1);
    }
  }

  // 激活态文字
  &.active {
    .label {
      color: var(--c-primary-dark, #E89AA8);
      font-weight: 700;
    }
  }

  // 按压反馈
  &:active {
    .icon {
      transform: scale(0.92);
    }
    &.active .icon {
      transform: scale(1.12) translateY(-2rpx);
    }
  }
}
</style>
