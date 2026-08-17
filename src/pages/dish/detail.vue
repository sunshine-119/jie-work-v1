<template>
  <view
    class="page dish-detail-page"
    :class="couple.themeClass"
    :style="couple.themeStyle"
  >
    <NavBar :show-back="true">
      <text class="nav-title">{{ editing ? "编辑菜品" : "菜品详情" }}</text>
      <template #right>
        <view v-if="!editing && isOwner" class="nav-action" @click="startEdit">
          <!-- <AppIcon name="edit" size="28" color="#fff" /> -->
          <nut-icon name="edit" size="28rpx" custom-color="#fff" />
          <text class="na-text">编辑</text>
        </view>
        <view v-else-if="editing" class="nav-action" @click="cancelEdit">
          <text class="na-text">取消</text>
        </view>
      </template>
    </NavBar>

    <PageLoading :visible="firstLoading" @timeout="firstLoading = false" />

    <scroll-view scroll-y class="detail-scroll" :show-scrollbar="false">
      <view v-if="dish" class="detail-inner">
        <!-- 菜品图片/emoji 展示 -->
        <view class="hero" v-if="!(dish.image && editing)">
          <image
            v-if="dish.image && !editing"
            class="hero-img"
            :src="resolveUrl(dish.image)"
            mode="widthFix"
            @click="previewHeroImage"
          />
          <DishEmoji
            v-else
            :image="editing ? form.image : dish.image"
            :emoji="dish.emoji"
            :bg="dish.bgColor"
            size="lg"
          />
        </view>

        <!-- 查看模式 -->
        <view v-if="!editing" class="info-card">
          <text class="dish-name">{{ dish.name }}</text>
          <view class="meta-row">
            <text class="meta-cat">{{ categoryName(dish.categoryId) }}</text>
            <text v-if="dish.price" class="meta-price">¥{{ dish.price }}</text>
            <text class="meta-spicy">{{ spicyLabel(dish.spicy) }}</text>
          </view>
          <view v-if="dish.desc" class="desc-box">
            <text class="desc-label">简介</text>
            <text class="desc-text">{{ dish.desc }}</text>
          </view>
          <view
            v-if="dish.allergens && dish.allergens.length"
            class="tag-section"
          >
            <text class="tag-label">过敏原</text>
            <view class="tag-row">
              <view
                v-for="a in dish.allergens"
                :key="a"
                class="tag tag-warn tag-selected"
              >
                <text>{{ a }}</text>
              </view>
            </view>
          </view>
          <view
            v-if="dish.dislikeTags && dish.dislikeTags.length"
            class="tag-section"
          >
            <text class="tag-label">忌口食材</text>
            <view class="tag-row">
              <view
                v-for="t in dish.dislikeTags"
                :key="t"
                class="tag tag-dislike tag-selected"
              >
                <text>{{ t }}</text>
              </view>
            </view>
          </view>
          <view
            v-if="dish.dietTags && dish.dietTags.length"
            class="tag-section"
          >
            <text class="tag-label">饮食标签</text>
            <view class="tag-row">
              <view
                v-for="t in dish.dietTags"
                :key="t"
                class="tag tag-info tag-selected"
              >
                <text>{{ t }}</text>
              </view>
            </view>
          </view>
          <view v-if="dish.tags && dish.tags.length" class="tag-section">
            <text class="tag-label">菜品标签</text>
            <view class="tag-row">
              <view v-for="t in dish.tags" :key="t" class="tag tag-selected">
                <text>{{ t }}</text>
              </view>
            </view>
          </view>
          <view v-if="isOwner" class="danger-btn" @click="onDelete">
            <text>删除这道菜</text>
          </view>
        </view>

        <!-- 编辑模式 -->
        <view v-else class="edit-card">
          <!-- 菜名 -->
          <view class="field">
            <text class="field-label">菜名</text>
            <input
              :value="form.name"
              class="field-input"
              placeholder="菜名"
              placeholder-class="field-ph"
              maxlength="20"
              :adjust-position="true"
              @input="(e) => (form.name = e.detail.value)"
            />
          </view>
          <!-- 分类 -->
          <view class="field">
            <text class="field-label">分类</text>
            <view class="picker-display" @click="showCategoryPicker">
              <text :class="{'picker-text': currentUploadCatName === '请选择分类'}">{{ currentUploadCatName }}</text>
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
              placeholder="选填"
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
                @click="toggleArr(form.allergens, a)"
              >
                <text>{{ a }}</text>
              </view>
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
                @click="toggleArr(form.dislikeTags, d)"
              >
                <text>{{ d }}</text>
              </view>
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
                @click="toggleArr(form.tags, t)"
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
                @click="toggleArr(form.dietTags, d)"
              >
                <text>{{ d }}</text>
              </view>
            </view>
          </view>
        </view>
      </view>
      <view v-if="!editing" class="scroll-pad" />
    </scroll-view>
    <!-- 编辑模式底部固定保存按钮 -->
    <view v-if="editing" class="fixed-footer">
      <view class="save-btn" :class="{ disabled: saving }" @click="onSave">
        <text>{{ saving ? "保存中..." : "保存修改" }}</text>
      </view>
    </view>

    <Toast />

    <!-- 分类选择 Picker -->
    <CategoryPicker
      v-model:visible="showCatPicker"
      :categories="allCategories"
      :current-value="form.categoryId"
      title="选择分类"
      @change="onCatPicked"
      @add-category="onCategoryAdded"
    />
  </view>
