<template>
  <view class="async-error">
    <AppIcon name="info" size="64" color="#E08B8B" />
    <text class="ae-text">页面加载失败</text>
    <text class="ae-sub">请检查网络后重试</text>
    <view class="ae-btn" @click="reload">
      <text>重新加载</text>
    </view>
  </view>
</template>

<script setup>
import AppIcon from './AppIcon.vue';

function reload() {
  window.location.reload();
}
</script>

<style lang="scss" scoped>
.async-error {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 40rpx;
  background: $bg-page;
  .ae-text {
    margin-top: 24rpx;
    font-size: 32rpx;
    font-weight: 700;
    color: $text-1;
  }
  .ae-sub {
    margin-top: 8rpx;
  font-size: 24rpx;
    color: $text-3;
  }
  .ae-btn {
    margin-top: 40rpx;
    padding: 18rpx 48rpx;
    border-radius: $radius-pill;
    background: linear-gradient(135deg, $brand-primary, $brand-primary-2);
    color: #fff;
    font-size: 28rpx;
    font-weight: 700;
  }
}
</style>
