<template>
  <view class="stepper" :class="['size-' + size]">
    <view
      v-if="modelValue > 0"
      class="step-btn minus"
      :class="{ disabled: modelValue <= min }"
      @click="onMinus"
    >
      <AppIcon class="sym" name="minus" size="24" color="#F5B6C1" />
    </view>
    <text v-if="modelValue > 0 && !onlyButton" class="num">{{ modelValue }}</text>
    <view class="step-btn add" @click="onAdd">
      <AppIcon class="sym" name="add" size="24" color="#fff" />
    </view>
  </view>
</template>

<script setup>
import AppIcon from './AppIcon.vue';

const props = defineProps({
  modelValue: { type: Number, default: 0 },
  min: { type: Number, default: 0 },
  max: { type: Number, default: 99 },
  size: { type: String, default: 'md' },
  onlyButton: { type: Boolean, default: false }
});
const emit = defineEmits(['update:modelValue', 'change']);

function onAdd() {
  if (props.modelValue >= props.max) return;
  const v = props.modelValue + 1;
  emit('update:modelValue', v);
  emit('change', v);
}
function onMinus() {
  if (props.modelValue <= props.min) return;
  const v = props.modelValue - 1;
  emit('update:modelValue', v);
  emit('change', v);
}
</script>

<style lang="scss" scoped>
.stepper {
  display: flex;
  align-items: center;
}
.step-btn {
  width: 44rpx;
  height: 44rpx;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  &.add {
    background: linear-gradient(135deg, $brand-primary, $brand-primary-2);
    color: #fff;
    box-shadow: $shadow-press;
  }
  &.minus {
    background: #fff;
    border: 2rpx solid $brand-primary;
    color: $brand-primary;
  }
  &.disabled {
    opacity: 0.4;
  }
  .sym {
    font-size: 36rpx;
    line-height: 1;
    font-weight: 600;
  }
}
.num {
  min-width: 56rpx;
  text-align: center;
  font-size: 30rpx;
  font-weight: 700;
  color: $text-1;
}
.size-sm {
  .step-btn {
    width: 38rpx;
    height: 38rpx;
  }
  .step-btn .sym {
    font-size: 30rpx;
  }
  .num {
    min-width: 44rpx;
    font-size: 26rpx;
  }
}
</style>
