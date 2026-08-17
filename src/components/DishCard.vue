<template>
  <view class="dish-card" :class="{ 'warn-allergen': isAllergen, 'warn-dislike': isDislike }" @click="$emit('click', dish)">
    <view class="img-box" :style="imgBoxStyle">
      <!-- 有图片时优先展示图片，否则展示 emoji -->
      <image v-if="dish.image" class="img" :src="imageUrl" mode="aspectFill" lazy-load />
      <view v-else-if="dish.emoji" class="emoji-icon">
        <text>{{ dish.emoji }}</text>
      </view>
      <!-- 想吃收藏按钮（右上角心形） -->
      <view class="fav-btn" :class="{ active: favorite }" @click.stop="$emit('toggleFavorite')">
        <AppIcon
          class="fav-icon"
          :name="favorite ? 'heart' : 'heartOutline'"
          size="24"
          :color="favorite ? '#E08B8B' : '#C9BFC4'"
        />
      </view>
      <!-- 辣度 -->
      <view v-if="dish.spicy > 0" class="spicy">
        <text v-for="n in dish.spicy" :key="n">🌶</text>
      </view>
      <!-- 过敏原警告徽章 -->
      <view v-if="isAllergen" class="warn-badge allergen">
        <AppIcon name="warning" size="18" color="#fff" />
        <text>含{{ allergenHit.join('/') }}</text>
      </view>
      <view v-else-if="isDislike" class="warn-badge dislike">
        <AppIcon name="warning" size="18" color="#fff" />
        <text>含{{ dislikeHit.join('/') }}</text>
      </view>
    </view>
    <view class="info">
      <view class="name-row">
        <text class="name ellipsis">{{ dish.name }}</text>
        <!-- <text v-if="dish.isCustom" class="custom-tag">想吃</text> -->
        <!-- 男友端标注状态提示（女友端可见） -->
        <view v-if="dish.canCook != null" class="cook-hint" :class="cookHintClass">
          <text>{{ cookHintText }}</text>
        </view>
      </view>
      <text class="desc ellipsis">{{ dish.desc }}</text>
      <view class="tags">
        <text v-for="a in (dish.allergens || []).filter(a => preference.allergens.includes(a))" :key="'a-'+a" class="tag allergen-tag">{{ a }}</text>
        <text v-for="d in (dish.dislikeTags || [])" :key="'dl-'+d" class="tag dislike-tag">{{ d }}</text>
        <text v-for="d in (dish.dietTags || [])" :key="'d-'+d" class="tag diet-tag">{{ d }}</text>
        <text v-for="t in (dish.tags || [])" :key="t" class="tag">{{ t }}</text>
        <text class="sales">被点了 {{ dish.sales }} 次</text>
      </view>
      <view class="bottom">
        <view class="note-btn" @click.stop="$emit('note', dish)">
          <!-- <AppIcon name="edit" size="22" color="#B8A2C7" /> -->
          <nut-icon class="note-icon" name="edit" size="22rpx" :custom-color="couple.themeStyle['--c-primary']" />
          <text class="note-text">备注</text>
        </view>
        <view class="bottom-spacer" />
        <view class="action">
          <view v-if="qty > 0" class="minus-btn" @click.stop="$emit('minus')">
            <AppIcon name="minus" size="24" color="#E08B8B" />
            <!-- <nut-icon name="minus" size="24rpx" custom-color="#E08B8B" /> -->
          </view>
          <text v-if="qty > 0" class="qty">{{ qty }}</text>
          <view class="add-btn" @click.stop="$emit('add')">
            <!-- <AppIcon name="add" size="24" color="#fff" /> -->
            <nut-icon name="uploader" size="24rpx" custom-color="#fff" />
          </view>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup>
import { computed } from 'vue';
import { usePreferenceStore } from '@/store/preference';
import { useCoupleStore } from '@/store/couple';
import { resolveUrl } from '@/utils/server';
import AppIcon from './AppIcon.vue';

const props = defineProps({
  dish: { type: Object, required: true },
  qty: { type: Number, default: 0 },
  favorite: { type: Boolean, default: false }
});
defineEmits(['add', 'minus', 'click', 'note', 'toggleFavorite']);

const preference = usePreferenceStore();
const couple = useCoupleStore();

// 背景渐变：优先用 dish.bgColor，否则用默认米白
const imgBoxStyle = computed(() => ({
  background: props.dish.bgColor || 'linear-gradient(135deg, #FFF8F2, #F5E6D3)'
}));

// 图片路径动态解析（支持相对路径换服务器地址）
const imageUrl = computed(() => resolveUrl(props.dish.image));

// 过敏原命中（红色警告，强提醒）
const allergenHit = computed(() => {
  if (!props.dish || !props.dish.allergens) return [];
  return props.dish.allergens.filter((a) => preference.allergens.includes(a));
});
const isAllergen = computed(() => allergenHit.value.length > 0);

// 忌口命中（黄色提醒，弱提醒）
const dislikeHit = computed(() => {
  if (!props.dish || !props.dish.dietTags) return [];
  return props.dish.dietTags.filter((d) => preference.dislikes.includes(d));
});
const isDislike = computed(() => !isAllergen.value && dislikeHit.value.length > 0);