</template>

<script setup>
import { ref, computed, onMounted } from "vue";
import { onLoad } from "@dcloudio/uni-app";
import NavBar from "@/components/NavBar.vue";
import PageLoading from "@/components/PageLoading.vue";
import DishEmoji from "@/components/DishEmoji.vue";
import ImageUploader from "@/components/ImageUploader.vue";
import AppIcon from "@/components/AppIcon.vue";
import Toast from "@/components/Toast.vue";
import CategoryPicker from "@/components/CategoryPicker.vue";
import { useDishStore } from "@/store/dish";
import { useCoupleStore } from "@/store/couple";
import {
  usePreferenceStore,
  ALLERGEN_OPTIONS,
  DISLIKE_OPTIONS,
} from "@/store/preference";
import { api } from "@/utils/api";
import { resolveUrl } from "@/utils/server";
import { toast } from "@/utils/toast";
import { requireLogin } from "@/utils/auth";

const dishStore = useDishStore();
const couple = useCoupleStore();
const preference = usePreferenceStore();

const dishId = ref("");
const dish = ref(null);
const firstLoading = ref(true);
const editing = ref(false);
const saving = ref(false);
const spicyLabels = ["不辣", "微辣", "中辣", "重辣"];

const form = ref({
  name: "",
  categoryId: "",
  price: "",
  spicy: 0,
  desc: "",
  image: "",
  allergens: [],
  tags: [],
  dislikeTags: [],
  dietTags: [],
});

const isOwner = computed(() => couple.isGirlfriend);

const showCatPicker = ref(false);

const allCategories = computed(() => dishStore.allCategories);

// 组合过敏原选项：默认选项 + 自定义添加
const allergenOptions = computed(() => {
  const merged = [...ALLERGEN_OPTIONS];
  preference.allergens.forEach((a) => {
    if (!merged.includes(a)) merged.push(a);
  });
  return merged;
});
// 菜品标签选项
const tagOptions = computed(() => {
  return [...preference.getDishTagOptions];
});
// 饮食标签选项
const dietTagOptions = computed(() => {
  return [...preference.getDietTagOptions];
});
// 忌口食材选项：DISLIKE_OPTIONS + 饮食档案中的自定义
const dislikeOptions = computed(() => {
  const merged = [...DISLIKE_OPTIONS];
  preference.dislikes.forEach((d) => {
    if (!merged.includes(d)) merged.push(d);
  });
  return merged;
});

