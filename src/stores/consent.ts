import { defineStore } from "pinia";

import { updateAnalyticsConsent, type ConsentState } from "@/lib/analytics";
import { isConsentRequired } from "@/lib/region";

const CONSENT_KEY = "scrummy:analyticsConsent";

function isConsentState(value: string | null): value is ConsentState {
  return value === "granted" || value === "denied";
}

const initialConsent = isConsentState(localStorage.getItem(CONSENT_KEY))
  ? (localStorage.getItem(CONSENT_KEY) as ConsentState)
  : null;

// Re-apply a stored choice on every load: index.html's inline snippet always starts GA out
// denied, so a returning visitor who already granted consent needs it restored immediately.
if (initialConsent) updateAnalyticsConsent(initialConsent);

export const useConsentStore = defineStore("consent", {
  state: () => ({
    // The visitor's own explicit choice, from the banner. null = hasn't chosen (yet, or ever,
    // if they're outside a region where a choice is required).
    analyticsConsent: initialConsent as ConsentState | null,
    // null = still checking region; true = banner required; false = auto-granted, no banner.
    regionRequiresConsent: initialConsent ? false : (null as boolean | null),
  }),
  getters: {
    showBanner(state): boolean {
      return state.analyticsConsent === null && state.regionRequiresConsent === true;
    },
  },
  actions: {
    setAnalyticsConsent(state: ConsentState): void {
      this.analyticsConsent = state;
      localStorage.setItem(CONSENT_KEY, state);
      updateAnalyticsConsent(state);
    },
    // Call once at startup. No-ops if the visitor already made an explicit choice.
    async checkRegion(): Promise<void> {
      if (this.analyticsConsent !== null) return;
      const required = await isConsentRequired();
      this.regionRequiresConsent = required;
      // Not required (outside EEA/UK/Switzerland): run analytics without a prompt. This isn't
      // recorded as the visitor's own choice, so `showBanner` stays available if they're ever
      // detected as requiring consent on a later visit.
      if (!required) updateAnalyticsConsent("granted");
    },
  },
});
