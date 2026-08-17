<template>
  <view class="page surprise-page" :class="couple.themeClass" :style="couple.themeStyle">
    <NavBar :title="'给' + couple.partnerDisplayName + '惊喜'">
      <template #right>
        <view class="nav-history-btn" @click="scrollToHistory">
          <AppIcon name="order" size="26" color="#fff" />
        </view>
      </template>
    </NavBar>
    <PageLoading :visible="firstLoading" @timeout="firstLoading = false" />

    <view v-show="!firstLoading" class="surprise-content">
      <!-- 配置区 -->
      <view class="config-card">
        <view class="sec-head">
          <view class="sec-title">
            <AppIcon name="gift" size="34" :color="couple.themeStyle['--c-primary-dark'] || '#E89AA8'" />
            <text>制作惊喜</text>
          </view>
          <text class="sec-sub">填好内容，发给{{ couple.partnerDisplayName }}</text>
        </view>

        <!-- 选择模板 -->
        <view class="block">
          <text class="block-label">选择模板</text>
          <scroll-view scroll-x class="tpl-scroll" :show-scrollbar="false">
            <view class="tpl-list">
              <view
                v-for="(t, i) in templates"
                :key="i"
                class="tpl-chip"
                :class="{ active: activeTplIdx === i }"
                @click="applyTemplate(i)"
              >
                <text class="tpl-emoji">{{ t.emoji }}</text>
                <text class="tpl-name">{{ t.title }}</text>
              </view>
            </view>
          </scroll-view>
        </view>

        <!-- 标题输入 -->
        <view class="block">
          <text class="block-label">标题</text>
          <input
            :value="form.title"
            class="ipt"
            placeholder="给惊喜起个名字"
            placeholder-class="ipt-ph"
            maxlength="20"
            :adjust-position="true"
            @input="e => form.title = e.detail.value"
          />
        </view>

        <!-- 正文输入 -->
        <view class="block">
          <text class="block-label">正文</text>
          <textarea
            :value="form.content"
            class="ipt textarea"
            :placeholder="'想对' + couple.partnerDisplayName + '说点什么…'"
            placeholder-class="ipt-ph"
            maxlength="80"
            :adjust-position="true"
            @input="e => form.content = e.detail.value"
          />
          <text class="ipt-count">{{ form.content.length }}/80</text>
        </view>

        <!-- emoji 选择 -->
        <view class="block">
          <text class="block-label">表情</text>
          <view class="emoji-grid">
            <view
              v-for="e in emojis"
              :key="e"
              class="emoji-cell"
              :class="{ active: form.emoji === e }"
              @click="form.emoji = e"
            >
              {{ e }}
            </view>
          </view>
        </view>

        <!-- 特效选择 -->
        <view class="block">
          <text class="block-label">特效</text>
          <view class="opt-row">
            <view
              v-for="e in effects"
              :key="e.value"
              class="opt-chip"
              :class="{ active: form.effect === e.value }"
              @click="form.effect = e.value"
            >
              {{ e.label }}
            </view>
          </view>
        </view>

        <!-- 背景色选择 -->
        <view class="block">
          <text class="block-label">背景</text>
          <view class="opt-row">
            <view
              v-for="c in bgColors"
              :key="c.value"
              class="bg-chip"
              :class="{ active: form.bgColor === c.value }"
              :style="bgChipStyle(c.value)"
              @click="form.bgColor = c.value"
            >
              <text v-if="form.bgColor === c.value" class="bg-check">✓</text>
              <text v-else class="bg-label">{{ c.label }}</text>
            </view>
          </view>
        </view>

        <!-- 发送按钮 -->
        <view class="send-btn" :class="{ disabled: sending }" @click="sendSurprise">
          <AppIcon name="send" size="28" color="#fff" />
          <text>{{ sending ? '发送中…' : '发给' + couple.partnerDisplayName }}</text>
        </view>
      </view>

      <!-- 预览区 -->
      <view class="section">
        <view class="sec-head">
          <view class="sec-title">
            <AppIcon name="sparkles" size="34" :color="couple.themeStyle['--c-taro'] || '#B8A2C7'" />
            <text>效果预览</text>
          </view>
          <text class="sec-sub">这就是{{ couple.partnerDisplayName }}看到的样子</text>
        </view>
        <view class="preview-wrap">
          <view class="preview-box" :style="previewStyle">
            <view class="preview-effect">
              <text
                v-for="(p, i) in previewParticles"
                :key="i"
                class="preview-particle"
                :style="p.style"
              >{{ p.text }}</text>
            </view>
            <view class="preview-content">
              <text class="preview-emoji">{{ form.emoji }}</text>
              <text class="preview-title">{{ form.title || '标题预览' }}</text>
              <text class="preview-text">{{ form.content || '正文内容会显示在这里' }}</text>
              <view class="preview-close">
                <text>收下啦 ❤️</text>
              </view>
            </view>
          </view>
        </view>
      </view>

      <!-- 历史记录 -->
      <view id="history-anchor" class="section">
        <view class="sec-head">
          <view class="sec-title">
            <AppIcon name="order" size="34" color="#E8B86C" />
            <text>历史记录</text>
          </view>
          <text class="sec-sub">{{ history.length }} 条</text>
        </view>
        <view v-if="history.length === 0" class="card empty-card">
          <AppIcon name="envelope" size="64" color="#B8A2C7" />
          <text class="ec-text">还没有发过惊喜</text>
          <text class="ec-sub">发一条试试吧</text>
        </view>
        <view
          v-for="h in history"
          :key="h.id"
          class="history-card"
          @click="reapplyHistory(h)"
        >
          <view class="hc-head">
            <text class="hc-emoji">{{ h.emoji }}</text>
            <text class="hc-title ellipsis">{{ h.title }}</text>
            <text v-if="h.is_read === 1 || h.is_read === true" class="hc-tag read">已读</text>
            <text v-else class="hc-tag unread">未读</text>
          </view>
          <text class="hc-content">{{ h.content }}</text>
          <view class="hc-meta">
            <text class="hc-effect">{{ effectLabel(h.effect) }}</text>
            <text class="hc-time">{{ formatTime(h.created_at) }}</text>
          </view>
          <view class="hc-reapply">点击再次发送</view>
        </view>
      </view>

      <view class="foot-tip">— 用心的小惊喜，最打动人 —</view>
      <view class="tab-holder" />
    </view>

    <Toast />
  </view>
