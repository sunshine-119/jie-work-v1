<template>
  <nut-giftbox
    ref="giftboxEl"
    @start-turns="onTurnsStart()"
    @end-turns="onTurnsEnd()"
  ></nut-giftbox>
  <view class="nut-button-custom">
    <nut-button block type="primary" @click="init()">再来一次</nut-button>
  </view>
</template>
<script setup>
import { ref } from "vue";
const giftboxEl = ref();
function init() {
  giftboxEl.value.init();
}
function onTurnsStart() {
  console.log("抽奖开始");
}
function onTurnsEnd() {
  console.log("抽奖结束");
}
</script>
<style lang="scss" scoped>
.nut-button-custom {
  margin-top: 20rpx;
}
</style>