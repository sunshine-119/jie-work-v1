<template>
  <view class="page fun-page" @click="onPageTap" :class="couple.themeClass" :style="couple.themeStyle">
    <NavBar :show-back="true">
      <text class="nav-title">{{ pageTitle }}</text>
    </NavBar>
    <PageLoading :visible="firstLoading" @timeout="firstLoading = false" />

    <scroll-view
      v-show="!firstLoading"
      scroll-y
      class="fun-scroll"
      :show-scrollbar="false"
      :refresher-enabled="isMpWeixin"
      :refresher-triggered="isMpWeixin ? refreshing : false"
      @refresherrefresh="onRefresh"
    >
      <!-- 顶部标题区 -->
      <view class="hero-card">
        <view class="hero-deco" />
        <text class="hero-emoji">{{ couple.isGirlfriend ? '🌸' : '💖' }}</text>
        <text class="hero-title">{{ heroTitle }}</text>
        <text class="hero-sub">{{ heroSub }}</text>
      </view>

      <!-- 情话卡片：点击换一句 -->
      <view class="quote-card" @click.stop="nextQuote">
        <view class="quote-icon">
          <AppIcon name="heart" size="36" color="#F5B6C1" />
        </view>
        <text class="quote-text">{{ currentQuote }}</text>
        <text class="quote-tip">点卡片换一句暖{{ couple.partnerDisplayName }}的话</text>
      </view>

      <!-- 特效按钮区 -->
      <view class="section">
        <view class="sec-head">
          <text class="sec-title">小特效</text>
          <text class="sec-sub">点一下，哄{{ couple.partnerDisplayName }}开心</text>
        </view>
        <view class="fx-grid">
          <view
            v-for="fx in effects"
            :key="fx.key"
            class="fx-btn"
            :style="{ background: fx.bg }"
            @click.stop="triggerFx(fx.key)"
          >
            <text class="fx-emoji">{{ fx.emoji }}</text>
            <text class="fx-name">{{ fx.name }}</text>
          </view>
        </view>
      </view>

      <!-- 今日心愿 -->
      <view class="wish-card" @click.stop="makeWish">
        <text class="wish-label">{{ couple.isGirlfriend ? couple.myDisplayName + '的小心愿' : '为' + couple.partnerDisplayName + '许个愿' }}</text>
        <text class="wish-text">{{ wishText }}</text>
        <view class="wish-action">
          <text>{{ couple.isGirlfriend ? '点击生成今日幸运签' : '点击为' + couple.partnerDisplayName + '祈福' }}</text>
          <AppIcon name="sparkles" size="24" color="#B8A2C7" />
        </view>
      </view>

      <!-- 想你了计数器（女友端专属） -->
      <view v-if="couple.isGirlfriend" class="miss-card">
        <text class="miss-title">想{{ couple.partnerDisplayName }}了？点一下告诉{{ couple.partnerDisplayName }}</text>
        <view class="miss-counter" @click.stop="onMissTap">
          <text class="miss-num">{{ missCount }}</text>
          <text class="miss-unit">次想念</text>
        </view>
        <text v-if="missCount >= 10" class="miss-milestone">
          {{ missMilestone }}
        </text>
      </view>

      <!-- 心情盲盒 -->
      <view class="mood-card" @click.stop="openMoodBox">
        <view class="mc-left">
          <text class="mc-emoji">{{ moodBox.emoji }}</text>
          <view class="mc-body">
            <text class="mc-title">心情盲盒</text>
            <text class="mc-desc">{{ moodBox.text }}</text>
          </view>
        </view>
        <view class="mc-hint">
          <text>戳一下</text>
          <nut-icon name="rect-right" size="24rpx" :custom-color="couple.themeStyle['--c-primary']" />
        </view>
      </view>

      <view class="tab-holder" />
    </scroll-view>

    <!-- 点击粒子 -->
    <LoveParticles
      ref="tapLoveRef"
      :x="tapPos.x"
      :y="tapPos.y"
      :mode="tapMode"
    />

    <!-- 爱心雨 -->
    <view v-if="rainType === 'heart'" class="rain-wrap">
      <view
        v-for="(r, i) in rainList"
        :key="'h' + i"
        class="rain-item heart-rain"
        :style="r.style"
      >
        {{ r.text }}
      </view>
    </view>

    <!-- 星星雨 -->
    <view v-if="rainType === 'star'" class="rain-wrap">
      <view
        v-for="(r, i) in rainList"
        :key="'s' + i"
        class="rain-item star-rain"
        :style="r.style"
      >
        {{ r.text }}
      </view>
    </view>

    <!-- 玫瑰花瓣雨 -->
    <view v-if="rainType === 'petal'" class="rain-wrap">
      <view
        v-for="(r, i) in rainList"
        :key="'p' + i"
        class="rain-item petal-rain"
        :style="r.style"
      >
        {{ r.text }}
      </view>
    </view>

    <!-- 烟花 -->
    <view v-if="firework.visible" class="firework-wrap" @click.stop>
      <view
        v-for="(p, i) in firework.particles"
        :key="'f' + i"
        class="fw-particle"
        :style="p.style"
      >
        {{ p.text }}
      </view>
    </view>

    <!-- 抱抱弹层 -->
    <view v-if="hugVisible" class="hug-mask" @click.stop="hugVisible = false">
      <view class="hug-inner">
        <text class="hug-emoji">🤗</text>
        <text class="hug-text">{{ hugText }}</text>
      </view>
    </view>

    <Toast />
  </view>
