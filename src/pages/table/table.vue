<template>
  <view class="page table-page" :class="couple.themeClass" :style="couple.themeStyle">
    <NavBar title="选择桌台" :show-back="true">
      <template #right>
        <text class="nav-action" @click="toggleMode">
          {{ isEditMode ? '完成' : '管理' }}
        </text>
      </template>
    </NavBar>

    <PageLoading :visible="firstLoading" @timeout="firstLoading = false" />

    <view v-show="!firstLoading" class="table-content">
    <view class="tip-bar">
      <text class="tip-icon">🪑</text>
      <text class="tip-text">挑一个喜欢的位置，把美味和心意都端到 TA 身边～</text>
    </view>

    <view v-for="area in areas" :key="area" class="area-block">
      <view class="area-title">
        <text class="area-name">{{ area }}</text>
        <text class="area-line" />
      </view>
      <view class="table-grid">
        <view
          v-for="t in tablesByArea[area]"
          :key="t.id"
          class="table-cell"
          :class="{ active: selectedId === t.id, edit: isEditMode }"
          @click="onPick(t)"
          @longpress="onLongPress(t)"
        >
          <text class="t-name">{{ t.name }}</text>
          <text class="t-desc">{{ t.desc }}</text>
          <view v-if="selectedId === t.id" class="t-check">
            <AppIcon name="check" size="22" color="#fff" />
          </view>
          <view v-if="isEditMode" class="edit-badge" @click.stop="openEdit(t)">
            <!-- <AppIcon name="edit" size="18rpx" :custom-color="couple.themeStyle['--c-primary']" /> -->
            <nut-icon name="edit" size="18rpx" custom-color="#fff" />
          </view>
        </view>
      </view>
    </view>

    <view class="bottom-holder" />
    <view class="confirm-bar safe-bottom" v-if="mode === 'select'">
      <view
        class="confirm-btn"
        :class="{ disabled: !selectedTable }"
        @click="onConfirm"
      >
        <text>{{ confirmBtnText }}</text>
      </view>
    </view>

    <view class="confirm-bar safe-bottom" v-if="isEditMode">
      <view class="confirm-btn add-btn" @click="openAdd">
        <text>＋ 新增桌台</text>
      </view>
    </view>

    <!-- 编辑/新增弹窗 -->
    <view
      v-show="showModal"
      class="modal-mask"
      :class="{ show: showModal }"
      @click="closeModal"
      @touchmove.stop.prevent
    >
      <view class="modal-wrap" @click.stop @touchmove.stop.prevent>
        <view class="modal-head">
          <text class="modal-title">{{ editingId ? '编辑桌台' : '新增桌台' }}</text>
          <view class="modal-close" @click="closeModal">
            <AppIcon name="close" size="24" color="#A89DA3" />
          </view>
        </view>
        <view class="modal-body">
          <view class="field">
            <text class="field-label">桌台名称</text>
            <input
              :value="editForm.name"
              class="ipt"
              placeholder="如 A01、V1、露台 1 号"
              placeholder-class="ipt-ph"
              maxlength="12"
              :adjust-position="true"
              @input="e => editForm.name = e.detail.value"
            />
          </view>
          <view class="field">
            <text class="field-label">所属区域</text>
            <view class="tag-pick">
              <text
                v-for="a in areaOptions"
                :key="a"
                class="tag-opt"
                :class="{ active: editForm.area === a }"
                @click="editForm.area = a"
              >{{ a }}</text>
            </view>
            <input
              :value="editForm.area"
              class="ipt area-ipt"
              placeholder="或自定义区域"
              placeholder-class="ipt-ph"
              maxlength="8"
              :adjust-position="true"
              @input="e => editForm.area = e.detail.value"
            />
          </view>
          <view class="field">
            <text class="field-label">座位数</text>
            <input
              :value="String(editForm.seats)"
              class="ipt"
              type="number"
              placeholder="请输入座位数"
              placeholder-class="ipt-ph"
              maxlength="3"
              :adjust-position="true"
              @input="e => editForm.seats = Number(e.detail.value || 0)"
            />
          </view>
          <view class="field">
            <text class="field-label">描述</text>
            <input
              :value="editForm.desc"
              class="ipt"
              placeholder="如靠窗双人位 · 安静"
              placeholder-class="ipt-ph"
              maxlength="24"
              :adjust-position="true"
              @input="e => editForm.desc = e.detail.value"
            />
          </view>
        </view>
        <view class="modal-foot">
          <view v-if="editingId" class="del-btn" @click="onDelete">
            <!-- <AppIcon name="trash" size="40" color="#E08B8B" /> -->
            <text>删除</text>
          </view>
          <view class="save-btn" @click="onSave">
            <text>保存</text>
          </view>
        </view>
      </view>
    </view>

    <Toast />
    </view>
  </view>