// 男友端标注状态提示（女友端轻度可见）
const cookHintClass = computed(() => {
  if (props.dish.canCook === 1) return 'cook-yes';
  if (props.dish.canCook === 0) return 'cook-no';
  return '';
});
const cookHintText = computed(() => {
  if (props.dish.canCook === 1) return couple.partnerDisplayName + '会做';
  if (props.dish.canCook === 0) return couple.partnerDisplayName + '还在学';
  return '';
});
</script>

<style lang="scss" scoped>
.dish-card {
  display: flex;
  padding: 20rpx;
  background: var(--c-bg-alt, #fff);
  border-radius: $radius-lg;
  margin-bottom: 20rpx;
  box-shadow: $shadow-card;
  transition: transform 0.15s ease;
  &:active {
    transform: scale(0.99);
  }
  &.warn-allergen {
    border: 2rpx solid rgba(224, 139, 139, 0.4);
    background: linear-gradient(135deg, var(--c-bg-alt, #fff), rgba(224, 139, 139, 0.04));
  }
  &.warn-dislike {
    border: 2rpx solid rgba(232, 184, 108, 0.3);
  }
}
.img-box {
  position: relative;
  width: 200rpx;
  height: 200rpx;
  border-radius: $radius-md;
  overflow: hidden;
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
}
.emoji-icon {
  font-size: 72rpx;
  line-height: 1;
  text-align: center;
}
.img {
  width: 100%;
  height: 100%;
}
.fav-btn {
  position: absolute;
  top: 8rpx;
  right: 8rpx;
  width: 44rpx;
  height: 44rpx;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.9);
  display: flex;
  align-items: center;
  justify-content: center;
  .fav-icon {
    font-size: 24rpx;
  }
  &.active {
    background: #fff;
  }
}
.spicy {
  position: absolute;
  bottom: 8rpx;
  right: 8rpx;
  font-size: 18rpx;
  text-shadow: 0 1rpx 2rpx rgba(0, 0, 0, 0.3);
}
.warn-badge {
  position: absolute;
  bottom: 8rpx;
  left: 8rpx;
  font-size: 18rpx;
  font-weight: 700;
  padding: 4rpx 10rpx;
  border-radius: $radius-sm;
  display: flex;
  align-items: center;
  gap: 4rpx;
  &.allergen {
    background: rgba(224, 139, 139, 0.9);
    color: #fff;
  }
  &.dislike {
    background: rgba(232, 184, 108, 0.9);
    color: #fff;
  }
}
.info {
  flex: 1;
  min-width: 0;
  margin-left: 20rpx;
  display: flex;
  flex-direction: column;
}
.name-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 8rpx;
}
.name {
  font-size: 30rpx;
  font-weight: 700;
  color: $text-1;
}
.custom-tag {
  font-size: 18rpx;
  color: $brand-taro;
  background: $bg-taro;
  padding: 2rpx 10rpx;
  border-radius: $radius-sm;
  flex-shrink: 0;
}
.cook-hint {
  display: inline-flex;
  align-items: center;
  font-size: 18rpx;
  padding: 2rpx 12rpx;
  border-radius: $radius-sm;
  margin-left: 8rpx;
  flex-shrink: 0;
  &.cook-yes {
    background: rgba(127, 182, 168, 0.15);
    color: #5A9B8A;
  }
  &.cook-no {
    background: rgba(232, 184, 108, 0.15);
    color: #C0944C;
  }
}
.desc {
  margin-top: 8rpx;
  font-size: 22rpx;
  color: $text-3;
  line-height: 1.4;
}
.tags {
  margin-top: 10rpx;
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 8rpx;
}
.tag {
  font-size: 18rpx;
  color: $tag-selected-color;
  background: $tag-selected-bg;
  padding: 2rpx 10rpx;
  border-radius: $radius-sm;
}
.allergen-tag {
  color: $tag-warn-color;
  background: $tag-warn-bg;
}
.diet-tag {
  background: $tag-info-bg;
  color: $tag-info-color;
}
.dislike-tag {
  color: $tag-dislike-color;
  background: $tag-dislike-bg;
}
.sales {
  font-size: 20rpx;
  color: $text-4;
  margin-left: 4rpx;
}
.bottom {
  margin-top: auto;
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  padding-top: 12rpx;
}
.note-btn {
  display: flex;
  align-items: center;
  gap: 4rpx;
  padding: 8rpx 16rpx;
  background: $bg-taro;
  border-radius: $radius-pill;
  .note-icon {
    font-size: 22rpx;
  }
  .note-text {
    font-size: 22rpx;
    color: $brand-taro;
    font-weight: 600;
  }
}
.bottom-spacer {
  flex: 1;
}
.action {
  display: flex;
  align-items: center;
  gap: 16rpx;
}
.minus-btn,
.add-btn {
  width: 44rpx;
  height: 44rpx;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 36rpx;
  font-weight: 600;
}
.add-btn {
  background: linear-gradient(135deg, $brand-primary, $brand-primary-2);
  color: #fff;
  box-shadow: $shadow-press;
}
.minus-btn {
  background: #fff;
  border: 2rpx solid $brand-primary;
  color: $brand-primary;
}
.qty {
  min-width: 36rpx;
  text-align: center;
  font-size: 30rpx;
  font-weight: 700;
  color: $text-1;
}
</style>
