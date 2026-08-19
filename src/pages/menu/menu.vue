<template>
  <view
    class="page menu-page"
    :class="couple.themeClass"
    :style="couple.themeStyle"
  >
    <NavBar :show-back="false">
      <view class="nav-center">
        <view class="brand-row" @click="openTagHelp">
          <text class="brand">{{
            isBoyfriend ? couple.myDisplayName + "的菜单" : "我们的小厨房"
          }}</text>
          <view class="brand-help">
            <nut-icon name="ask" size="32rpx" custom-color="#fff" />
          </view>
        </view>
        <text class="sub">{{
          isBoyfriend
            ? "看看" + couple.partnerDisplayName + "想吃啥 · 标注你会做的"
            : "挑你爱吃的 · 剩下的交给" + couple.partnerDisplayName
        }}</text>
      </view>
      <template #right>
        <view class="nav-right-group">
          <view
            v-if="isGirlfriend"
            class="nav-right nav-upload"
            @click="openUploadDialog"
          >
            <!-- <AppIcon name="upload" size="24" color="#fff" /> -->
            <nut-icon
              name="photograph"
              size="24rpx"
              :custom-color="couple.themeStyle['--c-primary']"
            />
            <text class="nr-text">上传新菜品</text>
          </view>
          <view v-if="isBoyfriend" class="nav-right" @click="goOrders">
            <AppIcon name="order" size="24" color="#fff" />
            <text class="nr-text">订单</text>
          </view>
        </view>
      </template>
    </NavBar>

    <PageLoading :visible="firstLoading" @timeout="firstLoading = false" />

    <!-- 搜索 -->
    <view class="search-bar">
      <view class="search-input">
        <!-- <AppIcon name="search" size="26" color="#999" class="s-icon" /> -->
        <nut-icon
          name="search2"
          size="30rpx"
          :custom-color="couple.themeStyle['--c-primary']"
          class="s-icon"
        />
        <input
          :value="rawKeyword"
          class="s-input"
          placeholder="想找点什么好吃的？"
          placeholder-class="s-ph"
          confirm-type="search"
          :adjust-position="true"
          @input="onSearchInput"
        />
        <nut-icon
          v-if="rawKeyword"
          name="close"
          size="26rpx"
          custom-color="#999"
          class="s-clear"
          @click="clearSearch"
        />
      </view>
    </view>

    <!-- 搜索结果模式 -->
    <scroll-view
      v-if="keyword"
      scroll-y
      class="search-result"
      :show-scrollbar="false"
      :refresher-enabled="isMpWeixin"
      :refresher-triggered="isMpWeixin ? refreshing : false"
      @refresherrefresh="onRefresh"
    >
      <view class="result-title">搜索结果 · {{ searchResults.length }} 个</view>
      <!-- 女友端：DishCard 展示 -->
      <view v-if="isGirlfriend && searchResults.length" class="dish-list">
        <DishCard
          v-for="d in searchResults"
          :key="d.id"
          :dish="d"
          :qty="cart.qtyOf(d.id)"
          :favorite="preference.isFavorite(d.id)"
          @add="onAddToCart(d.id)"
          @minus="onMinusFromCart(d.id)"
          @note="onNoteDish($event)"
          @toggle-favorite="onToggleFavorite(d.id)"
          @click="goDishDetail(d.id)"
        />
      </view>
      <!-- 男友端：简化行展示 -->
      <view v-else-if="isBoyfriend && searchResults.length" class="bf-list">
        <view
          class="bf-dish-item"
          v-for="d in searchResults"
          :key="d.id"
          @click="goDishDetail(d.id)"
        >
          <image
            v-if="d.image"
            class="bf-dish-img"
            :src="resolveUrl(d.image)"
            mode="aspectFill"
          />
          <DishEmoji
            v-else
            :image="d.image"
            :emoji="d.emoji"
            :bg="d.bgColor"
            size="md"
          />
          <view class="bf-dish-body">
            <text class="bf-dish-name">{{ d.name }}</text>
            <view v-if="preference.isFavorite(d.id)" class="bf-fav-badge">
              <text>{{ couple.partnerDisplayName }}想吃</text>
            </view>
            <text class="bf-dish-desc ellipsis">{{ d.desc }}</text>
            <view class="bf-tags-row">
              <text
                v-for="a in (d.allergens || []).filter((a) =>
                  preference.allergens.includes(a),
                )"
                :key="'ba-' + a"
                class="bf-tag allergen-tag"
                >{{ a }}</text
              >
              <text
                v-for="d in d.dislikeTags || []"
                :key="'bdl-' + d"
                class="bf-tag dislike-tag"
                >{{ d }}</text
              >
              <text
                v-for="dt in d.dietTags || []"
                :key="'bdt-' + dt"
                class="bf-tag diet-tag"
                >{{ dt }}</text
              >
              <text v-for="t in d.tags || []" :key="'bt-' + t" class="bf-tag">{{
                t
              }}</text>
            </view>
          </view>
          <view
            class="bf-cook-badge"
            :class="cookBadgeClass(d)"
            @click.stop="showCookPicker(d)"
          >
            <text>{{ cookBadgeText(d) }}</text>
          </view>
        </view>
      </view>
      <Empty
        v-else
        icon="chopsticks"
        text="没找到相关菜品"
        :desc="
          isGirlfriend ? '换个关键词，或者点下面自己写一个' : '换个关键词试试'
        "
      />
      <view v-if="isGirlfriend" class="custom-entry" @click="openCustomDialog">
        <!-- <AppIcon name="edit" size="36" color="#B8A2C7" class="ce-icon" /> -->
        <nut-icon
          name="edit"
          class="ce-icon"
          size="36rpx"
          :custom-color="couple.themeStyle['--c-primary']"
        />
        <text class="ce-text">没找到？自己写一个想吃的</text>
        <nut-icon
          name="rect-right"
          size="30rpx"
          :custom-color="couple.themeStyle['--c-primary']"
        />
      </view>
      <view class="scroll-bottom-pad" :class="{ 'has-cart': isGirlfriend }" />
    </scroll-view>

    <!-- 正常菜单模式：左分类 + 右菜品 -->
    <view v-else class="menu-body">
      <scroll-view
        scroll-y
        class="sidebar"
        :class="{
          'sidebar-girlfriend': isGirlfriend,
          'sidebar-boyfriend': isBoyfriend,
        }"
        :scroll-into-view="'sb-' + activeCat"
        scroll-with-animation="true"
        :show-scrollbar="false"
      >
        <view
          v-for="cat in categories"
          :key="cat.id"
          :id="'sb-' + cat.id"
          class="cat-item"
          :class="{ active: activeCat === cat.id }"
          @click="onCatClick(cat.id)"
        >
          <view class="cat-bar" />
          <text class="cat-icon">{{ cat.icon }}</text>
          <text class="cat-name">{{ cat.name }}</text>
        </view>
        <!-- 女友端：添加新分类 -->
        <view v-if="isGirlfriend" class="cat-add" @click="openAddCategory">
          <view class="cat-add-icon">
            <text class="plus-icon">+</text>
          </view>
          <text class="cat-name">添加</text>
        </view>
        <!-- 分类空状态 -->
        <view v-if="!categories.length" class="sidebar-empty">
          <text class="se-emoji">🍽️</text>
          <text class="se-text">还没有分类</text>
          <text class="se-sub" v-if="isGirlfriend">点下方 + 添加</text>
          <text class="se-sub" v-else>告诉{{ couple.partnerDisplayName }}想吃什么吧</text>
        </view>
      </scroll-view>

      <scroll-view
        scroll-y
        class="dish-scroll"
        :class="{ 'has-cart': isGirlfriend }"
        :scroll-into-view="rightIntoView"
        :scroll-with-animation="true"
        :show-scrollbar="false"
        :refresher-enabled="isMpWeixin"
        :refresher-triggered="isMpWeixin ? refreshing : false"
        @refresherrefresh="onRefresh"
        @scroll="onScroll"
      >
        <!-- 想吃别的？入口（女友端自定义菜品） -->
        <view
          v-if="isGirlfriend"
          class="custom-entry"
          @click="openCustomDialog"
        >
          <view class="ce-left">
            <!-- <AppIcon name="edit" size="40" color="#B8A2C7" class="ce-icon" /> -->
            <nut-icon
              name="edit"
              class="ce-icon"
              size="40rpx"
              :custom-color="couple.themeStyle['--c-primary']"
            />
            <view class="ce-body">
              <text class="ce-title">想吃别的？</text>
              <text class="ce-sub"
                >自己写一个，{{ couple.partnerDisplayName }}安排</text
              >
            </view>
          </view>
          <nut-icon
            name="rect-right"
            size="32rpx"
            :custom-color="couple.themeStyle['--c-primary']"
          />
        </view>

        <view
          v-for="cat in categories"
          :key="cat.id"
          :id="'cat-' + cat.id"
          class="section"
        >
          <view class="section-head">
            <view class="sec-name-row">
              <text class="sec-name">{{ cat.icon }} {{ cat.name }}</text>
              <text class="sec-count"
                >{{ (dishMap[cat.id] && dishMap[cat.id].length) || 0 }}款</text
              >
            </view>
            <text v-if="cat.desc" class="sec-desc">{{ cat.desc }}</text>
          </view>
          <!-- 女友端：DishCard -->
          <view v-if="isGirlfriend" class="dish-list">
            <template v-if="dishMap[cat.id] && dishMap[cat.id].length > 0">
              <DishCard
                v-for="d in dishMap[cat.id]"
                :key="d.id"
                :dish="d"
                :qty="cart.qtyOf(d.id)"
                :favorite="preference.isFavorite(d.id)"
                @add="onAddToCart(d.id)"
                @minus="onMinusFromCart(d.id)"
                @note="onNoteDish($event)"
                @toggle-favorite="onToggleFavorite(d.id)"
                @click="goDishDetail(d.id)"
              />
            </template>
            <!-- 空分类：点击跳转上传弹窗 -->
            <view
              v-else
              class="empty-cat-tip"
              @click="openUploadForCategory(cat)"
            >
              <text class="empty-emoji">{{ cat.icon }}</text>
              <text class="empty-title">还没有「{{ cat.name }}」</text>
              <text class="empty-action"
                ><nut-icon
                  style="vertical-align: bottom"
                  name="photograph"
                  size="24rpx"
                  :custom-color="couple.themeStyle['--c-primary']"
                />上传一道给{{ couple.partnerDisplayName }}</text
              >
            </view>
          </view>
          <!-- 男友端：简化行 -->
          <view v-else class="bf-list">
            <template v-if="dishMap[cat.id] && dishMap[cat.id].length > 0">
              <view
                v-for="d in dishMap[cat.id]"
                :key="d.id"
                class="bf-dish-item"
                @click="goDishDetail(d.id)"
              >
                <image
                  v-if="d.image"
                  class="bf-dish-img"
                  :src="resolveUrl(d.image)"
                  mode="aspectFill"
                />
                <DishEmoji
                  v-else
                  :image="d.image"
                  :emoji="d.emoji"
                  :bg="d.bgColor"
                  size="md"
                />
                <view class="bf-dish-body">
                  <view class="bf-name-row">
                    <text class="bf-dish-name">{{ d.name }}</text>
                    <view
                      v-if="preference.isFavorite(d.id)"
                      class="bf-fav-badge"
                    >
                      <text>{{ couple.partnerDisplayName }}想吃</text>
                    </view>
                  </view>
                  <text class="bf-dish-desc ellipsis">{{ d.desc }}</text>
                  <view class="bf-tags-row">
                    <text
                      v-for="a in (d.allergens || []).filter((a) =>
                        preference.allergens.includes(a),
                      )"
                      :key="'ba2-' + a"
                      class="bf-tag allergen-tag"
                      >{{ a }}</text
                    >
                    <text
                      v-for="dd in d.dislikeTags || []"
                      :key="'bdl2-' + dd"
                      class="bf-tag dislike-tag"
                      >{{ dd }}</text
                    >
                    <text
                      v-for="dt in d.dietTags || []"
                      :key="'bdt2-' + dt"
                      class="bf-tag diet-tag"
                      >{{ dt }}</text
                    >
                    <text
                      v-for="t in d.tags || []"
                      :key="'bt2-' + t"
                      class="bf-tag"
                      >{{ t }}</text
                    >
                  </view>
                </view>
                <view
                  class="bf-cook-badge"
                  :class="cookBadgeClass(d)"
                  @click.stop="showCookPicker(d)"
                >
                  <text>{{ cookBadgeText(d) }}</text>
                </view>
              </view>
            </template>
            <view v-else class="empty-cat-tip bf-empty">
              <text class="empty-emoji">{{ cat.icon }}</text>
              <text class="empty-title">「{{ cat.name }}」暂无菜品</text>
              <text class="empty-hint"
                >告诉{{ couple.partnerDisplayName }}想吃什么吧</text
              >
            </view>
          </view>
        </view>
        <!-- 全部为空时的全局空状态 -->
        <view v-if="!categories.length" class="global-empty">
          <text class="ge-emoji">🍳</text>
          <text class="ge-title">{{ isGirlfriend ? '还没有菜品分类' : '菜单空空如也' }}</text>
          <text class="ge-desc">
            {{ isGirlfriend
              ? '添加分类，上传你们的私房菜'
              : '告诉' + couple.partnerDisplayName + ' 想吃什么吧' }}
          </text>
          <view
            v-if="isGirlfriend"
            class="ge-btn"
            @click="openAddCategory"
          >
            <text>添加分类</text>
          </view>
          <view
            v-else
            class="ge-btn"
            @click="goCategory"
          >
            <text>去看看</text>
          </view>
        </view>
        <view class="scroll-bottom-tip" v-if="categories.length"
          >— 已经到底啦{{
            isGirlfriend ? `，快去麻烦${couple.partnerDisplayName}吧` : ""
          }}
          —</view
        >
        <view class="scroll-bottom-pad" :class="{ 'has-cart': isGirlfriend }" />
      </scroll-view>
    </view>

    <CartBar v-if="isGirlfriend" />

    <TabBar current="menu" />

    <!-- 备注 / 自定义想吃 弹窗（女友端） -->
    <DishNoteDialog
      v-if="isGirlfriend"
      :visible="dialogVisible"
      :dish="noteDish"
      @close="dialogVisible = false"
      @add="onDialogAdd"
    />

    <!-- 上传菜品弹窗（女友端） -->
    <UploadDishDialog
      v-if="isGirlfriend"
      :visible="uploadVisible"
      :initial-category-id="uploadInitialCategoryId"
      @close="uploadVisible = false"
      @submit="handleUploadSubmit"
    />

    <!-- 加入菜单确认弹窗 -->
    <view
      v-if="showAddToMenuConfirm"
      class="confirm-mask"
      @click="showAddToMenuConfirm = false"
      @touchmove.stop.prevent
    >
      <view class="confirm-dialog" @click.stop @touchmove.stop.prevent>
        <view class="confirm-icon">🍽️</view>
        <view class="confirm-title">加入菜单？</view>
        <view class="confirm-desc">
          将「{{ pendingCustomPayload?.name }}」上传到菜单，{{ couple.partnerDisplayName }}就能看到啦
        </view>
        <view class="confirm-actions">
          <view class="confirm-btn cancel" @click="showAddToMenuConfirm = false">
            <text>先不了</text>
          </view>
          <view class="confirm-btn confirm" @click="confirmAddToMenu">
            <text>加入菜单</text>
          </view>
        </view>
      </view>
    </view>

    <!-- 分类选择弹窗（加入菜单流程） -->
    <CategoryPicker
      v-model:visible="showCategoryPickerForMenu"
      :categories="categories"
      :current-value="selectedMenuCategoryId"
      title="选择分类"
      @change="onMenuCategoryPicked"
      @open-add-category="onMenuAddCategory"
    />

    <Toast />

    <!-- 标签颜色说明弹窗（中间弹出） -->
    <view
      v-if="tagHelpVisible"
      class="tag-help-mask"
      :class="{ show: tagHelpShow }"
      @click="closeTagHelp"
      @touchmove.stop.prevent
    >
      <view
        class="tag-help-dialog"
        :class="{ show: tagHelpShow }"
        @click.stop
        @touchmove.stop.prevent
      >
        <view class="thd-header">
          <text class="thd-title">标签颜色说明</text>
          <view class="thd-close" @click="closeTagHelp">
            <nut-icon
              name="close"
              size="24rpx"
              :custom-color="couple.themeStyle['--c-primary'] || '#999'"
            />
          </view>
        </view>
        <view class="thd-body">
          <view class="thd-item">
            <view class="thd-color thc-warn" />
            <view class="thd-info">
              <text class="thd-label">过敏原</text>
              <text class="thd-desc">对该食材过敏，请谨慎食用</text>
            </view>
          </view>
          <view class="thd-item">
            <view class="thd-color thc-dislike" />
            <view class="thd-info">
              <text class="thd-label">忌口食材</text>
              <text class="thd-desc">不吃或不想吃的食材</text>
            </view>
          </view>
          <view class="thd-item">
            <view class="thd-color thc-info" />
            <view class="thd-info">
              <text class="thd-label">饮食标签</text>
              <text class="thd-desc">饮食偏好，如少油、少盐、香菜等</text>
            </view>
          </view>
          <view class="thd-item">
            <view class="thd-color thc-selected" />
            <view class="thd-info">
              <text class="thd-label">菜品标签</text>
              <text class="thd-desc">菜品特色，如经典、下饭、快手等</text>
            </view>
          </view>
        </view>
      </view>
    </view>

    <!-- 女友端侧边"+"直接新增分类弹窗 -->
    <AddCategoryDialog
      v-show="directAddVisible"
      :visible="directAddVisible"
      :existing-emojis="existingCategoryEmojis"
      :existing-names="existingCategoryNames"
      @update:visible="directAddVisible = $event"
      @confirm="onCategoryAdded"
    />

    <!-- 男友端会做标注 ActionSheet -->
    <ActionSheetPicker
      v-model:visible="showCookPickerVisible"
      :items="cookItems"
      :current-index="currentCookIndex"
      title="标注烹饪状态"
      @change="onCookPicked"
    />
  </view>
