<template>
  <view
    class="dish-emoji"
    :class="['size-' + size]"
    :style="{ background: imageUrl ? 'transparent' : bg }"
  >
    <image v-if="imageUrl" class="de-img" :src="imageUrl" mode="aspectFill" />
    <text v-else class="de-text">{{ emoji }}</text>
  </view>
</template>

<script setup>
/**
 * 菜品缩略图组件
 * -----------------------------------------------------------------------------
 * 统一展示菜品缩略图：有图片时显示图片（cover 模式），无图片时使用 emoji + 渐变背景。
 * 用于购物车栏、订单明细、订单列表、回忆相册等小尺寸场景。
 */
import { computed } from 'vue';
import { resolveUrl } from '@/utils/server';

const props = defineProps({
  emoji: { type: String, default: '🍽️' },
  bg: { type: String, default: 'linear-gradient(135deg, #FFF8F2, #F5E6D3)' },
  size: { type: String, default: 'md' }, // sm / md / lg
  image: { type: String, default: '' }
});

const imageUrl = computed(() => (props.image ? resolveUrl(props.image) : ''));
</script>

<style lang="scss" scoped>
.dish-emoji {
  border-radius: $radius-sm;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  overflow: hidden;
  line-height: 0;
  .de-text {
    font-size: 36rpx;
    line-height: 1;
  }
  .de-img {
    width: 100% !important;
    height: 100% !important;
    display: block !important;
    :deep(img) {
      width: 100% !important;
      height: 100% !important;
      object-fit: cover !important;
      display: block !important;
    }
    :deep(div) {
      width: 100% !important;
      height: 100% !important;
      background-size: cover !important;
      background-position: center center !important;
    }
  }
  &.size-sm {
    width: 56rpx;
    height: 56rpx;
    .de-text {
      font-size: 28rpx;
    }
  }
  &.size-md {
    width: 88rpx;
    height: 88rpx;
    .de-text {
      font-size: 44rpx;
    }
  }
  &.size-lg {
    width: 96rpx;
    height: 96rpx;
    .de-text {
      font-size: 52rpx;
    }
  }
}
</style>
