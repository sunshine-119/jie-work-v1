<template>
  <view class="page login-page">
    <!-- 顶部品牌区 -->
    <view class="brand-section">
      <view class="brand-icon">🍳</view>
      <text class="brand-title">我们的小厨房</text>
      <text class="brand-sub">专属两人的干饭小天地</text>
    </view>

    <!-- 登录卡片 -->
    <view class="login-card">
      <text class="card-title">欢迎回来</text>
      <text class="card-sub">登录后继续你们的甜蜜干饭日常</text>

      <view class="field">
        <text class="field-label">用户名</text>
        <input
          :value="username"
          class="ipt"
          placeholder="请输入用户名"
          placeholder-class="ipt-ph"
          maxlength="20"
          :adjust-position="true"
          @input="(e) => (username = e.detail.value)"
        />
      </view>

      <view class="field">
        <text class="field-label">密码</text>
        <input
          :value="password"
          class="ipt"
          :type="showPassword ? 'text' : 'password'"
          placeholder="请输入密码"
          placeholder-class="ipt-ph"
          maxlength="32"
          :adjust-position="true"
          @input="(e) => (password = e.detail.value)"
        />
      </view>

      <view class="options-row">
        <view class="remember" @click="toggleRemember">
          <view class="checkbox" :class="{ checked: remember }">
            <text v-if="remember" class="check-icon">✓</text>
          </view>
          <text class="remember-label">记住密码</text>
        </view>
        <view class="toggle-pwd" @click="showPassword = !showPassword">
          <text class="toggle-text"
            >{{ showPassword ? "隐藏" : "显示" }}密码</text
          >
        </view>
      </view>

      <view
        class="btn primary"
        :class="{ disabled: !username || !password || loading }"
        @click="onLogin"
      >
        <text>{{ loading ? "登录中…" : "登录" }}</text>
      </view>

      <view class="register-link" @click="goRegister">
        <text>还没有账号？<text class="link">去注册</text></text>
      </view>
    </view>

    <!-- 底部：演示入口 -->
    <view class="demo-link" @click="openDemoSheet">
      <text>先体验一下</text>
    </view>

    <view
      v-show="demoMaskVisible"
      class="sheet-mask"
      :class="{ show: demoShowClass }"
      @click="closeDemoSheet"
      @touchmove.stop.prevent
    >
      <view class="demo-sheet" @click.stop @touchmove.stop.prevent>
        <view class="sheet-header">
          <text class="sheet-title">选择体验身份</text>
          <view class="sheet-close" @click="closeDemoSheet">
            <nut-icon name="close" size="20rpx" custom-color="#999" />
          </view>
        </view>
        <view class="sheet-item" @click="onDemo('girlfriend')">
          <text class="sheet-icon">👩‍❤️‍👨</text>
          <view class="sheet-info">
            <text class="sheet-name">女友端</text>
            <text class="sheet-desc">点菜品、挑口味、查看男友手艺</text>
          </view>
        </view>
        <view class="sheet-item" @click="onDemo('boyfriend')">
          <text class="sheet-icon">👨‍🍳</text>
          <view class="sheet-info">
            <text class="sheet-name">男友端</text>
            <text class="sheet-desc">上传菜品、管理菜单、接收点菜</text>
          </view>
        </view>
        <view class="sheet-cancel" @click="closeDemoSheet">取消</view>
      </view>
    </view>

    <Toast />
  </view>
</template>

<script setup>
import { ref, computed, onMounted, nextTick } from "vue";
import { onShow } from "@dcloudio/uni-app";
import Toast from "@/components/Toast.vue";
import { useCoupleStore } from "@/store/couple";
import { storage } from "@/utils/storage";
import { toast } from "@/utils/toast";
import { pollManager } from "@/utils/sync";

const REMEMBER_KEY = "oc_remember_auth";

const couple = useCoupleStore();

const showDemoSheet = ref(false);
const demoClosing = ref(false);
const demoEnterReady = ref(false);

