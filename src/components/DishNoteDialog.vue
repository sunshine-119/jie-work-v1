<template>
  <view class="dialog-mask" :class="{ show: visible }" @click="onMask" @touchmove.stop.prevent>
    <view class="dialog" @click.stop @touchmove.stop.prevent>
      <!-- 头部 -->
      <view class="dialog-head">
        <view class="head-info">
          <text class="head-title">{{ isCustom ? '想吃别的？' : '给这道菜备注' }}</text>
          <text class="head-sub">{{ isCustom ? couple.myDisplayName + '点名的，' + couple.partnerDisplayName + '安排' : dishName }}</text>
        </view>
        <view class="close-btn" @click="onClose">
          <AppIcon name="close" size="24" color="#999" />
        </view>
      </view>

      <!-- 自定义菜名输入 -->
      <view v-if="isCustom" class="field">
        <text class="field-label">想吃点啥</text>
        <input
          :value="customName"
          class="field-input"
          placeholder="比如：可乐鸡翅、紫菜蛋花汤、妈妈做的面..."
          placeholder-class="field-ph"
          maxlength="20"
          :adjust-position="true"
          @input="e => customName = e.detail.value"
        />
      </view>

      <!-- 辣度选择 -->
      <view class="field">
        <text class="field-label">辣度</text>
        <view class="spicy-row">
          <view
            v-for="s in spicyOptions"
            :key="s.value"
            class="spicy-chip"
            :class="{ active: spicy === s.value }"
            @click="spicy = s.value"
          >
            <text class="chip-emoji">{{ s.emoji }}</text>
            <text class="chip-text">{{ s.label }}</text>
          </view>
        </view>
      </view>

      <!-- 忌口备注 -->
      <view class="field">
        <text class="field-label">忌口 / 小要求</text>
        <textarea
          :value="dietNote"
          class="field-textarea"
          placeholder="不要葱、少油、多加点辣、温热着喝..."
          placeholder-class="field-ph"
          maxlength="50"
          :adjust-position="true"
          @input="e => dietNote = e.detail.value"
        />
        <view class="quick-notes">
          <text
            v-for="n in quickNotes"
            :key="n"
            class="qn-chip"
            :class="{ active: dietNote.includes(n) }"
            @click="toggleNote(n)"
          >{{ n }}</text>
        </view>
      </view>

      <!-- 加入按钮 -->
      <view class="dialog-btn" :class="{ disabled: !canSubmit }" @click="onSubmit">
        <text>{{ isCustom ? '加入小餐车' : '加进小餐车' }}</text>
      </view>
    </view>
  </view>
  <Toast />
</template>

<script setup>
import { ref, computed, watch } from 'vue';
import AppIcon from './AppIcon.vue';
import Toast from './Toast.vue';
import { useCoupleStore } from '@/store/couple';
import { usePreferenceStore } from '@/store/preference';
import { toast } from '@/utils/toast';
import { storage } from '@/utils/storage';

const couple = useCoupleStore();
const preference = usePreferenceStore();

const props = defineProps({
  visible: { type: Boolean, default: false },
  /** dish 对象：传 null 表示自定义想吃（女友端「想吃别的？」） */
  dish: { type: Object, default: null }
});
const emit = defineEmits(['close', 'add']);

const spicyOptions = [
  { value: 0, label: '不辣', emoji: '🌱' },
  { value: 1, label: '微辣', emoji: '🌶' },
  { value: 2, label: '中辣', emoji: '🌶🌶' },
  { value: 3, label: '重辣', emoji: '🌶🌶🌶' }
];
const quickNotes = computed(() => {
  const profileItems = [
    ...preference.dislikes.map((d) => `不要${d}`),
    ...preference.tastePrefs
  ];
  const defaults = ['少油', '少盐', '多加点辣', '温热着', '不要太甜'];
  const combined = [...new Set([...profileItems, ...defaults])];
  return combined.slice(0, 8);
});
const NOTE_HISTORY_KEY = 'oc_dish_notes';

const isCustom = computed(() => !props.dish);
const dishName = computed(() => (props.dish ? props.dish.name : ''));

const customName = ref('');
const spicy = ref(0);
const dietNote = ref('');

function loadNoteHistory() {
  return storage.get(NOTE_HISTORY_KEY, {});
}

function saveNoteHistory(dishId, data) {
  const history = loadNoteHistory();
  history[dishId] = {
    spicy: data.spicy,
    dietNote: data.dietNote,
    updatedAt: Date.now()
  };
  storage.set(NOTE_HISTORY_KEY, history);
}

const canSubmit = computed(() => {
  if (isCustom.value) return customName.value.trim().length > 0;
  return true;
});

