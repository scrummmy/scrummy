<template>
  <section class="relative overflow-hidden px-6 py-24 text-center sm:py-32">
    <div class="cta-glow" aria-hidden="true" />
    <div class="relative mx-auto max-w-3xl pt-10">
      <p class="eyebrow">Your next refinement</p>
      <h2 class="mt-4 text-4xl font-semibold tracking-[-0.035em] text-white sm:text-6xl">
        Less setup. Better sizing conversations.
      </h2>
      <p class="mx-auto mt-6 max-w-xl text-lg leading-8 text-white/65">
        Open a room, share the link, and let every perspective land before the cards turn over.
      </p>
      <router-link
        to="/#create-room"
        class="group mt-9 inline-flex items-center gap-2 rounded-lg bg-white px-6 py-3 text-sm font-semibold text-slate-950 transition-transform hover:-translate-y-0.5"
      >
        Create a room <span aria-hidden="true" class="inline-block transition-transform duration-200 group-hover:translate-x-1">→</span>
      </router-link>
    </div>
  </section>
</template>

<style scoped>
.eyebrow {
  color: var(--color-accent);
  font-size: 0.75rem;
  font-weight: 700;
  letter-spacing: 0.16em;
  text-transform: uppercase;
}
.cta-glow {
  position: absolute;
  inset: 10% 0% -140%;
  background: radial-gradient(ellipse at center, #a855f7 0%, #ec4899 28%, #f97316 48%, transparent 70%);
  filter: blur(55px);
  opacity: 0.65;
  animation: cta-glow-drift 20s ease-in-out infinite;
}
@keyframes cta-glow-drift {
  0%,
  100% {
    transform: translate(0, 0) scale(1);
    opacity: 0.65;
  }
  50% {
    transform: translate(-2%, 3%) scale(1.08);
    opacity: 0.8;
  }
}
@media (prefers-reduced-motion: reduce) {
  .cta-glow {
    animation: none;
  }
}
</style>
