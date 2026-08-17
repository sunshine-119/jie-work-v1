import { useCartStore } from '@/store/cart';
import { useOrderStore } from '@/store/order';
import { useAddressStore } from '@/store/address';
import { useCoupleStore } from '@/store/couple';
import { usePreferenceStore } from '@/store/preference';
import { useDishStore } from '@/store/dish';

export function resetAllStores() {
  useCartStore().$reset();
  useOrderStore().$reset();
  useAddressStore().$reset();
  useCoupleStore().$reset();
  usePreferenceStore().$reset();
  useDishStore().$reset();
}