const demoMaskVisible = computed(
  () => showDemoSheet.value || demoClosing.value,
);
const demoShowClass = computed(
  () => demoEnterReady.value && showDemoSheet.value && !demoClosing.value,
);

function openDemoSheet() {
  showDemoSheet.value = true;
  demoClosing.value = false;
  demoEnterReady.value = false;
  nextTick(() => {
    setTimeout(() => {
      demoEnterReady.value = true;
    }, 20);
  });
}

function closeDemoSheet() {
  demoClosing.value = true;
  demoEnterReady.value = false;
  setTimeout(() => {
    showDemoSheet.value = false;
    demoClosing.value = false;
  }, 260);
}

const username = ref("");
const password = ref("");
const loading = ref(false);
const remember = ref(true);
const showPassword = ref(false);

function loadSavedAuth() {
  const saved = storage.get(REMEMBER_KEY, null);
  if (saved && saved.username && saved.password) {
    username.value = saved.username;
    password.value = saved.password;
    remember.value = saved.remember !== false;
  } else {
    remember.value = false;
  }
}

function saveAuth() {
  storage.set(REMEMBER_KEY, {
    username: username.value.trim(),
    password: password.value,
    remember: remember.value,
  });
}

function clearAuth() {
  storage.remove(REMEMBER_KEY);
}

function toggleRemember() {
  remember.value = !remember.value;
}

onShow(() => {
  loadSavedAuth();
});

onMounted(() => {
  loadSavedAuth();
});

async function onLogin() {
  if (loading.value || !username.value.trim() || !password.value) return;
  loading.value = true;
  const res = await couple.login(username.value.trim(), password.value);
  loading.value = false;
  if (res.ok) {
    // 恢复轮询（登出时被强制停止）
    pollManager.resumeAfterLogin();
    if (remember.value) {
      saveAuth();
    } else {
      clearAuth();
    }
    toast.success("登录成功");
    // 已配对 → 首页；未配对 → 配对页
    setTimeout(() => {
      if (res.isBound) {
        uni.reLaunch({ url: "/pages/index/index" });
      } else {
        uni.reLaunch({ url: "/pages/pairing/pairing" });
      }
    }, 800);
  } else {
    toast.error(res.msg || "登录失败");
  }
}

function goRegister() {
  uni.reLaunch({ url: "/pages/register/register" });
}

function onDemo(role) {
  closeDemoSheet();
  setTimeout(() => {
    couple.useDemo(role);
    pollManager.resumeAfterLogin();
    uni.reLaunch({ url: "/pages/index/index" });
  }, 260);
}
</script>

