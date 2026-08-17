<template>
  <view class="page wishlist-page" :class="couple.themeClass" :style="couple.themeStyle">
    <NavBar :title="couple.isGirlfriend ? '我的心愿单' : couple.partnerDisplayName + '的心愿单'" />
    <PageLoading :visible="firstLoading" @timeout="firstLoading = false" />

    <scroll-view
      v-show="!firstLoading"
      scroll-y
      class="wl-scroll"
      :show-scrollbar="false"
      :refresher-enabled="isMpWeixin"
      :refresher-triggered="isMpWeixin ? refreshing : false"
      @refresherrefresh="onRefresh"
    >
      <!-- 顶部统计卡 -->
      <view class="stat-card">
        <view class="sc-bg-deco" />
        <view class="sc-body">
          <view class="sc-left">
            <text class="sc-emoji">🌠</text>
            <view class="sc-text">
              <text class="sc-title">{{ couple.isGirlfriend ? '我的小小心愿' : couple.partnerDisplayName + '的心愿' }}</text>
              <text class="sc-sub">{{ doneCount }}/{{ list.length }} 已实现 · {{ couple.isGirlfriend ? '许下心愿等' + couple.partnerDisplayName + '来实现' : '努力帮 TA 实现吧' }}</text>
            </view>
          </view>
          <view class="sc-ring">
            <text class="sc-ring-num">{{ progress }}%</text>
            <text class="sc-ring-label">完成</text>
          </view>
        </view>
      </view>

      <!-- 男友端温馨提示 -->
      <view v-if="couple.isBoyfriend && list.length > 0" class="tip-bar">
        <AppIcon name="gift" size="26" :color="couple.themeStyle['--c-primary'] || '#7BA5D9'" />
        <text>点「帮 TA 实现」标记心愿完成，让 {{ couple.partnerDisplayName }} 开心一下</text>
      </view>

      <!-- 心愿列表 -->
      <view v-if="list.length === 0" class="empty-card">
        <text class="ec-emoji">🌠</text>
        <text class="ec-text">{{ couple.isGirlfriend ? '还没有心愿' : couple.partnerDisplayName + '还没有许愿' }}</text>
        <text class="ec-sub">{{ couple.isGirlfriend ? '点下方按钮添加一个吧' : '等 TA 许愿后这里会显示' }}</text>
      </view>

      <view v-else class="wl-list">
        <view
          v-for="item in list"
          :key="item.id"
          class="wl-card"
          :class="{ done: item.is_done }"
        >
          <view class="wl-head">
            <text class="wl-emoji">{{ item.emoji || '💝' }}</text>
            <text class="wl-title ellipsis">{{ item.title }}</text>
            <view v-if="item.is_done" class="wl-tag done">已实现</view>
            <view v-else class="wl-tag todo">待实现</view>
          </view>

          <text v-if="item.description" class="wl-desc">{{ item.description }}</text>

          <view v-if="item.image_url || item.link" class="wl-media">
            <image
              v-if="item.image_url"
              class="wl-img"
              :src="resolveUrl(item.image_url)"
              mode="aspectFill"
              @click="previewImage(item)"
            />
            <view v-if="item.link" class="wl-link" @click="copyLink(item.link)">
              <AppIcon name="envelope" size="22" :color="couple.themeStyle['--c-taro'] || '#B8A2C7'" />
              <text class="wl-link-text ellipsis">{{ item.link }}</text>
              <text class="wl-link-action">复制</text>
            </view>
          </view>

          <view class="wl-foot">
            <text class="wl-time">{{ formatTime(item.created_at) }}</text>
            <view class="wl-actions">
              <!-- 男友端：帮 TA 实现 / 取消 -->
              <template v-if="couple.isBoyfriend">
                <view
                  v-if="!item.is_done"
                  class="wl-btn primary"
                  @click="toggleDone(item, true)"
                >
                  <AppIcon name="checkCircle" size="22" color="#fff" />
                  <text>帮 TA 实现</text>
                </view>
                <view
                  v-else
                  class="wl-btn ghost"
                  @click="toggleDone(item, false)"
                >
                  <text>取消标记</text>
                </view>
              </template>
              <!-- 女友端：编辑 / 删除 / 完成切换 -->
              <template v-else>
                <view
                  class="wl-btn ghost"
                  @click="toggleDone(item, !item.is_done)"
                >
                  <AppIcon :name="item.is_done ? 'cross' : 'check'" size="22" :color="item.is_done ? '#A89DA3' : '#7FB6A8'" />
                  <text>{{ item.is_done ? '取消完成' : '标记完成' }}</text>
                </view>
                <view class="wl-btn ghost" @click="openEdit(item)">
                  <!-- <AppIcon name="edit" size="22" :color="couple.themeStyle['--c-taro'] || '#B8A2C7'" /> -->
                  <nut-icon name="edit" size="22rpx" :custom-color="couple.themeStyle['--c-primary']" />
                  <text>编辑</text>
                </view>
                <view class="wl-btn danger" @click="onDelete(item)">
                  <AppIcon name="trash" size="22" color="#E08B8B" />
                  <text>删除</text>
                </view>
              </template>
            </view>
          </view>
        </view>
      </view>

      <view class="foot-tip">— 心愿虽小，有心最重要 —</view>
      <view class="tab-holder" />
    </scroll-view>

    <!-- 女友端：浮动添加按钮 -->
    <view
      v-if="couple.isGirlfriend"
      class="fab"
      :class="{ 'is-bf': couple.isBoyfriend }"
      @click="openCreate"
    >
      <AppIcon name="add" size="36" color="#fff" />
      <text>许愿</text>
    </view>

    <!-- 编辑/新增弹层 -->
    <view
      v-show="showForm"
      class="form-mask"
      :class="{ show: showForm }"
      @click="closeForm"
      @touchmove.stop.prevent
    >
      <view
        class="form-sheet"
        :class="{ 'is-mp': !isH5 }"
        @click.stop
        @touchmove.stop.prevent
      >
        <view class="fs-head">
          <text class="fs-title">{{ editingId ? '编辑心愿' : '许个心愿' }}</text>
          <view class="fs-close" @click="closeForm">
            <AppIcon name="close" size="28" color="#A89DA3" />
          </view>
        </view>

        <scroll-view
          scroll-y
          class="fs-body"
          :show-scrollbar="false"
          :scroll-into-view="scrollIntoView"
          scroll-with-animation
        >
          <!-- 标题 -->
          <view class="fb-block" id="fb-title">
            <text class="fb-label">心愿标题 <text class="req">*</text></text>
            <input
              :value="form.title"
              class="fb-ipt"
              placeholder="如：想吃一次榴莲蛋糕"
              placeholder-class="ipt-ph"
              maxlength="30"
              :adjust-position="false"
              @input="e => form.title = e.detail.value"
              @focus="onFieldFocus('fb-title')"
            />
          </view>
          <!-- 链接 -->
          <view class="fb-block" id="fb-link">
            <text class="fb-label">参考链接（可选）</text>
            <input
              :value="form.link"
              class="fb-ipt"
              placeholder="粘贴商品链接或网页地址"
              placeholder-class="ipt-ph"
              maxlength="200"
              :adjust-position="false"
              @input="e => form.link = e.detail.value"
              @focus="onFieldFocus('fb-link')"
            />
          </view>
          <!-- 描述 -->
          <view class="fb-block" id="fb-desc">
            <text class="fb-label">详细描述</text>
            <textarea
              :value="form.description"
              class="fb-ipt textarea"
              placeholder="说点具体的，比如什么时候、和谁、哪里..."
              placeholder-class="ipt-ph"
              maxlength="120"
              :adjust-position="false"
              @input="e => form.description = e.detail.value"
              @focus="onFieldFocus('fb-desc')"
            />
            <text class="fb-count">{{ form.description.length }}/120</text>
          </view>
          <!-- emoji 选择 -->
          <view class="fb-block" id="fb-emoji">
            <text class="fb-label">选个表情</text>
            <view class="emoji-row">
              <view
                v-for="e in emojiOptions"
                :key="e"
                class="emoji-cell"
                :class="{ active: form.emoji === e }"
                @click="form.emoji = e"
              >
                {{ e }}
              </view>
            </view>
          </view>
          <!-- 图片 -->
          <view class="fb-block" id="fb-image">
            <text class="fb-label">参考图片（可选）</text>
            <view class="img-pick">
              <view v-if="form.image_url" class="img-preview">
                <image class="ip-img" :src="resolveUrl(form.image_url)" mode="aspectFill" @click="previewFormImage" />
                <view class="ip-del" @click="form.image_url = ''">
                  <AppIcon name="close" size="22" color="#fff" />
                </view>
              </view>
              <view v-else class="img-add" @click="chooseImage">
                <!-- <AppIcon name="camera" size="36" :color="couple.themeStyle['--c-taro'] || '#B8A2C7'" /> -->
                <nut-icon name="photograph" size="36rpx" :custom-color="couple.themeStyle['--c-taro'] || '#B8A2C7'" />
                <text>添加图片</text>
              </view>
            </view>
          </view>
        </scroll-view>

        <view class="fs-foot">
          <view class="fs-btn ghost" @click="closeForm">取消</view>
          <view class="fs-btn primary" :class="{ disabled: submitting }" @click="submitForm">
            {{ submitting ? '保存中…' : (editingId ? '保存修改' : '许下心愿') }}
          </view>
        </view>
      </view>
    </view>

    <Toast />
  </view>
