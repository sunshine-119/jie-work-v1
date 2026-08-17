<template>
  <view
    class="page library-page"
    :class="couple.themeClass"
    :style="couple.themeStyle"
  >
    <NavBar title="我的菜品库" :show-back="true" />
    <PageLoading :visible="firstLoading" @timeout="firstLoading = false" />
    <scroll-view
      v-show="!firstLoading"
      scroll-y
      class="library-scroll"
      :show-scrollbar="false"
      :refresher-enabled="isMpWeixin"
      :refresher-triggered="isMpWeixin ? refreshing : false"
      @refresherrefresh="onRefresh"
    >
      <view class="library-header">
        <text class="lh-count">{{ customDishes.length }}</text>
        <text class="lh-label">道已上传</text>
      </view>

      <view v-if="customDishes.length === 0" class="empty-card">
        <AppIcon name="menu" size="80" color="#B8A2C7" />
        <text class="ec-text">还没有上传菜品</text>
        <text class="ec-sub">去菜单页点「＋上传」添加想吃的菜</text>
      </view>

      <view v-else class="dish-list">
        <view
          v-for="d in customDishes"
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
            />
          </view>
          <view class="dish-body">
            <text class="dish-name ellipsis">{{ d.name }}</text>
            <text class="dish-desc ellipsis">{{ d.desc || "暂无描述" }}</text>
            <view v-if="d.categoryName" class="dish-tag">{{
              d.categoryName
            }}</view>
          </view>
          <nut-icon
            name="rect-right"
            size="32rpx"
            :custom-color="couple.themeStyle['--c-primary']"
          />
        </view>
      </view>

      <view class="scroll-bottom-pad" />
    </scroll-view>
  </view>
</template>

<script setup>
import { ref, computed } from "vue";
import { onShow, onPullDownRefresh } from "@dcloudio/uni-app";
import NavBar from "@/components/NavBar.vue";
import DishEmoji from "@/components/DishEmoji.vue";
import AppIcon from "@/components/AppIcon.vue";
import PageLoading from "@/components/PageLoading.vue";
import { useCoupleStore } from "@/store/couple";
import { useDishStore } from "@/store/dish";
import { resolveUrl } from "@/utils/server";

const couple = useCoupleStore();
const dishStore = useDishStore();
const refreshing = ref(false);
const firstLoading = ref(true);

// 平台判断：scroll-view 原生下拉刷新仅在小程序启用，H5 使用页面级下拉刷新
const isMpWeixin = ref(false);
// #ifdef MP-WEIXIN
isMpWeixin.value = true;
// #endif

const categories = computed(() => dishStore.allCategories);
const customDishes = computed(() =>
  dishStore.customDishes.map((d) => ({
    ...d,
    categoryName: categoryName(d.categoryId),
  })),
);

function categoryName(catId) {
  const c = categories.value.find((x) => x.id === catId);
  return c ? `${c.icon || "🍽️"} ${c.name}` : "";
}

function goDishDetail(id) {
  uni.navigateTo({ url: "/pages/dish/detail?id=" + id });
}

async function onRefresh() {
  refreshing.value = true;
  try {
    await dishStore.fetchAll();
  } catch (e) {
    // ignore
  } finally {
    refreshing.value = false;
  }
}

onPullDownRefresh(() => {
  onRefresh().finally(() => uni.stopPullDownRefresh());
});

onShow(async () => {
  try {
    await dishStore.fetchAll();
  } catch (e) {
    // ignore
  } finally {
    firstLoading.value = false;
  }
});
</script>

<style lang="scss" scoped>
.library-page {
  height: 100vh;
  display: flex;
  flex-direction: column;
}
.library-scroll {
  flex: 1;
  height: 0;
  padding: 0 24rpx;
}
.library-header {
  display: flex;
  align-items: baseline;
  gap: 12rpx;
  margin: 32rpx 0 24rpx;
  .lh-count {
    font-size: 64rpx;
    font-weight: 800;
    color: $brand-primary;
  }
  .lh-label {
    font-size: 28rpx;
    color: $text-2;
  }
}
.empty-card {
  background: #fff;
  border-radius: $radius-lg;
  padding: 80rpx 28rpx;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12rpx;
  box-shadow: $shadow-card;
  .ec-text {
    font-size: 30rpx;
    font-weight: 600;
    color: $text-2;
  }
  .ec-sub {
    font-size: 24rpx;
    color: $text-4;
  }
}
.dish-list {
  display: flex;
  flex-direction: column;
  gap: 20rpx;
}
.dish-card {
  background: #fff;
  border-radius: $radius-lg;
  padding: 24rpx;
  box-shadow: $shadow-card;
  display: flex;
  align-items: center;
  gap: 20rpx;
}
.dish-img-wrap {
  width: 120rpx;
  height: 120rpx;
  border-radius: $radius-md;
  overflow: hidden;
  flex-shrink: 0;
  background: $bg-surface-alt;
  .dish-img {
    width: 100%;
    height: 100%;
  }
  ::v-deep .dish-emoji {
    width: 100%;
    height: 100%;
  }
}
.dish-body {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 8rpx;
}
.dish-name {
  font-size: 30rpx;
  font-weight: 700;
  color: $text-1;
}
.dish-desc {
  font-size: 24rpx;
  color: $text-3;
}
.dish-tag {
  align-self: flex-start;
  padding: 4rpx 16rpx;
  background: $bg-surface-alt;
  border-radius: $radius-pill;
  font-size: 22rpx;
  color: $brand-taro;
}
.scroll-bottom-pad {
  height: 40rpx;
}
</style>
<!-- #ifdef MP-WEIXIN -->
<style lang="scss">
.dish-list .dish-img-wrap .dish-emoji {
  width: 100% !important;
  height: 100% !important;
}
</style>
<!-- #endif -->