</template>

<script setup>
import { ref, computed, onMounted, nextTick } from "vue";
import {
  onShow,
  onHide,
  onLoad,
  onReady,
  onPullDownRefresh,
} from "@dcloudio/uni-app";
import NavBar from "@/components/NavBar.vue";
import PageLoading from "@/components/PageLoading.vue";
import DishCard from "@/components/DishCard.vue";
import CartBar from "@/components/CartBar.vue";
import TabBar from "@/components/TabBar.vue";
import Empty from "@/components/Empty.vue";
import DishNoteDialog from "@/components/DishNoteDialog.vue";
import DishEmoji from "@/components/DishEmoji.vue";
import AddCategoryDialog from "@/components/AddCategoryDialog.vue";
import ActionSheetPicker from "@/components/ActionSheetPicker.vue";
import UploadDishDialog from "@/components/UploadDishDialog.vue";
import CategoryPicker from "@/components/CategoryPicker.vue";
import { useCartStore } from "@/store/cart";
import {
  usePreferenceStore,
} from "@/store/preference";
import { useDishStore } from "@/store/dish";
import { useCoupleStore } from "@/store/couple";
import { resolveUrl } from "@/utils/server";
import AppIcon from "@/components/AppIcon.vue";
import Toast from "@/components/Toast.vue";
import { toast } from "@/utils/toast";
import { requireLogin } from "@/utils/auth";
import { usePoll } from "@/utils/sync";

