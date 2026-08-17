<template>
  <view
    class="page orders-page"
    :class="couple.themeClass"
    :style="couple.themeStyle"
  >
    <NavBar :show-back="false">
      <text class="nav-title">{{
        couple.isGirlfriend
          ? "我的小餐车"
          : couple.partnerDisplayName + "的订单"
      }}</text>
      <template #right>
        <view v-if="couple.isGirlfriend" class="nav-right" @click="goAddress">
          <AppIcon name="location" size="24" color="#fff" />
          <text class="nr-text">地址</text>
        </view>
      </template>
    </NavBar>

    <PageLoading :visible="firstLoading" @timeout="firstLoading = false" />

    <nut-tabs v-model="currentTabIndex" swipeable class="nut-tabs-container">
      <nut-tab-pane
        v-for="(t, idx) in tabs"
        :key="t.key"
        :title="t.label"
        :pane-key="idx"
        class="tab-pane"
      >
        <!-- 搜索框：仅在「全部订单」Tab 显示 -->
        <view v-if="t.key === 'all'" class="search-bar">
          <view class="search-box">
            <nut-icon
              name="search2"
              size="30rpx"
              :custom-color="couple.themeStyle['--c-primary']"
              class="s-icon"
            />
            <input
              :value="searchKeyword"
              class="search-input"
              placeholder="搜索菜品名或订单号"
              placeholder-class="search-ph"
              confirm-type="search"
              @input="onSearchInput"
            />
            <view
              v-if="searchKeyword"
              class="search-clear"
              @click="clearSearch"
            >
              <nut-icon
                name="close"
                size="16rpx"
                custom-color="#999"
                class="s-clear"
              />
            </view>
          </view>
          <!-- <view
            v-if="searchKeyword && searchResults.length === 0"
            class="search-no-result"
          >
            <text>未找到相关订单</text>
          </view> -->
        </view>

        <scroll-view
          scroll-y
          class="order-scroll"
          :show-scrollbar="false"
          :refresher-enabled="isMpWeixin"
          :refresher-triggered="isMpWeixin ? refreshing : false"
          @refresherrefresh="onRefresh"
        >
          <view v-if="getDisplayList(t.key).length === 0" class="empty-wrap">
            <Empty
              :icon="getEmptyIcon(t.key)"
              :text="getEmptyState(t.key).text"
              :desc="getEmptyState(t.key).desc"
              :btn-text="getEmptyBtnText(t.key)"
              @action="onEmptyAction(t.key)"
            />
          </view>

          <view v-else class="order-list">
            <view
              v-for="o in getDisplayList(t.key)"
              :key="o.id"
              class="order-card"
              :class="{ 'is-urgent': isUrgent(o) }"
              @click="goDetail(o.id)"
            >
              <view class="card-head">
                <view class="head-left">
                  <text class="order-no">订单号 #{{ o.no }}</text>
                  <view class="order-type">
                    <AppIcon
                      :name="o.type === 'dine' ? 'menu' : 'location'"
                      size="20"
                      color="#E08B8B"
                    />
                    <text>{{ o.type === "dine" ? "在家吃" : "点外卖" }}</text>
                  </view>
                </view>
                <text
                  class="status"
                  :style="{ color: statusMap[o.status].color }"
                >
                  {{ statusText(o) }}
                </text>
                <!-- <text
                    class="status-tag"
                    :class="statusClass(o.status)"
                    >{{ statusText(o) }}</text
                  > -->
              </view>

              <view
                v-if="o.urges && o.urges.length > 0 && o.status < 2"
                class="urge-flag"
              >
                <AppIcon name="pouting" size="22" color="#E8B86C" />
                <text class="uf-text">已撒娇催 {{ o.urges.length }} 次</text>
              </view>

              <view v-if="o.sweetNote" class="sweet-preview">
                <AppIcon name="envelope" size="24" color="#B8A2C7" />
                <text class="sp-text ellipsis">{{ o.sweetNote }}</text>
              </view>

              <view
                v-if="o.status === 5 && o.rejectReason"
                class="reject-preview"
              >
                <AppIcon name="pray" size="24" color="#E08B8B" />
                <text class="rp-text ellipsis">{{ o.rejectReason }}</text>
              </view>

              <view v-if="o.status === 4" class="cancelled-preview">
                <AppIcon name="close" size="24" color="#C9BFC4" />
                <text class="rp-text ellipsis">订单已取消</text>
              </view>

              <view class="card-body">
                <view class="thumbs">
                  <DishEmoji
                    v-for="(it, i) in o.items.slice(0, 4)"
                    :key="it.itemId || it.lineKey || it.id"
                    class="thumb"
                    :style="{ marginLeft: i === 0 ? '0' : '-20rpx' }"
                    :image="it.image"
                    :emoji="it.emoji"
                    :bg="it.bgColor"
                    size="md"
                  />
                  <view v-if="o.items.length > 4" class="thumb more"
                    >+{{ o.items.length - 4 }}</view
                  >
                </view>
                <view class="body-info">
                  <text class="items-text ellipsis">{{
                    o.items.map((i) => i.name).join("、")
                  }}</text>
                  <text class="count">共 {{ itemCount(o) }} 件</text>
                </view>
              </view>

              <view v-if="o.status === 3 && o.rating > 0" class="rate-show">
                <view class="rs-stars">
                  <AppIcon
                    v-for="i in 5"
                    :key="i"
                    class="rs-star"
                    :class="{ active: i <= o.rating }"
                    :name="i <= o.rating ? 'star' : 'starOutline'"
                    size="24"
                  />
                </view>
                <text v-if="o.ratingComment" class="rs-comment ellipsis">{{
                  o.ratingComment
                }}</text>
              </view>

              <view class="card-foot">
                <view class="time">{{ relativeTime(o.createdAt) }}</view>
                <view class="foot-right">
                  <text class="pay-word">共 {{ itemCount(o) }} 件</text>
                  <!-- <text
                    class="status-tag"
                    :class="statusClass(o.status)"
                    >{{ statusText(o) }}</text
                  > -->
                </view>
              </view>

              <view v-if="o.status < 3" class="card-actions" @click.stop>
                <view
                  v-if="couple.isGirlfriend && o.status < 2"
                  class="action-btn ghost"
                  @click="onCancel(o.id)"
                  >取消</view
                >
                <view class="action-btn primary" @click="goDetail(o.id)"
                  >查看详情</view
                >
              </view>
              <view v-else-if="o.status === 3" class="card-actions" @click.stop>
                <view
                  v-if="couple.isGirlfriend && o.rating === 0"
                  class="action-btn urge"
                  @click="goDetail(o.id)"
                  >去打分</view
                >
                <view
                  v-if="couple.isGirlfriend"
                  class="action-btn ghost"
                  @click="reorder(o)"
                  >再来一单</view
                >
                <view class="action-btn ghost" @click="goDetail(o.id)"
                  >查看详情</view
                >
              </view>
              <view v-else class="card-actions" @click.stop>
                <view
                  v-if="couple.isGirlfriend"
                  class="action-btn ghost"
                  @click="reorder(o)"
                  >再来一单</view
                >
                <view class="action-btn ghost" @click="goDetail(o.id)"
                  >查看详情</view
                >
              </view>
            </view>
          </view>
          <view class="tab-holder" />
        </scroll-view>
      </nut-tab-pane>
    </nut-tabs>

    <TabBar current="orders" />

    <Toast />
  </view>
