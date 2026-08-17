<template>
  <view
    class="page category-page"
    :class="couple.themeClass"
    :style="couple.themeStyle"
  >
    <NavBar title="菜品分类配置" :show-back="true">
      <template #right>
        <view class="nav-right-group">
          <view class="nav-icon-btn" @click="goUploadPage">
            <nut-icon name="photograph" size="36rpx" :custom-color="couple.themeStyle['--c-primary']" />
          </view>
          <text class="nav-action" @click="toggleMode">
            {{ isEditMode ? "完成" : "管理" }}
          </text>
        </view>
      </template>
    </NavBar>

    <PageLoading :visible="firstLoading" @timeout="firstLoading = false" />

    <view v-show="!firstLoading" class="cat-content">
      <view class="tip-bar">
        <text class="tip-icon">📋</text>
        <text class="tip-text">管理菜品分类，排序后菜单自动同步</text>
      </view>

      <view class="cat-list">
        <view
          v-for="(cat, idx) in categories"
          :key="cat.id"
          class="cat-card"
          :class="{ edit: isEditMode, clickable: !isEditMode }"
          @click="!isEditMode && goToCategoryDishes(cat)"
        >
          <view class="cat-emoji">{{ cat.icon }}</view>
          <view class="cat-body">
            <view class="cat-name-row">
              <text class="cat-name">{{ cat.name }}</text>
              <text class="cat-count">{{ dishCount(cat.id) }}款</text>
            </view>
            <text v-if="cat.desc" class="cat-desc">{{ cat.desc }}</text>
          </view>
          <text v-if="!isEditMode" class="cat-arrow">
            <nut-icon name="rect-right" size="30rpx" :custom-color="couple.themeStyle['--c-primary']" />
          </text>
          <view
            v-if="isEditMode"
            class="drag-actions"
            @click.stop="moveUp(idx)"
            :class="{ disabled: idx === 0 }"
          >
            <text class="arrow">↑</text>
          </view>
          <view
            v-if="isEditMode"
            class="drag-actions"
            @click.stop="moveDown(idx)"
            :class="{ disabled: idx === categories.length - 1 }"
          >
            <text class="arrow">↓</text>
          </view>
          <view v-if="isEditMode" class="cat-actions">
            <view class="cat-btn edit" @click="openEdit(cat)">
              <text>编辑</text>
            </view>
            <view class="cat-btn delete" @click="onDelete(cat)">
              <text>删除</text>
            </view>
          </view>
        </view>
      </view>

      <view v-if="!categories.length" class="empty-state">
        <text class="empty-icon">🍽️</text>
        <text class="empty-text">还没有分类</text>
      </view>

      <view class="bottom-holder" />
    </view>

    <view class="confirm-bar safe-bottom" v-if="isEditMode">
      <view class="confirm-btn add-btn" @click="openAdd">
        <text>＋ 新增分类</text>
      </view>
    </view>

    <view class="confirm-bar safe-bottom" v-else>
      <view class="confirm-btn" @click="toggleMode">
        <text>进入管理模式</text>
      </view>
    </view>

    <AddCategoryDialog
      v-show="dialogVisible"
      :visible="dialogVisible"
      :existing-emojis="existingEmojis"
      :existing-names="existingNames"
      :editing-category="editingCat"
      @update:visible="dialogVisible = $event"
      @confirm="onConfirm"
    />

    <Toast />
  </view>
</template>

<script setup>
import { ref, computed } from "vue";
import { onShow } from "@dcloudio/uni-app";
import NavBar from "@/components/NavBar.vue";
import Toast from "@/components/Toast.vue";
import PageLoading from "@/components/PageLoading.vue";
import AddCategoryDialog from "@/components/AddCategoryDialog.vue";
import { useCoupleStore } from "@/store/couple";
import { useDishStore } from "@/store/dish";
import { toast } from "@/utils/toast";
import { requireLogin } from "@/utils/auth";

const couple = useCoupleStore();
const dishStore = useDishStore();

