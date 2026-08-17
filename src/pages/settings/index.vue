<template>
  <view
    class="page settings-page"
    :class="couple.themeClass"
    :style="couple.themeStyle"
  >
    <NavBar title="全部设置" />

    <PageLoading :visible="firstLoading" @timeout="firstLoading = false" />

    <scroll-view
      v-show="!firstLoading"
      scroll-y
      class="settings-scroll"
      :show-scrollbar="false"
    >
      <view class="settings-content">
        <view
          v-for="(g, gi) in groups"
          :key="gi"
          class="group"
        >
          <text class="group-title">{{ g.title }}</text>
          <view class="card list-card">
            <view
              v-for="(it, ii) in g.items"
              :key="ii"
              class="list-item"
              :class="{ disabled: it.disabled }"
              @click="it.action"
            >
              <text class="item-icon">{{ it.icon }}</text>
              <text class="item-label">{{ it.label }}</text>
              <template v-if="it.hasSwitch">
                <view
                  class="switch"
                  :class="{ on: it.checked }"
                  @click.stop="it.onToggle"
                >
                  <view class="switch-thumb" />
                </view>
              </template>
              <nut-icon v-else name="rect-right" size="32rpx" :custom-color="couple.themeStyle['--c-primary']" />
            </view>
          </view>
        </view>

        <view class="foot-version">给她的小厨房 v{{ appVersion }}</view>
      </view>
    </scroll-view>

    <!-- 主题色弹层 -->
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
            v-for="(k, i) in THEME_PRESETS"
            :key="i"
            class="sp-item"
            @click="onThemePick(k)"
          >
            <text
              >{{ THEME_ICONS[k] }} {{ THEME_LABELS[k]
              }}{{ k === couple.currentThemeKey ? " ✓" : "" }}</text
            >
          </view>
          <view class="sp-item" @click="onThemePick('')"
            ><text>🎨 恢复默认</text></view
          >
        </scroll-view>
      </view>
    </view>

    <!-- 字体弹层 -->
    <view
      v-show="fontSheet"
      class="sheet-mask"
      :class="{ show: fontSheet }"
      @click="fontSheet = false"
      @touchmove.stop.prevent
    >
      <view class="sheet-popup" @click.stop @touchmove.stop.prevent>
        <view class="sp-head">
          <text class="sp-title">选择字体风格</text>
          <view class="sp-close" @click="fontSheet = false">
            <AppIcon name="close" size="24" color="#999" />
          </view>
        </view>
        <scroll-view scroll-y class="sp-list" :show-scrollbar="false">
          <view
            v-for="k in FONT_PRESETS"
            :key="k"
            class="sp-item"
            :style="{ fontFamily: getFontFamily(k) }"
            @click="onFontPick(k)"
          >
            <text
              >{{ FONT_ICONS[k] }} {{ FONT_LABELS[k]
              }}{{ k === couple.currentFontKey ? " ✓" : "" }}</text
            >
          </view>
          <view
            class="sp-item"
            :style="{ fontFamily: getFontFamily('system') }"
            @click="onFontPick('')"
            ><text>📱 恢复默认</text></view
          >
        </scroll-view>
      </view>
    </view>

    <!-- 版本信息弹窗 -->
    <view
      v-show="aboutSheet"
      class="sheet-mask"
      :class="{ show: aboutSheet }"
      @click="closeAboutSheet"
      @touchmove.stop.prevent
    >
      <view class="sheet-popup about-popup" @click.stop @touchmove.stop.prevent>
        <view class="sp-head">
          <text class="sp-title">关于我们</text>
          <view class="sp-close" @click="closeAboutSheet">
            <AppIcon name="close" size="24" color="#999" />
          </view>
        </view>
        <view class="about-body">
          <view class="about-logo">
            <AppIcon
              name="heart"
              size="80"
              :color="couple.themeStyle['--c-primary'] || '#F5B6C1'"
            />
          </view>
          <text class="about-name">给她的小厨房</text>
          <text class="about-version">版本 {{ appVersion }}</text>
          <text class="about-desc">专属二人的情侣干饭点餐小工具</text>
          <text class="about-slogan">❤ 用心做好每一餐</text>
        </view>
        <view class="about-foot">
          <view class="about-btn" @click="closeAboutSheet">知道啦</view>
        </view>
      </view>
    </view>

    <!-- 服务器地址编辑弹窗 -->
    <view
      v-show="serverSheet"
      class="sheet-mask"
      :class="{ show: serverSheet }"
      @click="serverSheet = false"
      @touchmove.stop.prevent
    >
      <view class="sheet-popup server-popup" @click.stop @touchmove.stop.prevent>
        <view class="sp-head">
          <text class="sp-title">服务器地址</text>
          <view class="sp-close" @click="serverSheet = false">
            <AppIcon name="close" size="24" color="#999" />
          </view>
        </view>
        <view class="server-body">
          <text class="server-tip">切换后端服务地址，保存后重新登录生效</text>
          <input
            :value="serverUrlInput"
            class="server-input"
            placeholder="如 http://192.168.1.5:5000"
            placeholder-class="ipt-ph"
            maxlength="200"
            @input="e => serverUrlInput = e.detail.value"
          />
        </view>
        <view class="server-foot">
          <view class="server-btn ghost" @click="serverSheet = false">取消</view>
          <view class="server-btn primary" @click="confirmServerUrl">保存</view>
        </view>
      </view>
    </view>

    <!-- 标签配置弹窗 -->
    <view
      v-show="tagSheet"
      class="sheet-mask"
      :class="{ show: tagSheet }"
      @click="tagSheet = false"
      @touchmove.stop.prevent
    >
      <view class="sheet-popup tag-popup" @click.stop @touchmove.stop.prevent>
        <view class="sp-head">
          <text class="sp-title">{{ tagSheetTitle }}</text>
          <view class="tag-head-actions">
            <view
              class="tag-edit-btn"
              :class="{ active: tagEditing }"
              @click="tagEditing = !tagEditing"
            >
              <text>{{ tagEditing ? '完成' : '编辑' }}</text>
            </view>
            <view class="sp-close" @click="tagSheet = false">
              <AppIcon name="close" size="24" color="#999" />
            </view>
          </view>
        </view>
        <scroll-view scroll-y class="tag-list" :show-scrollbar="false">
          <!-- 添加新标签 -->
          <view class="tag-add-row">
            <input
              :value="newTagInput"
              class="tag-add-input"
              :placeholder="'添加' + tagSheetTitle"
              placeholder-class="tag-add-ph"
              maxlength="10"
              @input="e => newTagInput = e.detail.value"
              @confirm="addNewTag"
            />
            <view class="tag-add-btn" @click="addNewTag">
              <text>添加</text>
            </view>
          </view>
          <!-- 自定义标签（可删除） -->
          <view class="tag-section" v-if="customTagList.length">
            <text class="tag-section-title">自定义选项</text>
            <view class="tag-chip-row">
              <view
                v-for="t in customTagList"
                :key="'cus-' + t.id"
                class="tag-chip custom"
                @click="removeCustomTag(t.id)"
              >
                <text>{{ t.tagValue }}</text>
                <AppIcon name="close" size="16" color="#fff" />
              </view>
            </view>
          </view>
          <!-- 默认标签 -->
          <view class="tag-section">
            <text class="tag-section-title">默认选项{{ tagEditing ? '（点击移除）' : '' }}</text>
            <view class="tag-chip-row">
              <view
                v-for="t in defaultTagList"
                :key="'def-' + t"
                class="tag-chip default"
                :class="{ removable: tagEditing }"
                @click="tagEditing && hideDefaultTag(t)"
              >
                <text>{{ t }}</text>
                <AppIcon v-if="tagEditing" name="close" size="14" color="#7B6BA3" />
              </view>
            </view>
          </view>
          <!-- 被隐藏的标签 -->
          <view class="tag-section" v-if="hiddenTagList.length">
            <text class="tag-section-title">已移除{{ tagEditing ? '（点击恢复）' : '' }}</text>
            <view class="tag-chip-row">
              <view
                v-for="t in hiddenTagList"
                :key="'hid-' + t.id"
                class="tag-chip hidden"
                :class="{ restorable: tagEditing }"
                @click="tagEditing && restoreDefaultTag(t.tagValue)"
              >
                <text>{{ t.tagValue }}</text>
                <nut-icon v-if="tagEditing" name="plus" size="40rpx" color="#fff" />
              </view>
            </view>
          </view>
        </scroll-view>
      </view>
    </view>

    <Toast />
  </view>
