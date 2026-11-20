// End-to-end test in real Chromium: organiser creates, 3 people join from separate
// browsers, exclusions + draw, each sees exactly one match (never themselves),
// anonymous messages, reveal. Screenshots at phone and desktop width go to shots/.
// Usage: BASE=http://127.0.0.1:8788 node tests/e2e/run.mjs
import { chromium } from 'playwright-core';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const BASE = process.env.BASE || 'http://127.0.0.1:8788';
const SHOTS = process.env.SHOTS || 'shots';
fs.mkdirSync(SHOTS, { recursive: true });

function findChrome() {
  if (process.env.CHROME) return process.env.CHROME;
  const root = path.join(os.homedir(), '.cache/ms-playwright');
  for (const d of fs.readdirSync(root).filter((d) => d.startsWith('chromium-')).sort().reverse()) {
    const p = path.join(root, d, 'chrome-linux64/chrome');
    if (fs.existsSync(p)) return p;
  }
  return undefined;
}

const PHONE = { viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true };
const DESKTOP = { viewport: { width: 1280, height: 860 } };
const errors = [];
const browser = await chromium.launch({ executablePath: findChrome() });

async function person(label, opts) {
  const ctx = await browser.newContext(opts);
  const page = await ctx.newPage();
  page.on('console', (m) => {
    // Eve's duplicate-name join is meant to get a 409; any other error fails the run.
    if (m.type() === 'error' && !(label === 'Eve' && /status of 409/.test(m.text()))) errors.push(`${label}: ${m.text()}`);
  });
  page.on('pageerror', (e) => errors.push(`${label}: ${e.message}`));
  page.on('dialog', (d) => d.accept());
  return { label, ctx, page };
}
const shot = (p, name) => p.screenshot({ path: path.join(SHOTS, name + '.png'), fullPage: true });

