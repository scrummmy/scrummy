<script setup lang="ts">
import { THEME_IDS, THEMES, type ThemeId } from "@/lib/themes";

defineProps<{ current: ThemeId }>();

const emit = defineEmits<{
  select: [theme: ThemeId];
}>();
</script>

<template>
  <div class="grid grid-cols-3 gap-2.5">
    <label
      v-for="id in THEME_IDS"
      :key="id"
      class="group relative aspect-[4/3] cursor-pointer overflow-hidden rounded-xl border transition-all duration-200"
      :class="current === id ? 'border-accent ring-2 ring-accent' : 'border-white/10 hover:border-white/25'"
    >
      <input
        type="radio"
        name="theme"
        :value="id"
        :checked="current === id"
        class="sr-only"
        @change="emit('select', id)"
      />
      <img
        :src="THEMES[id].photo"
        alt=""
        :width="THEMES[id].photoSize[0]"
        :height="THEMES[id].photoSize[1]"
        class="absolute inset-0 h-full w-full object-cover object-top transition-transform duration-500 group-hover:scale-105"
      />
      <div
        class="absolute inset-0 bg-accent mix-blend-color transition-opacity duration-300"
        :class="current === id ? 'opacity-[0.78]' : 'opacity-[0.3] group-hover:opacity-[0.5]'"
      />
      <div class="absolute inset-0 bg-gradient-to-t from-black/90 via-black/15 to-transparent" />
      <span
        v-if="current === id"
        class="absolute right-1.5 top-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-accent text-[10px] text-white"
        aria-hidden="true"
        >✓</span
      >
      <span class="absolute inset-x-0 bottom-0 p-2 text-center text-[11px] font-semibold text-white">{{
        THEMES[id].label
      }}</span>
    </label>
  </div>
</template>