const currentUploadCatName = computed(() => {
  const c = allCategories.value.find((x) => x.id === form.value.categoryId);
  return c ? `${c.icon || "🍽️"} ${c.name}` : "请选择分类";
});

function categoryName(catId) {
  const c = allCategories.value.find((x) => x.id === catId);
  return c ? `${c.icon || "🍽️"} ${c.name}` : "未分类";
}

function spicyLabel(s) {
  return spicyLabels[s] || "不辣";
}

function showCategoryPicker() {
  showCatPicker.value = true;
}

function onCatPicked(id) {
  form.value.categoryId = id;
}

async function onCategoryAdded(newCat) {
  try {
    await dishStore.addCategory(newCat);
    form.value.categoryId = newCat.id;
  } catch (e) {
    toast.error(e.message || "添加分类失败");
  }
}

function toggleArr(arr, val) {
  const idx = arr.indexOf(val);
  if (idx === -1) arr.push(val);
  else arr.splice(idx, 1);
}

function previewHeroImage() {
  const url = dish.value && dish.value.image;
  if (!url) return;
  const full = resolveUrl(url);
  uni.previewImage({ urls: [full], current: full });
}

function startEdit() {
  if (!requireLogin(couple)) return;
  if (!dish.value) return;
  form.value = {
    name: dish.value.name || "",
    categoryId: dish.value.categoryId || "",
    price: String(dish.value.price || ""),
    spicy: dish.value.spicy || 0,
    desc: dish.value.desc || "",
    image: dish.value.image || "",
    allergens: [...(dish.value.allergens || [])],
    tags: [...(dish.value.tags || [])],
    dislikeTags: [...(dish.value.dislikeTags || [])],
    dietTags: [...(dish.value.dietTags || [])],
  };
  editing.value = true;
}

function cancelEdit() {
  editing.value = false;
}

async function onSave() {
  if (!requireLogin(couple)) return;
  if (!form.value.name.trim()) {
    return toast.info("请填写菜名");
  }
  saving.value = true;
  try {
    await dishStore.updateDish(dishId.value, {
      name: form.value.name.trim(),
      categoryId: form.value.categoryId,
      price: parseInt(form.value.price) || 0,
      spicy: form.value.spicy,
      desc: form.value.desc.trim(),
      image: form.value.image,
      allergens: form.value.allergens,
      tags: form.value.tags,
      dislikeTags: form.value.dislikeTags,
      dietTags: form.value.dietTags,
      emoji: form.value.image ? "" : dish.value.emoji || "🍽️",
    });
    // 更新本地展示
    dish.value = dishStore.dishMap[dishId.value];
    toast.success("保存成功");
    editing.value = false;
  } catch (e) {
    toast.error("保存失败");
  }
  saving.value = false;
}

function onDelete() {
  if (!requireLogin(couple)) return;
  uni.showModal({
    title: "确认删除",
    content: `确定删除「${dish.value.name}」吗？删除后不可恢复`,
    confirmColor: "#E08B8B",
    success: async (res) => {
      if (res.confirm) {
        try {
          await dishStore.deleteDish(dishId.value);
          toast.success("已删除");
          setTimeout(() => uni.navigateBack(), 800);
        } catch (e) {
          toast.error(e.message || "删除失败");
        }
      }
    },
  });
}

onLoad((opts) => {
  dishId.value = opts.id || "";
});

onMounted(async () => {
  try {
    await dishStore.init();
    // 从 store 中取，如果没有则从全量菜品中查找
    dish.value =
      dishStore.dishMap[dishId.value] || dishStore.getDishById(dishId.value);
    if (!dish.value) {
      // 可能是刚上传的还没加载，强制刷新
      await dishStore.fetchAll();
      dish.value = dishStore.dishMap[dishId.value];
    }
  } catch (e) {
    // 加载失败
  } finally {
    firstLoading.value = false;
  }
});
</script>

