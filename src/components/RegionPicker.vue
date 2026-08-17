<template>
  <view class="region-picker">
    <view class="rp-body" @click="open">
      <text v-if="displayText" class="rp-text">{{ displayText }}</text>
      <text v-else class="rp-placeholder">{{ placeholder }}</text>
      <nut-icon name="rect-right" size="24rpx" :custom-color="couple.themeStyle['--c-primary']" />
    </view>

    <!-- 遮罩与弹窗为兄弟节点，避免小程序端父级 fixed 容器罩住子级 -->
    <view
      v-show="visible"
      class="rp-mask"
      :class="{ show: showClass }"
      @click="close"
    />
    <view
      v-show="visible"
      class="rp-sheet"
      :class="{ show: showClass }"
      @click.stop
    >
      <view class="rp-popup-header">
        <text class="rp-popup-title">请选择省市区</text>
        <view class="rp-close" @click="close">
          <AppIcon name="close" size="28" color="#666" />
        </view>
      </view>
      <view class="rp-cascader-wrap">
        <nut-cascader
          v-model="cascaderValue"
          :options="options"
          text-key="text"
          value-key="value"
          children-key="children"
          :poppable="false"
          :title-ellipsis="false"
          @change="onChange"
        />
      </view>
    </view>
  </view>
</template>

<script setup>
import { computed, ref } from 'vue';
import { useCascaderAreaData } from '@vant/area-data';
import { codeToText } from '@/utils/region';
import AppIcon from './AppIcon.vue';
import { useCoupleStore } from '@/store/couple';

const couple = useCoupleStore();

const props = defineProps({
  modelValue: { type: Array, default: () => ['', '', ''] },
  placeholder: { type: String, default: '请选择省市区' }
});

const emit = defineEmits(['update:modelValue', 'change']);

const arrowColor = '#C9BFC4';
const visible = ref(false);
const showClass = ref(false);
const options = useCascaderAreaData();

const cascaderValue = computed({
  get: () => {
    const v = props.modelValue || [];
    return v.filter(Boolean);
  },
  set: (val) => {
    const value = Array.isArray(val) ? val : [];
    emit('update:modelValue', value);
    emit('change', value);
  }
});

const displayText = computed(() => codeToText(props.modelValue));

function open() {
  showClass.value = false;
  visible.value = true;
  setTimeout(() => {
    showClass.value = true;
  }, 20);
}

function close() {
  showClass.value = false;
  setTimeout(() => {
    visible.value = false;
  }, 250);
}

function onChange() {
  close();
}
</script>

<style lang="scss" scoped>
.region-picker {
  width: 100%;
}
.rp-body {
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
  height: 88rpx;
  padding: 0 24rpx;
  background: $bg-surface-alt;
  border-radius: $radius-md;
  box-sizing: border-box;
}
.rp-text {
  flex: 1;
  font-size: 28rpx;
  color: $text-1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.rp-placeholder {
  flex: 1;
  font-size: 28rpx;
  color: $text-4;
}
.rp-mask {
  position: fixed;
  inset: 0;
  z-index: 2000;
  background: rgba(74, 40, 60, 0);
  transition: background 0.25s ease-out;
}
.rp-mask.show {
  background: rgba(74, 40, 60, 0.45);
}
.rp-sheet {
  position: fixed;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: 2001;
  height: 60vh;
  background: #fff;
  border-radius: $radius-lg $radius-lg 0 0;
  display: flex;
  flex-direction: column;
  transform: translateY(100%);
  transition: transform 0.25s ease-out;
}
.rp-sheet.show {
  transform: translateY(0);
}
.rp-popup-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 32rpx 28rpx 20rpx;
  flex-shrink: 0;
}
.rp-popup-title {
  font-size: 32rpx;
  font-weight: 600;
  color: $text-1;
}
.rp-close {
  width: 56rpx;
  height: 56rpx;
  border-radius: 50%;
  background: $bg-surface-alt;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 28rpx;
  color: $text-2;
}
.rp-cascader-wrap {
  flex: 1;
  overflow: hidden;
  min-height: 0;
}
/* H5端样式穿透：小程序端需在页面级样式中覆盖，见 pages/address/edit.vue */
::v-deep .nut-tabs .nut-tabs__titles {
  background: transparent;
}
::v-deep .nut-cascader-pane {
  height: calc(60vh - 200rpx);
}
::v-deep .nut-cascader-item.nut-tabs.horizontal .nut-tabs__titles .nut-tabs__titles-item {
  width: auto;
}
</style>
