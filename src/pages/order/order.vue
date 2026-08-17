<template>
  <view class="page order-page" :class="couple.themeClass" :style="couple.themeStyle">
    <NavBar :show-back="true">
      <text class="nav-title">确认订单</text>
    </NavBar>

    <PageLoading :visible="firstLoading" @timeout="firstLoading = false" />

    <view v-show="!firstLoading" class="order-content">
    <!-- 就餐方式切换：堂食 = 在家吃 / 外带 = 让他点外卖送过来 -->
    <view class="seg-card">
      <view
        v-for="m in dineModes"
        :key="m.key"
        class="seg-item"
        :class="{ active: orderType === m.key }"
        @click="orderType = m.key"
      >
        <text class="seg-icon">{{ m.icon }}</text>
        <view class="seg-text">
          <view class="seg-name">{{ m.name }}</view>
          <view class="seg-desc">{{ m.desc }}</view>
        </view>
      </view>
    </view>

    <!-- 堂食：选桌台（在家吃选个位置） -->
    <view v-if="orderType === 'dine'" class="card">
      <view class="card-row" @click="chooseTable">
        <text class="row-label">桌台号</text>
        <view class="row-value">
          <text v-if="selectedTable" class="value-main">{{ selectedTable.area }} · {{ selectedTable.name }}</text>
          <text v-else class="value-placeholder">请选择桌台</text>
          <nut-icon name="rect-right" size="32rpx" :custom-color="couple.themeStyle['--c-primary']" />
        </view>
      </view>
      <view class="card-row">
        <text class="row-label">就餐人数</text>
        <view class="people">
          <view class="p-btn" @click="people = Math.max(1, people - 1)">
            <AppIcon name="minus" size="24" color="#666" />
          </view>
          <text class="p-num">{{ people }}</text>
          <view class="p-btn add" @click="people += 1">
            <AppIcon name="add" size="24" color="#fff" />
          </view>
        </view>
      </view>
    </view>

    <!-- 外带：收货地址（让他点外卖送过来） -->
    <view v-else class="card addr-card" @click="chooseAddress">
      <view v-if="selectedAddress" class="addr-info">
        <view class="addr-top">
          <text class="addr-name">{{ selectedAddress.name }}</text>
          <text class="addr-phone">{{ selectedAddress.phone }}</text>
          <text v-if="selectedAddress.tag" class="addr-tag">{{ selectedAddress.tag }}</text>
        </view>
        <text class="addr-detail ellipsis-2">{{ fullAddress(selectedAddress) }}</text>
      </view>
      <view v-else class="addr-empty">
        <AppIcon name="location" size="40" color="#C9BFC4" />
        <text class="addr-empty-text">填个收货地址，{{ couple.partnerDisplayName }}好给你送过去</text>
      </view>
      <nut-icon name="rect-right" size="40rpx" :custom-color="couple.themeStyle['--c-primary']" class="arrow big" />
    </view>

    <!-- 预计取餐/送达时间 -->
    <view class="card">
      <view class="card-row">
        <text class="row-label">{{ orderType === 'dine' ? '取餐时间' : '送达时间' }}</text>
        <view class="time-tabs">
          <text
            v-for="t in timeSlots"
            :key="t.key"
            class="time-tab"
            :class="{ active: dineMode === t.key }"
            @click="dineMode = t.key"
          >{{ t.label }}</text>
        </view>
      </view>
      <view v-if="dineMode === 'later'" class="card-row reserve-row" @click="showTimePicker = true">
        <text class="row-label">预约时间</text>
        <view class="row-value">
          <text class="value-main">{{ reserveTime }}</text>
          <nut-icon name="rect-right" size="32rpx" :custom-color="couple.themeStyle['--c-primary']" />
        </view>
      </view>
    </view>

    <!-- 订单明细：含辣度 / 忌口备注 / 过敏警告 -->
    <view class="card">
      <view class="card-title">
        <text>订单明细</text>
        <text class="card-title-sub">共 {{ cart.count }} 件</text>
      </view>
      <view v-if="hasAllergenWarn" class="allergen-alert">
        <AppIcon name="warning" size="40" color="#E08B8B" />
        <view class="aa-body">
          <text class="aa-title">{{ couple.myDisplayName }}注意！含你的过敏原</text>
          <text class="aa-text">{{ allergenHitNames }} 会让你不舒服，要不换一个？</text>
        </view>
      </view>
      <view v-for="item in cartItems" :key="item.lineKey" class="item-row">
        <DishEmoji :image="item.image" :emoji="item.emoji" :bg="item.bgColor" size="md" />
        <view class="item-info">
          <view class="item-name-row">
            <text class="item-name ellipsis">{{ item.name }}</text>
            <!-- <text v-if="item.isCustom" class="custom-tag">想吃</text> -->
          </view>
          <!-- 单菜备注：辣度 + 忌口 -->
          <view v-if="item.spicy > 0 || item.dietNote" class="item-notes">
            <text v-if="item.spicy > 0" class="note-spicy">
              {{ spicyLabels[item.spicy] }}
            </text>
            <text v-if="item.dietNote" class="note-diet">{{ item.dietNote }}</text>
          </view>
          <!-- 忌口 / 过敏原命中提醒 -->
          <view v-if="itemWarnLevel(item) > 0" class="item-warn" :class="'wl-' + itemWarnLevel(item)">
            <AppIcon name="warning" size="22" :color="itemWarnLevel(item) === 2 ? '#E08B8B' : '#E8B86C'" />
            <text class="iw-text">{{ itemWarnText(item) }}</text>
          </view>
        </view>
        <view class="item-right">
          <text class="item-qty">×{{ item.qty }}</text>
        </view>
      </view>
    </view>

    <!-- 撒娇小留言（女友端专属，发给男友） -->
    <view class="card sweet-card">
      <view class="card-title">
        <text>给{{ couple.partnerDisplayName }}的悄悄话</text>
        <text class="card-title-sub">撒娇一下，{{ couple.partnerDisplayName }}做得更快</text>
      </view>
      <textarea
        :value="sweetNote"
        class="ipt textarea"
        placeholder="比如：辛苦啦，做的时候多放点爱～ / 人家好饿好饿，快点嘛～"
        placeholder-class="ipt-ph"
        maxlength="60"
        :adjust-position="true"
        @input="e => sweetNote = e.detail.value"
      />
      <view class="quick-tags sweet-tags">
        <text
          v-for="t in sweetQuickNotes"
          :key="t"
          class="qr-tag sweet-tag"
          :class="{ active: sweetNote.includes(t) }"
          @click="toggleSweet(t)"
        >{{ t }}</text>
      </view>
      <view class="sweet-foot">
        <text class="sf-count">{{ sweetNote.length }}/60</text>
        <text v-if="sweetNote" class="sf-clear" @click="sweetNote = ''">清空</text>
      </view>
    </view>

    <!-- 通用备注（口味 / 其他需求） -->
    <view class="card order-card">
      <view class="card-title">其他备注</view>
      <textarea
        :value="remark"
        class="ipt textarea"
        placeholder="餐具、打包、其他小要求（选填）"
        placeholder-class="ipt-ph"
        maxlength="80"
        :adjust-position="true"
        @input="e => remark = e.detail.value"
      />
      <view class="quick-tags">
        <text
          v-for="t in quickRemarks"
          :key="t"
          class="qr-tag"
          :class="{ active: remark.includes(t) }"
          @click="toggleRemark(t)"
        >{{ t }}</text>
      </view>
      <view class="remark-foot">
        <text class="rf-count">{{ remark.length }}/80</text>
        <text v-if="remark" class="rf-clear" @click="remark = ''">清空</text>
      </view>
    </view>

    <view class="bottom-holder" />

    <!-- 底部提交栏 -->
    <view class="submit-bar safe-bottom">
      <view class="total">
        <view class="total-word">
          <text>这一餐，我请客</text>
          <AppIcon name="heart" size="28" color="#E08B8B" />
        </view>
        <text class="total-sub">共 {{ cart.count }} 件，{{ couple.partnerDisplayName }}买单</text>
      </view>
      <view class="submit-btn" :class="{ disabled: !canSubmit }" @click="onSubmit">
        <text>发给{{ couple.partnerDisplayName }}</text>
      </view>
    </view>

    <!-- 预约时间选择器 -->
    <nut-popup position="bottom" v-model:visible="showTimePicker">
      <nut-picker
        :columns="timeOptions"
        :default-value="[reserveTime]"
        title="选择预约时间"
        @confirm="onTimeConfirm"
        @cancel="showTimePicker = false"
      />
    </nut-popup>

    <Toast />
    </view>
  </view>