</template>

<script setup>
/**
 * 心愿单页面（女友端管理 / 男友端只读+帮实现）
 * -----------------------------------------------------------------------------
 * 女友端：创建 / 编辑 / 删除心愿，可上传图片或链接
 * 男友端：查看心愿列表，可点击「帮 TA 实现」标记完成
 */
import { ref, reactive, computed } from 'vue';
import { onShow, onPullDownRefresh } from '@dcloudio/uni-app';
import NavBar from '@/components/NavBar.vue';
import AppIcon from '@/components/AppIcon.vue';
import Toast from '@/components/Toast.vue';
import PageLoading from '@/components/PageLoading.vue';
import { useCoupleStore } from '@/store/couple';
import { api } from '@/utils/api';
import { resolveUrl } from '@/utils/server';
import { toast } from '@/utils/toast';
import { requireLogin } from '@/utils/auth';
import { usePoll } from '@/utils/sync';
import { copyText } from '@/utils/clipboard';

// 心愿单页需要情侣资料同步（伴侣昵称/头像等）
usePoll(['couple']);

const couple = useCoupleStore();
const isH5 = ref(false);
// #ifdef H5
isH5.value = true;
// #endif

const list = ref([]);
const scrollIntoView = ref('');
const refreshing = ref(false);
const firstLoading = ref(true);