// 菜单页需要情侣资料同步（头像/昵称/主题等）+ 菜品同步 + 偏好同步（收藏/忌口）
usePoll(["couple", "dishes", "preferences"]);

const cart = useCartStore();
const preference = usePreferenceStore();
const dishStore = useDishStore();
const couple = useCoupleStore();

const isGirlfriend = computed(() => couple.isGirlfriend);
const isBoyfriend = computed(() => couple.isBoyfriend);

const isMpWeixin = ref(false);
// #ifdef MP-WEIXIN
isMpWeixin.value = true;
// #endif

const rawKeyword = ref("");
const keyword = ref("");
let searchTimer = null;

function onSearchInput(e) {
  rawKeyword.value = e.detail.value;
  if (searchTimer) clearTimeout(searchTimer);
  searchTimer = setTimeout(() => {
    keyword.value = rawKeyword.value;
  }, 300);
}

function clearSearch() {
  rawKeyword.value = "";
  keyword.value = "";
  if (searchTimer) {
    clearTimeout(searchTimer);
    searchTimer = null;
  }
}

const activeCat = ref("");
const scrollTopVal = ref(0);
const rightIntoView = ref("");
const pendingCat = ref("");
const firstLoading = ref(true);

function setDefaultCat() {
  if (!categories.value.length) return;
  if (!activeCat.value || !categories.value.find((c) => c.id === activeCat.value)) {
    activeCat.value = categories.value[0].id;
  }
}

