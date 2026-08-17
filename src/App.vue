<script setup>
import { onLaunch, onShow, onHide } from '@dcloudio/uni-app';
import { useCartStore } from './store/cart';
import { useOrderStore } from './store/order';
import { useAddressStore } from './store/address';
import { useCoupleStore } from './store/couple';
import { usePreferenceStore } from './store/preference';
import { useDishStore } from './store/dish';
import { pollManager } from './utils/sync';
import { applyFontFamily } from './utils/theme';

onLaunch(() => {
  // 初始化所有持久化数据
  const cart = useCartStore();
  const order = useOrderStore();
  const address = useAddressStore();
  const couple = useCoupleStore();
  const preference = usePreferenceStore();
  const dish = useDishStore();
  cart.init();
  order.init();
  address.init();
  couple.init();
  preference.init();
  dish.init();

  // 同步字体变量到全局，保证切换后立即生效
  applyFontFamily(couple.fontFamily);

  // 路由守卫：未登录 → 登录页；已登录未配对 → 配对页
  const currentPages = getCurrentPages();
  const currentRoute = currentPages.length ? '/' + currentPages[currentPages.length - 1].route : '';
  const isAuthPage = ['/pages/login/login', '/pages/register/register', '/pages/pairing/pairing'].includes(currentRoute);

  if (!couple.isLoggedIn && !couple.isDemo) {
    // 未登录(非游客模式)，跳登录页（除非已在登录/注册页）
    if (!isAuthPage) {
      uni.reLaunch({ url: '/pages/login/login' });
    }
  } else if (!couple.coupleId && !couple.isDemo) {
    // 已登录但未配对，跳配对页（除非已在认证页）
    if (!isAuthPage) {
      uni.reLaunch({ url: '/pages/pairing/pairing' });
    }
  } else if (isAuthPage && (couple.isLoggedIn || couple.isDemo) && (couple.coupleId || couple.isDemo)) {
    // 已登录/游客模式且已配对，但在认证页 → 跳首页
    uni.reLaunch({ url: '/pages/index/index' });
  }

  // 轮询由各页面通过 usePoll 按需启动，App 层不再全局 start
});

onShow(() => {
  // 应用回到前台时恢复有订阅者的通道
  pollManager.resumeAll();
});

onHide(() => {
  // 应用切后台时暂停所有轮询，节省资源
  pollManager.pauseAll();
});
</script>

<style lang="scss">
/* #ifndef APP-NVUE */
page {
  /* ─── 女友端暖色系（默认）─── */
  --c-primary: #F5B6C1;
  --c-primary-2: #FFD6DD;
  --c-primary-dark: #E89AA8;
  --c-accent: #C8B6D9;
  --c-taro: #B8A2C7;
  --c-mango: #FFE5B4;
  --c-cream: #FFF1E5;
  --c-bg-page: #FFF8F2;
  --c-bg-alt: #FFF0F3;
  --c-bg-hover: #FBE7EC;
  --c-bg-taro: #F4EEF8;
  --c-border: #F2E1E6;
  --c-divider: #FAEEF2;
  /* 标签类型颜色（语义色，跨主题保持一致） */
  --c-tag-selected-bg: rgba(184, 162, 199, 0.15);
  --c-tag-selected-color: #7b6ba3;
  --c-tag-selected-border: #7b6ba3;
  --c-tag-warn-bg: rgba(224, 139, 139, 0.15);
  --c-tag-warn-color: #c06868;
  --c-tag-warn-border: #c06868;
  --c-tag-dislike-bg: rgba(230, 180, 140, 0.15);
  --c-tag-dislike-color: #b87333;
  --c-tag-dislike-border: #b87333;
  --c-tag-info-bg: #e3f4ed;
  --c-tag-info-color: #7fc4ac;
  --c-tag-info-border: #7fc4ac;
  /* 默认字体变量，页面根节点可通过内联 style 覆盖 */
  --app-font-family: -apple-system, BlinkMacSystemFont, 'PingFang SC', 'Helvetica Neue', 'Microsoft YaHei', sans-serif;

  /* ─── nutui-uniapp 主题变量映射（跟随项目主题色运行时切换）─── */
  --nut-primary-color: var(--c-primary);
  --nut-primary-color-end: var(--c-primary-2);
  --nut-title-color: #4A3F44;
  --nut-title-color2: #7A6D73;
  --nut-text-color: #A89DA3;
  --nut-disable-color: #D8CFD3;
  --nut-white: #fff;
  --nut-black: #000;
  --nut-required-color: var(--c-primary-dark);
  --nut-font-family: var(--app-font-family);
  --nut-button-border-radius: 999rpx;
  --nut-button-default-bg-color: #fff;
  --nut-button-default-color: #7A6D73;
  --nut-button-default-border-color: var(--c-border);
  --nut-button-primary-background-color: var(--c-primary);
  --nut-button-primary-border-color: var(--c-primary);
  --nut-button-primary-color: #fff;
  --nut-popup-z-index: 1100;

  background-color: $bg-page;
  color: $text-1;
  font-size: 28rpx;
  line-height: 1.55;
  -webkit-font-smoothing: antialiased;
}
/* #endif */

