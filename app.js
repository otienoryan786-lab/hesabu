(() => {
'use strict';
const KEY = 'hesabu:v2';
const day = n => { const d = new Date(Date.now() + n * 864e5); return new Date(d - d.getTimezoneOffset() * 6e4).toISOString().slice(0, 10); };
const fmt = n => 'KES ' + Number(n || 0).toLocaleString('en-KE');
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const uid = () => Math.random().toString(36).slice(2, 9);
const $ = s => document.querySelector(s);
const sum = a => a.reduce((t, x) => t + x.amount, 0);
const okp = p => typeof p === 'string' && /^data:image\/jpeg;base64,[A-Za-z0-9+/=]+$/.test(p);
const phone = p => { let d = String(p || '').replace(/\D/g, ''); if (d.startsWith('0')) d = '254' + d.slice(1); return /^254\d{9}$/.test(d) ? d : ''; };

const demo = () => ({
  vehicles: [
    { id: 'v1', plate: 'KMDK 214A', driver: 'Brian', phone: '', target: 1000, since: day(-1) },
    { id: 'v2', plate: 'KDG 508C', driver: 'Wanjiku', phone: '0700000000', target: 1000, since: day(-1) },
    { id: 'v3', plate: 'KCX 771T', driver: 'Kamau', phone: '', target: 1500, since: day(-1), off: 0 }
  ],
  entries: [
    { id: 'd0', vehicleId: 'v1', date: day(-1), paid: 1000, method: 'Cash', ref: '', status: 'agreed' },
    { id: 'd1', vehicleId: 'v2', date: day(-1), paid: 800, method: 'M-Pesa', ref: '', status: 'agreed' },
    { id: 'd2', vehicleId: 'v1', date: day(0), paid: 1000, method: 'Cash', ref: '', status: 'pending' },
    { id: 'd3', vehicleId: 'v2', date: day(0), paid: 600, method: 'Cash', ref: '', status: 'pending' }
  ],
  expenses: [
    { id: 'x1', vehicleId: 'v2', date: day(0), type: 'Repair', amount: 300, reason: 'Puncture', ref: '', photo: '', paidBy: 'driver', status: 'requested' },
    { id: 'x2', vehicleId: 'v1', date: day(-3), type: 'Insurance', amount: 1200, reason: 'Monthly cover', ref: '', photo: '', paidBy: 'owner', status: 'approved' }
  ]
});

const ID = /^\w{1,12}$/, DT = /^\d{4}-\d\d-\d\d$/;
const goodSet = s => !!s && ['vehicles', 'entries', 'expenses'].every(k => Array.isArray(s[k]))
  && s.vehicles.every(v => ID.test(v.id) && Number.isFinite(v.target) && (v.since == null || DT.test(v.since)) && (v.off == null || Number.isInteger(v.off)))
  && s.entries.every(e => ID.test(e.id) && ID.test(e.vehicleId) && Number.isFinite(e.paid) && DT.test(e.date) && ['pending', 'agreed', 'disputed'].includes(e.status))
  && s.expenses.every(x => ID.test(x.id) && ID.test(x.vehicleId) && Number.isFinite(x.amount) && DT.test(x.date) && ['requested', 'approved', 'rejected'].includes(x.status) && ['driver', 'owner'].includes(x.paidBy));
const goodState = r => !!r && goodSet(r.demo) && goodSet(r.mine) && ['demo', 'mine'].includes(r.mode) && ['owner', 'driver'].includes(r.role);
let S = { mode: 'demo', role: 'owner', view: 'today', demo: demo(), mine: { vehicles: [], entries: [], expenses: [] } };
try { const r = JSON.parse(localStorage.getItem(KEY)); if (goodState(r)) S = r; } catch (e) { /* first run */ }
const qm = new URLSearchParams(location.search).get('mode');
if (qm === 'demo' || qm === 'mine') { S.mode = qm; S.view = 'today'; history.replaceState(null, '', location.pathname); }
const save = () => { try { localStorage.setItem(KEY, JSON.stringify(S)); } catch (e) { alert('Browser storage is full, so this change may not be saved.'); } };
const D = () => S[S.mode];

const live = () => D().entries.filter(e => !e.superseded);
const entOn = (v, d) => live().find(e => e.vehicleId === v.id && e.date === d);
const dedOn = (v, d) => sum(D().expenses.filter(x => x.vehicleId === v.id && x.date === d && x.paidBy === 'driver' && x.status === 'approved'));
const covOn = (v, d) => (entOn(v, d) ? entOn(v, d).paid : 0) + dedOn(v, d);
const wd = d => new Date(d + 'T00:00:00').getDay();
const isOff = (v, d) => Number.isInteger(v.off) && v.off === wd(d);
const since = v => v.since || D().entries.filter(e => e.vehicleId === v.id).map(e => e.date).sort()[0] || day(0);
const arrears = v => {
  let a = 0; const n = Math.min(400, Math.round((Date.parse(day(0)) - Date.parse(since(v))) / 864e5));
  for (let i = 1; i <= n; i++) { const d = day(-i); if (!isOff(v, d)) a += Math.max(0, v.target - covOn(v, d)); }
  return a;
};

function render() {
  const owner = S.role === 'owner', d = D(), t = day(0);
  $('#role').textContent = owner ? 'Owner view' : 'Driver view';
  $('#role').setAttribute('aria-pressed', String(!owner));
  $('#mode').textContent = S.mode === 'demo' ? 'Demo data' : 'My data';
  $('#mode').setAttribute('aria-pressed', String(S.mode === 'demo'));
  const tabs = `<nav class="tabs" aria-label="Sections">${[['today', 'Today'], ['records', 'Records']].map(([k, n]) => `<button class="tab" data-view="${k}" type="button" aria-pressed="${(S.view || 'today') === k}">${n}</button>`).join('')}</nav>`;
  if (S.view === 'records') { $('#app').innerHTML = tabs + records(); return; }
  const exp = sum(d.vehicles.map(v => ({ amount: isOff(v, t) ? 0 : v.target })));
  const got = sum(d.vehicles.map(v => ({ amount: covOn(v, t) })));
  const pct = exp ? Math.min(100, Math.round(got / exp * 100)) : 0;
  const pend = d.expenses.filter(x => x.status === 'requested').length;
  let h = tabs + `<p class="day">${new Date().toLocaleDateString('en-KE', { weekday: 'long', day: 'numeric', month: 'long' })}</p>`;
  if (S.mode === 'demo') h += `<p class="banner">Demo data. Switch to My data to add your own vehicles.</p>`;
  if (!owner) h += `<p class="banner">Driver view shows what each driver sees. Agree only if the record matches what happened.</p>`;
  if (owner && pend) h += `<p class="banner">${pend} deduction${pend > 1 ? 's' : ''} waiting for your approval. Check the receipt before you approve.</p>`;
  if (!d.vehicles.length) {
    h += `<section class="empty"><h2>No vehicles yet</h2><p>Add a vehicle and its daily hesabu to start recording.</p></section>`;
  } else {
    h += `<section class="summary" aria-label="Today"><div class="sub" style="color:#cfe6d8">Today's hesabu</div>
      <div class="big">${fmt(got)} <span>of ${fmt(exp)}</span></div>
      <div class="bar" role="progressbar" aria-valuenow="${pct}" aria-valuemin="0" aria-valuemax="100"><i style="width:${pct}%"></i></div></section>
      <div class="list">${d.vehicles.map(card).join('')}</div>${owner ? report() : ''}`;
  }
  if (owner) h += `<button class="btn fab" data-act="add" type="button">Add vehicle</button>`;
  $('#app').innerHTML = h;
}

const xline = (x, owner) => `<li>${okp(x.photo) ? `<button class="thumbb" data-act="photo" data-id="${x.id}" type="button" aria-label="View receipt photo"><img class="thumb" src="${x.photo}" alt=""></button>` : ''}
  <div><b>${esc(x.type)} ${fmt(x.amount)}</b> <span class="note">paid by ${x.paidBy}</span><br>
  <span class="note">${esc(x.reason)}${x.ref ? ', code ' + esc(x.ref) : ''}</span><br>
  <span class="ent e-${{ requested: 'pending', approved: 'agreed', rejected: 'disputed' }[x.status]}">${{ requested: 'Waiting for owner approval', approved: 'Approved by owner', rejected: 'Rejected by owner' }[x.status]}</span>
  ${owner && x.status === 'requested' ? `<div class="acts"><button class="btn" data-act="xok" data-id="${x.id}" type="button">Approve</button><button class="btn bad" data-act="xno" data-id="${x.id}" type="button">Reject</button></div>` : ''}</div></li>`;

function card(v) {
  const t = day(0), e = entOn(v, t), cov = covOn(v, t), owner = S.role === 'owner';
  const st = !e && !cov ? 'none' : cov >= v.target ? 'paid' : 'short';
  const label = st === 'none' && isOff(v, t) ? 'Rest day' : { none: 'Not yet', paid: 'Paid', short: 'Short' }[st];
  const ar = arrears(v), xs = D().expenses.filter(x => x.vehicleId === v.id && x.date === t);
  let h = `<article class="card ${st}"><div class="row"><div><h3>${esc(v.plate)}</h3>
    <p class="sub">${esc(v.driver)}, hesabu ${fmt(v.target)}</p></div><span class="tag s-${st}">${label}</span></div>
    <p class="big">${fmt(cov)} <span>of ${fmt(v.target)}</span></p>`;
  if (ar) h += `<p class="note warn">Arrears, including missed days: ${fmt(ar)}</p>`;
  if (e) {
    h += `<p class="note">Paid ${fmt(e.paid)} by ${esc(e.method)}${e.ref ? ', code ' + esc(e.ref) : ''}</p>
    <p class="ent e-${e.status}">${{ pending: 'Waiting for driver to agree', agreed: 'Agreed by both. Locked.', disputed: 'Disputed by driver' }[e.status]}</p>`;
    if (e.note) h += `<p class="note">Driver note: ${esc(e.note)}</p>`;
  } else if (!owner) h += `<p class="note">Waiting for the owner to record today.</p>`;
  if (xs.length) h += `<ul class="lines">${xs.map(x => xline(x, owner)).join('')}</ul>`;
  h += `<div class="acts">`;
  if (owner) {
    if (!e || e.status !== 'agreed') h += `<button class="btn" data-act="rec" data-id="${v.id}" type="button">${e ? 'Correct record' : 'Record today'}</button>`;
    h += `<button class="btn alt" data-act="exp" data-id="${v.id}" type="button">Add a cost</button>`;
    const p = phone(v.phone);
    if (p && cov < v.target && !isOff(v, t)) {
      const msg = `Hi ${v.driver}, friendly reminder: today's hesabu for ${v.plate} is ${fmt(v.target)}. Still owed: ${fmt(v.target - cov)}. Please send it and confirm. Thank you.`;
      h += `<a class="btn alt" href="https://wa.me/${p}?text=${encodeURIComponent(msg)}" target="_blank" rel="noopener">Remind on WhatsApp</a>`;
    }
  } else {
    if (e && e.status === 'pending') h += `<button class="btn" data-act="agree" data-id="${e.id}" type="button">Agree</button><button class="btn bad" data-act="dispute" data-id="${e.id}" type="button">Dispute</button>`;
    h += `<button class="btn alt" data-act="exp" data-id="${v.id}" type="button">Request a deduction</button>`;
  }
  return h + `</div></article>`;
}

function report() {
  const d = D(), from = day(-29);
  return `<section class="rep"><h2>Last 30 days</h2><p class="sub">Net earned is cash received minus costs the owner paid.</p><div class="list">${d.vehicles.map(v => {
    const cash = sum(live().filter(e => e.vehicleId === v.id && e.date >= from).map(e => ({ amount: e.paid })));
    const xs = d.expenses.filter(x => x.vehicleId === v.id && x.date >= from && x.status === 'approved');
    const own = sum(xs.filter(x => x.paidBy === 'owner')), drv = sum(xs.filter(x => x.paidBy === 'driver'));
    const rep = sum(xs.filter(x => x.type === 'Repair' || x.type === 'Tyre')), earn = cash + drv, pct = earn ? Math.round(rep / earn * 100) : 0;
    return `<article class="card paid"><h3>${esc(v.plate)}</h3><div class="stat"><div><b>${fmt(cash)}</b><span>Cash received</span></div>
      <div><b>${fmt(own)}</b><span>Paid by owner</span></div><div><b>${fmt(cash - own)}</b><span>Net earned</span></div></div>
      ${pct >= 25 ? `<p class="note warn">Repairs and tyres took ${pct}% of earnings. Check this vehicle.</p>` : ''}</article>`;
  }).join('')}</div></section>`;
}

const code = s => { let h = 5381; for (const c of s) h = (h * 33 ^ c.charCodeAt(0)) >>> 0; return 'HSB-' + h.toString(36).toUpperCase().padStart(5, '0').slice(-5); };
function stats(v, from) {
  const all = D().entries.filter(e => e.vehicleId === v.id && e.date >= from);
  const ag = all.filter(e => !e.superseded && e.status === 'agreed'), dis = all.filter(e => e.status === 'disputed');
  return { days: ag.length, full: ag.filter(e => covOn(v, e.date) >= v.target).length, raised: dis.length, solved: dis.filter(e => e.superseded).length,
    wait: all.filter(e => !e.superseded && e.status !== 'agreed').length, cash: sum(ag.map(e => ({ amount: e.paid }))),
    ded: sum(D().expenses.filter(x => x.vehicleId === v.id && x.date >= from && x.paidBy === 'driver' && x.status === 'approved')) };
}

function records() {
  const d = D(), from = day(-89), owner = S.role === 'owner';
  if (!d.vehicles.length) return `<section class="empty"><h2>No records yet</h2><p>Add a vehicle on the Today page. A record builds as days are agreed.</p></section>${recordTools()}`;
  return `<h2>Hesabu Records</h2><p class="sub">The last 90 days. Only days both sides agreed are counted.</p><div class="list">${d.vehicles.map(v => {
    const s = stats(v, from), pct = s.days ? Math.round(s.full / s.days * 100) : 0, c = code([v.driver, v.plate, from, s.days, s.full, s.raised, s.solved].join('|'));
    const txt = `Hesabu Record for ${v.driver} (${v.plate}), last 90 days. Agreed days: ${s.days}. Fully paid: ${s.full} (${pct}%). Disputes: ${s.raised} raised, ${s.solved} resolved. Record code: ${c}. Only days both sides agreed are counted.`;
    const w = stats(v, day(-6)), p = phone(v.phone);
    const wk = `Hi ${v.driver}, your week for ${v.plate}: ${w.days} agreed day${w.days === 1 ? '' : 's'}, cash paid ${fmt(w.cash)}, approved deductions ${fmt(w.ded)}, arrears now ${fmt(arrears(v))}. Thank you.`;
    return `<article class="card paid"><h3>${esc(v.driver)}</h3><p class="sub">${esc(v.plate)}</p>
      <div class="stat"><div><b>${s.days}</b><span>Agreed days</span></div><div><b>${pct}%</b><span>Fully paid</span></div><div><b>${s.solved} of ${s.raised}</b><span>Disputes resolved</span></div></div>
      ${s.wait ? `<p class="note">${s.wait} day${s.wait > 1 ? 's' : ''} not counted yet. Waiting for agreement.</p>` : ''}
      <p class="note">Record code <span class="code">${c}</span>. Online checking comes with Phase 2.</p>
      <div class="acts"><a class="btn" href="https://wa.me/?text=${encodeURIComponent(txt)}" target="_blank" rel="noopener">Share record</a>
      ${owner ? `<a class="btn alt" href="https://wa.me/${p}?text=${encodeURIComponent(wk)}" target="_blank" rel="noopener">Send weekly statement</a>` : ''}</div></article>`;
  }).join('')}</div>${recordTools()}`;
}

function recordTools() {
  return `<section class="rep"><h2>Keep your data safe</h2><p class="sub">Records live in this browser. Download a backup often.</p>
    <div class="acts"><button class="btn alt" data-act="backup" type="button">Download backup</button><button class="btn alt" data-act="restore" type="button">Restore backup</button><button class="btn alt" data-act="print" type="button">Print page</button></div></section>`;
}

function backup() {
  const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([JSON.stringify(S)], { type: 'application/json' }));
  a.download = 'hesabu-backup-' + day(0) + '.json'; a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}
function restore() {
  const i = document.createElement('input'); i.type = 'file'; i.accept = 'application/json,.json';
  i.onchange = () => { const f = i.files[0]; if (!f) return; const r = new FileReader();
    r.onload = () => { try { const x = JSON.parse(r.result);
      if (!goodState(x)) throw new Error('bad');
      if (!confirm('Replace everything in this browser with the backup?')) return;
      S = x; save(); render();
    } catch (e) { alert('That file is not a valid Hesabu backup.'); } };
    r.readAsText(f); };
  i.click();
}

function open(html) {
  const s = $('#sheet'); s.innerHTML = `<div class="panel" role="dialog" aria-modal="true">${html}</div>`; s.hidden = false; s.oninput = null;
  const f = s.querySelector('input,select,textarea,button'); if (f) f.focus();
}
const close = () => { $('#sheet').hidden = true; $('#sheet').innerHTML = ''; };
const cancel = `<div class="acts"><button class="btn alt full" data-act="close" type="button">Cancel</button></div>`;

function recordSheet(vid) {
  const t = day(0), v = D().vehicles.find(x => x.id === vid), old = entOn(v, t), tg = v.target;
  open(`<h2>${esc(v.plate)}, ${esc(v.driver)}</h2><p class="sub">Hesabu today: ${fmt(tg)}</p>
  <label for="msg">Paste the M-Pesa message (optional)</label><textarea id="msg" placeholder="Paste the confirmation SMS here"></textarea>
  <button class="btn alt" data-act="fill" type="button">Fill from message</button>
  <label for="paid">Amount paid</label>
  <div class="chips">${[tg, Math.round(tg * .8), Math.round(tg * .5)].map(o => `<button class="chip" type="button" data-pay="${o}">${o.toLocaleString('en-KE')}</button>`).join('')}</div>
  <input id="paid" type="number" min="0" inputmode="numeric" value="${old ? old.paid : ''}" placeholder="Other amount">
  <label for="method">Paid by</label><select id="method"><option${old && old.method === 'Cash' ? ' selected' : ''}>Cash</option><option${old && old.method === 'M-Pesa' ? ' selected' : ''}>M-Pesa</option></select>
  <label for="ref">M-Pesa code</label><input id="ref" maxlength="12" value="${esc(old ? old.ref : '')}" autocapitalize="characters">
  <div class="sum" aria-live="polite"><div><span>Paid to owner</span><b id="s1"></b></div><div><span>Approved deductions</span><b id="s2"></b></div>
  <div class="t"><span>Still owed</span><b id="s3"></b></div></div><p class="err" id="err"></p>
  <button class="btn full" data-act="save" data-id="${v.id}" type="button">Send to driver</button>${cancel}`);
  const calc = () => { const p = +$('#paid').value || 0, x = dedOn(v, t); $('#s1').textContent = fmt(p); $('#s2').textContent = fmt(x); $('#s3').textContent = fmt(Math.max(0, tg - p - x)); };
  $('#sheet').oninput = calc; calc();
}

function fillMsg() {
  const t = $('#msg').value, c = t.match(/\b(?=[A-Z0-9]*\d)[A-Z0-9]{10}\b/), a = t.match(/(?:Ksh|KES)\.?\s?([\d,]+(?:\.\d+)?)/i);
  if (!a) { $('#err').textContent = 'No amount found in the message. Type the amount instead.'; return; }
  $('#err').textContent = ''; $('#paid').value = Math.round(parseFloat(a[1].replace(/,/g, '')));
  $('#method').value = 'M-Pesa'; if (c) $('#ref').value = c[0];
  $('#sheet').dispatchEvent(new Event('input'));
}

function saveRecord(vid) {
  const v = D().vehicles.find(x => x.id === vid), old = entOn(v, day(0)), err = m => { $('#err').textContent = m; };
  const raw = $('#paid').value, paid = Math.round(+raw), ref = $('#ref').value.trim().toUpperCase();
  if (raw === '' || !(paid >= 0)) return err('Enter the amount paid. Use 0 if nothing was paid.');
  const dup = ref && D().entries.find(x => x.ref === ref && !(x.vehicleId === vid && x.date === day(0)));
  if (dup) { const q = D().vehicles.find(z => z.id === dup.vehicleId); return err(`This M-Pesa code was already recorded on ${dup.date} for ${q ? q.plate : 'another vehicle'}.`); }
  const e = { id: uid(), vehicleId: vid, date: day(0), paid, method: $('#method').value, ref, status: 'pending' };
  if (old) { old.superseded = true; e.replaces = old.id; }
  D().entries.push(e); save(); close(); render();
}

function setStatus(id, status, note) {
  const e = D().entries.find(x => x.id === id);
  if (!e || e.status === 'agreed') return;
  e.status = status; e.note = note || ''; e.decidedAt = new Date().toISOString(); save(); close(); render();
}
const setX = (id, st) => { const x = D().expenses.find(q => q.id === id); if (!x || x.status !== 'requested') return; x.status = st; save(); render(); };

function expSheet(vid) {
  const v = D().vehicles.find(x => x.id === vid), o = S.role === 'owner';
  const types = o ? ['Repair', 'Tyre', 'Fuel', 'Insurance', 'Licence', 'SACCO dues', 'Other'] : ['Repair', 'Tyre', 'Fuel', 'Other'];
  open(`<h2>${o ? 'Add a cost' : 'Request a deduction'}</h2><p class="sub">${esc(v.plate)}, ${esc(v.driver)}</p>
  ${o ? '' : '<p class="banner">The owner must approve this before it counts toward your hesabu. Repairs and tyres need a receipt photo.</p>'}
  <label for="xt">Type</label><select id="xt">${types.map(t => `<option>${t}</option>`).join('')}</select>
  <label for="xa">Amount</label><input id="xa" type="number" min="1" inputmode="numeric">
  <label for="xr">What was it for?</label><input id="xr" maxlength="80">
  <label for="xc">Receipt or M-Pesa code</label><input id="xc" maxlength="30">
  <label for="xp">Receipt photo</label><input id="xp" type="file" accept="image/*" capture="environment">
  <p class="err" id="err"></p><button class="btn full" data-act="xsave" data-id="${vid}" type="button">${o ? 'Save cost' : 'Send for approval'}</button>${cancel}`);
}

function shrink(file) {
  return new Promise((res, reject) => {
    const r = new FileReader();
    r.onerror = () => reject(new Error('Could not read the selected image.'));
    r.onabort = () => reject(new Error('Reading the selected image was cancelled.'));
    r.onload = () => {
      const i = new Image(); i.onerror = () => reject(new Error('The selected file is not a readable image.'));
      i.onload = () => {
        try {
          const k = Math.min(1, 720 / Math.max(i.width, i.height)), c = document.createElement('canvas');
          c.width = Math.round(i.width * k); c.height = Math.round(i.height * k);
          const ctx = c.getContext('2d');
          if (!ctx) throw new Error('Image processing is unavailable in this browser.');
          ctx.drawImage(i, 0, 0, c.width, c.height);
          res(c.toDataURL('image/jpeg', .6));
        } catch {
          reject(new Error('Image processing failed.'));
        }
      };
      if (typeof r.result !== 'string') return reject(new Error('Could not read the selected image.'));
      i.src = r.result;
    };
    r.readAsDataURL(file);
  });
}

async function saveExp(vid) {
  const o = S.role === 'owner', type = $('#xt').value, amount = Math.round(+$('#xa').value), reason = $('#xr').value.trim(), f = $('#xp').files[0];
  const err = m => { $('#err').textContent = m; };
  if (!(amount > 0)) return err('Enter the amount.');
  if (!reason) return err('Say what it was for so the owner can check it.');
  if (!o && !f && (type === 'Repair' || type === 'Tyre')) return err('Add a photo of the receipt for repairs and tyres.');
  const submit = $('#sheet [data-act="xsave"]');
  submit.disabled = true;
  let photo = '';
  try {
    if (f) photo = await shrink(f);
  } catch {
    submit.disabled = false;
    return err('Could not process that receipt photo. Try a different image.');
  }
  D().expenses.push({ id: uid(), vehicleId: vid, date: day(0), type, amount, reason, ref: $('#xc').value.trim(), photo, paidBy: o ? 'owner' : 'driver', status: o ? 'approved' : 'requested' });
  save(); close(); render();
}

function addSheet() {
  open(`<h2>Add vehicle</h2><label for="plate">Number plate</label><input id="plate" maxlength="12" placeholder="KAB 123C" autocapitalize="characters">
  <label for="drv">Driver name</label><input id="drv" maxlength="40">
  <label for="ph">Driver phone, for reminders (optional)</label><input id="ph" type="tel" maxlength="15" placeholder="0712 345 678">
  <label for="tgt">Daily hesabu (KES)</label><input id="tgt" type="number" min="1" inputmode="numeric">
  <label for="off">Rest day (no hesabu due)</label><select id="off"><option value="">None, works every day</option><option value="0">Sunday</option><option value="1">Monday</option><option value="2">Tuesday</option><option value="3">Wednesday</option><option value="4">Thursday</option><option value="5">Friday</option><option value="6">Saturday</option></select>
  <p class="err" id="err"></p><button class="btn full" data-act="addsave" type="button">Save vehicle</button>${cancel}`);
}

document.addEventListener('click', ev => {
  const b = ev.target.closest('button'); if (!b) return;
  if (b.dataset.pay) { $('#paid').value = b.dataset.pay; $('#sheet').dispatchEvent(new Event('input')); return; }
  if (b.dataset.view) { S.view = b.dataset.view; save(); render(); return; }
  const a = b.dataset.act, id = b.dataset.id;
  if (b.id === 'role') { S.role = S.role === 'owner' ? 'driver' : 'owner'; save(); render(); }
  else if (b.id === 'mode') { S.mode = S.mode === 'demo' ? 'mine' : 'demo'; save(); render(); }
  else if (a === 'add') addSheet();
  else if (a === 'rec') recordSheet(id);
  else if (a === 'fill') fillMsg();
  else if (a === 'save') saveRecord(id);
  else if (a === 'exp') expSheet(id);
  else if (a === 'xsave') saveExp(id);
  else if (a === 'xok') setX(id, 'approved');
  else if (a === 'xno') setX(id, 'rejected');
  else if (a === 'photo') { const x = D().expenses.find(q => q.id === id); if (x && okp(x.photo)) open(`<div class="view"><img src="${x.photo}" alt="Receipt photo"></div>${cancel}`); }
  else if (a === 'agree') setStatus(id, 'agreed');
  else if (a === 'dispute') open(`<h2>Dispute this record</h2><p class="sub">Say what does not match. The owner will see your note and can correct the record.</p>
    <label for="dn">What is wrong?</label><input id="dn" maxlength="120"><p class="err" id="err"></p>
    <button class="btn bad full" data-act="dsend" data-id="${id}" type="button">Send dispute</button>${cancel}`);
  else if (a === 'dsend') { const n = $('#dn').value.trim(); if (!n) { $('#err').textContent = 'Add a short note so the owner knows what to check.'; return; } setStatus(id, 'disputed', n); }
  else if (a === 'addsave') {
    const plate = $('#plate').value.trim().toUpperCase(), driver = $('#drv').value.trim(), target = Math.round(+$('#tgt').value), ph = $('#ph').value.trim();
    if (!plate || !driver || !(target > 0)) { $('#err').textContent = 'Fill in the plate, the driver name and a hesabu above 0.'; return; }
    if (ph && !phone(ph)) { $('#err').textContent = 'That phone number looks wrong. Use a Kenyan number like 0712 345 678.'; return; }
    D().vehicles.push({ id: uid(), plate, driver, phone: ph, target, off: $('#off').value === '' ? null : +$('#off').value, since: day(0) }); save(); close(); render();
  } else if (a === 'backup') backup();
  else if (a === 'restore') restore();
  else if (a === 'print') window.print();
  else if (a === 'close') close();
});
$('#sheet').addEventListener('click', ev => { if (ev.target.id === 'sheet') close(); });
document.addEventListener('keydown', ev => { if (ev.key === 'Escape') close(); });
render();
})();