const directAddVisible = ref(false);

function onCatClick(id) {
  scrollToCat(id);
}

function openAddCategory() {
  if (!requireLogin(couple)) return;
  directAddVisible.value = true;
}

function openAddCategoryFromPicker() {
  directAddVisible.value = true;
}

const existingCategoryEmojis = computed(() => {
  return categories.value.filter((c) => c.icon).map((c) => c.icon);
});

const existingCategoryNames = computed(() => {
  return categories.value.filter((c) => c.name).map((c) => c.name);
});

// 上传菜品弹窗（女友端）
const uploadVisible = ref(false);
const uploadInitialCategoryId = ref("");

function openUploadForCategory(cat) {
  if (!requireLogin(couple)) return;
  uploadInitialCategoryId.value = cat.id;
  uploadVisible.value = true;
}

function openUploadDialog() {
  if (!requireLogin(couple)) return;
  uploadInitialCategoryId.value = "";
  uploadVisible.value = true;
}

// 备注 / 自定义 弹窗
const dialogVisible = ref(false);
const noteDish = ref(null); // null = 自定义模式；对象 = 给该菜备注

// 自定义菜品加入菜单流程状态
const pendingCustomPayload = ref(null); // 暂存自定义菜品数据
const showAddToMenuConfirm = ref(false); // 确认是否加入菜单
const showCategoryPickerForMenu = ref(false); // 选择分类弹窗
const selectedMenuCategoryId = ref(null); // 用户选择的分类ID
const pendingPickerAfterAddCat = ref(false); // 添加分类后是否重开选择器

// 自定义 ActionSheetPicker 状态
const showCookPickerVisible = ref(false);
const currentCookItem = ref(null);
const cookItems = [
  { label: "会做", value: 1 },
  { label: "不会做", value: 0 },
  { label: "清除标注", value: -1 },
];
const refreshing = ref(false);
const tagHelpVisible = ref(false);
const tagHelpShow = ref(false); // controls the actual display (for animation)

function openTagHelp() {
  tagHelpVisible.value = true;
  nextTick(() => {
    setTimeout(() => {
      tagHelpShow.value = true;
    }, 10);
  });
}

function closeTagHelp() {
  tagHelpShow.value = false;
  setTimeout(() => {
    tagHelpVisible.value = false;
  }, 250);
}

const categories = computed(() => dishStore.allCategories);

const dishes = computed(() => dishStore.dishes);

const dishMap = computed(() => dishStore.dishByCat);

async function onCategoryAdded(newCat) {
  try {
    await dishStore.addCategory(newCat);
    toast.success(`已添加分类：${newCat.name}`);
    // 加入菜单流程中，添加分类后自动提交
    if (pendingPickerAfterAddCat.value) {
      pendingPickerAfterAddCat.value = false;
      showCategoryPickerForMenu.value = false;
      onMenuCategoryPicked(newCat.id);
    }
  } catch (e) {
    toast.error(e.message || "添加分类失败");
    pendingPickerAfterAddCat.value = false;
  }
}

const searchResults = computed(() => {
  const k = keyword.value.trim().toLowerCase();
  if (!k) return [];
  return dishes.value.filter(
    (d) =>
      d.name.toLowerCase().includes(k) ||
      d.desc.toLowerCase().includes(k) ||
      (d.tags && d.tags.some((t) => t.toLowerCase().includes(k))),
  );
});

function scrollToCat(id) {
  activeCat.value = id;
  pendingCat.value = id;
  rightIntoView.value = "cat-" + id;
  if (scrollTimer) clearTimeout(scrollTimer);
  scrollTimer = setTimeout(() => {
    pendingCat.value = "";
    measureSections(100);
  }, 600);
}

let currentScrollTop = 0;
let sectionTops = [];
let ticking = false;
let scrollTimer = null;
let measureTimer = null;

function measureSections(delay = 0) {
  if (measureTimer) clearTimeout(measureTimer);
  measureTimer = setTimeout(() => {
    if (!categories.value.length) return;
    const query = uni.createSelectorQuery();
    categories.value.forEach((c) => {
      query.select("#cat-" + c.id).boundingClientRect();
    });
    query.select(".dish-scroll").boundingClientRect();
    query.exec((res) => {
      if (!res) return;
      const containerTop = res[res.length - 1] ? res[res.length - 1].top : 0;
      sectionTops = res.slice(0, -1).map((r) => (r ? r.top - containerTop : 0));
    });
  }, delay);
}

function onScroll(e) {
  const top = e.detail.scrollTop;
  currentScrollTop = top;
  // 程序化滚动（点击左侧分类）期间不更新 activeCat，避免焦点被惯性带偏
  if (pendingCat.value) return;
  // 位置未测量好时不更新
  if (!sectionTops.length) return;
  if (ticking) return;
  ticking = true;
  setTimeout(() => {
    ticking = false;
  }, 100);
  let idx = 0;
  for (let i = 0; i < sectionTops.length; i++) {
    if (sectionTops[i] - 8 <= top) idx = i;
    else break;
  }
  const cat = categories.value[idx];
  if (cat && cat.id !== activeCat.value) {
    activeCat.value = cat.id;
  }
}

function goOrders() {
  uni.reLaunch({ url: "/pages/orders/orders" });
}

function goCategory() {
  if (!requireLogin(couple)) return;
  uni.navigateTo({ url: '/pages/category/category' });
}

/** 打开「给某道菜备注」弹窗 */
function openNoteDialog(dish) {
  if (!requireLogin(couple)) return;
  noteDish.value = dish;
  dialogVisible.value = true;
}

