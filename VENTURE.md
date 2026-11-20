---
slug: secret-santa-draw
stage: launched
priority: 5
url: https://pb-secret-santa-draw.pages.dev
repo: https://github.com/janwan2003/secret-santa-draw
updated: 2026-11-20
---

# secret-santa-draw

## Thesis

**Who:** Families, friend groups, offices, classes and clubs that do a Secret Santa
(Wichteln, Kris Kringle, gift exchange) every December. Ordinary people, mostly
organised by one person in a WhatsApp/iMessage/Slack group.

**What:** A no-login Secret Santa where the group link *is* the draw. The organiser
types a group name, budget and date and gets one link for the group chat. Each person
opens it, types their name (or taps it, if the organiser pre-filled names) and
optionally a wishlist. The link preview shows live state ("7 of 9 joined · draw on
1 Dec"). When everyone is in, the draw runs (exclusions for couples, no repeats from
last year's group). Each person sees only their own match, on their own device, plus
the match's wishlist. They can send their giftee anonymous questions ("size?").
On exchange day: a reveal page of who had whom.

**Needs others:** yes. A draw of one is meaningless; joining is the use.

**Viral moment:** the private reveal "You are Secret Santa for… Grandma", which
people screenshot and post (hiding the name or not), and the group-chat link whose
preview counts up as people join. After the draw, each joiner sees "Doing another
exchange (work, friends)? Start one, free".

**How often:** yearly per group, but most people belong to 2–3 exchanges each December
(family + office + friends), all within ~4 weeks. Off-season: birthday and
white-elephant exchanges, a small tail.

**Why now:** it is 20 November 2026. Groups organise their draws over the next 2–3 weeks.
A launch by ~1 December catches this season; a later launch waits a year.

## Market evidence

Searches run 2026-11-20. Sources are search-result summaries, not opened pages, unless noted.

- **Demand:** "secret santa generator" ≈ 33,100 US searches/month per Semrush snippets on
  [elfster.com](https://cw.semrush.com/website/elfster.com/overview) and
  [drawnames.com](https://sv.semrush.com/website/drawnames.com/overview). Probably an annual
  average concentrated in Nov–Dec, and other tools report lower numbers (18,100 on the
  [drawnames.co.uk page](https://nl.semrush.com/website/drawnames.co.uk/overview)).
- **DrawNames:** the on-site counters read 14,595,116 names drawn "this year" on
  [drawnames.co.uk](https://www.drawnames.co.uk) and 4,077,047 on
  [drawnames.com](https://www.drawnames.com) (undated snapshots). Its
  [App Store listing](https://apps.apple.com/us/app/-/id932002377) says no account and no ads.
  Organisers enter everyone's email or phone number. [Justuseapp's review analysis](https://justuseapp.com/en/app/932002377/drawnames-tirage-au-sort/reviews)
  rates 51% of ~198K reviews as negative.
- **Elfster:** claims "47 million gift givers" ([testimonials](https://www.elfster.com/content/testimonials),
  marketing copy). Its [generator](https://www.elfster.com/gift-exchange/) is free, but competitors
  [GiftList](https://giftlist.com/blog/giftlist-vs-elfster) and
  [Uplup](https://uplup.com/blog/best-secret-santa-generator-tools) say participants need an account
  for wishlists. Trustpilot complaints include not being able to delete an account before the event
  date ([Trustpilot](https://www.trustpilot.com/review/elfster.com?page=2)).
- **Free no-signup generators already exist:** [miniwebtool](https://miniwebtool.com/secret-santa-generator/),
  [visu.network](https://visu.network/tools/secret-santa-generator/),
  [SecretSantaMatch](https://alternativeto.net/software/secretsantamatch/about/), and
  [Sneaky Santa](https://tr.semrush.com/website/sneakysanta.com/overview), which uses a group invite link.
  Most of them make the organiser type every name and hand out one private link per person.
  On some, the organiser or anyone with a results link can see every pairing
  ([GiftList generator](https://giftlist.com/tools/secret-santa-generator)).
- **Opened directly on 2026-11-20 (builder session, via a fetch agent):** [sneakysanta.com](https://www.sneakysanta.com)
  does use one group invite link, but the organiser must register, members "log in" to see their pick, and the organiser
  gets "built-in tools to check who picked who". [miniwebtool](https://miniwebtool.com/secret-santa-generator/) needs no sign-up,
  but the organiser types every name, gets per-person links and an "I am not playing: show me the full chain" button,
  and it shows ads. drawnames.com / .co.uk redirected to drawnames.pl, and elfster.com/gift-exchange/ returned an empty JS shell,
  so the DrawNames counters and the Elfster account requirement are still unverified.
  Verdict: no page we could read offers self-join with one link + no organiser sign-up + organiser-blind matches. The edge holds.
- **How people do it today:** names in a hat at a family gathering, or the organiser runs a
  generator and DMs each person their link. [PopSci's ranking](https://www.popsci.com/story/diy/secret-santa-websites-guide/)
  shows the category is mainstream.

## Our edge

- **Loop: needs others.**
- **K estimate ≈ 1.6** = 9 people per exchange × 90% who join (they must, to be in the draw)
  × 20% of joiners who start another exchange. Reason: people sit in several groups at once in
  the same 4 weeks, and joiners see the product working right before they need it again.
  Weakest factor: joiner → creator. The "start one for your other group" button on the match page is where to design.
- **Self-join link instead of per-person links.** One message in the group chat, not 9 DMs.
  The organiser does not need anyone's email or phone number.
- **Organiser cannot see matches** (blind by default), so the organiser can play too.
- **Live link preview** (Open Graph image redrawn per state: "7 of 9 joined").
- Wishlists and anonymous giftee questions without accounts. Elfster gates these behind sign-up.
- Exclusions, a budget, a date, and "same group as last year: avoid repeats".
- Ad-free, unlike several of the free generators.
- **Honest risk:** "no signup" alone is not an edge here (DrawNames and others have it). The edge
  is the self-join group link plus the live preview. Search is crowded, so growth has to come from the loop.

## Status

**Live: https://pb-secret-santa-draw.pages.dev** (brand: **Hatdraw**). Product page + privacy + support on GitHub Pages:
https://janwan2003.github.io/secret-santa-draw/. Search Console: site verified (META), sitemap submitted 2026-11-20.

What exists and works (Cloudflare Pages + Functions + D1 `pb-secret-santa-draw`, free plan, no build step):
- Create a group (name, budget, date, organiser takes part or not) → one link. People self-join with a name;
  duplicate names rejected. Max 100 people.
- Link preview (Open Graph) rendered per group with live state: "Smith family Christmas · Secret Santa",
  "4 people have joined · budget $25 · exchange on 24 Dec". Static og.png image (not yet per-group).
- Organiser: "can't draw each other" pairs, add someone without a phone (gets their personal link), remove people,
  edit details + note, draw (single random cycle, falls back to matching; impossible rules give a clear error),
  undo draw, show everyone who had whom, delete the group. The organiser never sees matches unless they reveal all.
- Members: tap-to-reveal match card, giftee's wishlist (links clickable), anonymous Santa ↔ giftee messages,
  own wishlist, personal link to sign in on another device (#k= token, stripped from the URL), leave.
- "Start your own" card on every member page and after the draw (the joiner → creator step of the loop).
- Rate limits per IP in D1 (create 20/h, join 80/h, writes 400/h, messages 80/h); tokens stored as SHA-256;
  CSP + security headers; groups auto-deleted 120 days after creation.

Verified 2026-11-20:
- `npm run test:unit`: 5/5 pass (draw validity for n=2..60 x30, couple exclusions x500, dense exclusions, impossible → null, distribution).
- `tests/e2e/run.mjs` in real Chromium (5 separate browser contexts, phone 390px + desktop 1280px), **passes on local
  `wrangler pages dev` and on production** (last prod run on deploy 8d1a824a): create with validation, 3 joins,
  duplicate name, OG text before/after, wishlist, exclusion, draw, late joiner blocked, 4 reveals (no self, everyone once,
  exclusion respected), organiser page leaks no pairs, wishlist link, anonymous message both ways without the Santa's name,
  personal link on a new device, reveal-all, undo, delete → 404, zero console errors. The test deletes its own group.
- Screenshots checked by eye: landing (desktop), organiser (phone), match + messages (phone). Fixed a CSS clash that put
  a gap above own messages.
- Rate limit checked locally: 20 creates → 201, 21st → 429.

Not covered yet: real iOS Safari / Android Chrome devices and WhatsApp/iMessage preview rendering (asked in the inbox),
per-group OG image, other languages, load beyond a handful of users.

## Metrics

- 2026-11-20: launched today; 0 real groups (prod D1 `exchanges` count was 0 after deleting test data). Search Console: no data yet.

## Next steps

1. **Distribution before 1 December (season window):** the product cannot spread until someone seeds the first groups.
   Write `store/launch-posts.md` with honest posts for places where organisers ask (r/secretsanta wiki/weekly thread
   rules permitting, Product Hunt, AlternativeTo listing as an alternative to DrawNames/Elfster/Sneaky Santa). Posting needs the
   operator's accounts, so ask in the inbox, never spam.
2. **German + Dutch versions** (/de "Wichteln", /nl "lootjes trekken"): big markets with their own search terms. Same app,
   translated strings + landing pages with hreflang. Probably the highest-leverage build work left.
3. Per-group OG image (PNG generated in the Function, e.g. "7 joined" on the card) so the chat preview counts up visibly.
4. Quality: test on real iOS Safari / Android Chrome (in-app browsers of WhatsApp/Instagram) and fix what breaks;
   an "add to calendar" for the exchange day; a printable card for people without a phone.
5. "Same group next year": copy a group (names + exclusions) and avoid last year's pairs.
6. Weekly `## Metrics` from D1: `SELECT COUNT(*) FROM exchanges WHERE created_at > ...` (creators) and members (joiners).

## Monetization plan

None until the operator enables it (charter rule 4). Later options: gift-idea links (affiliate, after
registration), premium themes, office/team version with Slack posting. Never paywall the draw, wishlists or group size.

## Log

- 2026-11-20 scout: created idea. Evidence from web searches (Semrush snippets, App Store
  listing, DrawNames counters, competitor comparison posts). Did not open vendor pages or verify
  search volume in a first-party tool.
- 2026-11-20 builder: checked the evidence (Sneaky Santa and miniwebtool opened directly; DrawNames and Elfster could not be read),
  then designed, built, deployed and published **Hatdraw**: https://pb-secret-santa-draw.pages.dev (Pages + Functions + D1, all `pb-`),
  repo + GitHub Pages product/privacy page, Search Console verified + sitemap. Unit 5/5 pass; Playwright e2e passes
  locally and on production (deploy 8d1a824a). Stage → launched.
