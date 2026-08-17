/**
 * 自定义 Toast 工具
 * -----------------------------------------------------------------------------
 * 通过 uni 事件总线触发全局 Toast.vue 组件显示
 * 使用前需在页面引入 <Toast /> 组件（自动监听 app:toast 事件）
 *
 * 与原生 uni.showToast 区别：
 * - 支持自定义主题色（女友端粉色 / 男友端蓝色）
 * - 支持 success / error / info / loading 四种类型，各自有独立图标和配色
 * - 支持自定义 duration（0 表示不自动关闭，需手动 hide）
 */

function emit(options) {
  uni.$emit('app:toast', options);
}

export const toast = {
  /**
   * 显示 toast
   * @param {Object|string} options - 字符串作为 title，对象支持 { title, type, duration, complete }
   */
  show(options) {
    emit(options);
  },
  /** 成功提示（女友端粉、男友端蓝） */
  success(title, duration = 1800) {
    emit({ title, type: 'success', duration });
  },
  /** 错误提示（红色） */
  error(title, duration = 2000) {
    emit({ title, type: 'error', duration });
  },
  /** 普通信息提示（灰色） */
  info(title, duration = 1800) {
    emit({ title, type: 'info', duration });
  },
  /** 加载中（不自动关闭，需调 hide） */
  loading(title = '加载中…') {
    emit({ title, type: 'loading', duration: 0 });
  },
  /** 隐藏 toast */
  hide() {
    uni.$emit('app:toast:hide');
  }
};

export default toast;
