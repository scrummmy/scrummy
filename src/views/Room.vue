<script setup lang="ts">
import {
  ArrowPathIcon,
  CheckIcon,
  Cog6ToothIcon,
  LinkIcon,
  LockClosedIcon,
  QuestionMarkCircleIcon,
  UserMinusIcon,
} from "@heroicons/vue/24/solid";
import { computed, onBeforeUnmount, onMounted, ref, watch } from "vue";
import { useRoute } from "vue-router";

import CardDeck from "@/components/CardDeck.vue";
import PlayerList from "@/components/PlayerList.vue";
import RoomControls from "@/components/RoomControls.vue";
import SettingsModal from "@/components/SettingsModal.vue";
import Tooltip from "@/components/Tooltip.vue";
import { useRoomStore } from "@/stores/room";
import { useUserStore } from "@/stores/user";
import { detectThemeFromSlug, randomNickname, THEMES, type ThemeId } from "@/lib/themes";
import { playSound } from "@/lib/sounds";
import type { CardType } from "@shared/types";

const props = defineProps<{ roomSlug: string }>();

const route = useRoute();
const roomStore = useRoomStore();
const userStore = useUserStore();

// A ?name=Hakan query param lets a shared link auto-fill (and auto-join with) a nickname.
const nameFromQuery = typeof route.query.name === "string" ? route.query.name.trim().slice(0, 32) : "";
if (nameFromQuery) userStore.setUserName(nameFromQuery);

// The server's stored theme wins once known; until then, guess from the slug
// (so a room nobody has customized still renders correctly the moment it opens).
const theme = computed(
  () =>
    roomStore.room.theme ??
    roomStore.previewTheme ??
    detectThemeFromSlug(props.roomSlug) ??
    userStore.lastTheme,
);
const themeDef = computed(() => THEMES[theme.value]);

// Same idea as the landing page's nickname prefill, themed to this room instead of the last-picked theme.
// `theme` is only a slug-based guess until the room's real state loads over the socket, so re-suggest
// once it settles — but only while the field still holds our own suggestion, never over a user's edit.
let suggestedNickname = randomNickname(theme.value);
const nicknameDraft = ref(userStore.userName || suggestedNickname);
const passwordDraft = ref("");
const observerDraft = ref(false);
const linkCopied = ref(false);
const settingsOpen = ref(false);

// An optimistic join can flip `userStore.userName` on before the server has actually
// accepted it (see roomStore.join) — a wrong password needs to visibly bounce back here
// with an error rather than leave the user sitting in a room they were never let into.
const showJoinScreen = computed(() => !userStore.userName || roomStore.joinError !== null);

const joinErrorMessage = computed(() => {
  switch (roomStore.joinError) {
    case "invalid_password":
      return "Incorrect password.";
    case "password_required":
      return "This room requires a password.";
    default:
      return null;
  }
});

watch(theme, (next) => {
  if (userStore.userName || nicknameDraft.value !== suggestedNickname) return;
  suggestedNickname = randomNickname(next);
  nicknameDraft.value = suggestedNickname;
});

function shuffleNickname(): void {
  suggestedNickname = randomNickname(theme.value);
  nicknameDraft.value = suggestedNickname;
}

function applySettings(payload: {
  nickname: string;
  isObserver: boolean;
  theme: ThemeId;
  privacy: { private: boolean; password: string | null } | null;
  allowKick: boolean;
}): void {
  if (payload.nickname !== userStore.userName) {
    // Rejoining with the same (persisted) userId updates the existing participant's name
    // in place server-side rather than creating a new one — see Room.handleJoin's `existing` branch.
    userStore.setUserName(payload.nickname);
    roomStore.join(payload.nickname);
  }
  roomStore.setObserver(payload.isObserver);
  roomStore.changeTheme(payload.theme);
  userStore.setLastTheme(payload.theme);
  if (payload.privacy) roomStore.setPrivacy(payload.privacy.private, payload.privacy.password);
  if (payload.allowKick !== roomStore.room.allowKick) roomStore.setKickAllowed(payload.allowKick);
}

function toggleMute(): void {
  userStore.setSoundMuted(!userStore.soundMuted);
}

const playerCountLabel = computed(() => {
  const count = roomStore.playerCount;
  return `${count} ${count === 1 ? "player" : "players"} playing`;
});

const showStoryPoint = computed(() => roomStore.room.revealed && roomStore.average !== null);

