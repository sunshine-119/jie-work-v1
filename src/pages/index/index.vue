<template>
  <view class="page home-page" :class="couple.themeClass" :style="couple.themeStyle">
    <NavBar :show-back="false">
      <template #left>
        <view class="nav-theme-btn" @click="openThemePicker">
          <AppIcon name="brush" size="26" color="#fff" />
        </view>
      </template>
      <view class="nav-center">
        <text class="nav-brand">{{ couple.isGirlfriend ? '我们的小厨房' : couple.myDisplayName + '的接单台' }}</text>
      </view>
      <template #right>
        <view class="nav-role" @click="goProfile">
          <AppIcon :name="couple.isGirlfriend ? 'heartPulse' : 'profile'" size="26" color="#fff" />
          <text class="role-text" v-if="couple.partnerDisplayName">和{{ couple.partnerDisplayName }}</text>
        </view>
      </template>
    </NavBar>
    <!-- 首次加载 loading -->
    <PageLoading :visible="firstLoading" @timeout="firstLoading = false" />
    <scroll-view
      scroll-y
      class="home-scroll"
      :show-scrollbar="false"
      :refresher-enabled="isMpWeixin"
      :refresher-triggered="isMpWeixin ? pullRefreshing : false"
      @refresherrefresh="onRefresh"
    >
      <!-- ==================== 女友端首页 ==================== -->
      <template v-if="couple.isGirlfriend">
        <!-- 情侣卡：双头像 + 昵称 + 配对天数 -->
        <view class="couple-card" @click="onCoupleCardTap">
          <view class="couple-bg-deco" />
          <view class="couple-top">
            <view class="avatar-wrap me">
              <image
                v-if="couple.me && couple.me.avatar"
                class="avatar"
                :src="couple.me.avatar"
                mode="aspectFill"
                @click="previewMyAvatar"
              />
              <view v-else class="avatar emoji-avatar girl">🐱</view>
              <text class="avatar-name">{{ couple.myNickname }}</text>
              <text class="avatar-tag">{{ couple.myDisplayName }}</text>
            </view>
            <view class="couple-link">
              <AppIcon class="link-heart" name="heartPulse" size="28" color="#fff" />
              <text class="link-days">来到小厨第 {{ pairedDays }} 天</text>
            </view>
            <view class="avatar-wrap him">
              <image
                v-if="couple.partner && couple.partner.avatar"
                class="avatar"
                :src="couple.partner.avatar"
                mode="aspectFill"
                @click="previewPartnerAvatar"
              />
              <view v-else class="avatar emoji-avatar boy">👨‍🍳</view>
              <text class="avatar-name">{{ couple.partnerNickname }}</text>
              <text class="avatar-tag">{{ couple.partnerDisplayName }}</text>
            </view>
          </view>
        </view>

        <!-- 等待配对提示：未真正配对完成时显示 -->
        <view v-if="!trulyPaired" class="waiting-bar">
          <AppIcon name="warning" size="36" color="#E8B86C" />
          <template v-if="couple.inviteCode">
            <text class="wb-text">邀请码 {{ couple.inviteCode }} 已生成，等待 TA 加入配对…</text>
            <view class="wb-copy" @click="onCopyInvite">
              <AppIcon name="copy" size="28" color="#E8B86C" />
            </view>
          </template>
          <template v-else-if="couple.coupleId">
            <text class="wb-text">邀请码生成中…</text>
          </template>
          <template v-else>
            <text class="wb-text">生成邀请码，等待 TA 加入配对</text>
          </template>
          <text class="wb-refresh" @click="refreshCouple">刷新</text>
        </view>

        <!-- 进行中的订单快速入口 -->
        <view v-if="gfActiveOrder" class="hero-entry order-hero" @click="goOrders">
          <view class="hero-left">
            <text class="hero-title">{{ couple.partnerDisplayName }}正在为你准备</text>
            <text class="hero-sub">{{ gfActiveOrder.items.map((i) => i.name).join('、') }}</text>
            <view class="hero-btn">
              <text>查看进度</text>
              <nut-icon name="rect-right" size="28rpx" :custom-color="couple.themeStyle['--c-primary']" />
            </view>
          </view>
          <view class="hero-emoji">🍳</view>
        </view>

        <!-- 每日甜蜜干饭情话彩蛋 -->
        <view class="sweet-card" @click="refreshSweet">
          <view class="sweet-icon">
            <AppIcon name="envelope" size="36" color="#B8A2C7" />
          </view>
          <view class="sweet-body">
            <text class="sweet-title">今日干饭情话</text>
            <text class="sweet-text">{{ dailySweet }}</text>
          </view>
          <view class="sweet-refresh">
            <AppIcon name="sparkles" size="26" :color="refreshing ? (couple.themeStyle['--c-primary'] || '#F5B6C1') : '#999'" :spin="refreshing" />
            <text>换一句</text>
            <nut-icon name="rect-right" size="24rpx" :custom-color="couple.themeStyle['--c-primary']" />
          </view>
        </view>

        <!-- 女友端：快捷点餐大入口 -->
        <view class="hero-entry" @click="goMenu">
          <view class="hero-left">
            <text class="hero-title">今天想吃点什么？</text>
            <text class="hero-sub">{{ couple.isGirlfriend ? '挑你爱吃的，剩下的交给' + couple.partnerDisplayName + '来做' : '看看' + couple.partnerDisplayName + '想吃啥，做给她吃' }}</text>
            <view class="hero-btn">
              <text>开始点餐</text>
              <nut-icon name="rect-right" size="28rpx" custom-color="#fff" />
            </view>
          </view>
          <view class="hero-emoji">🍳</view>
        </view>

        <!-- 6 大分类入口 -->
        <view class="section">
          <view class="sec-head">
            <text class="sec-title">菜品分类</text>
            <view class="sec-more" @click="goCategory">
              <text>去编辑</text>
              <nut-icon name="rect-right" size="22rpx" :custom-color="couple.themeStyle['--c-primary']" />
            </view>
          </view>
          <view class="cat-grid" v-if="categories.length">
            <view
              v-for="cat in categories"
              :key="cat.id"
              class="cat-entry"
              @click="goCat(cat.id)"
            >
              <view class="cat-emoji">{{ cat.icon }}</view>
              <text class="cat-label">{{ cat.name }}</text>
              <text class="cat-desc">{{ cat.desc }}</text>
            </view>
          </view>
          <view v-else class="empty-hint" @click="goCategory">
            <text class="empty-emoji">🍽️</text>
            <text class="empty-title">还没有菜品分类</text>
            <text class="empty-desc">添加分类，整理你们的小厨房</text>
            <view class="empty-btn">
              <text>添加分类</text>
            </view>
          </view>
        </view>

        <!-- 猜你会喜欢：横向滚动 -->
        <view class="section" v-if="recommendDishes.length">
          <view class="sec-head">
            <text class="sec-title">猜你会喜欢</text>
            <view class="sec-more" @click="goMenu">
              <text>更多</text>
              <nut-icon name="rect-right" size="22rpx" :custom-color="couple.themeStyle['--c-primary']" />
            </view>
          </view>
          <scroll-view scroll-x class="rec-scroll" :show-scrollbar="false">
            <view class="rec-list">
              <view
                v-for="d in recommendDishes"
                :key="d.id"
                class="rec-card"
                @click="goDishDetail(d.id)"
              >
                <view class="rec-img-wrap" :style="{ background: d.bgColor }">
                  <image v-if="d.image" class="rec-img" :src="resolveUrl(d.image)" mode="aspectFill" />
                  <text v-else class="rec-emoji">{{ d.emoji }}</text>
                </view>
                <view class="rec-badge">荐</view>
                <text class="rec-name ellipsis">{{ d.name }}</text>
                <view class="rec-bottom">
                  <view class="rec-spacer" />
                  <view
                    class="rec-add"
                    @click.stop="quickAdd(d.id)"
                  >
                    <AppIcon name="add" size="24" color="#fff" />
                  </view>
                </view>
              </view>
            </view>
          </scroll-view>
        </view>
        <view class="section empty-section" v-else>
          <view class="sec-head">
            <text class="sec-title">猜你会喜欢</text>
          </view>
          <view class="empty-hint" @click="goMenu">
            <view class="eh-left">
              <text class="empty-hint-icon">🍽️</text>
              <view class="eh-texts">
                <text class="empty-hint-text">上传你拿手的菜</text>
                <text class="empty-hint-sub">让{{ couple.partnerDisplayName }}为你量身做菜</text>
              </view>
            </view>
            <view class="eh-arrow">
              <text class="empty-hint-arrow">→</text>
            </view>
          </view>
        </view>

        <!-- 热门榜单 -->
        <view class="section" v-if="hotRankDishes.length">
          <view class="sec-head">
            <view class="sec-title-row">
              <!-- <AppIcon name="fire" size="34" color="#E08B8B" /> -->
              <text class="sec-title">热门榜单</text>
            </view>
            <view v-if="hotRankDishes.length" class="sec-more" @click="goMenu">
              <text>查看全部</text>
              <nut-icon name="rect-right" size="22rpx" :custom-color="couple.themeStyle['--c-primary']" />
            </view>
          </view>
          <view class="rank-list">
            <view
              v-for="(d, i) in hotRankDishes"
              :key="d.id"
              class="rank-item"
              @click="goDishDetail(d.id)"
            >
              <view class="rank-no" :class="'no-' + (i + 1)">{{ i + 1 }}</view>
              <view class="rank-img-wrap" :style="{ background: d.bgColor }">
                <image v-if="d.image" class="rank-img" :src="resolveUrl(d.image)" mode="aspectFill" />
                <text v-else class="rank-emoji-text">{{ d.emoji }}</text>
              </view>
              <view class="rank-info">
                <text class="rank-name ellipsis">{{ d.name }}</text>
                <text class="rank-sales">被点了 {{ d.sales }} 次 · {{ (d.tags && d.tags.join(' · ')) || '大家都在吃' }}</text>
              </view>
              <view class="rank-add" @click.stop="quickAdd(d.id)">
                <AppIcon name="add" size="24" color="#fff" />
              </view>
            </view>
          </view>
        </view>
        <view class="section empty-section" v-else>
          <view class="sec-head">
            <text class="sec-title">热门榜单</text>
          </view>
          <view class="empty-hint" @click="goMenu">
            <view class="eh-left">
              <text class="empty-hint-icon">🔥</text>
              <view class="eh-texts">
                <text class="empty-hint-text">还没有菜品</text>
                <text class="empty-hint-sub">快去菜单页上传你的拿手好菜</text>
              </view>
            </view>
            <view class="eh-arrow">
              <text class="empty-hint-arrow">→</text>
            </view>
          </view>
        </view>
      </template>

      <!-- ==================== 男友端首页：大厨接单台 ==================== -->
      <template v-else>
        <!-- 顶部伴侣饮食提醒卡 -->
        <view class="warning-card">
          <view class="wc-head">
            <AppIcon name="shield" size="36" color="#E08B8B" />
            <text class="wc-title">{{ couple.partnerDisplayName }}的忌口提醒</text>
          </view>
          <view v-if="hasRestrictions" class="wc-body">
            <view v-if="preference.allergens.length" class="wc-row">
              <text class="wc-label danger">过敏原</text>
              <view class="wc-chips">
                <text v-for="a in preference.allergens" :key="a" class="wc-chip danger">{{ a }}</text>
              </view>
            </view>
            <view v-if="preference.dislikes.length" class="wc-row">
              <text class="wc-label warning">不吃</text>
              <view class="wc-chips">
                <text v-for="d in preference.dislikes" :key="d" class="wc-chip warning">{{ d }}</text>
              </view>
            </view>
            <view v-if="preference.tastePrefs.length" class="wc-row">
              <text class="wc-label">口味</text>
              <view class="wc-chips">
                <text v-for="t in preference.tastePrefs" :key="t" class="wc-chip">{{ t }}</text>
              </view>
            </view>
          </view>
          <view v-else class="wc-empty">
            <text>{{ couple.partnerDisplayName }}还没设置忌口，记得主动问问哦～</text>
          </view>
        </view>

        <!-- 待处理订单 -->
        <view class="section">
          <view class="sec-head">
            <text class="sec-title">待处理订单</text>
            <text class="sec-sub">{{ bfActiveOrders.length }} 个</text>
          </view>
          <view v-if="bfActiveOrders.length === 0" class="card empty-card">
            <AppIcon name="order" size="64" color="#B8A2C7" />
            <text class="ec-text">暂时没有新订单</text>
            <text class="ec-sub">{{ couple.partnerDisplayName }}下单后这里会实时出现</text>
          </view>
          <view
            v-for="o in bfActiveOrders"
            :key="o.id"
            class="order-card"
            @click="goDetail(o.id)"
          >
            <view class="oc-head">
              <text class="oc-no">#{{ o.no }}</text>
              <text class="oc-status" :style="{ color: statusMap[o.status].color }">
                {{ statusMap[o.status].text }}
              </text>
            </view>
            <view v-if="o.sweetNote" class="oc-sweet">
              <AppIcon name="envelope" size="24" color="#B8A2C7" />
              <text class="oc-sweet-text">{{ o.sweetNote }}</text>
            </view>
            <view class="oc-items">
              <text class="oc-item-text ellipsis">{{ o.items.map((i) => i.name).join('、') }}</text>
              <text class="oc-count">共 {{ itemCount(o) }} 件</text>
            </view>
            <view class="oc-actions" @click.stop>
              <template v-if="o.status === 0">
                <view class="oc-btn ghost" @click="rejectOrder(o.id)">拒绝</view>
                <view class="oc-btn primary" @click="acceptOrder(o.id)">接单</view>
              </template>
              <view v-else-if="o.status === 1" class="oc-btn primary" @click="cookDone(o.id)">
                开饭啦
              </view>
              <view v-else-if="o.status === 2" class="oc-btn done">
                等{{ couple.partnerDisplayName }}开饭
              </view>
            </view>
          </view>
        </view>

        <!-- 月度统计 -->
        <view class="section">
          <view class="sec-head">
            <text class="sec-title">本月战绩</text>
          </view>
          <view class="stat-grid">
            <view class="stat-card">
              <text class="sc-num">{{ stats.monthOrders }}</text>
              <text class="sc-label">完成订单</text>
            </view>
            <view class="stat-card">
              <text class="sc-num">¥{{ stats.totalSpent }}</text>
              <text class="sc-label">为{{ couple.partnerDisplayName }}买单</text>
            </view>
            <view class="stat-card">
              <text class="sc-num">{{ stats.avgPerMeal }}</text>
              <text class="sc-label">平均每餐</text>
            </view>
          </view>
        </view>

        <!-- 快速入口 -->
        <view class="section entry-section">
          <view class="sec-head">
            <text class="sec-title">快速入口</text>
          </view>
          <view class="entry-list">
            <view class="entry-card" @click="goSurprise">
              <view class="ec-left">
                <AppIcon name="gift" size="40" color="#E89AA8" />
                <view class="ec-body">
                  <text class="ec-title">给{{ couple.partnerDisplayName }}惊喜</text>
                  <text class="ec-sub">发个暖心弹窗给{{ couple.partnerDisplayName }}</text>
                </view>
              </view>
              <nut-icon name="rect-right" size="36rpx" :custom-color="couple.themeStyle['--c-primary']" />
            </view>

            <view class="entry-card" @click="goOrders">
              <view class="ec-left">
                <AppIcon name="order" size="40" color="#B8A2C7" />
                <view class="ec-body">
                  <text class="ec-title">全部订单</text>
                  <text class="ec-sub">管理所有{{ couple.partnerDisplayName }}的订单</text>
                </view>
              </view>
              <nut-icon name="rect-right" size="36rpx" :custom-color="couple.themeStyle['--c-primary']" />
            </view>

            <view class="entry-card" @click="goMenu">
              <view class="ec-left">
                <AppIcon name="menu" size="40" color="#B8A2C7" />
                <view class="ec-body">
                  <text class="ec-title">看看菜单</text>
                  <text class="ec-sub">提前看看今天能做什么</text>
                </view>
              </view>
              <nut-icon name="rect-right" size="36rpx" :custom-color="couple.themeStyle['--c-primary']" />
            </view>
          </view>
        </view>
      </template>

      <view class="foot-tip">— {{ couple.isGirlfriend ? '饿了就告诉' + couple.partnerDisplayName + '，' + couple.partnerDisplayName + '都在' : '把' + couple.partnerDisplayName + '喂饱，就是今天最大的成就' }} —</view>
      <view class="tab-holder" />
    </scroll-view>

    <TabBar current="index" />

    <LoveParticles
      ref="loveRef"
      :x="lovePos.x"
      :y="lovePos.y"
      :mode="loveMode"
    />

    <!-- 男友端发来的惊喜弹窗 -->
    <view v-if="surprise.visible" class="surprise-mask" @click="closeSurprise" @touchmove.stop.prevent>
      <view class="surprise-box" :style="surpriseStyle" @click.stop @touchmove.stop.prevent>
        <view class="surprise-effect-layer">
          <view v-for="(p, i) in surpriseParticles" :key="i" class="surprise-particle" :style="p.style">
            {{ p.text }}
          </view>
        </view>
        <view class="surprise-content">
          <text class="surprise-emoji">{{ surprise.data.emoji }}</text>
          <text class="surprise-title">{{ surprise.data.title }}</text>
          <text class="surprise-text">{{ surprise.data.content }}</text>
          <view class="surprise-close" @click="closeSurprise">
            <text>收下啦 ❤️</text>
          </view>
        </view>
      </view>
    </view>

    <!-- 女友端新发的心愿单弹窗（仅男友端可见） -->
    <view v-if="wishPopup.visible" class="wish-mask" @click="closeWishPopup" @touchmove.stop.prevent>
      <view class="wish-popup" @click.stop @touchmove.stop.prevent>
        <view class="wp-deco">
          <text class="wp-emoji">{{ wishPopup.data.emoji || '💝' }}</text>
        </view>
        <text class="wp-label">{{ couple.partnerDisplayName }} 许了个心愿</text>
        <text class="wp-title">{{ wishPopup.data.title }}</text>
        <text v-if="wishPopup.data.description" class="wp-desc">{{ wishPopup.data.description }}</text>
        <view class="wp-btns">
          <view class="wp-btn ghost" @click="closeWishPopup">
            <text>稍后再看</text>
          </view>
          <view class="wp-btn primary" @click="goWishDetail">
            <text>查看详情</text>
          </view>
        </view>
      </view>
    </view>

    <!-- 主题色弹层（替代 showActionSheet，小程序最多 6 项） -->
    <view
      v-show="themeSheet"
      class="sheet-mask"
      :class="{ show: themeSheet }"
      @click="themeSheet = false"
      @touchmove.stop.prevent
    >
      <view class="sheet-popup" @click.stop @touchmove.stop.prevent>
        <view class="sp-head">
          <text class="sp-title">选择主题色</text>
          <view class="sp-close" @click="themeSheet = false">
            <AppIcon name="close" size="24" color="#999" />
          </view>
        </view>
        <scroll-view scroll-y class="sp-list" :show-scrollbar="false">
          <view
            v-for="k in THEME_PRESETS"
            :key="k"
            class="sp-item"
            @click="onThemePick(k)"
          >
            <text>{{ THEME_ICONS[k] }} {{ THEME_LABELS[k] }}{{ k === couple.currentThemeKey ? ' ✓' : '' }}</text>
          </view>
          <view class="sp-item" @click="onThemePick('')"><text>🎨 恢复默认</text></view>
        </scroll-view>
      </view>
    </view>

    <Toast />
  </view>
