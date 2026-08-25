export type ConsentState = "granted" | "denied";

declare global {
  interface Window {
    dataLayer: unknown[];
    gtag: (...args: unknown[]) => void;
  }
}

// Set in index.html's inline Consent Mode snippet, before gtag.js loads. Guard for SSR/test
// environments where that script never ran.
function gtag(...args: unknown[]): void {
  window.gtag?.(...args);
}

export function updateAnalyticsConsent(state: ConsentState): void {
  gtag("consent", "update", { analytics_storage: state });
}

export function trackPageView(path: string, title: string): void {
  gtag("event", "page_view", {
    page_path: path,
    page_title: title,
    page_location: window.location.href,
  });
}
