<script setup lang="ts">
import { useConsentStore } from "@/stores/consent";

const consentStore = useConsentStore();
</script>

<template>
  <Transition appear name="consent-banner">
    <div
      v-if="consentStore.showBanner"
      class="fixed inset-x-0 bottom-0 z-50 border-t border-border bg-surface px-6 py-4 shadow-2xl"
    >
      <div class="mx-auto flex max-w-6xl flex-col items-center gap-3 sm:flex-row sm:justify-between">
        <p class="text-sm text-ink-muted">
          We'd like to use analytics to understand how Scrummy is used. It only runs if you say
          yes — see our
          <router-link to="/privacy" class="text-accent hover:text-accent-emphasis">Privacy Policy</router-link>
          for details.
        </p>
        <div class="flex shrink-0 gap-3">
          <button
            type="button"
            class="rounded-lg border border-border bg-surface px-4 py-2 text-sm font-medium text-ink-muted transition-colors hover:border-border-strong hover:text-ink"
            @click="consentStore.setAnalyticsConsent('denied')"
          >
            Decline
          </button>
          <button
            type="button"
            class="rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-accent-emphasis"
            @click="consentStore.setAnalyticsConsent('granted')"
          >
            Accept
          </button>
        </div>
      </div>
    </div>
  </Transition>
</template>

<style scoped>
/* Fade up on appear, fade down on dismiss/accept. */
.consent-banner-enter-active {
  transition: opacity 0.4s ease, transform 0.4s cubic-bezier(0.16, 1, 0.3, 1);
}
.consent-banner-leave-active {
  transition: opacity 0.25s ease, transform 0.25s ease;
}
.consent-banner-enter-from {
  opacity: 0;
  transform: translateY(24px);
}
.consent-banner-leave-to {
  opacity: 0;
  transform: translateY(16px);
}
</style>