// 弹窗打开时重置，并回显上次备注
watch(
  () => props.visible,
  (v) => {
    if (v) {
      customName.value = '';
      spicy.value = props.dish ? props.dish.spicy || 0 : 0;
      dietNote.value = '';
      if (props.dish && props.dish.id) {
        const history = loadNoteHistory();
        const saved = history[props.dish.id];
        if (saved) {
          spicy.value = saved.spicy ?? spicy.value;
          dietNote.value = saved.dietNote || '';
        }
      }
    }
  }
);

function toggleNote(n) {
  if (dietNote.value.includes(n)) {
    dietNote.value = dietNote.value.split(' ').filter((s) => s !== n).join(' ');
  } else {
    dietNote.value = dietNote.value ? `${dietNote.value} ${n}` : n;
  }
}
function onMask() {
  onClose();
}
function onClose() {
  emit('close');
}
function onSubmit() {
  if (!canSubmit.value) {
    toast.info('请输入想吃的菜名');
    return;
  }
  const payload = {
    name: customName.value.trim(),
    spicy: spicy.value,
    dietNote: dietNote.value.trim()
  };
  if (props.dish && props.dish.id) {
    saveNoteHistory(props.dish.id, payload);
  }
  emit('add', payload);
  emit('close');
}
</script>

<style lang="scss" scoped>
.dialog-mask {
  position: fixed;
  inset: 0;
  z-index: 1100;
  background: rgba(74, 40, 60, 0.45);
  display: flex;
  align-items: flex-end;
  justify-content: center;
  opacity: 0;
  visibility: hidden;
  pointer-events: none;
  transition: opacity 0.25s ease, visibility 0.25s ease;
  &.show {
    opacity: 1;
    visibility: visible;
    pointer-events: auto;
  }
}
.dialog {
  width: 100%;
  box-sizing: border-box;
  background: #fff;
  border-top-left-radius: $radius-xl;
  border-top-right-radius: $radius-xl;
  padding: 32rpx 28rpx;
  padding-bottom: calc(16px + env(safe-area-inset-bottom));
  transform: translateY(100%);
  transition: transform 0.25s ease;
}
.dialog-mask.show .dialog {
  transform: translateY(0);
}
.dialog-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  margin-bottom: 24rpx;
}
.head-info {
  flex: 1;
}
.head-title {
  font-size: 36rpx;
  font-weight: 800;
  color: $text-1;
}
.head-sub {
  display: block;
  margin-top: 4rpx;
  font-size: 24rpx;
  color: $text-3;
}
.close-btn {
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
.field {
  margin-bottom: 24rpx;
}
.field-label {
  display: block;
  margin-bottom: 12rpx;
  font-size: 26rpx;
  font-weight: 600;
  color: $text-1;
}
.field-input {
  width: 100%;
  box-sizing: border-box;
  height: 88rpx;
  padding: 0 24rpx;
  background: $bg-surface-alt;
  border-radius: $radius-md;
  font-size: 28rpx;
  color: $text-1;
}
.field-textarea {
  width: 100%;
  box-sizing: border-box;
  min-height: 120rpx;
  padding: 20rpx 24rpx;
  background: $bg-surface-alt;
  border-radius: $radius-md;
  font-size: 26rpx;
  color: $text-1;
}
.field-ph {
  color: $text-4;
}
.spicy-row {
  display: flex;
  gap: 16rpx;
  flex-wrap: wrap;
}
.spicy-chip {
  flex: 1;
  min-width: 140rpx;
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 20rpx 0;
  background: $bg-surface-alt;
  border-radius: $radius-md;
  border: 2rpx solid transparent;
  .chip-emoji {
    font-size: 32rpx;
  }
  .chip-text {
    margin-top: 6rpx;
    font-size: 24rpx;
    color: $text-2;
  }
  &.active {
    // background: rgba(245, 182, 193, 0.18);
    border-color: var(--c-primary, #F5B6C1);
    .chip-text {
      color: var(--c-primary-dark, #E89AA8);
      font-weight: 700;
    }
  }
}
.quick-notes {
  display: flex;
  flex-wrap: wrap;
  gap: 12rpx;
  margin-top: 16rpx;
}
.qn-chip {
  padding: 10rpx 20rpx;
  background: $bg-surface-alt;
  border-radius: $radius-pill;
  font-size: 22rpx;
  color: $text-2;
  border: 2rpx solid transparent;
  &.active {
    background: rgba(255, 255, 255, 0.15);
    border-color: var(--c-primary, #F5B6C1);
    color: var(--c-primary, #F5B6C1);
    font-weight: 600;
  }
}
.dialog-btn {
  margin-top: 16rpx;
  height: 96rpx;
  background: linear-gradient(135deg, var(--c-primary, #F5B6C1), var(--c-primary-2, #FFD6DD));
  color: #fff;
  font-size: 32rpx;
  font-weight: 800;
  border-radius: $radius-pill;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: $shadow-press;
  &.disabled {
    opacity: 0.5;
  }
}
</style>