/** 打开「想吃别的？」自定义弹窗 */
function openCustomDialog() {
  if (!requireLogin(couple)) return;
  noteDish.value = null;
  dialogVisible.value = true;
}

function onAddToCart(dishId) {
  if (!requireLogin(couple)) return;
  cart.add(dishId);
}

function onMinusFromCart(dishId) {
  if (!requireLogin(couple)) return;
  cart.minus(dishId);
}

function onNoteDish(dish) {
  openNoteDialog(dish);
}

function onToggleFavorite(dishId) {
  if (!requireLogin(couple)) return;
  preference.toggleFavorite(dishId);
}

/** 弹窗确认加入 */
function onDialogAdd(payload) {
  if (!requireLogin(couple)) return;
  if (noteDish.value) {
    // 给已有菜品备注加入
    cart.addWithNote(noteDish.value.id, 1, {
      spicy: payload.spicy,
      dietNote: payload.dietNote,
    });
    toast.success("已加入小餐车");
  } else {
    // 自定义想吃
    const customDish = dishStore.createCustomDish({
      name: payload.name,
      spicy: payload.spicy,
      dietNote: payload.dietNote,
    });
    cart.addCustomDish(customDish, 1, {
      spicy: payload.spicy,
      dietNote: payload.dietNote,
    });
    // toast.success("已加入小餐车");
    // 提示是否加入菜单
    pendingCustomPayload.value = payload;
    showAddToMenuConfirm.value = true;
  }
}

/** 确认加入菜单 → 打开分类选择 */
function confirmAddToMenu() {
  showAddToMenuConfirm.value = false;
  showCategoryPickerForMenu.value = true;
  selectedMenuCategoryId.value = null;
  pendingPickerAfterAddCat.value = false;
}

/** 选择分类后上传菜品 */
async function onMenuCategoryPicked(categoryId) {
  selectedMenuCategoryId.value = categoryId;
  const payload = pendingCustomPayload.value;
  if (!payload || !categoryId) {
    showCategoryPickerForMenu.value = false;
    return;
  }
  try {
    await dishStore.createDish({
      name: payload.name,
      categoryId: categoryId,
      spicy: payload.spicy,
      price: 0,
    });
    toast.success("已加入菜单");
  } catch (e) {
    toast.error("加入菜单失败");
  }
  showCategoryPickerForMenu.value = false;
  pendingCustomPayload.value = null;
  selectedMenuCategoryId.value = null;
}

/** 加入菜单流程中添加新分类 */
function onMenuAddCategory() {
  showCategoryPickerForMenu.value = false;
  pendingPickerAfterAddCat.value = true;
  openAddCategory();
}

/** 处理 UploadDishDialog 提交 */
async function handleUploadSubmit(payload) {
  try {
    await dishStore.createDish(payload);
    toast.success("上传成功");
    uploadVisible.value = false;
    await dishStore.fetchAll();
  } catch (e) {
    toast.error("上传失败");
  }
}

// ── 男友端：会做标注 ──
function cookBadgeClass(d) {
  if (d.canCook === 1) return "cook-yes";
  if (d.canCook === 0) return "cook-no";
  return "cook-unknown";
}
function cookBadgeText(d) {
  if (d.canCook === 1) return "会做";
  if (d.canCook === 0) return "不会";
  return "标注";
}
function onToggleCook(d) {
  showCookPicker(d);
}

// 男友端标注：点击按钮弹出选择
function showCookPicker(d) {
  if (!requireLogin(couple)) return;
  currentCookItem.value = d;
  showCookPickerVisible.value = true;
}

function onCookPicked(idx, item) {
  if (!currentCookItem.value) return;
  confirmMark(currentCookItem.value, item.value);
  showCookPickerVisible.value = false;
}

const currentCookIndex = computed(() => {
  const d = currentCookItem.value;
  if (!d) return -1;
  const cur = d.canCook == null ? -1 : d.canCook;
  const idx = cookItems.findIndex((i) => i.value === cur);
  return idx === -1 ? -1 : idx;
});

// 菜品详情跳转
function goDishDetail(id) {
  uni.navigateTo({ url: "/pages/dish/detail?id=" + id });
}
async function confirmMark(d, next) {
  if (!d) return;
  const label = next === 1 ? "会做" : next === 0 ? "不会做" : "未标注";
  // 先乐观更新，让 badge 立即变化
  const idx = dishStore.dishes.findIndex((x) => x.id === d.id);
  const prev = idx !== -1 ? { ...dishStore.dishes[idx] } : null;
  if (idx !== -1) {
    dishStore.dishes.splice(idx, 1, {
      ...dishStore.dishes[idx],
      canCook: next,
    });
  }
  toast.success(`已标记：${label}`, 800);
  try {
    await dishStore.updateDish(d.id, { canCook: next });
  } catch (e) {
    toast.error("更新失败，已恢复");
    if (idx !== -1 && prev) {
      dishStore.dishes.splice(idx, 1, prev);
    }
  }
}

onMounted(() => {
  dishStore
    .init()
    .then(() => {
      setDefaultCat();
      nextTick(() => measureSections(250));
    })
    .finally(() => {
      firstLoading.value = false;
    });
});
onShow(async () => {
  // 切回菜单页时先同步情侣设置，再拉取菜品（确保 useDefaultDishes 最新）
  if (couple.coupleId && !couple.isDemo) {
    await couple.fetchFromServer().catch(() => {});
  }
  await dishStore.init();
  setDefaultCat();
  nextTick(() => measureSections(300));
  directAddVisible.value = false;
});
onHide(() => {
  directAddVisible.value = false;
});
onReady(() => {
  if (pendingCat.value) {
    const id = pendingCat.value;
    pendingCat.value = "";
    setTimeout(() => scrollToCat(id), 450);
  }
});
onLoad((q) => {
  if (q && q.cat) {
    activeCat.value = q.cat;
    pendingCat.value = q.cat;
  }
});

async function onRefresh() {
  refreshing.value = true;
  try {
    await Promise.all([
      dishStore.fetchAll(),
      couple.fetchFromServer(true),
      preference.init(),
    ]);
    // 刷新后重新测量各分类位置，保证左侧导航联动准确
    nextTick(() => measureSections(300));
  } catch (e) {
    // ignore
  } finally {
    refreshing.value = false;
  }
}

// #ifndef MP-WEIXIN
onPullDownRefresh(() => {
  onRefresh().finally(() => {
    uni.stopPullDownRefresh();
  });
});
// #endif
</script>

<style lang="scss" scoped>
.menu-page {
  height: 100vh;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}
.search-bar {
  flex-shrink: 0;
}