/* H5 通过 documentElement 修改变量即可全局生效 */
/* #ifndef MP-WEIXIN */
page {
  font-family: var(--app-font-family);
}
/* #endif */

/* 小程序中 page 选择器的 CSS 变量无法被动态覆盖，
   让元素继承最近父元素（view.page）的 font-family，
   这样每个页面根节点上的动态字体才能作用到内部文字 */
/* #ifdef MP-WEIXIN */
page {
  font-family: inherit;
}
text,
view,
input,
textarea,
button,
scroll-view,
image {
  font-family: inherit;
}
/* #endif */

/* H5 页面根节点同步字体变量 */
/* #ifdef H5 */
body {
  --app-font-family: -apple-system, BlinkMacSystemFont, 'PingFang SC', 'Helvetica Neue', 'Microsoft YaHei', sans-serif;
  font-family: var(--app-font-family);
}
/* #endif */

/* ─── 女友端暖色系（通过 .gf-theme 注入，与 .bf-theme 对称）─── */
.gf-theme {
  --c-primary: #F5B6C1;
  --c-primary-2: #FFD6DD;
  --c-primary-dark: #E89AA8;
  --c-accent: #C8B6D9;
  --c-taro: #B8A2C7;
  --c-mango: #FFE5B4;
  --c-cream: #FFF1E5;
  --c-bg-page: #FFF8F2;
  --c-bg-alt: #FFF0F3;
  --c-bg-hover: #FBE7EC;
  --c-bg-taro: #F4EEF8;
  --c-border: #F2E1E6;
  --c-divider: #FAEEF2;
  --c-tag-selected-bg: rgba(184, 162, 199, 0.15);
  --c-tag-selected-color: #7b6ba3;
  --c-tag-selected-border: #7b6ba3;
  --c-tag-warn-bg: rgba(224, 139, 139, 0.15);
  --c-tag-warn-color: #c06868;
  --c-tag-warn-border: #c06868;
  --c-tag-dislike-bg: rgba(230, 180, 140, 0.15);
  --c-tag-dislike-color: #b87333;
  --c-tag-dislike-border: #b87333;
  --c-tag-info-bg: #e3f4ed;
  --c-tag-info-color: #7fc4ac;
  --c-tag-info-border: #7fc4ac;
  --nut-primary-color: var(--c-primary);
  --nut-primary-color-end: var(--c-primary-2);
  --nut-title-color: #4A3F44;
  --nut-title-color2: #7A6D73;
  --nut-text-color: #A89DA3;
  --nut-disable-color: #D8CFD3;
  --nut-white: #fff;
  --nut-black: #000;
  --nut-required-color: var(--c-primary-dark);
  --nut-font-family: var(--app-font-family);
  --nut-button-border-radius: 999rpx;
  --nut-button-default-bg-color: #fff;
  --nut-button-default-color: #7A6D73;
  --nut-button-default-border-color: var(--c-border);
  --nut-button-primary-background-color: var(--c-primary);
  --nut-button-primary-border-color: var(--c-primary);
  --nut-button-primary-color: #fff;
  --nut-popup-z-index: 1100;
}