</template>

<script setup>
import { ref, reactive, computed, watch } from 'vue';
import { onShow } from '@dcloudio/uni-app';
import NavBar from '@/components/NavBar.vue';
import AppIcon from '@/components/AppIcon.vue';
import Toast from '@/components/Toast.vue';
import PageLoading from '@/components/PageLoading.vue';
import { useCoupleStore } from '@/store/couple';
import { api } from '@/utils/api';
import { toast } from '@/utils/toast';
import { usePoll } from '@/utils/sync';

// 惊喜页需要情侣资料同步（伴侣昵称等）
usePoll(['couple']);

const couple = useCoupleStore();
const firstLoading = ref(true);

const templates = [
  { title: '想你了', content: '突然好想你，不知道你在干嘛，希望你今天开心', emoji: '❤️', effect: 'heart' },
  { title: '给你变个魔术', content: '变变变～变出一颗爱心给你', emoji: '✨', effect: 'star' },
  { title: '送你一朵玫瑰', content: '今天也是爱你的一天，收下这朵花吧', emoji: '🌹', effect: 'petal' },
  { title: '抱抱你', content: '累了就歇歇，我的怀抱随时为你敞开', emoji: '🤗', effect: 'firework' },
  { title: '晚安', content: '早点睡觉，梦里见，晚安', emoji: '💕', effect: 'none' },
  { title: '加油呀', content: '你是最棒的，今天也要元气满满', emoji: '💪', effect: 'heart' }
];

const emojis = ['💝', '❤️', '🌹', '🥰', '💕', '🎁', '✨', '🤗', '💪', '🌙'];

const effects = [
  { value: 'none', label: '无特效' },
  { value: 'heart', label: '爱心雨' },
  { value: 'star', label: '星星雨' },
  { value: 'petal', label: '花瓣雨' },
  { value: 'firework', label: '小烟花' }
];

const bgColors = [
  { value: '', label: '默认' },
  { value: 'linear-gradient(135deg, #FFE8EE, #F5B6C1)', label: '奶粉粉' },
  { value: 'linear-gradient(135deg, #EDE4F3, #C8B6D9)', label: '淡芋紫' },
  { value: 'linear-gradient(135deg, #FFF9C4, #FFF176)', label: '暖阳黄' },
  { value: 'linear-gradient(135deg, #E8F5E9, #C8E6C9)', label: '薄荷绿' }
];

const form = reactive({
  title: '',
  content: '',
  emoji: '💝',
  effect: 'heart',
  bgColor: ''
});
const activeTplIdx = ref(-1);
const sending = ref(false);
const history = ref([]);

