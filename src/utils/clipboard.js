import { toast } from './toast';

/**
 * 复制文本到剪贴板（统一入口）
 * - H5：navigator.clipboard API，降级到 execCommand，不会触发系统 toast
 * - 小程序：wx.setClipboardData({ showToast: false }) 静默复制，只弹自定义 toast
 */
export function copyText(text, successMsg = '已复制') {
  if (!text && text !== 0) {
    toast.error('复制内容为空');
    return;
  }
  const content = String(text);

  // #ifdef H5
  doH5Copy(content, successMsg);
  // #endif

  // #ifdef MP-WEIXIN
  doMpCopy(content, successMsg);
  // #endif

  // #ifndef H5 || MP-WEIXIN
  uni.setClipboardData({
    data: content,
    success: () => toast.success(successMsg)
  });
  // #endif
}

function doH5Copy(content, successMsg) {
  try {
    if (navigator && navigator.clipboard) {
      navigator.clipboard.writeText(content).then(() => {
        toast.success(successMsg);
      }).catch(() => {
        fallbackH5Copy(content, successMsg);
      });
    } else {
      fallbackH5Copy(content, successMsg);
    }
  } catch (e) {
    fallbackH5Copy(content, successMsg);
  }
}

function fallbackH5Copy(content, successMsg) {
  const input = document.createElement('input');
  input.setAttribute('value', content);
  document.body.appendChild(input);
  input.select();
  try {
    document.execCommand('copy');
    toast.success(successMsg);
  } catch (e) {
    toast.error('复制失败');
  }
  document.body.removeChild(input);
}

function doMpCopy(content, successMsg) {
  // wx.setClipboardData 的 showToast:false 可禁止系统默认"已复制"提示
  // eslint-disable-next-line no-undef
  wx.setClipboardData({
    data: content,
    showToast: false,
    success: () => {
      // 兜底：部分旧基础库忽略 showToast:false，再 hideToast 一次
      uni.hideToast();
      toast.success(successMsg);
    },
    fail: () => {
      toast.error('复制失败');
    }
  });
}