</template>

<script setup>
/**
 * 确认订单页（女友端核心页）
 * -----------------------------------------------------------------------------
 * 功能要点：
 * 1) 就餐方式切换：堂食（在家吃）/ 外带（让他点外卖送过来）
 * 2) 订单明细展示：每道菜的辣度、忌口备注、过敏原 / 不吃食材命中提醒
 * 3) 撒娇小留言：女友可写软糯情话发给男友，配合快捷标签
 * 4) 提交订单：写入 orderStore（含 sweetNote），跳转到订单详情
 *
 * 防吵架规则：过敏原命中会顶部高亮提醒，女友自己留意，避免男友做错踩雷。
 */
import { ref, computed, nextTick } from 'vue';
import { onShow } from '@dcloudio/uni-app';
import NavBar from '@/components/NavBar.vue';
import DishEmoji from '@/components/DishEmoji.vue';
import AppIcon from '@/components/AppIcon.vue';
import Toast from '@/components/Toast.vue';
import PageLoading from '@/components/PageLoading.vue';
import { useCartStore } from '@/store/cart';
import { useOrderStore } from '@/store/order';
import { useAddressStore } from '@/store/address';
import { usePreferenceStore } from '@/store/preference';
import { useDishStore } from '@/store/dish';
import { useCoupleStore } from '@/store/couple';
import { toast } from '@/utils/toast';
import { requireLogin } from '@/utils/auth';

