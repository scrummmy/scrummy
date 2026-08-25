<script setup lang="ts">
import { ArrowPathIcon } from "@heroicons/vue/24/solid";
import { onBeforeUnmount, onMounted, ref, type Ref, watch } from "vue";
import { useRouter } from "vue-router";

import ClosingCta from "@/components/ClosingCta.vue";
import FlipCard from "@/components/FlipCard.vue";
import HeroSection from "@/components/HeroSection.vue";
import StatsBar from "@/components/StatsBar.vue";
import ThemeSwatches from "@/components/ThemeSwatches.vue";
import { playSound } from "@/lib/sounds";
import { randomNickname, randomThemedRoomSlug, THEMES, type ThemeId } from "@/lib/themes";
import { useRoomStore } from "@/stores/room";
import { useUserStore } from "@/stores/user";
import { sanitizeSlug } from "@shared/slug";

const router = useRouter();
const roomStore = useRoomStore();
const userStore = useUserStore();

const theme = ref<ThemeId>(userStore.lastTheme);
const nickname = ref(randomNickname(theme.value));
const roomSlug = ref(randomThemedRoomSlug(theme.value));
const error = ref("");

// Purely illustrative — no real votes, just enough state to demo the reveal interaction.
// Themed to Harry Potter specifically (not the form's chosen theme above) since this is a
// fixed marketing mockup, not tied to whatever theme the visitor happens to be previewing.
const DEMO_VOTES = ["2", "5", "8", "?"];
const demoRevealed = ref(false);
const demoCardBack = THEMES.harrypotter.cardBack;

watch(demoRevealed, (revealed) => {
  playSound(revealed ? "reveal" : "hide");
});

// Both sections replay their animation on every pass, not just the first: the estimate-card
// stack spreads out (same transform as its own :hover state — see .estimate-stack.in-view
// below) while in view and un-spreads on the way out; the vote-demo cards flip to reveal
// while in view and flip back to their card-back while scrolled away.
const estimateStackEl = ref<HTMLElement | null>(null);
const estimateStackInView = ref(false);
const voteDemoEl = ref<HTMLElement | null>(null);
const scrollObservers: IntersectionObserver[] = [];

// `threshold` controls how much of the element must actually be visible before flipping —
// a position check, not a timer, so it triggers correctly regardless of scroll speed (a
// timer-based delay can get skipped entirely on a fast scroll past the section).
function toggleWhileInView(el: HTMLElement | null, isInView: Ref<boolean>, threshold = 0.4): void {
  if (!el) return;
  const observer = new IntersectionObserver(
    ([entry]) => {
      isInView.value = entry.isIntersecting;
    },
    { threshold },
  );
  observer.observe(el);
  scrollObservers.push(observer);
}

// Download the room route while the user fills in the form so the first navigation
// does not have to wait for its JavaScript chunk and components.
onMounted(() => {
  void import("@/views/Room.vue");

  toggleWhileInView(estimateStackEl.value, estimateStackInView);
  toggleWhileInView(voteDemoEl.value, demoRevealed, 0.75);
});

onBeforeUnmount(() => {
  for (const observer of scrollObservers) observer.disconnect();
});

watch(theme, (next) => {
  nickname.value = randomNickname(next);
  roomSlug.value = randomThemedRoomSlug(next);
  userStore.setLastTheme(next);
});

function shuffleNickname(): void {
  nickname.value = randomNickname(theme.value);
}

function shuffleRoomName(): void {
  roomSlug.value = randomThemedRoomSlug(theme.value);
}

function joinRoom(): void {
  const name = nickname.value.trim();
  if (!name) {
    error.value = "Enter a nickname to join.";
    return;
  }

  const slug = sanitizeSlug(roomSlug.value);
  if (!slug) {
    error.value = "Room name can only contain letters, numbers and dashes.";
    return;
  }

  userStore.setUserName(name);
  // Start the Durable Object handshake and queue the join before navigation. The room
  // screen loads in parallel and reuses this socket instead of opening a second one.
  roomStore.connect(slug);
  roomStore.join(name);
  void router.push(`/${slug}`);
}
</script>

