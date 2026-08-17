<template>
  <view
    v-show="maskVisible"
    class="sheet-mask"
    :class="{ show: showClass }"
    @click="onClose"
    @touchmove.stop.prevent
  >
    <view class="sheet-popup" @click.stop @touchmove.stop.prevent>
      <view class="sp-head">
        <text class="sp-title">{{ title }}</text>
        <view class="sp-close" @click="onClose">
          <AppIcon name="close" size="24" color="#999" />
        </view>
      </view>
      <scroll-view scroll-y class="sp-list" :show-scrollbar="false">
        <view
          v-for="cat in categories"
          :key="cat.id"
          class="sp-item"
          :class="{ active: cat.id === currentValue }"
          @click="onPick(cat)"
        >
          <text class="cat-icon">{{ cat.icon || '🍽️' }}</text>
          <text class="cat-name">{{ cat.name }}</text>
          <text v-if="cat.id === currentValue" class="cat-check">✓</text>
        </view>
        <view class="sp-item add-cat" @click="onAddNew">
          <text class="add-icon">+</text>
          <text class="add-text">添加自定义分类</text>
        </view>
      </scroll-view>
    </view>
  </view>
</template>

<script setup>
import { ref, computed, watch, nextTick } from 'vue';
import AppIcon from './AppIcon.vue';

const props = defineProps({
  visible: { type: Boolean, default: false },
  categories: { type: Array, default: () => [] },
  currentValue: { type: [String, null], default: null },
  title: { type: String, default: '选择分类' }
});

const emit = defineEmits(['update:visible', 'change', 'add-category', 'open-add-category']);

const closing = ref(false);
const enterReady = ref(false);

const maskVisible = computed(() => props.visible || closing.value);
const showClass = computed(() => enterReady.value && props.visible && !closing.value);

watch(() => props.visible, (v) => {
  if (v) {
    closing.value = false;
    enterReady.value = false;
    nextTick(() => {
      setTimeout(() => { enterReady.value = true; }, 20);
    });
  }
});

function onClose() {
  closing.value = true;
  enterReady.value = false;
  setTimeout(() => {
    emit('update:visible', false);
    closing.value = false;
  }, 260);
}

function onPick(cat) {
  emit('change', cat.id, cat);
  onClose();
}

function onAddNew() {
  emit('open-add-category');
}

function onCategoryAdded(newCat) {
  emit('add-category', newCat);
}
</script>

<style lang="scss" scoped>
.sheet-mask {
  position: fixed;
  inset: 0;
  z-index: 1100;
  background: rgba(74, 40, 60, 0.45);
  display: flex !important;
  align-items: flex-end;
  justify-content: center;
  opacity: 0;
  visibility: hidden;
  pointer-events: none;
  transition: opacity 0.25s ease-out, visibility 0s 0.25s;
  &.show {
    opacity: 1;
    visibility: visible;
    pointer-events: auto;
    transition: opacity 0.25s ease-out, visibility 0s 0s;
  }
}
.sheet-popup {
  width: 100%;
  background: #fff;
  border-top-left-radius: 40rpx;
  border-top-right-radius: 40rpx;
  padding: 32rpx 28rpx;
  padding-bottom: calc(16px + env(safe-area-inset-bottom));
  transform: translateY(100%);
  transition: transform 0.25s ease-out;
}
.sheet-mask.show .sheet-popup {
  transform: translateY(0);
}
.sp-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 24rpx;
}
.sp-title {
  font-size: 36rpx;
  font-weight: 600;
  color: #333;
}
.sp-close {
  padding: 12rpx;
}
.sp-list {
  max-height: 60vh;
}
.sp-item {
  display: flex;
  align-items: center;
  padding: 24rpx 16rpx;
  border-radius: 16rpx;
  margin-bottom: 8rpx;
  transition: background 0.2s;
  &:active {
    background: #f5f5f5;
  }
  &.active {
    background: linear-gradient(135deg, var(--c-primary, #F5B6C1), var(--c-accent, #C8B6D9));
  }
  &.active .cat-name,
  &.active .cat-check {
    color: #fff;
  }
}
.cat-icon {
  font-size: 40rpx;
  margin-right: 16rpx;
}
.cat-name {
  flex: 1;
  font-size: 32rpx;
  color: #333;
}
.cat-check {
  font-size: 32rpx;
  color: var(--c-primary, #F5B6C1);
  font-weight: 600;
}
.add-cat {
  justify-content: center;
  background: var(--c-bg-page);
  margin-top: 16rpx;
  &:active {
    background: #f0f0f0;
  }
}
.add-icon {
  font-size: 36rpx;
  color: var(--c-primary, #F5B6C1);
  margin-right: 12rpx;
  font-weight: 600;
}
.add-text {
  font-size: 30rpx;
  color: var(--c-primary, #F5B6C1);
}
</style>
