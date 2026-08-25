// Web Audio API sound-effect player. Each file is fetched and decoded into an AudioBuffer
// exactly once; playback spawns a fresh AudioBufferSourceNode from that buffer, which is
// effectively instant (no per-play network fetch or decode) and overlaps cleanly. The old
// HTMLAudioElement + cloneNode() approach re-fetched and re-decoded the file from scratch
// on every single play — fine on localhost, but a real, repeated network round-trip once
// deployed, which is what made playback feel delayed in production.

export type SoundEffect = "hide" | "join" | "left" | "reveal" | "vote" | "voted" | "kicked" | "nudge";

const SOUND_FILES: Record<SoundEffect, string> = {
  hide: "/sounds/hide.mp3",
  join: "/sounds/join.mp3",
  left: "/sounds/left.mp3",
  reveal: "/sounds/reveal.mp3",
  vote: "/sounds/vote.mp3",
  voted: "/sounds/voted.mp3",
  kicked: "/sounds/kicked.mp3",
  nudge: "/sounds/nudge.mp3",
};

const VOLUME: Record<SoundEffect, number> = {
  hide: 0.35,
  join: 0.3,
  left: 0.25,
  reveal: 0.4,
  vote: 0.25,
  voted: 0.25,
  kicked: 0.4,
  nudge: 0.4,
};

let muted = false;
let audioContext: AudioContext | null = null;
const buffers = new Map<SoundEffect, Promise<AudioBuffer>>();

function getContext(): AudioContext {
  audioContext ??= new AudioContext();
  return audioContext;
}

function loadBuffer(name: SoundEffect): Promise<AudioBuffer> {
  const cached = buffers.get(name);
  if (cached) return cached;

  const promise = fetch(SOUND_FILES[name])
    .then((response) => response.arrayBuffer())
    .then((data) => getContext().decodeAudioData(data));
  buffers.set(name, promise);
  return promise;
}

// Start decoding every sound as soon as this module loads, so by the time a real play()
// call happens the buffer is (almost always) already sitting there ready to go.
for (const name of Object.keys(SOUND_FILES) as SoundEffect[]) {
  loadBuffer(name).catch(() => {});
}

export function setSoundsMuted(next: boolean): void {
  muted = next;
}

export function playSound(name: SoundEffect): void {
  if (muted) return;
  void loadBuffer(name)
    .then((buffer) => {
      const ctx = getContext();
      // Autoplay policy suspends new contexts until a user gesture — this can still fail
      // (e.g. a "someone joined" sound firing before this tab's own first interaction),
      // which is fine, same silent no-op the old HTMLAudioElement version had.
      if (ctx.state === "suspended") void ctx.resume().catch(() => {});

      const source = ctx.createBufferSource();
      source.buffer = buffer;
      const gain = ctx.createGain();
      gain.gain.value = VOLUME[name];
      source.connect(gain).connect(ctx.destination);
      source.start();
    })
    .catch(() => {});
}