<template>
  <div class="landing-grid w-full overflow-hidden">
    <HeroSection aria-labelledby="landing-title">
      <div class="mx-auto grid max-w-6xl items-center gap-14 lg:grid-cols-12 lg:gap-12">
        <div class="lg:col-span-7">
          <p class="text-sm font-semibold tracking-wide text-white/75">Free planning poker · No account required</p>
          <h1 id="landing-title" class="mt-6 max-w-4xl text-5xl font-semibold leading-[0.98] tracking-[-0.045em] text-white sm:text-6xl lg:text-7xl">
            Better estimates start with <span class="hero-gradient-text">independent thinking.</span>
          </h1>
          <p class="mt-7 max-w-xl text-lg leading-8 text-white/70">
            Create a room, invite your Scrum team, and estimate stories together in real time. Vote privately, reveal
            together, and turn different opinions into useful conversation.
          </p>
          <div class="mt-9 flex flex-wrap items-center gap-4">
            <a href="#create-room" class="group inline-flex items-center gap-2 rounded-lg bg-white px-5 py-3 text-sm font-semibold text-slate-950 transition-transform hover:-translate-y-0.5">
              Create a room <span aria-hidden="true" class="inline-block transition-transform duration-200 group-hover:translate-x-1">→</span>
            </a>
            <router-link to="/how-it-works" class="text-sm font-semibold text-white transition-colors hover:text-white/70">See how it works</router-link>
          </div>
        </div>

        <form id="create-room" class="product-panel relative scroll-mt-20 lg:col-span-5" @submit.prevent="joinRoom">
          <h2 class="text-2xl font-semibold tracking-tight text-ink">Create your room</h2>
          <p class="mt-2 text-sm leading-6 text-ink-muted">Choose a look, add your details, and invite the team.</p>

          <fieldset class="mt-7">
            <legend class="mb-3 text-sm font-medium text-ink-muted">Choose a theme</legend>
            <ThemeSwatches :current="theme" @select="(id) => (theme = id)" />
          </fieldset>

          <div class="mt-7 flex flex-col gap-5">
            <label class="text-sm font-medium text-ink-muted">
              Nickname
              <div class="relative mt-2">
                <input v-model="nickname" type="text" maxlength="32" class="w-full rounded-xl border border-border bg-surface-raised px-4 py-3 pr-11 text-base font-normal text-ink transition-all hover:border-border-strong focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent" />
                <button type="button" title="Shuffle nickname" class="absolute right-2 top-1/2 flex h-6 w-6 -translate-y-1/2 items-center justify-center text-ink-muted hover:text-ink" @click="shuffleNickname"><ArrowPathIcon class="h-4 w-4" /></button>
              </div>
            </label>
            <label class="text-sm font-medium text-ink-muted">
              Room name
              <div class="relative mt-2">
                <input v-model="roomSlug" type="text" maxlength="64" class="w-full rounded-xl border border-border bg-surface-raised px-4 py-3 pr-11 text-base font-normal text-ink transition-all hover:border-border-strong focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent" />
                <button type="button" title="Shuffle room name" class="absolute right-2 top-1/2 flex h-6 w-6 -translate-y-1/2 items-center justify-center text-ink-muted hover:text-ink" @click="shuffleRoomName"><ArrowPathIcon class="h-4 w-4" /></button>
              </div>
            </label>
          </div>

          <p v-if="error" class="mt-4 text-sm text-red-400">{{ error }}</p>
          <button type="submit" class="group mt-7 flex w-full items-center justify-center gap-2 rounded-lg bg-accent px-5 py-3.5 text-sm font-semibold text-white transition-all hover:-translate-y-0.5 hover:bg-accent-emphasis">
            Join room <span aria-hidden="true" class="inline-block transition-transform duration-200 group-hover:translate-x-1">→</span>
          </button>
        </form>
      </div>
    </HeroSection>

    <StatsBar />

    <section id="how-it-works" class="px-6 py-24 sm:py-32" aria-labelledby="how-title">
      <div class="mx-auto max-w-6xl">
        <p class="eyebrow">One shared room</p>
        <div class="mt-4 grid gap-8 lg:grid-cols-2">
          <h2 id="how-title" class="section-title">From backlog item to shared estimate in three moves.</h2>
          <p class="max-w-xl text-lg leading-8 text-ink-muted lg:pt-2">Scrummy keeps the mechanics out of the way so the team can focus on assumptions, risks, and what it will take to deliver the work.</p>
        </div>
        <ol class="mt-16 grid border-y border-border bg-bg md:grid-cols-3 md:gap-12">
          <li class="py-8"><span class="step-number">01</span><h3 class="mt-12 text-xl font-semibold text-ink">Create</h3><p class="mt-3 text-sm leading-6 text-ink-muted">Pick a theme, nickname, and room name. There is nothing to configure or install.</p></li>
          <li class="border-t border-border py-8 md:border-t-0"><span class="step-number">02</span><h3 class="mt-12 text-xl font-semibold text-ink">Invite</h3><p class="mt-3 text-sm leading-6 text-ink-muted">Share one link and every participant arrives in the same live planning poker room.</p></li>
          <li class="border-t border-border py-8 md:border-t-0"><span class="step-number">03</span><h3 class="mt-12 text-xl font-semibold text-ink">Decide</h3><p class="mt-3 text-sm leading-6 text-ink-muted">Vote privately, reveal together, discuss the spread, and size the story with confidence.</p></li>
        </ol>
      </div>
    </section>

    <section class="px-6 py-20 sm:py-28" aria-labelledby="story-points">
      <div class="mx-auto grid max-w-6xl items-center gap-16 lg:grid-cols-2">
        <div class="relative min-h-[390px] overflow-hidden rounded-[2rem] bg-gradient-to-br from-violet-600 via-fuchsia-500 to-orange-400 p-8 sm:p-12" aria-hidden="true">
          <div class="absolute inset-0 bg-[radial-gradient(circle_at_20%_15%,rgba(255,255,255,.5),transparent_38%)]" />
          <div
            ref="estimateStackEl"
            class="estimate-stack relative mx-auto mt-8 max-w-sm"
            :class="{ 'in-view': estimateStackInView }"
          >
            <div class="estimate-card estimate-card-1"><span>2</span><small>Small</small></div>
            <div class="estimate-card estimate-card-2"><span>5</span><small>Medium</small></div>
            <div class="estimate-card estimate-card-3"><span>8</span><small>Unknowns</small></div>
          </div>
        </div>
        <div>
          <p class="eyebrow">Relative, not absolute</p>
          <h2 id="story-points" class="section-title mt-4">Story points compare complexity—not the clock.</h2>
          <p class="mt-6 text-lg leading-8 text-ink-muted">A small, familiar change might be a 2. A larger story with dependencies and unknowns might be an 8. The numbers give the team a shared language for comparing work.</p>
          <p class="mt-5 text-base leading-7 text-ink-muted">Like ordering a motorcycle, pickup, and airplane by weight without knowing the exact kilograms, teams can reason relatively before they can predict precisely.</p>
        </div>
      </div>
    </section>

    <section class="px-6 py-20 sm:py-28" aria-labelledby="planning-poker">
      <div class="mx-auto grid max-w-6xl items-center gap-16 lg:grid-cols-2">
        <div class="lg:order-2">
          <div ref="voteDemoEl" class="vote-demo relative overflow-hidden rounded-[2rem] border border-white/10 p-8 sm:p-12">
            <div class="flex items-end justify-center gap-3 sm:gap-5">
              <FlipCard
                v-for="(label, index) in DEMO_VOTES"
                :key="label"
                :flipped="demoRevealed"
                class="demo-vote-perspective"
                :style="{ transform: `translateY(${index % 2 === 0 ? 0 : 24}px)` }"
              >
                <template #back>
                  <div class="demo-vote demo-vote-hidden">
                    <img :src="demoCardBack" alt="" class="demo-vote-back" aria-hidden="true" />
                  </div>
                </template>
                <template #front>
                  <div class="demo-vote">
                    <span>{{ label }}</span>
                  </div>
                </template>
              </FlipCard>
            </div>
            <div class="mt-16 flex items-center justify-between border-t border-white/10 pt-5 text-xs text-white/55">
              <span>4 players voted</span>
              <span>{{ demoRevealed ? "Revealed" : "Hidden" }}</span>
            </div>
          </div>
        </div>
        <div>
          <p class="eyebrow">Independent first</p>
          <h2 id="planning-poker" class="section-title mt-4">Reveal disagreement before it becomes delivery risk.</h2>
          <p class="mt-6 text-lg leading-8 text-ink-muted">Hidden votes reduce anchoring. When estimates differ, teammates can surface shortcuts, assumptions, missing context, and risks before agreeing on a size.</p>
          <ul class="mt-8 space-y-4 text-sm text-ink">
            <li class="flex gap-3"><span class="text-accent">●</span> Fibonacci, T-shirt, Yes/No, and emoji votes</li>
            <li class="flex gap-3"><span class="text-accent">●</span> Simultaneous reveal with a live average</li>
            <li class="flex gap-3"><span class="text-accent">●</span> Sound cues and themed rooms for remote sessions</li>
            <li class="flex gap-3"><span class="text-accent">●</span> Nudge a quiet teammate, or remove someone if the room allows it</li>
          </ul>
        </div>
      </div>
    </section>

    <section class="px-6 py-24 sm:py-32" aria-labelledby="faq">
      <div class="mx-auto grid max-w-6xl gap-14 lg:grid-cols-[.8fr_1.2fr]">
        <div><p class="eyebrow">FAQ</p><h2 id="faq" class="section-title mt-4">The short version.</h2><p class="mt-5 max-w-sm text-base leading-7 text-ink-muted">Everything your team needs to start estimating—without adding another account or workflow.</p></div>
        <div class="divide-y divide-border border-y border-border bg-bg">
          <details class="py-6"><summary class="faq-summary">What is planning poker?<span>+</span></summary><p class="faq-answer">A collaborative estimation technique where team members size work independently, reveal together, and discuss differences.</p></details>
          <details class="py-6"><summary class="faq-summary">Are story points the same as hours?<span>+</span></summary><p class="faq-answer">No. Story points compare relative complexity and uncertainty rather than predicting an exact duration.</p></details>
          <details class="py-6"><summary class="faq-summary">Which scales can we use?<span>+</span></summary><p class="faq-answer">Scrummy includes Fibonacci, T-shirt sizes, Yes/No, and custom emoji reactions.</p></details>
          <details class="py-6"><summary class="faq-summary">Do participants need accounts?<span>+</span></summary><p class="faq-answer">No. Share the room link and participants can join with only a nickname.</p></details>
          <details class="py-6"><summary class="faq-summary">Is Scrummy free?<span>+</span></summary><p class="faq-answer">Yes. Scrummy is free to use for real-time story point estimation.</p></details>
          <details class="py-6"><summary class="faq-summary">How long do rooms stick around?<span>+</span></summary><p class="faq-answer">About a month. A room stays alive as long as someone visits it at least once every 30 days — no activity for that long and it's automatically cleaned up.</p></details>
          <details class="py-6"><summary class="faq-summary">Can I remove someone from the room?<span>+</span></summary><p class="faq-answer">Right-click their card to nudge them or remove them, if the room has "Allow kicking" turned on in Settings — it's on by default, and anyone in the room can turn it off.</p></details>
          <details class="py-6"><summary class="faq-summary">Need help or have feedback?<span>+</span></summary><p class="faq-answer">Email <a href="mailto:hello@scrummy.dev" class="text-accent hover:text-accent-emphasis">hello@scrummy.dev</a> — happy to help.</p></details>
        </div>
      </div>
    </section>

    <ClosingCta />
  </div>