</template>

<script setup>
/**
 * 「其他功能」暖心特效页
 * -----------------------------------------------------------------------------
 * - 女友端：郑永婕的专属小宇宙，给自己换心情
 * - 男友端：给她的暖心弹药库，一键哄女友开心
 * - 支持：点击屏幕粒子、爱心雨、星星雨、烟花、抱抱弹层、情话轮播
 */
import { ref, computed } from 'vue';
import { onShow, onPullDownRefresh } from '@dcloudio/uni-app';
import NavBar from '@/components/NavBar.vue';
import AppIcon from '@/components/AppIcon.vue';
import LoveParticles from '@/components/LoveParticles.vue';
import Toast from '@/components/Toast.vue';
import PageLoading from '@/components/PageLoading.vue';
import { useCoupleStore } from '@/store/couple';
import { api } from '@/utils/api';
import { toast } from '@/utils/toast';
import { requireLogin } from '@/utils/auth';
import { usePoll } from '@/utils/sync';

// 暖心角需要情侣资料 + 想念点击轮询（男友端 miss 通道由 tickMiss 内部判断角色）
usePoll(['couple', 'miss']);

const couple = useCoupleStore();

// 平台判断：scroll-view 原生下拉刷新仅在小程序启用
const isMpWeixin = ref(false);
// #ifdef MP-WEIXIN
isMpWeixin.value = true;
// #endif

const refreshing = ref(false);
const firstLoading = ref(true);
const tapLoveRef = ref(null);
const tapPos = ref({ x: 0, y: 0 });
const tapMode = ref('heart');

const rainType = ref('');
const rainList = ref([]);
const firework = ref({ visible: false, particles: [] });
const hugVisible = ref(false);

const quoteIndex = ref(0);
const wishIndex = ref(0);

// 想你了计数器（女友端）
const missCount = ref(0);
const missMilestone = computed(() => {
  const name = couple.partnerDisplayName;
  if (missCount.value >= 100) return `💯 想你想了100次，${name}快出现！`;
  if (missCount.value >= 50) return `50次了！你一定是宇宙最想${name}的人`;
  if (missCount.value >= 30) return `30次！该给${name}发消息了`;
  if (missCount.value >= 10) return `10次啦，${name}一定也正在想你`;
  return '';
});

