<template>
  <view class="async-loading">
    <view class="al-dot" />
    <view class="al-dot" />
    <view class="al-dot" />
  </view>
</template>

<style lang="scss" scoped>
/* 非 H5 平台 manifest.async 不会使用此组件，定义兜底即可 */
.async-loading {
  position: fixed;
  inset: 0;
  z-index: 1000;
  display: flex;
  align-items: flex-start;
  justify-content: center;
  background: var(--c-bg-page, rgba(255, 248, 242, 0.6));
  backdrop-filter: blur(2px);
  padding-top: 30vh;
}
.al-dot {
  width: 18rpx;
  height: 18rpx;
  margin: 0 8rpx;
  border-radius: 50%;
  background: var(--c-primary, #F5B6C1);
  animation: asyncBounce 1s ease-in-out infinite;
  &:nth-child(2) {
    background: var(--c-primary-2, #FFD6DD);
    animation-delay: 0.15s;
  }
  &:nth-child(3) {
    background: var(--c-primary-dark, #E89AA8);
    animation-delay: 0.3s;
  }
}
@keyframes asyncBounce {
  0%, 80%, 100% { transform: translateY(0); opacity: 0.6; }
  40% { transform: translateY(-20rpx); opacity: 1; }
}
</style>