const dishStore = useDishStore();
const couple = useCoupleStore();

const cart = useCartStore();
const orderStore = useOrderStore();
const addressStore = useAddressStore();
const preference = usePreferenceStore();

// 就餐方式：堂食 = 在家吃，外带 = 男友点外卖
const dineModes = [
  { key: 'dine', name: '在家吃', desc: couple.partnerDisplayName + '下厨，我等着', icon: '🍽️' },
  { key: 'takeout', name: '点外卖', desc: '让' + couple.partnerDisplayName + '帮我点', icon: '🛵' }
];
const timeSlots = [
  { key: 'now', label: '尽快' },
  { key: 'later', label: '预约' }
];
// 辣度文案（0 不辣 / 1 微辣 / 2 中辣 / 3 重辣）
const spicyLabels = ['不辣', '微辣', '中辣', '重辣'];

// 通用备注快捷标签
const quickRemarks = ['少辣', '不要葱', '多加酱', '打包餐具', '常温'];
// 撒娇小留言快捷标签（软糯情侣风）
const sweetQuickNotes = [
  '辛苦啦',
  '人家好饿～',
  '多放点爱',
  '快点嘛',
  '想你了',
  '做完抱抱'
];

const orderType = ref('dine');
const dineMode = ref('now');
const people = ref(2);
const remark = ref('');
const sweetNote = ref(''); // 撒娇小留言
const selectedTable = ref(null);
const selectedAddress = ref(null);
const firstLoading = ref(true);

// 预约时间选择
const showTimePicker = ref(false);
const timeOptions = ref([]);
const reserveTime = ref('');