</template>

<script setup>
import { ref, reactive, computed } from 'vue';
import { onShow, onHide, onPullDownRefresh } from '@dcloudio/uni-app';
import NavBar from '@/components/NavBar.vue';
import TabBar from '@/components/TabBar.vue';
import DishEmoji from '@/components/DishEmoji.vue';
import AppIcon from '@/components/AppIcon.vue';
import LoveParticles from '@/components/LoveParticles.vue';
import Toast from '@/components/Toast.vue';
import PageLoading from '@/components/PageLoading.vue';
import { useCartStore } from '@/store/cart';
import { useCoupleStore } from '@/store/couple';
import { usePreferenceStore } from '@/store/preference';
import { useOrderStore, ORDER_STATUS } from '@/store/order';
import { useDishStore } from '@/store/dish';
import { useAddressStore } from '@/store/address';
import { api } from '@/utils/api';
import { resolveUrl } from '@/utils/server';
import { getDailySweet } from '@/mock/sweet';
import { THEME_PRESETS, THEME_LABELS, THEME_ICONS, defaultPresetForRole } from '@/utils/theme';
import { toast } from '@/utils/toast';
import { copyText } from '@/utils/clipboard';
import { requireLogin } from '@/utils/auth';
import { usePoll } from '@/utils/sync';