</template>

<script setup>
import { computed, ref } from "vue";
import { onShow } from "@dcloudio/uni-app";
import NavBar from "@/components/NavBar.vue";
import AppIcon from "@/components/AppIcon.vue";
import Toast from "@/components/Toast.vue";
import PageLoading from "@/components/PageLoading.vue";
import { useCoupleStore } from "@/store/couple";
import { usePreferenceStore, TAG_OPTIONS, DIET_TAG_OPTIONS } from "@/store/preference";
import { useSettings } from "@/composables/useSettings";
import { requireLogin } from "@/utils/auth";
import { toast } from "@/utils/toast";

const couple = useCoupleStore();
const preference = usePreferenceStore();
const firstLoading = ref(true);

// 标签配置弹窗
const tagSheet = ref(false);
const tagSheetType = ref('tags'); // 'tags' | 'dietTags'
const tagEditing = ref(false);
const newTagInput = ref('');
const tagSheetTitle = computed(() => tagSheetType.value === 'tags' ? '菜品标签配置' : '饮食标签配置');

// 默认标签列表（当前可用的默认项）
const defaultTagList = computed(() => {
  const backend = tagSheetType.value === 'tags'
    ? preference.dishTagOptions
    : preference.dietTagOptions;
  const defaults = tagSheetType.value === 'tags' ? TAG_OPTIONS : DIET_TAG_OPTIONS;
  return backend.filter(t => defaults.includes(t));
});

