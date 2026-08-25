// ISO 3166-1 alpha-2 codes where cookie consent is required before setting non-essential
// analytics cookies: EU/EEA member states, plus the UK and Switzerland (which mirror GDPR-style
// consent rules despite being outside the EU).
const CONSENT_REQUIRED_COUNTRIES = new Set([
  "AT", "BE", "BG", "HR", "CY", "CZ", "DK", "EE", "FI", "FR", "DE", "GR", "HU", "IE", "IT", "LV",
  "LT", "LU", "MT", "NL", "PL", "PT", "RO", "SK", "SI", "ES", "SE", // EU
  "IS", "LI", "NO", // EEA (non-EU)
  "GB", "CH", // UK, Switzerland
]);

export function isConsentRequired(country: string | undefined): boolean {
  // Unknown country (e.g. local dev, no Cloudflare geo data): fail safe and require consent.
  return country === undefined || CONSENT_REQUIRED_COUNTRIES.has(country);
}