// 首页需要情侣资料 + 订单实时同步
usePoll(['couple', 'orders']);

const cart = useCartStore();
const couple = useCoupleStore();
const preference = usePreferenceStore();
const orderStore = useOrderStore();
const dishStore = useDishStore();
const addressStore = useAddressStore();
const statusMap = ORDER_STATUS;

const categories = computed(() => dishStore.allCategories);
const dishes = computed(() => dishStore.dishes);

// 以多个字段兜底判断真实配对状态,避免本地状态滞后导致仍显示「等待配对」
const trulyPaired = computed(() => couple.isBound || !!couple.partner?.id || couple.isPaired);

// 女友端
const sweetIdx = ref(0);
const refreshing = ref(false);
const pullRefreshing = ref(false);
const firstLoading = ref(true);
const dailySweet = ref(getDailySweet());
const loveRef = ref(null);
const lovePos = ref({ x: 0, y: 0 });
const loveMode = ref('heart');

// 男友端发来的惊喜弹窗
const surprise = reactive({ visible: false, data: null, id: '' });
const surpriseParticles = ref([]);
const surpriseStyle = computed(() => {
  if (!surprise.data || !surprise.data.bg_color) return {};
  return { background: surprise.data.bg_color };
});

// 女友端新发的心愿单弹窗（仅男友端）
// 用心愿 ID 标记已读，同一心愿只弹一次
const WISH_POPUP_KEY = 'wishlist_last_seen_id';
const wishPopup = reactive({ visible: false, data: null, id: '' });
const themeSheet = ref(false);