// 自定义标签列表
const customTagList = computed(() => {
  const list = tagSheetType.value === 'tags'
    ? preference.customDishTags
    : preference.customDietTags;
  return list.filter(t => t.tagType === tagSheetType.value);
});

// 被隐藏的标签列表
const hiddenTagList = computed(() => {
  const list = tagSheetType.value === 'tags'
    ? preference.hiddenDishTags
    : preference.hiddenDietTags;
  return list.filter(t => t.tagType === tagSheetType.value);
});

function openTagSheet(type) {
  if (!requireLogin(couple)) return;
  tagSheetType.value = type;
  tagEditing.value = false;
  newTagInput.value = '';
  tagSheet.value = true;
  preference.fetchTagOptions();
}

async function addNewTag() {
  const val = (newTagInput.value || '').trim();
  if (!val) return;
  const existing = tagSheetType.value === 'tags'
    ? preference.dishTagOptions
    : preference.dietTagOptions;
  if (existing.includes(val)) {
    toast.info('已存在该选项');
    return;
  }
  await preference.addCustomTag(tagSheetType.value, val);
  newTagInput.value = '';
  toast.success('添加成功');
}

async function removeCustomTag(id) {
  await preference.removeCustomTag(id);
  toast.success('已删除');
}

async function hideDefaultTag(tagValue) {
  await preference.hideDefaultTag(tagSheetType.value, tagValue);
  toast.success('已移除');
}

async function restoreDefaultTag(tagValue) {
  await preference.restoreDefaultTag(tagSheetType.value, tagValue);
  toast.success('已恢复');
}

const {
  themeSheet,
  fontSheet,
  aboutSheet,
  serverSheet,
  serverUrlInput,
  appVersion,
  openThemeSheet,
  openFontSheet,
  closeAboutSheet,
  onThemePick,
  onFontPick,
  chooseAvatar,
  editNickname,
  editPartnerCallName,
  resetNames,
  onLogout,
  onUnbindDisabled,
  editServerUrl,
  confirmServerUrl,
  goLottery,
  goAddresses,
  goTableConfig,
  goCategoryConfig,
  goDishUpload,
  openAboutSheet,
  THEME_PRESETS,
  THEME_LABELS,
  THEME_ICONS,
  FONT_PRESETS,
  FONT_LABELS,
  FONT_ICONS,
  getFontFamily,
} = useSettings();

