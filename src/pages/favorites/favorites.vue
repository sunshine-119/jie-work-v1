<template>
  <view
    class="page favorites-page"
    :class="couple.themeClass"
    :style="couple.themeStyle"
  >
    <NavBar title="我的想吃清单" :show-back="true" />
    <PageLoading :visible="firstLoading" @timeout="firstLoading = false" />
    <scroll-view
      v-show="!firstLoading"
      scroll-y
      class="favorites-scroll"
      :show-scrollbar="false"
      :refresher-enabled="isMpWeixin"
      :refresher-triggered="isMpWeixin ? refreshing : false"
      @refresherrefresh="onRefresh"
    >
      <view class="favorites-header">
        <text class="fh-count">{{ favoriteDishes.length }}</text>
        <text class="fh-label">道想吃的菜</text>
      </view>

      <view v-if="favoriteDishes.length === 0" class="empty-card">
        <AppIcon
          name="heartOutline"
          size="80"
          :color="couple.themeStyle['--c-taro'] || '#B8A2C7'"
        />
        <text class="ec-text">还没收藏想吃的菜</text>
        <view class="ec-sub">
          <text>去菜单页点</text>
          <AppIcon
            name="heartOutline"
            size="24"
            :color="couple.themeStyle['--c-primary'] || '#F5B6C1'"
          />
          <text>收藏喜欢的菜</text>
        </view>
      </view>

      <view v-else class="favorites-list">
        <view
          v-for="d in favoriteDishes"
          :key="d.id"
          class="fav-item"
          @click="goDishDetail(d.id)"
        >
          <DishEmoji
            :image="d.image"
            :emoji="d.emoji"
            :bg="d.bgColor"
            size="md"
          />
          <view class="fi-info">
            <text class="fi-name ellipsis">{{ d.name }}</text>
            <text class="fi-cat">{{ categoryName(d.categoryId) }}</text>
          </view>
          <view class="fi-fav active" @click.stop="onToggleFavorite(d.id)">
            <AppIcon name="heart" size="32" color="#E08B8B" />
          </view>
        </view>
      </view>

      <view class="scroll-bottom-pad" />
    </scroll-view>
  </view>
</template>

<script setup>
import { ref, computed } from 'vue';
import { onShow, onPullDownRefresh } from '@dcloudio/uni-app';
import NavBar from '@/components/NavBar.vue';
import DishEmoji from '@/components/DishEmoji.vue';
import AppIcon from '@/components/AppIcon.vue';
import PageLoading from '@/components/PageLoading.vue';
import { useCoupleStore } from '@/store/couple';
import { usePreferenceStore } from '@/store/preference';
import { useDishStore } from '@/store/dish';
import { usePoll } from '@/utils/sync';
import { requireLogin } from '@/utils/auth';

usePoll(['couple']);

const couple = useCoupleStore();
const preference = usePreferenceStore();
const dishStore = useDishStore();

const refreshing = ref(false);
const firstLoading = ref(true);

const isMpWeixin = ref(false);
// #ifdef MP-WEIXIN
isMpWeixin.value = true;
// #endif

const dishes = computed(() => dishStore.dishes);
const categories = computed(() => dishStore.allCategories);

const favoriteDishes = computed(() =>
  preference.favorites
    .map((id) => dishes.value.find((d) => d.id === id))
    .filter(Boolean)
);

function categoryName(catId) {
  const c = categories.value.find((x) => x.id === catId);
  return c ? `${c.icon || "🍽️"} ${c.name}` : "";
}

function goDishDetail(id) {
  uni.navigateTo({ url: '/pages/dish/detail?id=' + id });
}

function onToggleFavorite(dishId) {
  if (!requireLogin(couple)) return;
  if (preference.isFavorite(dishId)) {
    uni.showModal({
      title: '取消收藏',
      content: '确定不再想吃这道菜了吗？',
      confirmColor: couple.themeStyle['--c-primary'] || '#F5B6C1',
      success: (res) => {
        if (res.confirm) {
          preference.toggleFavorite(dishId);
        }
      }
    });
  } else {
    preference.toggleFavorite(dishId);
  }
}

async function onRefresh() {
  refreshing.value = true;
  try {
    await Promise.all([
      dishStore.fetchAll(),
      preference.fetchFromServer()
    ]);
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
  dishStore.init();
  preference.init();
  try {
    await Promise.all([
      dishStore.fetchAll(),
      preference.fetchFromServer()
    ]);
  } catch (e) {
    // ignore
  } finally {
    firstLoading.value = false;
  }
});
</script>

<style lang="scss" scoped>
.favorites-page {
  height: 100vh;
  display: flex;
  flex-direction: column;
}
.favorites-scroll {
  flex: 1;
  height: 0;
  padding: 0 24rpx;
}
.favorites-header {
  display: flex;
  align-items: baseline;
  gap: 12rpx;
  margin: 32rpx 0 24rpx;
  .fh-count {
    font-size: 64rpx;
    font-weight: 800;
    color: $brand-primary;
  }
  .fh-label {
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
    display: flex;
    align-items: center;
    gap: 6rpx;
    font-size: 24rpx;
    color: $text-4;
  }
}
.favorites-list {
  display: flex;
  flex-direction: column;
  background: #fff;
  border-radius: $radius-lg;
  padding: 0 24rpx;
  box-shadow: $shadow-card;
}
.fav-item {
  display: flex;
  align-items: center;
  padding: 24rpx 0;
  border-bottom: 1rpx solid $divider;
  transition: background-color 0.2s ease;
  &:last-child {
    border-bottom: none;
  }
  &:active {
    background: $bg-hover;
  }
}
.fi-info {
  flex: 1;
  min-width: 0;
  margin-left: 20rpx;
  display: flex;
  flex-direction: column;
  gap: 8rpx;
  .fi-name {
    font-size: 30rpx;
    font-weight: 700;
    color: $text-1;
  }
  .fi-cat {
    font-size: 24rpx;
    color: $text-3;
  }
}
.fi-fav {
  width: 64rpx;
  height: 64rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 32rpx;
}
.scroll-bottom-pad {
  height: 40rpx;
}
</style>
