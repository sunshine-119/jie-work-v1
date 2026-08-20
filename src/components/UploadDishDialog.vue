<template>
  <view
    v-show="visible"
    class="upload-mask"
    :class="{ show: visible }"
    @click="onMaskClick"
    @touchmove.stop.prevent
  >
    <view class="upload-sheet" @click.stop @touchmove.stop.prevent>
      <!-- 头部 -->
      <view class="upload-head">
        <view class="head-info">
          <text class="head-title">上传新菜品</text>
          <text class="head-sub"
            >加进专属菜单，给{{ couple.partnerDisplayName }}出新题</text
          >
        </view>
        <view class="head-actions">
          <view class="head-icon-btn" @click="goToFullUpload">
            <AppIcon name="expand" size="32" color="#666" />
          </view>
          <view class="close-btn" @click="onClose">
            <AppIcon name="close" size="28" color="#666" />
          </view>
        </view>
      </view>

      <!-- 内容区 -->
      <scroll-view scroll-y class="upload-body" :show-scrollbar="false">
        <view class="upload-inner">
          <!-- 菜名 -->
          <view class="field">
            <text class="field-label">菜名</text>
            <input
              :value="form.name"
              class="field-input"
              placeholder="比如：可乐鸡翅、紫菜蛋花汤..."
              placeholder-class="field-ph"
              maxlength="20"
              :adjust-position="true"
              @input="(e) => (form.name = e.detail.value)"
            />
          </view>

          <!-- 分类 -->
          <view class="field">
            <text class="field-label">分类</text>
            <view class="picker-display" @click="showCategoryPickerVisible = true">
              <text :class="{ 'picker-text': currentUploadCatName === '请选择分类' }">{{ currentUploadCatName }}</text>
              <nut-icon
                name="rect-right"
                size="30rpx"
                :custom-color="couple.themeStyle['--c-primary']"
              />
            </view>
          </view>

          <!-- 价格 -->
          <view class="field">
            <text class="field-label">参考价格（元）</text>
            <input
              :value="form.price"
              class="field-input"
              type="number"
              placeholder="选填，仅供男友端参考"
              placeholder-class="field-ph"
              :adjust-position="true"
              @input="(e) => (form.price = e.detail.value)"
            />
          </view>

          <!-- 辣度 -->
          <view class="field">
            <text class="field-label">辣度</text>
            <view class="chip-row">
              <view
                v-for="(label, idx) in spicyLabels"
                :key="idx"
                class="chip"
                :class="{ active: form.spicy === idx }"
                @click="form.spicy = idx"
              >
                <text>{{ label }}</text>
              </view>
            </view>
          </view>

          <!-- 简介 -->
          <view class="field">
            <text class="field-label">简介</text>
            <textarea
              :value="form.desc"
              class="field-textarea"
              placeholder="一句话描述这道菜..."
              placeholder-class="field-ph"
              maxlength="60"
              :adjust-position="true"
              @input="(e) => (form.desc = e.detail.value)"
            />
          </view>

          <!-- 图片 -->
          <view class="field">
            <text class="field-label">菜品图片</text>
            <ImageUploader
              v-model="form.image"
              :size="200"
              placeholder="点击上传图片"
            />
          </view>

          <!-- 过敏原 -->
          <view class="field">
            <text class="field-label">过敏原（多选）</text>
            <view class="chip-row">
              <view
                v-for="a in allergenOptions"
                :key="a"
                class="chip tag-warn"
                :class="{ active: form.allergens.includes(a) }"
                @click="toggleAllergen(a)"
              >
                <text>{{ a }}</text>
              </view>
              <text v-if="!allergenOptions.length" class="empty-tags"
                >饮食档案中暂无过敏原配置</text
              >
            </view>
          </view>

          <!-- 忌口食材 -->
          <view class="field">
            <text class="field-label">忌口食材（多选）</text>
            <view class="chip-row">
              <view
                v-for="d in dislikeOptions"
                :key="d"
                class="chip tag-dislike"
                :class="{ active: form.dislikeTags.includes(d) }"
                @click="toggleDislike(d)"
              >
                <text>{{ d }}</text>
              </view>
              <text v-if="!dislikeOptions.length" class="empty-tags"
                >饮食档案中暂无忌口配置</text
              >
            </view>
          </view>

          <!-- 菜品标签 -->
          <view class="field">
            <text class="field-label">菜品标签（多选）</text>
            <view class="chip-row">
              <view
                v-for="t in tagOptions"
                :key="t"
                class="chip tag-info"
                :class="{ active: form.tags.includes(t) }"
                @click="toggleTag(t)"
              >
                <text>{{ t }}</text>
              </view>
            </view>
          </view>

          <!-- 饮食标签 -->
          <view class="field">
            <text class="field-label">饮食标签（多选）</text>
            <view class="chip-row">
              <view
                v-for="d in dietTagOptions"
                :key="d"
                class="chip tag-selected"
                :class="{ active: form.dietTags.includes(d) }"
                @click="toggleDietTag(d)"
              >
                <text>{{ d }}</text>
              </view>
            </view>
          </view>
        </view>
      </scroll-view>

      <!-- 底部按钮 -->
      <view class="upload-footer">
        <view
          class="upload-btn"
          :class="{ disabled: uploading }"
          @click="submit"
        >
          <text>{{ uploading ? "上传中..." : "保存菜品" }}</text>
        </view>
      </view>

      <!-- 分类选择 Picker -->
      <CategoryPicker
        v-model:visible="showCategoryPickerVisible"
        :categories="categories"
        :current-value="form.categoryId"
        title="选择分类"
        @change="onCategoryPicked"
        @add-category="onCategoryAdded"
        @open-add-category="openAddCategoryFromPicker"
      />

      <!-- 添加分类弹窗 -->
      <AddCategoryDialog
        v-show="addCatVisible"
        :visible="addCatVisible"
        :existing-emojis="existingEmojis"
        :existing-names="existingNames"
        @update:visible="addCatVisible = $event"
        @confirm="onAddCatConfirm"
      />
    </view>
  </view>
