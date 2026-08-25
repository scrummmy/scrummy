<script setup lang="ts">
withDefaults(defineProps<{ size?: "default" | "small" }>(), { size: "default" });
</script>

<template>
  <section
    class="hero relative overflow-hidden px-6 pt-32 sm:pt-40"
    :class="size === 'small' ? 'hero-small pb-16 sm:pb-20' : 'pb-20 sm:pb-28'"
  >
    <div class="hero-aurora" aria-hidden="true" />
    <div class="relative z-10">
      <slot />
    </div>
  </section>
</template>

<style scoped>
.hero { background: #0a0d14; isolation: isolate; }
.hero::after { content: ""; position: absolute; inset: 0; z-index: 1; pointer-events: none; background: linear-gradient(180deg, transparent 0%, transparent 66%, #0a0d14 100%); }
.hero-aurora { position: absolute; z-index: 0; top: -24rem; right: -16rem; width: 76rem; height: 76rem; border-radius: 36% 64% 58% 42%; transform: rotate(-18deg) skewY(-8deg); opacity: .9; animation: aurora-drift 24s ease-in-out infinite; transform-origin: 60% 40%; }
.hero-aurora::before, .hero-aurora::after { content: ""; position: absolute; border-radius: inherit; background: conic-gradient(from 210deg, #ff7a18, #ff3d81 28%, #a855f7 52%, #2563eb 72%, #ff7a18); }
.hero-aurora::before { inset: 0; filter: blur(16px) saturate(1.15); animation: aurora-hue-edge 16s ease-in-out infinite; }
.hero-aurora::after { inset: 18%; border-radius: 50%; filter: blur(70px) saturate(1.3); animation: aurora-hue-core 16s ease-in-out infinite; }
@keyframes aurora-drift {
  0%   { transform: rotate(-18deg) skewY(-8deg) translate(0, 0) scale(1); border-radius: 36% 64% 58% 42%; }
  25%  { transform: rotate(-6deg) skewY(-3deg) translate(-3%, 2%) scale(1.07); border-radius: 58% 42% 30% 70%; }
  50%  { transform: rotate(6deg) skewY(3deg) translate(2%, -3%) scale(0.96); border-radius: 40% 60% 64% 36%; }
  75%  { transform: rotate(-10deg) skewY(-6deg) translate(-1%, -2%) scale(1.04); border-radius: 62% 38% 40% 60%; }
  100% { transform: rotate(-18deg) skewY(-8deg) translate(0, 0) scale(1); border-radius: 36% 64% 58% 42%; }
}
@keyframes aurora-hue-edge {
  0%, 100% { filter: blur(4px) saturate(1.15) hue-rotate(0deg); }
  50% { filter: blur(4px) saturate(1.3) hue-rotate(30deg); }
}
@keyframes aurora-hue-core {
  0%, 100% { filter: blur(70px) saturate(1.15) hue-rotate(0deg); }
  50% { filter: blur(70px) saturate(1.3) hue-rotate(30deg); }
}
@media (max-width: 1023px) { .hero-aurora { top: -38rem; right: -32rem; opacity: .7; } }

/* Small variant: identical shape and motion, just a smaller, gentler footprint for a
   page whose hero doesn't need to fill as much space as the main landing hero. */
.hero-small .hero-aurora { top: -15rem; right: -10rem; width: 46rem; height: 46rem; opacity: .75; }
@media (max-width: 1023px) { .hero-small .hero-aurora { top: -22rem; right: -20rem; } }

@media (prefers-reduced-motion: reduce) {
  .hero-aurora, .hero-aurora::before, .hero-aurora::after { animation: none; }
}
</style>
