<template>
  <view
    class="page cat-dishes-page"
    :class="couple.themeClass"
    :style="couple.themeStyle"
  >
    <NavBar :title="`${catIcon} ${catName}`" :show-back="true" />

    <PageLoading :visible="firstLoading" @timeout="firstLoading = false" />

    <view v-show="!firstLoading" class="cat-content">
      <view class="cat-summary">
        <text class="cat-count">{{ filteredDishes.length || 0 }} 款菜品</text>
        <view class="empty-add-btn" @click="openUpload">
          <text class="add-icon">＋</text>
          <text>添加菜品</text>
        </view>
      </view>
      <view class="cat-summary" v-if="catDesc">
        <text class="cat-desc">{{ catDesc }}</text>
      </view>

      <view class="dish-list">
        <view
          v-for="d in filteredDishes"
          :key="d.id"
          class="dish-card"
          @click="goDishDetail(d.id)"
        >
          <view class="dish-img-wrap">
            <DishEmoji
              :image="d.image"
              :emoji="d.emoji"
              :bg="d.bgColor"
              size="md"
              style="width: 140rpx; height: 140rpx"
            />
          </view>
          <view class="dish-body">
            <text class="dish-name ellipsis">{{ d.name }}</text>
            <text class="dish-desc ellipsis">{{ d.desc || "暂无描述" }}</text>
            <view v-if="d.price" class="dish-price">
              <text class="price-symbol">¥</text>
              <text class="price-value">{{ d.price }}</text>
            </view>
          </view>
          <view class="dish-right">
            <text class="cat-arrow">
              <nut-icon
                name="rect-right"
                size="30rpx"
                :custom-color="couple.themeStyle['--c-primary']"
              />
            </text>
          </view>
        </view>
        <view class="empty-state" v-if="!filteredDishes.length">
          <text class="empty-icon">🍽️</text>
          <text class="empty-text">该分类下暂无菜品</text>
          <!-- <view class="empty-add-btn" @click="openUpload">
            <text class="add-icon">＋</text>
            <text>添加菜品</text>
          </view> -->
        </view>
      </view>
    </view>

    <Toast />

    <!-- 上传菜品弹窗 -->
    <UploadDishDialog
      :visible="uploadVisible"
      :initial-category-id="catId"
      @close="uploadVisible = false"
      @submit="handleUploadSubmit"
    />
  </view>
</template>

<script setup>
import { ref, computed } from "vue";
import { onLoad } from "@dcloudio/uni-app";
import NavBar from "@/components/NavBar.vue";
import Toast from "@/components/Toast.vue";
import PageLoading from "@/components/PageLoading.vue";
import DishEmoji from "@/components/DishEmoji.vue";
import UploadDishDialog from "@/components/UploadDishDialog.vue";
import { useCoupleStore } from "@/store/couple";
import { useDishStore } from "@/store/dish";
import { toast } from "@/utils/toast";

const couple = useCoupleStore();
const dishStore = useDishStore();

const firstLoading = ref(true);
const catId = ref("");
const catName = ref("");
const catIcon = ref("🍽️");
const catDesc = ref("");

// Upload dialog state
const uploadVisible = ref(false);

const filteredDishes = computed(() => {
  if (!catId.value) return [];
  const map = dishStore.dishByCat;
  return map[catId.value] || [];
});

function openUpload() {
  uploadVisible.value = true;
}

async function handleUploadSubmit(formData) {
  try {
    await dishStore.createDish({
      name: formData.name,
      categoryId: formData.categoryId,
      price: formData.price,
      spicy: formData.spicy,
      desc: formData.desc,
      image: formData.image,
      allergens: formData.allergens,
      dislikeTags: formData.dislikeTags,
      tags: formData.tags,
      dietTags: formData.dietTags
    });
    toast.success("菜品已添加");
    uploadVisible.value = false;
  } catch (e) {
    toast.error(e.message || "添加失败");
  }
}

function goDishDetail(id) {
  uni.navigateTo({ url: `/pages/dish/detail?id=${id}` });
}

onLoad((opts) => {
  catId.value = opts.id || "";
  catName.value = decodeURIComponent(opts.name || "");
  catIcon.value = decodeURIComponent(opts.icon || "🍽️");

  const cat = dishStore.allCategories.find((c) => c.id === catId.value);
  if (cat) {
    catDesc.value = cat.desc || "";
    if (!catName.value) catName.value = cat.name || "";
    if (catIcon.value === "🍽️" && cat.icon) catIcon.value = cat.icon;
  }

  firstLoading.value = false;
  dishStore.init();
});
</script>

<style lang="scss" scoped>
.cat-dishes-page {
  min-height: 100vh;
  background: var(--c-bg-page);
}
.cat-content {
  padding: 24rpx;
}
.cat-summary {
  display: flex;
  justify-content: space-between;
  align-items: center;
  // padding: 20rpx 24rpx;
  margin-bottom: 16rpx;
  .cat-desc {
    font-size: 26rpx;
    color: $text-3;
  }
  .cat-count {
    font-size: 28rpx;
    font-weight: 700;
    color: $text-1;
  }
}
.dish-list {
  display: flex;
  flex-direction: column;
  gap: 20rpx;
}
.dish-card {
  display: flex;
  align-items: center;
  gap: 40rpx;
  padding: 20rpx 24rpx;
  background: var(--c-bg-alt, #fff);
  border-radius: $radius-lg;
  box-shadow: $shadow-card;
  transition: transform 0.15s;
  &:active {
    transform: scale(0.98);
  }
}
.dish-img-wrap {
  flex-shrink: 0;
}
.dish-body {
  flex: 1;
  min-width: 0;
}
.dish-name {
  font-size: 30rpx;
  font-weight: 700;
  color: $text-1;
  display: block;
}
.dish-desc {
  font-size: 24rpx;
  color: $text-3;
  margin-top: 4rpx;
  display: block;
}
.dish-price {
  margin-top: 8rpx;
  display: flex;
  align-items: baseline;
  gap: 4rpx;
  .price-symbol {
    font-size: 22rpx;
    color: $color-danger;
    font-weight: 600;
  }
  .price-value {
    font-size: 28rpx;
    color: $color-danger;
    font-weight: 700;
  }
}
.dish-right {
  flex-shrink: 0;
}
.cat-arrow {
  font-size: 48rpx;
  color: $text-4;
  font-weight: 300;
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
  .empty-add-btn {
    margin-top: 40rpx;
    padding: 20rpx 48rpx;
    background: linear-gradient(
      135deg,
      var(--c-primary, #f5b6c1),
      var(--c-primary-2, #ffd6dd)
    );
    color: #fff;
    font-size: 28rpx;
    font-weight: 700;
    border-radius: 100rpx;
    display: flex;
    align-items: center;
    gap: 10rpx;
    box-shadow: 0 8rpx 24rpx rgba(245, 182, 193, 0.4);
    .add-icon {
      font-size: 36rpx;
      font-weight: 400;
    }
  }
}
.empty-add-btn {
  padding: 20rpx 48rpx;
  background: linear-gradient(
    135deg,
    var(--c-primary, #f5b6c1),
    var(--c-primary-2, #ffd6dd)
  );
  color: #fff;
  font-size: 28rpx;
  font-weight: 700;
  border-radius: 100rpx;
  display: flex;
  align-items: center;
  gap: 10rpx;
  box-shadow: 0 8rpx 24rpx rgba(245, 182, 193, 0.4);
  .add-icon {
    font-size: 36rpx;
    font-weight: 400;
  }
}
</style>