// 预览粒子
const previewParticles = ref([]);

const previewStyle = computed(() => {
  if (!form.bgColor) return {};
  return { background: form.bgColor };
});

function bgChipStyle(value) {
  if (!value) return { background: 'linear-gradient(135deg, #FFF8F2, #FFE8EE)' };
  return { background: value };
}

function applyTemplate(idx) {
  const t = templates[idx];
  activeTplIdx.value = idx;
  form.title = t.title;
  form.content = t.content;
  form.emoji = t.emoji;
  form.effect = t.effect;
}

watch(
  () => form.effect,
  (val) => {
    genPreviewParticles(val);
  }
);

function genPreviewParticles(effect) {
  if (effect === 'none' || !effect) {
    previewParticles.value = [];
    return;
  }
  const emojiMap = { heart: '❤️', star: '✨', petal: '🌹', firework: '🎆' };
  const text = emojiMap[effect] || '❤️';
  const arr = [];
  for (let i = 0; i < 12; i++) {
    arr.push({
      text,
      style: {
        left: Math.random() * 100 + '%',
        animationDuration: 1.5 + Math.random() * 1.5 + 's',
        animationDelay: Math.random() * 1 + 's',
        fontSize: 0.7 + Math.random() * 0.6 + 'em'
      }
    });
  }
  previewParticles.value = arr;
}

function effectLabel(val) {
  const e = effects.find((x) => x.value === val);
  return e ? e.label : '无特效';
}