<style lang="scss" scoped>
.dish-detail-page {
  height: 100vh;
  display: flex;
  flex-direction: column;
}
.nav-title {
  font-size: 36rpx;
  font-weight: 800;
  color: #fff;
}
.nav-action {
  display: flex;
  align-items: center;
  gap: 6rpx;
}
.na-text {
  font-size: 26rpx;
  color: #fff;
}
.detail-scroll {
  flex: 1;
  height: 0;
}
.detail-inner {
  padding: 24rpx 28rpx;
}
.hero {
  display: flex;
  justify-content: center;
  padding: 32rpx 0;
}
.hero-img {
  width: 400rpx;
  border-radius: $radius-lg;
  box-shadow: $shadow-card;
}
.info-card,
.edit-card {
  background: $bg-surface;
  border-radius: $radius-lg;
  padding: 32rpx 28rpx;
  box-shadow: $shadow-card;
}
.dish-name {
  display: block;
  font-size: 40rpx;
  font-weight: 800;
  color: $text-1;
  margin-bottom: 16rpx;
}
.meta-row {
  display: flex;
  align-items: center;
  gap: 16rpx;
  margin-bottom: 24rpx;
  flex-wrap: wrap;
}
.meta-cat,
.meta-price,
.meta-spicy {
  font-size: 24rpx;
  padding: 6rpx 20rpx;
  border-radius: $radius-pill;
  background: $bg-surface-alt;
  color: $text-2;
}
.meta-price {
  color: $brand-primary-dark;
  font-weight: 700;
}
.desc-box {
  margin-bottom: 24rpx;
}
.desc-label {
  display: block;
  font-size: 26rpx;
  font-weight: 600;
  color: $text-2;
  margin-bottom: 8rpx;
}
.desc-text {
  font-size: 28rpx;
  color: $text-1;
  line-height: 1.6;
}
.tag-section {
  margin-bottom: 24rpx;
}
.tag-label {
  display: block;
  font-size: 26rpx;
  font-weight: 600;
  color: $text-2;
  margin-bottom: 12rpx;
}
.tag-row {
  display: flex;
  flex-wrap: wrap;
  gap: 12rpx;
}
.tag {
  font-size: 24rpx;
  padding: 8rpx 20rpx;
  border-radius: $radius-pill;
}
.tag-selected {
  background: $tag-selected-bg;
  color: $tag-selected-color;
  font-weight: 500;
}
.tag-warn {
  background: $tag-warn-bg;
  color: $tag-warn-color;
}
.tag-dislike {
  background: $tag-dislike-bg;
  color: $tag-dislike-color;
}
.tag-info {
  background: $tag-info-bg;
  color: $tag-info-color;
}
.danger-btn {
  margin-top: 32rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24rpx;
  border: 2rpx solid rgba(224, 139, 139, 0.3);
  border-radius: $radius-md;
  color: #e08b8b;
  font-size: 28rpx;
}
/* 编辑表单 */
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
  gap: 12rpx;
}
.chip {
  padding: 12rpx 24rpx;
  background: $bg-surface-alt;
  border-radius: $radius-pill;
  font-size: 26rpx;
  color: $text-2;
  border: 2rpx solid transparent;
  &.active {
    // background: rgba(245, 182, 193, 0.18);
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
.fixed-footer {
  padding: 16rpx 28rpx;
  padding-bottom: calc(8px + env(safe-area-inset-bottom));
  background: #fff;
  box-shadow: 0 -4rpx 16rpx rgba(0, 0, 0, 0.06);
}
.save-btn {
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
    opacity: 0.5;
  }
}
.scroll-pad {
  height: calc(30px + env(safe-area-inset-bottom));
}
</style>
