(function () {
  const form = document.getElementById('createForm');
  const errEl = document.getElementById('createError');
  const btn = document.getElementById('createBtn');
  const d = new Date();
  document.getElementById('date').min = new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 10);

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    errEl.textContent = '';
    const name = document.getElementById('exName').value.trim();
    const organizerName = document.getElementById('orgName').value.trim();
    if (!name) { errEl.textContent = 'Give your group a name.'; document.getElementById('exName').focus(); return; }
    if (!organizerName) { errEl.textContent = 'Type your name.'; document.getElementById('orgName').focus(); return; }
    btn.disabled = true; btn.textContent = 'Creating…';
    try {
      const r = await api('/exchanges', {
        method: 'POST',
        body: {
          name, organizerName,
          budget: document.getElementById('budget').value.trim(),
          date: document.getElementById('date').value,
          participates: document.getElementById('participates').checked,
        },
      });
      Store.set(r.id, { token: r.token, name, at: Date.now(), fresh: true });
      location.href = '/g/' + r.id;
    } catch (ex) {
      errEl.textContent = ex.message;
      btn.disabled = false; btn.textContent = 'Create the group link';
    }
  });

  const mine = Store.all();
  if (mine.length) {
    document.getElementById('mine').classList.remove('hide');
    document.getElementById('mineList').innerHTML = mine.slice(0, 8)
      .map((m) => `<a href="/g/${encodeURIComponent(m.id)}">${esc(m.name || 'Secret Santa')}<span>Open →</span></a>`).join('');
  }
})();
