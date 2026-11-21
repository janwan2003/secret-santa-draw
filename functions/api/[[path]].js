import { draw } from '../_draw.js';

const MAX_MEMBERS = 100;
const LIMITS = {
  create: [20, 3600],   // new exchanges per IP per hour
  join: [80, 3600],     // joins per IP per hour
  write: [400, 3600],   // other writes per IP per hour
  message: [80, 3600],  // anonymous messages per IP per hour
};

const json = (data, status = 200) =>
  new Response(JSON.stringify(data), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' },
  });
const err = (status, message) => json({ error: message }, status);

const now = () => Math.floor(Date.now() / 1000);

function randomId(len = 10) {
  const alphabet = 'abcdefghijkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  const bytes = new Uint8Array(len);
  crypto.getRandomValues(bytes);
  let s = '';
  for (const b of bytes) s += alphabet[b % alphabet.length];
  return s;
}

async function sha256(text) {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

function clean(v, max) {
  if (v === undefined || v === null) return '';
  return String(v).replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/g, '').trim().slice(0, max);
}
const cleanName = (v) => clean(v, 40).replace(/\s+/g, ' ');

async function rateLimit(env, request, action) {
  const [max, windowSec] = LIMITS[action];
  const ip = request.headers.get('cf-connecting-ip') || 'local';
  const t = now();
  const row = await env.DB.prepare(
    `INSERT INTO rate (k, n, reset_at) VALUES (?1, 1, ?2)
     ON CONFLICT(k) DO UPDATE SET
       n = CASE WHEN reset_at < ?3 THEN 1 ELSE n + 1 END,
       reset_at = CASE WHEN reset_at < ?3 THEN ?2 ELSE reset_at END
     RETURNING n`
  ).bind(action + ':' + ip, t + windowSec, t).first();
  return row && row.n > max;
}

async function cleanup(env) {
  const t = now();
  // Delete exchanges 120 days after creation, and stale rate rows.
  const old = t - 120 * 86400;
  await env.DB.batch([
    env.DB.prepare('DELETE FROM messages WHERE exchange_id IN (SELECT id FROM exchanges WHERE created_at < ?1)').bind(old),
    env.DB.prepare('DELETE FROM exclusions WHERE exchange_id IN (SELECT id FROM exchanges WHERE created_at < ?1)').bind(old),
    env.DB.prepare('DELETE FROM members WHERE exchange_id IN (SELECT id FROM exchanges WHERE created_at < ?1)').bind(old),
    env.DB.prepare('DELETE FROM exchanges WHERE created_at < ?1').bind(old),
    env.DB.prepare('DELETE FROM rate WHERE reset_at < ?1').bind(t),
  ]);
}

async function readBody(request) {
  try {
    const text = await request.text();
    if (text.length > 20000) return null;
    return text ? JSON.parse(text) : {};
  } catch {
    return null;
  }
}

async function loadExchange(env, id) {
  return env.DB.prepare('SELECT * FROM exchanges WHERE id = ?1').bind(id).first();
}

async function loadMe(env, request, exchangeId) {
  const token = request.headers.get('x-member-token');
  if (!token || token.length < 20 || token.length > 100) return null;
  const hash = await sha256(token);
  return env.DB.prepare('SELECT * FROM members WHERE token_hash = ?1 AND exchange_id = ?2').bind(hash, exchangeId).first();
}

async function newMember(env, exchangeId, name, { organizer = false, participates = true } = {}) {
  const token = randomId(32);
  const id = randomId(12);
  await env.DB.prepare(
    'INSERT INTO members (id, exchange_id, name, token_hash, is_organizer, participates, created_at) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7)'
  ).bind(id, exchangeId, name, await sha256(token), organizer ? 1 : 0, participates ? 1 : 0, now()).run();
  return { id, token };
}

function exchangeDetails(body, prev = {}) {
  const out = {
    name: body.name !== undefined ? clean(body.name, 60) : prev.name,
    budget: body.budget !== undefined ? clean(body.budget, 30) : prev.budget || '',
    event_date: body.date !== undefined ? clean(body.date, 10) : prev.event_date || '',
    note: body.note !== undefined ? clean(body.note, 400) : prev.note || '',
  };
  if (out.event_date && !/^\d{4}-\d{2}-\d{2}$/.test(out.event_date)) out.event_date = '';
  return out;
}

