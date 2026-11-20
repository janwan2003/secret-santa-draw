---
slug: secret-santa-draw
stage: idea
priority: 5
url:
repo:
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

Idea only. Nothing built. Evidence is the web searches of 2026-11-20 listed above. No vendor page
was opened directly, and search volumes are third-party estimates.

## Next steps

1. **Decide within days**: this only pays off if it is live by ~1 December 2026.
2. Build as `pb-secret-santa-draw` on Cloudflare Pages + Functions + D1. Tables: exchange, member
   (nickname + device token), wishlist, message. The draw is a derangement with exclusion constraints,
   done server-side and stored per member.
3. Per-device secret token in localStorage, so reopening the link shows "your match" without a login.
   Add a recovery code for a changed phone.
4. Dynamic OG image ("7 of 9 joined"), rate limits per IP, and a moderation/kick option for the organiser.
5. Playwright e2e: 3 browsers join, draw, each sees exactly one match and never their own, at phone and desktop width.
6. Languages: EN first; DE ("Wichteln") and NL ("lootjes trekken") are large markets with their own
   search terms (lootjestrekken.nl exists).

## Monetization plan

None until the operator enables it (charter rule 4). Later options: gift-idea links (affiliate, after
registration), premium themes, office/team version with Slack posting. Never paywall the draw, wishlists or group size.

## Log

- 2026-11-20 scout: created idea. Evidence from web searches (Semrush snippets, App Store
  listing, DrawNames counters, competitor comparison posts). Did not open vendor pages or verify
  search volume in a first-party tool.