// 心情盲盒
const moodOptions = [
  { emoji: '😊', text: '开心：今天也是被爱的一天' },
  { emoji: '🥰', text: '被爱：你是被宇宙偏爱的小朋友' },
  { emoji: '😌', text: '安心：有人在替你兜底' },
  { emoji: '🤗', text: '想抱抱：该充电了，抱一下就好' },
  { emoji: '🥳', text: '庆祝：今天值得开心一下' },
  { emoji: '😴', text: '困了：早点睡，梦里啥都有' },
  { emoji: '🤤', text: '馋了：该点餐了，' + couple.partnerDisplayName + '在线等' },
  { emoji: '💜', text: '被惦记：有人正在偷偷想你' }
];
const moodBox = ref(moodOptions[0]);

const pageTitle = computed(() => (couple.isGirlfriend ? '我的暖心角' : '哄' + couple.partnerDisplayName + '开心角'));
const heroTitle = computed(() =>
  couple.isGirlfriend ? couple.myDisplayName + '的专属小宇宙' : '给' + couple.partnerDisplayName + '的暖心小宇宙'
);
const heroSub = computed(() =>
  couple.isGirlfriend
    ? '这里的一切，都是为你准备的'
    : '一键发射温柔，让' + couple.partnerDisplayName + '笑一笑'
);

const quotes = [
  '今天也要做被偏爱的小朋友呀～',
  '你笑起来，我的世界就亮了',
  '累了就歇歇，我永远是你的人形抱枕',
  '想吃啥就点，' + couple.partnerDisplayName + '随叫随到',
  '和你一起吃饭，是最幸福的事',
  couple.partnerDisplayName + '，你是宇宙限量版的可爱',
  '不管哪天，你都是我最想喂饱的人',
  '想你了，比昨天多一点，比明天少一点'
];
const bfQuotes = [
  couple.partnerDisplayName + '在闹，你在笑，这就是最好的爱情',
  '今天也要让' + couple.partnerDisplayName + '做最幸福的人',
  couple.partnerDisplayName + '的一句好吃，就是你最大的勋章',
  '别惹' + couple.partnerDisplayName + '生气，' + couple.partnerDisplayName + '是你最甜的软肋',
  '投喂成功，经验值 +10086',
  couple.partnerDisplayName + '想吃就给' + couple.partnerDisplayName + '做，这是你的超能力'
];
const allQuotes = computed(() => (couple.isGirlfriend ? quotes : bfQuotes));
const currentQuote = computed(() => allQuotes.value[quoteIndex.value % allQuotes.value.length]);

const wishes = [
  '今日幸运签：会被宠成小朋友',
  '今日幸运签：想吃啥都有',
  '今日幸运签：心情像奶茶一样甜',
  '今日幸运签：有人给你撑腰',
  '今日幸运签：皱纹少一点，笑容多一点'
];
const wishText = computed(() => wishes[wishIndex.value % wishes.length]);

const effects = [
  { key: 'heart', name: '爱心雨', emoji: '❤️', bg: 'linear-gradient(135deg, #FFE8EE, #F5B6C1)' },
  { key: 'star', name: '星星雨', emoji: '✨', bg: 'linear-gradient(135deg, #EDE4F3, #C8B6D9)' },
  { key: 'petal', name: '花瓣雨', emoji: '🌹', bg: 'linear-gradient(135deg, #FCE4EC, #F48FB1)' },
  { key: 'firework', name: '小烟花', emoji: '🎆', bg: 'linear-gradient(135deg, #FFF9C4, #FFF176)' },
  { key: 'hug', name: '抱抱', emoji: '🤗', bg: 'linear-gradient(135deg, #E8F5E9, #C8E6C9)' }
];

const hugText = computed(() =>
  couple.isGirlfriend
    ? '抱抱' + couple.partnerDisplayName + '，你已经很棒啦'
    : '替' + couple.partnerDisplayName + '抱抱你，辛苦啦'
);