.nav-center {
  display: flex;
  flex-direction: column;
  align-items: center;
  .brand {
    font-size: 36rpx;
    font-weight: 800;
    color: #fff;
    letter-spacing: 2rpx;
  }
  .sub {
    font-size: 18rpx;
    color: rgba(255, 255, 255, 0.85);
    margin-top: 2rpx;
  }
}
.nav-right-group {
  display: flex;
  align-items: center;
}
.nav-right {
  display: flex;
  align-items: center;
  color: #fff;
  font-size: 24rpx;
  font-weight: 600;
  background: rgba(255, 255, 255, 0.28);
  padding: 8rpx 16rpx;
  border-radius: $radius-pill;
  white-space: nowrap;
  margin-left: 12rpx;
  &:first-child {
    margin-left: 0;
  }
}
.nav-upload {
  background: rgba(255, 255, 255, 0.45);
}
.search-bar {
  padding: 16rpx 24rpx 20rpx;
  background: linear-gradient(
    180deg,
    $brand-primary 0%,
    $brand-primary-2 60%,
    transparent 100%
  );
}
.search-input {
  display: flex;
  align-items: center;
  background: var(--c-bg-alt, #fff);
  border-radius: $radius-pill;
  padding: 14rpx 24rpx;
  box-shadow: $shadow-card;
}
.s-icon {
  font-size: 26rpx;
  margin-right: 12rpx;
  opacity: 0.7;
}
.s-input {
  flex: 1;
  font-size: 28rpx;
  color: $text-1;
}
.s-ph {
  color: $text-4;
}
.s-clear {
  padding: 0 8rpx;
}
.search-result {
  flex: 1;
  min-height: 0;
  padding: 0 24rpx;
}
.result-title {
  padding: 16rpx 0;
  font-size: 24rpx;
  color: $text-3;
}
.menu-body {
  flex: 1;
  position: relative;
  min-height: 0;
}
.sidebar {
  position: absolute;
  left: 0;
  top: 0;
  bottom: 0;
  width: 160rpx;
  background: $bg-surface-alt;
}
.sidebar-girlfriend {
  // #ifdef MP-WEIXIN
  height: calc(100% - 210rpx - env(safe-area-inset-bottom));
  // #endif
  // #ifdef H5
  max-height: calc(100% - 80rpx - env(safe-area-inset-bottom));
  // #endif
}
.sidebar-boyfriend {
  // #ifdef MP-WEIXIN
  height: calc(100% - 108rpx - env(safe-area-inset-bottom));
  // #endif
  // #ifdef H5
  max-height: calc(100% - 36rpx - env(safe-area-inset-bottom));
  // #endif
}
.cat-item {
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 28rpx 0;
  .cat-bar {
    position: absolute;
    left: 0;
    top: 50%;
    transform: translateY(-50%);
    width: 6rpx;
    height: 0;
    background: $brand-primary;
    border-radius: 0 4rpx 4rpx 0;
    transition: height 0.2s ease;
  }
  .cat-icon {
    font-size: 36rpx;
  }
  .cat-name {
    margin-top: 6rpx;
    font-size: 24rpx;
    color: $text-2;
  }
  &.active {
    background: var(--c-bg-page, #fff);
    .cat-bar {
      height: 36rpx;
    }
    .cat-name {
      color: $brand-primary-dark;
      font-weight: 700;
    }
  }
}

/* 分类新增 */
.cat-add {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 28rpx 0;
  // margin-top: 8rpx;
  // margin-bottom: 16rpx;
  border-top: 2rpx dashed rgba($text-3, 0.2);
  &:active {
    background: rgba($brand-primary, 0.1);
  }
  .cat-add-icon {
    width: 48rpx;
    height: 48rpx;
    display: flex;
    align-items: center;
    justify-content: center;
    background: linear-gradient(135deg, $brand-primary, $brand-primary-dark);
    border-radius: 50%;
  }
  .plus-icon {
    font-size: 32rpx;
    color: #fff;
    font-weight: 300;
    line-height: 1;
  }
  .cat-name {
    margin-top: 8rpx;
    font-size: 22rpx;
    color: $brand-primary;
  }
}

/* 侧边栏空状态 */
.sidebar-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 40rpx 16rpx;
  gap: 8rpx;
  .se-emoji {
    font-size: 56rpx;
    opacity: 0.5;
  }
  .se-text {
    font-size: 24rpx;
    color: $text-2;
    font-weight: 600;
  }
  .se-sub {
    font-size: 20rpx;
    color: $text-3;
    text-align: center;
  }
}

/* 全局空状态（无分类时） */
.global-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 16rpx;
  padding: 80rpx 32rpx;
  .ge-emoji {
    font-size: 80rpx;
    opacity: 0.6;
  }
  .ge-title {
    font-size: 32rpx;
    font-weight: 700;
    color: $text-1;
  }
  .ge-desc {
    font-size: 26rpx;
    color: $text-3;
    text-align: center;
  }
  .ge-btn {
    margin-top: 16rpx;
    padding: 16rpx 48rpx;
    background: $brand-primary;
    border-radius: $radius-pill;
    &:active {
      transform: scale(0.96);
      opacity: 0.9;
    }
    text {
      font-size: 28rpx;
      font-weight: 600;
      color: #fff;
    }
  }
}

/* 空分类提示 */
.empty-cat-tip {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 48rpx 24rpx;
  background: $bg-surface-alt;
  border-radius: $radius-lg;
  margin: 16rpx 0;
  &:active {
    opacity: 0.8;
  }
  .empty-emoji {
    font-size: 56rpx;
    margin-bottom: 12rpx;
  }
  .empty-title {
    font-size: 28rpx;
    color: $text-2;
    margin-bottom: 8rpx;
  }
  .empty-action {
    font-size: 26rpx;
    color: $brand-primary;
    font-weight: 600;
  }
  .empty-hint {
    font-size: 24rpx;
    color: $text-3;
  }
}
.bf-empty {
  // background: #f9f5f7;
  padding: 36rpx 24rpx;
}
.dish-scroll {
  position: absolute;
  left: 160rpx;
  top: 0;
  bottom: 0;
  width: calc(100% - 160rpx);
  padding: 0 24rpx;
  overflow-x: hidden;
  box-sizing: border-box;
}

