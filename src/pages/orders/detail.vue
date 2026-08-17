<template>
  <view class="page detail-page" :class="couple.themeClass" :style="couple.themeStyle">
    <NavBar title="订单详情" :show-back="true" />
    <PageLoading :visible="firstLoading" @timeout="firstLoading = false" />

    <view v-if="order" v-show="!firstLoading">
    <!-- 状态头部（奶粉粉 / 芋紫暖色渐变，不用刺眼色） -->
    <view class="status-header" :style="{ background: statusGradient }">
      <view class="status-row">
        <AppIcon class="status-icon" :name="statusIconName" size="56" color="#fff" />
        <view class="status-text">
          <text class="status-name">{{ statusMap[order.status].text }}</text>
          <text class="status-tip">{{ statusTip }}</text>
        </view>
      </view>
      <!-- 进度时间线 -->
      <view class="timeline">
        <view
          v-for="(t, i) in timeline"
          :key="i"
          class="tl-item"
          :class="{ done: t.done, last: i === timeline.length - 1 }"
        >
          <view class="tl-dot" />
          <view v-if="i !== timeline.length - 1" class="tl-line" />
          <view class="tl-content">
            <text class="tl-label">{{ t.label }}</text>
            <text v-if="t.time" class="tl-time">{{ formatTime(t.time) }}</text>
          </view>
        </view>
      </view>
    </view>

    <!-- 男友拒绝理由 + 安抚文案（防吵架规则） -->
    <view v-if="order.status === 5 && order.rejectReason" class="card reject-card">
      <view class="reject-head">
        <AppIcon name="pray" size="36" color="#E08B8B" />
        <text class="rh-title">{{ couple.partnerDisplayName }}这次没法做</text>
      </view>
      <view class="reject-reason">
        <text class="rr-label">{{ couple.partnerDisplayName }}的理由</text>
        <text class="rr-text">{{ order.rejectReason }}</text>
      </view>
      <view class="reject-soothe">
        <AppIcon name="heartOutline" size="28" color="#B8A2C7" />
        <text class="rs-text">{{ rejectSootheText }}</text>
      </view>
    </view>

    <!-- 撒娇小留言展示 -->
    <view v-if="order.sweetNote" class="card sweet-show-card">
      <view class="ss-head">
        <AppIcon name="envelope" size="30" color="#B8A2C7" />
        <text class="ss-title">{{ isBoyfriend ? couple.partnerDisplayName + '给你的悄悄话' : '你写给' + couple.partnerDisplayName + '的悄悄话' }}</text>
      </view>
      <text class="ss-text">{{ order.sweetNote }}</text>
    </view>

    <!-- 取餐/配送信息 -->
    <view class="card info-card">
      <view class="card-row">
        <text class="row-label">{{ order.type === 'dine' ? '桌台号' : '收货地址' }}</text>
        <view class="row-content">
          <template v-if="order.type === 'dine' && order.table">
            <text class="row-main">{{ order.table.area }} · {{ order.table.name }}桌</text>
            <text class="row-sub">{{ order.table.desc }}</text>
          </template>
          <template v-else-if="order.address">
            <text class="row-main">{{ order.address.name }} {{ order.address.phone }}</text>
            <text class="row-sub" @click="copyAddress">{{ [order.address.province, order.address.city, order.address.district, order.address.street, order.address.detail].filter(Boolean).join(' ') }}</text>
          </template>
        </view>
      </view>
      <view class="card-row">
        <text class="row-label">{{ order.type === 'dine' ? '取餐时间' : '送达时间' }}</text>
        <text class="row-main">{{ order.dineMode === 'now' ? '尽快' : (order.reserveTime ? `预约 ${order.reserveTime}` : '预约') }}</text>
      </view>
      <view v-if="order.people" class="card-row">
        <text class="row-label">就餐人数</text>
        <text class="row-main">{{ order.people }} 人</text>
      </view>
      <view v-if="order.remark" class="card-row col">
        <text class="row-label">其他备注</text>
        <text class="row-main">{{ order.remark }}</text>
      </view>
    </view>

    <!-- 菜品明细（含辣度 / 忌口备注） -->
    <view class="card">
      <view class="card-title">菜品明细</view>
      <view
        v-for="item in order.items"
        :key="item.itemId || item.lineKey || item.id"
        class="item-row"
        :class="{ clickable: canViewDishDetail(item) }"
        @click="goDishDetail(item)"
      >
        <DishEmoji :image="item.image" :emoji="item.emoji" :bg="item.bgColor" size="md" />
        <view class="item-info">
          <view class="item-name-row">
            <text class="item-name ellipsis">{{ item.name }}</text>
            <!-- <text v-if="item.isCustom" class="custom-tag">想吃</text> -->
          </view>
          <view v-if="item.spicy > 0 || item.dietNote" class="item-notes">
            <text v-if="item.spicy > 0" class="note-spicy">
              {{ spicyLabels[item.spicy] }}
            </text>
            <text v-if="item.dietNote" class="note-diet">{{ item.dietNote }}</text>
          </view>
        </view>
        <text class="item-qty">×{{ item.qty }}</text>
        <AppIcon
          v-if="canViewDishDetail(item)"
          class="item-arrow"
          name="arrow"
          size="24"
          color="#999"
        />
      </view>
    </view>

    <!-- 评价区：订单完成后可打分（永久存档到回忆相册） -->
    <view v-if="order.status === 3" class="card rate-card">
      <view class="card-title">
        <text>{{ isBoyfriend ? couple.partnerDisplayName + '的评价' : '给' + couple.partnerDisplayName + '打分' }}</text>
        <text class="card-title-sub">永久存进我们的回忆相册</text>
      </view>
      <view v-if="order.rating > 0" class="rate-done">
        <view class="stars">
          <AppIcon
            v-for="i in 5"
            :key="i"
            class="star"
            :class="{ active: i <= order.rating }"
            :name="i <= order.rating ? 'star' : 'starOutline'"
            size="48"
          />
        </view>
        <text v-if="order.ratingComment" class="rate-comment">{{ order.ratingComment }}</text>
        <text class="rate-tip">已评价 · {{ formatTime(order.ratedAt) }}</text>
      </view>
      <view v-else-if="!isBoyfriend" class="rate-form">
        <view class="stars">
          <view
            v-for="i in 5"
            :key="i"
            class="star-wrap"
            @click="ratingValue = i"
          >
            <AppIcon
              class="star"
              :class="{ active: i <= ratingValue }"
              :name="i <= ratingValue ? 'star' : 'starOutline'"
              size="48"
            />
          </view>
        </view>
        <textarea
          :value="ratingComment"
          class="rate-input"
          :placeholder="`写句软糯的话夸夸${couple.partnerDisplayName}～（比如：今天的菜好香，谢谢${couple.partnerDisplayName}）`"
          placeholder-class="rate-ph"
          maxlength="80"
          :adjust-position="true"
          @input="e => ratingComment = e.detail.value"
        />
        <view class="rate-btn" @click="onRate">
          <text>提交评价</text>
        </view>
      </view>
    </view>

    <!-- 完成暖心短句（回忆相册配文） -->
    <view v-if="order.status === 3" class="card love-card">
      <text class="love-line">{{ finishText }}</text>
      <text class="love-sub">这餐已存进我们的回忆相册</text>
    </view>

    <!-- 订单信息 -->
    <view class="card">
      <view class="card-title">订单信息</view>
      <view class="meta-row">
        <text class="meta-label">订单编号</text>
        <text class="meta-val">#{{ order.no }}</text>
      </view>
      <view class="meta-row">
        <text class="meta-label">下单时间</text>
        <text class="meta-val">{{ formatTime(order.createdAt) }}</text>
      </view>
      <view class="meta-row">
        <text class="meta-label">谁买单</text>
        <view class="meta-val meta-pay">
          <text>{{ isBoyfriend ? '当然是我呀' : '当然是' + couple.partnerDisplayName + '呀' }}</text>
          <AppIcon name="heart" size="22" color="#E08B8B" />
        </view>
      </view>
    </view>

    <view class="bottom-holder" />

    <!-- 底部操作：女友端催餐/取消/再来一单；男友端接单/拒绝/做好啦 -->
    <view class="action-bar safe-bottom">
      <template v-if="!isBoyfriend">
        <!-- 待接单 / 制作中：催餐按钮（撒娇气泡，无强硬弹窗） -->
        <view
          v-if="order.status === 0 || order.status === 1"
          class="ab-btn urge-btn"
          @click="onUrge"
        >
          <text>{{ urgeBtnText }}</text>
        </view>
        <view v-if="order.status < 2" class="ab-btn ghost" @click="onCancel">取消订单</view>
        <view v-if="order.status === 2" class="ab-btn primary" @click="onComplete">我吃完啦</view>
        <view v-if="order.status >= 3" class="ab-btn primary" @click="reorder">再来一单</view>
      </template>
      <template v-else>
        <view v-if="order.status === 0" class="ab-btn ghost" @click="onReject">拒绝</view>
        <view v-if="order.status === 0" class="ab-btn primary" @click="onAccept">接单</view>
        <view v-if="order.status === 1" class="ab-btn primary" @click="onCookDone">开饭啦</view>
        <view v-if="order.status === 2" class="ab-btn done">等{{ couple.partnerDisplayName }}开饭</view>
        <view v-if="order.status >= 3" class="ab-btn ghost" @click="back">返回订单</view>
      </template>
    </view>

    <!-- 催餐气泡浮层（温柔提醒，非强硬弹窗） -->
    <view v-if="urgeBubble.visible" class="urge-bubble" @click="closeUrgeBubble">
      <view class="ub-inner">
        <text class="ub-emoji">{{ urgeBubble.emoji }}</text>
        <text class="ub-text">{{ urgeBubble.text }}</text>
      </view>
    </view>

    </view>

    <view v-else v-show="!firstLoading">
      <Empty
        :icon="loading ? 'loading' : 'question'"
        :text="loading ? '订单加载中' : '订单不存在'"
        :desc="loading ? '稍等一下下哦' : '该订单可能已被删除'"
        :btn-text="loading ? '' : '返回'"
        @action="back"
      />
    </view>

    <Toast />
  </view>
