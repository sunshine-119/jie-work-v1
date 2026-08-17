<template>
  <view class="page addr-page" :class="couple.themeClass" :style="couple.themeStyle">
    <NavBar title="收货地址" :show-back="true" />
    <PageLoading :visible="firstLoading" @timeout="firstLoading = false" />
    <view v-show="!firstLoading" v-if="addresses.length === 0" class="empty-wrap">
      <Empty icon="location" text="还没有收货地址" desc="添加地址后下单更方便" btn-text="新增地址" @action="goEdit()" />
    </view>

    <view v-show="!firstLoading" v-else class="addr-list">
      <view
        v-for="addr in addresses"
        :key="addr.id"
        class="addr-item"
        @click="onPick(addr)"
      >
        <view class="addr-main">
          <view class="addr-top">
            <text class="addr-name">{{ addr.name }}</text>
            <text class="addr-phone">{{ addr.phone }}</text>
            <text v-if="addr.tag" class="addr-tag">{{ addr.tag }}</text>
            <text v-if="addr.isDefault" class="default-badge">默认</text>
          </view>
          <text class="addr-detail ellipsis-2">{{ fullAddress(addr) }}</text>
        </view>
        <view class="addr-actions" @click.stop>
          <text class="action edit" @click="goEdit(addr.id)">编辑</text>
          <text v-if="!addr.isDefault" class="action" @click="setDefault(addr.id)">设为默认</text>
          <text class="action del" @click="onRemove(addr.id)">删除</text>
        </view>
      </view>
    </view>

    <view v-show="!firstLoading" v-if="addresses.length > 0" class="add-btn-wrap safe-bottom">
      <view class="add-btn" @click="goEdit()">
        <AppIcon name="add" size="32" color="#fff" />
        <text>新增收货地址</text>
      </view>
    </view>

    <Toast />
  </view>
</template>

<script setup>
import { ref, computed } from 'vue';
import { onLoad, onShow } from '@dcloudio/uni-app';
import { useAddressStore } from '@/store/address';
import Empty from '@/components/Empty.vue';
import AppIcon from '@/components/AppIcon.vue';
import NavBar from '@/components/NavBar.vue';
import PageLoading from '@/components/PageLoading.vue';
import Toast from '@/components/Toast.vue';
import { useCoupleStore } from '@/store/couple';
import { toast } from '@/utils/toast';
import { requireLogin } from '@/utils/auth';

const addressStore = useAddressStore();
const couple = useCoupleStore();
const addresses = computed(() => addressStore.addresses);
const firstLoading = ref(true);

const mode = ref('manage');

function fullAddress(addr) {
  if (addr.regionText) {
    return addr.detail ? `${addr.regionText} ${addr.detail}` : addr.regionText;
  }
  const parts = [];
  if (addr.province) parts.push(addr.province);
  if (addr.city) parts.push(addr.city);
  if (addr.district) parts.push(addr.district);
  if (addr.street) parts.push(addr.street);
  if (addr.detail) parts.push(addr.detail);
  return parts.join(' ');
}

function onPick(addr) {
  if (mode.value === 'select') {
    const pages = getCurrentPages();
    const current = pages[pages.length - 1];
    if (current && current.getOpenerEventChannel) {
      const ec = current.getOpenerEventChannel();
      if (ec) ec.emit('onPick', addr);
    }
    uni.navigateBack();
  } else {
    // 管理模式：点击查看详情（跳转编辑页）
    goEdit(addr.id);
  }
}

function goEdit(id) {
  if (!requireLogin(couple)) return;
  const url = id ? `/pages/address/edit?id=${id}` : '/pages/address/edit';
  uni.navigateTo({ url });
}

function setDefault(id) {
  if (!requireLogin(couple)) return;
  addressStore.setDefault(id);
  toast.success('已设为默认');
}

function onRemove(id) {
  if (!requireLogin(couple)) return;
  uni.showModal({
    title: '提示',
    content: '确定删除该地址吗？',
    confirmColor: '#FF5A1F',
    success: (r) => {
      if (r.confirm) {
        addressStore.remove(id);
        toast.success('已删除');
      }
    }
  });
}

onLoad((q) => {
  mode.value = (q && q.mode) || 'manage';
});
onShow(async () => {
  // 编辑后返回刷新，同时从后端同步最新地址
  try {
    await addressStore.fetchFromServer();
  } catch (e) {
    // ignore
  } finally {
    firstLoading.value = false;
  }
});
</script>

<style lang="scss" scoped>
.addr-page {
  padding: 24rpx;
  padding-bottom: 180rpx;
  min-height: 100vh;
}
.empty-wrap {
  padding-top: 120rpx;
}
.addr-list {
  display: flex;
  flex-direction: column;
  gap: 20rpx;
}
.addr-item {
  background: #fff;
  border-radius: $radius-lg;
  padding: 28rpx;
  box-shadow: $shadow-card;
}
.addr-top {
  display: flex;
  align-items: center;
  gap: 12rpx;
  flex-wrap: wrap;
}
.addr-name {
  font-size: 32rpx;
  font-weight: 700;
  color: $text-1;
}
.addr-phone {
  font-size: 26rpx;
  color: $text-2;
}
.addr-tag {
  font-size: 18rpx;
  color: $brand-primary;
  background: rgba(255, 90, 31, 0.1);
  padding: 2rpx 12rpx;
  border-radius: $radius-sm;
}
.default-badge {
  font-size: 18rpx;
  color: #fff;
  background: $brand-primary;
  padding: 2rpx 12rpx;
  border-radius: $radius-sm;
}
.addr-detail {
  margin-top: 12rpx;
  font-size: 26rpx;
  color: $text-2;
  line-height: 1.5;
}
.addr-actions {
  margin-top: 20rpx;
  padding-top: 20rpx;
  border-top: 1rpx solid $divider;
  display: flex;
  gap: 36rpx;
  .action {
    font-size: 24rpx;
    color: $text-3;
    &.edit {
      color: $brand-primary;
    }
    &.del {
      color: $color-danger;
    }
  }
}
.add-btn-wrap {
  position: fixed;
  left: 0;
  right: 0;
  bottom: 0;
  padding: 20rpx 28rpx;
  background: #fff;
  box-shadow: 0 -4rpx 24rpx rgba(60, 30, 0, 0.08);
}
.add-btn {
  height: 88rpx;
  border-radius: $radius-pill;
  background: linear-gradient(135deg, $brand-primary, $brand-primary-2);
  color: #fff;
  font-size: 30rpx;
  font-weight: 700;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8rpx;
  box-shadow: $shadow-press;
}
</style>