const firstLoading = ref(true);
const mode = ref("view");
const dialogVisible = ref(false);
const editingCat = ref(null);

const isEditMode = computed(() => mode.value === "edit");
const categories = computed(() => dishStore.allCategories);

function dishCount(catId) {
  const map = dishStore.dishByCat;
  return (map[catId] && map[catId].length) || 0;
}

const existingEmojis = computed(() => {
  return categories.value.filter((c) => c.icon).map((c) => c.icon);
});

const existingNames = computed(() => {
  return categories.value.filter((c) => c.name).map((c) => c.name);
});

function toggleMode() {
  if (!isEditMode.value && !requireLogin(couple)) return;
  mode.value = isEditMode.value ? "view" : "edit";
}

function goUploadPage() {
  uni.navigateTo({ url: '/pages/dish/upload' });
}

function openAdd() {
  editingCat.value = null;
  dialogVisible.value = true;
}

function openEdit(cat) {
  editingCat.value = cat;
  dialogVisible.value = true;
}

function onConfirm(data) {
  if (editingCat.value) {
    handleUpdate(data);
  } else {
    handleCreate(data);
  }
}

async function handleCreate(data) {
  try {
    await dishStore.addCategory(data);
    toast.success("添加成功");
  } catch (e) {
    toast.error(e.message || "添加失败");
  }
}

async function handleUpdate(data) {
  const original = editingCat.value;
  const patch = {
    name: data.name,
    icon: data.icon,
    desc: data.desc,
  };

  try {
    await dishStore.updateCategory(original.id, patch);
    toast.success("保存成功");
  } catch (e) {
    toast.error(e.message || "保存失败");
  }
}

function onDelete(cat) {
  const count = dishCount(cat.id);
  const content =
    count > 0
      ? `该分类下还有 ${count} 个菜品，删除后这些菜品也会被移除，确定删除吗？`
      : "确定删除该分类吗？删除后不可恢复";

  uni.showModal({
    title: "删除分类",
    content,
    confirmColor: "#E08B8B",
    success: async (r) => {
      if (!r.confirm) return;
      const dishIds = dishStore.dishes
        .filter((d) => d.categoryId === cat.id)
        .map((d) => d.id);
      for (const id of dishIds) {
        try {
          await dishStore.deleteDish(id);
        } catch (e) {}
      }
      try {
        await dishStore.removeCategory(cat.id);
        toast.success("已删除");
      } catch (e) {
        toast.error(e.message || "删除失败");
      }
    },
  });
}

function goToCategoryDishes(cat) {
  uni.navigateTo({
    url: `/pages/category/dishes?id=${cat.id}&name=${encodeURIComponent(cat.name)}&icon=${encodeURIComponent(cat.icon || '🍽️')}`
  });
}

async function moveUp(idx) {
  if (idx <= 0) return;
  const list = [...categories.value];
  const [item] = list.splice(idx, 1);
  list.splice(idx - 1, 0, item);
  await reorder(list);
}

async function moveDown(idx) {
  const list = [...categories.value];
  if (idx >= list.length - 1) return;
  const [item] = list.splice(idx, 1);
  list.splice(idx + 1, 0, item);
  await reorder(list);
}

async function reorder(list) {
  const orderedIds = list.map((c) => c.id);
  try {
    await dishStore.reorderCategories(orderedIds);
    toast.success("排序已更新");
  } catch (e) {
    toast.error(e.message || "排序失败");
  }
}

onShow(() => {
  firstLoading.value = false;
  dishStore.init();
});
</script>