// Flags any vote more than one card away (on the deck's scale) from a reference point —
// preferably a clear majority (2, 2, 5 flags the 5; 2, 2, 3 flags nobody, an adjacent pick
// is a normal close call), but when nobody agrees (e.g. 40, 5, 2 — three different votes,
// no majority to speak of) falls back to the median vote instead, so a wild outlier still
// gets caught. Unanimous votes flag nobody.
const outlierVoteNames = computed<Set<string>>(() => {
  if (!roomStore.room.revealed) return new Set();

  const votes = roomStore.room.users
    .map((user) => user.vote)
    .filter((vote): vote is NonNullable<typeof vote> => vote !== null);

  if (votes.length < 2) return new Set();

  const counts = new Map<string, number>();
  for (const vote of votes) counts.set(vote.name, (counts.get(vote.name) ?? 0) + 1);
  if (counts.size === 1) return new Set();

  const maxCount = Math.max(...counts.values());
  const topNames = [...counts.entries()].filter(([, count]) => count === maxCount).map(([name]) => name);
  const majorityName = topNames.length === 1 ? topNames[0] : null;

  // A card in the current deck (incl. T-shirt/Binary sizes, which are cards too, just
  // uncounted) is a real estimate. Pass and emoji reactions aren't — never flag those.
  const deckNames = new Set(roomStore.deck.map((card) => card.name));
  const indexByName = new Map(
    roomStore.deck.filter((card) => card.value >= 0).map((card, index) => [card.name, index]),
  );

  let referenceIndex = majorityName !== null ? indexByName.get(majorityName) : undefined;
  if (referenceIndex === undefined && majorityName === null) {
    const indices = votes.map((vote) => indexByName.get(vote.name)).filter((i): i is number => i !== undefined);
    if (indices.length > 0) {
      const sorted = [...indices].sort((a, b) => a - b);
      const mid = Math.floor(sorted.length / 2);
      referenceIndex = sorted.length % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid];
    }
  }

  return new Set(
    [...counts.keys()].filter((name) => {
      if (name === majorityName || !deckNames.has(name)) return false;
      // No numeric reference at all (e.g. a T-shirt-size majority) — fall back to flagging
      // every minority pick, but only once we know there IS a majority to disagree with.
      if (referenceIndex === undefined) return majorityName !== null;
      const index = indexByName.get(name);
      return index === undefined || Math.abs(index - referenceIndex) > 1;
    }),
  );
});

function connect(): void {
  roomStore.connect(props.roomSlug);
  if (userStore.userName && !roomStore.joinPending && !roomStore.selfId) {
    roomStore.join(userStore.userName);
  }
}

function takeOverSession(): void {
  if (userStore.userName) roomStore.takeOver(userStore.userName);
}

function vote(name: string, value: number): void {
  if (roomStore.selfUser && roomStore.selfUser.vote?.name !== name) playSound("vote");
  roomStore.vote(name, value);
}

function submitNickname(): void {
  const name = nicknameDraft.value.trim();
  if (!name) return;
  userStore.setUserName(name);
  roomStore.join(name, passwordDraft.value.trim() || undefined, observerDraft.value);
}

async function copyInviteLink(): Promise<void> {
  await navigator.clipboard.writeText(`${location.origin}/${props.roomSlug}`);
  linkCopied.value = true;
  setTimeout(() => (linkCopied.value = false), 1500);
}

onMounted(connect);
onBeforeUnmount(() => roomStore.leave());

watch(
  () => props.roomSlug,
  (next, prev) => {
    if (next !== prev) connect();
  },
);
</script>

