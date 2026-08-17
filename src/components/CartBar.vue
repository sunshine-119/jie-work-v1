<template>
  <view>
    <!-- 遮罩 -->
    <view
      v-show="maskVisible"
      class="mask"
      :class="{ show: showClass }"
      @click="closePopup"
    />

    <!-- 购物车弹层（明细） -->
    <view
      v-show="detailVisible"
      class="cart-detail"
      :class="{ show: showClass }"
      @click.stop
    >
      <view class="cd-head">
        <text class="cd-title">已选 {{ cart.count }} 件</text>
        <text class="cd-clear" @click="onClear">清空</text>
      </view>
      <scroll-view scroll-y class="cd-list" :show-scrollbar="false">
        <view v-for="item in items" :key="item.lineKey" class="row">
          <DishEmoji :image="item.image" :emoji="item.emoji" :bg="item.bgColor" size="md" />
          <view class="row-info">
            <text class="row-name ellipsis">{{ item.name }}</text>
            <view v-if="item.spicy > 0 || item.dietNote" class="row-note">
              <text v-if="item.spicy > 0" class="note-spicy">
                {{ ['不辣', '微辣', '中辣', '重辣'][item.spicy] }}
              </text>
              <text v-if="item.dietNote" class="note-diet">{{ item.dietNote }}</text>
            </view>
          </view>
          <view class="row-action">
            <view class="r-btn minus" @click="onMinus(item.lineKey)">
              <AppIcon name="minus" size="24" color="#666" />
            </view>
            <text class="r-qty">{{ item.qty }}</text>
            <view class="r-btn add" @click="onAdd(item)">
              <AppIcon name="add" size="24" color="#fff" />
            </view>
          </view>
        </view>
      </scroll-view>
    </view>

    <!-- 底部购物车栏（位于 TabBar 上方） -->
    <view class="cart-bar">
      <view class="cart-icon" :class="{ active: !cart.isEmpty }" @click="togglePopup">
        <AppIcon name="cart" size="44" :color="cart.isEmpty ? '#999' : '#fff'" />
        <view v-if="!cart.isEmpty" class="cart-badge">{{ cart.count }}</view>
      </view>
      <view class="cart-info">
        <text v-if="cart.isEmpty" class="empty-tip">还没选菜，先挑点好吃的吧</text>
        <text v-else @click="goCheckout" class="checkout-btn">去结算</text>
      </view>
    </view>

    <Toast />
  </view>
</template>

<script setup>
import { ref, computed, watch, nextTick } from 'vue';
import DishEmoji from './DishEmoji.vue';
import AppIcon from './AppIcon.vue';
import Toast from './Toast.vue';
import { useCartStore } from '@/store/cart';
import { useCoupleStore } from '@/store/couple';
import { toast } from '@/utils/toast';
import { requireLogin } from '@/utils/auth';

const cart = useCartStore();
const couple = useCoupleStore();
const cartPopup = ref(false);
const closing = ref(false);
const enterReady = ref(false);

const items = computed(() => cart.detailList);

const maskVisible = computed(() => cartPopup.value || closing.value);
const detailVisible = computed(() => (cartPopup.value || closing.value) && !cart.isEmpty);
const showClass = computed(() => enterReady.value && cartPopup.value && !closing.value);

watch(cartPopup, (v) => {
  if (v) {
    closing.value = false;
    enterReady.value = false;
    nextTick(() => {
      setTimeout(() => { enterReady.value = true; }, 20);
    });
  }
});

watch(() => cart.isEmpty, (empty) => {
  if (empty && cartPopup.value && !closing.value) {
    closePopup();
  }
});

function togglePopup() {
  if (cart.isEmpty) return;
  if (cartPopup.value) {
    closePopup();
  } else {
    cartPopup.value = true;
  }
}

function closePopup() {
  closing.value = true;
  enterReady.value = false;
  setTimeout(() => {
    cartPopup.value = false;
    closing.value = false;
  }, 260);
}

function onAdd(item) {
  if (!requireLogin(couple)) return;
  if (item.isCustom) {
    cart.addCustomDish(
      {
        id: item.id,
        name: item.name,
        price: item.price,
        emoji: item.emoji,
        bgColor: item.bgColor,
        image: item.image,
        spicy: item.spicy,
        dietNote: item.dietNote,
        isCustom: true
      },
      1,
      { spicy: item.spicy, dietNote: item.dietNote }
    );
  } else {
    cart.addWithNote(item.id, 1, { spicy: item.spicy, dietNote: item.dietNote });
  }
}
function onMinus(lineKey) {
  if (!requireLogin(couple)) return;
  cart.minusLine(lineKey);
  if (cart.isEmpty) closePopup();
}
function onClear() {
  if (!requireLogin(couple)) return;
  cart.clear();
  closePopup();
}
function goCheckout() {
  if (!requireLogin(couple)) return;
  if (cart.isEmpty) {
    toast.info('先选点菜吧');
    return;
  }
  closePopup();
  uni.navigateTo({ url: '/pages/order/order' });
}
</script>

