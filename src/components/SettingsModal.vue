<script setup lang="ts">
import { ArrowPathIcon } from "@heroicons/vue/24/solid";
import { ref } from "vue";

import ThemeSwatches from "@/components/ThemeSwatches.vue";
import { randomNickname, type ThemeId } from "@/lib/themes";

const props = defineProps<{
  nickname: string;
  isObserver: boolean;
  current: ThemeId;
  soundMuted: boolean;
  isPrivate: boolean;
  allowKick: boolean;
}>();

const emit = defineEmits<{
  "toggle-mute": [];
  apply: [
    payload: {
      nickname: string;
      isObserver: boolean;
      theme: ThemeId;
      privacy: { private: boolean; password: string | null } | null;
      allowKick: boolean;
    },
  ];
  close: [];
}>();

// Sound is applied instantly on toggle; everything else here is broadcast to (and visible
// for) the rest of the room, so it stays staged behind a single Save.
const nicknameDraft = ref(props.nickname);
const nicknameError = ref("");
const observerEnabled = ref(props.isObserver);
const selectedTheme = ref<ThemeId>(props.current);
const privateEnabled = ref(props.isPrivate);
const password = ref("");
const passwordError = ref("");
const allowKickEnabled = ref(props.allowKick);

function shuffleNickname(): void {
  nicknameDraft.value = randomNickname(selectedTheme.value);
}

function submit(): void {
  const trimmedNickname = nicknameDraft.value.trim();
  if (!trimmedNickname) {
    nicknameError.value = "Enter a nickname.";
    return;
  }

  const turningOn = privateEnabled.value && !props.isPrivate;
  const turningOff = !privateEnabled.value && props.isPrivate;
  const changingPassword = privateEnabled.value && props.isPrivate && password.value.trim() !== "";

  if (turningOn && !password.value.trim()) {
    passwordError.value = "Enter a password to make the room private.";
    return;
  }

  let privacy: { private: boolean; password: string | null } | null = null;
  if (turningOn || changingPassword) {
    privacy = { private: true, password: password.value.trim() };
  } else if (turningOff) {
    privacy = { private: false, password: null };
  }

  emit("apply", {
    nickname: trimmedNickname,
    isObserver: observerEnabled.value,
    theme: selectedTheme.value,
    privacy,
    allowKick: allowKickEnabled.value,
  });
  emit("close");
}
</script>

