<template>
  <view class="page upload-page" :class="couple.themeClass" :style="couple.themeStyle">
    <NavBar title="上传新菜品" :show-back="true" />

    <scroll-view scroll-y class="upload-scroll" :show-scrollbar="false">
      <view class="upload-content">
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

        <view class="field">
          <text class="field-label">分类</text>
          <view class="picker-display" @click="showCategoryPickerVisible = true">
            <text :class="{'picker-text': currentUploadCatName === '请选择分类'}">{{ currentUploadCatName }}</text>
            <nut-icon name="rect-right" size="30rpx" :custom-color="couple.themeStyle['--c-primary']" />
          </view>
        </view>

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

        <view class="field">
          <text class="field-label">菜品图片</text>
          <ImageUploader v-model="form.image" :size="200" placeholder="点击上传图片" />
        </view>

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
            <text v-if="!allergenOptions.length" class="empty-tags">饮食档案中暂无过敏原配置</text>
          </view>
        </view>

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
            <text v-if="!dislikeOptions.length" class="empty-tags">饮食档案中暂无忌口配置</text>
          </view>
        </view>

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

    <view class="upload-footer safe-bottom">
      <view class="upload-btn" :class="{ disabled: submitting }" @click="submitDish">
        <text>{{ submitting ? '提交中...' : '提交菜品' }}</text>
      </view>
    </view>

    <CategoryPicker
      v-model:visible="showCategoryPickerVisible"
      :categories="categories"
      :current-value="form.categoryId"
      title="选择分类"
      @change="onCategoryPicked"
      @add-category="onCategoryAdded"
      @open-add-category="openAddCategoryFromPicker"
    />

    <AddCategoryDialog
      v-show="addCatVisible"
      :visible="addCatVisible"
      :existing-emojis="existingEmojis"
      :existing-names="existingNames"
      @update:visible="addCatVisible = $event"
      @confirm="onAddCatConfirm"
    />

    <Toast />
  </view>
</template>

<script setup>
import { ref, computed, reactive } from 'vue';
import NavBar from '@/components/NavBar.vue';
import Toast from '@/components/Toast.vue';
import ImageUploader from '@/components/ImageUploader.vue';
import CategoryPicker from '@/components/CategoryPicker.vue';
import AddCategoryDialog from '@/components/AddCategoryDialog.vue';
import { useCoupleStore } from '@/store/couple';
import { useDishStore } from '@/store/dish';
import { usePreferenceStore, ALLERGEN_OPTIONS, DISLIKE_OPTIONS } from '@/store/preference';
import { toast } from '@/utils/toast';
import { requireLogin } from '@/utils/auth';

const couple = useCoupleStore();
const dishStore = useDishStore();
const preference = usePreferenceStore();

const showCategoryPickerVisible = ref(false);
const addCatVisible = ref(false);
const submitting = ref(false);
const spicyLabels = ['不辣', '微辣', '中辣', '重辣'];

const existingEmojis = computed(() => categories.value.filter((c) => c.icon).map((c) => c.icon));
const existingNames = computed(() => categories.value.filter((c) => c.name).map((c) => c.name));

const form = reactive({
  name: '',
  categoryId: null,
  price: '',
  spicy: 0,
  desc: '',
  image: '',
  allergens: [],
  tags: [],
  dislikeTags: [],
  dietTags: []
});

const categories = computed(() => dishStore.allCategories);

const currentCat = computed(() => {
  const id = form.categoryId;
  if (!id) return null;
  return categories.value.find((c) => c.id === id) || null;
});
const currentUploadCatName = computed(() => {
  const c = currentCat.value;
  return c ? `${c.icon || '🍽️'} ${c.name}` : '请选择分类';
});

const allergenOptions = computed(() => {
  const merged = [...ALLERGEN_OPTIONS];
  preference.allergens.forEach((a) => { if (!merged.includes(a)) merged.push(a); });
  return merged;
});
const tagOptions = computed(() => {
  const merged = [...preference.getDishTagOptions];
  form.tags.forEach((t) => { if (!merged.includes(t)) merged.push(t); });
  return merged;
});
const dietTagOptions = computed(() => [...preference.getDietTagOptions]);
const dislikeOptions = computed(() => {
  const merged = [...DISLIKE_OPTIONS];
  preference.dislikes.forEach((d) => { if (!merged.includes(d)) merged.push(d); });
  return merged;
});

function onCategoryPicked(id) {
  form.categoryId = id;
}