// 平台判断：scroll-view 原生下拉刷新仅在小程序启用，H5 使用页面级下拉刷新
const isMpWeixin = ref(false);
// #ifdef MP-WEIXIN
isMpWeixin.value = true;
// #endif

async function checkSurprise() {
  if (!couple.isGirlfriend || !couple.coupleId) return;
  try {
    const res = await api.getLatestSurprise(couple.coupleId);
    if (res && res.surprise) {
      surprise.data = res.surprise;
      surprise.id = res.surprise.id;
      surprise.visible = true;
      startSurpriseEffect(res.surprise.effect);
    }
  } catch (e) {
    // ignore
  }
}

async function checkWishlistPopup() {
  if (!couple.isBoyfriend || !couple.coupleId) return;
  try {
    const data = await api.getLatestWishlist(couple.coupleId);
    if (!data) return;
    // 已完成的心愿不再弹窗
    if (data.is_done) return;
    const lastSeenId = uni.getStorageSync(WISH_POPUP_KEY) || '';
    // 用 ID 判断：同一心愿已读后不再弹（统一转字符串避免类型不一致）
    if (data.id && String(data.id) !== String(lastSeenId)) {
      wishPopup.data = data;
      wishPopup.id = data.id;
      wishPopup.visible = true;
    }
  } catch (e) {
    // ignore
  }
}

function closeWishPopup() {
  wishPopup.visible = false;
  if (wishPopup.data && wishPopup.data.id) {
    uni.setStorageSync(WISH_POPUP_KEY, String(wishPopup.data.id));
  }
  wishPopup.id = '';
}

function goWishDetail() {
  if (wishPopup.data && wishPopup.data.id) {
    uni.setStorageSync(WISH_POPUP_KEY, String(wishPopup.data.id));
  }
  wishPopup.visible = false;
  wishPopup.id = '';
  uni.navigateTo({ url: '/pages/wishlist/wishlist' });
}

function startSurpriseEffect(effect) {
  if (effect === 'none' || !effect) {
    surpriseParticles.value = [];
    return;
  }
  const emojiMap = { heart: '❤️', star: '✨', petal: '🌹', firework: '🎆' };
  const text = emojiMap[effect] || '❤️';
  const particles = [];
  for (let i = 0; i < 20; i++) {
    particles.push({
      text,
      style: {
        left: Math.random() * 100 + '%',
        animationDuration: 1.5 + Math.random() * 1.5 + 's',
        animationDelay: Math.random() * 1 + 's',
        fontSize: 0.8 + Math.random() * 0.8 + 'em'
      }
    });
  }
  surpriseParticles.value = particles;
}

async function closeSurprise() {
  surprise.visible = false;
  surpriseParticles.value = [];
  if (surprise.id) {
    try {
      await api.markSurpriseRead(surprise.id);
    } catch (e) {}
  }
  surprise.id = '';
}

const pairedDays = computed(() => {
  if (!couple.boundAt) return 1;
  const days = Math.floor((Date.now() - couple.boundAt) / (24 * 3600 * 1000));
  return Math.max(1, days);
});
const recommendDishes = computed(() => dishes.value.filter((d) => d.recommend).slice(0, 6));
const hotRankDishes = computed(() => [...dishes.value].sort((a, b) => b.sales - a.sales).slice(0, 5));
const gfActiveOrder = computed(() => orderStore.activeOrders[0] || null);

// 男友端
const bfActiveOrders = computed(() => orderStore.activeOrders);
const hasRestrictions = computed(() =>
  preference.allergens.length > 0 || preference.dislikes.length > 0 || preference.tastePrefs.length > 0
);
const stats = ref({ monthOrders: 0, totalSpent: 0, avgPerMeal: 0 });

function refreshSweet() {
  refreshing.value = true;
  sweetIdx.value += 1;
  dailySweet.value = getDailySweet(new Date(), sweetIdx.value);
  setTimeout(() => (refreshing.value = false), 600);
}

function onCoupleCardTap(e) {
  loveMode.value = couple.isGirlfriend ? 'heart' : 'star';
  lovePos.value = { x: e.touches[0].clientX, y: e.touches[0].clientY };
  loveRef.value?.burst();
}

function itemCount(o) {
  return o.items.reduce((a, b) => a + b.qty, 0);
}

function previewMyAvatar() {
  const url = couple.me && couple.me.avatar;
  if (!url) return;
  uni.previewImage({ urls: [resolveUrl(url)], current: resolveUrl(url) });
}

function previewPartnerAvatar() {
  const url = couple.partner && couple.partner.avatar;
  if (!url) return;
  uni.previewImage({ urls: [resolveUrl(url)], current: resolveUrl(url) });
}

async function fetchBfStats() {
  if (!couple.coupleId) return;
  try {
    const data = await api.monthlyStats(couple.coupleId);
    stats.value = data || { monthOrders: 0, totalSpent: 0, avgPerMeal: 0 };
  } catch (e) {
    stats.value = { monthOrders: 0, totalSpent: 0, avgPerMeal: 0 };
  }
}

