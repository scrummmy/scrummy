// Asks the Worker (worker/index.ts, backed by Cloudflare's request.cf.country) whether the
// visitor is somewhere that requires cookie consent before analytics runs. Fails safe: any
// error is treated as "consent required" so we never default-enable tracking on a guess.
export async function isConsentRequired(): Promise<boolean> {
  try {
    const response = await fetch("/api/region");
    if (!response.ok) return true;
    const { consentRequired } = (await response.json()) as { consentRequired: boolean };
    return consentRequired;
  } catch {
    return true;
  }
}