</template>

<script setup>
/**
 * 订单列表页（女友端 / 男友端双视角）
 * -----------------------------------------------------------------------------
 * 分两个 tab：
 * 1) 进行中：待接单 / 制作中 / 做好啦
 * 2) 已完成：已完成 / 已取消 / 已拒绝（含打分评价展示）
 *
 * 列表项展示：撒娇留言预览、拒绝理由预览、催餐标记、评分星级行
 */
import { ref, computed, watch } from "vue";
import { onShow, onPullDownRefresh } from "@dcloudio/uni-app";
import NavBar from "@/components/NavBar.vue";
import PageLoading from "@/components/PageLoading.vue";
import TabBar from "@/components/TabBar.vue";
import Empty from "@/components/Empty.vue";
import DishEmoji from "@/components/DishEmoji.vue";
import AppIcon from "@/components/AppIcon.vue";
import Toast from "@/components/Toast.vue";
import { useOrderStore, ORDER_STATUS } from "@/store/order";
import { useCartStore } from "@/store/cart";
import { useCoupleStore } from "@/store/couple";
import { relativeTime } from "@/utils/format";
import { toast } from "@/utils/toast";
import { usePoll } from "@/utils/sync";

// 订单列表页需要订单实时同步（状态变更/新订单等）
usePoll(["orders"]);