function formatTime(t) {
  if (!t) return '';
  let d;
  if (typeof t === 'number') {
    d = new Date(t < 1e12 ? t * 1000 : t);
  } else {
    d = new Date(t);
  }
  if (isNaN(d.getTime())) return '';
  const pad = (n) => (n < 10 ? '0' + n : '' + n);
  return `${d.getMonth() + 1}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

async function sendSurprise() {
  if (!form.title.trim() || !form.content.trim()) {
    toast.error('请填写标题和内容');
    return;
  }
  if (!couple.coupleId) {
    toast.error('请先完成配对');
    return;
  }
  sending.value = true;
  try {
    await api.createSurprise({
      couple_id: couple.coupleId,
      title: form.title.trim(),
      content: form.content.trim(),
      emoji: form.emoji,
      effect: form.effect,
      bg_color: form.bgColor
    });
    toast.success('已发给' + couple.partnerDisplayName);
    form.title = '';
    form.content = '';
    form.emoji = '💝';
    form.effect = 'heart';
    form.bgColor = '';
    activeTplIdx.value = -1;
    genPreviewParticles('heart');
    loadHistory();
  } catch (e) {
    console.error('[surprise] 发送失败:', e);
    const msg = (e && e.message) || '发送失败';
    toast.error(msg);
  }
  sending.value = false;
}

async function loadHistory() {
  if (!couple.coupleId) return;
  try {
    const data = await api.listSurprises(couple.coupleId);
    const list = Array.isArray(data) ? data : (data && data.list) || [];
    // 统一 is_read 字段为布尔/数字，兼容后端返回的 read_at 字段
    history.value = list.map((h) => ({
      ...h,
      is_read: h.is_read === 1 || h.is_read === true || !!h.read_at
    }));
  } catch (e) {
    history.value = [];
  }
}

function reapplyHistory(h) {
  form.title = h.title || '';
  form.content = h.content || '';
  form.emoji = h.emoji || '💝';
  form.effect = h.effect || 'heart';
  form.bgColor = h.bg_color || '';
  activeTplIdx.value = -1;
  genPreviewParticles(form.effect);
  toast.success('已填入历史内容，可修改后再发');
}

function scrollToHistory() {
  uni.pageScrollTo({
    selector: '#history-anchor',
    duration: 300
  });
}

onShow(async () => {
  genPreviewParticles(form.effect);
  try {
    await loadHistory();
  } catch (e) {
    // ignore
  } finally {
    firstLoading.value = false;
  }
});
</script>

<style lang="scss" scoped>
.surprise-page {
  min-height: 100vh;
  background: $bg-page;

  /* 男友端主题覆盖：页面标题、按钮、激活态全部走蓝色系 */
  &.bf-theme {
    .send-btn {
      background: linear-gradient(135deg, var(--c-primary, #7BA5D9), var(--c-primary-2, #A8C8E8));
      box-shadow: 0 4rpx 12rpx rgba(90, 139, 196, 0.28);
    }
    .opt-chip.active,
    .emoji-cell.active,
    .tpl-chip.active {
      background: linear-gradient(135deg, var(--c-primary, #7BA5D9), var(--c-primary-2, #A8C8E8));
    }
    .bg-chip.active {
      border-color: var(--c-primary-dark, #5A8BC4);
      .bg-check {
        color: var(--c-primary-dark, #5A8BC4);
      }
    }
    .preview-close {
      background: linear-gradient(135deg, var(--c-primary, #7BA5D9), var(--c-primary-2, #A8C8E8));
    }
    .hc-tag.unread {
      background: rgba(123, 165, 217, 0.2);
      color: var(--c-primary-dark, #5A8BC4);
    }
    .hc-reapply {
      color: var(--c-primary-dark, #5A8BC4);
      background: rgba(123, 165, 217, 0.12);
    }
  }
}
.surprise-content {
  padding-bottom: env(safe-area-inset-bottom);
}
.nav-history-btn {
  width: 56rpx;
  height: 56rpx;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.25);
  display: flex;
  align-items: center;
  justify-content: center;
}

.config-card {
  position: relative;
  z-index: 2;
  margin: 24rpx;
  padding: 36rpx 28rpx;
  padding-bottom: calc(18px + constant(safe-area-inset-bottom));
  padding-bottom: calc(18px + env(safe-area-inset-bottom));
  background: #fff;
  border-radius: $radius-xl;
  box-shadow: $shadow-card;
}
.section {
  position: relative;
  z-index: 1;
  margin: 24rpx;
}
.sec-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 24rpx;
  .sec-title {
    font-size: 34rpx;
    font-weight: 800;
    color: $text-1;
    display: flex;
    align-items: center;
    gap: 10rpx;
  }
  .sec-sub {
    font-size: 24rpx;
    color: $text-3;
  }
}

.block {
  position: relative;
  z-index: 1;
  margin-bottom: 36rpx;
  &:last-child {
    margin-bottom: 0;
  }
}
.block-label {
  display: block;
  font-size: 24rpx;
  color: $text-3;
  font-weight: 600;
  margin-bottom: 16rpx;
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
.textarea {
  height: 180rpx;
  padding: 20rpx 24rpx;
  line-height: 1.6;
}
.ipt-count {
  display: block;
  text-align: right;
  font-size: 20rpx;
  color: $text-4;
  margin-top: 8rpx;
}

/* 模板 */
.tpl-scroll {
  width: 100%;
  white-space: nowrap;
}
.tpl-list {
  display: inline-flex;
  gap: 16rpx;
  padding: 4rpx 28rpx 4rpx 4rpx;
}
.tpl-chip {
  flex-shrink: 0;
  display: inline-flex;
  align-items: center;
  gap: 8rpx;
  background: #fff;
  border-radius: $radius-pill;
  padding: 14rpx 24rpx;
  box-shadow: $shadow-card;
  &.active {
    background: linear-gradient(135deg, $brand-primary, $brand-primary-2);
    .tpl-name {
      color: #fff;
      font-weight: 700;
    }
  }
  .tpl-emoji {
    font-size: 28rpx;
  }
  .tpl-name {
    font-size: 24rpx;
    color: $text-2;
  }
}

/* emoji */
.emoji-grid {
  display: flex;
  flex-wrap: wrap;
  gap: 16rpx;
  background: #fff;
  border-radius: $radius-md;
  padding: 20rpx;
  box-shadow: $shadow-card;
}
.emoji-cell {
  width: 72rpx;
  height: 72rpx;
  border-radius: $radius-sm;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 40rpx;
  background: $bg-surface-alt;
  &.active {
    background: linear-gradient(135deg, $brand-primary, $brand-primary-2);
    box-shadow: $shadow-press;
  }
}

/* 选项行 */
.opt-row {
  display: flex;
  flex-wrap: wrap;
  gap: 16rpx;
}
.opt-chip {
  padding: 14rpx 28rpx;
  border-radius: $radius-pill;
  background: #fff;
  font-size: 24rpx;
  color: $text-2;
  box-shadow: $shadow-card;
  &.active {
    background: linear-gradient(135deg, $brand-primary, $brand-primary-2);
    color: #fff;
    font-weight: 700;
  }
}
.bg-chip {
  width: 120rpx;
  height: 80rpx;
  border-radius: $radius-md;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 22rpx;
  color: $text-2;
  box-shadow: $shadow-card;
  border: 2rpx solid transparent;
  &.active {
    border-color: $brand-primary-dark;
    .bg-label {
      display: none;
    }
  }
  .bg-check {
    font-size: 32rpx;
    color: $brand-primary-dark;
    font-weight: 800;
  }
  .bg-label {
    background: rgba(255, 255, 255, 0.7);
    padding: 2rpx 8rpx;
    border-radius: $radius-sm;
  }
}

/* 发送按钮 */
.send-btn {
  margin-top: 12rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12rpx;
  background: linear-gradient(135deg, $brand-primary, $brand-primary-2);
  color: #fff;
  font-size: 32rpx;
  font-weight: 800;
  padding: 28rpx;
  border-radius: $radius-pill;
  box-shadow: $shadow-press;
  &.disabled {
    opacity: 0.6;
  }
}

/* 预览 */
.preview-wrap {
  position: relative;
  padding: 32rpx 0;
  background: rgba(0, 0, 0, 0.6);
  border-radius: $radius-lg;
  display: flex;
  align-items: center;
  justify-content: center;
}
.preview-box {
  position: relative;
  width: 86%;
  min-height: 420rpx;
  border-radius: 32rpx;
  overflow: hidden;
  background: linear-gradient(135deg, #FFF8F2, #FFE8EE);
  display: flex;
  align-items: center;
  justify-content: center;
}
.preview-effect {
  position: absolute;
  inset: 0;
  pointer-events: none;
  overflow: hidden;
}
.preview-particle {
  position: absolute;
  top: -30rpx;
  animation: previewFall 2.5s ease-in infinite;
}
@keyframes previewFall {
  0% { transform: translateY(0) rotate(0deg); opacity: 1; }
  100% { transform: translateY(420rpx) rotate(360deg); opacity: 0; }
}
.preview-content {
  position: relative;
  z-index: 1;
  padding: 40rpx 32rpx;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 16rpx;
}
.preview-emoji {
  font-size: 72rpx;
}
.preview-title {
  font-size: 36rpx;
  font-weight: 800;
  color: $text-1;
}
.preview-text {
  font-size: 26rpx;
  color: $text-2;
  line-height: 1.5;
  text-align: center;
}
.preview-close {
  margin-top: 16rpx;
  padding: 16rpx 40rpx;
  background: linear-gradient(135deg, $brand-primary, $brand-primary-2);
  border-radius: $radius-pill;
  color: #fff;
  font-size: 26rpx;
  font-weight: 700;
}

/* 空态 */
.empty-card {
  background: #fff;
  border-radius: $radius-lg;
  padding: 48rpx 28rpx;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8rpx;
  box-shadow: $shadow-card;
  .ec-text {
    font-size: 28rpx;
    font-weight: 600;
    color: $text-2;
  }
  .ec-sub {
    font-size: 22rpx;
    color: $text-4;
  }
}

/* 历史 */
.history-card {
  background: #fff;
  border-radius: $radius-lg;
  padding: 24rpx 28rpx;
  margin-bottom: 16rpx;
  box-shadow: $shadow-card;
}
.hc-head {
  display: flex;
  align-items: center;
  gap: 12rpx;
}
.hc-emoji {
  font-size: 36rpx;
}
.hc-title {
  flex: 1;
  font-size: 28rpx;
  font-weight: 700;
  color: $text-1;
  min-width: 0;
}
.hc-tag {
  font-size: 20rpx;
  padding: 4rpx 16rpx;
  border-radius: $radius-pill;
  &.read {
    background: $bg-surface-alt;
    color: $text-3;
  }
  &.unread {
    background: rgba(245, 182, 193, 0.2);
    color: $brand-primary-dark;
    font-weight: 700;
  }
}
.hc-content {
  display: block;
  margin-top: 12rpx;
  font-size: 26rpx;
  color: $text-2;
  line-height: 1.5;
}
.hc-reapply {
  display: inline-block;
  margin-top: 16rpx;
  font-size: 22rpx;
  color: $brand-primary-dark;
  background: rgba(245, 182, 193, 0.12);
  padding: 6rpx 20rpx;
  border-radius: $radius-pill;
}
.hc-meta {
  margin-top: 16rpx;
  display: flex;
  align-items: center;
  justify-content: space-between;
  .hc-effect {
    font-size: 20rpx;
    color: $brand-taro;
    background: $bg-taro;
    padding: 4rpx 16rpx;
    border-radius: $radius-pill;
  }
  .hc-time {
    font-size: 20rpx;
    color: $text-4;
  }
}

.foot-tip {
  text-align: center;
  margin: 40rpx 0 20rpx;
  font-size: 22rpx;
  color: $text-4;
}
.tab-holder {
  height: 60rpx;
}
</style>