async function onCategoryAdded(newCat) {
  try {
    await dishStore.addCategory(newCat);
    form.categoryId = newCat.id;
    toast.success(`已添加分类：${newCat.name}`);
  } catch (e) {
    toast.error(e.message || "添加分类失败");
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
    await dishStore.addCategory(data);
    form.categoryId = data.id;
    toast.success(`已添加分类：${data.name}`);
  } catch (e) {
    toast.error(e.message || "添加分类失败");
  }
}

function toggleTag(v) {
  const i = form.tags.indexOf(v);
  if (i === -1) form.tags.push(v);
  else form.tags.splice(i, 1);
}
function toggleDislike(v) {
  const i = form.dislikeTags.indexOf(v);
  if (i === -1) form.dislikeTags.push(v);
  else form.dislikeTags.splice(i, 1);
}
function toggleAllergen(v) {
  const i = form.allergens.indexOf(v);
  if (i === -1) form.allergens.push(v);
  else form.allergens.splice(i, 1);
}
function toggleDietTag(v) {
  const i = form.dietTags.indexOf(v);
  if (i === -1) form.dietTags.push(v);
  else form.dietTags.splice(i, 1);
}

async function submitDish() {
  if (!requireLogin(couple)) return;
  if (!form.name.trim()) {
    return toast.info('请填写菜名');
  }
  if (!form.categoryId) {
    return toast.info('请选择分类');
  }
  submitting.value = true;
  try {
    await dishStore.createDish({
      name: form.name.trim(),
      categoryId: form.categoryId,
      price: parseInt(form.price) || 0,
      spicy: form.spicy,
      desc: form.desc.trim(),
      image: form.image,
      tags: form.tags,
      allergens: form.allergens,
      dislikeTags: form.dislikeTags,
      dietTags: form.dietTags,
      emoji: form.image ? '' : '🍽️',
      bgColor: 'linear-gradient(135deg,#FFE8EE,#F5B6C1)',
    });
    toast.success('上传成功');
    uni.navigateBack();
  } catch (e) {
    toast.error(e.message || '上传失败');
  } finally {
    submitting.value = false;
  }
}
</script>

<style lang="scss" scoped>
.upload-page {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
}
.upload-scroll {
  flex: 1;
  height: 0;
}
.upload-content {
  padding: 24rpx 28rpx 200rpx;
}
.field {
  padding: 24rpx 0;
  border-bottom: 2rpx solid $divider;
  &:last-child {
    border-bottom: none;
  }
}
.field-label {
  font-size: 26rpx;
  color: $text-3;
  font-weight: 600;
  margin-bottom: 16rpx;
  display: block;
}
.field-input {
  width: 100%;
  height: 84rpx;
  padding: 0 24rpx;
  background: $bg-surface-alt;
  border-radius: $radius-md;
  font-size: 28rpx;
  color: $text-1;
  box-sizing: border-box;
}
.field-ph {
  color: $text-4;
}
.field-textarea {
  width: 100%;
  min-height: 160rpx;
  padding: 20rpx 24rpx;
  background: $bg-surface-alt;
  border-radius: $radius-md;
  font-size: 28rpx;
  color: $text-1;
  box-sizing: border-box;
}
.picker-display {
  display: flex;
  align-items: center;
  justify-content: space-between;
  height: 84rpx;
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
  transition: all 0.2s;
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
    }
  }
  &.tag-warn {
    background: $tag-warn-bg;
    color: $tag-warn-color;
    &.active {
      border-color: $tag-warn-border;
    }
  }
  &.tag-dislike {
    background: $tag-dislike-bg;
    color: $tag-dislike-color;
    &.active {
      border-color: $tag-dislike-border;
    }
  }
  &.tag-info {
    background: $tag-info-bg;
    color: $tag-info-color;
    &.active {
      border-color: $tag-info-border;
    }
  }
}
.empty-tags {
  font-size: 24rpx;
  color: $text-4;
}
.upload-footer {
  position: fixed;
  left: 0;
  right: 0;
  bottom: 0;
  padding: 20rpx 28rpx;
  background: #fff;
  box-shadow: 0 -4rpx 24rpx rgba(60, 30, 0, 0.08);
}
.upload-btn {
  height: 88rpx;
  border-radius: $radius-pill;
  background: linear-gradient(135deg, var(--c-primary, #F5B6C1), var(--c-primary-2, #FFD6DD));
  color: #fff;
  font-size: 32rpx;
  font-weight: 800;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: $shadow-press;
  &.disabled {
    opacity: 0.6;
  }
}
</style>
