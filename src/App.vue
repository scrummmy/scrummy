<script setup lang="ts">
import AppFooter from "@/components/AppFooter.vue";
import AppHeader from "@/components/AppHeader.vue";
import CookieConsentBanner from "@/components/CookieConsentBanner.vue";
import ToastStack from "@/components/ToastStack.vue";
import { useConsentStore } from "@/stores/consent";

useConsentStore().checkRegion();
</script>

<template>
  <div class="flex min-h-screen flex-col bg-bg">
    <AppHeader />

    <main class="flex flex-1 flex-col">
      <router-view class="flex flex-1 flex-col" />
    </main>

    <AppFooter />
    <ToastStack />
    <CookieConsentBanner />
  </div>
</template>