</template>

<script setup>
import { ref, computed, reactive } from 'vue';
import { onLoad } from '@dcloudio/uni-app';
import AppIcon from '@/components/AppIcon.vue';
import NavBar from '@/components/NavBar.vue';
import Toast from '@/components/Toast.vue';
import PageLoading from '@/components/PageLoading.vue';
import { api } from '@/utils/api';
import { tables as mockTables } from '@/mock/tables';
import { useCoupleStore } from '@/store/couple';
import { toast } from '@/utils/toast';

const couple = useCoupleStore();
const mode = ref('select');
const selectedId = ref('');
const tables = ref([]);
const loading = ref(false);
const firstLoading = ref(true);
const showModal = ref(false);
const editingId = ref('');

const STORAGE_KEY = 'mock_tables';
const areaOptions = ['大厅', '靠窗区', '卡座区', '包厢区', '露台区'];

const editForm = reactive({
  name: '',
  desc: '',
  seats: 2,
  area: '大厅'
});

const isEditMode = computed(() => mode.value === 'edit');
const areas = computed(() => [...new Set(tables.value.map((t) => t.area))]);
const tablesByArea = computed(() => {
  const m = {};
  tables.value.forEach((t) => {
    if (!m[t.area]) m[t.area] = [];
    m[t.area].push(t);
  });
  return m;
});
const selectedTable = computed(() => tables.value.find((t) => t.id === selectedId.value));
const confirmBtnText = computed(() => {
  if (!selectedTable.value) return '请先选择桌台';
  return `确认桌台 · ${selectedTable.value.name}`;
});

function getFallbackTables() {
  return JSON.parse(JSON.stringify(mockTables));
}

async function loadTables() {
  loading.value = true;
  try {
    const list = await api.listTables();
    tables.value = list && list.length ? list : getFallbackTables();
  } catch (e) {
    tables.value = getFallbackTables();
  } finally {
    loading.value = false;
    firstLoading.value = false;
  }
}

function onPick(t) {
  selectedId.value = t.id;
  if (mode.value === 'select') {
    return;
  }
  if (isEditMode.value) {
    return;
  }
  back(t);
}

function onLongPress(t) {
  selectedId.value = t.id;
  openEdit(t);
}

function toggleMode() {
  mode.value = isEditMode.value ? 'select' : 'edit';
}

function onConfirm() {
  if (!selectedTable.value) {
    toast.info('请先选择桌台');
    return;
  }
  back(selectedTable.value);
}

function back(table) {
  const pages = getCurrentPages();
  const current = pages[pages.length - 1];
  if (current && current.getOpenerEventChannel) {
    const ec = current.getOpenerEventChannel();
    if (ec) ec.emit('onPick', table);
  }
  uni.navigateBack();
}

function resetForm() {
  editForm.name = '';
  editForm.desc = '';
  editForm.seats = 2;
  editForm.area = '大厅';
  editingId.value = '';
}

function openAdd() {
  resetForm();
  showModal.value = true;
}

function openEdit(t) {
  editingId.value = t.id;
  editForm.name = t.name;
  editForm.desc = t.desc;
  editForm.seats = t.seats || 2;
  editForm.area = t.area || '大厅';
  showModal.value = true;
}

function closeModal() {
  showModal.value = false;
  setTimeout(resetForm, 200);
}

