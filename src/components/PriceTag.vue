<template>
  <view class="price-tag" :class="['size-' + size]">
    <text class="symbol" :style="{ color }">¥</text>
    <text class="int" :style="{ color }">{{ intPart }}</text>
    <text v-if="decPart" class="dec" :style="{ color }">.{{ decPart }}</text>
    <text v-if="original" class="original">¥{{ original }}</text>
  </view>
</template>

<script setup>
import { computed } from 'vue';
const props = defineProps({
  value: { type: [Number, String], default: 0 },
  original: { type: [Number, String], default: null },
  size: { type: String, default: 'md' },
  color: { type: String, default: '' }
});
const num = computed(() => Number(props.value) || 0);
const intPart = computed(() => Math.floor(num.value));
const decPart = computed(() => {
  const d = Math.round((num.value - Math.floor(num.value)) * 10);
  return d > 0 ? String(d) : '';
});
</script>

<style lang="scss" scoped>
.price-tag {
  display: inline-flex;
  align-items: baseline;
  color: $brand-primary;
  font-weight: 800;
  .symbol {
    font-size: 0.62em;
    margin-right: 2rpx;
  }
  .dec {
    font-size: 0.7em;
  }
  .original {
    margin-left: 12rpx;
    font-size: 0.6em;
    font-weight: 400;
    color: $text-3;
    text-decoration: line-through;
  }
}
.size-sm {
  font-size: 24rpx;
}
.size-md {
  font-size: 32rpx;
}
.size-lg {
  font-size: 44rpx;
}
.size-xl {
  font-size: 56rpx;
}
</style>
