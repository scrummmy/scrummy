<script setup lang="ts">
import { useToastStore } from "@/stores/toast";

const toastStore = useToastStore();
</script>

<template>
  <div
    class="pointer-events-none fixed right-4 bottom-24 z-[100] flex w-80 max-w-[calc(100vw-2rem)] flex-col items-end gap-2"
  >
    <TransitionGroup name="toast">
      <div
        v-for="toast in toastStore.toasts"
        :key="toast.id"
        class="toast-item pointer-events-auto rounded-lg border border-border bg-surface-raised px-4 py-2.5 text-sm font-medium text-ink shadow-xl"
        role="status"
        @click="toastStore.dismiss(toast.id)"
      >
        {{ toast.message }}
      </div>
    </TransitionGroup>
  </div>
</template>

<style scoped>
.toast-enter-active,
.toast-leave-active {
  transition:
    transform 0.25s cubic-bezier(0.34, 1.56, 0.64, 1),
    opacity 0.2s ease;
}
.toast-leave-active {
  position: absolute;
}
.toast-enter-from,
.toast-leave-to {
  opacity: 0;
  transform: translateX(20px) scale(0.9);
}
.toast-move {
  transition: transform 0.2s ease;
}

@media (prefers-reduced-motion: reduce) {
  .toast-enter-active,
  .toast-leave-active,
  .toast-move {
    transition: none;
  }
}
</style>