const orderStore = useOrderStore();
const cart = useCartStore();
const couple = useCoupleStore();
const statusMap = ORDER_STATUS;
const refreshing = ref(false);
const firstLoading = ref(true);

const isMpWeixin = ref(false);
// #ifdef MP-WEIXIN
isMpWeixin.value = true;
// #endif

const tabs = [
  { key: "active", label: "进行中" },
  { key: "history", label: "已完成" },
  { key: "cancelled", label: "已取消" },
  { key: "rejected", label: "已拒绝" },
  { key: "all", label: "全部订单" },
];
const currentTabIndex = ref(0);

const currentTab = computed(() => tabs[currentTabIndex.value]?.key || "active");

// ── 搜索（防抖 300ms，仅在「全部订单」Tab 使用） ──
const searchKeyword = ref("");
const debouncedKeyword = ref("");
let searchTimer = null;

function onSearchInput(e) {
  searchKeyword.value = e.detail?.value ?? e.target?.value ?? "";
  if (searchTimer) clearTimeout(searchTimer);
  searchTimer = setTimeout(() => {
    debouncedKeyword.value = searchKeyword.value.trim();
  }, 300);
}

function clearSearch() {
  searchKeyword.value = "";
  debouncedKeyword.value = "";
}

const searchResults = computed(() => {
  const kw = debouncedKeyword.value.toLowerCase();
  if (!kw) return orderStore.allOrders || [];
  return (orderStore.allOrders || []).filter((o) => {
    if (String(o.no).includes(kw)) return true;
    if (o.items && Array.isArray(o.items)) {
      if (o.items.some((it) => it.name && it.name.toLowerCase().includes(kw)))
        return true;
    }
    return false;
  });
});

function getDisplayList(key) {
  if (key === "all" && debouncedKeyword.value) return searchResults.value;
  return getList(key);
}

function getList(key) {
  if (key === "active") return orderStore.activeOrders || [];
  if (key === "cancelled") return orderStore.cancelledOrders || [];
  if (key === "rejected") return orderStore.rejectedOrders || [];
  if (key === "all") return orderStore.allOrders || [];
  return orderStore.historyOrders || [];
}

function getEmptyIcon(key) {
  const map = {
    active: "chef",
    history: "order",
    cancelled: "close",
    rejected: "warning",
    all: "order",
  };
  return map[key] || "order";
}

function getEmptyState(key) {
  const name = couple.partnerDisplayName;
  const isG = couple.isGirlfriend;
  const states = {
    active: isG
      ? {
          text: "还没有正在为你准备的餐",
          desc: "去挑些好吃的，" + name + "做给你",
        }
      : { text: "暂时没有新订单", desc: name + "下单后这里会实时出现" },
    history: isG
      ? { text: "还没有完成的订单", desc: "你的大厨还没做过单哦～" }
      : { text: "还没有完成的订单", desc: "完成第一单后就能在这里看到" },
    cancelled: isG
      ? { text: "还没有取消的订单", desc: "下单后可随时取消不想吃的餐" }
      : { text: "还没有取消的订单", desc: name + "取消订单后会出现在这里" },
    rejected: isG
      ? { text: "还没有被拒绝的订单", desc: "如果大厨不在状态，订单可能被拒绝" }
      : { text: "还没有拒绝的订单", desc: "你拒绝的订单会出现在这里" },
    all: isG
      ? { text: "还没有订单记录", desc: "去菜单页挑选想吃的菜吧" }
      : { text: "还没有订单记录", desc: name + "下单后这里会展示全部订单" },
  };
  return states[key] || states.active;
}

