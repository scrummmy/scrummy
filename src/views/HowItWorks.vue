<script setup lang="ts">
import {
  ChartBarIcon,
  Cog6ToothIcon,
  EyeSlashIcon,
  HandRaisedIcon,
  LockClosedIcon,
  RectangleStackIcon,
  SparklesIcon,
  UserIcon,
  UserMinusIcon,
} from "@heroicons/vue/24/solid";

import ClosingCta from "@/components/ClosingCta.vue";
import HeroSection from "@/components/HeroSection.vue";

interface Step {
  number: string;
  title: string;
  description: string;
}

const STEPS: Step[] = [
  {
    number: "01",
    title: "Create a room",
    description:
      "Pick a theme, a nickname, and a room name — or shuffle for a random one. No sign-up, no install.",
  },
  {
    number: "02",
    title: "Invite your team",
    description:
      "Share the room link. Anyone who opens it joins with just a nickname (and a password, if you've made the room private).",
  },
  {
    number: "03",
    title: "Vote privately",
    description:
      "Everyone picks a card at the same time — Fibonacci, T-shirt sizes, Yes/No, a custom emoji, or Pass if you're not ready. Votes stay hidden until revealed, so nobody anchors on someone else's number.",
  },
  {
    number: "04",
    title: "Reveal together",
    description:
      "One click flips every card at once, shows the live average, and flags votes that are far from the group's majority — so you know exactly where to focus the discussion.",
  },
  {
    number: "05",
    title: "Discuss & reset",
    description:
      "Talk through the spread, then reset to clear every vote and size the next story. The room, theme, and settings stay exactly as you left them.",
  },
];

interface Feature {
  icon: typeof RectangleStackIcon;
  title: string;
  description: string;
}

const FEATURES: Feature[] = [
  {
    icon: RectangleStackIcon,
    title: "Multiple scales",
    description: "Fibonacci, T-shirt sizes, Yes/No, and custom emoji reactions — switchable per room.",
  },
  {
    icon: HandRaisedIcon,
    title: "Pass, when you're not ready",
    description: "A standing \"Pass\" option that's never counted in the average.",
  },
  {
    icon: ChartBarIcon,
    title: "Live average & outliers",
    description: "See the average the moment cards are revealed, with a flag on votes far from the group.",
  },
  {
    icon: EyeSlashIcon,
    title: "Observer mode",
    description: "Sit a round out without leaving the room — your deck stays blurred and you're never counted.",
  },
  {
    icon: LockClosedIcon,
    title: "Private rooms",
    description: "Lock a room with a password so only people you've shared it with can join.",
  },
  {
    icon: SparklesIcon,
    title: "Themed rooms & sound cues",
    description: "Harry Potter, Lord of the Rings, and Star Wars card art, with sound cues for joins, votes, and reveals.",
  },
  {
    icon: UserIcon,
    title: "No accounts",
    description: "Just a nickname. Inactive rooms clean themselves up automatically after about a week.",
  },
  {
    icon: UserMinusIcon,
    title: "Room moderation",
    description:
      "Right-click a card to nudge someone who's gone quiet, or — if the room allows it — remove them. Everyone else sees a quick notification when it happens.",
  },
  {
    icon: Cog6ToothIcon,
    title: "One settings panel",
    description: "Rename yourself, toggle observer mode, mute sounds, lock the room, allow kicking, and switch themes — all in one place.",
  },
];
</script>

