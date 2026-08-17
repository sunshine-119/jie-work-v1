<template>
  <view class="turntable-wrapper">
    <!-- #ifdef MP-WEIXIN -->
    <!-- 小程序端 nut-turntable 内部 canvas 失效，用独立背景层兜底，
         旋转角度与组件内部保持一致 -->
    <view
      class="turntable-bg-mp"
      :style="{
        background: conicGradient,
        transform: `rotate(${bgRotate}deg)`,
        transition: bgTransition
      }"
    ></view>
    <!-- #endif -->
    <nut-turntable
      ref="turntableEl"
      width="300px"
      height="300px"
      class="turntable-inner"
      :prize-list="prizeList"
      :prize-index="prizeIndex"
      :style-opt="styleOpt"
      :pointer-style="pointerStyle"
      @start-turns="onTurnsStart()"
      @end-turns="onTurnsEnd()"
    ></nut-turntable>
  </view>
</template>
<script setup>
import { ref, reactive, computed } from "vue";

const turntableEl = ref();

// 小程序端兜底背景旋转状态（与 nut-turntable 内部 rotateTurn 同步）
const bgRotate = ref(0);
const bgTransition = ref('');
const startRotateDegree = ref(0);
const TURNS_NUMBER = 5;
const TURNS_TIME = 5;

// 小程序端用 conic-gradient 兜底转盘背景，与 prize item 角度精确对齐
const conicGradient = computed(() => {
  const len = prizeList.value.length || 1;
  const step = 360 / len;
  const stops = prizeList.value.map((item, index) => {
    const color = item.prizeColor || styleOpt.prizeBgColors[index];
    const start = index * step;
    const end = (index + 1) * step;
    return `${color} ${start}deg ${end}deg`;
  });
  return `conic-gradient(${stops.join(", ")})`;
});

// 转盘样式的选项
const styleOpt = reactive({
  // 转盘中每一块扇形的背景色,根据奖品的index来取每一块的对应颜色
  prizeBgColors: [
    "rgb(255, 231, 149)",
    "rgb(255, 247, 223)",
    "rgb(255, 231, 149)",
    "rgb(255, 247, 223)",
    "rgb(255, 231, 149)",
    "rgb(255, 247, 223)"
  ],
  // 每一个扇形的外边框颜色（nut-turntable 内部未消费该字段，仅作保留）
  borderColor: "#ff9800"
});

// 转盘指针图片样式
const pointerStyle = {
  width: "80px",
  height: "80px",
  backgroundImage: `url("https://img11.360buyimg.com/imagetools/jfs/t1/89512/11/15244/137408/5e6f15edEf57fa3ff/cb57747119b3bf89.png")`,
  backgroundSize: "contain",
  backgroundRepeat: "no-repeat"
};

// 转盘上要展示的奖品数据
const prizeList = ref([
  {
    id: "xiaomi",
    prizeName: "小米手机",
    prizeImg: "https://img14.360buyimg.com/imagetools/jfs/t1/104165/34/15186/96522/5e6f1435E46bc0cb0/d4e878a15bfd9362.png"
  },
  {
    id: "blue",
    prizeColor: "rgb(251, 219, 216)",
    prizeName: "蓝牙耳机",
    prizeImg: "https://img13.360buyimg.com/imagetools/jfs/t1/91864/11/15108/139003/5e6f146dE1c7b511d/1ddc5aa6e502060a.jpg"
  },
  {
    id: "apple",
    prizeName: "apple watch",
    prizeImg: "https://img11.360buyimg.com/imagetools/jfs/t1/105385/19/15140/111093/5e6f1506E48bd0dfb/829a98a8cdb4c27f.png"
  },
  {
    id: "fruit",
    prizeColor: "rgba(246, 142, 46, 0.5)",
    prizeName: "迪士尼苹果",
    prizeImg: "https://img11.360buyimg.com/imagetools/jfs/t1/108308/11/8890/237603/5e6f157eE489cccf1/26e0437cfd93b9c8.png"
  },
  {
    id: "fish",
    prizeName: "海鲜套餐",
    prizeImg: "https://img14.360buyimg.com/imagetools/jfs/t1/90507/38/15165/448364/5e6f15b4E5df0c718/4bd4c3d375eec312.png"
  },
  {
    id: "thanks",
    prizeName: "谢谢参与",
    prizeImg: "https://img11.360buyimg.com/imagetools/jfs/t1/96116/38/15085/5181/5e6f15d1E48e31d30/71353b61dff705d4.png"
  }
]);

// 中奖的奖品的index(此数据可根据后台返回的值重新赋值)
const prizeIndex = ref(-1);

function onTurnsStart() {
  const index = Math.floor(Math.random() * prizeList.value.length);
  prizeIndex.value = index;

  // #ifdef MP-WEIXIN
  // 同步计算与 nut-turntable 内部 rotate() 一致的旋转角度
  const n = prizeList.value.length;
  const rotateAngleValue
    = startRotateDegree.value
      + TURNS_NUMBER * 360
      + 360
      - (180 / n + (360 / n) * index)
      - (startRotateDegree.value % 360);
  startRotateDegree.value = rotateAngleValue;
  bgRotate.value = rotateAngleValue;
  bgTransition.value = `transform ${TURNS_TIME}s cubic-bezier(0.250, 0.460, 0.455, 0.995)`;
  // #endif

  turntableEl.value.rotateTurn();
}

function onTurnsEnd() {
  console.log("中奖了");
}
</script>
<style lang="scss">
.turntable-wrapper {
  position: relative;
  width: 300px;
  height: 300px;
  margin: 24rpx auto;
  border-radius: 50%;
  border: 4rpx solid #ff9800;
  box-sizing: content-box;
  overflow: hidden;
}
/* #ifdef MP-WEIXIN */
/* 小程序端 nut-turntable 内部 canvas 绘制失效，用独立背景层兜底，
   与组件内部 rotateTurn 同步旋转，保持视觉一致 */
.turntable-bg-mp {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  border-radius: 50%;
}
/* #endif */
.turntable-inner {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
}
</style>
