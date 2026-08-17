<template>
  <view
    class="page"
    :class="couple.themeClass"
    :style="couple.themeStyle"
  >
    <NavBar title="抢先体验" />
    <nut-tabs v-model="value" swipeable class="nut-tabs-container">
      <nut-tab-pane
        :title="it.title"
        v-for="(it, index) in tabs"
        :key="index"
        class="tab-pane"
      >
        <!-- #ifdef H5 -->
        <component :is="it.component" />
        <!-- #endif -->
        <!-- #ifdef MP-WEIXIN -->
        <Pannel1 v-if="index === 0" />
        <Pannel2 v-if="index === 1" />
        <Pannel3 v-if="index === 2" />
        <Pannel4 v-if="index === 3" />
        <!-- #endif -->
      </nut-tab-pane>
    </nut-tabs>
  </view>
</template>
<script setup>
import NavBar from "@/components/NavBar.vue";
import Pannel1 from "./components/pannel-1.vue";
import Pannel2 from "./components/pannel-2.vue";
import Pannel3 from "./components/pannel-3.vue";
import Pannel4 from "./components/pannel-4.vue";
import { useCoupleStore } from "@/store/couple";
import { ref } from "vue";
const value = ref(0);
const tabs = ref([
  {
    title: "跑马灯",
    component: Pannel1,
  },
  {
    title: "大转盘",
    component: Pannel2,
  },
  {
    title: "砸金蛋",
    component: Pannel3,
  },
  {
    title: "神秘礼盒",
    component: Pannel4,
  },
]);
const couple = useCoupleStore();
</script>
<!-- #ifdef H5 -->
<style lang="scss" scoped>
.nut-tabs-container {
  .tab-pane {
    background-color: transparent;
  }
  ::v-deep {
    .nut-tabs__titles {
      background-color: var(--c-bg-alt);
    }
    .nut-tabs__titles-item__line {
      background: var(
        --nut-tabs-horizontal-tab-line-color,
        linear-gradient(
          90deg,
          var(--c-primary, #fa2c19) 0%,
          rgba(250, 44, 25, 0.15) 100%
        )
      ) !important;
    }
  }
}
</style>
<!-- #endif -->
<!-- #ifdef MP-WEIXIN -->
<style lang="scss">
.nut-tabs {
  .nut-tab-pane {
    background-color: transparent;
  }
  ::v-deep {
    .nut-tabs__list {
      background-color: var(--c-bg-alt);
    }
    .nut-tabs__titles-item__line {
      background: var(
        --nut-tabs-horizontal-tab-line-color,
        linear-gradient(
          90deg,
          var(--c-primary, #fa2c19) 0%,
          rgba(250, 44, 25, 0.15) 100%
        )
      ) !important;
    }
  }
}
</style>
<!-- #endif -->