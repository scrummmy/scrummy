<script setup lang="ts">
import { ChevronRightIcon, ChevronUpDownIcon, QuestionMarkCircleIcon } from "@heroicons/vue/24/solid";
import { computed, ref, watch } from "vue";

import { REACTION_EMOJIS } from "@/lib/emojis";
import { THEMES, type ThemeId } from "@/lib/themes";
import { CUSTOM_CARD_VALUE, type Card, type CardType, type Vote } from "@shared/types";

const props = defineProps<{
  deck: Card[];
  selected: Vote | null;
  cardType: CardType;
  theme: ThemeId;
  /** Observers see a blurred, inert deck — they've opted out of voting. */
  disabled?: boolean;
}>();

const emit = defineEmits<{
  vote: [name: string, value: number];
  "change-card-type": [cardType: CardType];
  "stop-observing": [];
}>();

const CARD_TYPES: { value: CardType; label: string }[] = [
  { value: "Fibonacci", label: "Fibonacci" },
  { value: "TshirtSize", label: "T-Shirt" },
  { value: "Binary", label: "Yes/No" },
];

const pickerOpen = ref(false);
// Pass/Question/reactions start tucked behind an arrow so a full deck (esp. Fibonacci's 9
// cards) doesn't crowd the row. Revealing them (by clicking the arrow, or automatically if
// one of them is already the current pick — e.g. from before a round reset) is one-way for
// the rest of this page load; there's no collapsing back once shown.
const extrasOpen = ref(false);
const showExtras = computed(
  () => extrasOpen.value || isPassSelected() || isQuestionSelected() || isCustomSelected(),
);

// Not part of any deck's card list — a standing option for "I don't have enough
// info to size this yet" that's always excluded from the average, like a reaction.
const PASS_NAME = "Pass";
// Same idea as Pass, but for "I have a question about this story" rather than "I can't
// estimate it yet" — also always excluded from the average.
const QUESTION_NAME = "Question";

// Becoming an observer mid-pick would otherwise leave an inert-but-open picker behind.
// extrasOpen itself is never reset once true — see the toggle button in the template.
watch(
  () => props.disabled,
  (disabled) => {
    if (disabled) pickerOpen.value = false;
  },
);

function isSelected(card: Card): boolean {
  return props.selected?.name === card.name;
}

function isPassSelected(): boolean {
  return props.selected?.name === PASS_NAME;
}

function isQuestionSelected(): boolean {
  return props.selected?.name === QUESTION_NAME;
}

function isCustomSelected(): boolean {
  return (
    props.selected !== null &&
    props.selected.name !== PASS_NAME &&
    props.selected.name !== QUESTION_NAME &&
    !props.deck.some((c) => c.name === props.selected!.name)
  );
}

function pick(card: Card): void {
  emit("vote", card.name, card.value);
}

function pickPass(): void {
  emit("vote", PASS_NAME, CUSTOM_CARD_VALUE);
}

function pickQuestion(): void {
  emit("vote", QUESTION_NAME, CUSTOM_CARD_VALUE);
}

function pickEmoji(emoji: string): void {
  emit("vote", emoji, CUSTOM_CARD_VALUE);
  pickerOpen.value = false;
}
</script>