<style lang="scss" scoped>
.mask {
  position: fixed;
  inset: 0;
  background: rgba(74, 40, 60, 0.45);
  z-index: 98;
  opacity: 0;
  visibility: hidden;
  pointer-events: none;
  transition: opacity 0.25s ease-out, visibility 0s 0.25s;
  &.show {
    opacity: 1;
    visibility: visible;
    pointer-events: auto;
    transition: opacity 0.25s ease-out, visibility 0s 0s;
  }
}
.cart-detail {
  position: fixed;
  left: 0;
  right: 0;
  bottom: calc(205rpx + env(safe-area-inset-bottom));
  background: var(--c-bg-page, #fff);
  border-top-left-radius: $radius-lg;
  border-top-right-radius: $radius-lg;
  z-index: 99;
  max-height: 60vh;
  display: flex;
  flex-direction: column;
  transform: translateY(100%);
  transition: transform 0.28s cubic-bezier(0.22, 1, 0.36, 1);
  &.show {
    transform: translateY(0);
  }
}
.cd-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 28rpx;
  border-bottom: 1rpx solid $divider;
}
.cd-title {
  font-size: 28rpx;
  font-weight: 700;
  color: $text-1;
}
.cd-clear {
  font-size: 24rpx;
  color: $text-4;
}
.cd-list {
  flex: 1;
  padding: 0 28rpx;
  max-height: 50vh;
}
.row {
  display: flex;
  align-items: center;
  padding: 20rpx 0;
  border-bottom: 1rpx solid $divider;
  &:last-child {
    border-bottom: none;
  }
}
.row-info {
  flex: 1;
  min-width: 0;
  margin-left: 16rpx;
  display: flex;
  flex-direction: column;
  gap: 4rpx;
}
.row-name {
  font-size: 28rpx;
  font-weight: 600;
  color: $text-1;
}
.row-note {
  display: flex;
  flex-wrap: wrap;
  gap: 6rpx;
  .note-spicy {
    font-size: 20rpx;
    color: $color-warning;
    background: rgba(232, 184, 108, 0.14);
    padding: 2rpx 10rpx;
    border-radius: $radius-sm;
  }
  .note-diet {
    font-size: 20rpx;
    color: $brand-taro;
    background: $bg-taro;
    padding: 2rpx 10rpx;
    border-radius: $radius-sm;
  }
}
.custom-tag {
  align-self: flex-start;
  font-size: 18rpx;
  color: #fff;
  background: $brand-taro;
  padding: 2rpx 10rpx;
  border-radius: $radius-sm;
}
.row-action {
  display: flex;
  align-items: center;
  gap: 12rpx;
  flex-shrink: 0;
}
.r-btn {
  width: 44rpx;
  height: 44rpx;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 30rpx;
  &.minus {
    border: 2rpx solid $border-1;
    color: $text-2;
  }
  &.add {
    background: linear-gradient(135deg, $brand-primary, $brand-primary-2);
    color: #fff;
  }
}
.r-qty {
  min-width: 32rpx;
  text-align: center;
  font-size: 28rpx;
  font-weight: 700;
  color: $text-1;
}
.cart-bar {
  position: fixed;
  left: 0;
  right: 0;
  bottom: calc(108rpx + env(safe-area-inset-bottom));
  z-index: 99;
  display: flex;
  align-items: center;
  height: 100rpx;
  padding: 0 0 0 28rpx;
  background: var(--c-bg-alt, #fff);
  box-shadow: 0 -4rpx 24rpx rgba(245, 182, 193, 0.2);
}
.cart-icon {
  position: relative;
  width: 96rpx;
  height: 96rpx;
  border-radius: 50%;
  background: $bg-surface-alt;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-top: -40rpx;
  border: 6rpx solid #fff;
  box-shadow: $shadow-card;
  &.active {
    background: linear-gradient(135deg, $brand-primary, $brand-primary-2);
  }
}
.cart-badge {
  position: absolute;
  top: -4rpx;
  right: -4rpx;
  min-width: 32rpx;
  height: 32rpx;
  padding: 0 8rpx;
  border-radius: 16rpx;
  background: $color-danger;
  color: #fff;
  font-size: 20rpx;
  font-weight: 700;
  display: flex;
  align-items: center;
  justify-content: center;
}
.cart-info {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: flex-end;
  padding-right: 28rpx;
}
.empty-tip {
  font-size: 26rpx;
  color: $text-4;
}
.checkout-btn {
  padding: 20rpx 48rpx;
  background: linear-gradient(135deg, $brand-primary, $brand-primary-2);
  color: #fff;
  font-size: 30rpx;
  font-weight: 700;
  border-radius: $radius-pill;
  box-shadow: $shadow-press;
}
</style>