function onPageTap(e) {
  tapMode.value = couple.isGirlfriend ? 'heart' : 'star';
  tapPos.value = { x: e.touches[0].clientX, y: e.touches[0].clientY };
  tapLoveRef.value?.burst();
}

function nextQuote() {
  quoteIndex.value += 1;
}

function makeWish() {
  wishIndex.value += 1;
  toast.success('愿望已送达 ✨');
}

function triggerFx(key) {
  if (key === 'heart') startRain('heart');
  if (key === 'star') startRain('star');
  if (key === 'petal') startRain('petal');
  if (key === 'firework') startFirework();
  if (key === 'hug') showHug();
}

function startRain(type) {
  rainType.value = type;
  let texts;
  if (type === 'heart') texts = ['❤️', '💖', '💕', '💗'];
  else if (type === 'star') texts = ['⭐', '✨', '🌟', '💫'];
  else texts = ['🌸', '🌺', '🌷', '🌹', '💐'];
  const list = [];
  for (let i = 0; i < 24; i++) {
    const left = Math.random() * 100;
    const delay = Math.random() * 2;
    const duration = 1.5 + Math.random() * 1.5;
    const scale = 0.6 + Math.random() * 0.8;
    const rotate = Math.random() * 360;
    list.push({
      text: texts[Math.floor(Math.random() * texts.length)],
      style: {
        left: `${left}%`,
        animationDuration: `${duration}s`,
        animationDelay: `${delay}s`,
        fontSize: `${scale}em`,
        '--rot': `${rotate}deg`
      }
    });
  }
  rainList.value = list;
  setTimeout(() => {
    rainType.value = '';
    rainList.value = [];
  }, 4500);
}

function onMissTap() {
  if (!requireLogin(couple)) return;
  missCount.value += 1;
  // 每10次放一次小烟花
  if (missCount.value % 10 === 0) {
    startFirework();
  }
  // 轻反馈
  uni.vibrateShort && uni.vibrateShort({ type: 'light' });
  // 同步到后端，让男友端收到弹窗提醒
  if (couple.coupleId && !couple.isDemo) {
    api.tapMiss(couple.coupleId).catch(() => {});
  }
}

function openMoodBox() {
  const idx = Math.floor(Math.random() * moodOptions.length);
  moodBox.value = moodOptions[idx];
  toast.success('愿望已送达' + moodBox.value.emoji);
}

function startFirework() {
  firework.value.visible = true;
  const colors = ['#F5B6C1', '#C8B6D9', '#E8B86C', '#E89AA8', '#B8A2C7'];
  const list = [];
  const centerX = 50;
  const centerY = 40;
  for (let i = 0; i < 30; i++) {
    const angle = (Math.PI * 2 * i) / 30;
    const dist = 30 + Math.random() * 30;
    const tx = Math.cos(angle) * dist;
    const ty = Math.sin(angle) * dist;
    const color = colors[Math.floor(Math.random() * colors.length)];
    list.push({
      text: ['❤️', '✨', '💖', '🌟', '💕'][Math.floor(Math.random() * 5)],
      style: {
        left: `${centerX}%`,
        top: `${centerY}%`,
        '--tx': `${tx}vw`,
        '--ty': `${ty}vh`,
        color,
        animationDelay: `${Math.random() * 0.2}s`
      }
    });
  }
  firework.value.particles = list;
  setTimeout(() => {
    firework.value.visible = false;
    firework.value.particles = [];
  }, 1600);
}

function showHug() {
  hugVisible.value = true;
  // setTimeout(() => {
  //   hugVisible.value = false;
  // }, 2000);
}

async function onRefresh() {
  refreshing.value = true;
  // 暖心角主要是本地状态，刷新情侣资料即可
  try {
    await couple.fetchFromServer(true);
  } catch (e) {
    // ignore
  } finally {
    refreshing.value = false;
  }
}

onShow(async () => {
  try {
    await couple.fetchFromServer(true);
  } catch (e) {
    // ignore
  } finally {
    firstLoading.value = false;
  }
});

