<template>
  <view class="page pairing-page">
    <!-- 顶部品牌区 -->
    <view class="brand-section">
      <view class="brand-icon">🍳</view>
      <text class="brand-title">配对</text>
      <text class="brand-sub">把邀请码发给TA，或输入TA的邀请码</text>
    </view>

    <!-- 配对卡片 -->
    <view class="pairing-card">
      <!-- Tab 切换 -->
      <view class="mode-tabs">
        <view
          class="mode-tab"
          :class="{ active: mode === 'generate' }"
          @click="mode = 'generate'"
        >
          <text>生成邀请码</text>
        </view>
        <view
          class="mode-tab"
          :class="{ active: mode === 'join' }"
          @click="mode = 'join'"
        >
          <text>输入邀请码</text>
        </view>
      </view>

      <!-- 生成邀请码 -->
      <view v-if="mode === 'generate'" class="mode-panel">
        <text class="panel-tip">点击生成后，把6位邀请码发给TA</text>
        <view class="code-display" @click="onGenerate">
          <text v-if="!inviteCode" class="code-placeholder">点击生成邀请码</text>
          <view v-else class="code-result">
            <text class="code-text">{{ inviteCode }}</text>
            <view class="copy-btn" @click.stop="onCopyCode">
              <AppIcon name="copy" size="32" color="#E89AA8" />
            </view>
          </view>
        </view>
        <view v-if="inviteCode" class="code-hint">等待TA输入邀请码完成配对…</view>
        <view class="btn primary" :class="{ disabled: !inviteCode }" @click="onGoHome">
          <text>进入厨房</text>
        </view>
      </view>

      <!-- 输入邀请码 -->
      <view v-else class="mode-panel">
        <text class="panel-tip">让TA把6位邀请码发给你</text>
        <view class="code-input-wrap">
          <input
            :value="inputCode"
            class="code-input"
            placeholder="输入对方邀请码"
            placeholder-class="code-ph"
            maxlength="10"
            :adjust-position="true"
            @input="e => inputCode = e.detail.value"
          />
        </view>
        <view
          class="btn primary"
          :class="{ disabled: !inputCode.trim() }"
          @click="onJoin"
        >
          <text>立即配对</text>
        </view>
      </view>
    </view>

    <!-- 底部：稍后再配对 -->
    <view class="later-link" @click="onLater">
      <text>稍后再配对</text>
    </view>

    <Toast />
  </view>
</template>

<script setup>
import { ref } from 'vue';
import { useCoupleStore } from '@/store/couple';
import AppIcon from '@/components/AppIcon.vue';
import Toast from '@/components/Toast.vue';
import { toast } from '@/utils/toast';
import { copyText } from '@/utils/clipboard';

const couple = useCoupleStore();
const mode = ref('generate'); // 'generate' | 'join'
const inviteCode = ref('');
const inputCode = ref('');
const loading = ref(false);

async function onGenerate() {
  if (loading.value) return;
  loading.value = true;
  const res = await couple.generateInvite();
  loading.value = false;
  if (res.ok) {
    inviteCode.value = res.inviteCode;
  } else {
    toast.error(res.msg || '生成失败');
  }
}

function onCopyCode() {
  if (!inviteCode.value) return;
  copyText(inviteCode.value, '邀请码已复制');
}

async function onJoin() {
  if (loading.value || !inputCode.value.trim()) return;
  loading.value = true;
  const res = await couple.bindWithCode(inputCode.value.trim());
  loading.value = false;
  if (res.ok) {
    toast.success('配对成功');
    setTimeout(() => uni.reLaunch({ url: '/pages/index/index' }), 800);
  } else {
    toast.error(res.msg || '配对失败');
  }
}

function onGoHome() {
  if (!inviteCode.value) return;
  uni.reLaunch({ url: '/pages/index/index' });
}

function onLater() {
  uni.reLaunch({ url: '/pages/index/index' });
}
</script>

<style lang="scss" scoped>
.pairing-page {
  min-height: 100vh;
  background: linear-gradient(180deg, $brand-primary 0%, $brand-primary-2 40%, $bg-page 100%);
  padding: 80rpx 32rpx 40rpx;
  display: flex;
  flex-direction: column;
}
.brand-section {
  text-align: center;
  margin-bottom: 48rpx;
  .brand-icon {
    font-size: 80rpx;
    margin-bottom: 16rpx;
  }
  .brand-title {
    display: block;
    font-size: 44rpx;
    font-weight: 800;
    color: #fff;
    letter-spacing: 2rpx;
  }
  .brand-sub {
    display: block;
    margin-top: 12rpx;
    font-size: 26rpx;
    color: rgba(255, 255, 255, 0.85);
  }
}

.pairing-card {
  background: #fff;
  border-radius: $radius-lg;
  padding: 40rpx 32rpx;
  box-shadow: $shadow-card;
}

.mode-tabs {
  display: flex;
  background: $bg-surface-alt;
  border-radius: $radius-pill;
  padding: 4rpx;
  .mode-tab {
    flex: 1;
    height: 64rpx;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: $radius-pill;
    font-size: 26rpx;
    color: $text-3;
    &.active {
      background: #fff;
      color: $brand-primary;
      font-weight: 700;
      box-shadow: 0 2rpx 8rpx rgba(0, 0, 0, 0.06);
    }
  }
}

.mode-panel {
  margin-top: 32rpx;
  .panel-tip {
    display: block;
    font-size: 24rpx;
    color: $text-3;
    text-align: center;
    margin-bottom: 20rpx;
  }
}
.code-display {
  height: 120rpx;
  border-radius: $radius-lg;
  background: $bg-surface-alt;
  display: flex;
  align-items: center;
  justify-content: center;
  .code-placeholder {
    font-size: 28rpx;
    color: $text-3;
  }
  .code-result {
    display: flex;
    align-items: center;
    gap: 20rpx;
  }
  .code-text {
    font-size: 64rpx;
    font-weight: 800;
    color: $brand-primary;
    letter-spacing: 16rpx;
  }
  .copy-btn {
    width: 64rpx;
    height: 64rpx;
    border-radius: 50%;
    background: rgba(245, 182, 193, 0.15);
    display: flex;
    align-items: center;
    justify-content: center;
    transition: transform 0.15s;
    &:active {
      transform: scale(0.88);
      background: rgba(245, 182, 193, 0.3);
    }
  }
}
.code-hint {
  margin-top: 20rpx;
  font-size: 24rpx;
  color: $text-3;
  text-align: center;
}
.code-input-wrap {
  height: 120rpx;
  border-radius: $radius-lg;
  background: $bg-surface-alt;
  display: flex;
  align-items: center;
  justify-content: center;
  .code-input {
    width: 100%;
    text-align: center;
    font-size: 48rpx;
    font-weight: 800;
    color: $brand-primary;
    letter-spacing: 12rpx;
  }
}

.btn {
  margin-top: 40rpx;
  height: 92rpx;
  border-radius: $radius-pill;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 32rpx;
  font-weight: 700;
  &.primary {
    background: linear-gradient(135deg, $brand-primary, $brand-primary-2);
    color: #fff;
    box-shadow: $shadow-press;
  }
  &.disabled {
    opacity: 0.5;
  }
}

.later-link {
  margin-top: auto;
  padding-top: 40rpx;
  text-align: center;
  text {
    font-size: 24rpx;
    color: rgba(255, 255, 255, 0.9);
    text-decoration: underline;
  }
}
</style>