function acceptOrder(id) {
  if (!requireLogin(couple)) return;
  orderStore.accept(id).then(() => toast.success('已接单，开工！'));
}
function rejectOrder(id) {
  if (!requireLogin(couple)) return;
  uni.showModal({
    title: '拒绝订单？',
    editable: true,
    placeholderText: '告诉' + couple.partnerDisplayName + '为什么暂时没法做（必填）',
    confirmText: '确认拒绝',
    cancelText: '再想想',
    confirmColor: '#E08B8B',
    success: (r) => {
      if (r.confirm && r.content) {
        orderStore.reject(id, r.content).then(() => toast.success('已拒绝'));
      }
    }
  });
}
function cookDone(id) {
  if (!requireLogin(couple)) return;
  orderStore.finish(id).then(() => toast.success('开饭啦，喊' + couple.partnerDisplayName + '来吃'));
}

function goMenu() {
  uni.reLaunch({ url: '/pages/menu/menu' });
}
function goCategory() {
  if (!requireLogin(couple)) return;
  uni.navigateTo({ url: '/pages/category/category' });
}
function goCat(catId) {
  uni.reLaunch({ url: `/pages/menu/menu?cat=${catId}` });
}
function goOrders() {
  uni.reLaunch({ url: '/pages/orders/orders' });
}
function goProfile() {
  uni.reLaunch({ url: '/pages/profile/profile' });
}
function goDetail(id) {
  uni.navigateTo({ url: '/pages/orders/detail?id=' + id });
}
function goDishDetail(id) {
  uni.navigateTo({ url: '/pages/dish/detail?id=' + id });
}
function goSurprise() {
  if (!requireLogin(couple)) return;
  uni.navigateTo({ url: '/pages/surprise/surprise' });
}

function openThemePicker() {
  if (!requireLogin(couple)) return;
  themeSheet.value = true;
}

async function onThemePick(key) {
  if (!requireLogin(couple)) return;
  themeSheet.value = false;
  if (key === '') {
    await couple.updateThemeColor('');
    toast.success('已恢复默认主题');
    return;
  }
  if (key === couple.currentThemeKey) return;
  await couple.updateThemeColor(key);
  toast.success(`已切换为${THEME_LABELS[key]}`);
}

function quickAdd(id) {
  if (!requireLogin(couple)) return;
  cart.add(id);
  toast.success('已加入小餐车');
}

function onCopyInvite() {
  if (!couple.inviteCode) return;
  copyText(couple.inviteCode, '邀请码已复制');
}

function refreshCouple() {
  couple.fetchFromServer(true).then(() => {
    if (couple.isPaired) {
      toast.success('配对成功');
    } else {
      toast.info('还在等待 TA');
    }
  }).catch(() => {
    toast.error('网络异常');
  });
}

onShow(() => {
  dishStore.init();
  // 进入首页强制刷新情侣资料，确保配对状态/头像/昵称及时互通
  const loadPromise = couple.fetchFromServer(true).catch(() => {});
  preference.fetchFromServer().catch(() => {});
  if (couple.isBoyfriend) {
    fetchBfStats();
  }
  // 女友端检查是否有男友发来的惊喜弹窗
  checkSurprise();
  // 男友端检查是否有女友新发的心愿单
  checkWishlistPopup();
  // 首次加载完成后关闭 loading
  if (firstLoading.value) {
    loadPromise.finally(() => { firstLoading.value = false; });
  }
});

// H5 使用页面级下拉刷新
// #ifndef MP-WEIXIN
onPullDownRefresh(() => {
  onRefresh().finally(() => uni.stopPullDownRefresh());
});
// #endif

async function onRefresh() {
  pullRefreshing.value = true;
  try {
    await Promise.all([
      couple.fetchFromServer(true),
      orderStore.fetchFromServer(true),
      dishStore.fetchAll(),
      preference.init(),
      addressStore.fetchFromServer()
    ]);
    if (couple.isBoyfriend) {
      await fetchBfStats();
    }
  } catch (e) {
    // ignore
  } finally {
    pullRefreshing.value = false;
  }
}
</script>

<style lang="scss" scoped>
.home-page {
  height: 100vh;
  display: flex;
  flex-direction: column;
}
.home-scroll {
  flex: 1;
  height: 0;
}
.nav-center {
  .nav-brand {
    font-size: 32rpx;
    font-weight: 700;
    color: #fff;
    letter-spacing: 2rpx;
  }
}
.nav-role {
  display: flex;
  align-items: center;
  background: rgba(255, 255, 255, 0.32);
  padding: 8rpx 20rpx;
  border-radius: $radius-pill;
  .role-text {
    font-size: 22rpx;
    color: #fff;
    font-weight: 600;
    margin-left: 6rpx;
  }
}
.nav-theme-btn {
  width: 64rpx;
  height: 64rpx;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.28);
  display: flex;
  align-items: center;
  justify-content: center;
  border: 2rpx solid rgba(255, 255, 255, 0.35);
  transition: transform 0.15s;
  &:active {
    transform: scale(0.92);
  }
}