// #ifndef MP-WEIXIN
onPullDownRefresh(() => {
  onRefresh().finally(() => uni.stopPullDownRefresh());
});
// #endif
</script>

<style lang="scss" scoped>
.fun-page {
  position: relative;
  height: 100vh;
  background: $bg-page;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}
.nav-title {
  font-size: 36rpx;
  font-weight: 800;
  color: #fff;
}
.fun-scroll {
  flex: 1;
  min-height: 0;
  height: auto;
}
.hero-card {
  position: relative;
  margin: 20rpx 24rpx 0;
  padding: 48rpx 32rpx;
  border-radius: $radius-lg;
  background: linear-gradient(135deg, $brand-primary 0%, $brand-primary-2 100%);
  color: #fff;
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  box-shadow: $shadow-card;
  overflow: hidden;
}
.hero-deco {
  position: absolute;
  top: -60rpx;
  right: -60rpx;
  width: 240rpx;
  height: 240rpx;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.15);
}
.hero-emoji {
  position: relative;
  font-size: 72rpx;
  margin-bottom: 16rpx;
}
.hero-title {
  position: relative;
  font-size: 40rpx;
  font-weight: 800;
  letter-spacing: 2rpx;
}
.hero-sub {
  position: relative;
  margin-top: 12rpx;
  font-size: 24rpx;
  color: rgba(255, 255, 255, 0.9);
}

.quote-card {
  margin: 24rpx;
  padding: 40rpx 32rpx;
  background: #fff;
  border-radius: $radius-lg;
  box-shadow: $shadow-card;
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
}
.quote-icon {
  width: 72rpx;
  height: 72rpx;
  margin-bottom: 16rpx;
  border-radius: 50%;
  background: rgba(245, 182, 193, 0.15);
  display: flex;
  align-items: center;
  justify-content: center;
}
.quote-text {
  font-size: 32rpx;
  font-weight: 700;
  color: $text-1;
  line-height: 1.6;
  margin-bottom: 8rpx;
}
.quote-tip {
  font-size: 22rpx;
  color: $text-4;
}

.section {
  margin: 0 24rpx 24rpx;
}
.sec-head {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  margin-bottom: 16rpx;
  .sec-title {
    font-size: 32rpx;
    font-weight: 800;
    color: $text-1;
  }
  .sec-sub {
    font-size: 22rpx;
    color: $text-3;
  }
}
.fx-grid {
  display: flex;
  flex-wrap: wrap;
  row-gap: 20rpx;
  justify-content: space-between;
}
.fx-btn {
  flex: 0 0 calc(50% - 10rpx);
  max-width: calc(50% - 10rpx);
  padding: 36rpx 24rpx;
  border-radius: $radius-lg;
  display: flex;
  flex-direction: column;
  align-items: center;
  box-shadow: $shadow-card;
  box-sizing: border-box;
  transition: transform 0.15s ease;
  &:active {
    transform: scale(0.96);
  }
}
.fx-emoji {
  font-size: 56rpx;
  margin-bottom: 12rpx;
}
.fx-name {
  font-size: 28rpx;
  font-weight: 700;
  color: $text-1;
}

