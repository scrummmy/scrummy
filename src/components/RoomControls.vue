<script setup lang="ts">
import { computed } from "vue";

const props = defineProps<{
  revealed: boolean;
  hasVotes: boolean;
}>();

const emit = defineEmits<{
  "toggle-reveal": [];
  reset: [];
}>();

// Nothing revealed and nothing voted means there's genuinely nothing to clear.
const canReset = computed(() => props.revealed || props.hasVotes);
</script>

<template>
  <div class="flex items-center gap-2">
    <button
      type="button"
      :disabled="!canReset"
      class="rounded-lg border border-border bg-surface px-4 py-2 text-sm font-medium text-ink-muted transition-colors hover:border-border-strong hover:text-ink disabled:pointer-events-none disabled:opacity-40"
      @click="emit('reset')"
    >
      Reset
    </button>
    <button
      type="button"
      class="rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-accent-emphasis"
      @click="emit('toggle-reveal')"
    >
      {{ revealed ? "Hide cards" : "Reveal cards" }}
    </button>
  </div>
</template>
