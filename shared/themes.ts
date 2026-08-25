// Canonical theme ids, shared by the client (rich theme definitions in src/lib/themes.ts)
// and the Worker (validating incoming "change_theme" messages without needing image assets).

export type ThemeId = "harrypotter" | "lotr" | "starwars";

export const THEME_IDS: ThemeId[] = ["harrypotter", "lotr", "starwars"];

export function isThemeId(value: string): value is ThemeId {
  return (THEME_IDS as string[]).includes(value);
}