<style lang="scss" scoped>
.login-page {
  min-height: 100vh;
  background: linear-gradient(
    180deg,
    $brand-primary 0%,
    $brand-primary-2 40%,
    $bg-page 100%
  );
  padding: 80rpx 32rpx 40rpx;
  display: flex;
  flex-direction: column;
}
.brand-section {
  text-align: center;
  margin-bottom: 48rpx;
  /* #ifndef MP-WEIXIN */
  animation: brandEnter 0.6s cubic-bezier(0.25, 0.46, 0.45, 0.94) both;
  /* #endif */
  .brand-icon {
    font-size: 80rpx;
    margin-bottom: 16rpx;
    display: inline-block;
    /* #ifndef MP-WEIXIN */
    animation: iconBounce 0.8s cubic-bezier(0.175, 0.885, 0.32, 1.275) 0.2s both;
    /* #endif */
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
@keyframes brandEnter {
  from {
    opacity: 0;
    transform: translateY(-30rpx);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}
@keyframes iconBounce {
  0% {
    transform: scale(0) rotate(-30deg);
    opacity: 0;
  }
  60% {
    transform: scale(1.2) rotate(10deg);
    opacity: 1;
  }
  100% {
    transform: scale(1) rotate(0);
    opacity: 1;
  }
}

.login-card {
  background: #fff;
  border-radius: $radius-lg;
  padding: 40rpx 32rpx;
  box-shadow: $shadow-card;
  /* #ifndef MP-WEIXIN */
  animation: cardEnter 0.5s cubic-bezier(0.25, 0.46, 0.45, 0.94) 0.15s both;
  /* #endif */
}
@keyframes cardEnter {
  from {
    opacity: 0;
    transform: translateY(40rpx);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
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

.options-row {
  margin-top: 20rpx;
  display: flex;
  align-items: center;
  justify-content: space-between;
  .remember {
    display: flex;
    align-items: center;
  }
  .checkbox {
    width: 36rpx;
    height: 36rpx;
    border: 2rpx solid $text-4;
    border-radius: 8rpx;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: all 0.2s ease;
    &.checked {
      background: $brand-primary;
      border-color: $brand-primary;
    }
  }
  .check-icon {
    font-size: 24rpx;
    color: #fff;
    font-weight: 700;
    line-height: 1;
  }
  .remember-label {
    margin-left: 12rpx;
    font-size: 26rpx;
    color: $text-2;
  }
  .toggle-pwd {
    padding: 8rpx 16rpx;
  }
  .toggle-text {
    font-size: 24rpx;
    color: $brand-primary;
    font-weight: 600;
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
.register-link {
  margin-top: 32rpx;
  text-align: center;
  font-size: 26rpx;
  color: $text-3;
  .link {
    color: $brand-primary;
    font-weight: 600;
  }
}
.demo-link {
  margin-top: auto;
  padding-top: 40rpx;
  text-align: center;
  text {
    display: inline-block;
    padding: 16rpx 48rpx;
    font-size: 28rpx;
    font-weight: 800;
    color: #e89aa8;
    background: rgba(255, 255, 255, 0.92);
    border: 1rpx solid rgba(232, 154, 168, 0.5);
    border-radius: $radius-pill;
    box-shadow: 0 4rpx 16rpx rgba(0, 0, 0, 0.12);
  }
}
.sheet-mask {
  position: fixed;
  inset: 0;
  z-index: 1200;
  background: rgba(74, 40, 60, 0.45);
  display: flex !important;
  align-items: flex-end;
  justify-content: center;
  opacity: 0;
  visibility: hidden;
  pointer-events: none;
  transition:
    opacity 0.25s ease-out,
    visibility 0s 0.25s;
  &.show {
    opacity: 1;
    visibility: visible;
    pointer-events: auto;
    transition:
      opacity 0.25s ease-out,
      visibility 0s 0s;
  }
}
.demo-sheet {
  width: 100%;
  background: #fff;
  border-top-left-radius: 40rpx;
  border-top-right-radius: 40rpx;
  padding: 32rpx 28rpx calc(28rpx + env(safe-area-inset-bottom));
  display: flex;
  flex-direction: column;
  gap: 16rpx;
  transform: translateY(100%);
  transition: transform 0.25s ease-out;
}
.sheet-mask.show .demo-sheet {
  transform: translateY(0);
}
.sheet-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 16rpx;
}
.sheet-title {
  font-size: 36rpx;
  font-weight: 600;
  color: #333;
}
.sheet-close {
  padding: 12rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  background: #FFF0F3;
}
.sheet-item {
  display: flex;
  align-items: center;
  gap: 24rpx;
  padding: 28rpx 24rpx;
  background: $bg-surface-alt;
  border-radius: $radius-lg;
  transition: background 0.15s;
  &:active {
    background: #f5e6ea;
  }
  .sheet-icon {
    font-size: 48rpx;
  }
  .sheet-info {
    flex: 1;
    display: flex;
    flex-direction: column;
    gap: 6rpx;
  }
  .sheet-name {
    font-size: 30rpx;
    font-weight: 700;
    color: $text-1;
  }
  .sheet-desc {
    font-size: 24rpx;
    color: $text-3;
  }
}
.sheet-cancel {
  margin-top: 8rpx;
  text-align: center;
  padding: 24rpx;
  font-size: 28rpx;
  font-weight: 700;
  color: #4a3f44;
  background: #ffd6dd;
  border-radius: $radius-lg;
  &:active {
    background: #fbe7ec;
  }
}
</style>