</template>

<script setup>
import { ref, computed, watch } from 'vue';
import ImageUploader from '@/components/ImageUploader.vue';
import CategoryPicker from '@/components/CategoryPicker.vue';
import AddCategoryDialog from '@/components/AddCategoryDialog.vue';
import AppIcon from '@/components/AppIcon.vue';
import { useDishStore } from '@/store/dish';
import { useCoupleStore } from '@/store/couple';
import {
  usePreferenceStore,
  ALLERGEN_OPTIONS,
  DISLIKE_OPTIONS,
} from '@/store/preference';
import { toast } from '@/utils/toast';

const props = defineProps({
  visible: { type: Boolean, default: false },
  initialCategoryId: { type: [String, Number], default: '' },
});

const emit = defineEmits(['close', 'submit']);

const dishStore = useDishStore();
const couple = useCoupleStore();
const preference = usePreferenceStore();

const uploading = ref(false);
const showCategoryPickerVisible = ref(false);
const addCatVisible = ref(false);
const spicyLabels = ["不辣", "微辣", "中辣", "重辣"];

const form = ref({
  name: "",
  categoryId: null,
  price: "",
  spicy: 0,
  desc: "",
  image: "",
  allergens: [],
  tags: [],
  dislikeTags: [],
  dietTags: [],
});

watch(
  () => props.visible,
  (val) => {
    if (val && props.initialCategoryId) {
      form.value.categoryId = props.initialCategoryId;
    }
  }
);

function onMaskClick() {
  emit('close');
}

function onClose() {
  emit('close');
}

function goToFullUpload() {
  emit('close');
  setTimeout(() => {
    uni.navigateTo({ url: '/pages/dish/upload' });
  }, 270);
}

const categories = computed(() => dishStore.allCategories);

const existingEmojis = computed(() =>
  categories.value.filter((c) => c.icon).map((c) => c.icon)
);
const existingNames = computed(() =>
  categories.value.filter((c) => c.name).map((c) => c.name)
);