async function nameTaken(env, exchangeId, name, exceptId = '') {
  const row = await env.DB.prepare(
    'SELECT id FROM members WHERE exchange_id = ?1 AND lower(name) = lower(?2) AND id != ?3'
  ).bind(exchangeId, name, exceptId).first();
  return !!row;
}

async function stateFor(env, ex, me) {
  const { results: members } = await env.DB.prepare(
    'SELECT id, name, is_organizer, participates, wishlist != \'\' AS has_wishlist, giftee_id FROM members WHERE exchange_id = ?1 ORDER BY created_at, rowid'
  ).bind(ex.id).all();
  const out = {
    id: ex.id,
    name: ex.name,
    budget: ex.budget,
    date: ex.event_date,
    note: ex.note,
    status: ex.status,
    drawnAt: ex.drawn_at || null,
    revealed: !!ex.revealed,
    members: members.map((m) => ({
      id: m.id,
      name: m.name,
      organizer: !!m.is_organizer,
      participates: !!m.participates,
      hasWishlist: !!m.has_wishlist,
    })),
    me: null,
  };
  if (ex.revealed && ex.status === 'drawn') {
    const byId = Object.fromEntries(members.map((m) => [m.id, m.name]));
    out.pairs = members.filter((m) => m.giftee_id).map((m) => ({ santa: m.name, giftee: byId[m.giftee_id] || '?' }));
  }
  if (me) {
    out.me = {
      id: me.id,
      name: me.name,
      wishlist: me.wishlist,
      organizer: !!me.is_organizer,
      participates: !!me.participates,
    };
    if (ex.status === 'drawn' && me.giftee_id) {
      const g = await env.DB.prepare('SELECT id, name, wishlist FROM members WHERE id = ?1').bind(me.giftee_id).first();
      if (g) out.giftee = { id: g.id, name: g.name, wishlist: g.wishlist };
    }
    if (me.is_organizer) {
      const { results } = await env.DB.prepare('SELECT a_id, b_id FROM exclusions WHERE exchange_id = ?1').bind(ex.id).all();
      out.exclusions = results.map((r) => [r.a_id, r.b_id]);
    }
  }
  return out;
}

