import { defineStore } from "pinia";

import type { ThemeId } from "@/lib/themes";
import { setSoundsMuted } from "@/lib/sounds";

const NAME_KEY = "scrummy:userName";
const THEME_KEY = "scrummy:theme";
// localStorage (not sessionStorage): muting is a durable preference, unlike the
// per-tab nickname/theme guess above — nobody wants to re-mute in every new tab.
const SOUND_MUTED_KEY = "scrummy:soundMuted";

function isThemeId(value: string | null): value is ThemeId {
  return value === "lotr" || value === "starwars" || value === "harrypotter";
}

const initialSoundMuted = localStorage.getItem(SOUND_MUTED_KEY) === "1";
setSoundsMuted(initialSoundMuted);

export const useUserStore = defineStore("user", {
  state: () => ({
    userName: sessionStorage.getItem(NAME_KEY) ?? "",
    lastTheme: (() => {
      const stored = sessionStorage.getItem(THEME_KEY);
      return isThemeId(stored) ? stored : ("harrypotter" as ThemeId);
    })(),
    soundMuted: initialSoundMuted,
  }),
  actions: {
    setUserName(name: string): void {
      this.userName = name.trim();
      sessionStorage.setItem(NAME_KEY, this.userName);
    },
    setLastTheme(theme: ThemeId): void {
      this.lastTheme = theme;
      sessionStorage.setItem(THEME_KEY, theme);
    },
    setSoundMuted(muted: boolean): void {
      this.soundMuted = muted;
      setSoundsMuted(muted);
      localStorage.setItem(SOUND_MUTED_KEY, muted ? "1" : "0");
    },
  },
});
