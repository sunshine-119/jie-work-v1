<template>
  <view v-if="visible" class="love-particles" :style="containerStyle">
    <view
      v-for="(p, i) in particles"
      :key="i"
      class="lp-particle"
      :style="p.style"
    >
      {{ p.text }}
    </view>
  </view>
</template>

<script setup>
import { ref, computed } from 'vue';

const props = defineProps({
  x: { type: Number, default: 0 },
  y: { type: Number, default: 0 },
  mode: { type: String, default: 'heart' } // heart | star | mix
});

const visible = ref(false);
const particles = ref([]);

const containerStyle = computed(() => ({
  left: props.x + 'px',
  top: props.y + 'px'
}));

const TEXTS = {
  heart: ['❤️', '💖', '💕', '💗', '♥️'],
  star: ['⭐', '✨', '🌟', '💫'],
  mix: ['❤️', '💖', '✨', '💕', '🌟', '💗', '🎀']
};

function burst() {
  const texts = TEXTS[props.mode] || TEXTS.heart;
  const list = [];
  for (let i = 0; i < 12; i++) {
    const angle = (Math.PI * 2 * i) / 12;
    const dist = 60 + Math.random() * 60;
    const tx = Math.cos(angle) * dist;
    const ty = Math.sin(angle) * dist - 40;
    const rotate = Math.random() * 60 - 30;
    const scale = 0.6 + Math.random() * 0.8;
    const delay = Math.random() * 0.15;
    list.push({
      text: texts[Math.floor(Math.random() * texts.length)],
      style: {
        transform: `translate(-50%, -50%)`,
        '--tx': `${tx}px`,
        '--ty': `${ty}px`,
        '--rot': `${rotate}deg`,
        '--scale': scale,
        '--delay': `${delay}s`,
        fontSize: `${20 + Math.random() * 16}rpx`
      }
    });
  }
  particles.value = list;
  visible.value = true;
  setTimeout(() => {
    visible.value = false;
    particles.value = [];
  }, 1200);
}

defineExpose({ burst });
</script>

<style lang="scss" scoped>
.love-particles {
  position: fixed;
  z-index: 9999;
  pointer-events: none;
  width: 0;
  height: 0;
}
.lp-particle {
  position: absolute;
  left: 0;
  top: 0;
  opacity: 0;
  animation: particleFly 1s ease-out forwards;
  animation-delay: var(--delay);
}
@keyframes particleFly {
  0% {
    opacity: 1;
    transform: translate(-50%, -50%) scale(0.4) rotate(0deg);
  }
  60% {
    opacity: 1;
    transform: translate(calc(-50% + var(--tx)), calc(-50% + var(--ty))) scale(var(--scale)) rotate(var(--rot));
  }
  100% {
    opacity: 0;
    transform: translate(calc(-50% + var(--tx)), calc(-50% + var(--ty) - 30px)) scale(0.5) rotate(var(--rot));
  }
}
</style>