/* ─── 男友端冷色系（通过 .bf-theme 覆盖）─── */
.bf-theme {
  --c-primary: #7BA5D9;       // 主色：雾霾蓝（沉稳温柔）
  --c-primary-2: #A8C8E8;     // 渐变次色：浅蓝
  --c-primary-dark: #5A8BC4;  // 深蓝（按压态/强调）
  --c-accent: #8BB8D0;        // 浅青蓝（点缀）
  --c-taro: #6A9BC0;          // 深青蓝
  --c-mango: #B8D4E8;         // 冷灰蓝（替代米黄）
  --c-cream: #EBF2F9;         // 冷白
  --c-bg-page: #F0F5FA;       // 页面底色（冷白）
  --c-bg-alt: #E8F0F8;        // 次级卡片（淡蓝底）
  --c-bg-hover: #DDE8F2;      // 按压底
  --c-bg-taro: #E8F0F8;       // 蓝底
  --c-border: #D8E4F0;        // 边框（淡蓝灰）
  --c-divider: #E0EAF2;       // 分割线
  --c-tag-selected-bg: rgba(123, 165, 217, 0.15);
  --c-tag-selected-color: #5A8BC4;
  --c-tag-selected-border: #5A8BC4;
  --c-tag-warn-bg: rgba(224, 139, 139, 0.15);
  --c-tag-warn-color: #c06868;
  --c-tag-warn-border: #c06868;
  --c-tag-dislike-bg: rgba(230, 180, 140, 0.15);
  --c-tag-dislike-color: #b87333;
  --c-tag-dislike-border: #b87333;
  --c-tag-info-bg: rgba(100, 180, 170, 0.15);
  --c-tag-info-color: #4A9B8E;
  --c-tag-info-border: #4A9B8E;
  --nut-primary-color: var(--c-primary);
  --nut-primary-color-end: var(--c-primary-2);
  --nut-title-color: #4A3F44;
  --nut-title-color2: #7A6D73;
  --nut-text-color: #A89DA3;
  --nut-disable-color: #D8CFD3;
  --nut-white: #fff;
  --nut-black: #000;
  --nut-required-color: var(--c-primary-dark);
  --nut-font-family: var(--app-font-family);
  --nut-button-border-radius: 999rpx;
  --nut-button-default-bg-color: #fff;
  --nut-button-default-color: #7A6D73;
  --nut-button-default-border-color: var(--c-border);
  --nut-button-primary-background-color: var(--c-primary);
  --nut-button-primary-border-color: var(--c-primary);
  --nut-button-primary-color: #fff;
  --nut-popup-z-index: 1100;
}

view,
text,
button,
input,
textarea,
scroll-view,
image {
  box-sizing: border-box;
}

/* 全局字体平滑渲染 */
text {
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  text-rendering: optimizeLegibility;
}



/* 全局按钮重置（排除 nutui 组件，避免影响其内部样式） */
button:not(.nut-button) {
  margin: 0;
  padding: 0;
  background: transparent;
  line-height: inherit;
  border-radius: 0;
  font-size: inherit;
  &::after {
    border: none;
  }
}

/* 全局工具类 */
.flex {
  display: flex;
}
.flex-center {
  display: flex;
  align-items: center;
  justify-content: center;
}
.flex-between {
  display: flex;
  align-items: center;
  justify-content: space-between;
}
.flex-1 {
  flex: 1;
  min-width: 0;
}
.ellipsis {
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
}
.ellipsis-2 {
  display: -webkit-box;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
  overflow: hidden;
}

/* 页面通用容器 */
.page {
  min-height: 100vh;
  background-color: $bg-page;
  font-family: var(--app-font-family, -apple-system, BlinkMacSystemFont, "Helvetica Neue", "PingFang SC", "Microsoft YaHei", sans-serif);
}
/* #ifndef MP-WEIXIN */
.page {
  animation: pageEnter 0.4s ease-out;
}
@keyframes pageEnter {
  from { opacity: 0; }
  to { opacity: 1; }
}

/* 区块入场动画（错落感）：仅在 H5 启用，小程序端禁用以避免卡顿 */
.section {
  animation: sectionEnter 0.4s ease-out backwards;
}
.section:nth-child(1) { animation-delay: 0.05s; }
.section:nth-child(2) { animation-delay: 0.12s; }
.section:nth-child(3) { animation-delay: 0.19s; }
.section:nth-child(4) { animation-delay: 0.26s; }
.section:nth-child(5) { animation-delay: 0.33s; }
@keyframes sectionEnter {
  from { opacity: 0; }
  to { opacity: 1; }
}
/* #endif */

/* 卡片通用按压反馈 */
.entry-card,
.rank-item,
.fav-card,
.rec-card,
.history-card,
.mode-tab,
.fx-btn,
.tpl-chip,
.emoji-cell,
.opt-chip,
.bg-chip,
.cat-entry,
.couple-card,
.sweet-card,
.hero-entry,
.order-card,
.stat-card,
.addr-item,
.bf-dish-item,
.custom-entry,
.cat-item,
.table-cell,
.memory-card,
.dish-card {
  transition: transform 0.15s ease, box-shadow 0.15s ease, background-color 0.2s ease;
  &:active {
    transform: scale(0.96);
  }
}

/* 按钮通用按压反馈 */
.btn,
.send-btn,
.ab-btn,
.rate-btn,
.submit-btn,
.oc-btn,
.p-btn,
.rec-add,
.rank-add,
.add-btn,
.wp-btn,
.surprise-close,
.wb-refresh,
.nav-role,
.upload-btn,
.confirm-btn,
.save-btn,
.dialog-btn,
.checkout-btn,
.server-btn,
.about-btn,
.del-btn,
.del-link,
.back-icon,
.close-btn,
.sp-close,
.modal-close,
.rp-close,
.cart-icon,
.nav-action,
.nav-right,
.nav-btn,
.r-btn,
.step-btn,
.cd-clear,
.minus-btn,
.fav-btn,
.note-btn,
.fav-fav,
.tab {
  transition: transform 0.12s ease, opacity 0.12s ease;
  &:active {
    transform: scale(0.97);
    opacity: 0.9;
  }
}