const groups = computed(() => [
  {
    title: "个人/情侣",
    items: [
      { label: "修改我的昵称", icon: "✏️", action: editNickname },
      { label: "修改对方爱称", icon: "💬", action: editPartnerCallName },
      { label: "恢复默认称呼", icon: "↩️", action: resetNames },
      { label: "修改头像", icon: "📷", action: chooseAvatar },
    ],
  },
  {
    title: "偏好",
    items: [
      { label: "主题色", icon: "🎨", action: openThemeSheet },
      { label: "字体风格", icon: "🅰️", action: openFontSheet },
      { label: "菜品标签配置", icon: "🏷️", action: () => openTagSheet('tags'), show: couple.isGirlfriend },
      { label: "饮食标签配置", icon: "🥗", action: () => openTagSheet('dietTags'), show: couple.isGirlfriend },
      {
        label: "使用默认菜品",
        icon: "🍽️",
        hasSwitch: true,
        show: couple.isGirlfriend,
        checked: couple.useDefaultDishes,
        onToggle: () => toggleDefaultDishes(),
      },
    ],
  },
  {
    title: "「我的」页默认展开",
    items: pageSections.value.map((s) => ({
      label: s.label,
      icon: "▸",
      hasSwitch: true,
      checked: (expandList.value || []).includes(s.key),
      onToggle: () => toggleExpand(s.key),
    })).concat([{
      label: "恢复默认",
      icon: "↩️",
      action: resetExpandConfig,
    }]),
  },
  {
    title: "功能",
    items: [
      {
        label: "收货地址",
        icon: "📍",
        action: goAddresses,
        show: couple.isGirlfriend,
      },
      {
        label: "桌台配置",
        icon: "🪑",
        action: goTableConfig,
        show: couple.isGirlfriend,
      },
      {
        label: "菜品分类配置",
        icon: "🏷️",
        action: goCategoryConfig,
        show: couple.isGirlfriend,
      },
      {
        label: "菜品上传",
        icon: "🍽️",
        action: goDishUpload,
        show: couple.isGirlfriend,
      },
      { label: "服务器地址", icon: "🔗", action: editServerUrl },
      { label: "抢先体验", icon: "🎮", action: goLottery },
    ],
  },
  {
    title: "账号",
    items: [
      { label: "退出登录", icon: "🚪", action: onLogout },
      { label: "解绑伴侣", icon: "🔓", action: onUnbindDisabled, disabled: true },
      { label: "关于我们", icon: "ℹ️", action: openAboutSheet },
    ],
  },
].map(g => ({
  ...g,
  items: g.items.filter(it => it.show !== false),
})));

// 折叠面板默认展开配置
const ALL_EXPANDED_GF = ['dietProfile', 'favorites', 'dishLibrary', 'memory'];
const ALL_EXPANDED_BF = ['dietProfile', 'memory'];

// 仅列出可折叠的 section（orders/wishlist/fun/settings 是独立卡片，不在 nut-collapse 里）
const pageSections = computed(() =>
  couple.isBoyfriend
    ? [
        { key: 'dietProfile', label: '伴侣饮食档案' },
        { key: 'memory', label: '回忆相册' },
      ]
    : [
        { key: 'dietProfile', label: '我的饮食档案' },
        { key: 'favorites', label: '想吃清单' },
        { key: 'dishLibrary', label: '我的菜品库' },
        { key: 'memory', label: '回忆相册' },
      ]
);

const defaultExpanded = computed(() =>
  couple.isBoyfriend ? [...ALL_EXPANDED_BF] : [...ALL_EXPANDED_GF]
);

const expandList = computed(() => {
  const cfg = couple.expandConfigParsed;
  if (!cfg) return [...defaultExpanded.value];
  return cfg.sections || [];
});

async function toggleExpand(key) {
  if (!requireLogin(couple)) return;
  const list = [...(expandList.value || [])];
  const i = list.indexOf(key);
  if (i === -1) list.push(key);
  else list.splice(i, 1);
  await couple.updateExpandConfig(list);
}

async function resetExpandConfig() {
  if (!requireLogin(couple)) return;
  await couple.resetExpandConfig();
  toast.success("已恢复默认");
}

async function toggleDefaultDishes() {
  if (!requireLogin(couple)) return;
  const next = !couple.useDefaultDishes;
  await couple.updateUseDefaultDishes(next);
  if (next) {
    toast.success("已启用默认菜品");
  } else {
    toast.info("关闭后，新菜品将从空白开始");
  }
}
onShow(() => {
  firstLoading.value = false;
  preference.fetchTagOptions();
});
</script>