function getEmptyBtnText(key) {
  if (key === "active") return couple.isGirlfriend ? "去点餐" : "回首页";
  if (key === "history") return couple.isGirlfriend ? "去点餐" : "回首页";
  if (key === "cancelled") return couple.isGirlfriend ? "再点一个" : "回首页";
  if (key === "rejected") return couple.isGirlfriend ? "换一个菜" : "回首页";
  if (key === "all") return couple.isGirlfriend ? "去点餐" : "回首页";
  return "";
}

function onEmptyAction(key) {
  if (couple.isGirlfriend) {
    goMenu();
  } else {
    goHome();
  }
}

function itemCount(o) {
  if (!o.items || !Array.isArray(o.items)) return 0;
  return o.items.reduce((a, b) => a + b.qty, 0);
}

// 是否为「紧急催餐」状态：催过 2 次以上还在制作中
function isUrgent(o) {
  return (o.urges?.length || 0) >= 2 && o.status < 2;
}

function statusText(o) {
  if (o.status === 4) return "已取消";
  if (o.status === 5) return "已拒绝";
  if (o.status === 3) return "已完成";
  return couple.isGirlfriend
    ? "等" + couple.partnerDisplayName + "开饭（制作中）"
    : "为" + couple.partnerDisplayName + "准备（制作中）";
}

function statusClass(status) {
  if (status === 4) return "status-cancelled";
  if (status === 5) return "status-rejected";
  if (status === 3) return "status-completed";
  return "status-active";
}

function goMenu() {
  uni.reLaunch({ url: "/pages/menu/menu" });
}
function goAddress() {
  uni.navigateTo({ url: "/pages/address/address" });
}
function goHome() {
  uni.reLaunch({ url: "/pages/index/index" });
}
function goDetail(id) {
  uni.navigateTo({ url: "/pages/orders/detail?id=" + id });
}
function onCancel(id) {
  uni.showModal({
    title: "取消订单？",
    content: "真的不吃了嘛？取消后" + couple.partnerDisplayName + "就不做了哦",
    confirmText: "不吃了",
    cancelText: "再想想",
    confirmColor: "#E08B8B",
    success: (r) => {
      if (r.confirm) {
        orderStore.cancel(id);
        toast.success("已取消");
      }
    },
  });
}
function reorder(o) {
  o.items.forEach((it) => {
    // 按原备注重新加入购物车
    for (let i = 0; i < it.qty; i++) {
      if (it.isCustom) {
        cart.addCustomDish(
          {
            id: it.id,
            name: it.name,
            price: it.price,
            image: it.image,
            spicy: it.spicy,
            dietNote: it.dietNote,
            isCustom: true,
          },
          1,
          { spicy: it.spicy, dietNote: it.dietNote },
        );
      } else {
        cart.addWithNote(it.id, 1, { spicy: it.spicy, dietNote: it.dietNote });
      }
    }
  });
  toast.success("已加入小餐车");
  setTimeout(() => uni.reLaunch({ url: "/pages/menu/menu" }), 600);
}

// tab 切换时强制刷新当前分类数据
watch(currentTab, () => {
  orderStore.fetchFromServer(true).catch(() => {});
});

onShow(() => {
  // 进入页面强制刷新，避免全局同步器间隔导致数据滞后
  orderStore
    .fetchFromServer(true)
    .catch(() => {})
    .finally(() => {
      firstLoading.value = false;
    });
});

async function onRefresh() {
  refreshing.value = true;
  try {
    await Promise.all([
      orderStore.fetchFromServer(true),
      couple.fetchFromServer(true),
    ]);
    toast.success("已刷新", 1000);
  } catch (e) {
    toast.error("刷新失败");
  } finally {
    refreshing.value = false;
  }
}

// #ifndef MP-WEIXIN
onPullDownRefresh(() => {
  onRefresh().finally(() => {
    uni.stopPullDownRefresh();
  });
});
// #endif
</script>