async function handle(request, env, parts) {
  const method = request.method;
  // parts: ['exchanges', id?, sub?, subId?]
  if (parts[0] !== 'exchanges') return err(404, 'Not found');

  // Create exchange
  if (parts.length === 1 && method === 'POST') {
    if (await rateLimit(env, request, 'create')) return err(429, 'Too many new exchanges from this network. Try again in an hour.');
    const body = await readBody(request);
    if (!body) return err(400, 'Bad request');
    const details = exchangeDetails(body);
    const organizerName = cleanName(body.organizerName);
    if (!details.name) return err(400, 'Give your exchange a name.');
    if (!organizerName) return err(400, 'Type your name.');
    const id = randomId(10);
    await env.DB.prepare(
      'INSERT INTO exchanges (id, name, budget, event_date, note, created_at) VALUES (?1, ?2, ?3, ?4, ?5, ?6)'
    ).bind(id, details.name, details.budget, details.event_date, details.note, now()).run();
    const m = await newMember(env, id, organizerName, { organizer: true, participates: body.participates !== false });
    if (Math.random() < 0.05) await cleanup(env);
    return json({ id, token: m.token, memberId: m.id }, 201);
  }

  const id = parts[1];
  if (!id || !/^[A-Za-z0-9]{6,16}$/.test(id)) return err(404, 'Not found');
  const ex = await loadExchange(env, id);
  if (!ex) return err(404, 'This exchange does not exist or has expired.');
  const sub = parts[2] || '';
  const me = await loadMe(env, request, id);

  if (!sub && method === 'GET') return json(await stateFor(env, ex, me));

  // Join
  if (sub === 'join' && method === 'POST') {
    if (await rateLimit(env, request, 'join')) return err(429, 'Too many joins from this network. Try again later.');
    if (ex.status !== 'open') return err(409, 'Names have already been drawn. Ask the organiser to add you and draw again.');
    const body = await readBody(request);
    const name = cleanName(body && body.name);
    if (!name) return err(400, 'Type your name.');
    const count = await env.DB.prepare('SELECT COUNT(*) AS c FROM members WHERE exchange_id = ?1').bind(id).first();
    if (count.c >= MAX_MEMBERS) return err(409, `This exchange is full (${MAX_MEMBERS} people).`);
    if (await nameTaken(env, id, name)) return err(409, `Someone called "${name}" has already joined. If that's you, open your personal link. Otherwise add your surname or an initial.`);
    const m = await newMember(env, id, name);
    return json({ token: m.token, memberId: m.id }, 201);
  }

  if (!me) return err(401, 'Join this exchange first.');

  // Messages between Santa and giftee
  if (sub === 'messages') {
    if (ex.status !== 'drawn') return json({ toGiftee: [], fromSanta: [] });
    if (method === 'GET') {
      const santa = await env.DB.prepare('SELECT id FROM members WHERE giftee_id = ?1').bind(me.id).first();
      const q = 'SELECT from_santa, body, created_at FROM messages WHERE santa_id = ?1 AND giftee_id = ?2 ORDER BY id LIMIT 200';
      const toGiftee = me.giftee_id ? (await env.DB.prepare(q).bind(me.id, me.giftee_id).all()).results : [];
      const fromSanta = santa ? (await env.DB.prepare(q).bind(santa.id, me.id).all()).results : [];
      const map = (r) => ({ mine: undefined, fromSanta: !!r.from_santa, body: r.body, at: r.created_at });
      return json({
        toGiftee: toGiftee.map((r) => ({ ...map(r), mine: !!r.from_santa })),
        fromSanta: fromSanta.map((r) => ({ ...map(r), mine: !r.from_santa })),
        hasSanta: !!santa,
      });
    }
    if (method === 'POST') {
      if (await rateLimit(env, request, 'message')) return err(429, 'Too many messages. Try again later.');
      const body = await readBody(request);
      const text = clean(body && body.body, 500);
      if (!text) return err(400, 'Type a message.');
      let santaId, gifteeId, fromSanta;
      if (body.to === 'giftee') {
        if (!me.giftee_id) return err(409, 'You have no giftee.');
        santaId = me.id; gifteeId = me.giftee_id; fromSanta = 1;
      } else if (body.to === 'santa') {
        const santa = await env.DB.prepare('SELECT id FROM members WHERE giftee_id = ?1').bind(me.id).first();
        if (!santa) return err(409, 'You have no Secret Santa.');
        santaId = santa.id; gifteeId = me.id; fromSanta = 0;
      } else return err(400, 'Bad request');
      const c = await env.DB.prepare('SELECT COUNT(*) AS c FROM messages WHERE santa_id = ?1 AND giftee_id = ?2').bind(santaId, gifteeId).first();
      if (c.c >= 200) return err(409, 'This conversation is full.');
      await env.DB.prepare(
        'INSERT INTO messages (exchange_id, santa_id, giftee_id, from_santa, body, created_at) VALUES (?1, ?2, ?3, ?4, ?5, ?6)'
      ).bind(id, santaId, gifteeId, fromSanta, text, now()).run();
      return json({ ok: true }, 201);
    }
  }

  if (await rateLimit(env, request, 'write')) return err(429, 'Too many changes from this network. Try again later.');

  // My own details
  if (sub === 'me') {
    if (method === 'PATCH') {
      const body = await readBody(request);
      if (!body) return err(400, 'Bad request');
      const wishlist = body.wishlist !== undefined ? clean(body.wishlist, 1500) : me.wishlist;
      let name = me.name;
      if (body.name !== undefined) {
        name = cleanName(body.name);
        if (!name) return err(400, 'Type your name.');
        if (await nameTaken(env, id, name, me.id)) return err(409, `Someone called "${name}" is already in.`);
      }
      let participates = me.participates;
      if (body.participates !== undefined && me.is_organizer && ex.status === 'open') participates = body.participates ? 1 : 0;
      await env.DB.prepare('UPDATE members SET wishlist = ?1, name = ?2, participates = ?3 WHERE id = ?4')
        .bind(wishlist, name, participates, me.id).run();
      return json(await stateFor(env, ex, { ...me, wishlist, name, participates }));
    }
    if (method === 'DELETE') {
      if (me.is_organizer) return err(409, 'The organiser cannot leave. Delete the exchange instead.');
      if (ex.status !== 'open') return err(409, 'Names have been drawn. Ask the organiser to remove you and draw again.');
      await env.DB.batch([
        env.DB.prepare('DELETE FROM exclusions WHERE exchange_id = ?1 AND (a_id = ?2 OR b_id = ?2)').bind(id, me.id),
        env.DB.prepare('DELETE FROM members WHERE id = ?1').bind(me.id),
      ]);
      return json({ ok: true });
    }
  }

  // Everything below is organiser-only
  if (!me.is_organizer) return err(403, 'Only the organiser can do that.');

  if (!sub && method === 'PATCH') {
    const body = await readBody(request);
    if (!body) return err(400, 'Bad request');
    const d = exchangeDetails(body, ex);
    if (!d.name) return err(400, 'Give your exchange a name.');
    await env.DB.prepare('UPDATE exchanges SET name = ?1, budget = ?2, event_date = ?3, note = ?4 WHERE id = ?5')
      .bind(d.name, d.budget, d.event_date, d.note, id).run();
    return json(await stateFor(env, { ...ex, ...d }, me));
  }

  if (!sub && method === 'DELETE') {
    await env.DB.batch([
      env.DB.prepare('DELETE FROM messages WHERE exchange_id = ?1').bind(id),
      env.DB.prepare('DELETE FROM exclusions WHERE exchange_id = ?1').bind(id),
      env.DB.prepare('DELETE FROM members WHERE exchange_id = ?1').bind(id),
      env.DB.prepare('DELETE FROM exchanges WHERE id = ?1').bind(id),
    ]);
    return json({ ok: true });
  }

  // Organiser adds someone without a phone; returns that person's personal link token
  if (sub === 'members' && method === 'POST' && !parts[3]) {
    if (ex.status !== 'open') return err(409, 'Undo the draw before adding people.');
    const body = await readBody(request);
    const name = cleanName(body && body.name);
    if (!name) return err(400, 'Type a name.');
    const count = await env.DB.prepare('SELECT COUNT(*) AS c FROM members WHERE exchange_id = ?1').bind(id).first();
    if (count.c >= MAX_MEMBERS) return err(409, `This exchange is full (${MAX_MEMBERS} people).`);
    if (await nameTaken(env, id, name)) return err(409, `Someone called "${name}" is already in.`);
    const m = await newMember(env, id, name);
    return json({ memberId: m.id, token: m.token }, 201);
  }

  // Organiser makes a new personal link for someone who lost access (new phone, other
  // browser). Works before and after the draw; the old link stops working.
  if (sub === 'members' && method === 'POST' && parts[3] && parts[4] === 'link') {
    const target = parts[3];
    if (target === me.id) return err(409, 'Copy your own personal link from the card at the bottom.');
    const token = randomId(32);
    const r = await env.DB.prepare('UPDATE members SET token_hash = ?1 WHERE id = ?2 AND exchange_id = ?3')
      .bind(await sha256(token), target, id).run();
    if (!r.meta || !r.meta.changes) return err(404, 'That person is not in this exchange.');
    return json({ memberId: target, token }, 201);
  }

  if (sub === 'members' && method === 'DELETE' && parts[3]) {
    if (ex.status !== 'open') return err(409, 'Undo the draw before removing people.');
    const target = parts[3];
    if (target === me.id) return err(409, 'You cannot remove yourself.');
    await env.DB.batch([
      env.DB.prepare('DELETE FROM exclusions WHERE exchange_id = ?1 AND (a_id = ?2 OR b_id = ?2)').bind(id, target),
      env.DB.prepare('DELETE FROM members WHERE id = ?1 AND exchange_id = ?2').bind(target, id),
    ]);
    return json(await stateFor(env, ex, me));
  }

  if (sub === 'exclusions') {
    if (ex.status !== 'open') return err(409, 'Undo the draw before changing who can draw whom.');
    const body = await readBody(request);
    if (!body || !body.a || !body.b || body.a === body.b) return err(400, 'Pick two different people.');
    const [a, b] = [String(body.a), String(body.b)].sort();
    if (method === 'POST') {
      const both = await env.DB.prepare('SELECT COUNT(*) AS c FROM members WHERE exchange_id = ?1 AND id IN (?2, ?3)').bind(id, a, b).first();
      if (both.c !== 2) return err(400, 'Pick two people in this exchange.');
      await env.DB.prepare('INSERT OR IGNORE INTO exclusions (exchange_id, a_id, b_id) VALUES (?1, ?2, ?3)').bind(id, a, b).run();
    } else if (method === 'DELETE') {
      await env.DB.prepare('DELETE FROM exclusions WHERE exchange_id = ?1 AND a_id = ?2 AND b_id = ?3').bind(id, a, b).run();
    }
    return json(await stateFor(env, ex, me));
  }

  if (sub === 'draw' && method === 'POST') {
    if (ex.status !== 'open') return err(409, 'Names have already been drawn.');
    const { results: people } = await env.DB.prepare('SELECT id FROM members WHERE exchange_id = ?1 AND participates = 1').bind(id).all();
    if (people.length < 3) return err(409, 'You need at least 3 people to draw names.');
    const { results: ex2 } = await env.DB.prepare('SELECT a_id, b_id FROM exclusions WHERE exchange_id = ?1').bind(id).all();
    const result = draw(people.map((p) => p.id), ex2.map((r) => [r.a_id, r.b_id]));
    if (!result) return err(409, 'No draw is possible with these rules. Remove a "can\'t draw each other" pair and try again.');
    const stmts = Object.entries(result).map(([s, g]) =>
      env.DB.prepare('UPDATE members SET giftee_id = ?1 WHERE id = ?2 AND exchange_id = ?3').bind(g, s, id));
    stmts.push(env.DB.prepare("UPDATE exchanges SET status = 'drawn', drawn_at = ?1, revealed = 0 WHERE id = ?2").bind(now(), id));
    await env.DB.batch(stmts);
    const fresh = await loadExchange(env, id);
    const meFresh = await env.DB.prepare('SELECT * FROM members WHERE id = ?1').bind(me.id).first();
    return json(await stateFor(env, fresh, meFresh));
  }

  if (sub === 'undo-draw' && method === 'POST') {
    await env.DB.batch([
      env.DB.prepare('UPDATE members SET giftee_id = NULL WHERE exchange_id = ?1').bind(id),
      env.DB.prepare('DELETE FROM messages WHERE exchange_id = ?1').bind(id),
      env.DB.prepare("UPDATE exchanges SET status = 'open', drawn_at = NULL, revealed = 0 WHERE id = ?1").bind(id),
    ]);
    const fresh = await loadExchange(env, id);
    return json(await stateFor(env, fresh, { ...me, giftee_id: null }));
  }

  if (sub === 'reveal' && method === 'POST') {
    if (ex.status !== 'drawn') return err(409, 'Draw names first.');
    const body = await readBody(request);
    const revealed = body && body.revealed ? 1 : 0;
    await env.DB.prepare('UPDATE exchanges SET revealed = ?1 WHERE id = ?2').bind(revealed, id).run();
    return json(await stateFor(env, { ...ex, revealed }, me));
  }

  return err(404, 'Not found');
}

export async function onRequest({ request, env, params }) {
  const parts = [].concat(params.path || []).filter(Boolean);
  try {
    return await handle(request, env, parts);
  } catch (e) {
    console.error(e && e.stack ? e.stack : e);
    return err(500, 'Something went wrong. Please try again.');
  }
}
