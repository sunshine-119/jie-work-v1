<template>
  <view class="page register-page">
    <!-- 顶部品牌区 -->
    <view class="brand-section">
      <view class="brand-icon">🍳</view>
      <text class="brand-title">我们的小厨房</text>
      <text class="brand-sub">专属两人的干饭小天地</text>
    </view>

    <!-- 步骤 1：选择角色 -->
    <view v-if="step === 'role'" class="register-card">
      <text class="card-title">你是哪一端？</text>
      <text class="card-sub">选好角色后，注册属于你的账号</text>

      <view class="role-list">
        <view
          class="role-card"
          :class="{ active: tempRole === 'girlfriend' }"
          @click="tempRole = 'girlfriend'"
        >
          <text class="role-emoji">🐱</text>
          <view class="role-body">
            <text class="role-name">我是女友</text>
            <text class="role-desc">负责点菜、撒娇、给好评</text>
          </view>
          <view v-if="tempRole === 'girlfriend'" class="role-check">
            <AppIcon name="check" size="24" color="#fff" />
          </view>
        </view>

        <view
          class="role-card"
          :class="{ active: tempRole === 'boyfriend' }"
          @click="tempRole = 'boyfriend'"
        >
          <text class="role-emoji">👨‍🍳</text>
          <view class="role-body">
            <text class="role-name">我是男友</text>
            <text class="role-desc">负责做菜、接单、宠着另一半</text>
          </view>
          <view v-if="tempRole === 'boyfriend'" class="role-check">
            <AppIcon name="check" size="24" color="#fff" />
          </view>
        </view>
      </view>

      <view class="btn primary" :class="{ disabled: !tempRole }" @click="onRoleNext">
        <text>下一步</text>
      </view>
    </view>

    <!-- 步骤 2：填写注册信息 -->
    <view v-else class="register-card">
      <view class="card-header">
        <view class="back" @click="step = 'role'">
          <AppIcon name="back" size="24" color="#E08B8B" />
          <text>返回</text>
        </view>
        <text class="card-title">{{ isGirlfriendRole ? '女友端' : '男友端' }} · 注册账号</text>
        <text class="card-sub">填好信息，开启两人世界</text>
      </view>

      <view class="field">
        <text class="field-label">用户名</text>
        <input
          :value="username"
          class="ipt"
          placeholder="2-20个字符"
          placeholder-class="ipt-ph"
          maxlength="20"
          :adjust-position="true"
          @input="e => username = e.detail.value"
        />
      </view>

      <view class="field">
        <text class="field-label">密码</text>
        <input
          :value="password"
          class="ipt"
          type="password"
          placeholder="至少6位"
          placeholder-class="ipt-ph"
          maxlength="32"
          :adjust-position="true"
          @input="e => password = e.detail.value"
        />
      </view>

      <view class="field">
        <text class="field-label">确认密码</text>
        <input
          :value="confirmPassword"
          class="ipt"
          type="password"
          placeholder="再输入一次"
          placeholder-class="ipt-ph"
          maxlength="32"
          :adjust-position="true"
          @input="e => confirmPassword = e.detail.value"
        />
      </view>

      <view class="field">
        <text class="field-label">昵称</text>
        <input
          :value="nickname"
          class="ipt"
          :placeholder="defaultNickname"
          placeholder-class="ipt-ph"
          maxlength="12"
          :adjust-position="true"
          @input="e => nickname = e.detail.value"
        />
      </view>

      <view class="btn primary" :class="{ disabled: loading }" @click="onRegister">
        <text>{{ loading ? '注册中…' : '完成注册' }}</text>
      </view>
    </view>

    <!-- 底部链接 -->
    <view class="footer-link" @click="onGoLogin">
      <text class="fl-text">已有账号？</text>
      <text class="fl-action">去登录 ›</text>
    </view>

    <Toast />
  </view>
</template>

<script setup>
import { ref, computed } from 'vue';
import AppIcon from '@/components/AppIcon.vue';
import Toast from '@/components/Toast.vue';
import { useCoupleStore } from '@/store/couple';
import { toast } from '@/utils/toast';

const couple = useCoupleStore();
const step = ref('role'); // 'role' | 'form'
const tempRole = ref('');
const username = ref('');
const password = ref('');
const confirmPassword = ref('');
const nickname = ref('');
const loading = ref(false);