function validateForm() {
  if (!editForm.name.trim()) {
    toast.info('请输入桌台名称');
    return false;
  }
  if (!editForm.area.trim()) {
    toast.info('请选择或输入区域');
    return false;
  }
  if (!editForm.seats || editForm.seats < 1) {
    toast.info('请输入有效座位数');
    return false;
  }
  return true;
}

async function syncBackend(payload, isCreate) {
  try {
    if (isCreate) {
      return await api.createTable(payload);
    }
    return await api.updateTable(payload.id, payload);
  } catch (e) {
    // 后端未启动或写入被禁时，使用本地 mock 持久化
    console.warn('[table] backend sync failed, use local mock', e);
    return payload;
  }
}

async function onSave() {
  if (!validateForm()) return;

  const isCreate = !editingId.value;
  const payload = {
    id: editingId.value || `T${Date.now()}`,
    name: editForm.name.trim(),
    desc: editForm.desc.trim(),
    seats: Number(editForm.seats),
    area: editForm.area.trim()
  };

  const saved = await syncBackend(payload, isCreate);
  const final = { ...payload, ...saved };

  if (isCreate) {
    tables.value.push(final);
  } else {
    const idx = tables.value.findIndex((t) => t.id === editingId.value);
    if (idx !== -1) tables.value.splice(idx, 1, final);
  }

  toast.success('保存成功');
  closeModal();
}

function onDelete() {
  if (!editingId.value) return;
  uni.showModal({
    title: '删除桌台',
    content: '确定删除该桌台吗？删除后不可恢复哦',
    confirmColor: '#E08B8B',
    success: async (r) => {
      if (!r.confirm) return;
      try {
        await api.deleteTable(editingId.value);
      } catch (e) {
        console.warn('[table] backend delete failed, use local mock', e);
      }
      tables.value = tables.value.filter((t) => t.id !== editingId.value);
      if (selectedId.value === editingId.value) selectedId.value = '';
      toast.success('已删除');
      closeModal();
    }
  });
}

onLoad((q) => {
  mode.value = (q && q.mode === 'edit') ? 'edit' : 'select';
  try {
    uni.removeStorageSync(STORAGE_KEY);
  } catch (e) {}
  loadTables();
});
</script>