// 平台判断：scroll-view 原生下拉刷新仅在小程序启用，H5 使用页面级下拉刷新
const isMpWeixin = ref(false);
// #ifdef MP-WEIXIN
isMpWeixin.value = true;
// #endif

// 表单状态
const showForm = ref(false);
const submitting = ref(false);
const editingId = ref('');
const form = reactive({
  title: '',
  description: '',
  image_url: '',
  link: '',
  emoji: '💝'
});

const emojiOptions = ['💝', '🌠', '🍰', '🌹', '🎁', '👜', '💍', '✈️', '🍭', '🎀'];

const doneCount = computed(() => list.value.filter((x) => x.is_done).length);
const progress = computed(() => {
  if (list.value.length === 0) return 0;
  return Math.round((doneCount.value / list.value.length) * 100);
});

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

async function loadList() {
  if (!couple.coupleId) return;
  try {
    const data = await api.listWishlist(couple.coupleId);
    list.value = Array.isArray(data) ? data : (data && data.list) || [];
  } catch (e) {
    list.value = [];
  }
}

async function onRefresh() {
  refreshing.value = true;
  try {
    await loadList();
  } finally {
    refreshing.value = false;
  }
}

// H5 使用页面级下拉刷新
// #ifndef MP-WEIXIN
onPullDownRefresh(() => {
  onRefresh().finally(() => uni.stopPullDownRefresh());
});
// #endif

