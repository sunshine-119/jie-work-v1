<template>
  <nut-hiteggs :num="num" @click="onHit()"></nut-hiteggs>
</template>
<script setup>
import { ref } from "vue";
const num = ref(12);
const onHit = () => {
  console.log("点击了");
};
</script>
<style lang='scss' scoped>
.content {
  margin: 24rpx auto;
}
</style>