<template>
  <view class="page edit-page" :class="couple.themeClass" :style="couple.themeStyle">
    <NavBar title="编辑地址" :show-back="true" />
    <PageLoading :visible="firstLoading" @timeout="firstLoading = false" />
    <view v-show="!firstLoading">
      <view class="form-card">
      <view class="field">
        <text class="field-label">联系人</text>
        <input
          :value="form.name"
          class="ipt"
          placeholder="请输入姓名"
          placeholder-class="ipt-ph"
          maxlength="10"
          :adjust-position="true"
          @input="e => form.name = e.detail.value"
        />
      </view>
      <text v-if="errors.name" class="err">{{ errors.name }}</text>

      <view class="field">
        <text class="field-label">手机号</text>
        <input
          :value="form.phone"
          class="ipt"
          type="number"
          placeholder="请输入手机号"
          placeholder-class="ipt-ph"
          maxlength="11"
          :adjust-position="true"
          @input="e => form.phone = e.detail.value"
        />
      </view>
      <text v-if="errors.phone" class="err">{{ errors.phone }}</text>

      <view class="field">
        <text class="field-label">标签</text>
        <view class="tag-pick">
          <text
            v-for="t in tags"
            :key="t"
            class="tag-opt"
            :class="{ active: form.tag === t }"
            @click="form.tag = t"
          >{{ t }}</text>
        </view>
      </view>

      <view class="field">
        <text class="field-label">所在地区</text>
        <RegionPicker v-model="form.region" />
      </view>
      <text v-if="errors.region" class="err">{{ errors.region }}</text>

      <view class="field">
        <text class="field-label">街道/乡镇</text>
        <input
          :value="form.street"
          class="ipt"
          placeholder="请输入街道/乡镇"
          placeholder-class="ipt-ph"
          maxlength="30"
          :adjust-position="true"
          @input="e => form.street = e.detail.value"
        />
      </view>

      <view class="field">
        <text class="field-label">详细地址</text>
        <textarea
          :value="form.detail"
          class="ipt textarea"
          placeholder="请输入楼栋、门牌号等详细地址"
          placeholder-class="ipt-ph"
          maxlength="60"
          :adjust-position="true"
          @input="e => form.detail = e.detail.value"
        />
      </view>
      <text v-if="errors.detail" class="err">{{ errors.detail }}</text>
      <text v-if="regionText" class="region-text">已选地区：{{ regionText }}</text>

      <view class="field switch-field">
        <text class="field-label">设为默认地址</text>
        <view class="switch" :class="{ on: form.isDefault }" @click="form.isDefault = !form.isDefault">
          <view class="knob" />
        </view>
      </view>
    </view>

    <view v-if="editId" class="del-link" @click="onRemove">删除此地址</view>

    <view class="save-bar safe-bottom">
      <view class="save-btn" @click="onSave"><text>保存地址</text></view>
    </view>
    </view>

    <Toast />
  </view>
</template>

<script setup>
import { reactive, ref, computed } from 'vue';
import { onLoad, onShow } from '@dcloudio/uni-app';
import { useAddressStore } from '@/store/address';
import { useCoupleStore } from '@/store/couple';
import NavBar from '@/components/NavBar.vue';
import PageLoading from '@/components/PageLoading.vue';
import Toast from '@/components/Toast.vue';
import RegionPicker from '@/components/RegionPicker.vue';
import { codeToText, textToCode } from '@/utils/region';
import { toast } from '@/utils/toast';
import { requireLogin } from '@/utils/auth';

const addressStore = useAddressStore();
const couple = useCoupleStore();
const tags = ['家', '公司', '学校', '其他'];
const editId = ref('');
const firstLoading = ref(true);

const form = reactive({
  name: '',
  phone: '',
  tag: '家',
  region: ['', '', ''],
  regionText: '',
  street: '',
  detail: '',
  isDefault: false
});
const errors = reactive({
  name: '',
  phone: '',
  region: '',
  detail: ''
});

const regionText = computed(() => codeToText(form.region));

function validate() {
  errors.name = '';
  errors.phone = '';
  errors.region = '';
  errors.detail = '';
  let ok = true;
  if (!form.name.trim()) {
    errors.name = '请输入姓名';
    ok = false;
  }
  if (!/^1\d{10}$/.test(form.phone)) {
    errors.phone = '请输入正确的手机号';
    ok = false;
  }
  if (!Array.isArray(form.region) || form.region.length !== 3 || form.region.some((r) => !r)) {
    errors.region = '请选择省市区';
    ok = false;
  }
  if (!form.detail.trim()) {
    errors.detail = '请输入详细地址';
    ok = false;
  }
  return ok;
}