.wish-card {
  margin: 0 24rpx 24rpx;
  padding: 32rpx;
  border-radius: $radius-lg;
  background: linear-gradient(135deg, #fff 0%, $bg-taro 100%);
  box-shadow: $shadow-card;
  display: flex;
  flex-direction: column;
}
.wish-label {
  font-size: 24rpx;
  color: $brand-taro;
  font-weight: 700;
  margin-bottom: 12rpx;
}
.wish-text {
  font-size: 34rpx;
  font-weight: 800;
  color: $text-1;
}
.wish-action {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-top: 12rpx;
  font-size: 24rpx;
  color: $text-3;
  white-space: nowrap;
}

.tab-holder {
  height: 40rpx;
}

/* 想你了计数器 */
.miss-card {
  margin: 0 24rpx 24rpx;
  padding: 36rpx 32rpx;
  border-radius: $radius-lg;
  background: linear-gradient(135deg, #FFF0F3 0%, #FFE8EE 100%);
  box-shadow: $shadow-card;
  text-align: center;
}
.miss-title {
  font-size: 26rpx;
  color: $text-2;
  margin-bottom: 20rpx;
}
.miss-counter {
  display: flex;
  align-items: baseline;
  justify-content: center;
  &:active {
    transform: scale(0.96);
  }
}
.miss-num {
  font-size: 80rpx;
  font-weight: 900;
  color: $brand-primary-dark;
  line-height: 1;
  margin-right: 12rpx;
}
.miss-unit {
  font-size: 28rpx;
  color: $text-3;
}
.miss-milestone {
  display: block;
  margin-top: 16rpx;
  font-size: 26rpx;
  font-weight: 700;
  color: $brand-primary-dark;
}

/* 心情盲盒 */
.mood-card {
  margin: 0 24rpx 24rpx;
  padding: 32rpx 28rpx;
  border-radius: $radius-lg;
  background: linear-gradient(135deg, $bg-taro 0%, #fff 100%);
  box-shadow: $shadow-card;
  display: flex;
  align-items: center;
  justify-content: space-between;
}
.mc-left {
  display: flex;
  align-items: center;
  flex: 1;
  min-width: 0;
}
.mc-emoji {
  font-size: 56rpx;
  margin-right: 20rpx;
}
.mc-body {
  flex: 1;
  min-width: 0;
}
.mc-title {
  display: block;
  font-size: 30rpx;
  font-weight: 800;
  color: $text-1;
  margin-bottom: 4rpx;
}
.mc-desc {
  font-size: 24rpx;
  color: $text-2;
}
.mc-hint {
  display: flex;
  align-items: center;
  font-size: 24rpx;
  color: $brand-taro;
  flex-shrink: 0;
  margin-left: 16rpx;
}

/* 雨滴特效 */
.rain-wrap {
  position: fixed;
  inset: 0;
  z-index: 900;
  pointer-events: none;
  overflow: hidden;
}
.rain-item {
  position: absolute;
  top: -60rpx;
  animation: rainFall linear forwards;
}
@keyframes rainFall {
  0% {
    transform: translateY(0) rotate(0deg);
    opacity: 1;
  }
  100% {
    transform: translateY(120vh) rotate(20deg);
    opacity: 0;
  }
}

/* 烟花特效 */
.firework-wrap {
  position: fixed;
  inset: 0;
  z-index: 901;
  pointer-events: none;
}
.fw-particle {
  position: absolute;
  font-size: 32rpx;
  animation: fwBurst 1.2s ease-out forwards;
}
@keyframes fwBurst {
  0% {
    transform: translate(-50%, -50%) scale(0.2);
    opacity: 1;
  }
  100% {
    transform: translate(calc(-50% + var(--tx)), calc(-50% + var(--ty))) scale(0.6);
    opacity: 0;
  }
}

/* 抱抱弹层 */
.hug-mask {
  position: fixed;
  inset: 0;
  z-index: 902;
  background: linear-gradient(135deg, $brand-primary, $brand-primary-2);
  display: flex;
  align-items: center;
  justify-content: center;
}
.hug-inner {
  padding: 60rpx 48rpx;
  border-radius: $radius-xl;
  display: flex;
  flex-direction: column;
  align-items: center;
  box-shadow: 0 20rpx 60rpx rgba(0, 0, 0, 0.2);
  animation: hugPop 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275);
}
.hug-emoji {
  font-size: 120rpx;
  margin-bottom: 20rpx;
}
.hug-text {
  font-size: 32rpx;
  font-weight: 700;
  color: $text-1;
}
@keyframes hugPop {
  from { transform: scale(0.5); opacity: 0; }
  to { transform: scale(1); opacity: 1; }
}
</style>
