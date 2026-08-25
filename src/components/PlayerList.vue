<script setup lang="ts">
import { EyeIcon, HandRaisedIcon, QuestionMarkCircleIcon, UserMinusIcon } from "@heroicons/vue/24/solid";
import { computed, reactive, ref, watch } from "vue";

import FlipCard from "@/components/FlipCard.vue";
import Tooltip from "@/components/Tooltip.vue";
import { THEMES, type ThemeId } from "@/lib/themes";
import type { User, Vote } from "@shared/types";

const props = defineProps<{
  users: User[];
  revealed: boolean;
  theme: ThemeId;
  selfId: string;
  /** Vote names (e.g. "0.5", "13") that are far enough from the group's median to flag. */
  outlierNames?: Set<string>;
  allowKick: boolean;
}>();

const emit = defineEmits<{
  kick: [userId: string];
  nudge: [userId: string];
}>();

// Right-clicking someone else's card opens a small menu (nudge / kick) instead of the
// browser's native context menu — there's no room-owner concept anywhere in this app, so
// both are available to anyone against anyone but themselves, same flat model as
// reveal/reset/theme changes.
const cardMenuUserId = ref<string | null>(null);

function onCardContextMenu(user: User, event: MouseEvent): void {
  if (user.id === props.selfId) return;
  event.preventDefault();
  cardMenuUserId.value = cardMenuUserId.value === user.id ? null : user.id;
}

function confirmKick(userId: string): void {
  emit("kick", userId);
  cardMenuUserId.value = null;
}

function confirmNudge(userId: string): void {
  emit("nudge", userId);
  cardMenuUserId.value = null;
}

// A light parallax tilt on hover — the card leans toward the cursor like it's a physical
// object catching the light, capped low enough to stay subtle at a glance.
const MAX_TILT_DEG = 12;
const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
const cardTilt = reactive(new Map<string, { rotateX: number; rotateY: number }>());

function onCardMouseMove(user: User, event: MouseEvent): void {
  // Only cards that actually open the right-click menu (i.e. not your own) tilt — the
  // effect is a hint that there's something to interact with, so it stays off where
  // there isn't one.
  if (prefersReducedMotion || user.id === props.selfId) return;
  const card = event.currentTarget as HTMLElement;
  const rect = card.getBoundingClientRect();
  const px = (event.clientX - rect.left) / rect.width;
  const py = (event.clientY - rect.top) / rect.height;
  cardTilt.set(user.id, {
    rotateX: (0.5 - py) * MAX_TILT_DEG * 2,
    rotateY: (px - 0.5) * MAX_TILT_DEG * 2,
  });
}

function onCardMouseLeave(user: User): void {
  cardTilt.delete(user.id);
}

function tiltStyle(user: User): { transform: string } | undefined {
  const tilt = cardTilt.get(user.id);
  if (!tilt) return undefined;
  return {
    transform: `perspective(800px) rotateX(${tilt.rotateX}deg) rotateY(${tilt.rotateY}deg) scale3d(1.05, 1.05, 1.05)`,
  };
}

// The card-back <img> only enters the DOM once someone votes, so without this its first
// fetch+decode happens right then — landing ~100ms after the (synchronous, CSS) pink
// background already painted. Preloading as soon as the theme is known hides that gap.
watch(
  () => props.theme,
  (theme) => {
    new Image().src = THEMES[theme].cardBack;
  },
  { immediate: true },
);

// Observers sit in their own group, right of a divider, so the voting roster reads
// cleanly at a glance without observers mixed into the count of who's still deciding.
const players = computed(() => props.users.filter((user) => !user.isObserver));
const observers = computed(() => props.users.filter((user) => user.isObserver));

// Names get more breathing room in a small room ("Dumbledore" fits instead of "Dumbl…"),
// but pull back in as the room fills up so a crowd of cards doesn't wrap into a wall of text.
const nameMaxWidthClass = computed(() => {
  const count = props.users.length;
  if (count <= 4) return "max-w-32";
  if (count <= 8) return "max-w-24";
  return "max-w-20";
});

function isOutlier(user: User): boolean {
  return props.revealed && user.vote !== null && (props.outlierNames?.has(user.vote.name) ?? false);
}

// Keep in sync with FlipCard's .flip-card-inner transition-duration.
const FLIP_DURATION_MS = 500;

// A reset clears every vote at the exact same instant it un-reveals, but the flip takes
// half a second to actually rotate away. The FRONT face (only — the back face just shows
// the live vote, correctly blank for a fresh round) renders off this delayed value instead
// of the live vote, so it keeps showing the old number/cross for the whole flip instead of
// instantly swapping to "no vote" while still visible. Plain un-voting (no reveal involved)
// still clears instantly, since there's no flip motion to protect there.
const displayVote = reactive(new Map<string, Vote | null>());