function padTimePart(n) {
  return String(n).padStart(2, '0');
}
function timeToMinutes(t) {
  const [h, m] = t.split(':').map(Number);
  return h * 60 + m;
}
function generateTimeOptions() {
  const now = new Date();
  const current = now.getHours() * 60 + now.getMinutes();
  const list = [];
  const start = Math.ceil(current / 15) * 15;
  for (let t = start; t <= 23 * 60 + 45; t += 15) {
    const v = `${padTimePart(Math.floor(t / 60))}:${padTimePart(t % 60)}`;
    list.push({ text: v, value: v });
  }
  if (current < 23 * 60 + 59) {
    list.push({ text: '23:59', value: '23:59' });
  }
  if (list.length === 0) list.push({ text: '23:59', value: '23:59' });
  return list;
}
function getDefaultReserveTime(slots) {
  const now = new Date();
  const current = now.getHours() * 60 + now.getMinutes();
  const target = current + 30;
  const match = slots.find((s) => timeToMinutes(s.value) >= target);
  return match ? match.value : (slots[slots.length - 1] ? slots[slots.length - 1].value : '23:59');
}
function initReserveTime() {
  timeOptions.value = generateTimeOptions();
  if (!reserveTime.value || timeToMinutes(reserveTime.value) < timeToMinutes(timeOptions.value[0].value)) {
    reserveTime.value = getDefaultReserveTime(timeOptions.value);
  }
}
function onTimeConfirm(e) {
  const val = Array.isArray(e) ? e[0] : (e && e.selectedValue ? e.selectedValue[0] : '');
  if (val) reserveTime.value = val;
  showTimePicker.value = false;
}

const cartItems = computed(() => cart.detailList);

/**
 * 忌口命中判断：返回每条购物车项的警告级别
 * - 2 = 过敏原命中（红色，严重）
 * - 1 = 不吃食材命中（黄色，提醒）
 * - 0 = 安全
 * 注：预制菜有 allergens / dietTags 字段，自定义菜没有，跳过判断
 */
function itemWarnLevel(item) {
  // 自定义菜没有 allergens / dietTags，无法判断，跳过
  if (item.isCustom) {
    // 但如果女友在 dietNote 里写了忌口词，且命中自己设置的 dislikes，给个轻提醒
    if (item.dietNote) {
      const hit = preference.dislikes.find((d) => item.dietNote.includes(d));
      return hit ? 1 : 0;
    }
    return 0;
  }
  // 从 mock 菜库拿 allergens / dietTags
  // 通过 cart 行项目里没有完整字段，这里用 preference 的 isDishAllergen/isDishDislike
  // 但 preference getter 需要 dish 对象，这里直接用 items 自身字段（cart 已存了 spicy/dietNote）
  // allergens / dietTags 不在 cart item 里，需要从 dishes 反查
  const dish = getDishMeta(item.id);
  if (!dish) return 0;
  if (dish.allergens && dish.allergens.some((a) => preference.allergens.includes(a))) return 2;
  if (dish.dietTags && dish.dietTags.some((d) => preference.dislikes.includes(d))) return 1;
  return 0;
}

function itemWarnText(item) {
  const dish = getDishMeta(item.id);
  if (!dish) return '';
  if (itemWarnLevel(item) === 2) {
    const hits = (dish.allergens || []).filter((a) => preference.allergens.includes(a));
    return `含${hits.join('/')}，你会过敏`;
  }
  if (itemWarnLevel(item) === 1) {
    const hits = (dish.dietTags || []).filter((d) => preference.dislikes.includes(d));
    return `含${hits.join('/')}，你不爱吃`;
  }
  return '';
}

// 从 dish store 拿元数据（避免 cart 存全量字段）
function getDishMeta(id) {
  return dishStore.getDishById(id);
}

// 顶部过敏原总警告
const hasAllergenWarn = computed(() =>
  cartItems.value.some((i) => itemWarnLevel(i) === 2)
);
const allergenHitNames = computed(() => {
  const names = new Set();
  cartItems.value.forEach((i) => {
    if (itemWarnLevel(i) !== 2) return;
    const dish = getDishMeta(i.id);
    if (!dish) return;
    (dish.allergens || []).forEach((a) => {
      if (preference.allergens.includes(a)) names.add(a);
    });
  });
  return [...names].join('、');
});

const canSubmit = computed(() => {
  if (cart.isEmpty) return false;
  // 外卖必须选择地址；堂食桌台改为可选，不强制校验
  if (orderType.value === 'takeout') return !!selectedAddress.value;
  return true;
});

