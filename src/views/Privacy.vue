<template>
  <div class="mx-auto max-w-2xl px-6 py-16">
    <h1 class="text-2xl font-semibold text-ink">Privacy Policy</h1>
    <p class="mt-2 text-sm text-ink-muted">Last updated: 25 August 2026</p>

    <p class="mt-6 leading-relaxed text-ink-muted">
      Scrummy ("we", "us") is a free, no-account, real-time planning-poker tool. This policy
      explains what data we process when you use it, why, and what rights you have — including
      the rights available to users in the European Economic Area (EEA), UK, and Switzerland
      under the General Data Protection Regulation (GDPR).
    </p>

    <h2 class="mt-8 text-lg font-semibold text-ink">Who is responsible for your data</h2>
    <p class="mt-3 leading-relaxed text-ink-muted">
      Scrummy is the data controller responsible for the processing described in this policy. For
      any privacy question, or to exercise any of the rights below, contact us at
      <a href="mailto:hello@scrummy.dev" class="text-accent hover:text-accent-emphasis">hello@scrummy.dev</a>.
    </p>

    <h2 class="mt-8 text-lg font-semibold text-ink">What we collect</h2>
    <ul class="mt-3 list-disc space-y-3 pl-5 leading-relaxed text-ink-muted">
      <li>
        <span class="text-ink">Room activity.</span> The nickname you choose, your card votes, and
        the room's theme and settings, along with the equivalent data for other participants.
        This is sent over a WebSocket connection to that room's session on our infrastructure so
        it can be shown live to everyone in the room.
      </li>
      <li>
        <span class="text-ink">Local browser storage.</span> We store your nickname, a random
        per-tab identifier, your last-used theme, and a sound preference in your browser's
        <code class="text-ink">sessionStorage</code>/<code class="text-ink">localStorage</code>.
        This is not a cookie, is not sent anywhere except as part of the room activity above, and
        never leaves your device on its own.
      </li>
      <li>
        <span class="text-ink">Cookieless analytics.</span> We use Cloudflare Web Analytics to
        understand overall usage. It does not use cookies or any persistent identifier, does not
        track you across sites or visits, and does not identify you individually — it reports
        aggregated metrics such as page views, referrers, and country-level location, without
        storing your IP address in identifiable form. This always runs; no consent choice is
        needed for it.
      </li>
      <li>
        <span class="text-ink">Google Analytics.</span> We also use Google Analytics (GA4) to
        understand usage in more detail, such as which pages are visited and how. Unlike the
        cookieless analytics above, Google Analytics sets cookies and a random identifier in your
        browser to distinguish visits. If you're visiting from the EEA, UK, or Switzerland, it's
        off by default: the cookie banner shown on your first visit lets you accept or decline it,
        and nothing is set until you accept. You can change your mind at any time by clearing your
        browser's site data for scrummy.dev, which resets the banner. Elsewhere, it runs
        automatically without a prompt; you can still block it using your browser's cookie or
        tracking-protection settings.
      </li>
      <li>
        <span class="text-ink">Infrastructure & security data.</span> Like any website, our
        hosting provider processes your IP address and standard connection metadata transiently
        to serve requests and protect the service from abuse. We don't separately log or retain
        this beyond what's needed for that purpose.
      </li>
    </ul>

    <h2 class="mt-8 text-lg font-semibold text-ink">Why we process this data</h2>
    <ul class="mt-3 list-disc space-y-2 pl-5 leading-relaxed text-ink-muted">
      <li>
        <span class="text-ink">Room activity</span> — necessary to provide the service you've
        asked for (GDPR Art. 6(1)(b)): a shared voting room can't work without your vote being
        shown to that room.
      </li>
      <li>
        <span class="text-ink">Cookieless analytics and infrastructure/security data</span> — our
        legitimate interest (GDPR Art. 6(1)(f)) in understanding and maintaining a reliable,
        secure service, balanced against your privacy — which is why this data is aggregated and
        cookieless rather than tied to you individually.
      </li>
      <li>
        <span class="text-ink">Google Analytics</span> — for visitors in the EEA, UK, or
        Switzerland, your consent (GDPR Art. 6(1)(a)), given or withheld via the cookie banner,
        which you can withdraw at any time as described above. For visitors elsewhere, our
        legitimate interest (GDPR Art. 6(1)(f)) in understanding usage.
      </li>
    </ul>

    <h2 class="mt-8 text-lg font-semibold text-ink">How long we keep it</h2>
    <ul class="mt-3 list-disc space-y-2 pl-5 leading-relaxed text-ink-muted">
      <li>
        Room data is automatically deleted once a room has had no activity for about a week. You
        can also leave a room at any time, which removes you from its live participant list
        immediately.
      </li>
      <li>
        Browser storage is controlled by you — the per-tab data clears when you close the tab; the
        sound preference persists on your device until you clear your browser data.
      </li>
      <li>We don't maintain a separate database of past rooms, participants, or votes.</li>
    </ul>

    <h2 class="mt-8 text-lg font-semibold text-ink">Who we share it with</h2>
    <p class="mt-3 leading-relaxed text-ink-muted">
      We don't sell data, and we don't share it with advertisers or data brokers. Cloudflare, Inc.
      hosts and operates the infrastructure that powers Scrummy (Workers, Durable Objects, and Web
      Analytics) and processes data on our behalf as a data processor, under its own data
      processing terms. If you accept Google Analytics via the cookie banner, Google LLC processes
      the resulting analytics data as a data processor, under its own data processing terms.
    </p>

    <h2 class="mt-8 text-lg font-semibold text-ink">International transfers</h2>
    <p class="mt-3 leading-relaxed text-ink-muted">
      Cloudflare operates a global network. Where data is processed outside the EEA or UK,
      Cloudflare provides appropriate safeguards for that transfer, such as the EU Standard
      Contractual Clauses.
    </p>

    <h2 class="mt-8 text-lg font-semibold text-ink">Your rights</h2>
    <p class="mt-3 leading-relaxed text-ink-muted">
      If you're in the EEA, UK, or Switzerland — and in many cases regardless of location — you
      have the right to:
    </p>
    <ul class="mt-3 list-disc space-y-1 pl-5 leading-relaxed text-ink-muted">
      <li>Access the personal data we hold about you</li>
      <li>Correct inaccurate data</li>
      <li>Request erasure of your data</li>
      <li>Restrict or object to our processing of your data</li>
      <li>Receive your data in a portable format</li>
      <li>Lodge a complaint with your local data protection authority</li>
    </ul>
    <p class="mt-3 leading-relaxed text-ink-muted">
      Because Scrummy doesn't use accounts, most of "your data" is already in your own hands —
      clearing your browser storage or leaving a room removes it. For anything else, contact us at
      <a href="mailto:hello@scrummy.dev" class="text-accent hover:text-accent-emphasis">hello@scrummy.dev</a>.
    </p>

    <h2 class="mt-8 text-lg font-semibold text-ink">Cookies</h2>
    <p class="mt-3 leading-relaxed text-ink-muted">
      Scrummy itself does not use cookies. The local browser storage described above is used
      strictly to make the app function (remembering your nickname and theme) and to remember your
      cookie-banner choice, and our default analytics is cookieless. The only cookies Scrummy can
      set are Google Analytics'. If you're in the EEA, UK, or Switzerland, that only happens if
      you accept them in the cookie banner shown on your first visit; elsewhere they're set
      automatically, and can be blocked via your browser's cookie settings.
    </p>

    <h2 class="mt-8 text-lg font-semibold text-ink">Children</h2>
    <p class="mt-3 leading-relaxed text-ink-muted">
      Scrummy isn't directed at children, and we don't knowingly collect data from children under
      16.
    </p>

    <h2 class="mt-8 text-lg font-semibold text-ink">Changes to this policy</h2>
    <p class="mt-3 leading-relaxed text-ink-muted">
      We may update this policy as the product changes. Material changes will be reflected here
      with an updated date.
    </p>
  </div>
</template>