const allergenOptions = computed(() => {
  const merged = [...ALLERGEN_OPTIONS];
  preference.allergens.forEach((a) => {
    if (!merged.includes(a)) merged.push(a);
  });
  return merged;
});

const tagOptions = computed(() => {
  const merged = [...preference.getDishTagOptions];
  form.value.tags.forEach((t) => {
    if (!merged.includes(t)) merged.push(t);
  });
  return merged;
});

const dietTagOptions = computed(() => [...preference.getDietTagOptions]);

const dislikeOptions = computed(() => {
  const merged = [...DISLIKE_OPTIONS];
  preference.dislikes.forEach((d) => {
    if (!merged.includes(d)) merged.push(d);
  });
  return merged;
});

const currentUploadCat = computed(() => {
  const id = form.value.categoryId;
  if (!id) return null;
  return categories.value.find((c) => c.id === id) || null;
});

const currentUploadCatName = computed(() => {
  const c = currentUploadCat.value;
  return c ? `${c.icon || "🍽️"} ${c.name}` : "请选择分类";
});

function onCategoryPicked(id) {
  form.value.categoryId = id;
}

async function onCategoryAdded(newCat) {
  try {
    const result = await dishStore.addCategory(newCat);
    form.value.categoryId = (result && result.id) || newCat.id;
    toast.success(`已添加分类：${newCat.name}`);
  } catch (e) {
    toast.error(e.message || '添加分类失败');
  }
}

function openAddCategoryFromPicker() {
  showCategoryPickerVisible.value = false;
  setTimeout(() => {
    addCatVisible.value = true;
  }, 260);
}

async function onAddCatConfirm(data) {
  try {
    const result = await dishStore.addCategory(data);
    form.value.categoryId = (result && result.id) || data.id;
    toast.success(`已添加分类：${data.name}`);
  } catch (e) {
    toast.error(e.message || '添加分类失败');
  }
}

function toggleTag(v) {
  const i = form.value.tags.indexOf(v);
  if (i === -1) form.value.tags.push(v);
  else form.value.tags.splice(i, 1);
}

function toggleDislike(v) {
  const i = form.value.dislikeTags.indexOf(v);
  if (i === -1) form.value.dislikeTags.push(v);
  else form.value.dislikeTags.splice(i, 1);
}

function toggleAllergen(v) {
  const i = form.value.allergens.indexOf(v);
  if (i === -1) form.value.allergens.push(v);
  else form.value.allergens.splice(i, 1);
}

function toggleDietTag(v) {
  const i = form.value.dietTags.indexOf(v);
  if (i === -1) form.value.dietTags.push(v);
  else form.value.dietTags.splice(i, 1);
}

async function submit() {
  if (!couple.isLoggedIn) {
    return toast.info('请先登录');
  }
  if (!form.value.name.trim()) {
    return toast.info("请填写菜名");
  }
  if (!form.value.categoryId) {
    return toast.info("请选择分类");
  }
  uploading.value = true;
  const payload = {
    name: form.value.name.trim(),
    categoryId: form.value.categoryId,
    price: parseInt(form.value.price) || 0,
    spicy: form.value.spicy,
    desc: form.value.desc.trim(),
    image: form.value.image,
    tags: form.value.tags,
    allergens: form.value.allergens,
    dislikeTags: form.value.dislikeTags,
    dietTags: form.value.dietTags,
    emoji: form.value.image ? "" : "🍽️",
    bgColor: "linear-gradient(135deg,#FFE8EE,#F5B6C1)",
  };
  emit('submit', payload);
  resetForm();
  uploading.value = false;
}

function resetForm() {
  form.value = {
    name: "",
    categoryId: null,
    price: "",
    spicy: 0,
    desc: "",
    image: "",
    allergens: [],
    tags: [],
    dislikeTags: [],
    dietTags: [],
  };
}
</script>