function resetForm() {
  form.title = '';
  form.description = '';
  form.image_url = '';
  form.link = '';
  form.emoji = '💝';
  editingId.value = '';
}

function openCreate() {
  if (!requireLogin(couple)) return;
  resetForm();
  showForm.value = true;
}

function openEdit(item) {
  if (!requireLogin(couple)) return;
  editingId.value = item.id;
  form.title = item.title || '';
  form.description = item.description || '';
  form.image_url = item.image_url || '';
  form.link = item.link || '';
  form.emoji = item.emoji || '💝';
  showForm.value = true;
}

function closeForm() {
  showForm.value = false;
  scrollIntoView.value = '';
}

function onFieldFocus(id) {
  if (!isH5.value) return;
  setTimeout(() => {
    scrollIntoView.value = id;
    // 滚动完成后再清空，避免反复横跳
    setTimeout(() => {
      scrollIntoView.value = '';
    }, 400);
  }, 200);
}

async function chooseImage() {
  if (!requireLogin(couple)) return;
  try {
    const res = await uni.chooseImage({
      count: 1,
      sizeType: ['compressed'],
      sourceType: ['album', 'camera']
    });
    const filePath = res.tempFilePaths && res.tempFilePaths[0];
    if (!filePath) return;
    toast.loading('上传中…');
    const data = await api.uploadImage(filePath);
    toast.hide();
    form.image_url = data.url;
    toast.success('图片已添加');
  } catch (e) {
    toast.hide();
    // api.uploadImage 内部已弹错误，这里静默
    console.error('[wishlist] upload', e);
  }
}

async function submitForm() {
  if (!requireLogin(couple)) return;
  const title = (form.title || '').trim();
  if (!title) {
    toast.error('请填写心愿标题');
    return;
  }
  if (!couple.coupleId || !couple.userId) {
    toast.error('请先完成配对');
    return;
  }
  submitting.value = true;
  try {
    const payload = {
      couple_id: couple.coupleId,
      user_id: couple.userId,
      title,
      description: (form.description || '').trim(),
      image_url: form.image_url || '',
      link: (form.link || '').trim(),
      emoji: form.emoji
    };
    if (editingId.value) {
      await api.updateWishlist(editingId.value, payload);
      toast.success('已更新');
    } else {
      await api.createWishlist(payload);
      toast.success('心愿已许下');
    }
    showForm.value = false;
    resetForm();
    loadList();
  } catch (e) {
    // api 内部已弹错误
    console.error('[wishlist] submit', e);
  }
  submitting.value = false;
}

function onDelete(item) {
  if (!requireLogin(couple)) return;
  uni.showModal({
    title: '删除心愿',
    content: `确定删除「${item.title}」吗？`,
    confirmText: '删除',
    confirmColor: '#E08B8B',
    success: async (r) => {
      if (!r.confirm) return;
      try {
        await api.deleteWishlist(item.id);
        toast.success('已删除');
        loadList();
      } catch (e) {
        console.error('[wishlist] delete', e);
      }
    }
  });
}

async function toggleDone(item, done) {
  if (!requireLogin(couple)) return;
  try {
    await api.toggleWishlistDone(item.id, done);
    // 乐观更新
    item.is_done = done ? 1 : 0;
    if (done) {
      toast.success(couple.isBoyfriend ? '已帮 TA 实现！' : '已标记完成');
    } else {
      toast.success('已取消完成');
    }
  } catch (e) {
    console.error('[wishlist] toggleDone', e);
  }
}

