<template>
  <footer class="border-t border-border">
    <div
      class="mx-auto flex max-w-6xl flex-col gap-2 px-6 py-6 text-sm text-ink-muted sm:flex-row sm:items-center sm:justify-between"
    >
      <span> © {{ new Date().getFullYear() }} Scrummy. All rights reserved. </span>
      <div class="flex gap-4">
        <router-link to="/privacy" class="hover:text-ink">Privacy</router-link>
        <router-link to="/terms" class="hover:text-ink">Terms</router-link>
        <a href="https://github.com/scrummmy/scrummy" target="_blank" rel="noopener noreferrer" class="hover:text-ink"
          >GitHub</a
        >
        <a href="https://buymeacoffee.com/omegion" target="_blank" rel="noopener noreferrer" class="hover:text-ink"
          >☕ Buy me a coffee</a
        >
      </div>
    </div>
  </footer>
</template>