</template>

<script setup>
/**
 * 订单详情页（女友端 / 男友端双视角）
 * -----------------------------------------------------------------------------
 * 功能要点：
 * 1) 状态时间线：下单 → 已接单 → 做好啦 → 吃光光啦（已取消 / 已拒绝单独展示）
 * 2) 催餐气泡：温柔撒娇提醒，非强硬弹窗；频繁催餐触发暖心安抚文案
 * 3) 拒绝理由展示：男友拒绝后展示理由 + 安抚文案，减少矛盾
 * 4) 撒娇留言展示：女友下单时写的悄悄话
 * 5) 打分评价：订单完成后可打分 1-5 星 + 文案，永久存档到回忆相册
 */
import { ref, computed, reactive } from 'vue';
import { onLoad, onShow } from '@dcloudio/uni-app';
import Empty from '@/components/Empty.vue';
import DishEmoji from '@/components/DishEmoji.vue';
import AppIcon from '@/components/AppIcon.vue';
import NavBar from '@/components/NavBar.vue';
import PageLoading from '@/components/PageLoading.vue';
import { useOrderStore, ORDER_STATUS } from '@/store/order';
import { useCartStore } from '@/store/cart';
import { useCoupleStore } from '@/store/couple';
import { formatTime } from '@/utils/format';
import { getUrgeWords, getSootheWords, finishWords as mockFinish, getRejectSoothe, getRandom, getBfFinishWords } from '@/mock/sweet';
import { api } from '@/utils/api';
import Toast from '@/components/Toast.vue';
import { toast } from '@/utils/toast';
import { requireLogin } from '@/utils/auth';
import { usePoll } from '@/utils/sync';
import { copyText } from '@/utils/clipboard';