function previewImage(item) {
  if (!item.image_url) return;
  uni.previewImage({
    urls: [resolveUrl(item.image_url)]
  });
}

function previewFormImage() {
  if (!form.image_url) return;
  const url = resolveUrl(form.image_url);
  uni.previewImage({ urls: [url], current: url });
}

function copyLink(link) {
  copyText(link, '链接已复制');
}

onShow(async () => {
  try {
    await loadList();
  } finally {
    firstLoading.value = false;
  }
});
</script>

<style lang="scss" scoped>
.wishlist-page {
  // height: 100vh;
  background: $bg-page;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}
.wl-scroll {
  flex: 1;
  min-height: 0;
}

/* 顶部统计卡 */
.stat-card {
  position: relative;
  margin: 20rpx 24rpx 0;
  padding: 32rpx 28rpx;
  border-radius: $radius-lg;
  background: linear-gradient(135deg, var(--c-primary, $brand-primary) 0%, var(--c-primary-2, $brand-primary-2) 100%);
  box-shadow: $shadow-card;
  overflow: hidden;
}
.sc-bg-deco {
  position: absolute;
  top: -40rpx;
  right: -40rpx;
  width: 200rpx;
  height: 200rpx;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.18);
}
.sc-body {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: space-between;
}
.sc-left {
  display: flex;
  align-items: center;
  gap: 16rpx;
  flex: 1;
  min-width: 0;
}
.sc-emoji {
  font-size: 56rpx;
}
.sc-text {
  display: flex;
  flex-direction: column;
  gap: 4rpx;
  flex: 1;
  min-width: 0;
  .sc-title {
    font-size: 32rpx;
    font-weight: 800;
    color: #fff;
  }
  .sc-sub {
    font-size: 22rpx;
    color: rgba(255, 255, 255, 0.9);
  }
}
.sc-ring {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  width: 100rpx;
  height: 100rpx;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.25);
  flex-shrink: 0;
  .sc-ring-num {
    font-size: 28rpx;
    font-weight: 800;
    color: #fff;
  }
  .sc-ring-label {
    font-size: 18rpx;
    color: rgba(255, 255, 255, 0.85);
  }
}

/* 男友端温馨提示 */
.tip-bar {
  margin: 20rpx 24rpx 0;
  padding: 16rpx 20rpx;
  background: rgba(0, 0, 0, 0.04);
  border-radius: $radius-md;
  display: flex;
  align-items: center;
  gap: 10rpx;
  font-size: 22rpx;
  color: var(--c-primary-dark, $brand-primary-dark);
}

/* 空态 */
.empty-card {
  margin: 60rpx 24rpx 0;
  padding: 60rpx 28rpx;
  background: #fff;
  border-radius: $radius-lg;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12rpx;
  box-shadow: $shadow-card;
  .ec-emoji {
    font-size: 80rpx;
  }
  .ec-text {
    font-size: 30rpx;
    font-weight: 700;
    color: $text-2;
  }
  .ec-sub {
    font-size: 22rpx;
    color: $text-4;
  }
}