function chooseTable() {
  uni.navigateTo({
    url: '/pages/table/table?mode=select',
    events: {
      onPick: (table) => {
        selectedTable.value = table;
      }
    }
  });
}

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
function chooseAddress() {
  uni.navigateTo({
    url: '/pages/address/address?mode=select',
    events: {
      onPick: (addr) => {
        selectedAddress.value = addr;
      }
    }
  });
}

function toggleRemark(t) {
  if (remark.value.includes(t)) {
    remark.value = remark.value.split(' ').filter((s) => s !== t).join(' ');
  } else {
    remark.value = remark.value ? `${remark.value} ${t}` : t;
  }
}
function toggleSweet(t) {
  if (sweetNote.value.includes(t)) {
    sweetNote.value = sweetNote.value.split(' ').filter((s) => s !== t).join(' ');
  } else {
    sweetNote.value = sweetNote.value ? `${sweetNote.value} ${t}` : t;
  }
}

function onSubmit() {
  if (!requireLogin(couple)) return;
  if (!canSubmit.value) {
    toast.info(cart.isEmpty ? '请先选菜' : '请先选地址');
    return;
  }
  // 过敏原二次确认（防吵架：女友自己确认了再下单）
  if (hasAllergenWarn.value) {
    uni.showModal({
      title: couple.myDisplayName + '注意一下',
      content: `这餐里有 ${allergenHitNames.value}，会让你过敏哦，确定还要吃吗？`,
      confirmText: '我就要吃',
      cancelText: '换一个',
      confirmColor: '#E08B8B',
      success: (r) => {
        if (r.confirm) doCreateOrder();
      }
    });
    return;
  }
  doCreateOrder();
}

async function doCreateOrder() {
  const order = await orderStore.create({
    type: orderType.value,
    dineMode: dineMode.value,
    reserveTime: dineMode.value === 'later' ? reserveTime.value : '',
    table: orderType.value === 'dine' ? selectedTable.value : null,
    address: orderType.value === 'takeout' ? selectedAddress.value : null,
    items: cart.detailList,
    remark: remark.value,
    sweetNote: sweetNote.value,
    people: orderType.value === 'dine' ? people.value : 0
  });
  if (!order || !order.id) {
    toast.error('下单失败，请重试');
    return;
  }
  cart.clear();
  toast.success(`已发给${couple.partnerDisplayName}`);
  // 再次从后端拉取该订单并写入本地，确保跳转前本地一定有完整数据
  try { await orderStore.fetchById(order.id, true); } catch (e) {}
  // 兜底：若拉取后本地仍无该订单，不跳转
  if (!orderStore.getById(order.id)) {
    toast.info('订单同步中，请去订单列表查看');
    return;
  }
  // 等 store 写入与 Vue 响应式传播完成再跳转，避免详情页读不到新订单
  await nextTick();
  setTimeout(() => {
    uni.redirectTo({ url: '/pages/orders/detail?id=' + order.id });
  }, 600);

  // 本地演示模式：模拟男友端状态推进（真实场景男友端会接单）
  if (!orderStore.online) {
    setTimeout(() => orderStore.advance(order.id), 5000);
    setTimeout(() => orderStore.advance(order.id), 12000);
  }
}

onShow(() => {
  initReserveTime();
  // 每次进入下单页同步后端地址，确保最新
  addressStore.fetchFromServer().catch(() => {});
  // 默认选中默认地址
  if (!selectedAddress.value && addressStore.defaultAddress) {
    selectedAddress.value = addressStore.defaultAddress;
  }
  firstLoading.value = false;
});

// 初始化一次，避免 picker 在 onShow 前渲染时拿不到默认值
initReserveTime();
</script>

