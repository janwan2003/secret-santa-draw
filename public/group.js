(function () {
  const app = document.getElementById('app');
  const id = decodeURIComponent(location.pathname.split('/')[2] || '');
  const groupUrl = location.origin + '/g/' + encodeURIComponent(id);

  // Personal link: /g/<id>#k=<token> signs this device in as that person
  const m = location.hash.match(/k=([A-Za-z0-9]{20,100})/);
  if (m) {
    const prev = Store.get(id) || {};
    Store.set(id, { ...prev, token: m[1], at: Date.now() });
    history.replaceState(null, '', location.pathname);
  }

  let local = Store.get(id) || {};
  let state = null;
  let messages = null;
  let lastJson = '';
  let busy = false;

  const token = () => local.token;
  const saveLocal = (patch) => { local = { ...local, ...patch }; Store.set(id, local); };
  const personalLink = () => groupUrl + '#k=' + token();

  async function load() {
    try {
      const s = await api('/exchanges/' + encodeURIComponent(id), { token: token() });
      if (token() && !s.me) { Store.remove(id); local = {}; }
      if (s.me) saveLocal({ name: s.name, at: local.at || Date.now() });
      const j = JSON.stringify(s);
      if (j !== lastJson) { lastJson = j; state = s; render(); }
      if (s.me && s.status === 'drawn') loadMessages();
    } catch (e) {
      if (e.status === 404) {
        Store.remove(id);
        app.innerHTML = `<div class="card center"><h2>This Secret Santa doesn't exist</h2><p class="muted">The link may be mistyped, or the group was deleted or expired.</p><a class="btn" href="/">Start a new one</a></div>`;
      } else if (!state) {
        app.innerHTML = `<div class="card center"><h2>Couldn't load</h2><p class="muted">${esc(e.message)}</p><button class="btn" onclick="location.reload()">Try again</button></div>`;
      }
    }
  }

  async function loadMessages() {
    try {
      const r = await api('/exchanges/' + encodeURIComponent(id) + '/messages', { token: token() });
      const j = JSON.stringify(r);
      if (messages && JSON.stringify(messages) === j) return;
      messages = r;
      renderThreads();
    } catch {}
  }

  // Run an action with a button busy state; returns result or null
  async function act(btn, fn) {
    if (busy) return null;
    busy = true;
    const label = btn && btn.textContent;
    if (btn) { btn.disabled = true; }
    try {
      return await fn();
    } catch (e) {
      toast(e.message);
      return null;
    } finally {
      busy = false;
      if (btn && document.body.contains(btn)) { btn.disabled = false; btn.textContent = label; }
    }
  }

  function applyState(s) {
    if (!s || !s.id) return;
    state = s; lastJson = JSON.stringify(s); render();
  }

  // Preserve typed input across re-renders
  function snapshotInputs() {
    const vals = {};
    app.querySelectorAll('input[id], textarea[id], select[id]').forEach((el) => {
      vals[el.id] = el.type === 'checkbox' ? el.checked : el.value;
    });
    const f = document.activeElement && document.activeElement.id;
    return { vals, focus: f };
  }
  function restoreInputs(snap, skip = []) {
    for (const [k, v] of Object.entries(snap.vals)) {
      if (skip.includes(k)) continue;
      const el = document.getElementById(k);
      if (!el || el.dataset.fresh) continue;
      if (el.type === 'checkbox') el.checked = v; else el.value = v;
    }
    if (snap.focus) { const el = document.getElementById(snap.focus); if (el) el.focus(); }
  }

  function headHtml(s) {
    const facts = [];
    if (s.budget) facts.push(`<span>Budget <b>${esc(s.budget)}</b></span>`);
    if (s.date) facts.push(`<span>Exchange <b>${esc(fmtDate(s.date))}</b></span>`);
    const count = s.members.filter((x) => x.participates).length;
    facts.push(`<span><b>${count}</b> ${count === 1 ? 'person' : 'people'} in the draw</span>`);
    return `<div class="group-head">
      <div class="muted small">Secret Santa</div>
      <h1>${esc(s.name)}</h1>
      <div class="facts">${facts.join('')}</div>
      ${s.note ? `<div class="note-box">${linkify(s.note)}</div>` : ''}
    </div>`;
  }

  function membersHtml(s, canRemove) {
    const chips = s.members.map((x) => {
      const isMe = s.me && x.id === s.me.id;
      const tags = [];
      if (x.organizer) tags.push('organiser');
      if (!x.participates) tags.push('not drawing');
      if (x.hasWishlist) tags.push('wishlist ✓');
      const rm = canRemove && !isMe ? `<button aria-label="Remove ${esc(x.name)}" data-remove="${esc(x.id)}" data-name="${esc(x.name)}">×</button>` : '';
      return `<li class="chip${isMe ? ' me' : ''}">${esc(x.name)}${isMe ? ' (you)' : ''}${tags.length ? ` <span class="tag">${tags.join(' · ')}</span>` : ''}${rm}</li>`;
    }).join('');
    return `<div class="card"><h3>Who's in</h3><ul class="chips" id="memberList">${chips}</ul></div>`;
  }

  function shareHtml(s, fresh) {
    return `<div class="card" id="shareCard">
      <h2>${fresh ? 'Now send this link to your group' : 'Invite the others'}</h2>
      <p class="muted">Paste it in your group chat. Everyone taps it and adds their name, no sign-up.</p>
      <div class="share-link"><code>${esc(groupUrl)}</code><button class="btn small" id="copyGroup">Copy</button></div>
      <div class="btns">
        <button class="btn" id="shareGroup">Share link</button>
        <a class="btn secondary" target="_blank" rel="noopener" href="https://wa.me/?text=${encodeURIComponent(inviteText(s))}">WhatsApp</a>
      </div>
    </div>`;
  }

  function inviteText(s) {
    let t = `Join our Secret Santa "${s.name}"`;
    if (s.budget) t += ` (budget ${s.budget})`;
    return t + `: tap the link and add your name. ${groupUrl}`;
  }

  function wishlistHtml(s) {
    return `<div class="card">
      <h3>Your wishlist</h3>
      <p class="muted small">Your Secret Santa sees this after the draw. Ideas, sizes, links, things you don't want.</p>
      <textarea id="wishlist" maxlength="1500" placeholder="e.g. Board games, dark chocolate, size M socks. No candles please.">${esc(s.me.wishlist)}</textarea>
      <div class="btns" style="margin-top:10px"><button class="btn secondary" id="saveWish">Save wishlist</button></div>
    </div>`;
  }

  function revealHtml(s) {
    const shown = !!local.seen;
    return `<div class="card reveal">
      <div class="kicker">You are Secret Santa for</div>
      <div class="who${shown ? '' : ' hidden'}" id="giftee" aria-hidden="${shown ? 'false' : 'true'}">${esc(shown ? s.giftee.name : 'Someone nice')}</div>
      ${shown
        ? `<div class="sub">${s.budget ? `Budget ${esc(s.budget)}. ` : ''}${s.date ? `Exchange on ${esc(fmtDate(s.date))}. ` : ''}Keep it secret!</div>
           <div style="margin-top:14px"><button class="btn small" id="hideMatch">Hide</button></div>`
        : `<div class="sub">Make sure nobody is looking at your screen.</div>
           <div style="margin-top:16px"><button class="btn" id="showMatch">Tap to reveal</button></div>`}
    </div>
    ${shown ? `<div class="card">
      <h3>${esc(s.giftee.name)}'s wishlist</h3>
      ${s.giftee.wishlist ? `<div class="wish">${linkify(s.giftee.wishlist)}</div>` : `<p class="muted">No wishlist yet. Ask ${esc(s.giftee.name)} below. They won't know it's you.</p>`}
    </div>
    <div class="card">
      <h3>Ask ${esc(s.giftee.name)} anonymously</h3>
      <p class="muted small">They'll see it from "Your Secret Santa", not from you.</p>
      <div class="thread" id="threadGiftee"></div>
      <form class="compose" id="composeGiftee"><input id="msgGiftee" type="text" maxlength="500" placeholder="e.g. What size do you wear?" autocomplete="off"><button class="btn small" type="submit">Send</button></form>
    </div>` : ''}`;
  }

  function santaThreadHtml() {
    return `<div class="card hide" id="santaCard">
      <h3>Messages from your Secret Santa</h3>
      <p class="muted small">Someone in the group has a question for you. You won't see who. Reply here and only they will get it.</p>
      <div class="thread" id="threadSanta"></div>
      <form class="compose" id="composeSanta"><input id="msgSanta" type="text" maxlength="500" placeholder="Reply to your Secret Santa" autocomplete="off"><button class="btn small" type="submit">Send</button></form>
    </div>`;
  }

  function organizerHtml(s) {
    const people = s.members;
    const byId = Object.fromEntries(people.map((x) => [x.id, x.name]));
    const drawing = people.filter((x) => x.participates).length;
    if (s.status === 'open') {
      const excl = (s.exclusions || []).map(([a, b]) =>
        `<li><span>${esc(byId[a] || '?')} ↔ ${esc(byId[b] || '?')}</span><button class="btn ghost" data-unexclude="${esc(a)}|${esc(b)}">Remove</button></li>`).join('');
      const opts = people.filter((x) => x.participates).map((x) => `<option value="${esc(x.id)}">${esc(x.name)}</option>`).join('');
      return `<div class="card organizer">
        <div class="label">Organiser</div>
        <h2>Draw names</h2>
        <p class="muted">${drawing < 3 ? `You need at least 3 people. ${drawing} so far.` : `${drawing} people will be in the draw. You won't see who got whom.`}</p>
        <button class="btn block green" id="drawBtn" ${drawing < 3 ? 'disabled' : ''}>Draw names now</button>
        <p class="hint">Late joiner? You can undo the draw and draw again.</p>
        <hr class="soft">
        <h3>Can't draw each other</h3>
        <p class="muted small">For couples or people who live together.</p>
        ${excl ? `<ul class="pairs">${excl}</ul>` : ''}
        ${drawing >= 2 ? `<div class="row"><div class="field"><select id="exA" aria-label="First person">${opts}</select></div><div class="field"><select id="exB" aria-label="Second person">${opts}</select></div></div>
        <button class="btn secondary small" id="addExcl">Add pair</button>` : '<p class="muted small">Add pairs once people have joined.</p>'}
        <hr class="soft">
        <h3>Add someone without a phone</h3>
        <p class="muted small">You get a personal link for them to print or pass on. Anyone who opens it sees their match.</p>
        <form class="compose" id="addPerson"><input id="addName" type="text" maxlength="40" placeholder="Name" autocomplete="off"><button class="btn small secondary" type="submit">Add</button></form>
        <div id="addedLink"></div>
        <hr class="soft">
        <details><summary class="small" style="cursor:pointer;font-weight:700">Edit details</summary>
          <div style="margin-top:12px">
            <div class="field"><label for="edName">Group name</label><input id="edName" type="text" maxlength="60" value="${esc(s.name)}"></div>
            <div class="row"><div class="field"><label for="edBudget">Budget</label><input id="edBudget" type="text" maxlength="30" value="${esc(s.budget)}"></div>
            <div class="field"><label for="edDate">Exchange day</label><input id="edDate" type="date" value="${esc(s.date)}"></div></div>
            <div class="field"><label for="edNote">Note for everyone</label><textarea id="edNote" maxlength="400" placeholder="e.g. We'll swap gifts after lunch at Grandma's.">${esc(s.note)}</textarea></div>
            <div class="field"><label class="check"><input id="edPart" type="checkbox" ${s.me.participates ? 'checked' : ''}> I'm taking part in the draw</label></div>
            <div class="btns"><button class="btn secondary" id="saveDetails">Save</button><button class="btn ghost" id="deleteEx">Delete this Secret Santa</button></div>
          </div>
        </details>
      </div>`;
    }
    return `<div class="card organizer">
      <div class="label">Organiser</div>
      <h3>Names are drawn</h3>
      <p class="muted small">Everyone opens the group link to see their own match. You can't see who got whom${s.revealed ? ' (now shown to everyone below)' : ''}.</p>
      <div class="btns">
        <button class="btn secondary small" id="revealBtn">${s.revealed ? 'Hide who had whom' : 'Show everyone who had whom'}</button>
        <button class="btn ghost" id="undoDraw">Undo draw</button>
      </div>
      <p class="hint">Show the pairs only after the gifts are opened. Undo the draw to add or remove people; this deletes messages and everyone's match.</p>
    </div>`;
  }

  function personalHtml(s) {
    return `<div class="card">
      <details><summary style="cursor:pointer;font-weight:700">Your personal link (for another phone)</summary>
        <p class="muted small" style="margin-top:10px">This link opens the group as <b>${esc(s.me.name)}</b> on any device. Keep it private: anyone with it can see your match.</p>
        <div class="btns"><button class="btn secondary small" id="copyPersonal">Copy my personal link</button></div>
        ${!s.me.organizer && s.status === 'open' ? `<hr class="soft"><button class="btn ghost" id="leaveBtn">Leave this Secret Santa</button>` : ''}
      </details>
    </div>`;
  }

  function startOwnHtml() {
    return `<div class="card start-own center">
      <h3>Doing another Secret Santa?</h3>
      <p class="muted">Work, friends, a club? Start one in 20 seconds. Free, no sign-up.</p>
      <a class="btn green" href="/">Start your own</a>
    </div>`;
  }

  function pairsHtml(s) {
    if (!s.revealed || !s.pairs) return '';
    return `<div class="card"><h3>Who had whom</h3><ul class="reveal-list">${s.pairs.map((p) => `<li><b>${esc(p.santa)}</b> → ${esc(p.giftee)}</li>`).join('')}</ul></div>`;
  }

  function render() {
    const s = state;
    if (!s) return;
    document.title = `${s.name} · Secret Santa · Hatdraw`;
    const snap = snapshotInputs();
    let html = headHtml(s);
    if (!s.me) {
      if (s.status === 'open') {
        html += `<form class="card" id="joinForm" novalidate>
          <h2>Join this Secret Santa</h2>
          <div class="field"><label for="joinName">Your name</label><input id="joinName" type="text" maxlength="40" placeholder="e.g. Tom" autocomplete="given-name"></div>
          <div id="joinError" class="error" role="alert"></div>
          <button class="btn block" type="submit" id="joinBtn">Join</button>
          <p class="hint">No sign-up. This phone remembers you.</p>
        </form>`;
        html += s.members.length ? membersHtml(s, false) : '';
      } else {
        html += `<div class="card"><h2>Names have been drawn</h2><p class="muted">If you're in this group, open your personal link on this phone. Not in it yet? Ask the organiser to undo the draw, then join.</p></div>`;
        html += membersHtml(s, false);
      }
      html += pairsHtml(s);
      html += startOwnHtml();
      app.innerHTML = html;
      restoreInputs(snap);
      bindJoin();
      return;
    }
    const me = s.me;
    if (s.status === 'drawn' && s.giftee) html += revealHtml(s);
    if (s.status === 'drawn' && me.participates) html += santaThreadHtml();
    if (s.status === 'drawn' && !s.giftee && me.participates) html += `<div class="card"><p class="muted">You joined after the draw, so you have no match. Ask the organiser to undo the draw and draw again.</p></div>`;
    if (s.status === 'open') {
      html += `<div class="card"><h2>You're in, ${esc(me.name)}!</h2><p class="muted">${me.organizer ? 'When everyone has joined, draw names below.' : 'When everyone has joined, the organiser draws names. Then open this link again to see who you got.'}</p></div>`;
      html += shareHtml(s, local.fresh);
    }
    html += pairsHtml(s);
    if (me.organizer) html += organizerHtml(s);
    if (me.participates) html += wishlistHtml(s);
    html += membersHtml(s, me.organizer && s.status === 'open');
    html += personalHtml(s);
    if (!me.organizer || s.status === 'drawn') html += startOwnHtml();
    app.innerHTML = html;
    restoreInputs(snap, ['edName', 'edBudget', 'edDate', 'edNote', 'edPart']);
    bindMember();
    renderThreads();
  }

  function threadHtml(list, emptyText) {
    if (!list || !list.length) return `<p class="muted small">${emptyText}</p>`;
    return list.map((x) => `<div class="msg ${x.mine ? 'mine' : 'theirs'}">${esc(x.body)}</div>`).join('');
  }

  function renderThreads() {
    if (!messages || !state || !state.me) return;
    const tg = document.getElementById('threadGiftee');
    if (tg) { tg.innerHTML = threadHtml(messages.toGiftee, 'No messages yet.'); tg.scrollTop = tg.scrollHeight; }
    const ts = document.getElementById('threadSanta');
    const card = document.getElementById('santaCard');
    if (ts && card) {
      const has = messages.fromSanta && messages.fromSanta.length;
      card.classList.toggle('hide', !has);
      ts.innerHTML = threadHtml(messages.fromSanta, '');
      ts.scrollTop = ts.scrollHeight;
    }
  }

  function bindJoin() {
    const f = document.getElementById('joinForm');
    if (!f) return;
    f.addEventListener('submit', async (e) => {
      e.preventDefault();
      const name = document.getElementById('joinName').value.trim();
      const errEl = document.getElementById('joinError');
      errEl.textContent = '';
      if (!name) { errEl.textContent = 'Type your name.'; return; }
      const btn = document.getElementById('joinBtn');
      btn.disabled = true; btn.textContent = 'Joining…';
      try {
        const r = await api('/exchanges/' + encodeURIComponent(id) + '/join', { method: 'POST', body: { name } });
        saveLocal({ token: r.token, name: state.name, at: Date.now() });
        lastJson = '';
        await load();
        window.scrollTo(0, 0);
      } catch (ex) {
        errEl.textContent = ex.message;
        btn.disabled = false; btn.textContent = 'Join';
      }
    });
  }

  const on = (elId, ev, fn) => { const el = document.getElementById(elId); if (el) el.addEventListener(ev, fn); };
  const path = (p = '') => '/exchanges/' + encodeURIComponent(id) + p;

  function bindMember() {
    on('copyGroup', 'click', async () => { toast((await copyText(groupUrl)) ? 'Link copied. Paste it in your group chat.' : groupUrl); saveLocal({ fresh: false }); });
    on('shareGroup', 'click', async () => {
      saveLocal({ fresh: false });
      if (navigator.share) {
        try { await navigator.share({ title: state.name + ' · Secret Santa', text: inviteText(state).replace(' ' + groupUrl, ''), url: groupUrl }); } catch {}
      } else toast((await copyText(groupUrl)) ? 'Link copied. Paste it in your group chat.' : groupUrl);
    });
    on('copyPersonal', 'click', async () => toast((await copyText(personalLink())) ? 'Personal link copied. Keep it private.' : personalLink()));
    on('showMatch', 'click', () => { saveLocal({ seen: true }); render(); });
    on('hideMatch', 'click', () => { saveLocal({ seen: false }); render(); });
    on('saveWish', 'click', (e) => act(e.target, async () => {
      e.target.textContent = 'Saving…';
      const s = await api(path('/me'), { method: 'PATCH', token: token(), body: { wishlist: document.getElementById('wishlist').value } });
      applyState(s); toast('Wishlist saved');
    }));
    on('leaveBtn', 'click', (e) => {
      if (!confirm('Leave this Secret Santa?')) return;
      act(e.target, async () => { await api(path('/me'), { method: 'DELETE', token: token() }); Store.remove(id); local = {}; lastJson = ''; await load(); });
    });
    on('drawBtn', 'click', (e) => {
      const n = state.members.filter((x) => x.participates).length;
      if (!confirm(`Draw names for ${n} people now? Everyone will see their match when they open the link.`)) return;
      act(e.target, async () => {
        e.target.textContent = 'Drawing…';
        const s = await api(path('/draw'), { method: 'POST', token: token() });
        saveLocal({ seen: false });
        applyState(s); window.scrollTo(0, 0); toast('Names drawn! Tell everyone to open the link.');
      });
    });
    on('undoDraw', 'click', (e) => {
      if (!confirm('Undo the draw? Everyone loses their match and messages, and you draw again.')) return;
      act(e.target, async () => { applyState(await api(path('/undo-draw'), { method: 'POST', token: token() })); toast('Draw undone'); });
    });
    on('revealBtn', 'click', (e) => {
      const next = !state.revealed;
      if (next && !confirm('Show everyone who had whom? Do this after the gifts are opened.')) return;
      act(e.target, async () => applyState(await api(path('/reveal'), { method: 'POST', token: token(), body: { revealed: next } })));
    });
    on('addExcl', 'click', (e) => {
      const a = document.getElementById('exA').value, b = document.getElementById('exB').value;
      if (!a || !b || a === b) { toast('Pick two different people'); return; }
      act(e.target, async () => applyState(await api(path('/exclusions'), { method: 'POST', token: token(), body: { a, b } })));
    });
    app.querySelectorAll('[data-unexclude]').forEach((b) => b.addEventListener('click', () => {
      const [a, c] = b.dataset.unexclude.split('|');
      act(b, async () => applyState(await api(path('/exclusions'), { method: 'DELETE', token: token(), body: { a, b: c } })));
    }));
    app.querySelectorAll('[data-remove]').forEach((b) => b.addEventListener('click', () => {
      if (!confirm(`Remove ${b.dataset.name} from this Secret Santa?`)) return;
      act(b, async () => applyState(await api(path('/members/' + encodeURIComponent(b.dataset.remove)), { method: 'DELETE', token: token() })));
    }));
    on('addPerson', 'submit', (e) => {
      e.preventDefault();
      const input = document.getElementById('addName');
      const name = input.value.trim();
      if (!name) return;
      act(e.submitter, async () => {
        const r = await api(path('/members'), { method: 'POST', token: token(), body: { name } });
        const link = groupUrl + '#k=' + r.token;
        input.value = '';
        lastJson = '';
        await load();
        const box = document.getElementById('addedLink');
        if (box) {
          box.innerHTML = `<div class="note-box" style="margin-top:10px">Personal link for <b>${esc(name)}</b>. Send or print it for them only. It's shown once:<div class="share-link" style="background:#fff"><code>${esc(link)}</code><button class="btn small" id="copyAdded">Copy</button></div></div>`;
          on('copyAdded', 'click', async () => toast((await copyText(link)) ? 'Copied' : link));
        }
      });
    });
    on('saveDetails', 'click', (e) => act(e.target, async () => {
      let s = await api(path(), { method: 'PATCH', token: token(), body: {
        name: document.getElementById('edName').value,
        budget: document.getElementById('edBudget').value,
        date: document.getElementById('edDate').value,
        note: document.getElementById('edNote').value,
      } });
      const part = document.getElementById('edPart').checked;
      if (part !== state.me.participates) s = await api(path('/me'), { method: 'PATCH', token: token(), body: { participates: part } });
      applyState(s); toast('Saved');
    }));
    on('deleteEx', 'click', (e) => {
      if (!confirm('Delete this Secret Santa for everyone? This cannot be undone.')) return;
      act(e.target, async () => { await api(path(), { method: 'DELETE', token: token() }); Store.remove(id); location.href = '/'; });
    });
    const sendMsg = (formId, inputId, to) => on(formId, 'submit', (e) => {
      e.preventDefault();
      const input = document.getElementById(inputId);
      const body = input.value.trim();
      if (!body) return;
      act(e.submitter, async () => {
        await api(path('/messages'), { method: 'POST', token: token(), body: { to, body } });
        input.value = '';
        await loadMessages();
      });
    });
    sendMsg('composeGiftee', 'msgGiftee', 'giftee');
    sendMsg('composeSanta', 'msgSanta', 'santa');
  }

  load();
  setInterval(() => { if (!document.hidden && !busy) load(); }, 12000);
  document.addEventListener('visibilitychange', () => { if (!document.hidden) load(); });
})();