// 订单详情页需要订单实时同步（状态变更：接单/拒单/完成等）
usePoll(['orders']);

const orderStore = useOrderStore();
const cart = useCartStore();
const couple = useCoupleStore();
const statusMap = ORDER_STATUS;
const isBoyfriend = computed(() => couple.isBoyfriend);

// 暖心文案：默认用 mock，从后端拉取后替换
const urgeWords = ref(getUrgeWords(couple.myDisplayName, couple.partnerDisplayName));
const sootheWords = ref(getSootheWords(couple.partnerDisplayName));
const finishWords = ref(mockFinish);
const rejectSoothe = ref(getRejectSoothe(couple.partnerDisplayName));

async function loadSweetWords() {
  try {
    const data = await api.getSweetDaily();
    if (data) {
      if (data.urgeWords) urgeWords.value = data.urgeWords;
      if (data.sootheWords) sootheWords.value = data.sootheWords;
      if (data.finishWords) finishWords.value = data.finishWords;
      if (data.rejectSoothe) rejectSoothe.value = data.rejectSoothe;
    }
  } catch (e) { /* 用 mock 默认 */ }
}

const orderId = ref('');
const order = computed(() => orderStore.getById(orderId.value));
const loading = ref(true);
const firstLoading = ref(true);

// 辣度文案
const spicyLabels = ['不辣', '微辣', '中辣', '重辣'];