<style lang="scss" scoped>
.nav-title {
  font-size: 36rpx;
  font-weight: 800;
  color: #fff;
}
.order-page {
  padding: 24rpx;
  padding-bottom: 0;
}
.seg-card {
  display: flex;
  gap: 20rpx;
  margin-bottom: 20rpx;
}
.seg-item {
  flex: 1;
  display: flex;
  align-items: center;
  gap: 16rpx;
  padding: 28rpx 24rpx;
  background: #fff;
  border-radius: $radius-lg;
  border: 2rpx solid transparent;
  box-shadow: $shadow-card;
  .seg-icon {
    font-size: 44rpx;
  }
  .seg-name {
    font-size: 30rpx;
    font-weight: 700;
    color: $text-1;
  }
  .seg-desc {
    font-size: 20rpx;
    color: $text-3;
    margin-top: 2rpx;
  }
  &.active {
    border-color: $brand-primary;
    background: linear-gradient(135deg, rgba(245, 182, 193, 0.12), rgba(255, 214, 221, 0.12));
  }
}
.card {
  background: #fff;
  border-radius: $radius-lg;
  padding: 8rpx 28rpx;
  margin-bottom: 20rpx;
  box-shadow: $shadow-card;
}
.card-title {
  padding: 24rpx 0 12rpx;
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
  align-items: center;
  justify-content: space-between;
  padding: 28rpx 0;
  border-bottom: 1rpx solid $divider;
  &:last-child {
    border-bottom: none;
  }
  .row-label {
    font-size: 28rpx;
    color: $text-2;
  }
  .row-value {
    display: flex;
    align-items: center;
    gap: 8rpx;
  }
  .value-main {
    font-size: 28rpx;
    font-weight: 600;
    color: $text-1;
  }
  .value-placeholder {
    font-size: 28rpx;
    color: $text-4;
  }
  .arrow {
    font-size: 36rpx;
    color: $text-4;
    margin-left: 8rpx;
  }
}
.people {
  display: flex;
  align-items: center;
  gap: 20rpx;
}
.p-btn {
  width: 48rpx;
  height: 48rpx;
  border-radius: 50%;
  border: 2rpx solid $border-1;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 32rpx;
  color: $text-2;
  &.add {
    background: linear-gradient(135deg, $brand-primary, $brand-primary-2);
    color: #fff;
    border-color: transparent;
  }
}
.p-num {
  min-width: 40rpx;
  text-align: center;
  font-size: 30rpx;
  font-weight: 700;
}
.time-tabs {
  display: flex;
  gap: 12rpx;
}
.time-tab {
  padding: 10rpx 28rpx;
  border-radius: $radius-pill;
  font-size: 24rpx;
  color: $text-2;
  background: $bg-surface-alt;
  &.active {
    background: $brand-primary;
    color: #fff;
    font-weight: 600;
  }
}
.addr-card {
  display: flex;
  align-items: center;
  padding: 28rpx;
}
.addr-info {
  flex: 1;
  min-width: 0;
}
.addr-top {
  display: flex;
  align-items: center;
  gap: 12rpx;
}
.addr-name {
  font-size: 30rpx;
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
  // background: rgba(245, 182, 193, 0.18);
  padding: 2rpx 10rpx;
  border-radius: $radius-sm;
}
.addr-detail {
  margin-top: 8rpx;
  font-size: 24rpx;
  color: $text-3;
  line-height: 1.4;
}
.addr-empty {
  flex: 1;
  display: flex;
  align-items: center;
  gap: 12rpx;
  .addr-empty-text {
    font-size: 26rpx;
    color: $text-4;
  }
}

/* 过敏原总警告 */
.allergen-alert {
  margin: 12rpx 0 20rpx;
  padding: 20rpx 24rpx;
  border-radius: $radius-md;
  background: linear-gradient(135deg, rgba(224, 139, 139, 0.1), rgba(224, 139, 139, 0.06));
  border: 2rpx solid rgba(224, 139, 139, 0.3);
  display: flex;
  align-items: flex-start;
  gap: 14rpx;
  .aa-icon {
    font-size: 36rpx;
    flex-shrink: 0;
  }
  .aa-body {
    flex: 1;
    display: flex;
    flex-direction: column;
    gap: 4rpx;
  }
  .aa-title {
    font-size: 26rpx;
    font-weight: 700;
    color: $color-danger;
  }
  .aa-text {
    font-size: 22rpx;
    color: $text-2;
    line-height: 1.4;
  }
}