/* 情侣卡 */
.couple-card {
  position: relative;
  margin: 20rpx 24rpx 0;
  padding: 36rpx 28rpx 32rpx;
  border-radius: $radius-lg;
  background: linear-gradient(135deg, $brand-primary 0%, $brand-primary-2 100%);
  box-shadow: $shadow-card;
  overflow: hidden;
  /* #ifndef MP-WEIXIN */
  animation: coupleCardEnter 0.5s cubic-bezier(0.25, 0.46, 0.45, 0.94) 0.1s both;
  /* #endif */
}
@keyframes coupleCardEnter {
  from { opacity: 0; transform: scale(0.95) translateY(20rpx); }
  to { opacity: 1; transform: scale(1) translateY(0); }
}
.couple-bg-deco {
  position: absolute;
  top: -40rpx;
  right: -40rpx;
  width: 200rpx;
  height: 200rpx;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.18);
}
.couple-top {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: space-between;
}
.avatar-wrap {
  display: flex;
  flex-direction: column;
  align-items: center;
  width: 200rpx;
}
.avatar {
  width: 120rpx;
  height: 120rpx;
  border-radius: 50%;
  border: 4rpx solid #fff;
  box-shadow: 0 4rpx 12rpx rgba(0, 0, 0, 0.1);
}
.emoji-avatar {
  width: 120rpx;
  height: 120rpx;
  border-radius: 50%;
  background: #fff;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 64rpx;
  border: 4rpx solid #fff;
  &.girl {
    background: linear-gradient(135deg, #fff, $brand-mango);
  }
  &.boy {
    background: linear-gradient(135deg, #fff, $bg-taro);
  }
}
.avatar-name {
  margin-top: 12rpx;
  font-size: 28rpx;
  font-weight: 700;
  color: #fff;
}
.avatar-tag {
  margin-top: 2rpx;
  font-size: 20rpx;
  color: rgba(255, 255, 255, 0.85);
}
.couple-link {
  display: flex;
  flex-direction: column;
  align-items: center;
  flex: 1;
  .link-heart {
    font-size: 40rpx;
  }
  .link-days {
    margin-top: 10px;
    margin-bottom: 10px;
    font-size: 22rpx;
    color: #fff;
    background: rgba(255, 255, 255, 0.25);
    padding: 4rpx 16rpx;
    border-radius: $radius-pill;
  }
}

.waiting-bar {
  margin: 20rpx 24rpx 0;
  background: var(--c-bg-alt, #fff);
  border-radius: $radius-lg;
  padding: 24rpx;
  display: flex;
  align-items: center;
  gap: 16rpx;
  box-shadow: $shadow-card;
  .wb-text {
    flex: 1;
    font-size: 26rpx;
    color: $text-1;
    font-weight: 600;
  }
  .wb-copy {
    padding: 8rpx;
    border-radius: $radius-pill;
    background: rgba(232, 184, 108, 0.12);
    display: flex;
    align-items: center;
    justify-content: center;
    transition: transform 0.15s;
    &:active {
      transform: scale(0.92);
    }
  }
  .wb-refresh {
    font-size: 24rpx;
    color: $brand-primary;
    font-weight: 600;
    padding: 8rpx 16rpx;
    background: rgba(245, 182, 193, 0.15);
    border-radius: $radius-pill;
  }
}

/* 每日情话彩蛋 */
.sweet-card {
  margin: 20rpx 24rpx 0;
  padding: 24rpx 28rpx;
  border-radius: $radius-lg;
  background: $bg-taro;
  display: flex;
  align-items: center;
  gap: 16rpx;
  box-shadow: $shadow-card;
}
.sweet-icon {
  width: 64rpx;
  height: 64rpx;
  border-radius: 50%;
  background: #fff;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}
.sweet-body {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 4rpx;
}
.sweet-title {
  font-size: 22rpx;
  color: $brand-taro;
  font-weight: 700;
}
.sweet-text {
  font-size: 28rpx;
  color: $text-1;
  font-weight: 600;
  line-height: 1.4;
}
.sweet-refresh {
  display: flex;
  align-items: center;
  gap: 6rpx;
  font-size: 22rpx;
  color: $brand-taro;
  flex-shrink: 0;
}

/* 快捷入口 */
.hero-entry {
  position: relative;
  margin: 20rpx 24rpx 0;
  padding: 32rpx 28rpx;
  border-radius: $radius-lg;
  background: linear-gradient(135deg, #fff 0%, $brand-cream 100%);
  display: flex;
  align-items: center;
  justify-content: space-between;
  box-shadow: $shadow-card;
  overflow: hidden;
  &.order-hero {
    background: linear-gradient(135deg, #fff 0%, $bg-taro 100%);
  }
}
.hero-left {
  flex: 1;
  display: flex;
  flex-direction: column;
}
.hero-title {
  font-size: 38rpx;
  font-weight: 800;
  color: $text-1;
}
.hero-sub {
  margin-top: 8rpx;
  font-size: 24rpx;
  color: $text-2;
}
.hero-btn {
  margin-top: 20rpx;
  align-self: flex-start;
  display: flex;
  align-items: center;
  gap: 6rpx;
  background: linear-gradient(135deg, $brand-primary, $brand-primary-2);
  color: #fff;
  font-size: 28rpx;
  font-weight: 700;
  padding: 14rpx 32rpx;
  border-radius: $radius-pill;
  box-shadow: $shadow-press;
}
.hero-emoji {
  font-size: 88rpx;
  margin-left: 16rpx;
}

/* section */
.section {
  margin: 32rpx 24rpx 0;
}
.sec-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 20rpx;
  .sec-title-row {
    display: flex;
    align-items: center;
    gap: 10rpx;
  }
  .sec-title {
    font-size: 34rpx;
    font-weight: 800;
    color: $text-1;
  }
  .sec-sub {
    font-size: 24rpx;
    color: $text-3;
  }
}

.empty-section {
  .empty-hint {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 28rpx 32rpx;
    background: var(--c-bg-alt, #FFF0F3);
    border-radius: $radius-lg;
    transition: all 0.2s;
    &:active {
      background: var(--c-bg-hover, #FBE7EC);
      transform: scale(0.98);
    }
    .eh-left {
      display: flex;
      align-items: center;
      gap: 16rpx;
      flex: 1;
    }
    .empty-hint-icon {
      font-size: 44rpx;
    }
    .eh-texts {
      display: flex;
      flex-direction: column;
      gap: 4rpx;
    }
    .empty-hint-text {
      font-size: 28rpx;
      font-weight: 600;
      color: $text-1;
    }
    .empty-hint-sub {
      font-size: 24rpx;
      color: $text-3;
    }
    .eh-arrow {
      width: 56rpx;
      height: 56rpx;
      display: flex;
      align-items: center;
      justify-content: center;
      background: var(--c-primary, #F5B6C1);
      border-radius: 50%;
    }
    .empty-hint-arrow {
      font-size: 28rpx;
      color: #fff;
      font-weight: 600;
    }
  }
}

/* 6 大分类 */
.cat-grid {
  display: flex;
  flex-wrap: wrap;
  gap: 20rpx 0;
  // background: var(--c-bg-alt, #fff);
  border-radius: $radius-lg;
  padding: 28rpx 0;
  box-shadow: $shadow-card;
}
.cat-entry {
  width: 33.33%;
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 8rpx 0;
}
.cat-emoji {
  width: 96rpx;
  height: 96rpx;
  border-radius: 50%;
  background: linear-gradient(135deg, $bg-surface-alt, #fff);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 48rpx;
  box-shadow: inset 0 0 0 2rpx rgba(245, 182, 193, 0.18);
}
.cat-label {
  margin-top: 12rpx;
  font-size: 26rpx;
  color: $text-1;
  font-weight: 600;
}
.cat-desc {
  margin-top: 2rpx;
  font-size: 18rpx;
  color: $text-3;
}

/* 分类空状态 */
.empty-hint {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12rpx;
  padding: 40rpx 32rpx;
  background: var(--c-bg-alt, #FFF0F3);
  border-radius: $radius-lg;
  box-shadow: $shadow-card;
  transition: transform 0.15s;
  &:active {
    transform: scale(0.98);
  }
  .empty-emoji {
    font-size: 64rpx;
    opacity: 0.7;
  }
  .empty-title {
    font-size: 28rpx;
    font-weight: 600;
    color: $text-2;
  }
  .empty-desc {
    font-size: 24rpx;
    color: $text-3;
  }
  .empty-btn {
    margin-top: 8rpx;
    padding: 12rpx 36rpx;
    background: var(--c-primary, #F5B6C1);
    border-radius: $radius-pill;
    text {
      font-size: 26rpx;
      font-weight: 600;
      color: #fff;
    }
  }
}

/* 推荐 */
.rec-scroll {
  width: 100%;
  white-space: nowrap;
}
.rec-list {
  display: inline-flex;
  gap: 20rpx;
  padding: 4rpx;
}
.rec-card {
  position: relative;
  width: 240rpx;
  background: var(--c-bg-alt, #fff);
  border-radius: $radius-md;
  padding: 12rpx;
  box-shadow: $shadow-card;
  display: inline-flex;
  flex-direction: column;
  vertical-align: top;
}
.rec-img-wrap {
  width: 216rpx;
  height: 160rpx;
  border-radius: $radius-sm;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  .rec-img {
    width: 100%;
    height: 100%;
  }
  .rec-emoji {
    font-size: 64rpx;
  }
}
.rec-badge {
  position: absolute;
  top: 20rpx;
  left: 20rpx;
  background: $brand-primary;
  color: #fff;
  font-size: 18rpx;
  font-weight: 700;
  width: 32rpx;
  height: 32rpx;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
}
.rec-name {
  margin-top: 12rpx;
  font-size: 26rpx;
  font-weight: 600;
  color: $text-1;
}
.rec-bottom {
  margin-top: 8rpx;
  display: flex;
  align-items: center;
  justify-content: space-between;
}
.rec-spacer {
  flex: 1;
}
.rec-add {
  width: 44rpx;
  height: 44rpx;
  border-radius: 50%;
  background: linear-gradient(135deg, $brand-primary, $brand-primary-2);
  color: #fff;
  font-size: 34rpx;
  font-weight: 600;
  display: flex;
  align-items: center;
  justify-content: center;
  line-height: 1;
}

/* 榜单 */
.rank-list {
  background: var(--c-bg-alt, #fff);
  border-radius: $radius-lg;
  padding: 8rpx 24rpx;
  box-shadow: $shadow-card;
}
.rank-item {
  display: flex;
  align-items: center;
  padding: 24rpx 0;
  border-bottom: 1rpx solid $divider;
  &:last-child {
    border-bottom: none;
  }
}
.rank-no {
  width: 48rpx;
  height: 48rpx;
  border-radius: 12rpx;
  background: $bg-surface-alt;
  color: $text-3;
  font-size: 28rpx;
  font-weight: 800;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  &.no-1 {
    background: linear-gradient(135deg, $brand-primary, $brand-primary-2);
    color: #fff;
  }
  &.no-2 {
    background: linear-gradient(135deg, $brand-accent, $brand-taro);
    color: #fff;
  }
  &.no-3 {
    background: linear-gradient(135deg, $brand-mango, #FFD180);
    color: #fff;
  }
}
.rank-emoji {
  margin: 0 20rpx;
}
.rank-img-wrap {
  width: 88rpx;
  height: 88rpx;
  border-radius: $radius-md;
  margin: 0 20rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  flex-shrink: 0;
  .rank-img {
    width: 100%;
    height: 100%;
  }
  .rank-emoji-text {
    font-size: 48rpx;
  }
}
.rank-info {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 6rpx;
}
.rank-name {
  font-size: 28rpx;
  font-weight: 700;
  color: $text-1;
}
.rank-sales {
  font-size: 20rpx;
  color: $text-3;
}
.rank-add {
  width: 56rpx;
  height: 56rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, $brand-primary, $brand-primary-2);
  border-radius: 50%;
  font-weight: 600;
  flex-shrink: 0;
}

/* ========== 男友端专属样式 ========== */
.warning-card {
  margin: 20rpx 24rpx 0;
  padding: 28rpx;
  border-radius: $radius-lg;
  background: linear-gradient(135deg, #fff 0%, rgba(224, 139, 139, 0.1) 100%);
  box-shadow: $shadow-card;
  border: 2rpx solid rgba(224, 139, 139, 0.2);
}
.wc-head {
  display: flex;
  align-items: center;
  gap: 12rpx;
  margin-bottom: 20rpx;
}
.wc-icon {
  font-size: 36rpx;
}
.wc-title {
  font-size: 30rpx;
  font-weight: 800;
  color: $text-1;
}
.wc-body {
  display: flex;
  flex-direction: column;
  gap: 16rpx;
}
.wc-row {
  display: flex;
  align-items: flex-start;
  gap: 16rpx;
}
.wc-label {
  width: 120rpx;
  font-size: 24rpx;
  color: $text-3;
  flex-shrink: 0;
  margin-top: 6rpx;
  &.danger {
    color: $color-danger;
    font-weight: 700;
  }
  &.warning {
    color: $color-warning;
    font-weight: 700;
  }
}
.wc-chips {
  flex: 1;
  display: flex;
  flex-wrap: wrap;
  gap: 12rpx;
}
.wc-chip {
  padding: 8rpx 20rpx;
  background: $bg-surface-alt;
  border-radius: $radius-pill;
  font-size: 24rpx;
  color: $text-2;
  &.danger {
    background: rgba(224, 139, 139, 0.15);
    color: $color-danger;
  }
  &.warning {
    background: rgba(232, 184, 108, 0.15);
    color: $color-warning;
  }
}
.wc-empty {
  font-size: 26rpx;
  color: $text-3;
}

.empty-card {
  background: var(--c-bg-alt, #fff);
  border-radius: $radius-lg;
  padding: 48rpx 28rpx;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8rpx;
  box-shadow: $shadow-card;
  .ec-icon {
    font-size: 64rpx;
  }
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

.order-card {
  background: var(--c-bg-alt, #fff);
  border-radius: $radius-lg;
  padding: 28rpx;
  margin-bottom: 20rpx;
  box-shadow: $shadow-card;
}
.oc-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
}
.oc-no {
  font-size: 24rpx;
  color: $text-3;
}
.oc-status {
  font-size: 26rpx;
  font-weight: 700;
}
.oc-sweet {
  margin-top: 14rpx;
  padding: 12rpx 16rpx;
  background: linear-gradient(135deg, #fff, $bg-taro);
  border-radius: $radius-md;
  display: flex;
  align-items: center;
  gap: 10rpx;
  .oc-sweet-text {
    flex: 1;
    font-size: 24rpx;
    color: $brand-taro;
  }
}
.oc-items {
  margin: 20rpx 0;
  padding: 20rpx 0;
  border-top: 1rpx solid $divider;
  border-bottom: 1rpx solid $divider;
  .oc-item-text {
    font-size: 28rpx;
    color: $text-1;
    font-weight: 600;
    display: block;
  }
  .oc-count {
    margin-top: 8rpx;
    font-size: 22rpx;
    color: $text-3;
    display: block;
  }
}
.oc-actions {
  display: flex;
  justify-content: flex-end;
  gap: 16rpx;
}
.oc-btn {
  padding: 14rpx 32rpx;
  border-radius: $radius-pill;
  font-size: 26rpx;
  font-weight: 600;
  &.ghost {
    border: 2rpx solid $border-1;
    color: $text-2;
  }
  &.primary {
    background: linear-gradient(135deg, $brand-primary, $brand-primary-2);
    color: #fff;
    box-shadow: $shadow-press;
  }
  &.done {
    background: $bg-surface-alt;
    color: $text-3;
  }
}

.stat-grid {
  display: flex;
  gap: 20rpx;
}
.stat-card {
  flex: 1;
  background: var(--c-bg-alt, #fff);
  border-radius: $radius-lg;
  padding: 28rpx;
  display: flex;
  flex-direction: column;
  align-items: center;
  box-shadow: $shadow-card;
  .sc-num {
    font-size: 40rpx;
    font-weight: 800;
    color: $brand-primary;
  }
  .sc-label {
    margin-top: 8rpx;
    font-size: 24rpx;
    color: $text-3;
  }
}

.entry-list {
  display: flex;
  flex-direction: column;
  gap: 20rpx;
}
.entry-card {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 28rpx;
  background: var(--c-bg-alt, #fff);
  border-radius: $radius-lg;
  box-shadow: $shadow-card;
  .ec-left {
    display: flex;
    align-items: center;
    gap: 16rpx;
    flex: 1;
    min-width: 0;
    .ec-icon {
      font-size: 40rpx;
      flex-shrink: 0;
    }
    .ec-body {
      flex: 1;
      min-width: 0;
      display: flex;
      flex-direction: column;
      gap: 4rpx;
      .ec-title {
        font-size: 28rpx;
        font-weight: 700;
        color: $text-1;
      }
      .ec-sub {
        font-size: 22rpx;
        color: $text-3;
      }
    }
  }
}

.foot-tip {
  text-align: center;
  margin: 40rpx 0 20rpx;
  font-size: 22rpx;
  color: $text-4;
}
.tab-holder {
  height: 140rpx;
}

/* 男友端发来的惊喜弹窗 */
.surprise-mask {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: 2000;
  background: rgba(0, 0, 0, 0.6);
  display: flex;
  align-items: center;
  justify-content: center;
}
.surprise-box {
  width: 86%;
  max-width: 600rpx;
  min-height: 500rpx;
  border-radius: 32rpx;
  position: relative;
  overflow: hidden;
  background: linear-gradient(135deg, var(--c-bg-page, #FFF8F2), var(--c-bg-alt, #FFE8EE));
  display: flex;
  align-items: center;
  justify-content: center;
}
.surprise-effect-layer {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  pointer-events: none;
  overflow: hidden;
}
.surprise-particle {
  position: absolute;
  top: -40rpx;
  animation: surpriseFall 2.5s ease-in forwards;
}
@keyframes surpriseFall {
  0% { transform: translateY(0) rotate(0deg); opacity: 1; }
  100% { transform: translateY(800rpx) rotate(360deg); opacity: 0; }
}
.surprise-content {
  position: relative;
  z-index: 1;
  padding: 48rpx 40rpx;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 20rpx;
}
.surprise-emoji {
  font-size: 80rpx;
}
.surprise-title {
  font-size: 40rpx;
  font-weight: 800;
  color: $text-1;
}
.surprise-text {
  font-size: 28rpx;
  color: $text-2;
  line-height: 1.6;
  text-align: center;
}
.surprise-close {
  margin-top: 20rpx;
  padding: 20rpx 48rpx;
  background: linear-gradient(135deg, $brand-primary, $brand-primary-2);
  border-radius: $radius-pill;
  color: #fff;
  font-size: 28rpx;
  font-weight: 700;
  box-shadow: $shadow-press;
}

/* 女友端心愿单弹窗（仅男友端可见） */
.wish-mask {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: 2001;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
}
.wish-popup {
  width: 84%;
  max-width: 560rpx;
  padding: 44rpx 36rpx 36rpx;
  border-radius: 32rpx;
  background: var(--c-bg-page, #fff);
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 16rpx;
  box-shadow: 0 24rpx 60rpx rgba(0, 0, 0, 0.2);
  animation: wishPopIn 0.26s ease-out;
}
@keyframes wishPopIn {
  0% { transform: scale(0.9); opacity: 0; }
  100% { transform: scale(1); opacity: 1; }
}
.wp-deco {
  width: 120rpx;
  height: 120rpx;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, var(--c-primary, #F5B6C1), var(--c-primary-2, #FFD6DD));
  box-shadow: 0 8rpx 24rpx rgba(0, 0, 0, 0.1);
}
.wp-emoji {
  font-size: 64rpx;
}
.wp-label {
  font-size: 26rpx;
  color: $text-3;
}
.wp-title {
  font-size: 36rpx;
  font-weight: 800;
  color: $text-1;
  text-align: center;
}
.wp-desc {
  font-size: 26rpx;
  color: $text-2;
  line-height: 1.5;
  text-align: center;
  max-height: 120rpx;
  overflow: hidden;
}
.wp-btns {
  width: 100%;
  margin-top: 16rpx;
  display: flex;
  gap: 20rpx;
}
.wp-btn {
  flex: 1;
  padding: 22rpx 0;
  border-radius: $radius-pill;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 28rpx;
  font-weight: 700;
  &.ghost {
    background: $bg-surface-alt;
    color: $text-3;
  }
  &.primary {
    background: linear-gradient(135deg, var(--c-primary, #F5B6C1), var(--c-primary-2, #FFD6DD));
    color: #fff;
  }
}

/* 自定义弹层 */
.sheet-mask {
  position: fixed;
  inset: 0;
  z-index: 1100;
  background: rgba(74, 40, 60, 0.45);
  display: flex !important;
  align-items: flex-end;
  justify-content: center;
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
.sheet-popup {
  width: 100%;
  background: var(--c-bg-page, #fff);
  border-top-left-radius: 40rpx;
  border-top-right-radius: 40rpx;
  padding: 32rpx 28rpx;
  padding-bottom: calc(16px + env(safe-area-inset-bottom));
  transform: translateY(100%);
  transition: transform 0.25s ease-out;
}
.sheet-mask.show .sheet-popup {
  transform: translateY(0);
}
.sp-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 24rpx;
}
.sp-title {
  font-size: 36rpx;
  font-weight: 800;
  color: #4A3F44;
}
.sp-close {
  width: 56rpx;
  height: 56rpx;
  border-radius: 50%;
  background: #FFF0F3;
  display: flex;
  align-items: center;
  justify-content: center;
}
.sp-list {
  height: 70vh;
  max-height: 800rpx;
}
.sp-item {
  padding: 28rpx 24rpx;
  border-bottom: 2rpx solid #FAEEF2;
  font-size: 30rpx;
  color: #4A3F44;
  &:active {
    background: #FBE7EC;
  }
  &:last-child {
    border-bottom: none;
  }
}
</style>
