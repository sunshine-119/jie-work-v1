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
        <text class="sp-title">{{ isEdit ? '编辑分类' : '添加自定义分类' }}</text>
        <view class="sp-close" @click="onClose">
          <AppIcon name="close" size="24" color="#999" />
        </view>
      </view>

      <view class="name-section">
        <text class="section-label">分类名称 <text class="required-mark">*</text></text>
        <input
          :value="categoryName"
          class="name-input"
          placeholder="请输入分类名称"
          placeholder-class="name-ph"
          maxlength="6"
          @input="(e) => (categoryName = e.detail.value)"
        />
        <view v-if="nameError" class="name-error">
          <text>{{ nameError }}</text>
        </view>
      </view>

      <view class="desc-section">
        <text class="section-label">分类描述</text>
        <input
          :value="categoryDesc"
          class="desc-input"
          placeholder="一句话描述这个分类..."
          placeholder-class="desc-ph"
          maxlength="20"
          @input="(e) => (categoryDesc = e.detail.value)"
        />
      </view>

      <view class="emoji-section">
        <text class="section-label">选择图标 <text class="required-mark">*</text></text>
        <view class="emoji-grid">
          <view
            v-for="e in filteredEmojiList"
            :key="e"
            class="emoji-item"
            :class="{ active: selectedEmoji === e, disabled: isEmojiUsed(e) }"
            @click="onSelectEmoji(e)"
          >
            <text class="emoji-text">{{ e }}</text>
            <view v-if="isEmojiUsed(e)" class="emoji-taken">
              <text class="taken-text">已用</text>
            </view>
          </view>
        </view>
      </view>

      <view class="btn-row">
        <view class="btn-cancel" @click="onClose">
          <text>取消</text>
        </view>
        <view class="btn-confirm" @click="onConfirm">
          <text>确定</text>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup>
import { ref, computed, watch, nextTick } from 'vue';
import AppIcon from './AppIcon.vue';
import { toast } from '@/utils/toast';

const props = defineProps({
  visible: { type: Boolean, default: false },
  existingEmojis: { type: Array, default: () => [] },
  existingNames: { type: Array, default: () => [] },
  editingCategory: { type: Object, default: null }
});

const emit = defineEmits(['update:visible', 'confirm']);

const categoryName = ref('');
const categoryDesc = ref('');
const selectedEmoji = ref('🍽️');
const closing = ref(false);
const enterReady = ref(false);
const nameError = ref('');

const isEdit = computed(() => !!props.editingCategory);

const emojiList = [
  '🍳', '🍱', '🍲', '🍜', '🍰', '🍿',
  '🥘', '🍤', '🍥', '🥗', '🍕', '🌮',
  '🥟', '🍙', '🍚', '🍛', '🍣',
  '🥐', '🥞', '🧇', '🥓', '🌭', '🍔',
  '🍟', '🌯', '🥙', '🍝', '🥠',
  '🍦', '🍧', '🍨', '🍩', '🍪', '🎂',
  '🍫', '🍬', '🍭', '🍮', '🍯', '🥧',
  '🍵', '☕', '🥤', '🧋', '🧃', '🧊',
  '🍗', '🍖', '🦀', '🦐', '🦞', '🐟',
  '🐠', '🥧', '🍮', '🍭', '🍬', '🍫'
];

const filteredEmojiList = computed(() => {
  return [...new Set(emojiList)];
});

const usedEmojis = computed(() => {
  const list = props.existingEmojis || [];
  if (props.editingCategory?.icon) {
    return list.filter(e => e !== props.editingCategory.icon);
  }
  return list;
});

function isEmojiUsed(e) {
  return usedEmojis.value.includes(e);
}

const maskVisible = computed(() => props.visible || closing.value);
const showClass = computed(() => enterReady.value && props.visible && !closing.value);

watch(() => props.visible, (v) => {
  if (v) {
    closing.value = false;
    enterReady.value = false;
    nameError.value = '';
    if (props.editingCategory) {
      categoryName.value = props.editingCategory.name || '';
      categoryDesc.value = props.editingCategory.desc || '';
      selectedEmoji.value = props.editingCategory.icon || '🍽️';
    } else {
      categoryName.value = '';
      categoryDesc.value = '';
      selectedEmoji.value = '🍽️';
    }
    nextTick(() => {
      setTimeout(() => { enterReady.value = true; }, 20);
    });
  }
});

function onSelectEmoji(e) {
  if (isEmojiUsed(e)) {
    toast.info('该图标已被使用');
    return;
  }
  selectedEmoji.value = e;
}

