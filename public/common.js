// Shared helpers
const Store = {
  key: (id) => 'hatdraw:' + id,
  get(id) { try { return JSON.parse(localStorage.getItem(this.key(id)) || 'null'); } catch { return null; } },
  set(id, v) { try { localStorage.setItem(this.key(id), JSON.stringify(v)); } catch {} },
  remove(id) { try { localStorage.removeItem(this.key(id)); } catch {} },
  all() {
    const out = [];
    try {
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i);
        if (k && k.startsWith('hatdraw:')) { const v = JSON.parse(localStorage.getItem(k)); if (v && v.token) out.push({ id: k.slice(8), ...v }); }
      }
    } catch {}
    return out.sort((a, b) => (b.at || 0) - (a.at || 0));
  },
};

async function api(path, { method = 'GET', body, token } = {}) {
  const headers = { 'content-type': 'application/json' };
  if (token) headers['x-member-token'] = token;
  let res;
  try {
    res = await fetch('/api' + path, { method, headers, body: body ? JSON.stringify(body) : undefined });
  } catch {
    throw Object.assign(new Error('No connection. Check your internet and try again.'), { status: 0 });
  }
  let data = {};
  try { data = await res.json(); } catch {}
  if (!res.ok) throw Object.assign(new Error(data.error || 'Something went wrong.'), { status: res.status });
  return data;
}

function esc(s) {
  return String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

// Escape, then turn http(s) links into clickable links (for wishlists)
function linkify(s) {
  return esc(s).replace(/https?:\/\/[^\s<]+[^\s<.,;:!?)"'\]]/g, (u) => `<a href="${u}" target="_blank" rel="noopener nofollow ugc">${u}</a>`);
}

function fmtDate(d) {
  if (!d) return '';
  const dt = new Date(d + 'T12:00:00');
  if (isNaN(dt)) return d;
  return dt.toLocaleDateString(undefined, { weekday: 'short', day: 'numeric', month: 'long' });
}

let toastTimer;
function toast(text) {
  let el = document.querySelector('.toast');
  if (!el) { el = document.createElement('div'); el.className = 'toast'; el.setAttribute('role', 'status'); document.body.appendChild(el); }
  el.textContent = text;
  el.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.remove('show'), 2200);
}

async function copyText(text) {
  try { await navigator.clipboard.writeText(text); return true; } catch {}
  const ta = document.createElement('textarea');
  ta.value = text; ta.setAttribute('readonly', ''); ta.style.position = 'fixed'; ta.style.opacity = '0';
  document.body.appendChild(ta); ta.select();
  let ok = false; try { ok = document.execCommand('copy'); } catch {}
  ta.remove();
  return ok;
}