<template>
  <div class="how-grid w-full overflow-hidden">
    <HeroSection size="default" aria-labelledby="how-title">
      <div class="mx-auto max-w-3xl text-center">
        <p class="eyebrow eyebrow-hero justify-center">How it works</p>
        <h1 id="how-title" class="section-title mx-auto mt-4 text-center">
          From backlog item to shared estimate, step by step.
        </h1>
        <p class="mx-auto mt-6 max-w-xl text-lg leading-8 text-white/70">
          No accounts, no setup. Here's exactly what happens from opening Scrummy to sizing your next story.
        </p>
        <div class="mt-9 flex flex-wrap items-center justify-center gap-4">
          <router-link
            to="/#create-room"
            class="group inline-flex items-center gap-2 rounded-lg bg-white px-5 py-3 text-sm font-semibold text-slate-950 transition-transform hover:-translate-y-0.5"
          >
            Create a room <span aria-hidden="true" class="inline-block transition-transform duration-200 group-hover:translate-x-1">→</span>
          </router-link>
        </div>
      </div>
    </HeroSection>

    <div class="border-t border-white/10" />

    <section class="px-6 py-16 sm:py-20" aria-labelledby="steps-title">
      <h2 id="steps-title" class="sr-only">The five steps</h2>
      <div class="mx-auto flex max-w-4xl flex-col gap-14">
        <div v-for="step in STEPS" :key="step.number" class="grid items-center gap-8 sm:grid-cols-[auto_1fr]">
          <span class="step-number sm:w-16">{{ step.number }}</span>
          <div>
            <h3 class="text-xl font-semibold text-ink sm:text-2xl">{{ step.title }}</h3>
            <p class="mt-3 max-w-2xl text-base leading-7 text-ink-muted">{{ step.description }}</p>

            <div v-if="step.number === '03'" class="mt-6 flex gap-3" aria-hidden="true">
              <div v-for="n in 4" :key="n" class="how-vote how-vote-hidden" />
            </div>
            <div v-else-if="step.number === '04'" class="mt-6 flex items-end gap-3" aria-hidden="true">
              <div class="how-vote"><span>3</span></div>
              <div class="relative">
                <div class="how-vote"><span>5</span></div>
              </div>
              <div class="how-vote"><span>5</span></div>
              <div class="relative">
                <div class="how-vote"><span>13</span></div>
                <span class="how-outlier">!</span>
              </div>
              <span class="ml-2 self-center text-sm text-ink-muted">Average <strong class="text-ink">6.5</strong></span>
            </div>
          </div>
        </div>
      </div>
    </section>

    <section class="border-t border-border px-6 py-20 sm:py-28" aria-labelledby="features-title">
      <div class="mx-auto max-w-6xl">
        <p class="eyebrow">Everything included</p>
        <h2 id="features-title" class="section-title mt-4">Built for how real teams estimate.</h2>
        <div class="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          <div v-for="feature in FEATURES" :key="feature.title" class="rounded-2xl border border-border bg-surface p-6">
            <span class="flex h-10 w-10 items-center justify-center rounded-lg bg-accent/15 text-accent">
              <component :is="feature.icon" class="h-5 w-5" />
            </span>
            <h3 class="mt-4 text-base font-semibold text-ink">{{ feature.title }}</h3>
            <p class="mt-2 text-sm leading-6 text-ink-muted">{{ feature.description }}</p>
          </div>
        </div>
      </div>
    </section>

    <ClosingCta />
  </div>
</template>

<style scoped>
/* Same visual language as the landing page: a faint grid backdrop, an accent eyebrow label,
   and a large clamp()-sized section title — duplicated here (rather than shared) because
   this project keeps all page decoration scoped per-view, same as Landing.vue already does. */
.how-grid {
  background-image: linear-gradient(to right, rgba(255, 255, 255, 0.045) 1px, transparent 1px);
  background-size: min(25vw, 320px) 100%;
  background-position: center;
}
.eyebrow {
  display: flex;
  color: var(--color-accent);
  font-size: 0.75rem;
  font-weight: 700;
  letter-spacing: 0.16em;
  text-transform: uppercase;
}
/* The hero's aurora glow cycles through pink/magenta, so the accent-colored eyebrow above
   blends straight into it there — white with a shadow stays readable against any hue. */
.eyebrow-hero {
  color: rgba(255, 255, 255, 0.85);
  text-shadow: 0 1px 12px rgba(0, 0, 0, 0.4);
}
.section-title {
  max-width: 42rem;
  color: var(--color-ink);
  font-size: clamp(2.25rem, 5vw, 4rem);
  font-weight: 600;
  letter-spacing: -0.04em;
  line-height: 1.04;
}
.step-number {
  font-size: 0.75rem;
  font-weight: 700;
  letter-spacing: 0.16em;
  color: var(--color-accent);
}
.how-vote {
  display: flex;
  width: 3.25rem;
  aspect-ratio: 2 / 3;
  align-items: center;
  justify-content: center;
  border: 1px solid var(--color-border);
  border-radius: 0.6rem;
  background: var(--color-surface-raised);
  box-shadow: 0 10px 25px rgba(0, 0, 0, 0.25);
}
.how-vote span {
  font-size: 1.1rem;
  font-weight: 700;
  color: var(--color-ink);
}
.how-vote-hidden {
  border-color: transparent;
  background:
    repeating-linear-gradient(45deg, rgba(255, 255, 255, 0.16) 0 3px, transparent 3px 9px),
    repeating-linear-gradient(-45deg, rgba(255, 255, 255, 0.16) 0 3px, transparent 3px 9px),
    var(--color-accent);
}
.how-outlier {
  position: absolute;
  left: 50%;
  top: -0.6rem;
  display: flex;
  height: 0.9rem;
  width: 0.9rem;
  translate: -50% 0;
  align-items: center;
  justify-content: center;
  border-radius: 999px;
  background: #ef4444;
  font-size: 0.55rem;
  font-weight: 700;
  color: white;
}
@media (prefers-reduced-motion: reduce) {
  * {
    transition-duration: 0s !important;
  }
}
</style>