</template>

<style scoped>
.landing-grid { background-image: linear-gradient(to right, rgba(255,255,255,.045) 1px, transparent 1px); background-size: min(25vw, 320px) 100%; background-position: center; }
.hero-gradient-text { background: linear-gradient(100deg,#fff 4%,#f9a8d4 40%,#fdba74 85%); -webkit-background-clip: text; background-clip: text; color: transparent; }
.product-panel { border-radius: 1.75rem; background: linear-gradient(145deg,rgba(30,31,46,.94),rgba(14,17,27,.92)); padding: 2rem; box-shadow: 0 36px 100px rgba(4,6,12,.5),inset 0 1px rgba(255,255,255,.08); backdrop-filter: blur(24px); }
.eyebrow { color: var(--color-accent); font-size: .75rem; font-weight: 700; letter-spacing: .16em; text-transform: uppercase; }
.section-title { max-width: 42rem; color: var(--color-ink); font-size: clamp(2.25rem,5vw,4rem); font-weight: 600; letter-spacing: -.04em; line-height: 1.04; }
.step-number { font-size: .75rem; font-weight: 700; letter-spacing: .16em; color: var(--color-accent); }
.estimate-card { display: flex; width: 10rem; height: 13rem; flex-direction: column; align-items: center; justify-content: center; border: 1px solid rgba(255,255,255,.5); border-radius: 1rem; background: rgba(10,13,20,.88); box-shadow: 0 24px 60px rgba(29,10,45,.35); color: white; backdrop-filter: blur(12px); transition: transform .45s cubic-bezier(.34,1.56,.64,1); }
.estimate-card span { font-size: 3.5rem; font-weight: 700; line-height: 1; }
.estimate-card small { margin-top: .75rem; color: rgba(255,255,255,.55); }
.estimate-stack { display: grid; }
.estimate-stack > * { grid-area: 1 / 1; }
.estimate-card-1 { transform: rotate(-6deg); }
.estimate-card-2 { transform: translateX(5rem) rotate(3deg); }
.estimate-card-3 { transform: translate(2rem, -1rem) rotate(-2deg); }
@media (min-width: 640px) {
  .estimate-card-2 { transform: translateX(7rem) rotate(3deg); }
  .estimate-card-3 { transform: translate(3rem, -1rem) rotate(-2deg); }
}
/* Hovering the stack fans the cards out further, like spreading a hand of cards — the
   scroll-triggered .in-view state below plays the exact same spread, no hover required. */
.estimate-stack:hover .estimate-card-1, .estimate-stack.in-view .estimate-card-1 { transform: translate(-2.5rem, .5rem) rotate(-12deg); }
.estimate-stack:hover .estimate-card-2, .estimate-stack.in-view .estimate-card-2 { transform: translate(9rem, -.5rem) rotate(8deg); }
.estimate-stack:hover .estimate-card-3, .estimate-stack.in-view .estimate-card-3 { transform: translate(4.25rem, -3rem) rotate(-6deg); }
@media (min-width: 640px) {
  .estimate-stack:hover .estimate-card-2, .estimate-stack.in-view .estimate-card-2 { transform: translate(11rem, -.5rem) rotate(8deg); }
  .estimate-stack:hover .estimate-card-3, .estimate-stack.in-view .estimate-card-3 { transform: translate(5.25rem, -3rem) rotate(-6deg); }
}
.vote-demo { background: radial-gradient(circle at 0 0,rgba(236,72,153,.3),transparent 36%),#12151f; }
.demo-vote-perspective { width: clamp(3.5rem,8vw,5.5rem); aspect-ratio: 2/3; }
.demo-vote { display: flex; height: 100%; width: 100%; align-items: center; justify-content: center; overflow: hidden; border: 1px solid rgba(255,255,255,.16); border-radius: .75rem; background: rgba(255,255,255,.06); box-shadow: 0 16px 45px rgba(0,0,0,.3); }
.demo-vote span { font-size: 1.75rem; font-weight: 700; color: white; }
.demo-vote-hidden {
  border-color: transparent;
  background:
    repeating-linear-gradient(45deg, rgba(255,255,255,.18) 0 4px, transparent 4px 12px),
    repeating-linear-gradient(-45deg, rgba(255,255,255,.18) 0 4px, transparent 4px 12px),
    var(--color-accent);
}
.demo-vote-back { width: 68%; height: 68%; object-fit: contain; filter: drop-shadow(0 4px 10px rgba(0,0,0,.45)); }
.faq-summary { display: flex; cursor: pointer; list-style: none; align-items: center; justify-content: space-between; gap: 1rem; color: var(--color-ink); font-size: 1rem; font-weight: 600; }
.faq-summary::-webkit-details-marker { display: none; }
.faq-summary span { color: var(--color-accent); font-size: 1.25rem; transition: transform .2s ease; }
details[open] .faq-summary span { transform: rotate(45deg); }
.faq-answer { margin-top: .75rem; max-width: 38rem; color: var(--color-ink-muted); font-size: .875rem; line-height: 1.6; }
@media (prefers-reduced-motion: reduce) { *, *::before, *::after { scroll-behavior: auto !important; transition-duration: 0s !important; animation: none !important; } }
</style>
