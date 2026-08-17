<template>
  <view class="image-uploader" :style="{ width: boxSize, height: boxSize }">
    <!-- 有图片：cover 回显 + 右上角删除 + 点击预览 -->
    <template v-if="imageUrl">
      <image
        class="iu-preview"
        :src="imageUrl"
        mode="aspectFill"
        @click="onPreview"
      />
      <view v-if="!readonly" class="iu-delete" @click.stop="onDelete">
        <!-- <AppIcon name="close" size="20" color="#fff" /> -->
        <nut-icon name="del" size="20rpx" :custom-color="couple.themeStyle['--c-primary']" />
      </view>
    </template>
    <!-- 无图片：上传占位 -->
    <view v-else class="iu-placeholder" @click="onChoose">
      <!-- <AppIcon name="camera" :size="iconSize" color="#B8A2C7" /> -->
      <nut-icon name="photograph" :size="iconSize" :custom-color="couple.themeStyle['--c-taro'] || '#A89DA3'" />
      <text class="iu-tip">{{ placeholder }}</text>
    </view>
  </view>
</template>

<script setup>
/**
 * 图片上传组件
 * -----------------------------------------------------------------------------
 * 统一封装菜品图片上传交互：
 * - 默认正方形展示，cover 模式回显
 * - 无图时显示上传占位图标
 * - 有图时点击预览，右上角删除按钮
 * - 上传逻辑通过 emit 回调由调用方处理（或直接用内置 api.uploadImage）
 */
import { computed } from 'vue';
import AppIcon from './AppIcon.vue';
import { resolveUrl } from '@/utils/server';
import { api } from '@/utils/api';
import { toast } from '@/utils/toast';
import { requireLogin } from '@/utils/auth';
import { useCoupleStore } from '@/store/couple';

const props = defineProps({
  modelValue: { type: String, default: '' },
  size: { type: [String, Number], default: 200 }, // rpx
  readonly: { type: Boolean, default: false },
  placeholder: { type: String, default: '上传图片' },
  autoUpload: { type: Boolean, default: true }
});

const couple = useCoupleStore();
const emit = defineEmits(['update:modelValue', 'change', 'upload-error']);

const boxSize = computed(() =>
  typeof props.size === 'number' ? `${props.size}rpx` : props.size
);
const iconSize = computed(() =>
  typeof props.size === 'number' ? `${Math.round(props.size * 0.28)}` + 'rpx' : '56rpx'
);

const imageUrl = computed(() =>
  props.modelValue ? resolveUrl(props.modelValue) : ''
);

function onPreview() {
  if (!imageUrl.value) return;
  uni.previewImage({ urls: [imageUrl.value], current: imageUrl.value });
}

function onDelete() {
  uni.showModal({
    title: '确认删除',
    content: '要删除这张图片吗？',
    confirmColor: '#E08B8B',
    success: (res) => {
      if (res.confirm) {
        emit('update:modelValue', '');
        emit('change', '');
      }
    }
  });
}

async function onChoose() {
  if (!requireLogin(couple)) return;
  const res = await new Promise((resolve, reject) => {
    uni.chooseImage({
      count: 1,
      sizeType: ['compressed'],
      success: resolve,
      fail: reject
    });
  }).catch(() => null);

  const filePath = res && res.tempFilePaths && res.tempFilePaths[0];
  if (!filePath) return;

  if (props.autoUpload) {
    toast.loading('上传中…');
    try {
      const data = await api.uploadImage(filePath);
      toast.hide();
      emit('update:modelValue', data.url);
      emit('change', data.url);
      toast.success('图片已添加');
    } catch (e) {
      toast.hide();
      toast.error('图片上传失败');
      emit('upload-error', e);
    }
  } else {
    emit('change', filePath);
  }
}
</script>

<style lang="scss" scoped>
.image-uploader {
  position: relative;
  border-radius: $radius-md;
  overflow: hidden;
  background: $bg-surface-alt;
  flex-shrink: 0;
}
.iu-preview {
  width: 100%;
  height: 100%;
}
.iu-delete {
  position: absolute;
  top: 0;
  right: 0;
  width: 44rpx;
  height: 44rpx;
  border-radius: 0 $radius-md 0 $radius-sm;
  background: $bg-surface-alt;
  color: $text-3;
  display: flex;
  align-items: center;
  justify-content: center;
}
.iu-placeholder {
  width: 100%;
  height: 100%;
  border-radius: $radius-md;
  background: $bg-surface-alt;
  border: 2rpx dashed var(--c-taro, $brand-taro);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 40rpx;
}
.iu-tip {
  font-size: 22rpx;
  // color: $text-3;
  color: var(--c-taro, $brand-taro);
}
</style>