/* 标签/选项卡状态切换过渡（选中/取消选中平滑过渡） */
.qr-tag,
.sweet-tag,
.time-tab,
.seg-item,
.qn-chip,
.wc-chip,
.action,
.chip,
.edit-btn,
.add-chip,
.tag-opt,
.spicy-chip,
.sp-item,
.bf-cook-badge {
  transition: background-color 0.2s ease, border-color 0.2s ease, color 0.2s ease, transform 0.15s ease, opacity 0.15s ease;
  &:active {
    transform: scale(0.95);
  }
}

/* 区块标题装饰条：所有 sec-title 前统一加竖条（含 sec-title-row 内的标题） */
.sec-head .sec-title,
.sec-head > .sec-title {
  position: relative;
  display: inline-block;
  padding-left: 20rpx;
  &::before {
    content: '';
    position: absolute;
    left: 0;
    top: 50%;
    transform: translateY(-50%);
    width: 8rpx;
    height: 32rpx;
    border-radius: $radius-pill;
    background: linear-gradient(180deg, var(--c-primary, #F5B6C1), var(--c-primary-2, #FFD6DD));
  }
}
/* sec-title-row 内标题左侧已有图标，竖条放在标题前留 12rpx 间距 */
.sec-title-row .sec-title {
  padding-left: 20rpx;
  &::before {
    left: 0;
  }
}

/* 全局「查看更多 / 查看全部 / 更多」统一按钮 */
.sec-more {
  display: inline-flex;
  align-items: center;
  gap: 6rpx;
  padding: 10rpx 20rpx;
  font-size: 24rpx;
  font-weight: 600;
  line-height: 1;
  color: var(--c-primary-dark, #E89AA8);
  border-radius: 999rpx;
  .app-icon {
    font-size: 22rpx;
    color: var(--c-primary-dark, #E89AA8);
  }
  &:active {
    opacity: 0.8;
    transform: scale(0.96);
  }
}
.bf-theme .sec-more {
  color: var(--c-primary-dark, #5A8BC4);
  .app-icon {
    color: var(--c-primary-dark, #5A8BC4);
  }
}

/* 安全区域占位 */
.safe-bottom {
  padding-bottom: constant(safe-area-inset-bottom);
  padding-bottom: env(safe-area-inset-bottom);
}

/* 全局隐藏滚动条 */
::-webkit-scrollbar {
  display: none;
  width: 0;
  height: 0;
}
/* uni-app scroll-view 隐藏滚动条 (H5) */
uni-scroll-view .uni-scroll-view-scrollbar {
  display: none !important;
}

/* H5: 隐藏 uni-app 页面异步加载的默认 loading，统一使用各页面 PageLoading，避免双初始化 loading */
.uni-async-loading {
  display: none !important;
}

/* H5: 页面初始化时 body/uni-page-body 的背景会透出造成"loading 背景"错觉，改为透明由 .page 接管 */
body,
uni-page-body {
  background-color: transparent !important;
}

/* H5: 确保 ActionSheet / PreviewImage 遮罩和面板在自定义弹窗(z-index:1100)之上 */
.uni-actionsheet,
.uni-actionsheet__box,
.uni-actionsheet__cell,
.uni-actionsheet__menu,
.uni-actionsheet__action,
.uni-preview-image,
.uni-preview-image__box,
.uni-preview-image__img,
.uni-preview-image__close,
uni-actionsheet,
uni-preview-image {
  z-index: 2001 !important;
}

/* 美化 ActionSheet 样式，与全局主题一致 */
.uni-actionsheet__box {
  border-top-left-radius: 24px !important;
  border-top-right-radius: 24px !important;
  overflow: hidden !important;
}
.uni-actionsheet__cell {
  font-size: 16px !important;
  color: #4A3F44 !important;
  padding: 16px 24px !important;
  &:active {
    background: #FBE7EC !important;
  }
}
.uni-actionsheet__action {
  border-top-left-radius: 24px !important;
  border-top-right-radius: 24px !important;
  margin-top: 8px !important;
  .uni-actionsheet__cell {
    color: #999 !important;
    font-weight: 600 !important;
  }
}
// #ifdef MP-WEIXIN
.foot-tip {
  margin-bottom: 70rpx !important;
}
// #endif
</style>
