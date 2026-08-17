<template>
  <view class="empty">
    <AppIcon class="icon" :name="icon" size="96" />
    <text class="title">{{ text }}</text>
    <text v-if="desc" class="desc">{{ desc }}</text>
    <view v-if="btnText" class="btn" @click="$emit('action')">{{ btnText }}</view>
  </view>
</template>

<script setup>
import AppIcon from './AppIcon.vue';

defineProps({
  icon: { type: String, default: 'menu' },
  text: { type: String, default: '空空如也' },
  desc: { type: String, default: '' },
  btnText: { type: String, default: '' }
});
defineEmits(['action']);
</script>

<style lang="scss" scoped>
.empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 96rpx 0;
}
.icon {
  line-height: 1.2;
  filter: grayscale(0.2);
}
.title {
  margin-top: 24rpx;
  font-size: 30rpx;
  font-weight: 600;
  color: $text-2;
}
.desc {
  margin-top: 12rpx;
  font-size: 24rpx;
  color: $text-3;
}
.btn {
  margin-top: 32rpx;
  padding: 18rpx 48rpx;
  background: linear-gradient(135deg, $brand-primary, $brand-primary-2);
  color: #fff;
  font-size: 28rpx;
  font-weight: 600;
  border-radius: $radius-pill;
  box-shadow: $shadow-press;
}
</style>
