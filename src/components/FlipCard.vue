<script setup lang="ts">
defineProps<{
  /** true shows the #front slot; false shows #back. */
  flipped: boolean;
}>();
</script>

<template>
  <div class="flip-card-perspective relative">
    <div class="flip-card-inner relative h-full w-full" :class="{ 'is-flipped': flipped }">
      <div class="flip-card-face flip-card-back absolute inset-0">
        <slot name="back" />
      </div>
      <div class="flip-card-face flip-card-front absolute inset-0">
        <slot name="front" />
      </div>
    </div>
  </div>
</template>

<style scoped>
/* Two faces stacked on the same spot, rotated 180deg apart, spinning together as one rigid
   card around a vertical axis (rotateY) — a real flip, not a crossfade standing in for one. */
.flip-card-perspective {
  perspective: 900px;
}
.flip-card-inner {
  transform-style: preserve-3d;
  transition: transform 0.5s cubic-bezier(0.4, 0.15, 0.2, 1);
  transform: rotateY(0deg);
}
.flip-card-inner.is-flipped {
  transform: rotateY(180deg);
}
.flip-card-face {
  backface-visibility: hidden;
  -webkit-backface-visibility: hidden;
}
.flip-card-front {
  transform: rotateY(180deg);
}

@media (prefers-reduced-motion: reduce) {
  .flip-card-inner {
    transition: none;
  }
}
</style>
