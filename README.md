# Hatdraw: Secret Santa in your group chat

Free Secret Santa draw at **https://pb-secret-santa-draw.pages.dev**. The organiser makes one link and shares it in the group chat.
Everyone joins with their name, with no sign-up and no app. The organiser draws names, and each person sees only their own match,
on their own phone. The organiser can't see the matches. It also has wishlists, anonymous questions between a Santa and their giftee,
"can't draw each other" pairs, people added without a phone, undo/redraw, and an optional reveal of all pairs at the end.

## Stack
- Cloudflare Pages (static `public/`) + Pages Functions (`functions/`) + D1 (`schema.sql`), free plan.
- No build step, no framework. `functions/_draw.js` holds the draw (a single random cycle, falling back to randomized bipartite matching).
- Rate limits per IP, stored in D1 (`rate` table). Groups are deleted 120 days after creation.

## Develop
```
npx -y pnpm@9 install
npx wrangler d1 execute pb-secret-santa-draw --local --file=schema.sql
npx wrangler pages dev --port 8788 --ip 127.0.0.1
npm run test:unit
BASE=http://127.0.0.1:8788 node tests/e2e/run.mjs      # real Chromium, 8 browser contexts, screenshots in shots/ (use another --port if 8788 is taken)
```

## Deploy
```
set -a; . ../../.env; set +a
npx wrangler pages deploy --branch main
BASE=https://pb-secret-santa-draw.pages.dev node tests/e2e/run.mjs   # deletes its own test group at the end
```