function onSave() {
  if (!requireLogin(couple)) return;
  if (!validate()) return;
  form.regionText = regionText.value;
  const parts = form.regionText.split(' ');
  const payload = {
    ...form,
    province: parts[0] || '',
    city: parts[1] || '',
    district: parts[2] || ''
  };
  if (editId.value) {
    addressStore.update(editId.value, payload);
  } else {
    addressStore.add(payload);
  }
  toast.success('保存成功');
  setTimeout(() => uni.navigateBack(), 600);
}

function onRemove() {
  if (!requireLogin(couple)) return;
  uni.showModal({
    title: '提示',
    content: '确定删除该地址吗？',
    confirmColor: '#FF5A1F',
    success: (r) => {
      if (r.confirm) {
        addressStore.remove(editId.value);
        uni.navigateBack();
      }
    }
  });
}

onLoad((q) => {
  if (q && q.id) {
    editId.value = q.id;
    const addr = addressStore.getAddress(q.id);
    if (addr) {
      Object.assign(form, addr);
      if (addr.province || addr.city || addr.district) {
        form.region = textToCode([addr.province || '', addr.city || '', addr.district || '']);
      } else if (!Array.isArray(form.region) || form.region.length !== 3 || form.region.some((r) => !r)) {
        form.region = ['', '', ''];
      }
      form.regionText = codeToText(form.region);
    }
  }
});
onShow(() => {
  firstLoading.value = false;
});
</script>

<style lang="scss" scoped>
.edit-page {
  padding: 24rpx;
  padding-bottom: 180rpx;
}
.form-card {
  background: #fff;
  border-radius: $radius-lg;
  padding: 8rpx 28rpx;
  box-shadow: $shadow-card;
}
.field {
  display: flex;
  flex-direction: column;
  padding: 20rpx 0;
  border-bottom: 1rpx solid $divider;
  .field-label {
    font-size: 24rpx;
    color: $text-3;
    font-weight: 600;
    margin-bottom: 12rpx;
  }
  &.switch-field {
    flex-direction: row;
    align-items: center;
    justify-content: space-between;
    border-bottom: none;
    .field-label {
      margin-bottom: 0;
    }
  }
}
.ipt {
  width: 100%;
  height: 88rpx;
  padding: 0 24rpx;
  background: $bg-surface-alt;
  border-radius: $radius-md;
  font-size: 28rpx;
  color: $text-1;
  box-sizing: border-box;
  &.textarea {
    height: 140rpx;
    padding: 20rpx 24rpx;
    line-height: 1.5;
  }
}
.ipt-ph {
  color: $text-4;
}
.err {
  display: block;
  padding: 0 0 16rpx;
  font-size: 22rpx;
  color: $color-danger;
}
.region-text {
  display: block;
  padding: 0 0 16rpx;
  font-size: 24rpx;
  color: $text-2;
}
.tag-pick {
  flex: 1;
  display: flex;
  gap: 16rpx;
  flex-wrap: wrap;
}
.tag-opt {
  padding: 10rpx 28rpx;
  border-radius: $radius-pill;
  background: $bg-surface-alt;
  font-size: 24rpx;
  color: $text-2;
  &.active {
    background: $brand-primary;
    color: #fff;
    font-weight: 600;
  }
}
.switch {
  width: 88rpx;
  height: 50rpx;
  border-radius: $radius-pill;
  background: $border-1;
  position: relative;
  transition: background 0.2s ease;
  .knob {
    position: absolute;
    top: 4rpx;
    left: 4rpx;
    width: 42rpx;
    height: 42rpx;
    border-radius: 50%;
    background: #fff;
    box-shadow: 0 2rpx 6rpx rgba(0, 0, 0, 0.15);
    transition: left 0.2s ease;
  }
  &.on {
    background: $brand-primary;
    .knob {
      left: 42rpx;
    }
  }
}
.del-link {
  margin-top: 32rpx;
  text-align: center;
  font-size: 26rpx;
  color: $color-danger;
  padding: 20rpx;
}
.save-bar {
  position: fixed;
  left: 0;
  right: 0;
  bottom: 0;
  padding: 20rpx 28rpx;
  background: #fff;
  box-shadow: 0 -4rpx 24rpx rgba(60, 30, 0, 0.08);
  z-index: 100;
}
.save-btn {
  height: 88rpx;
  border-radius: $radius-pill;
  background: linear-gradient(135deg, $brand-primary, $brand-primary-2);
  color: #fff;
  font-size: 32rpx;
  font-weight: 800;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: $shadow-press;
}
</style>

<!-- #ifdef MP-WEIXIN -->
<style lang="scss">
.region-picker .nut-tabs__titles {
  background: transparent !important;
}
.region-picker .nut-cascader-pane {
  height: calc(60vh - 200rpx) !important;
}
.region-picker .nut-tabs__titles-item {
  width: auto !important;
}
</style>
<!-- #endif -->
