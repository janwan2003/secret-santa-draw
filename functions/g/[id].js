// Serves the group page with a link preview (Open Graph) that shows live state,
// e.g. "Smith family Secret Santa · 7 joined · draw on 1 Dec".
const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

function fmtDate(d) {
  if (!d) return '';
  const dt = new Date(d + 'T12:00:00Z');
  if (isNaN(dt)) return '';
  return dt.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', timeZone: 'UTC' });
}

export async function onRequestGet({ request, env, params }) {
  const url = new URL(request.url);
  const page = await env.ASSETS.fetch(new URL('/g', url.origin));
  let html = await page.text();
  let title = 'Join our Secret Santa · Hatdraw';
  let desc = 'Tap to join with your name. No sign-up, no app. Everyone draws a name in secret.';
  try {
    const id = String(params.id || '');
    if (/^[A-Za-z0-9]{6,16}$/.test(id)) {
      const ex = await env.DB.prepare('SELECT name, budget, event_date, status FROM exchanges WHERE id = ?1').bind(id).first();
      if (ex) {
        const c = await env.DB.prepare('SELECT COUNT(*) AS c FROM members WHERE exchange_id = ?1').bind(id).first();
        const n = c ? c.c : 0;
        title = `${ex.name} · Secret Santa`;
        const bits = [];
        bits.push(ex.status === 'drawn' ? `Names drawn · ${n} people` : `${n} ${n === 1 ? 'person has' : 'people have'} joined`);
        if (ex.budget) bits.push(`budget ${ex.budget}`);
        if (ex.event_date) bits.push(`exchange on ${fmtDate(ex.event_date)}`);
        desc = bits.join(' · ') + (ex.status === 'drawn' ? '. Open to see who you got.' : '. Tap to join, no sign-up.');
      }
    }
  } catch (e) {
    console.error(e);
  }
  const canonical = `${url.origin}${url.pathname}`;
  const meta = `<title>${esc(title)}</title>
<meta name="description" content="${esc(desc)}">
<meta property="og:type" content="website">
<meta property="og:site_name" content="Hatdraw">
<meta property="og:title" content="${esc(title)}">
<meta property="og:description" content="${esc(desc)}">
<meta property="og:url" content="${esc(canonical)}">
<meta property="og:image" content="${url.origin}/og.png">
<meta property="og:image:width" content="1200">
<meta property="og:image:height" content="630">
<meta name="twitter:card" content="summary_large_image">
<meta name="robots" content="noindex">`;
  html = html.replace(/<!--META-->[\s\S]*?<!--\/META-->/, meta);
  return new Response(html, {
    headers: { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'no-store' },
  });
}
