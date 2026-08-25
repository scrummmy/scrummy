// Celebration effect for a unanimous reveal — every connected client fires this off its own
// `update_room` handler (see stores/room.ts), so it plays locally on all screens at once
// rather than relying on a dedicated server broadcast.

import confetti from "canvas-confetti";

// A handful of staggered bursts from one point, each with a different spread/velocity/decay,
// reads as a single natural explosion rather than a mechanical repeating pattern (canvas-confetti's
// own "realistic look" recipe) — much closer to a real confetti cannon than two mirrored jets.
function fire(particleRatio: number, options: confetti.Options): void {
  void confetti({
    particleCount: Math.floor(200 * particleRatio),
    origin: { y: 0.65 },
    ...options,
  });
}

export function celebrateUnanimousVote(): void {
  fire(0.25, { spread: 26, startVelocity: 55 });
  fire(0.2, { spread: 60 });
  fire(0.35, { spread: 100, decay: 0.91, scalar: 0.8 });
  fire(0.1, { spread: 120, startVelocity: 25, decay: 0.92, scalar: 1.2 });
  fire(0.1, { spread: 120, startVelocity: 45 });
}
