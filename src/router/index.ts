import { createRouter, createWebHistory } from "vue-router";

import { trackPageView } from "@/lib/analytics";

export const router = createRouter({
  history: createWebHistory(),
  // Without this, a `router-link` to e.g. "/#create-room" only changes the route — it
  // doesn't scroll, since that's native <a href="#...">  behavior and router-link never
  // does a real page navigation. Needed for any cross-page link into a page section
  // (e.g. the "Create a room" CTAs on /how-it-works and the closing section).
  scrollBehavior(to) {
    if (to.hash) return { el: to.hash, behavior: "smooth" };
    return { top: 0 };
  },
  routes: [
    {
      path: "/",
      name: "landing",
      component: () => import("@/views/Landing.vue"),
      meta: {
        title: "Free Planning Poker for Scrum Teams | Scrummy",
        description:
          "Estimate story points with your remote Scrum team in real time. Create a planning poker room, share the link, and vote—no accounts required.",
        index: true,
      },
    },
    {
      path: "/privacy",
      name: "privacy",
      component: () => import("@/views/Privacy.vue"),
      meta: {
        title: "Privacy | Scrummy",
        description: "Learn how Scrummy handles room and participant data.",
        index: true,
      },
    },
    {
      path: "/terms",
      name: "terms",
      component: () => import("@/views/Terms.vue"),
      meta: {
        title: "Terms of Service | Scrummy",
        description: "Terms for using the Scrummy planning poker service.",
        index: true,
      },
    },
    {
      path: "/how-it-works",
      name: "how-it-works",
      component: () => import("@/views/HowItWorks.vue"),
      meta: {
        title: "How It Works | Scrummy",
        description:
          "A step-by-step look at creating a room, inviting your team, voting privately, and revealing estimates together — plus every feature Scrummy includes.",
        index: true,
      },
    },
    {
      path: "/:roomSlug",
      name: "room",
      component: () => import("@/views/Room.vue"),
      props: true,
      meta: {
        title: "Planning Poker Room | Scrummy",
        description: "A private real-time planning poker room on Scrummy.",
        index: false,
      },
    },
    // Anything with more than one path segment doesn't match a room link (those are always
    // a single slug) or any known page — e.g. a mistyped/truncated share URL.
    {
      path: "/:pathMatch(.*)*",
      name: "not-found",
      component: () => import("@/views/NotFound.vue"),
      meta: {
        title: "Page Not Found | Scrummy",
        description: "This page doesn't exist.",
        index: false,
      },
    },
  ],
});

function setMeta(selector: string, attribute: string, value: string): void {
  const element = document.head.querySelector<HTMLMetaElement>(selector);
  element?.setAttribute(attribute, value);
}

router.afterEach((route) => {
  const title = String(route.meta.title ?? "Scrummy");
  const description = String(route.meta.description ?? "Real-time planning poker for Scrum teams.");
  const index = route.meta.index === true;
  const canonicalUrl = new URL(route.path, "https://scrummy.dev").toString();

  document.title = title;
  setMeta('meta[name="description"]', "content", description);
  setMeta('meta[name="robots"]', "content", index ? "index, follow" : "noindex, nofollow");
  setMeta('meta[property="og:title"]', "content", title);
  setMeta('meta[property="og:description"]', "content", description);
  setMeta('meta[property="og:url"]', "content", canonicalUrl);
  setMeta('meta[name="twitter:title"]', "content", title);
  setMeta('meta[name="twitter:description"]', "content", description);

  const canonical = document.head.querySelector<HTMLLinkElement>('link[rel="canonical"]');
  if (canonical) canonical.href = canonicalUrl;

  trackPageView(route.fullPath, title);
});