// 打分表单
const ratingValue = ref(0);
const ratingComment = ref('');

// 催餐气泡
const urgeBubble = reactive({ visible: false, text: '', emoji: '🥺' });
// 拒绝安抚文案（订单被拒后稳定展示一条，避免每次刷新都变）
const rejectSootheText = ref('');

const statusIconName = computed(() => {
  if (!order.value) return 'clock';
  // 0 待接单 / 1 制作中 / 2 做好啦 / 3 已完成 / 4 已取消 / 5 已拒绝
  return ['clock', 'chef', 'package', 'checkCircle', 'cross', 'pray'][order.value.status];
});
const statusTip = computed(() => {
  if (!order.value) return '';
  const gfTips = [
    '正在等' + couple.partnerDisplayName + '接单，稍等一下下',
    '厨房里正在为你精心烹饪，再等一会儿',
    order.value.type === 'dine' ? '香喷喷的出炉啦，快去吃，趁热最好吃' : '正在给你送过去哟，等我一下下',
    '这顿吃好啦，下次还想喂你',
    '这次没吃成，下次再为你做',
    '这次' + couple.partnerDisplayName + '没法做，别生气，等' + couple.partnerDisplayName + '忙完补给你'
  ];
  const bfTips = [
    couple.partnerDisplayName + '下单啦，赶紧接单开工吧',
    '正在为' + couple.partnerDisplayName + '精心准备，别让' + couple.partnerDisplayName + '等太久',
    order.value.type === 'dine' ? '开饭啦，快叫' + couple.partnerDisplayName + '来趁热吃' : '搞定啦，给' + couple.partnerDisplayName + '送过去咯',
    '这顿圆满完成，' + couple.partnerDisplayName + '又吃开心啦',
    couple.partnerDisplayName + '取消了这单，下次再喂' + couple.partnerDisplayName,
    '你拒绝了这单，记得忙完补给' + couple.partnerDisplayName + '做更好吃的'
  ];
  return isBoyfriend.value ? bfTips[order.value.status] : gfTips[order.value.status];
});
const statusGradient = computed(() => {
  if (!order.value) return '';
  // 使用 CSS 变量跟随当前主题色，取消/拒绝保持语义色
  const grads = [
    'linear-gradient(135deg, var(--c-primary, #F5B6C1), var(--c-primary-2, #FFD6DD))', // 待接单
    'linear-gradient(135deg, var(--c-primary, #F5B6C1), var(--c-accent, #C8B6D9))', // 制作中
    'linear-gradient(135deg, var(--c-taro, #B8A2C7), var(--c-accent, #C8B6D9))', // 做好啦
    'linear-gradient(135deg, var(--c-accent, #C8B6D9), var(--c-primary, #F5B6C1))', // 已完成
    'linear-gradient(135deg, #C9BFC4, #B5A99A)', // 已取消 - 灰
    'linear-gradient(135deg, #E08B8B, var(--c-accent, #C8B6D9))'  // 已拒绝 - 柔粉红到芋紫
  ];
  return grads[order.value.status];
});