function onClose() {
  closing.value = true;
  enterReady.value = false;
  setTimeout(() => {
    emit('update:visible', false);
    closing.value = false;
  }, 260);
}

function onConfirm() {
  const name = categoryName.value.trim();
  if (!name) {
    toast.info('请输入分类名称');
    return;
  }
  const existingNames = props.existingNames || [];
  if (isEdit.value) {
    const originalName = props.editingCategory?.name;
    if (name !== originalName && existingNames.some((n) => n === name)) {
      nameError.value = '该分类名称已存在，请换一个';
      return;
    }
  } else {
    if (existingNames.some((n) => n === name)) {
      nameError.value = '该分类名称已存在，请换一个';
      return;
    }
  }
  if (!selectedEmoji.value) {
    toast.info('请选择分类图标');
    return;
  }
  if (isEmojiUsed(selectedEmoji.value)) {
    toast.info('该图标已被使用，请选择其他图标');
    return;
  }
  nameError.value = '';

  if (isEdit.value) {
    emit('confirm', {
      id: props.editingCategory.id,
      name: name,
      desc: categoryDesc.value.trim(),
      icon: selectedEmoji.value,
      isCustom: props.editingCategory.isCustom,
      sort: props.editingCategory.sort
    });
  } else {
    emit('confirm', {
      id: 'custom_' + Date.now(),
      name: name,
      desc: categoryDesc.value.trim(),
      icon: selectedEmoji.value,
      isCustom: true,
      sort: 100 + Math.floor(Math.random() * 99)
    });
  }
  onClose();
}
</script>

<style lang="scss" scoped>
.sheet-mask {
  position: fixed;
  inset: 0;
  z-index: 1200;
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
  margin-bottom: 32rpx;
}
.sp-title {
  font-size: 36rpx;
  font-weight: 600;
  color: #333;
}
.sp-close {
  padding: 12rpx;
}
.section-label {
  font-size: 28rpx;
  color: #666;
  margin-bottom: 16rpx;
  display: block;
  .required-mark {
    color: var(--c-danger, #e74c3c);
    font-weight: 600;
    margin-left: 4rpx;
  }
}
.emoji-section {
  margin-bottom: 32rpx;
}
.emoji-grid {
  display: flex;
  flex-wrap: wrap;
  gap: 16rpx;
}
.emoji-item {
  width: 80rpx;
  height: 80rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 16rpx;
  background: #f5f5f5;
  transition: all 0.2s;
  position: relative;
  &.active {
    background: linear-gradient(135deg, var(--c-primary, #F5B6C1), var(--c-accent, #C8B6D9));
    transform: scale(1.1);
  }
  &.disabled {
    opacity: 0.35;
    cursor: not-allowed;
  }
}
.emoji-text {
  font-size: 40rpx;
}
.emoji-taken {
  position: absolute;
  bottom: 0;
  right: 0;
  background: rgba(231, 76, 60, 0.85);
  border-radius: 8rpx 0 8rpx 0;
  padding: 2rpx 6rpx;
}
.taken-text {
  font-size: 18rpx;
  color: #fff;
  line-height: 1;
}
.name-section {
  margin-bottom: 32rpx;
}
.name-input {
  width: 100%;
  height: 80rpx;
  background: $bg-surface-alt;
  border-radius: 16rpx;
  padding: 0 24rpx;
  font-size: 32rpx;
  color: #333;
}
.name-ph {
  color: #999;
}
.name-error {
  margin-top: 12rpx;
  font-size: 24rpx;
  color: #e74c3c;
}
.desc-section {
  margin-bottom: 32rpx;
}
.desc-input {
  width: 100%;
  height: 80rpx;
  background: $bg-surface-alt;
  border-radius: 16rpx;
  padding: 0 24rpx;
  font-size: 28rpx;
  color: #333;
}
.desc-ph {
  color: #999;
}
.btn-row {
  display: flex;
  gap: 24rpx;
}
.btn-cancel,
.btn-confirm {
  flex: 1;
  height: 88rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 44rpx;
  font-size: 32rpx;
  font-weight: 500;
  transition: all 0.2s;
}
.btn-cancel {
  background: #f5f5f5;
  color: #666;
  &:active {
    background: #e8e8e8;
  }
}
.btn-confirm {
  background: linear-gradient(135deg, var(--c-primary, #F5B6C1), var(--c-primary-2, #FFD6DD));
  color: #fff;
  &:active {
    opacity: 0.85;
  }
}
</style>
