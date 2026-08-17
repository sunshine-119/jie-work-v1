<template>
  <view class="navbar" :style="{ paddingTop: statusBarHeight + 'px' }">
    <view class="bar" :style="barStyle">
      <view class="left">
        <view v-if="showBack" class="back-icon" @click="onBack">
          <AppIcon v-if="isCustom" name="back" size="40" color="#fff" />
          <nut-icon v-else custom-color="#fff" name="left" size="20rpx"></nut-icon>
        </view>
        <slot name="left" />
      </view>
      <view class="title ellipsis" :style="titleStyle">
        <slot>{{ title }}</slot>
      </view>
      <view class="right">
        <slot name="right" />
      </view>
    </view>
  </view>
  <view class="navbar-holder" :style="{ height: statusBarHeight + navHeight + 'px' }" />
</template>

<script setup>
import { ref, computed } from 'vue';
import AppIcon from './AppIcon.vue';

defineProps({
  title: { type: String, default: '' },
  showBack: { type: Boolean, default: true },
  bg: { type: String, default: '#FFFFFF' },
  isCustom: { type: Boolean, default: false }
});
const emit = defineEmits(['back']);

const statusBarHeight = ref(20);
const navHeight = ref(44);
const capsuleRight = ref(0);
const capsuleWidth = ref(0);
const capsuleLeft = ref(0);
const windowWidth = ref(375);

try {
  const info = uni.getSystemInfoSync();
  // #ifdef MP-WEIXIN
  statusBarHeight.value = info.statusBarHeight || 20;
  const menu = uni.getMenuButtonBoundingClientRect();
  navHeight.value = (menu.top - info.statusBarHeight) * 2 + menu.height;
  capsuleRight.value = menu.right || 0;
  capsuleWidth.value = menu.width || 0;
  capsuleLeft.value = menu.left || 0;
  // #endif
  // #ifndef MP-WEIXIN
  // H5 / APP 等非小程序环境没有微信胶囊，状态栏也不需要额外留白
  statusBarHeight.value = 0;
  navHeight.value = 44;
  // #endif
  windowWidth.value = info.windowWidth || 375;
} catch (e) {
  /* ignore */
}

const barStyle = computed(() => {
  const style = { height: navHeight.value + 'px' };
  // #ifdef MP-WEIXIN
  if (capsuleLeft.value) {
    // 整个 bar 右侧留出胶囊空间，避免右侧按钮被遮挡
    style.paddingRight = (windowWidth.value - capsuleLeft.value + 16) + 'px';
  }
  // #endif
  return style;
});

const titleStyle = computed(() => {
  const style = {};
  // #ifdef MP-WEIXIN
  if (capsuleLeft.value && capsuleRight.value) {
    // 标题区左右留出安全边距，防止与胶囊/返回按钮重叠
    // bar 已通过 paddingRight 避开右侧胶囊，这里只保留较小内边距
    style.paddingLeft = '8px';
    style.paddingRight = '8px';
  }
  // #endif
  return style;
});

function onBack() {
  emit('back');
  const pages = getCurrentPages();
  if (pages.length > 1) {
    uni.navigateBack();
  } else {
    uni.reLaunch({ url: '/pages/index/index' });
  }
}
</script>

<style lang="scss" scoped>
.navbar {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  z-index: 98;
  background: linear-gradient(135deg, $brand-primary, $brand-primary-2);
  box-shadow: 0 4rpx 16rpx rgba(255, 90, 31, 0.12);
}
.bar {
  display: flex;
  align-items: center;
  padding: 0 24rpx;
  position: relative;
}
.left,
.right {
  // min-width: 80rpx;
  display: flex;
  align-items: center;
  flex-shrink: 0;
}
.right {
  justify-content: flex-end;
}
.title {
  flex: 1;
  text-align: center;
  font-size: 34rpx;
  font-weight: 700;
  color: #fff;
  letter-spacing: 1rpx;
  min-width: 0;
  box-sizing: border-box;
}
.back-icon {
  width: 56rpx;
  height: 56rpx;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.25);
  display: flex;
  align-items: center;
  justify-content: center;
}
.navbar-holder {
  width: 100%;
}
</style>
