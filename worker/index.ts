import { sanitizeSlug } from "../shared/slug";
import { isConsentRequired } from "./consentRegion";
import type { Env } from "./env";

export { Room } from "./room";

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);

    if (url.pathname === "/api/region") {
      const country = request.cf?.country as string | undefined;
      return Response.json({ consentRequired: isConsentRequired(country) });
    }

    const legacyRedirects: Record<string, string> = {
      "/privacy-policy": "/privacy",
      "/terms-of-service": "/terms",
    };
    const redirectPath = legacyRedirects[url.pathname];
    if (redirectPath) {
      const destination = new URL(redirectPath, url.origin);
      destination.search = url.search;
      return Response.redirect(destination.toString(), 301);
    }

    const match = url.pathname.match(/^\/ws\/([^/]+)\/?$/);

    if (!match) {
      return new Response("Not found", { status: 404 });
    }

    let decoded: string;
    try {
      decoded = decodeURIComponent(match[1]);
    } catch {
      return new Response("Invalid room name", { status: 400 });
    }

    const slug = sanitizeSlug(decoded);
    if (!slug) {
      return new Response("Invalid room name", { status: 400 });
    }

    const id = env.ROOM.idFromName(slug);
    const stub = env.ROOM.get(id);
    return stub.fetch(request);
  },
} satisfies ExportedHandler<Env>;