<style lang="scss" scoped>
.settings-page {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
}
.settings-scroll {
  flex: 1;
  height: 0;
}
.settings-content {
  padding: 24rpx 24rpx 48rpx;
}
.group {
  margin-bottom: 32rpx;
}
.group-title {
  display: block;
  margin-bottom: 16rpx;
  padding-left: 12rpx;
  font-size: 26rpx;
  font-weight: 700;
  color: $text-2;
}
.list-card {
  background: #fff;
  border-radius: $radius-lg;
  box-shadow: $shadow-card;
  overflow: hidden;
}
.list-item {
  display: flex;
  align-items: center;
  padding: 28rpx 24rpx;
  border-bottom: 2rpx solid $divider;
  &:last-child {
    border-bottom: none;
  }
  &:active {
    background: $bg-hover;
  }
  &.disabled {
    color: $text-4;
    &:active {
      background: transparent;
    }
    .item-label {
      color: $text-4;
    }
  }
}
.item-icon {
  font-size: 32rpx;
  margin-right: 16rpx;
  flex-shrink: 0;
}
.item-label {
  flex: 1;
  font-size: 30rpx;
  color: $text-1;
}
.foot-version {
  text-align: center;
  margin-top: 16rpx;
  font-size: 22rpx;
  color: $text-4;
}

/* 自定义 switch 样式 */
.switch {
  width: 80rpx;
  height: 44rpx;
  border-radius: 44rpx;
  background: $bg-hover;
  position: relative;
  transition: background-color 0.2s ease;
  flex-shrink: 0;
  &.on {
    background: var(--c-primary, $brand-primary);
  }
}
.switch-thumb {
  position: absolute;
  top: 4rpx;
  left: 4rpx;
  width: 36rpx;
  height: 36rpx;
  border-radius: 50%;
  background: #fff;
  box-shadow: 0 2rpx 6rpx rgba(0, 0, 0, 0.15);
  transition: transform 0.2s ease;
}
.switch.on .switch-thumb {
  transform: translateX(36rpx);
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
  background: #fff;
  border-top-left-radius: $radius-xl;
  border-top-right-radius: $radius-xl;
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
  padding-bottom: 24rpx;
  border-bottom: 1rpx solid $divider;
}
.sp-title {
  font-size: 36rpx;
  font-weight: 800;
  color: $text-1;
}
.sp-close {
  width: 56rpx;
  height: 56rpx;
  border-radius: 50%;
  background: $bg-surface-alt;
  display: flex;
  align-items: center;
  justify-content: center;
}
.tag-head-actions {
  display: flex;
  align-items: center;
  gap: 16rpx;
}
.tag-edit-btn {
  padding: 8rpx 24rpx;
  border-radius: $radius-pill;
  background: $bg-surface-alt;
  font-size: 26rpx;
  color: $text-2;
  &.active {
    background: linear-gradient(135deg, var(--c-primary, $brand-primary), var(--c-primary-2, $brand-primary-2));
    color: #fff;
  }
}
.sp-list {
  max-height: 70vh;
  height: 800rpx;
}
.sp-item {
  padding: 28rpx 24rpx;
  border-bottom: 2rpx solid $divider;
  font-size: 30rpx;
  color: $text-1;
  display: flex;
  align-items: center;
  justify-content: space-between;
  &:active {
    background: $bg-hover;
  }
  &:last-child {
    border-bottom: none;
  }
}

/* 服务器地址弹窗 */
.server-popup {
  padding: 32rpx 28rpx;
  padding-bottom: calc(24rpx + env(safe-area-inset-bottom));
}
.server-body {
  padding: 8rpx 8rpx 32rpx;
}
.server-tip {
  display: block;
  font-size: 24rpx;
  color: $text-3;
  margin-bottom: 20rpx;
}
.server-input {
  width: 100%;
  height: 96rpx;
  padding: 0 24rpx;
  background: $bg-surface-alt;
  border-radius: $radius-md;
  font-size: 30rpx;
  color: $text-1;
  box-sizing: border-box;
}
.server-foot {
  display: flex;
  gap: 20rpx;
  padding: 0 8rpx;
}
.server-btn {
  flex: 1;
  height: 88rpx;
  border-radius: $radius-pill;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 30rpx;
  font-weight: 700;
  &.ghost {
    background: $bg-surface-alt;
    color: $text-2;
  }
  &.primary {
    background: linear-gradient(135deg, var(--c-primary, $brand-primary), var(--c-primary-2, $brand-primary-2));
    color: #fff;
  }
}