<template>
  <div class="relative isolate rounded-2xl border border-accent/40 bg-surface p-6">
    <div class="pointer-events-none absolute inset-0 -z-10 overflow-hidden rounded-2xl" aria-hidden="true">
      <template v-if="THEMES[theme].deckArt">
        <img
          :src="THEMES[theme].deckArt"
          alt=""
          :width="THEMES[theme].deckArtSize?.[0]"
          :height="THEMES[theme].deckArtSize?.[1]"
          class="absolute inset-y-0 right-0 h-full w-full object-contain object-right select-none"
          :class="THEMES[theme].deckArtBlend ? 'opacity-100' : 'opacity-80'"
          :style="
            THEMES[theme].deckArtBlend
              ? { mixBlendMode: THEMES[theme].deckArtBlend, filter: 'brightness(0.5) contrast(1.05)' }
              : undefined
          "
        />
        <div class="absolute inset-0 bg-gradient-to-r from-surface via-surface/70 to-transparent" />
      </template>
      <span v-else class="absolute -right-3 -top-3 text-8xl opacity-[0.06] select-none">{{
        THEMES[theme].icons[2]
      }}</span>
    </div>

    <div class="relative mb-5 flex items-center justify-between">
      <h2 class="flex items-center gap-2 text-base font-medium text-ink">
        Choose your card
        <span v-if="disabled" class="rounded-md bg-border px-2 py-0.5 text-xs font-medium text-ink-muted"
          >Observing</span
        >
      </h2>
      <div class="relative">
        <select
          :value="cardType"
          class="appearance-none rounded-lg border border-border bg-surface-raised py-1.5 pl-3 pr-8 text-sm text-ink transition-all duration-200 focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent"
          @change="emit('change-card-type', ($event.target as HTMLSelectElement).value as CardType)"
        >
          <option v-for="option in CARD_TYPES" :key="option.value" :value="option.value">
            {{ option.label }}
          </option>
        </select>
        <ChevronUpDownIcon
          class="pointer-events-none absolute right-2 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-muted"
        />
      </div>
    </div>

    <div class="relative">
      <div
        class="flex flex-wrap gap-3 transition-all duration-200"
        :class="disabled ? 'pointer-events-none select-none opacity-50 blur-sm' : ''"
      >
        <button
          v-for="card in deck"
          :key="card.name"
          type="button"
          class="flex h-20 w-14 items-center justify-center rounded-lg border text-lg font-semibold transition-transform hover:-translate-y-1"
          :class="
            isSelected(card)
              ? 'border-accent bg-accent text-white'
              : 'border-border bg-surface-raised text-ink hover:border-border-strong'
          "
          @click="pick(card)"
        >
          {{ card.name }}
        </button>

        <button
          v-if="!showExtras"
          type="button"
          title="Show Pass, Question, and reactions"
          class="flex h-7 w-7 shrink-0 self-center items-center justify-center rounded-full border border-border-strong bg-surface-raised text-ink-muted transition-all duration-200 hover:scale-110 hover:text-ink"
          @click="extrasOpen = true"
        >
          <ChevronRightIcon class="h-4 w-4" />
        </button>

        <TransitionGroup name="deck-extra">
          <button
            v-if="showExtras"
            key="pass"
            type="button"
            title="Pass — not enough info to size this yet"
            class="deck-extra-item-1 flex h-20 w-14 items-center justify-center rounded-lg border border-dashed text-sm font-semibold transition-transform hover:-translate-y-1"
            :class="
              isPassSelected()
                ? 'border-accent bg-accent text-white'
                : 'border-border-strong bg-surface-raised text-ink-muted hover:text-ink'
            "
            @click="pickPass"
          >
            Pass
          </button>

          <button
            v-if="showExtras"
            key="question"
            type="button"
            title="Question — ask something about this story before sizing it"
            class="deck-extra-item-2 flex h-20 w-14 items-center justify-center rounded-lg border border-dashed transition-transform hover:-translate-y-1"
            :class="
              isQuestionSelected()
                ? 'border-accent bg-accent text-white'
                : 'border-border-strong bg-surface-raised text-ink-muted hover:text-ink'
            "
            @click="pickQuestion"
          >
            <QuestionMarkCircleIcon class="h-6 w-6" />
          </button>

          <div v-if="showExtras" key="reaction" class="deck-extra-item-3 relative">
            <button
              type="button"
              title="Pick a reaction"
              class="flex h-20 w-14 items-center justify-center rounded-lg border border-dashed text-lg transition-transform hover:-translate-y-1"
              :class="isCustomSelected() ? 'border-accent bg-surface-raised' : 'border-border-strong bg-surface-raised'"
              @click="pickerOpen = !pickerOpen"
            >
              {{ isCustomSelected() ? selected!.name : "😀" }}
            </button>

            <div v-if="pickerOpen" class="fixed inset-0 z-40" @click="pickerOpen = false" />

            <div
              v-if="pickerOpen"
              class="absolute bottom-full right-0 z-50 mb-2 grid w-64 grid-cols-5 gap-2 rounded-xl border border-border bg-surface-raised p-3 shadow-xl"
            >
              <button
                v-for="emoji in REACTION_EMOJIS"
                :key="emoji"
                type="button"
                class="flex h-10 w-10 items-center justify-center rounded-lg text-xl transition-colors hover:bg-border"
                :class="selected?.name === emoji ? 'bg-accent/30' : ''"
                @click="pickEmoji(emoji)"
              >
                {{ emoji }}
              </button>
            </div>
          </div>
        </TransitionGroup>
      </div>

      <div v-if="disabled" class="absolute inset-0 flex items-center justify-center">
        <button
          type="button"
          class="rounded-lg border border-border bg-surface px-3 py-1.5 text-sm font-medium text-ink-muted shadow transition-colors hover:border-border-strong hover:text-ink"
          @click="emit('stop-observing')"
        >
          Join voting
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.deck-extra-enter-active {
  transition:
    transform 0.2s cubic-bezier(0.22, 1, 0.36, 1),
    opacity 0.15s ease;
}
.deck-extra-leave-active {
  transition:
    transform 0.15s cubic-bezier(0.4, 0, 1, 1),
    opacity 0.12s ease;
  position: absolute;
}
.deck-extra-enter-from,
.deck-extra-leave-to {
  opacity: 0;
  transform: translateX(-1.5rem);
}
.deck-extra-move {
  transition: transform 0.18s cubic-bezier(0.22, 1, 0.36, 1);
}

/* Staggered so the three cards slide in one after another rather than in lockstep — and
   reversed on the way out, so the farthest one folds back first, like closing a fan. */
.deck-extra-item-2.deck-extra-enter-active {
  transition-delay: 40ms;
}
.deck-extra-item-3.deck-extra-enter-active {
  transition-delay: 80ms;
}
.deck-extra-item-1.deck-extra-leave-active {
  transition-delay: 80ms;
}
.deck-extra-item-2.deck-extra-leave-active {
  transition-delay: 40ms;
}

@media (prefers-reduced-motion: reduce) {
  .deck-extra-enter-active,
  .deck-extra-leave-active,
  .deck-extra-move,
  .deck-extra-item-1,
  .deck-extra-item-2,
  .deck-extra-item-3 {
    transition: none;
    transition-delay: 0s;
  }
}
</style>