<style lang="scss" scoped>
.orders-page {
  height: 100vh;
  display: flex;
  flex-direction: column;
}
.nav-title {
  font-size: 36rpx;
  font-weight: 800;
  color: #fff;
}
.nav-right {
  display: flex;
  align-items: center;
  color: #fff;
  font-size: 24rpx;
  font-weight: 600;
  background: rgba(255, 255, 255, 0.28);
  padding: 8rpx 16rpx;
  border-radius: $radius-pill;
  white-space: nowrap;
}
.nr-text {
  margin-left: 6rpx;
}
// #ifdef H5
.nut-tabs-container {
  flex: 1;
  // height: 0;
  display: flex;
  flex-direction: column;
  ::v-deep {
    .nut-tabs__content {
      height: 100%;
    }
    .nut-tabs__titles,
    .nut-tabs__list {
      background-color: var(--c-bg-alt);
    }
    .nut-tabs__titles-item {
      color: $text-3;
      width: auto !important;
      font-size: 30rpx;
    }
    .nut-tabs__titles-item.active {
      color: var(--c-primary, $brand-primary);
      font-weight: 700 !important;
    }
    .nut-tabs__titles-item__line {
      background: var(
        --nut-tabs-horizontal-tab-line-color,
        linear-gradient(
          90deg,
          var(--c-primary, $brand-primary) 0%,
          rgba(255, 255, 255, 0.15) 100%
        )
      ) !important;
    }
  }
}
.tab-pane {
  // flex: 1;
  // height: 0;
  display: flex;
  flex-direction: column;
  // overflow: hidden;
  padding: 0 !important;
  background: transparent;
}
// #endif
.order-scroll {
  flex: 1;
  // height: 0;
}
.search-bar {
  padding: 16rpx 24rpx 12rpx;
  background: var(--c-bg-page, #fff);
}
.search-box {
  display: flex;
  align-items: center;
  gap: 12rpx;
  padding: 0 24rpx;
  height: 72rpx;
  background: $bg-surface-alt;
  border-radius: $radius-pill;
}
.search-input {
  flex: 1;
  font-size: 28rpx;
  color: $text-1;
  background: transparent;
  border: none;
  outline: none;
  padding: 0;
  height: 100%;
}
.search-ph {
  color: $text-4;
}
.search-clear {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 36rpx;
  height: 36rpx;
  border-radius: 50%;
  background: rgba(0, 0, 0, 0.06);
}
.search-no-result {
  margin-top: 16rpx;
  text-align: center;
  font-size: 26rpx;
  color: $text-3;
}
.empty-wrap {
  padding-top: 80rpx;
}
.order-list {
  padding: 24rpx;
}
.order-card {
  // background: var(--c-bg-alt, #fff);
  border-radius: $radius-lg;
  padding: 28rpx;
  margin-bottom: 20rpx;
  box-shadow: $shadow-card;
  &.is-urgent {
    border: 2rpx solid rgba(232, 184, 108, 0.5);
  }
}
.card-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
}
.head-left {
  display: flex;
  align-items: center;
  gap: 16rpx;
}
.order-no {
  font-size: 24rpx;
  color: $text-3;
}
.order-type {
  display: flex;
  align-items: center;
  gap: 6rpx;
  font-size: 22rpx;
  color: $brand-primary;
  // background: rgba(245, 182, 193, 0.18);
  padding: 4rpx 14rpx;
  border-radius: $radius-sm;
}
.status {
  font-size: 26rpx;
  font-weight: 700;
}

/* 催餐标记 */
.urge-flag {
  display: inline-flex;
  align-items: center;
  gap: 6rpx;
  margin-top: 12rpx;
  padding: 4rpx 14rpx;
  background: rgba(232, 184, 108, 0.14);
  border-radius: $radius-pill;
  align-self: flex-start;
  .uf-text {
    font-size: 22rpx;
    color: $color-warning;
    font-weight: 600;
  }
}