<style lang="scss" scoped>
.table-page {
  padding: 24rpx;
}
.tip-bar {
  display: flex;
  align-items: center;
  gap: 12rpx;
  padding: 20rpx 24rpx;
  background: rgba(255, 179, 0, 0.12);
  border-radius: $radius-md;
  margin-bottom: 24rpx;
  .tip-icon {
    font-size: 30rpx;
  }
  .tip-text {
    font-size: 24rpx;
    color: #8a5a00;
  }
}
.area-block {
  margin-bottom: 32rpx;
}
.area-title {
  display: flex;
  align-items: center;
  gap: 16rpx;
  margin-bottom: 20rpx;
  .area-name {
    font-size: 30rpx;
    font-weight: 800;
    color: $text-1;
  }
  .area-line {
    flex: 1;
    height: 1rpx;
    background: $divider;
  }
}
.table-grid {
  display: flex;
  flex-wrap: wrap;
  gap: 20rpx;
}
.table-cell {
  position: relative;
  width: calc((100% - 40rpx) / 3);
  padding: 28rpx 16rpx;
  background: #fff;
  border-radius: $radius-md;
  border: 2rpx solid transparent;
  box-shadow: $shadow-card;
  display: flex;
  flex-direction: column;
  align-items: center;
  .t-name {
    font-size: 40rpx;
    font-weight: 800;
    color: var(--c-primary, #F5B6C1);
  }
  .t-desc {
    margin-top: 6rpx;
    font-size: 20rpx;
    color: $text-3;
    text-align: center;
  }
  .t-check {
    position: absolute;
    top: 10rpx;
    right: 10rpx;
    width: 36rpx;
    height: 36rpx;
    border-radius: 50%;
    background: var(--c-primary, #F5B6C1);
    display: flex;
    align-items: center;
    justify-content: center;
  }
  .edit-badge {
    position: absolute;
    top: 10rpx;
    right: 10rpx;
    width: 36rpx;
    height: 36rpx;
    border-radius: 50%;
    background: $brand-taro;
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 2;
  }
  &.active {
    border-color: var(--c-primary, #F5B6C1);
    background: linear-gradient(135deg, rgba(245, 182, 193, 0.12), rgba(255, 214, 221, 0.12));
  }
  &.edit {
    padding-top: 32rpx;
  }
}
.bottom-holder {
  height: 160rpx;
}
.nav-action {
  padding: 8rpx 20rpx;
  border-radius: $radius-pill;
  background: rgba(255, 255, 255, 0.25);
  color: #fff;
  font-size: 26rpx;
  font-weight: 700;
}
.confirm-bar {
  position: fixed;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: 10;
  padding: 20rpx 28rpx;
  background: #fff;
  box-shadow: 0 -4rpx 24rpx rgba(60, 30, 0, 0.08);
}
.confirm-btn {
  height: 88rpx;
  border-radius: $radius-pill;
  background: linear-gradient(135deg, var(--c-primary, #F5B6C1), var(--c-primary-2, #FFD6DD));
  color: #fff;
  font-size: 32rpx;
  font-weight: 800;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: $shadow-press;
  &.disabled {
    opacity: 0.5;
  }
  &.add-btn {
    background: linear-gradient(135deg, $brand-taro, $brand-accent);
  }
}

/* 弹窗 */
.modal-mask {
  position: fixed;
  inset: 0;
  background: rgba(74, 40, 60, 0.45);
  display: flex !important;
  align-items: center;
  justify-content: center;
  z-index: 100;
  padding: 40rpx;
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
.modal-wrap {
  width: 100%;
  max-width: 600rpx;
  background: #fff;
  border-radius: $radius-lg;
  box-shadow: $shadow-float;
  overflow: hidden;
  transform: translateY(100%);
  transition: transform 0.25s ease-out;
}
.modal-mask.show .modal-wrap {
  transform: translateY(0);
}
.modal-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 28rpx 28rpx 16rpx;
  .modal-title {
    font-size: 32rpx;
    font-weight: 800;
    color: $text-1;
  }
  .modal-close {
    width: 48rpx;
    height: 48rpx;
    display: flex;
    align-items: center;
    justify-content: center;
  }
}
.modal-body {
  padding: 8rpx 28rpx 20rpx;
}
.field {
  display: flex;
  flex-direction: column;
  padding: 16rpx 0;
  .field-label {
    font-size: 24rpx;
    color: $text-3;
    font-weight: 600;
    margin-bottom: 12rpx;
  }
}
.ipt {
  width: 100%;
  height: 84rpx;
  padding: 0 24rpx;
  background: $bg-surface-alt;
  border-radius: $radius-md;
  font-size: 28rpx;
  color: $text-1;
  box-sizing: border-box;
  &.area-ipt {
    margin-top: 16rpx;
  }
}
.ipt-ph {
  color: $text-4;
}
.tag-pick {
  display: flex;
  gap: 16rpx;
  flex-wrap: wrap;
}
.tag-opt {
  padding: 10rpx 24rpx;
  border-radius: $radius-pill;
  background: $bg-surface-alt;
  font-size: 24rpx;
  color: $text-2;
  &.active {
    background: var(--c-primary, #F5B6C1);
    color: #fff;
    font-weight: 600;
  }
}
.modal-foot {
  display: flex;
  align-items: center;
  gap: 20rpx;
  padding: 16rpx 28rpx 32rpx;
  .del-btn {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    width: 96rpx;
    height: 84rpx;
    border-radius: $radius-md;
    background: rgba(224, 139, 139, 0.12);
    text {
      margin-top: 2rpx;
      font-size: 26rpx;
      color: $color-danger;
    }
  }
  .save-btn {
    flex: 1;
    height: 84rpx;
    border-radius: $radius-pill;
    background: linear-gradient(135deg, $brand-primary, $brand-primary-2);
    color: #fff;
    font-size: 30rpx;
    font-weight: 800;
    display: flex;
    align-items: center;
    justify-content: center;
    box-shadow: $shadow-press;
  }
}
</style>