watch(
  () => ({ revealed: props.revealed, users: props.users.map((u) => ({ id: u.id, vote: u.vote })) }),
  (next, prev) => {
    const justHid = prev !== undefined && prev.revealed && !next.revealed;
    for (const { id, vote } of next.users) {
      if (vote !== null) {
        displayVote.set(id, vote);
      } else if (justHid && displayVote.get(id) != null) {
        setTimeout(() => displayVote.set(id, null), FLIP_DURATION_MS);
      } else {
        displayVote.set(id, null);
      }
    }
  },
  { immediate: true, deep: true },
);

function getDisplayVote(user: User): Vote | null {
  return displayVote.get(user.id) ?? null;
}

// Matches CardDeck's Question card — shown as the same icon here rather than its raw name.
const QUESTION_NAME = "Question";

const cardBackPattern = {
  backgroundColor: "var(--color-accent)",
  backgroundImage:
    "repeating-linear-gradient(45deg, rgba(255,255,255,0.16) 0 4px, transparent 4px 12px), repeating-linear-gradient(-45deg, rgba(255,255,255,0.16) 0 4px, transparent 4px 12px)",
};
</script>

<template>
  <div class="relative flex flex-wrap items-start gap-6">
    <TransitionGroup name="player-card" appear>
      <div
        v-for="user in players"
        :key="user.id"
        class="relative flex flex-col items-center gap-2"
        @contextmenu="onCardContextMenu(user, $event)"
      >
        <FlipCard
          :flipped="revealed"
          class="card-tilt h-[115px] w-[77px]"
          :style="tiltStyle(user)"
          @mousemove="onCardMouseMove(user, $event)"
          @mouseleave="onCardMouseLeave(user)"
        >
          <template #back>
            <div
              class="flex h-full w-full items-center justify-center overflow-hidden rounded-lg border border-border bg-surface text-lg font-semibold"
              :class="user.vote !== null ? 'text-ink' : 'text-ink-muted'"
              :style="user.vote !== null ? { borderColor: 'var(--theme-glow)', ...cardBackPattern } : undefined"
            >
              <img
                v-if="user.vote !== null"
                :src="THEMES[theme].cardBack"
                alt=""
                width="67"
                height="67"
                class="h-[67px] w-[67px] object-contain drop-shadow"
              />
            </div>
          </template>
          <template #front>
            <div
              class="flex h-full w-full items-center justify-center overflow-hidden rounded-lg border border-border bg-surface text-lg font-semibold"
              :class="getDisplayVote(user) !== null ? 'text-ink' : 'text-ink-muted'"
            >
              <QuestionMarkCircleIcon v-if="getDisplayVote(user)?.name === QUESTION_NAME" class="h-8 w-8" />
              <span v-else-if="getDisplayVote(user)">{{ getDisplayVote(user)!.name }}</span>
              <svg
                v-else
                viewBox="0 0 77 115"
                preserveAspectRatio="none"
                class="pointer-events-none absolute inset-0 h-full w-full"
                aria-hidden="true"
              >
                <line x1="75" y1="4" x2="4" y2="113" stroke="var(--color-border-strong)" stroke-width="1" />
              </svg>
            </div>
          </template>
        </FlipCard>

        <Transition name="outlier-pop">
          <span v-if="isOutlier(user)" class="outlier-badge-wrap absolute -top-7 left-1/2 h-3.5 w-3.5">
            <Tooltip text="Far from the group's majority — might be worth a quick discussion">
              <span
                class="outlier-dot flex h-3.5 w-3.5 items-center justify-center rounded-full bg-red-500 text-[9px] font-bold text-white"
              >
                !
              </span>
            </Tooltip>
          </span>
        </Transition>

        <span
          class="truncate text-base font-medium transition-[max-width] duration-200"
          :class="[nameMaxWidthClass, user.id === selfId ? 'text-accent' : 'text-white']"
        >
          {{ user.name }}
        </span>

        <template v-if="cardMenuUserId === user.id">
          <div class="fixed inset-0 z-40" @click="cardMenuUserId = null" @contextmenu.prevent="cardMenuUserId = null" />
          <div
            class="absolute top-full z-50 mt-2 w-44 overflow-hidden rounded-xl border border-border bg-surface-raised shadow-xl"
          >
            <button
              type="button"
              class="flex w-full items-center gap-2 px-3.5 py-2.5 text-left text-sm font-medium text-ink-muted transition-colors hover:bg-border hover:text-ink"
              @click="confirmNudge(user.id)"
            >
              <HandRaisedIcon class="h-4 w-4" />
              Nudge
            </button>
            <button
              v-if="allowKick"
              type="button"
              class="flex w-full items-center gap-2 px-3.5 py-2.5 text-left text-sm font-medium text-red-400 transition-colors hover:bg-red-500/10"
              @click="confirmKick(user.id)"
            >
              <UserMinusIcon class="h-4 w-4" />
              Kick from room
            </button>
          </div>
        </template>
      </div>
    </TransitionGroup>

    <template v-if="observers.length > 0">
      <div class="h-[115px] w-px shrink-0 bg-border" aria-hidden="true" />

      <div class="flex flex-col gap-2">
        <TransitionGroup tag="div" name="player-card" appear class="flex flex-wrap gap-6">
          <div
            v-for="user in observers"
            :key="user.id"
            class="relative flex flex-col items-center gap-2"
            @contextmenu="onCardContextMenu(user, $event)"
          >
            <FlipCard
              :flipped="revealed"
              class="card-tilt h-[115px] w-[77px] opacity-50"
              :style="tiltStyle(user)"
              @mousemove="onCardMouseMove(user, $event)"
              @mouseleave="onCardMouseLeave(user)"
            >
              <template #back>
                <div
                  class="flex h-full w-full items-center justify-center overflow-hidden rounded-lg border border-border bg-surface text-lg font-semibold"
                  :class="user.vote !== null ? 'text-ink' : 'text-ink-muted'"
                  :style="user.vote !== null ? { borderColor: 'var(--theme-glow)', ...cardBackPattern } : undefined"
                >
                  <img
                    v-if="user.vote !== null"
                    :src="THEMES[theme].cardBack"
                    alt=""
                    width="67"
                    height="67"
                    class="h-[67px] w-[67px] object-contain drop-shadow"
                  />
                </div>
              </template>
              <template #front>
                <div
                  class="flex h-full w-full items-center justify-center overflow-hidden rounded-lg border border-border bg-surface text-lg font-semibold"
                  :class="getDisplayVote(user) !== null ? 'text-ink' : 'text-ink-muted'"
                >
                  <QuestionMarkCircleIcon v-if="getDisplayVote(user)?.name === QUESTION_NAME" class="h-8 w-8" />
                  <span v-else-if="getDisplayVote(user)">{{ getDisplayVote(user)!.name }}</span>
                  <EyeIcon v-else class="h-6 w-6 text-ink-muted" aria-hidden="true" />
                </div>
              </template>
            </FlipCard>

            <span
              class="truncate text-base font-medium transition-[max-width] duration-200"
              :class="[nameMaxWidthClass, user.id === selfId ? 'text-accent' : 'text-white']"
            >
              {{ user.name }}
            </span>

            <template v-if="cardMenuUserId === user.id">
              <div class="fixed inset-0 z-40" @click="cardMenuUserId = null" @contextmenu.prevent="cardMenuUserId = null" />
              <div
                class="absolute top-full z-50 mt-2 w-44 overflow-hidden rounded-xl border border-border bg-surface-raised shadow-xl"
              >
                <button
                  type="button"
                  class="flex w-full items-center gap-2 px-3.5 py-2.5 text-left text-sm font-medium text-ink-muted transition-colors hover:bg-border hover:text-ink"
                  @click="confirmNudge(user.id)"
                >
                  <HandRaisedIcon class="h-4 w-4" />
                  Nudge
                </button>
                <button
                  type="button"
                  class="flex w-full items-center gap-2 px-3.5 py-2.5 text-left text-sm font-medium text-red-400 transition-colors hover:bg-red-500/10"
                  @click="confirmKick(user.id)"
                >
                  <UserMinusIcon class="h-4 w-4" />
                  Kick from room
                </button>
              </div>
            </template>
          </div>
        </TransitionGroup>

        <p class="flex items-center justify-center gap-1 text-xs text-ink-muted">
          <EyeIcon class="h-3 w-3" /> {{ observers.length === 1 ? "Observer" : "Observers" }}
        </p>
      </div>
    </template>
  </div>
