// Room slug rules shared by the client (URL generation) and the Worker (before idFromName).

export const MAX_SLUG_LENGTH = 64;
const SLUG_PATTERN = /^[a-z0-9-]+$/;

export function sanitizeSlug(raw: string): string | null {
  const slug = raw.toLowerCase().trim().slice(0, MAX_SLUG_LENGTH);
  return SLUG_PATTERN.test(slug) ? slug : null;
}