let step = 'start';
try {
  // 1. Landing + create
  step = 'landing';
  const desk = await person('desktop-visitor', DESKTOP);
  await desk.page.goto(BASE + '/');
  await shot(desk.page, 'desktop-landing');
  const anna = await person('Anna', PHONE);
  await anna.page.goto(BASE + '/');
  await shot(anna.page, 'phone-landing');
  // validation
  await anna.page.click('#createBtn');
  assert.match(await anna.page.textContent('#createError'), /name/i);
  await anna.page.fill('#exName', 'Smith family Christmas');
  await anna.page.fill('#orgName', 'Anna');
  await anna.page.fill('#budget', '$25');
  await anna.page.fill('#date', '2026-12-24');
  await anna.page.click('#createBtn');
  step = 'created';
  await anna.page.waitForURL(/\/g\/[A-Za-z0-9]+$/);
  await anna.page.waitForSelector('#shareCard');
  const groupUrl = anna.page.url();
  assert.match(await anna.page.textContent('#shareCard h2'), /send this link/i);
  await shot(anna.page, 'phone-organiser-created');

  // OG preview reflects state
  const ogHtml = await (await fetch(groupUrl)).text();
  assert.match(ogHtml, /og:title" content="Smith family Christmas · Secret Santa"/);
  assert.match(ogHtml, /1 person has joined/);

  // 2. Three people join from their own browsers
  step = 'join';
  const ben = await person('Ben', PHONE);
  const cleo = await person('Cleo', PHONE);
  const dan = await person('Dan', DESKTOP);
  for (const p of [ben, cleo, dan]) {
    await p.page.goto(groupUrl);
    await p.page.waitForSelector('#joinForm');
    if (p === ben) await shot(ben.page, 'phone-join');
    await p.page.fill('#joinName', p.label);
    await p.page.click('#joinBtn');
    await p.page.waitForSelector('text=You\'re in, ' + p.label);
  }
  // duplicate name is rejected
  const eve = await person('Eve', PHONE);
  await eve.page.goto(groupUrl);
  await eve.page.fill('#joinName', 'ben');
  await eve.page.click('#joinBtn');
  await eve.page.waitForSelector('#joinError:not(:empty)');
  assert.match(await eve.page.textContent('#joinError'), /already joined/);
  assert.match(await (await fetch(groupUrl)).text(), /4 people have joined/);

  // Ben writes a wishlist
  await ben.page.fill('#wishlist', 'Board games\nhttps://example.com/socks');
  await ben.page.click('#saveWish');
  await ben.page.waitForSelector('text=Wishlist saved');
  await shot(ben.page, 'phone-member-waiting');

  // 3. Organiser: exclusion Anna <-> Ben, then draw
  step = 'organiser';
  await anna.page.reload();
  await anna.page.waitForSelector('#drawBtn:not([disabled])');
  const opts = await anna.page.$$eval('#exA option', (os) => os.map((o) => ({ v: o.value, t: o.textContent })));
  const idOf = (n) => opts.find((o) => o.t === n).v;
  await anna.page.selectOption('#exA', idOf('Anna'));
  await anna.page.selectOption('#exB', idOf('Ben'));
  await anna.page.click('#addExcl');
  await anna.page.waitForSelector('.pairs li');
  assert.match(await anna.page.textContent('.pairs'), /Anna ↔ Ben|Ben ↔ Anna/);
  await shot(anna.page, 'phone-organiser-ready');
  await anna.page.click('#drawBtn');
  await anna.page.waitForSelector('#showMatch');

  // late joiner is blocked
  await eve.page.reload();
  await eve.page.waitForSelector('text=Names have been drawn');

  // 4. Everyone reveals their own match
  step = 'reveal';
  const matches = {};
  for (const p of [anna, ben, cleo, dan]) {
    await p.page.reload();
    await p.page.waitForSelector('#showMatch');
    if (p === cleo) await shot(cleo.page, 'phone-before-reveal');
    await p.page.click('#showMatch');
    await p.page.waitForSelector('#giftee:not(.hidden)');
    matches[p.label] = (await p.page.textContent('#giftee')).trim();
  }
  console.log('matches', matches);
  const names = ['Anna', 'Ben', 'Cleo', 'Dan'];
  for (const n of names) assert.notEqual(matches[n], n, `${n} drew themselves`);
  assert.deepEqual(Object.values(matches).sort(), names.slice().sort(), 'everyone is drawn exactly once');
  assert.notEqual(matches.Anna, 'Ben');
  assert.notEqual(matches.Ben, 'Anna');

  // organiser page must not leak other people's matches
  const annaText = await anna.page.textContent('body');
  for (const n of names.filter((x) => x !== 'Anna')) assert.ok(!annaText.includes(`${n} →`), 'organiser sees a pair');

  // whoever drew Ben sees his wishlist with a clickable link
  const benSanta = names.find((n) => matches[n] === 'Ben');
  const bs = { Anna: anna, Ben: ben, Cleo: cleo, Dan: dan }[benSanta];
  await bs.page.waitForSelector('.wish a[href="https://example.com/socks"]');

  // 5. Anonymous message: Ben's Santa asks, Ben replies
  step = 'messages';
  await bs.page.fill('#msgGiftee', 'What size socks?');
  await bs.page.click('#composeGiftee button');
  await bs.page.waitForSelector('#threadGiftee .msg.mine');
  await ben.page.reload();
  await ben.page.waitForSelector('#santaCard:not(.hide) .msg.theirs');
  assert.match(await ben.page.textContent('#threadSanta'), /What size socks\?/);
  assert.ok(!(await ben.page.textContent('#santaCard')).includes(benSanta), 'santa name leaked');
  await ben.page.fill('#msgSanta', 'Size M, thanks!');
  await ben.page.click('#composeSanta button');
  await ben.page.waitForSelector('#threadSanta .msg.mine');
  await bs.page.reload();
  await bs.page.waitForSelector('#threadGiftee .msg.theirs');
  assert.match(await bs.page.textContent('#threadGiftee'), /Size M/);
  await shot(bs.page, (bs === dan ? 'desktop' : 'phone') + '-match');
  await shot(ben.page, 'phone-ben-match');
  await shot(dan.page, 'desktop-group-drawn');

  // 6. Personal link restores identity on a new device
  step = 'personal-link';
  const token = await cleo.page.evaluate((k) => JSON.parse(localStorage.getItem(k)).token, 'hatdraw:' + groupUrl.split('/g/')[1]);
  const cleo2 = await person('Cleo-laptop', DESKTOP);
  await cleo2.page.goto(groupUrl + '#k=' + token);
  await cleo2.page.waitForSelector('#showMatch');
  await cleo2.page.click('#showMatch');
  assert.equal((await cleo2.page.textContent('#giftee')).trim(), matches.Cleo);
  assert.ok(!cleo2.page.url().includes('#k='), 'token left in URL');

  // 7. Organiser shows all pairs
  step = 'reveal-all';
  await anna.page.click('#revealBtn');
  await anna.page.waitForSelector('.reveal-list li');
  await dan.page.reload();
  await dan.page.waitForSelector('.reveal-list li');
  assert.equal(await dan.page.$$eval('.reveal-list li', (l) => l.length), 4);
  assert.match(await (await fetch(groupUrl)).text(), /Names drawn · 4 people/);

  // 8. Privacy page
  await desk.page.goto(BASE + '/privacy');
  await desk.page.waitForSelector('h1');

  // 9. Organiser deletes the exchange (also cleans up test data on production)
  step = 'delete';
  await anna.page.click('#undoDraw');
  await anna.page.waitForSelector('#drawBtn');
  await anna.page.click('text=Edit details');
  await anna.page.click('#deleteEx');
  await anna.page.waitForURL(BASE + '/');
  const gone = await fetch(BASE + '/api/exchanges/' + groupUrl.split('/g/')[1]);
  assert.equal(gone.status, 404);

  step = 'console';
  // Ignore nothing: any console error fails the run
  assert.deepEqual(errors, [], 'console errors:\n' + errors.join('\n'));
  console.log('E2E PASS: create, join x3, duplicate name, exclusion, draw, reveal, wishlist, messages, personal link, reveal-all, undo, delete, no console errors');
} catch (e) {
  console.error('E2E FAIL at step:', step);
  console.error(e);
  if (errors.length) console.error('console errors:', errors);
  process.exitCode = 1;
} finally {
  await browser.close();
}