</template>

<style scoped>
/* Perspective is applied inline via the transform's own `perspective()` function (see
   tiltStyle) rather than as a `perspective` property on this ancestor — that CSS property
   would make this element a containing block for `position: fixed` descendants (like the
   dropdown's click-outside overlay below), shrinking "click outside to close" down to just
   this card instead of the full viewport. */
:deep(.card-tilt) {
  transition: transform 0.15s ease-out;
  will-change: transform;
}

/* Centers on `left: 50%` via a static margin instead of `translateX(-50%)`, so `transform`
   is left free for the enter/leave pop below — one element, one thing animating it. */
.outlier-badge-wrap {
  margin-left: -7px;
}

.outlier-dot {
  animation: outlier-dot-pulse 1.25s ease-in-out infinite;
}
@keyframes outlier-dot-pulse {
  0%,
  100% {
    transform: scale(0.85);
  }
  50% {
    transform: scale(1.1);
  }
}

.outlier-pop-enter-active {
  transition:
    transform 0.3s cubic-bezier(0.34, 1.56, 0.64, 1),
    opacity 0.2s ease;
}
.outlier-pop-leave-active {
  transition:
    transform 0.2s ease,
    opacity 0.15s ease;
}
.outlier-pop-enter-from,
.outlier-pop-leave-to {
  opacity: 0;
  transform: translateY(8px) scale(0.5);
}

@media (prefers-reduced-motion: reduce) {
  .outlier-dot {
    animation: none;
  }
  .outlier-pop-enter-active,
  .outlier-pop-leave-active {
    transition: none;
  }
  :deep(.card-tilt) {
    transition: none;
  }
}
</style>