/* 心愿列表 */
.wl-list {
  margin: 20rpx 24rpx 0;
  display: flex;
  flex-direction: column;
  gap: 16rpx;
}
.wl-card {
  background: #fff;
  border-radius: $radius-lg;
  padding: 24rpx 28rpx;
  box-shadow: $shadow-card;
  border-left: 6rpx solid var(--c-primary, $brand-primary);
  &.done {
    border-left-color: $color-success;
    background: linear-gradient(135deg, #fff, rgba(127, 182, 168, 0.06));
    .wl-title {
      color: $text-3;
      text-decoration: line-through;
    }
  }
}
.wl-head {
  display: flex;
  align-items: center;
  gap: 12rpx;
}
.wl-emoji {
  font-size: 36rpx;
  flex-shrink: 0;
}
.wl-title {
  flex: 1;
  min-width: 0;
  font-size: 30rpx;
  font-weight: 700;
  color: $text-1;
}
.wl-tag {
  font-size: 20rpx;
  padding: 4rpx 16rpx;
  border-radius: $radius-pill;
  flex-shrink: 0;
  &.done {
    background: rgba(127, 182, 168, 0.18);
    color: $color-success;
    font-weight: 700;
  }
  &.todo {
    background: rgba(0, 0, 0, 0.04);
    color: var(--c-primary-dark, $brand-primary-dark);
    font-weight: 700;
  }
}
.wl-desc {
  display: block;
  margin-top: 12rpx;
  font-size: 26rpx;
  color: $text-2;
  line-height: 1.5;
}
.wl-media {
  margin-top: 16rpx;
  display: flex;
  flex-direction: column;
  gap: 12rpx;
}
.wl-img {
  width: 100%;
  height: 280rpx;
  border-radius: $radius-md;
  background: $bg-surface-alt;
}
.wl-link {
  display: flex;
  align-items: center;
  gap: 8rpx;
  padding: 14rpx 18rpx;
  background: $bg-surface-alt;
  border-radius: $radius-md;
  .wl-link-text {
    flex: 1;
    min-width: 0;
    font-size: 22rpx;
    color: $text-3;
  }
  .wl-link-action {
    font-size: 20rpx;
    color: var(--c-primary-dark, $brand-primary-dark);
    padding: 4rpx 12rpx;
    background: rgba(0, 0, 0, 0.04);
    border-radius: $radius-pill;
    flex-shrink: 0;
  }
}
.wl-foot {
  margin-top: 18rpx;
  padding-top: 16rpx;
  border-top: 1rpx solid $divider;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12rpx;
}
.wl-time {
  font-size: 20rpx;
  color: $text-4;
}
.wl-actions {
  display: flex;
  align-items: center;
  gap: 10rpx;
  flex-wrap: wrap;
  justify-content: flex-end;
}
.wl-btn {
  display: flex;
  align-items: center;
  gap: 4rpx;
  padding: 8rpx 16rpx;
  border-radius: $radius-pill;
  font-size: 22rpx;
  font-weight: 600;
  &.primary {
    background: linear-gradient(135deg, var(--c-primary, $brand-primary), var(--c-primary-2, $brand-primary-2));
    color: #fff;
  }
  &.ghost {
    background: $bg-surface-alt;
    color: $text-2;
  }
  &.danger {
    background: rgba(224, 139, 139, 0.12);
    color: $color-danger;
  }
}

.foot-tip {
  text-align: center;
  margin: 40rpx 0 20rpx;
  font-size: 22rpx;
  color: $text-4;
}
.tab-holder {
  height: 200rpx;
}

/* 浮动添加按钮 */
.fab {
  position: fixed;
  right: 32rpx;
  bottom: calc(30px + env(safe-area-inset-bottom));
  display: flex;
  align-items: center;
  gap: 6rpx;
  padding: 20rpx 28rpx;
  border-radius: $radius-pill;
  background: linear-gradient(135deg, var(--c-primary, $brand-primary), var(--c-primary-2, $brand-primary-2));
  color: #fff;
  font-size: 26rpx;
  font-weight: 700;
  box-shadow: 0 8rpx 24rpx rgba(0, 0, 0, 0.12);
  z-index: 50;
}

/* 表单弹层 */
.form-mask {
  position: fixed;
  inset: 0;
  z-index: 100;
  background: rgba(0, 0, 0, 0.45);
  display: flex !important;
  align-items: flex-end;
  opacity: 0;
  visibility: hidden;
  pointer-events: none;
  transition: opacity 0.25s ease-out, visibility 0.25s ease-out;
  &.show {
    opacity: 1;
    visibility: visible;
    pointer-events: auto;
  }
}
.form-sheet {
  position: absolute;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: 1;
  width: 100%;
  max-height: 88vh;
  background: #fff;
  border-radius: 32rpx 32rpx 0 0;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  transform: translateY(100%);
  transition: transform 0.25s ease-out;
  /* 小程序端顶部容易顶出屏幕，限制高度留出安全边距 */
  &.is-mp {
    max-height: calc(100vh - 180rpx);
  }
}
.form-mask.show .form-sheet {
  transform: translateY(0);
}
.fs-head {
  padding: 28rpx 28rpx 16rpx;
  display: flex;
  align-items: center;
  justify-content: space-between;
  border-bottom: 1rpx solid $divider;
  .fs-title {
    font-size: 32rpx;
    font-weight: 800;
    color: $text-1;
  }
  .fs-close {
    width: 56rpx;
    height: 56rpx;
    border-radius: 50%;
    background: $bg-surface-alt;
    display: flex;
    align-items: center;
    justify-content: center;
  }
}
.fs-body {
  flex: 1;
  min-height: 0;
  height: 100%;
  max-height: 70vh;
  overflow: auto;
  padding: 24rpx 28rpx 0;
}
.fb-block {
  position: relative;
  z-index: 1;
  margin-bottom: 28rpx;
  flex-shrink: 0;
  // &:last-child {
  //   margin-bottom: 0;
  // }
}
.fb-label {
  display: block;
  font-size: 24rpx;
  color: $text-3;
  font-weight: 600;
  margin-bottom: 12rpx;
  .req {
    color: $color-danger;
  }
}
.fb-ipt {
  width: 100%;
  height: 88rpx;
  padding: 0 24rpx;
  background: $bg-surface-alt;
  border-radius: $radius-md;
  font-size: 28rpx;
  color: $text-1;
  box-sizing: border-box;
  &.textarea {
    height: 140rpx;
    padding: 20rpx 24rpx;
    line-height: 1.5;
  }
}
.ipt-ph {
  color: $text-4;
}
.fb-count {
  display: block;
  text-align: right;
  font-size: 20rpx;
  color: $text-4;
  margin-top: 8rpx;
}

.emoji-row {
  display: flex;
  flex-wrap: wrap;
  gap: 12rpx;
}
.emoji-cell {
  width: 72rpx;
  height: 72rpx;
  border-radius: $radius-sm;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 36rpx;
  background: $bg-surface-alt;
  &.active {
    background: linear-gradient(135deg, var(--c-primary, $brand-primary), var(--c-primary-2, $brand-primary-2));
    box-shadow: $shadow-press;
  }
}

.img-pick {
  display: flex;
}
.img-preview {
  position: relative;
  width: 200rpx;
  height: 200rpx;
  .ip-img {
    width: 100%;
    height: 100%;
    border-radius: $radius-md;
  }
  .ip-del {
    position: absolute;
    top: -10rpx;
    right: -10rpx;
    width: 40rpx;
    height: 40rpx;
    border-radius: 50%;
    background: rgba(0, 0, 0, 0.65);
    display: flex;
    align-items: center;
    justify-content: center;
  }
}
.img-add {
  width: 200rpx;
  height: 200rpx;
  border-radius: $radius-md;
  background: $bg-surface-alt;
  border: 2rpx dashed var(--c-taro, $brand-taro);
  color: var(--c-taro, $brand-taro);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 8rpx;
  font-size: 22rpx;
}

.fs-foot {
  padding: 24rpx 32rpx;
  padding-bottom: calc(12px + constant(safe-area-inset-bottom));
  padding-bottom: calc(12px + env(safe-area-inset-bottom));
  display: flex;
  gap: 20rpx;
  border-top: 1rpx solid $divider;
}
.fs-btn {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  height: 96rpx;
  border-radius: $radius-pill;
  font-size: 32rpx;
  font-weight: 800;
  &.ghost {
    background: $bg-surface-alt;
    color: $text-2;
  }
  &.primary {
    background: linear-gradient(135deg, var(--c-primary, $brand-primary), var(--c-primary-2, $brand-primary-2));
    color: #fff;
    box-shadow: $shadow-press;
    &.disabled {
      opacity: 0.6;
    }
  }
}
</style>