<style lang="scss" scoped>
.upload-mask {
  position: fixed;
  inset: 0;
  z-index: 100;
  background: rgba(74, 40, 60, 0.45);
  display: flex !important;
  align-items: flex-end;
  justify-content: center;
  opacity: 0;
  visibility: hidden;
  pointer-events: none;
  transition:
    opacity 0.25s ease-out,
    visibility 0.25s ease-out;
  &.show {
    opacity: 1;
    visibility: visible;
    pointer-events: auto;
  }
}
.upload-sheet {
  width: 100%;
  height: 90vh;
  background: var(--c-bg-page, #fff);
  border-top-left-radius: $radius-xl;
  border-top-right-radius: $radius-xl;
  display: flex;
  flex-direction: column;
  transform: translateY(100%);
  transition: transform 0.25s ease-out;
}
.upload-mask.show .upload-sheet {
  transform: translateY(0);
}
.upload-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  padding: 32rpx 28rpx 20rpx;
  flex-shrink: 0;
}
.head-info {
  flex: 1;
}
.head-actions {
  display: flex;
  align-items: center;
  gap: 12rpx;
}
.head-icon-btn {
  width: 56rpx;
  height: 56rpx;
  border-radius: 50%;
  background: $bg-surface-alt;
  display: flex;
  align-items: center;
  justify-content: center;
  &:active {
    background: $bg-hover;
  }
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
.upload-body {
  flex: 1;
  min-height: 0;
}
.upload-inner {
  padding: 0 28rpx 32rpx;
}
.upload-footer {
  flex-shrink: 0;
  padding: 24rpx 32rpx;
  padding-bottom: calc(12px + constant(safe-area-inset-bottom));
  padding-bottom: calc(12px + env(safe-area-inset-bottom));
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
  height: 88rpx;
  padding: 0 24rpx;
  background: $bg-surface-alt;
  border-radius: $radius-md;
  font-size: 28rpx;
  color: $text-1;
  box-sizing: border-box;
}
.field-textarea {
  width: 100%;
  min-height: 120rpx;
  padding: 20rpx 24rpx;
  background: $bg-surface-alt;
  border-radius: $radius-md;
  font-size: 26rpx;
  color: $text-1;
  box-sizing: border-box;
}
.field-ph {
  color: $text-4;
}
.picker-display {
  display: flex;
  align-items: center;
  justify-content: space-between;
  height: 88rpx;
  padding: 0 24rpx;
  background: $bg-surface-alt;
  border-radius: $radius-md;
  font-size: 28rpx;
  color: $text-1;
  .picker-text {
    color: $text-4;
  }
}
.chip-row {
  display: flex;
  flex-wrap: wrap;
  gap: 16rpx;
}
.chip {
  padding: 12rpx 24rpx;
  background: $bg-surface-alt;
  border-radius: $radius-pill;
  font-size: 24rpx;
  color: $text-2;
  border: 2rpx solid transparent;
  &.active {
    border-color: $brand-primary;
    color: $brand-primary-dark;
    font-weight: 700;
  }
  &.tag-selected {
    background: $tag-selected-bg;
    color: $tag-selected-color;
    &.active {
      border-color: $tag-selected-border;
      font-weight: 700;
    }
  }
  &.tag-warn {
    background: $tag-warn-bg;
    color: $tag-warn-color;
    &.active {
      border-color: $tag-warn-border;
      font-weight: 700;
    }
  }
  &.tag-dislike {
    background: $tag-dislike-bg;
    color: $tag-dislike-color;
    &.active {
      border-color: $tag-dislike-border;
      font-weight: 700;
    }
  }
  &.tag-info {
    background: $tag-info-bg;
    color: $tag-info-color;
    &.active {
      border-color: $tag-info-border;
      font-weight: 700;
    }
  }
}
.empty-tags {
  font-size: 24rpx;
  color: $text-4;
  padding: 12rpx 0;
}
.upload-btn {
  height: 96rpx;
  background: linear-gradient(135deg, $brand-primary, $brand-primary-2);
  color: #fff;
  font-size: 32rpx;
  font-weight: 800;
  border-radius: $radius-pill;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: $shadow-press;
  &.disabled {
    opacity: 0.6;
  }
}
</style>