const timeline = computed(() => {
  if (!order.value) return [];
  // 使用存储的时间轴标签，避免当前用户视角重建导致的错乱
  const stored = order.value.timeline || [];
  const base = [
    { label: stored[0]?.label || '下单', time: order.value.createdAt, done: true },
    { label: stored[1]?.label || '接单', time: stored[1]?.time || null, done: order.value.status >= 1 },
    { label: stored[2]?.label || '开饭啦', time: stored[2]?.time || null, done: order.value.status >= 2 },
    {
      label: stored[3]?.label || (order.value.type === 'dine' ? '吃光光啦' : '已送达'),
      time: stored[3]?.time || null,
      done: order.value.status >= 3
    }
  ];
  // 已取消：清除后续步骤
  if (order.value.status === 4) {
    base[1].done = false;
    base[1].time = null;
    base[2].done = false;
    base[2].time = null;
    base[3] = {
      label: '订单已取消',
      time: order.value.timeline?.slice(-1)[0]?.time || null,
      done: true
    };
  }
  // 已拒绝：清除后续步骤
  if (order.value.status === 5) {
    base[1].done = false;
    base[1].time = null;
    base[2].done = false;
    base[2].time = null;
    base[3] = {
      label: stored[3]?.label || '没法做',
      time: stored.slice(-1)[0]?.time || null,
      done: true
    };
  }
  return base;
});

// 完成暖心短句（稳定展示一条，不每次刷新都变）
const finishText = ref('');

// 催餐按钮文案
const urgeBtnText = computed(() => {
  if (!order.value) return '催餐';
  const count = order.value.urges?.length || 0;
  if (count === 0) return '撒娇催一下';
  return `再催一下（${count}）`;
});

async function onUrge() {
  if (!requireLogin(couple)) return;
  if (!order.value) return;
  const count = await orderStore.urge(orderId.value);
  // 频繁催餐（>=2 次）触发暖心安抚文案，防止闹脾气
  if (count >= 2) {
    urgeBubble.text = getRandom(sootheWords.value);
    urgeBubble.emoji = '🥺';
  } else {
    urgeBubble.text = getRandom(urgeWords.value);
    urgeBubble.emoji = '🥰';
  }
  urgeBubble.visible = true;
  // 3 秒后自动消失
  setTimeout(() => {
    urgeBubble.visible = false;
  }, 3000);
}
function closeUrgeBubble() {
  urgeBubble.visible = false;
}

function onCancel() {
  if (!requireLogin(couple)) return;
  uni.showModal({
    title: '取消订单？',
    content: '真的不吃了嘛？取消后' + couple.partnerDisplayName + '就不做了哦',
    confirmText: '不吃了',
    cancelText: '再想想',
    confirmColor: '#E08B8B',
    success: (r) => {
      if (r.confirm) {
        orderStore.cancel(orderId.value);
        toast.success('已取消');
      }
    }
  });
}

function onAccept() {
  if (!requireLogin(couple)) return;
  orderStore.accept(orderId.value).then(() => {
    toast.success('已接单，开工！');
  });
}

function onReject() {
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
        orderStore.reject(orderId.value, r.content).then(() => {
          toast.success('已拒绝，记得补做哦');
        });
      }
    }
  });
}

function onCookDone() {
  if (!requireLogin(couple)) return;
  orderStore.finish(orderId.value).then(() => {
    toast.success('开饭啦，喊' + couple.partnerDisplayName + '来吃');
  });
}

function onComplete() {
  if (!requireLogin(couple)) return;
  uni.showModal({
    title: '吃饱啦？',
    content: '真的吃光光了吗？确认后可以给' + couple.partnerDisplayName + '打分哦',
    confirmText: '吃光啦',
    cancelText: '再吃会儿',
    confirmColor: '#F5B6C1',
    success: (r) => {
      if (r.confirm) {
        orderStore.complete(orderId.value);
        toast.success('辛苦' + couple.partnerDisplayName + '啦');
      }
    }
  });
}

async function onRate() {
  if (!requireLogin(couple)) return;
  if (ratingValue.value === 0) {
    toast.info('点颗星星嘛～');
    return;
  }
  toast.loading('保存中…');
  try {
    await orderStore.rate(orderId.value, ratingValue.value, ratingComment.value);
    // 刷新订单，确保评分及时回显
    await orderStore.fetchById(orderId.value, true);
    toast.success('已存进回忆相册');
  } catch (e) {
    toast.error('评价失败，请重试');
  } finally {
    toast.hide();
  }
}

