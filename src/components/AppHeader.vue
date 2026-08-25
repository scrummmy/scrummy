<script setup lang="ts">
import { computed } from "vue";
import { useRoute } from "vue-router";

const route = useRoute();
// The landing page's hero renders behind the header (transparent, absolutely positioned so
// it doesn't push the hero down); every other page gets a normal opaque bar in flow.
const isLanding = computed(() => route.name === "landing");
</script>

<template>
  <header
    class="z-40"
    :class="isLanding ? 'absolute inset-x-0 top-0 border-b border-white/15 bg-transparent' : 'relative border-b border-border'"
  >
    <div class="mx-auto flex max-w-6xl items-center gap-6 py-4">
      <router-link to="/" class="flex items-center gap-2 text-lg font-semibold text-ink">
        <img src="/logo.svg" alt="" width="28" height="28" class="h-7 w-7" aria-hidden="true" />
        Scrummy
      </router-link>
      <nav class="flex items-center gap-5 text-sm text-ink">
        <router-link to="/" class="transition-colors hover:text-accent">Home</router-link>
        <router-link to="/how-it-works" class="transition-colors hover:text-accent">How it works</router-link>
      </nav>
    </div>
  </header>
</template>