<style lang="scss" scoped>
.category-page {
  padding: 24rpx;
  min-height: 100vh;
}
.tip-bar {
  display: flex;
  align-items: center;
  gap: 12rpx;
  padding: 20rpx 24rpx;
  background: rgba(255, 179, 0, 0.12);
  border-radius: $radius-md;
  margin-bottom: 24rpx;
  .tip-icon {
    font-size: 30rpx;
  }
  .tip-text {
    font-size: 24rpx;
    color: #8a5a00;
  }
}
.cat-list {
  display: flex;
  flex-direction: column;
  gap: 20rpx;
}
.cat-card {
  display: flex;
  align-items: center;
  gap: 20rpx;
  padding: 24rpx 28rpx;
  background: var(--c-bg-alt, #fff);
  border-radius: $radius-lg;
  box-shadow: $shadow-card;
  &.clickable {
    cursor: pointer;
    transition: transform 0.15s;
    &:active {
      transform: scale(0.98);
    }
  }
  &.edit {
    flex-wrap: wrap;
  }
}
.cat-arrow {
  font-size: 48rpx;
  color: $text-4;
  font-weight: 300;
  margin-left: auto;
}
.drag-handle {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 48rpx;
  height: 48rpx;
}
.drag-icon {
  font-size: 28rpx;
  color: $text-4;
}
.cat-emoji {
  font-size: 48rpx;
  width: 80rpx;
  height: 80rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  background: $bg-surface-alt;
  border-radius: $radius-md;
  flex-shrink: 0;
}
.cat-body {
  flex: 1;
  min-width: 0;
}
.cat-name-row {
  display: flex;
  align-items: center;
  gap: 12rpx;
}
.cat-name {
  font-size: 32rpx;
  font-weight: 700;
  color: $text-1;
}
.cat-count {
  font-size: 22rpx;
  color: $text-4;
}
.cat-desc {
  display: block;
  font-size: 24rpx;
  color: $text-3;
  margin-top: 4rpx;
}
.drag-actions {
  width: 56rpx;
  height: 56rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  background: $bg-surface-alt;
  border-radius: $radius-md;
  &.disabled {
    opacity: 0.3;
  }
  .arrow {
    font-size: 32rpx;
    color: $text-2;
    font-weight: 700;
  }
}
.cat-actions {
  display: flex;
  gap: 16rpx;
  width: 100%;
  margin-top: 16rpx;
  // padding-left: 100rpx;
  justify-content: flex-end;
}
.cat-btn {
  padding: 12rpx 32rpx;
  border-radius: $radius-pill;
  font-size: 26rpx;
  font-weight: 600;
  display: flex;
  align-items: center;
  justify-content: center;
  &.edit {
    background: linear-gradient(
      135deg,
      var(--c-primary, #f5b6c1),
      var(--c-primary-2, #ffd6dd)
    );
    color: #fff;
  }
  &.delete {
    background: rgba(224, 139, 139, 0.12);
    color: $color-danger;
  }
  &.disabled {
    background: $bg-surface-alt;
    color: $text-4;
  }
}
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 80rpx 0;
  .empty-icon {
    font-size: 80rpx;
  }
  .empty-text {
    margin-top: 16rpx;
    font-size: 28rpx;
    color: $text-3;
  }
}
.bottom-holder {
  height: 160rpx;
}
.nav-action {
  padding: 8rpx 20rpx;
  border-radius: $radius-pill;
  background: rgba(255, 255, 255, 0.25);
  color: #fff;
  font-size: 26rpx;
  font-weight: 700;
}
.nav-right-group {
  display: flex;
  align-items: center;
  gap: 16rpx;
}
.nav-icon-btn {
  padding: 8rpx;
  display: flex;
  align-items: center;
  justify-content: center;
}
.confirm-bar {
  position: fixed;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: 10;
  padding: 20rpx 28rpx;
  background: var(--c-bg-alt, #fff);
  box-shadow: 0 -4rpx 24rpx rgba(60, 30, 0, 0.08);
}
.confirm-btn {
  height: 88rpx;
  border-radius: $radius-pill;
  background: linear-gradient(
    135deg,
    var(--c-primary, #f5b6c1),
    var(--c-primary-2, #ffd6dd)
  );
  color: #fff;
  font-size: 32rpx;
  font-weight: 800;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: $shadow-press;
  &.add-btn {
    background: linear-gradient(135deg, $brand-taro, $brand-accent);
  }
}
</style>