/* 订单明细行 */
.item-row {
  display: flex;
  align-items: flex-start;
  padding: 20rpx 0;
  border-bottom: 1rpx solid $divider;
  &:last-child {
    border-bottom: none;
  }
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
.item-warn {
  display: flex;
  align-items: center;
  gap: 6rpx;
  padding: 4rpx 0;
  .iw-icon {
    font-size: 22rpx;
  }
  .iw-text {
    font-size: 20rpx;
  }
  &.wl-2 {
    .iw-text {
      color: $color-danger;
      font-weight: 600;
    }
  }
  &.wl-1 {
    .iw-text {
      color: $color-warning;
    }
  }
}
.item-right {
  margin-left: 16rpx;
}
.item-qty {
  font-size: 26rpx;
  color: $text-3;
}

/* 撒娇留言卡 */
.sweet-card,
.order-card {
  background: linear-gradient(135deg, #fff 0%, $bg-taro 100%);
}
.ipt {
  width: 100%;
  min-height: 88rpx;
  padding: 0 24rpx;
  background: $bg-surface-alt;
  border-radius: $radius-md;
  font-size: 28rpx;
  color: $text-1;
  box-sizing: border-box;
  &.textarea {
    min-height: 120rpx;
    padding: 20rpx 24rpx;
    line-height: 1.5;
  }
}
.ipt-ph {
  color: $text-4;
}
.sweet-tags {
  padding-bottom: 12rpx;
}
.sweet-tag {
  background: $bg-surface-alt;
  color: $text-2;
  border: 2rpx solid transparent;
  &.active {
    background: rgba(255, 255, 255, 0.15);
    border-color: var(--c-primary, #F5B6C1);
    color: var(--c-primary, #F5B6C1);
    font-weight: 600;
  }
}
.sweet-foot {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8rpx 0 20rpx;
  .sf-count {
    font-size: 20rpx;
    color: $text-4;
  }
  .sf-clear {
    font-size: 22rpx;
    color: $text-3;
    transition: opacity 0.2s ease, transform 0.15s ease;
    &:active {
      opacity: 0.7;
      transform: scale(0.95);
    }
  }
}

.remark-foot {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8rpx 0 20rpx;
  .rf-count {
    font-size: 20rpx;
    color: $text-4;
  }
  .rf-clear {
    font-size: 22rpx;
    color: $text-3;
    transition: opacity 0.2s ease, transform 0.15s ease;
    &:active {
      opacity: 0.7;
      transform: scale(0.95);
    }
  }
}

.quick-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 16rpx;
  padding: 12rpx 0 24rpx;
}
.qr-tag {
  padding: 10rpx 24rpx;
  background: $bg-surface-alt;
  border-radius: $radius-pill;
  font-size: 24rpx;
  color: $text-2;
  border: 2rpx solid transparent;
  &.active {
    background: rgba(255, 255, 255, 0.15);
    border-color: var(--c-primary, #F5B6C1);
    color: var(--c-primary, #F5B6C1);
    font-weight: 600;
  }
}
.bottom-holder {
  height: 180rpx;
}
.submit-bar {
  position: fixed;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: 900;
  height: 130rpx;
  background: #fff;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 28rpx;
  box-shadow: 0 -4rpx 24rpx rgba(245, 182, 193, 0.18);
}
.total {
  display: flex;
  flex-direction: column;
  .total-word {
    display: flex;
    align-items: center;
    gap: 8rpx;
    font-size: 30rpx;
    font-weight: 800;
    color: $brand-primary;
  }
  .total-sub {
    margin-top: 4rpx;
    font-size: 22rpx;
    color: $text-3;
  }
}
.submit-btn {
  padding: 24rpx 48rpx;
  background: linear-gradient(135deg, $brand-primary, $brand-primary-2);
  color: #fff;
  font-size: 30rpx;
  font-weight: 800;
  border-radius: $radius-pill;
  box-shadow: $shadow-press;
  &.disabled {
    opacity: 0.5;
  }
}
</style>