const isGirlfriendRole = computed(() => tempRole.value === 'girlfriend');
const defaultNickname = computed(() => (isGirlfriendRole.value ? '小馋猫' : '大厨哥'));

function onRoleNext() {
  if (!tempRole.value) return;
  nickname.value = defaultNickname.value;
  step.value = 'form';
}

async function onRegister() {
  if (loading.value) return;
  // 验证
  if (!username.value.trim() || username.value.trim().length < 2) {
    return toast.info('用户名至少2个字符');
  }
  if (password.value.length < 6) {
    return toast.info('密码至少6位');
  }
  if (password.value !== confirmPassword.value) {
    return toast.error('两次密码不一致');
  }
  loading.value = true;
  const res = await couple.register(
    username.value.trim(),
    password.value,
    tempRole.value,
    nickname.value.trim() || defaultNickname.value
  );
  loading.value = false;
  if (res.ok) {
    toast.success('注册成功');
    setTimeout(() => uni.reLaunch({ url: '/pages/login/login' }), 800);
  } else {
    toast.error(res.msg || '注册失败');
  }
}

function onGoLogin() {
  uni.reLaunch({ url: '/pages/login/login' });
}
</script>

<style lang="scss" scoped>
.register-page {
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
.register-card {
  background: #fff;
  border-radius: $radius-lg;
  padding: 40rpx 32rpx;
  box-shadow: $shadow-card;
}
.card-title {
  display: block;
  font-size: 36rpx;
  font-weight: 800;
  color: $text-1;
  text-align: center;
}
.card-sub {
  display: block;
  margin-top: 8rpx;
  font-size: 24rpx;
  color: $text-3;
  text-align: center;
}
.card-header {
  position: relative;
  margin-bottom: 16rpx;
  .back {
    position: absolute;
    left: 0;
    top: 4rpx;
    display: flex;
    align-items: center;
    gap: 4rpx;
    font-size: 26rpx;
    color: $brand-primary;
  }
}

.role-list {
  margin-top: 40rpx;
  display: flex;
  flex-direction: column;
  gap: 24rpx;
}
.role-card {
  display: flex;
  align-items: center;
  gap: 24rpx;
  padding: 32rpx;
  border-radius: $radius-lg;
  background: $bg-surface-alt;
  border: 2rpx solid transparent;
  transition: all 0.2s ease;
  &.active {
    background: rgba(255, 90, 31, 0.08);
    border-color: $brand-primary;
  }
  .role-emoji {
    font-size: 64rpx;
  }
  .role-body {
    flex: 1;
    display: flex;
    flex-direction: column;
    gap: 4rpx;
  }
  .role-name {
    font-size: 32rpx;
    font-weight: 700;
    color: $text-1;
  }
  .role-desc {
    font-size: 24rpx;
    color: $text-3;
  }
  .role-check {
    width: 44rpx;
    height: 44rpx;
    border-radius: 50%;
    background: $brand-primary;
    display: flex;
    align-items: center;
    justify-content: center;
  }
}

.field {
  margin-top: 28rpx;
  display: flex;
  flex-direction: column;
  .field-label {
    font-size: 24rpx;
    color: $text-3;
    font-weight: 600;
    margin-bottom: 12rpx;
  }
  .ipt {
    width: 100%;
    height: 88rpx;
    padding: 0 24rpx;
    background: $bg-surface-alt;
    border-radius: $radius-md;
    font-size: 28rpx;
    color: $text-1;
    box-sizing: border-box;
  }
  .ipt-ph {
    color: $text-4;
  }
}

.btn {
  margin-top: 40rpx;
  height: 96rpx;
  border-radius: $radius-pill;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 32rpx;
  font-weight: 800;
  &.primary {
    background: linear-gradient(135deg, $brand-primary, $brand-primary-2);
    color: #fff;
    box-shadow: $shadow-press;
  }
  &.disabled {
    opacity: 0.5;
  }
}

.footer-link {
  margin-top: auto;
  padding-top: 40rpx;
  text-align: center;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8rpx;
  .fl-text {
    font-size: 28rpx;
    color: #E08B8B;
  }
  .fl-action {
    display: inline-block;
    padding: 12rpx 36rpx;
    font-size: 30rpx;
    font-weight: 800;
    color: #E08B8B;
    background: rgba(255, 255, 255, 0.95);
    border-radius: $radius-pill;
    box-shadow: 0 4rpx 16rpx rgba(0, 0, 0, 0.12);
  }
}
</style>
