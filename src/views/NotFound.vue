<script setup lang="ts">
import { computed } from "vue";

import { THEMES } from "@/lib/themes";
import { useUserStore } from "@/stores/user";

const userStore = useUserStore();

// Themed to whatever this browser last picked, so the icon feels like part of the app
// rather than a generic error graphic — falls back to the store's own default otherwise.
const icons = computed(() => THEMES[userStore.lastTheme].icons);
const icon = computed(() => icons.value[Math.floor(Math.random() * icons.value.length)]);
</script>

<template>
  <div class="relative w-full overflow-hidden">
    <div class="not-found-glow" aria-hidden="true" />

    <div
      class="relative mx-auto flex min-h-[70vh] max-w-2xl flex-col items-center justify-center px-6 py-16 text-center"
    >
      <span class="not-found-icon text-7xl" aria-hidden="true">{{ icon }}</span>

      <h1 class="story-point-gradient mt-6 text-7xl font-bold tracking-tight sm:text-8xl">404</h1>
      <p class="mt-4 text-lg text-ink">This page wandered off somewhere.</p>
      <p class="mt-2 max-w-md text-sm leading-relaxed text-ink-muted">
        There's nothing at this link — it might be mistyped, or the room it pointed to is gone.
        Let's get you back.
      </p>

      <router-link
        to="/"
        class="mt-8 inline-flex items-center gap-2 rounded-lg bg-accent px-5 py-3 text-sm font-semibold text-white transition-all hover:-translate-y-0.5 hover:bg-accent-emphasis"
      >
        Take me home <span aria-hidden="true">→</span>
      </router-link>
    </div>
  </div>
</template>

<style scoped>
.not-found-glow {
  position: absolute;
  inset: -20% -10%;
  background: radial-gradient(circle at center, var(--color-accent) 0%, transparent 60%);
  filter: blur(70px);
  opacity: 0.22;
  pointer-events: none;
  animation: not-found-pulse 4s ease-in-out infinite;
}
.not-found-icon {
  display: inline-block;
  animation: not-found-float 3s ease-in-out infinite;
}
@keyframes not-found-float {
  0%,
  100% {
    transform: translateY(0) rotate(-4deg);
  }
  50% {
    transform: translateY(-10px) rotate(4deg);
  }
}
@keyframes not-found-pulse {
  0%,
  100% {
    opacity: 0.18;
    transform: scale(1);
  }
  50% {
    opacity: 0.32;
    transform: scale(1.1);
  }
}

@media (prefers-reduced-motion: reduce) {
  .not-found-glow,
  .not-found-icon {
    animation: none;
  }
}
</style>