/* 撒娇留言预览 */
.sweet-preview {
  display: flex;
  align-items: center;
  gap: 10rpx;
  margin-top: 14rpx;
  padding: 12rpx 16rpx;
  background: linear-gradient(135deg, #fff, $bg-taro);
  border-radius: $radius-md;
  .sp-text {
    flex: 1;
    font-size: 24rpx;
    color: $brand-taro;
    font-weight: 500;
  }
}

/* 拒绝理由预览 */
.reject-preview {
  display: flex;
  align-items: center;
  gap: 10rpx;
  margin-top: 14rpx;
  padding: 12rpx 16rpx;
  background: rgba(224, 139, 139, 0.08);
  border-radius: $radius-md;
  .rp-text {
    flex: 1;
    font-size: 24rpx;
    color: $color-danger;
  }
}
.cancelled-preview {
  display: flex;
  align-items: center;
  gap: 10rpx;
  margin-top: 14rpx;
  padding: 12rpx 16rpx;
  background: rgba(201, 191, 196, 0.12);
  border-radius: $radius-md;
  .rp-text {
    flex: 1;
    font-size: 24rpx;
    color: #9a9095;
  }
}

.card-body {
  display: flex;
  align-items: center;
  margin: 20rpx 0;
  padding: 20rpx 0;
  border-top: 1rpx solid $divider;
  border-bottom: 1rpx solid $divider;
}
.thumbs {
  display: flex;
  align-items: center;
  flex-shrink: 0;
}
.thumb {
  border: 4rpx solid #fff;
  box-sizing: content-box;
  flex-shrink: 0;
  &.more {
    width: 88rpx;
    height: 88rpx;
    border-radius: $radius-sm;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 24rpx;
    color: $text-2;
    background: $bg-surface-alt;
  }
}
.body-info {
  flex: 1;
  min-width: 0;
  margin-left: 24rpx;
}
.items-text {
  width: 100%;
  display: inline-block;
  font-size: 26rpx;
  color: $text-1;
  font-weight: 500;
}
.count {
  display: block;
  margin-top: 8rpx;
  font-size: 22rpx;
  color: $text-3;
}

/* 评分展示 */
.rate-show {
  display: flex;
  align-items: center;
  gap: 12rpx;
  padding: 12rpx 0;
  .rs-stars {
    display: flex;
    gap: 4rpx;
    .rs-star {
      font-size: 24rpx;
      color: $text-4;
      &.active {
        color: $brand-primary;
      }
    }
  }
  .rs-comment {
    flex: 1;
    font-size: 22rpx;
    color: $text-3;
  }
}

.card-foot {
  display: flex;
  align-items: center;
  justify-content: space-between;
  .time {
    font-size: 22rpx;
    color: $text-4;
  }
  .foot-right {
    display: flex;
    align-items: baseline;
    gap: 8rpx;
  }
}
.pay-word {
  font-size: 24rpx;
  font-weight: 600;
  color: $text-3;
}
.status-tag {
  font-size: 24rpx;
  font-weight: 700;
  &.status-active {
    color: #ff9966;
  }
  &.status-completed {
    color: #7fb6a8;
  }
  &.status-cancelled {
    color: #c9bfc4;
  }
  &.status-rejected {
    color: #e08b8b;
  }
}
.card-actions {
  margin-top: 20rpx;
  display: flex;
  justify-content: flex-end;
  gap: 16rpx;
}
.action-btn {
  padding: 14rpx 28rpx;
  border-radius: $radius-pill;
  font-size: 24rpx;
  font-weight: 600;
  &.ghost {
    border: 2rpx solid $border-1;
    color: $text-2;
  }
  &.primary {
    background: linear-gradient(135deg, $brand-primary, $brand-primary-2);
    color: #fff;
  }
  &.urge {
    background: linear-gradient(135deg, $brand-taro, $brand-accent);
    color: #fff;
  }
}
.tab-holder {
  height: 180rpx;
}
</style>
<!-- #ifdef MP-WEIXIN -->
<style lang="scss">
::v-deep {
  .nut-tabs__content {
    height: 100%;
  }
  .nut-tabs__titles,
  .nut-tabs__list {
    background-color: var(--c-bg-alt);
  }
  .nut-tabs__titles-item {
    color: $text-3;
    width: auto !important;
    font-size: 30rpx;
  }
  .nut-tabs__titles-item.active {
    color: var(--c-primary, $brand-primary);
    font-weight: 700 !important;
  }
  .nut-tabs__titles-item__line {
    background: var(
      --nut-tabs-horizontal-tab-line-color,
      linear-gradient(
        90deg,
        var(--c-primary, $brand-primary) 0%,
        rgba(255, 255, 255, 0.15) 100%
      )
    ) !important;
  }
}
::v-deep .nut-tab-pane {
  // flex: 1;
  // height: 0;
  display: flex;
  flex-direction: column;
  // overflow: hidden;
  padding: 0 !important;
  background: transparent !important;
}
</style>
<!-- #endif -->