<template>
  <div
    class="mx-auto flex w-full max-w-6xl flex-1 flex-col py-10"
    :style="{ '--theme-glow': themeDef.glow }"
  >
    <Transition appear name="headline-pop">
      <div
        v-if="roomStore.status === 'superseded'"
        class="fixed inset-0 z-50 flex items-center justify-center bg-bg/80 px-6 backdrop-blur-sm"
      >
        <div
          class="w-full max-w-md rounded-2xl border border-border bg-surface p-8 text-center shadow-2xl"
        >
          <div
            class="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-accent/15 text-accent"
          >
            <ArrowPathIcon class="h-6 w-6" />
          </div>
          <h2 class="mt-5 text-2xl font-semibold text-ink">Room active in another tab</h2>
          <p class="mt-2 text-sm leading-6 text-ink-muted">
            This session moved to a newer tab. You can continue there or make this tab active again.
          </p>
          <button
            type="button"
            class="mt-7 w-full rounded-lg bg-accent px-4 py-3 text-base font-semibold text-white transition-colors hover:bg-accent-emphasis"
            @click="takeOverSession"
          >
            Use this tab instead
          </button>
        </div>
      </div>
    </Transition>

    <Transition appear name="headline-pop">
      <div
        v-if="roomStore.status === 'kicked'"
        class="fixed inset-0 z-50 flex items-center justify-center bg-bg/80 px-6 backdrop-blur-sm"
      >
        <div class="w-full max-w-md rounded-2xl border border-border bg-surface p-8 text-center shadow-2xl">
          <div class="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-red-500/15 text-red-400">
            <UserMinusIcon class="h-6 w-6" />
          </div>
          <h2 class="mt-5 text-2xl font-semibold text-ink">Removed from this room</h2>
          <p class="mt-2 text-sm leading-6 text-ink-muted">
            Another participant removed you from this room. You're welcome to join a different one.
          </p>
          <router-link
            to="/"
            class="mt-7 block w-full rounded-lg bg-accent px-4 py-3 text-base font-semibold text-white transition-colors hover:bg-accent-emphasis"
          >
            Back to home
          </router-link>
        </div>
      </div>
    </Transition>

    <div v-if="showJoinScreen" class="mx-auto w-full max-w-lg px-6 py-16 sm:py-24">
      <div class="text-center">
        <h1 class="text-4xl font-semibold tracking-tight text-ink sm:text-5xl">Scrummy</h1>
        <p class="mt-3 text-base text-ink-muted">
          Real-time story sizing. No accounts, no setup — just vote.
        </p>
        <p
          v-if="roomStore.playerCount > 0"
          class="mt-3 flex flex-wrap items-center justify-center gap-1.5 text-sm text-ink-muted"
        >
          <span>
            There {{ roomStore.playerCount === 1 ? "is" : "are" }}
            <strong class="text-ink">{{ roomStore.playerCount }}</strong>
            {{ roomStore.playerCount === 1 ? "player" : "players" }} in the room
          </span>
          <span class="inline-flex items-center gap-1 rounded-md bg-accent/15 px-2.5 py-0.5 text-xs text-accent">
            <LockClosedIcon v-if="roomStore.isPrivate" class="h-3 w-3" />
            {{ roomSlug }}
          </span>
        </p>
      </div>

      <form class="mt-10 flex flex-col gap-6" @submit.prevent="submitNickname">
        <label class="flex flex-col gap-1.5 text-sm text-ink-muted">
          <span class="inline-flex items-center gap-1">
            Nickname
            <Tooltip text="This is the name other players in the room will see.">
              <QuestionMarkCircleIcon class="h-3.5 w-3.5 text-ink-muted/70" />
            </Tooltip>
          </span>
          <div class="relative">
            <input
              v-model="nicknameDraft"
              type="text"
              maxlength="32"
              autofocus
              class="w-full rounded-lg border border-border bg-surface px-3.5 py-2.5 pr-10 text-base text-ink placeholder:text-ink-muted transition-all duration-200 focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent"
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
        </label>

        <label v-if="roomStore.isPrivate" class="flex flex-col gap-1.5 text-sm text-ink-muted">
          <span class="inline-flex items-center gap-1">
            Password
            <Tooltip text="Ask whoever created this room to share the password with you.">
              <QuestionMarkCircleIcon class="h-3.5 w-3.5 text-ink-muted/70" />
            </Tooltip>
          </span>
          <input
            v-model="passwordDraft"
            type="password"
            maxlength="64"
            autocomplete="current-password"
            placeholder="Room password"
            class="w-full rounded-lg border border-border bg-surface px-3.5 py-2.5 text-base text-ink placeholder:text-ink-muted transition-all duration-200 focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent"
          />
        </label>

        <div class="flex items-center justify-between gap-4 rounded-lg border border-border bg-surface px-3.5 py-2.5">
          <span class="inline-flex items-center gap-1 text-sm text-ink-muted">
            Join as observer
            <Tooltip text="Observers can watch the room and see reveals, but can't vote.">
              <QuestionMarkCircleIcon class="h-3.5 w-3.5 text-ink-muted/70" />
            </Tooltip>
          </span>
          <button
            type="button"
            role="switch"
            :aria-checked="observerDraft"
            title="Toggle observer mode"
            class="relative h-6 w-11 shrink-0 rounded-full transition-colors"
            :class="observerDraft ? 'bg-accent' : 'bg-border-strong'"
            @click="observerDraft = !observerDraft"
          >
            <span
              class="absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform"
              :class="observerDraft ? 'left-[1.375rem]' : 'left-0.5'"
            />
          </button>
        </div>

        <p v-if="joinErrorMessage" class="text-sm text-red-400">{{ joinErrorMessage }}</p>

        <button
          type="submit"
          class="rounded-lg bg-accent px-4 py-3 text-base font-semibold text-white transition-colors hover:bg-accent-emphasis"
        >
          Join room
        </button>
      </form>
    </div>

    <template v-else>
      <header class="flex flex-wrap items-start justify-between gap-4 border-b border-border pb-6">
        <div>
          <h1 class="text-2xl font-semibold text-ink">
            <Transition name="headline-pop" mode="out-in">
              <span v-if="showStoryPoint" :key="`avg-${roomStore.average}`">
                Story Point:
                <span class="story-point-gradient font-bold">{{ roomStore.average!.toFixed(1) }}</span>
              </span>
              <span v-else key="players">{{ playerCountLabel }}</span>
            </Transition>
          </h1>
          <p class="mt-1 flex flex-wrap items-center gap-1.5 text-sm text-ink-muted">
            <span>
              There {{ roomStore.playerCount === 1 ? "is" : "are" }}
              <strong class="text-ink">{{ roomStore.playerCount }}</strong>
              {{ roomStore.playerCount === 1 ? "player" : "players" }} in the room
            </span>
            <span class="inline-flex items-center gap-1 rounded-md bg-accent/15 px-2.5 py-0.5 text-xs text-accent">
              <LockClosedIcon v-if="roomStore.isPrivate" class="h-3 w-3" />
              {{ roomSlug }}
            </span>
          </p>
        </div>

        <div class="flex items-center gap-2">
          <button
            type="button"
            title="Settings"
            class="flex h-9 w-9 items-center justify-center rounded-lg border border-border bg-surface text-ink-muted transition-colors hover:border-border-strong hover:text-ink"
            @click="settingsOpen = true"
          >
            <Cog6ToothIcon class="h-4 w-4" />
          </button>
          <button
            type="button"
            title="Copy invite link"
            class="flex h-9 w-9 items-center justify-center rounded-lg border border-border bg-surface text-ink-muted transition-colors hover:border-border-strong hover:text-ink"
            @click="copyInviteLink"
          >
            <CheckIcon v-if="linkCopied" class="h-4 w-4" />
            <LinkIcon v-else class="h-4 w-4" />
          </button>
          <RoomControls
            :revealed="roomStore.room.revealed"
            :has-votes="roomStore.room.users.some((user) => user.vote !== null)"
            @toggle-reveal="roomStore.toggleReveal"
            @reset="roomStore.reset"
          />
        </div>
      </header>

      <section class="flex flex-1 items-center py-10">
        <PlayerList
          :users="roomStore.room.users"
          :revealed="roomStore.room.revealed"
          :theme="theme"
          :self-id="roomStore.selfId"
          :outlier-names="outlierVoteNames"
          :allow-kick="roomStore.room.allowKick"
          @kick="roomStore.kick"
          @nudge="roomStore.nudge"
        />
      </section>

      <section class="pb-4">
        <Transition appear name="deck-rise">
          <CardDeck
            :deck="roomStore.deck"
            :card-type="roomStore.room.cardType"
            :selected="roomStore.selfUser?.vote ?? null"
            :theme="theme"
            :disabled="roomStore.selfUser?.isObserver ?? false"
            @vote="vote"
            @change-card-type="(cardType: CardType) => roomStore.changeCardType(cardType)"
            @stop-observing="roomStore.setObserver(false)"
          />
        </Transition>
      </section>
    </template>

    <SettingsModal
      v-if="settingsOpen"
      :nickname="userStore.userName"
      :is-observer="roomStore.selfUser?.isObserver ?? false"
      :current="theme"
      :sound-muted="userStore.soundMuted"
      :is-private="roomStore.isPrivate"
      :allow-kick="roomStore.room.allowKick"
      @apply="applySettings"
      @toggle-mute="toggleMute"
      @close="settingsOpen = false"
    />
  </div>
</template>
