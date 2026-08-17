import { defineStore } from 'pinia';
import { storage } from '@/utils/storage';
import { api } from '@/utils/api';
import { codeToText, textToCode } from '@/utils/region';
import { useCoupleStore } from './couple';
import { requireLogin } from '@/utils/auth';

const ADDR_KEY = 'oc_addresses';

/**
 * 地址 Store
 * -----------------------------------------------------------------------------
 * 对接后端 /api/addresses
 * 后端不可用时自动降级到本地 localStorage
 */
export const useAddressStore = defineStore('address', {
  state: () => ({
    addresses: [],
    online: true
  }),
  getters: {
    defaultAddress: (s) => s.addresses.find((a) => a.isDefault) || s.addresses[0] || null,
    getAddress: (s) => (id) => s.addresses.find((a) => a.id === id)
  },
  actions: {
    init() {
      const couple = useCoupleStore();
      // 游客模式下不展示任何真实地址数据
      this.addresses = couple.isDemo ? [] : storage.get(ADDR_KEY, []);
      this.fetchFromServer().catch(() => {});
    },
    persist() {
      storage.set(ADDR_KEY, this.addresses);
    },
    async fetchFromServer() {
      const couple = useCoupleStore();
      if (!couple.coupleId || couple.isDemo) return;
      try {
        const list = await api.listAddresses(couple.coupleId);
        this.addresses = (list || []).map((a) => this._normalizeRegion(a));
        this.online = true;
        this.persist();
      } catch (e) {
        this.online = false;
      }
    },
    async add(data) {
      const couple = useCoupleStore();
      if (couple.isDemo) {
        if (!requireLogin(couple)) return null;
      }
      if (this.online && couple.coupleId) {
        try {
          const addr = await api.createAddress({ ...data, coupleId: couple.coupleId });
          this._insertLocal(this._normalizeRegion(addr));
          this.persist();
          return addr;
        } catch (e) { this.online = false; }
      }
      const id = `addr_${Date.now()}`;
      const addr = { id, isDefault: false, ...data };
      this._insertLocal(this._normalizeRegion(addr));
      this.persist();
      return addr;
    },
    async update(id, data) {
      const couple = useCoupleStore();
      if (couple.isDemo) {
        if (!requireLogin(couple)) return null;
      }
      if (this.online && couple.coupleId) {
        try {
          const addr = await api.updateAddress(id, { ...data, coupleId: couple.coupleId });
          this._replaceLocal(this._normalizeRegion(addr));
          this.persist();
          return addr;
        } catch (e) { this.online = false; }
      }
      const idx = this.addresses.findIndex((a) => a.id === id);
      if (idx === -1) return;
      const addr = { ...this.addresses[idx], ...data };
      this._replaceLocal(this._normalizeRegion(addr));
      this.persist();
      return addr;
    },
    async remove(id) {
      const couple = useCoupleStore();
      if (couple.isDemo) {
        if (!requireLogin(couple)) return;
      }
      if (this.online && couple.coupleId) {
        try {
          await api.deleteAddress(id, couple.coupleId);
          this._removeLocal(id);
          this.persist();
          return;
        } catch (e) { this.online = false; }
      }
      this._removeLocal(id);
      this.persist();
    },
    async setDefault(id) {
      await this.update(id, { isDefault: true });
    },
    _insertLocal(addr) {
      if (this.addresses.length === 0) addr.isDefault = true;
      if (addr.isDefault) {
        this.addresses.forEach((a) => { a.isDefault = false; });
      }
      this.addresses.push(addr);
    },
    _replaceLocal(addr) {
      const idx = this.addresses.findIndex((a) => a.id === addr.id);
      if (idx === -1) return;
      if (addr.isDefault) {
        this.addresses.forEach((a) => { if (a.id !== addr.id) a.isDefault = false; });
      }
      this.addresses[idx] = addr;
    },
    _removeLocal(id) {
      const wasDefault = this.addresses.find((a) => a.id === id)?.isDefault;
      this.addresses = this.addresses.filter((a) => a.id !== id);
      if (wasDefault && this.addresses.length > 0) {
        this.addresses[0].isDefault = true;
      }
    },
    _normalizeRegion(addr) {
      if (!addr) return addr;
      const a = { ...addr };

      // 补齐/统一文字地址
      let province = a.province || '';
      let city = a.city || '';
      let district = a.district || '';
      let street = a.street || '';
      if ((!province || !city || !district) && a.regionText) {
        const parts = a.regionText.split(' ');
        province = province || parts[0] || '';
        city = city || parts[1] || '';
        district = district || parts[2] || '';
      }
      if ((!province || !city || !district) && Array.isArray(a.region) && a.region.length === 3) {
        const parts = codeToText(a.region).split(' ');
        province = province || parts[0] || '';
        city = city || parts[1] || '';
        district = district || parts[2] || '';
      }
      a.province = province;
      a.city = city;
      a.district = district;
      a.street = street;
      a.regionText = [province, city, district, street].filter(Boolean).join(' ');

      // region 必须是 6 位代码数组；旧数据是文字数组时重新转换
      const isValidCodeArray = Array.isArray(a.region)
        && a.region.length === 3
        && a.region.every((c) => /^\d{6}$/.test(String(c)));
      if (!isValidCodeArray) {
        a.region = textToCode([province, city, district]);
      }

      return a;
    },
    clear() {
      this.addresses = [];
      storage.remove(ADDR_KEY);
    }
  }
});