/* 版本信息弹窗 */
.about-popup {
  .about-body {
    display: flex;
    flex-direction: column;
    align-items: center;
    padding: 48rpx 40rpx 56rpx;
    .about-logo {
      width: 160rpx;
      height: 160rpx;
      border-radius: 50%;
      background: var(--c-bg-page, $bg-page);
      display: flex;
      align-items: center;
      justify-content: center;
      margin-bottom: 28rpx;
      box-shadow: $shadow-card;
    }
    .about-name {
      font-size: 40rpx;
      font-weight: 800;
      color: $text-1;
    }
    .about-version {
      margin-top: 12rpx;
      font-size: 26rpx;
      color: $text-3;
    }
    .about-desc {
      margin-top: 24rpx;
      font-size: 28rpx;
      color: $text-2;
    }
    .about-slogan {
      margin-top: 12rpx;
      font-size: 24rpx;
      color: var(--c-primary, $brand-primary);
      font-weight: 600;
    }
  }
  .about-foot {
    padding: 0 32rpx 32rpx;
    .about-btn {
      height: 88rpx;
      border-radius: $radius-pill;
      background: linear-gradient(135deg, var(--c-primary, $brand-primary), var(--c-primary-2, $brand-primary-2));
      color: #fff;
      font-size: 30rpx;
      font-weight: 800;
      display: flex;
      align-items: center;
      justify-content: center;
      box-shadow: $shadow-press;
    }
  }
}

/* 标签配置弹窗 */
.tag-popup {
  // height: 80vh;
  max-height: 80vh;
}
.tag-list {
  flex: 1;
  padding: 0 20rpx 24rpx;
}
.tag-section {
  margin-bottom: 32rpx;
  .tag-section-title {
    font-size: 24rpx;
    color: $text-3;
    margin-bottom: 16rpx;
    display: block;
  }
}
.tag-chip-row {
  display: flex;
  flex-wrap: wrap;
  gap: 16rpx;
}
.tag-chip {
  display: flex;
  align-items: center;
  gap: 8rpx;
  padding: 12rpx 24rpx;
  border-radius: $radius-pill;
  font-size: 26rpx;
  &.default {
    background: $tag-selected-bg;
    color: $tag-selected-color;
    &.removable {
      padding-right: 16rpx;
      border: 2rpx dashed $tag-selected-border;
    }
  }
  &.custom {
    background: linear-gradient(135deg, var(--c-primary, $brand-primary), var(--c-primary-2, $brand-primary-2));
    color: #fff;
    padding-right: 16rpx;
  }
  &.hidden {
    background: $bg-surface-alt;
    color: $text-4;
    text-decoration: line-through;
    &.restorable {
      text-decoration: none;
      background: linear-gradient(135deg, var(--c-primary, $brand-primary), var(--c-primary-2, $brand-primary-2));
      color: #fff;
      padding-right: 16rpx;
    }
  }
}
.tag-add-row {
  display: flex;
  gap: 16rpx;
  padding: 24rpx 0;
  margin-top: 16rpx;
}
.tag-add-input {
  flex: 1;
  height: 72rpx;
  padding: 0 24rpx;
  border-radius: $radius-md;
  background: $bg-surface-alt;
  font-size: 28rpx;
  color: $text-1;
}
.tag-add-ph {
  color: $text-4;
}
.tag-add-btn {
  height: 72rpx;
  padding: 0 32rpx;
  border-radius: $radius-md;
  background: linear-gradient(135deg, var(--c-primary, $brand-primary), var(--c-primary-2, $brand-primary-2));
  color: #fff;
  font-size: 28rpx;
  font-weight: 600;
  display: flex;
  align-items: center;
  justify-content: center;
}
</style>