/* 想吃别的入口 */
.custom-entry {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin: 16rpx 0 8rpx;
  padding: 20rpx 24rpx;
  box-sizing: border-box;
  background: linear-gradient(135deg, #fff, $bg-taro);
  border-radius: $radius-lg;
  box-shadow: $shadow-card;
}
.ce-left {
  display: flex;
  align-items: center;
  gap: 16rpx;
}
.ce-icon {
  font-size: 36rpx;
}
.ce-body {
  display: flex;
  flex-direction: column;
}
.ce-title {
  font-size: 28rpx;
  font-weight: 700;
  color: $text-1;
}
.ce-sub {
  margin-top: 2rpx;
  font-size: 22rpx;
  color: $text-3;
}
.ce-text {
  flex: 1;
  font-size: 26rpx;
  color: $brand-taro;
  font-weight: 600;
}
.ce-arrow {
  font-size: 32rpx;
  color: $text-4;
}

.section {
  margin-top: 12rpx;
}
.section-head {
  display: flex;
  flex-direction: column;
  gap: 4rpx;
  padding: 16rpx 4rpx 12rpx;
  .sec-name-row {
    display: flex;
    align-items: baseline;
    gap: 12rpx;
  }
  .sec-name {
    font-size: 30rpx;
    font-weight: 800;
    color: $text-1;
  }
  .sec-count {
    font-size: 20rpx;
    color: $text-4;
  }
  .sec-desc {
    font-size: 22rpx;
    color: $text-3;
    padding-left: 4rpx;
  }
}
.dish-list {
  padding-top: 4rpx;
}
.scroll-bottom-tip {
  text-align: center;
  padding: 24rpx 0 36rpx;
  // #ifdef MP-WEIXIN
  padding-bottom: calc(env(safe-area-inset-bottom));
  // #endif
  font-size: 22rpx;
  color: $text-4;
}
/* 底部占位：避让固定的 TabBar（男友端）/ CartBar+TabBar（女友端）*/
.scroll-bottom-pad {
  height: calc(60px + constant(safe-area-inset-bottom));
  height: calc(60px + env(safe-area-inset-bottom));
}
.scroll-bottom-pad.has-cart {
  height: calc(110px + constant(safe-area-inset-bottom));
  height: calc(110px + env(safe-area-inset-bottom));
}

/* ── 男友端：菜品简化行 ── */
.bf-list {
  padding-top: 4rpx;
}
.bf-dish-item {
  display: flex;
  align-items: center;
  gap: 20rpx;
  padding: 24rpx;
  margin-bottom: 16rpx;
  background: var(--c-bg-alt, #fff);
  border-radius: $radius-lg;
  box-shadow: $shadow-card;
  overflow: hidden;
}
.bf-dish-img {
  width: 120rpx;
  height: 120rpx;
  border-radius: $radius-md;
  flex-shrink: 0;
}
.bf-dish-body {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 4rpx;
}
.bf-dish-name {
  font-size: 30rpx;
  font-weight: 700;
  color: $text-1;
}
.bf-name-row {
  display: flex;
  align-items: center;
  gap: 10rpx;
  flex-wrap: nowrap;
  overflow: hidden;
}
.bf-dish-name {
  flex-shrink: 1;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.bf-fav-badge {
  flex-shrink: 0;
  margin-left: auto;
  font-size: 20rpx;
  color: var(--c-primary-dark);
  background: var(--c-primary-bg, rgba(245, 182, 193, 0.15));
  padding: 2rpx 14rpx;
  border-radius: $radius-pill;
  font-weight: 600;
}
.bf-dish-desc {
  font-size: 24rpx;
  color: $text-3;
}
.bf-tags-row {
  margin-top: 4rpx;
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 6rpx;
}
.bf-tag {
  font-size: 18rpx;
  color: $tag-selected-color;
  background: $tag-selected-bg;
  padding: 2rpx 10rpx;
  border-radius: $radius-sm;
  line-height: 1.4;
  &.allergen-tag {
    color: $tag-warn-color;
    background: $tag-warn-bg;
  }
  &.dislike-tag {
    color: $tag-dislike-color;
    background: $tag-dislike-bg;
  }
  &.diet-tag {
    color: $tag-info-color;
    background: $tag-info-bg;
  }
}
.bf-cook-badge {
  flex-shrink: 0;
  min-width: 84rpx;
  padding: 10rpx 20rpx;
  border-radius: $radius-pill;
  font-size: 24rpx;
  font-weight: 600;
  text-align: center;
  white-space: nowrap;
  align-self: flex-end;
  &.cook-yes {
    background: #e8f5e9;
    color: #2e7d32;
  }
  &.cook-no {
    background: #ffebee;
    color: #c62828;
  }
  &.cook-unknown {
    background: var(--c-primary-2);
    color: var(--c-bg-hover);
  }
}

/* 品牌行 + 帮助图标 */
.upload-mask {
  position: fixed;
  inset: 0;
  z-index: 100;
  background: rgba(74, 40, 60, 0.45);
  display: flex !important;
  align-items: flex-end;
  justify-content: center;
  opacity: 0;
  visibility: hidden;
  pointer-events: none;
  transition:
    opacity 0.25s ease-out,
    visibility 0.25s ease-out;
  &.show {
    opacity: 1;
    visibility: visible;
    pointer-events: auto;
  }
}
.upload-sheet {
  width: 100%;
  height: 90vh;
  background: var(--c-bg-page, #fff);
  border-top-left-radius: $radius-xl;
  border-top-right-radius: $radius-xl;
  display: flex;
  flex-direction: column;
  transform: translateY(100%);
  transition: transform 0.25s ease-out;
}
.upload-mask.show .upload-sheet {
  transform: translateY(0);
}
.upload-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  padding: 32rpx 28rpx 20rpx;
  flex-shrink: 0;
}
.head-info {
  flex: 1;
}
.head-actions {
  display: flex;
  align-items: center;
  gap: 12rpx;
}
.head-icon-btn {
  width: 56rpx;
  height: 56rpx;
  border-radius: 50%;
  background: $bg-surface-alt;
  display: flex;
  align-items: center;
  justify-content: center;
  &:active {
    background: $bg-hover;
  }
}
.head-title {
  font-size: 36rpx;
  font-weight: 800;
  color: $text-1;
}
.head-sub {
  display: block;
  margin-top: 4rpx;
  font-size: 24rpx;
  color: $text-3;
}
.close-btn {
  width: 56rpx;
  height: 56rpx;
  border-radius: 50%;
  background: $bg-surface-alt;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 28rpx;
  color: $text-2;
}
.upload-body {
  flex: 1;
  min-height: 0;
}
.upload-inner {
  padding: 0 28rpx 32rpx;
}
.upload-footer {
  flex-shrink: 0;
  padding: 24rpx 32rpx;
  padding-bottom: calc(12px + constant(safe-area-inset-bottom));
  padding-bottom: calc(12px + env(safe-area-inset-bottom));
}
.field {
  margin-bottom: 24rpx;
}
.field-label {
  display: block;
  margin-bottom: 12rpx;
  font-size: 26rpx;
  font-weight: 600;
  color: $text-1;
}
.field-input {
  width: 100%;
  height: 88rpx;
  padding: 0 24rpx;
  background: $bg-surface-alt;
  border-radius: $radius-md;
  font-size: 28rpx;
  color: $text-1;
  box-sizing: border-box;
}
.field-textarea {
  width: 100%;
  min-height: 120rpx;
  padding: 20rpx 24rpx;
  background: $bg-surface-alt;
  border-radius: $radius-md;
  font-size: 26rpx;
  color: $text-1;
  box-sizing: border-box;
}
.field-ph {
  color: $text-4;
}
.picker-display {
  display: flex;
  align-items: center;
  justify-content: space-between;
  height: 88rpx;
  padding: 0 24rpx;
  background: $bg-surface-alt;
  border-radius: $radius-md;
  font-size: 28rpx;
  color: $text-1;
  .picker-text {
    color: $text-4;
  }
}
.chip-row {
  display: flex;
  flex-wrap: wrap;
  gap: 16rpx;
}
.chip {
  padding: 12rpx 24rpx;
  background: $bg-surface-alt;
  border-radius: $radius-pill;
  font-size: 24rpx;
  color: $text-2;
  border: 2rpx solid transparent;
  &.active {
    // background: rgba(245, 182, 193, 0.18);
    border-color: $brand-primary;
    color: $brand-primary-dark;
    font-weight: 700;
  }
  &.tag-selected {
    background: $tag-selected-bg;
    color: $tag-selected-color;
    &.active {
      border-color: $tag-selected-border;
      font-weight: 700;
    }
  }
  &.tag-warn {
    background: $tag-warn-bg;
    color: $tag-warn-color;
    &.active {
      border-color: $tag-warn-border;
      font-weight: 700;
    }
  }
  &.tag-dislike {
    background: $tag-dislike-bg;
    color: $tag-dislike-color;
    &.active {
      border-color: $tag-dislike-border;
      font-weight: 700;
    }
  }
  &.tag-info {
    background: $tag-info-bg;
    color: $tag-info-color;
    &.active {
      border-color: $tag-info-border;
      font-weight: 700;
    }
  }
}
.empty-tags {
  font-size: 24rpx;
  color: $text-4;
  padding: 12rpx 0;
}
.upload-btn {
  height: 96rpx;
  background: linear-gradient(135deg, $brand-primary, $brand-primary-2);
  color: #fff;
  font-size: 32rpx;
  font-weight: 800;
  border-radius: $radius-pill;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: $shadow-press;
  &.disabled {
    opacity: 0.6;
  }
}

/* 品牌行 + 帮助图标 */
.brand-row {
  display: flex;
  align-items: center;
  gap: 12rpx;
}
.brand-help {
  width: 44rpx;
  height: 44rpx;
  border-radius: 50%;
  // background: rgba(255, 255, 255, 0.3);
  display: flex;
  align-items: center;
  justify-content: center;
  transition: transform 0.2s ease;
  &:active {
    transform: scale(0.9);
  }
}

/* 加入菜单确认弹窗 */
.confirm-mask {
  position: fixed;
  inset: 0;
  background: rgba(74, 40, 60, 0.45);
  z-index: 1200;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 48rpx;
}
.confirm-dialog {
  width: 100%;
  max-width: 580rpx;
  background: #fff;
  border-radius: $radius-xl;
  padding: 48rpx 36rpx 32rpx;
  display: flex;
  flex-direction: column;
  align-items: center;
  animation: popIn 0.25s ease;
}
@keyframes popIn {
  from { transform: scale(0.9); opacity: 0; }
  to { transform: scale(1); opacity: 1; }
}
.confirm-icon {
  font-size: 80rpx;
  margin-bottom: 16rpx;
}
.confirm-title {
  font-size: 36rpx;
  font-weight: 800;
  color: $text-1;
  margin-bottom: 12rpx;
}
.confirm-desc {
  font-size: 26rpx;
  color: $text-3;
  text-align: center;
  line-height: 1.6;
  padding: 0 16rpx;
}
.confirm-actions {
  display: flex;
  gap: 24rpx;
  margin-top: 32rpx;
  width: 100%;
}
.confirm-btn {
  flex: 1;
  height: 88rpx;
  border-radius: $radius-pill;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 30rpx;
  font-weight: 700;
  &.cancel {
    background: $bg-surface-alt;
    color: $text-2;
  }
  &.confirm {
    background: linear-gradient(135deg, var(--c-primary, #F5B6C1), var(--c-primary-2, #FFD6DD));
    color: #fff;
    box-shadow: $shadow-press;
  }
  &:active {
    transform: scale(0.96);
    opacity: 0.9;
  }
}

/* 标签帮助弹窗（中间弹出） */
.tag-help-mask {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0);
  z-index: 999;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: background 0.25s ease;
  pointer-events: none;
  &.show {
    background: rgba(0, 0, 0, 0.5);
    pointer-events: auto;
  }
}
.tag-help-dialog {
  width: 560rpx;
  background: $bg-surface;
  border-radius: $radius-xl;
  padding: 40rpx;
  box-shadow: 0 16rpx 48rpx rgba(0, 0, 0, 0.15);
  transform: scale(0.8);
  opacity: 0;
  transition:
    transform 0.25s cubic-bezier(0.34, 1.56, 0.64, 1),
    opacity 0.2s ease;
  &.show {
    transform: scale(1);
    opacity: 1;
  }
}
.thd-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 32rpx;
}
.thd-title {
  font-size: 32rpx;
  font-weight: 700;
  color: $text-1;
}
.thd-close {
  width: 56rpx;
  height: 56rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  background: $bg-surface-alt;
}
.thd-body {
  display: flex;
  flex-direction: column;
  gap: 28rpx;
}
.thd-item {
  display: flex;
  align-items: center;
  gap: 24rpx;
}
.thd-color {
  width: 48rpx;
  height: 48rpx;
  border-radius: $radius-pill;
  flex-shrink: 0;
  &.thc-warn {
    background: $tag-warn-bg;
    border: 2rpx solid $tag-warn-color;
  }
  &.thc-dislike {
    background: $tag-dislike-bg;
    border: 2rpx solid $tag-dislike-color;
  }
  &.thc-info {
    background: $tag-info-bg;
    border: 2rpx solid $tag-info-color;
  }
  &.thc-selected {
    background: $tag-selected-bg;
    border: 2rpx solid $tag-selected-color;
  }
}
.thd-info {
  display: flex;
  flex-direction: column;
  gap: 4rpx;
}
.thd-label {
  font-size: 28rpx;
  font-weight: 600;
  color: $text-1;
}
.thd-desc {
  font-size: 24rpx;
  color: $text-3;
}
</style>
<!-- #ifdef MP-WEIXIN -->
<style lang="scss">
::v-deep .nut-icon-photograph {
  vertical-align: bottom;
}
</style>
<!-- #endif -->