function reorder() {
  if (!requireLogin(couple)) return;
  if (!order.value) return;
  order.value.items.forEach((it) => {
    // 再来一单：按原备注重新加入购物车
    for (let i = 0; i < it.qty; i++) {
      if (it.isCustom) {
        cart.addCustomDish(
          {
            id: it.id,
            name: it.name,
            price: it.price,
            image: it.image,
            spicy: it.spicy,
            dietNote: it.dietNote,
            isCustom: true
          },
          1,
          { spicy: it.spicy, dietNote: it.dietNote }
        );
      } else {
        cart.addWithNote(it.id, 1, { spicy: it.spicy, dietNote: it.dietNote });
      }
    }
  });
  toast.success('已加入小餐车');
  setTimeout(() => uni.reLaunch({ url: '/pages/menu/menu' }), 600);
}

function back() {
  uni.navigateBack();
}

function copyAddress() {
  if (!order.value || !order.value.address) return;
  const addr = order.value.address;
  const fullAddr = [addr.province, addr.city, addr.district, addr.street, addr.detail]
    .filter(Boolean).join(' ');
  copyText(`${addr.name} ${addr.phone} ${fullAddr}`, '地址已复制');
}

function canViewDishDetail(item) {
  if (!item || !item.id) return false;
  return !item.isCustom && !item.is_custom;
}

function goDishDetail(item) {
  if (!canViewDishDetail(item)) return;
  uni.navigateTo({ url: '/pages/dish/detail?id=' + item.id });
}

async function loadOrder() {
  if (!orderId.value) {
    loading.value = false;
    firstLoading.value = false;
    return;
  }
  // 本地已存在则先展示，同时静默兜底拉取最新状态
  if (order.value) {
    loading.value = false;
    firstLoading.value = false;
    orderStore.fetchById(orderId.value).catch(() => {});
    return;
  }
  loading.value = true;
  // 首次进入或本地无缓存时，优先从后端拉取
  await orderStore.fetchById(orderId.value).catch(() => {});
  // 若后端未返回，可能是创建后同步延迟，再等一次全局同步
  if (!order.value) {
    await new Promise((r) => setTimeout(r, 300));
    await orderStore.fetchById(orderId.value).catch(() => {});
  }
  loading.value = false;
  firstLoading.value = false;
}

onLoad((q) => {
  orderId.value = (q && q.id) || '';
  // 进入页面时初始化稳定的暖心文案
  finishText.value = getRandom(isBoyfriend.value ? getBfFinishWords(couple.partnerDisplayName) : finishWords.value);
  rejectSootheText.value = getRandom(rejectSoothe.value);
  loadSweetWords();
  loadOrder();
});
onShow(() => {
  // 全局同步器会持续同步订单列表；详情页兜底拉取单条，避免创建后跳转时本地尚未写入
  loadOrder();
});
</script>

<style lang="scss" scoped>
.detail-page {
  padding: 24rpx;
  padding-bottom: 0;
}
.status-header {
  border-radius: $radius-lg;
  padding: 36rpx 32rpx 28rpx;
  color: #fff;
  box-shadow: $shadow-card;
}
.status-row {
  display: flex;
  align-items: center;
  gap: 20rpx;
}
.status-icon {
  line-height: 1;
}
.status-name {
  font-size: 38rpx;
  font-weight: 800;
}
.status-tip {
  margin-top: 4rpx;
  margin-left: 10rpx;
  font-size: 24rpx;
  color: rgba(255, 255, 255, 0.9);
}
.timeline {
  margin-top: 32rpx;
  display: flex;
  justify-content: space-between;
}
.tl-item {
  position: relative;
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  .tl-dot {
    width: 20rpx;
    height: 20rpx;
    border-radius: 50%;
    background: rgba(255, 255, 255, 0.4);
    z-index: 1;
  }
  .tl-line {
    position: absolute;
    top: 10rpx;
    left: 50%;
    width: 100%;
    height: 4rpx;
    background: rgba(255, 255, 255, 0.4);
  }
  .tl-content {
    margin-top: 12rpx;
    text-align: center;
  }
  .tl-label {
    font-size: 20rpx;
    color: rgba(255, 255, 255, 0.85);
  }
  .tl-time {
    display: block;
    margin-top: 4rpx;
    font-size: 18rpx;
    color: rgba(255, 255, 255, 0.65);
  }
  &.done {
    .tl-dot {
      background: #fff;
      box-shadow: 0 0 0 6rpx rgba(255, 255, 255, 0.25);
    }
    .tl-label {
      color: #fff;
      font-weight: 600;
    }
  }
  &.last .tl-line {
    display: none;
  }
}