<template>
  <div class="fixed inset-0 z-40 bg-black/60" @click="emit('close')" />
  <div class="fixed inset-0 z-50 flex items-center justify-center px-4 py-10">
    <form
      class="w-full max-w-2xl rounded-2xl border border-border bg-surface p-6 shadow-2xl sm:p-8"
      @submit.prevent="submit"
    >
      <h2 class="text-lg font-semibold text-ink">Settings</h2>

      <div class="mt-5 grid grid-cols-1 gap-8 md:grid-cols-2">
        <section>
          <p class="text-sm font-semibold text-ink">User settings</p>

          <label class="mt-3 flex flex-col gap-1.5 text-sm text-ink-muted">
            Nickname
            <div class="relative">
              <input
                v-model="nicknameDraft"
                type="text"
                maxlength="32"
                class="w-full rounded-lg border border-border bg-surface-raised px-3.5 py-2 pr-10 text-sm text-ink placeholder:text-ink-muted focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent"
                @input="nicknameError = ''"
              />
              <button
                type="button"
                title="Shuffle nickname"
                class="absolute right-2 top-1/2 flex h-6 w-6 -translate-y-1/2 items-center justify-center rounded-md text-ink-muted transition-colors hover:text-ink"
                @click="shuffleNickname"
              >
                <ArrowPathIcon class="h-4 w-4" />
              </button>
            </div>
            <p v-if="nicknameError" class="text-xs text-red-400">{{ nicknameError }}</p>
          </label>

          <div class="mt-6 flex items-center justify-between gap-4">
            <div>
              <p class="text-sm font-medium text-ink">Observer</p>
              <p class="text-xs text-ink-muted">Sit out voting — your deck stays blurred.</p>
            </div>
            <button
              type="button"
              role="switch"
              :aria-checked="observerEnabled"
              title="Toggle observer mode"
              class="relative h-6 w-11 shrink-0 rounded-full transition-colors"
              :class="observerEnabled ? 'bg-accent' : 'bg-border-strong'"
              @click="observerEnabled = !observerEnabled"
            >
              <span
                class="absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform"
                :class="observerEnabled ? 'left-[1.375rem]' : 'left-0.5'"
              />
            </button>
          </div>

          <div class="mt-6 flex items-center justify-between gap-4">
            <div>
              <p class="text-sm font-medium text-ink">Sound effects</p>
              <p class="text-xs text-ink-muted">Play a sound on votes, joins, and reveals — just for you.</p>
            </div>
            <button
              type="button"
              role="switch"
              :aria-checked="!soundMuted"
              title="Toggle sound effects"
              class="relative h-6 w-11 shrink-0 rounded-full transition-colors"
              :class="soundMuted ? 'bg-border-strong' : 'bg-accent'"
              @click="emit('toggle-mute')"
            >
              <span
                class="absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform"
                :class="soundMuted ? 'left-0.5' : 'left-[1.375rem]'"
              />
            </button>
          </div>
        </section>

        <section class="border-t border-border pt-5 md:border-t-0 md:border-l md:pl-8 md:pt-0">
          <p class="text-sm font-semibold text-ink">Room settings</p>

          <div class="mt-6 flex items-center justify-between gap-4">
            <div>
              <p class="text-sm font-medium text-ink">Private room</p>
              <p class="text-xs text-ink-muted">Require a password to join.</p>
            </div>
            <button
              type="button"
              role="switch"
              :aria-checked="privateEnabled"
              title="Toggle private room"
              class="relative h-6 w-11 shrink-0 rounded-full transition-colors"
              :class="privateEnabled ? 'bg-accent' : 'bg-border-strong'"
              @click="
                privateEnabled = !privateEnabled;
                passwordError = '';
              "
            >
              <span
                class="absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform"
                :class="privateEnabled ? 'left-[1.375rem]' : 'left-0.5'"
              />
            </button>
          </div>

          <div v-if="privateEnabled" class="mt-3">
            <input
              v-model="password"
              type="password"
              maxlength="64"
              autocomplete="new-password"
              :placeholder="isPrivate ? 'New password (leave blank to keep current)' : 'Set a password'"
              class="w-full rounded-lg border border-border bg-surface-raised px-3.5 py-2 text-sm text-ink placeholder:text-ink-muted focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent"
              @input="passwordError = ''"
            />
            <p v-if="passwordError" class="mt-1.5 text-xs text-red-400">{{ passwordError }}</p>
          </div>

          <div class="mt-6 flex items-center justify-between gap-4">
            <div>
              <p class="text-sm font-medium text-ink">Allow kicking</p>
              <p class="text-xs text-ink-muted">Let anyone in the room remove another participant.</p>
            </div>
            <button
              type="button"
              role="switch"
              :aria-checked="allowKickEnabled"
              title="Toggle allow kicking"
              class="relative h-6 w-11 shrink-0 rounded-full transition-colors"
              :class="allowKickEnabled ? 'bg-accent' : 'bg-border-strong'"
              @click="allowKickEnabled = !allowKickEnabled"
            >
              <span
                class="absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform"
                :class="allowKickEnabled ? 'left-[1.375rem]' : 'left-0.5'"
              />
            </button>
          </div>

          <div class="mt-6">
            <p class="text-sm font-medium text-ink">Theme</p>
            <p class="mb-3 text-xs text-ink-muted">Everyone in the room will see the new theme.</p>
            <ThemeSwatches :current="selectedTheme" @select="(id) => (selectedTheme = id)" />
          </div>
        </section>
      </div>

      <div class="mt-8 flex justify-end gap-3 border-t border-border pt-6">
        <button
          type="button"
          class="rounded-lg border border-border bg-surface px-5 py-2.5 text-sm font-medium text-ink-muted transition-colors hover:border-border-strong hover:text-ink"
          @click="emit('close')"
        >
          Cancel
        </button>
        <button
          type="submit"
          class="rounded-lg bg-accent px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-accent-emphasis"
        >
          Save settings
        </button>
      </div>
    </form>
  </div>
</template>
