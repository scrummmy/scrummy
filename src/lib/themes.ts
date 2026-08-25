import { THEME_IDS, type ThemeId } from "@shared/themes";

export type { ThemeId };
export { THEME_IDS };

interface ThemeDefinition {
  label: string;
  nicknames: string[];
  /** adjective + noun pairs are combined into room-name slugs, e.g. "misty-rivendell-482" */
  adjectives: string[];
  nouns: string[];
  /** accent color used for theme glows / borders / patterns */
  glow: string;
  /** printed on the face-down "card back" of a hidden vote */
  cardBackIcon: string;
  /** illustrated card-back image shown on a hidden (face-down) vote */
  cardBack: string;
  /** photo shown on the theme picker card */
  photo: string;
  /** intrinsic pixel size of `photo` — set as <img width/height> to reserve its aspect ratio before load */
  photoSize: [width: number, height: number];
  /** decorative watermark icons used around the room */
  icons: string[];
  /** optional background art for the "choose your card" panel; themes without art render none */
  deckArt?: string;
  /** intrinsic pixel size of `deckArt`, same purpose as photoSize */
  deckArtSize?: [width: number, height: number];
  /** CSS mix-blend-mode for deckArt; use "multiply" when the source photo has a white/light background */
  deckArtBlend?: "multiply";
}

export const THEMES: Record<ThemeId, ThemeDefinition> = {
  harrypotter: {
    label: "Harry Potter",
    nicknames: [
      "Harry", "Hermione", "Ron", "Neville", "Luna", "Ginny",
      "Draco", "Dumbledore", "Snape", "Sirius", "Hagrid", "Fred",
      "Percy", "George", "Cho", "Cedric", "Minerva", "Remus",
      "Tonks", "Fleur", "Viktor", "Molly", "Arthur", "Bellatrix",
    ],
    adjectives: [
      "wizarding", "enchanted", "mystic", "bewitched", "forbidden", "hexed",
      "cursed", "arcane", "spellbound", "shadowy", "moonlit", "charmed",
    ],
    nouns: [
      "hogwarts", "hogsmeade", "diagon", "azkaban", "gryffindor", "slytherin",
      "ravenclaw", "hufflepuff", "knockturn", "burrow", "chamber", "quidditch",
    ],
    glow: "#f59e0b",
    cardBackIcon: "⚡",
    cardBack: "/themes/harry-potter/card.webp",
    icons: ["⚡", "🦉", "🏰", "🕯️", "🪄", "🎃"],
    photo: "/themes/harry-potter/dobby.webp",
    photoSize: [600, 671],
    deckArt: "/themes/harry-potter/castle.webp",
    deckArtSize: [800, 379],
  },
  lotr: {
    label: "Lord of the Rings",
    nicknames: [
      "Frodo", "Samwise", "Aragorn", "Legolas", "Gimli", "Gandalf",
      "Boromir", "Eowyn", "Faramir", "Merry", "Pippin", "Galadriel",
      "Bilbo", "Elrond", "Theoden", "Denethor", "Arwen", "Celeborn",
      "Treebeard", "Saruman", "Bard", "Thorin", "Radagast", "Eomer",
    ],
    adjectives: [
      "misty", "shire", "elven", "dwarven", "ancient", "hidden",
      "forsaken", "silver", "shattered", "burning", "eternal", "sunken",
    ],
    nouns: [
      "rivendell", "moria", "gondor", "rohan", "lothlorien", "mordor",
      "isengard", "helmsdeep", "erebor", "fangorn", "minastirith", "bagend",
    ],
    glow: "#eab308",
    cardBackIcon: "💍",
    cardBack: "/themes/lord-of-the-rings/card.webp",
    icons: ["💍", "🗻", "🌲", "⚔️", "🔥", "🧙"],
    photo: "/themes/lord-of-the-rings/gollum.webp",
    photoSize: [600, 750],
    deckArt: "/themes/lord-of-the-rings/gandalf.webp",
    deckArtSize: [800, 672],
  },
  starwars: {
    label: "Star Wars",
    nicknames: [
      "Luke", "Leia", "Han", "Chewbacca", "Yoda", "Obiwan",
      "Vader", "Rey", "Finn", "Lando", "Ahsoka", "Mace",
      "Padme", "Quigon", "Kylo", "Rose", "Poe", "Grogu",
      "Boba", "Anakin", "Palpatine", "Wedge", "Jabba", "Maul",
    ],
    adjectives: [
      "galactic", "rebel", "imperial", "rogue", "distant", "wretched",
      "sith", "jedi", "hyperspace", "phantom", "scruffy", "outer",
    ],
    nouns: [
      "tatooine", "hoth", "endor", "coruscant", "naboo", "dagobah",
      "alderaan", "kamino", "kashyyyk", "mustafar", "jakku", "bespin",
    ],
    glow: "#38bdf8",
    cardBackIcon: "✨",
    cardBack: "/themes/star-wars/card.webp",
    icons: ["✨", "🚀", "🛸", "⚔️", "🌌", "🤖"],
    photo: "/themes/star-wars/yoda.webp",
    photoSize: [358, 358],
    deckArt: "/themes/star-wars/vader.webp",
    deckArtSize: [591, 301],
    deckArtBlend: "multiply",
  },
};

function pick(words: string[]): string {
  return words[Math.floor(Math.random() * words.length)];
}

export function randomNickname(theme: ThemeId): string {
  return pick(THEMES[theme].nicknames);
}

export function randomThemedRoomSlug(theme: ThemeId): string {
  const { adjectives, nouns } = THEMES[theme];
  const suffix = Math.floor(Math.random() * 900 + 100);
  return `${pick(adjectives)}-${pick(nouns)}-${suffix}`;
}

/**
 * Room slugs are generated from theme-specific word lists, so a client can guess
 * the theme from the URL alone before the room's actual (server-stored) state
 * arrives — e.g. for the first paint, or a room nobody has changed the theme of.
 */
export function detectThemeFromSlug(slug: string): ThemeId | null {
  const tokens = slug.toLowerCase().split("-");
  for (const id of THEME_IDS) {
    const { adjectives, nouns } = THEMES[id];
    if (tokens.some((t) => adjectives.includes(t) || nouns.includes(t))) {
      return id;
    }
  }
  return null;
}
