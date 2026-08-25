<script setup lang="ts">
import { useId } from "vue";

withDefaults(
  defineProps<{
    text: string;
    /** Which side of the trigger the tooltip opens on. */
    placement?: "top" | "bottom";
  }>(),
  { placement: "top" },
);

const tooltipId = useId();
</script>

<template>
  <span class="group/tip relative inline-flex">
    <button type="button" :aria-describedby="tooltipId" class="inline-flex cursor-help items-center">
      <slot />
    </button>
    <span
      :id="tooltipId"
      role="tooltip"
      class="pointer-events-none absolute left-1/2 z-50 w-max max-w-56 -translate-x-1/2 scale-95 rounded-lg border border-border bg-surface-raised px-2.5 py-1.5 text-center text-xs font-normal leading-snug text-ink opacity-0 shadow-xl transition-all duration-150 group-hover/tip:scale-100 group-hover/tip:opacity-100 group-focus-within/tip:scale-100 group-focus-within/tip:opacity-100"
      :class="placement === 'bottom' ? 'top-full mt-2' : 'bottom-full mb-2'"
    >
      {{ text }}
      <span
        aria-hidden="true"
        class="absolute left-1/2 h-2 w-2 -translate-x-1/2 rotate-45 bg-surface-raised"
        :class="placement === 'bottom' ? '-top-1 border-l border-t border-border' : '-bottom-1 border-b border-r border-border'"
      />
    </span>
  </span>
</template>
