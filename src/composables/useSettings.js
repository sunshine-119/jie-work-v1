import { ref, computed } from "vue";
import { useCoupleStore } from "@/store/couple";
import { api } from "@/utils/api";
import { serverConfig } from "@/utils/server";
import { resetAllStores } from "@/utils/resetStores";
import {
  THEME_PRESETS,
  THEME_LABELS,
  THEME_ICONS,
  FONT_PRESETS,
  FONT_LABELS,
  FONT_ICONS,
  getFontFamily,
  preloadAllFonts,
} from "@/utils/theme";
import { toast } from "@/utils/toast";
import { requireLogin } from "@/utils/auth";
import { pollManager } from "@/utils/sync";
import manifest from "@/manifest.json";

/**
 * 设置相关状态和逻辑（profile / settings 共用）
 */
export function useSettings() {
  const couple = useCoupleStore();
  const appVersion = manifest.versionName || "1.0.0";

  const settingsSheet = ref(false);
  const themeSheet = ref(false);
  const fontSheet = ref(false);
  const aboutSheet = ref(false);
  const serverSheet = ref(false);
  const pageConfigSheet = ref(false);
  const serverUrlInput = ref("");

  // 页面模块配置：定义女友端/男友端可配置的模块列表
  // key 与 profile.vue 中 section v-if 的判断 key 对应
  const PAGE_SECTIONS_GF = [
    { key: 'dietProfile', label: '饮食档案', icon: 'shield' },
    { key: 'favorites', label: '想吃清单', icon: 'heartOutline' },
    { key: 'dishLibrary', label: '菜品库', icon: 'menu' },
    { key: 'memory', label: '回忆相册', icon: 'camera' },
    { key: 'orders', label: '全部订单', icon: 'order' },
    { key: 'wishlist', label: '心愿单', icon: 'gift' },
    { key: 'fun', label: '暖心彩蛋', icon: 'sparkles' },
    { key: 'settings', label: '设置', icon: 'settings' },
  ];
  const PAGE_SECTIONS_BF = [
    { key: 'dietProfile', label: '伴侣饮食档案', icon: 'shield' },
    { key: 'memory', label: '回忆相册', icon: 'camera' },
    { key: 'orders', label: '全部订单', icon: 'order' },
    { key: 'wishlist', label: '心愿单', icon: 'gift' },
    { key: 'fun', label: '暖心彩蛋', icon: 'sparkles' },
    { key: 'settings', label: '设置', icon: 'settings' },
  ];

  const pageSections = computed(() =>
    couple.isBoyfriend ? PAGE_SECTIONS_BF : PAGE_SECTIONS_GF
  );

  // 当前页面配置的本地副本（弹窗内编辑用）
  const pageConfigDraft = ref({});

  const openSettings = () => (settingsSheet.value = true);
  const closeSettings = () => (settingsSheet.value = false);
  const openThemeSheet = () => {
    if (!requireLogin(couple)) return;
    themeSheet.value = true;
  };
  const closeThemeSheet = () => (themeSheet.value = false);
  const openFontSheet = () => {
    if (!requireLogin(couple)) return;
    preloadAllFonts();
    fontSheet.value = true;
  };
  const closeFontSheet = () => (fontSheet.value = false);
  const openAboutSheet = () => (aboutSheet.value = true);
  const closeAboutSheet = () => (aboutSheet.value = false);
  const openServerSheet = () => (serverSheet.value = true);
  const closeServerSheet = () => (serverSheet.value = false);
  const openPageConfigSheet = () => {
    if (!requireLogin(couple)) return;
    // 打开时从 store 拷贝当前配置，空配置默认全部显示
    const parsed = couple.pageConfigParsed;
    const draft = {};
    pageSections.value.forEach((s) => {
      draft[s.key] = parsed[s.key] !== undefined ? parsed[s.key] : true;
    });
    pageConfigDraft.value = draft;
    pageConfigSheet.value = true;
  };
  const closePageConfigSheet = () => (pageConfigSheet.value = false);

  function toggleSection(key) {
    pageConfigDraft.value = { ...pageConfigDraft.value, [key]: !pageConfigDraft.value[key] };
  }

  async function savePageConfig() {
    pageConfigSheet.value = false;
    await couple.updatePageConfig(pageConfigDraft.value);
    toast.success('页面配置已保存');
  }

  async function resetPageConfig() {
    pageConfigSheet.value = false;
    await couple.updatePageConfig({});
    toast.success('已恢复默认显示');
  }

  function goAllSettings() {
    closeSettings();
    uni.navigateTo({ url: "/pages/settings/index" });
  }

  function goLottery() {
    if (!requireLogin(couple)) return;
    uni.navigateTo({ url: "/pages/lottery/index" });
  }

  function goAddresses() {
    if (!requireLogin(couple)) return;
    uni.navigateTo({ url: "/pages/address/address?mode=manage" });
  }

  function goTableConfig() {
    if (!requireLogin(couple)) return;
    uni.navigateTo({ url: "/pages/table/table?mode=edit" });
  }

  function goCategoryConfig() {
    if (!requireLogin(couple)) return;
    uni.navigateTo({ url: "/pages/category/category" });
  }

  function goDishUpload() {
    if (!requireLogin(couple)) return;
    uni.navigateTo({ url: "/pages/dish/upload" });
  }

  async function onThemePick(key) {
    if (!requireLogin(couple)) return;
    themeSheet.value = false;
    if (key === "") {
      await couple.updateThemeColor("");
      toast.success("已恢复默认主题");
      return;
    }
    if (key === couple.currentThemeKey) return;
    await couple.updateThemeColor(key);
    toast.success(`已切换为${THEME_LABELS[key]}`);
  }

  async function onFontPick(key) {
    if (!requireLogin(couple)) return;
    fontSheet.value = false;
    if (key === "") {
      await couple.updateFont("");
      toast.success("已恢复默认字体");
      return;
    }
    if (key === couple.currentFontKey) return;
    await couple.updateFont(key);
    toast.success(`已切换为${FONT_LABELS[key]}`);
  }

  async function chooseAvatar() {
    if (!requireLogin(couple)) return;
    try {
      const res = await uni.chooseImage({
        count: 1,
        sizeType: ["compressed"],
        sourceType: ["album", "camera"],
      });
      const filePath = res.tempFilePaths && res.tempFilePaths[0];
      if (!filePath) return;
      toast.loading("上传中…");
      const data = await api.uploadImage(filePath);
      toast.hide();
      await couple.updateMe({ avatar: data.url });
      toast.success("头像已更新");
    } catch (e) {
      toast.hide();
    }
  }

  function editNickname() {
    if (!requireLogin(couple)) return;
    uni.showModal({
      title: "修改我的昵称",
      editable: true,
      placeholderText: "输入新的昵称",
      content: couple.myNickname,
      success: (r) => {
        if (r.confirm && r.content) {
          couple.updateMe({ nickname: r.content });
          toast.success("已更新");
        }
      },
    });
  }

  function editPartnerCallName() {
    if (!requireLogin(couple)) return;
    uni.showModal({
      title: "修改对方爱称",
      editable: true,
      placeholderText: "输入你对 TA 的专属称呼",
      content: couple.partnerDisplayName,
      success: (r) => {
        if (!r.confirm) return;
        const name = (r.content || "").trim();
        couple.updateMe({ partnerCallName: name });
        toast.success(name ? "已更新" : "已恢复默认");
      },
    });
  }

  function resetNames() {
    if (!requireLogin(couple)) return;
    uni.showModal({
      title: "恢复默认称呼",
      content: "将我的昵称和对方爱称都恢复为默认吗？",
      confirmText: "恢复",
      success: (r) => {
        if (r.confirm) {
          couple.updateMe({ nickname: "", partnerCallName: "" });
          toast.success("已恢复默认");
        }
      },
    });
  }

  function onLogout() {
    uni.showModal({
      title: "退出登录？",
      content: "退出后将回到登录页，可重新配对或体验演示模式",
      confirmText: "退出",
      cancelText: "取消",
      confirmColor: "#E08B8B",
      success: (r) => {
        if (r.confirm) {
          pollManager.stopAll();
          resetAllStores();
          couple.logout();
          uni.reLaunch({ url: "/pages/login/login" });
        }
      },
    });
  }

  function onUnbind() {
    uni.showModal({
      title: "解绑伴侣？",
      content: "解绑后你们的配对会断开，需要重新配对，确定吗？",
      confirmText: "确定解绑",
      cancelText: "再想想",
      confirmColor: "#E08B8B",
      success: async (r) => {
        if (r.confirm) {
          await couple.unbind();
          toast.success("已解绑");
          setTimeout(() => uni.reLaunch({ url: "/pages/pairing/pairing" }), 800);
        }
      },
    });
  }

  function onUnbindDisabled() {
    if (!requireLogin(couple)) return;
    toast.info("相爱的人不可解绑哦~！如需解绑请联系管理员");
  }

  function editServerUrl() {
    if (!requireLogin(couple)) return;
    serverUrlInput.value = serverConfig.getUrl();
    serverSheet.value = true;
  }

  function confirmServerUrl() {
    const url = (serverUrlInput.value || "").trim();
    if (!url) {
      serverConfig.reset();
      serverSheet.value = false;
      toast.success("已恢复默认");
      return;
    }
    if (!/^https?:\/\/.+/.test(url)) {
      toast.error("地址格式不对哦");
      return;
    }
    serverConfig.setUrl(url);
    serverSheet.value = false;
    uni.showModal({
      title: "地址已保存",
      content: "重启小程序或重新登录后生效，是否现在退出重新登录？",
      confirmText: "重新登录",
      cancelText: "稍后",
      success: (res) => {
        if (res.confirm) {
          pollManager.stopAll();
          resetAllStores();
          couple.logout();
          uni.reLaunch({ url: "/pages/login/login" });
        }
      },
    });
  }

  return {
    // state
    settingsSheet,
    themeSheet,
    fontSheet,
    aboutSheet,
    serverSheet,
    pageConfigSheet,
    pageConfigDraft,
    pageSections,
    serverUrlInput,
    appVersion,
    // sheets
    openSettings,
    closeSettings,
    openThemeSheet,
    closeThemeSheet,
    openFontSheet,
    closeFontSheet,
    openAboutSheet,
    closeAboutSheet,
    openServerSheet,
    closeServerSheet,
    openPageConfigSheet,
    closePageConfigSheet,
    // page config actions
    toggleSection,
    savePageConfig,
    resetPageConfig,
    // navigation
    goAllSettings,
    goLottery,
    goAddresses,
    goTableConfig,
    goCategoryConfig,
    goDishUpload,
    // actions
    onThemePick,
    onFontPick,
    chooseAvatar,
    editNickname,
    editPartnerCallName,
    resetNames,
    onLogout,
    onUnbind,
    onUnbindDisabled,
    editServerUrl,
    confirmServerUrl,
    // theme / font constants
    THEME_PRESETS,
    THEME_LABELS,
    THEME_ICONS,
    FONT_PRESETS,
    FONT_LABELS,
    FONT_ICONS,
    getFontFamily,
    preloadAllFonts,
  };
}
