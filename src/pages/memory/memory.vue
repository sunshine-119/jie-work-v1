<template>
  <view class="page memory-page" :class="couple.themeClass" :style="couple.themeStyle">
    <NavBar title="回忆相册" :show-back="true" />
    <PageLoading :visible="firstLoading" @timeout="firstLoading = false" />
    <scroll-view
      v-show="!firstLoading"
      scroll-y
      class="memory-scroll"
      :show-scrollbar="false"
      :refresher-enabled="isMpWeixin"
      :refresher-triggered="isMpWeixin ? refreshing : false"
      @refresherrefresh="onRefresh"
    >
      <view class="memory-header">
        <text class="mh-count">{{ memoryOrders.length }}</text>
        <text class="mh-label">餐甜蜜记录</text>
      </view>

      <view v-if="memoryOrders.length === 0" class="empty-card">
        <!-- <AppIcon name="camera" size="80" color="#B8A2C7" /> -->
        <nut-icon name="photograph" size="40rpx" :custom-color="couple.themeStyle['--c-taro'] || '#B8A2C7'" />
        <text class="ec-text">还没有回忆记录</text>
        <text class="ec-sub">完成订单后就能存进相册啦</text>
      </view>

      <view v-else class="memory-list">
        <view
          v-for="o in memoryOrders"
          :key="o.id"
          class="memory-card"
          @click="goDetail(o.id)"
        >
          <view class="mc-top">
            <view class="mc-thumbs">
              <DishEmoji
                v-for="(it, i) in o.items.slice(0, 3)"
                :key="it.itemId || it.lineKey || it.id"
                class="mc-thumb"
                :style="{ marginLeft: i === 0 ? '0' : '-16rpx' }"
                :image="it.image"
                :emoji="it.emoji"
                :bg="it.bgColor"
                size="sm"
              />
            </view>
            <view class="mc-info">
              <text class="mc-date">{{ formatTime(o.createdAt) }}</text>
              <text class="mc-items ellipsis">{{ o.items.map((i) => i.name).join('、') }}</text>
            </view>
          </view>
          <view v-if="o.rating > 0" class="mc-rate">
            <view class="mc-stars">
              <AppIcon
                v-for="i in 5"
                :key="i"
                class="mc-star"
                :class="{ active: i <= o.rating }"
                :name="i <= o.rating ? 'star' : 'starOutline'"
                size="28"
              />
            </view>
            <text v-if="o.ratingComment" class="mc-comment ellipsis">{{ o.ratingComment }}</text>
            <text v-else class="mc-comment">{{ couple.isGirlfriend ? couple.myDisplayName + '给了' : couple.partnerDisplayName + '给了' }} {{ o.rating }} 颗星</text>
          </view>
          <view v-else class="mc-rate">
            <text class="mc-norate">还没打分</text>
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
import { useOrderStore } from '@/store/order';
import { usePoll } from '@/utils/sync';

// 回忆相册页需要订单实时同步（新完成的订单会出现在回忆中）
usePoll(['orders']);

const couple = useCoupleStore();
const orderStore = useOrderStore();
const refreshing = ref(false);
const firstLoading = ref(true);

// 平台判断：scroll-view 原生下拉刷新仅在小程序启用，H5 使用页面级下拉刷新
const isMpWeixin = ref(false);
// #ifdef MP-WEIXIN
isMpWeixin.value = true;
// #endif

const memoryOrders = computed(() => orderStore.memoryOrders);

function formatTime(ts) {
  if (!ts) return '';
  const d = new Date(ts);
  const pad = (n) => (n < 10 ? '0' + n : n);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function goDetail(id) {
  uni.navigateTo({ url: '/pages/orders/detail?id=' + id });
}

async function onRefresh() {
  refreshing.value = true;
  try {
    await orderStore.fetchFromServer(true);
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
    await orderStore.fetchFromServer(true);
  } catch (e) {
    // ignore
  } finally {
    firstLoading.value = false;
  }
});
</script>

<style lang="scss" scoped>
.memory-page {
  height: 100vh;
  display: flex;
  flex-direction: column;
}
.memory-scroll {
  flex: 1;
  height: 0;
  padding: 0 24rpx;
}
.memory-header {
  display: flex;
  align-items: baseline;
  gap: 12rpx;
  margin: 32rpx 0 24rpx;
  .mh-count {
    font-size: 64rpx;
    font-weight: 800;
    color: $brand-primary;
  }
  .mh-label {
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
.memory-list {
  display: flex;
  flex-direction: column;
  gap: 20rpx;
}
.memory-card {
  background: #fff;
  border-radius: $radius-lg;
  padding: 24rpx;
  box-shadow: $shadow-card;
}
.mc-top {
  display: flex;
  align-items: center;
  gap: 16rpx;
}
.mc-thumbs {
  display: flex;
  flex-direction: row;
  padding-left: 16rpx;
}
.mc-thumb {
  margin-left: -16rpx;
  border: 4rpx solid #fff;
  border-radius: 50%;
  &:first-child {
    margin-left: 0;
  }
}
.mc-info {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 6rpx;
}
.mc-date {
  font-size: 24rpx;
  color: $text-3;
}
.mc-items {
  font-size: 30rpx;
  font-weight: 700;
  color: $text-1;
}
.mc-rate {
  margin-top: 20rpx;
  padding-top: 20rpx;
  border-top: 1rpx solid $divider;
  display: flex;
  align-items: center;
  gap: 16rpx;
}
.mc-stars {
  display: flex;
  gap: 6rpx;
}
.mc-star {
  color: #E0E0E0;
  &.active {
    color: #E8B86C;
  }
}
.mc-comment {
  flex: 1;
  min-width: 0;
  font-size: 26rpx;
  color: $text-2;
}
.mc-norate {
  font-size: 26rpx;
  color: $text-4;
}
.scroll-bottom-pad {
  height: 40rpx;
}
</style>
