# Hatdraw launch texts (for the operator to post from their own accounts)

Written 2026-11-22. Every claim below is true of the live app at https://pb-secret-santa-draw.pages.dev
(checked by the end-to-end test on production that day). Post each one once, by hand, only where the
place's rules allow it. No cross-posting the same text to many subreddits, no asking friends to upvote.

Best order, by value for the money window (groups organise draws between now and ~5 December):

1. **Seed one real group (most valuable, 3 minutes).** Start a real draw for your own family, friends
   or office and paste the link in that chat. Every joiner then sees "Doing another Secret Santa? Start
   your own" after the draw. That is the loop; it needs a first group.
2. AlternativeTo listing (lasting; people search "DrawNames alternative" / "Elfster alternative").
3. Product Hunt (one-day spike; fine to skip).
4. Reddit, only where self-promotion is allowed (read the sidebar first).

---

## 1. Message for your own group chat

> I set up our Secret Santa here: <group link>
> Tap it and add your name (no sign-up, no app). When everyone's in I'll draw names, and each of us
> sees only who we got. You can add a wishlist too.

## 2. AlternativeTo (https://alternativeto.net, "Suggest new application")

- **Name:** Hatdraw
- **URL:** https://pb-secret-santa-draw.pages.dev
- **Short description (≤ 140 chars):** Free Secret Santa draw with one group link. Everyone joins with their name; each person sees only their own match. No sign-up.
- **Long description:**
  Hatdraw runs a Secret Santa from a single link you paste into the group chat. People add themselves
  with their name, no email, phone number or account. When the organiser draws names, each person opens
  the same link and sees only who they got, on their own phone. The organiser can't see the matches, so
  they can take part too. It has wishlists, anonymous questions between a Santa and their giftee,
  "can't draw each other" pairs for couples, people added without a phone, undo and redraw, and an
  optional reveal of all pairs on exchange day. Free, no ads. Data is deleted 120 days after the group is made.
- **Alternative to:** DrawNames, Elfster, Sneaky Santa, SecretSantaMatch
- **Platforms:** Online / Web-based. **License:** Free. **Tags:** secret-santa, gift-exchange, no-registration, christmas
- **Screenshots:** `docs/og.png`, plus `shots-prod/phone-match.png` and `shots-prod/desktop-landing.png`
  from a fresh `npm run test:e2e` run (they are not committed).

## 3. Product Hunt

- **Name:** Hatdraw
- **Tagline (≤ 60 chars):** Secret Santa from one link in your group chat
- **Description (≤ 260 chars):** Paste one link in the group chat. Everyone joins with their name, no sign-up. Draw names and each person sees only their own match, so the organiser can play too. Wishlists, anonymous questions, couples kept apart. Free, no ads.
- **Topics:** Productivity, Social, Holidays (or Christmas if offered)
- **First comment (maker):**
  > Every December one person in each family chat ends up typing everyone's email into a Secret Santa
  > site, or texting nine people nine separate links. Hatdraw flips that: you share one link, people add
  > themselves, and each person's match shows only on their own phone. Nobody needs an account, and the
  > organiser can't peek. If someone switches phones, the organiser can give them a fresh personal link
  > without redrawing. Feedback welcome, especially from people running office exchanges.

## 4. Reddit (only if the sub allows it)

Not checked: whether r/secretsanta or similar subs allow posts about tools. Read each sidebar first and
post only where self-promotion is allowed (many subs have a weekly self-promo thread). Text:

> **Title:** I made a free Secret Santa draw that works from one group-chat link (no sign-up)
>
> Most generators make the organiser enter everyone's email, or send each person their own link. This
> one is a single link: people tap it, type their name, and after the draw each person sees only their own
> match on their phone. The organiser can't see the pairs. Wishlists, anonymous "what size are you?"
> questions, and couples who shouldn't draw each other are in. Free, no ads, no account:
> https://pb-secret-santa-draw.pages.dev. Happy to hear what's missing for your family or office.