.card {
  overflow: hidden;
  background: #fff;
  border-radius: $radius-lg;
  padding: 8rpx 28rpx;
  margin-top: 20rpx;
  box-shadow: $shadow-card;
}
.card-title {
  padding: 24rpx 0 16rpx;
  font-size: 28rpx;
  font-weight: 700;
  color: $text-1;
  display: flex;
  align-items: baseline;
  gap: 12rpx;
  .card-title-sub {
    font-size: 22rpx;
    font-weight: 400;
    color: $text-3;
  }
}
.card-row {
  display: flex;
  padding: 22rpx 0;
  border-bottom: 1rpx solid $divider;
  &:last-child {
    border-bottom: none;
  }
  &.col {
    flex-direction: column;
    gap: 8rpx;
  }
  .row-label {
    width: 160rpx;
    font-size: 26rpx;
    color: $text-3;
    flex-shrink: 0;
  }
  .row-content {
    flex: 1;
  }
  .row-main {
    font-size: 28rpx;
    color: $text-1;
    font-weight: 600;
    display: block;
  }
  .row-sub {
    display: block;
    margin-top: 4rpx;
    font-size: 22rpx;
    color: $text-3;
  }
}

/* 拒绝理由卡 */
.reject-card {
  background: linear-gradient(135deg, #fff, $bg-taro);
}
.reject-head {
  display: flex;
  align-items: center;
  gap: 12rpx;
  padding: 20rpx 0 12rpx;
  .rh-title {
    font-size: 28rpx;
    font-weight: 700;
    color: $color-danger;
  }
}
.reject-reason {
  padding: 12rpx 0;
  border-top: 1rpx solid $divider;
  border-bottom: 1rpx solid $divider;
  .rr-label {
    display: block;
    font-size: 22rpx;
    color: $text-3;
    margin-bottom: 6rpx;
  }
  .rr-text {
    font-size: 28rpx;
    color: $text-1;
    line-height: 1.5;
  }
}
.reject-soothe {
  display: flex;
  align-items: flex-start;
  gap: 10rpx;
  padding: 16rpx 0 20rpx;
  .rs-text {
    flex: 1;
    font-size: 24rpx;
    color: $brand-taro;
    line-height: 1.5;
    font-style: italic;
  }
}

/* 撒娇留言展示 */
.sweet-show-card {
  background: linear-gradient(135deg, #fff, $bg-taro);
}
.ss-head {
  display: flex;
  align-items: center;
  gap: 10rpx;
  padding: 20rpx 0 10rpx;
  .ss-title {
    font-size: 26rpx;
    font-weight: 700;
    color: $brand-taro;
  }
}
.ss-text {
  display: block;
  padding: 0 0 20rpx;
  font-size: 28rpx;
  color: $text-1;
  line-height: 1.6;
}

/* 菜品行 */
.item-row {
  display: flex;
  align-items: flex-start;
  padding: 20rpx 0;
  border-bottom: 1rpx solid $divider;
  &:last-child {
    border-bottom: none;
  }
  &.clickable {
    cursor: pointer;
    padding: 20rpx 12rpx;
    margin: 0 -12rpx;
    border-radius: $radius-md;
    transition: background 0.15s;
    &:active {
      background: $bg-surface-alt;
    }
  }
}
.item-arrow {
  margin-left: auto;
  flex-shrink: 0;
  margin-top: 8rpx;
}
.item-info {
  flex: 1;
  min-width: 0;
  margin-left: 20rpx;
  display: flex;
  flex-direction: column;
  gap: 6rpx;
}
.item-name-row {
  display: flex;
  align-items: center;
  gap: 10rpx;
}
.item-name {
  font-size: 28rpx;
  font-weight: 600;
  color: $text-1;
}
.custom-tag {
  font-size: 18rpx;
  color: #fff;
  background: $brand-taro;
  padding: 2rpx 10rpx;
  border-radius: $radius-sm;
}
.item-notes {
  display: flex;
  flex-wrap: wrap;
  gap: 8rpx;
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
.item-qty {
  font-size: 26rpx;
  color: $text-3;
  margin-left: 16rpx;
}

/* 评价区 */
.rate-card {
  background: linear-gradient(135deg, #fff, $bg-surface-alt);
}
.stars {
  display: flex;
  gap: 12rpx;
  padding: 12rpx 0;
  .star {
    color: $text-4;
    &.active {
      color: $brand-primary;
    }
  }
}
.rate-done {
  padding: 0 0 20rpx;
  .rate-comment {
    display: block;
    margin: 12rpx 0;
    font-size: 26rpx;
    color: $text-1;
    line-height: 1.5;
  }
  .rate-tip {
    font-size: 20rpx;
    color: $text-4;
  }
}
.rate-form {
  padding: 0 0 20rpx;
}
.rate-input {
  width: 100%;
  min-height: 100rpx;
  font-size: 26rpx;
  color: $text-1;
  padding: 16rpx 20rpx;
  box-sizing: border-box;
  background: #fff;
  border-radius: $radius-md;
  margin: 12rpx 0;
  line-height: 1.5;
}
.rate-ph {
  color: $text-4;
}
.rate-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  float: inline-end;
  margin: 16rpx 0 0;
  padding: 0 56rpx;
  height: 72rpx;
  background: linear-gradient(135deg, $brand-primary, $brand-primary-2);
  color: #fff;
  font-size: 26rpx;
  font-weight: 700;
  border-radius: $radius-pill;
  box-shadow: $shadow-press;
  width: fit-content;
}

/* 完成暖心短句 */
.love-card {
  padding: 32rpx 28rpx;
  display: flex;
  flex-direction: column;
  background: linear-gradient(135deg, rgba(245, 182, 193, 0.1), rgba(200, 182, 217, 0.12));
}
.love-line {
  font-size: 30rpx;
  font-weight: 700;
  color: $brand-primary;
  line-height: 1.5;
}
.love-sub {
  margin-top: 8rpx;
  font-size: 24rpx;
  color: $text-2;
}

.meta-row {
  display: flex;
  justify-content: space-between;
  padding: 14rpx 0;
  .meta-label {
    font-size: 24rpx;
    color: $text-3;
  }
  .meta-val {
    font-size: 24rpx;
    color: $text-2;
  }
  .meta-pay {
    display: flex;
    align-items: center;
    gap: 6rpx;
  }
}
.bottom-holder {
  height: 140rpx;
}
.action-bar {
  position: fixed;
  left: 0;
  right: 0;
  bottom: 0;
  display: flex;
  gap: 16rpx;
  padding: 20rpx 28rpx;
  background: #fff;
  box-shadow: 0 -4rpx 24rpx rgba(245, 182, 193, 0.18);
}
.ab-btn {
  flex: 1;
  height: 84rpx;
  border-radius: $radius-pill;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 28rpx;
  font-weight: 700;
  &.ghost {
    border: 2rpx solid $border-1;
    color: $text-2;
  }
  &.primary {
    background: linear-gradient(135deg, $brand-primary, $brand-primary-2);
    color: #fff;
    box-shadow: $shadow-press;
  }
  &.urge-btn {
    background: linear-gradient(135deg, $brand-taro, $brand-accent);
    color: #fff;
    box-shadow: 0 4rpx 12rpx rgba(184, 162, 199, 0.28);
  }
  &.done {
    background: $bg-surface-alt;
    color: $text-3;
  }
}

/* 催餐气泡浮层 */
.urge-bubble {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: 1000;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(74, 40, 60, 0.35);
  .ub-inner {
    margin: 0 60rpx;
    padding: 40rpx 36rpx;
    background: #fff;
    border-radius: $radius-lg;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 16rpx;
    box-shadow: 0 12rpx 40rpx rgba(0, 0, 0, 0.16);
    .ub-emoji {
      font-size: 72rpx;
    }
    .ub-text {
      font-size: 30rpx;
      color: $text-1;
      font-weight: 600;
      line-height: 1.5;
      text-align: center;
    }
  }
}
</style>
