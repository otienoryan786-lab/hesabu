(() => {
'use strict';
const KEY = 'hesabu:v1';
const day = n => { const d = new Date(Date.now() + n * 864e5); return new Date(d - d.getTimezoneOffset() * 6e4).toISOString().slice(0, 10); };
const fmt = n => 'KES ' + Number(n || 0).toLocaleString('en-KE');
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const uid = () => Math.random().toString(36).slice(2, 9);
const $ = s => document.querySelector(s);

const demo = () => ({
  vehicles: [
    { id: 'v1', plate: 'KMDK 214A', driver: 'Brian', target: 1000 },
    { id: 'v2', plate: 'KDG 508C', driver: 'Wanjiku', target: 1000 },
    { id: 'v3', plate: 'KCX 771T', driver: 'Kamau', target: 1500 }
  ],
  entries: [
    { id: 'd1', vehicleId: 'v2', date: day(-1), paid: 800, method: 'M-Pesa', deductions: [], status: 'agreed' },
    { id: 'd2', vehicleId: 'v1', date: day(0), paid: 1000, method: 'Cash', deductions: [], status: 'pending' },
    { id: 'd3', vehicleId: 'v2', date: day(0), paid: 600, method: 'Cash', status: 'pending',
      deductions: [{ type: 'Repair', amount: 300, reason: 'Puncture', ref: 'Receipt 0412' }] }
  ]
});

let S = { mode: 'demo', role: 'owner', demo: demo(), mine: { vehicles: [], entries: [] } };
try { const r = JSON.parse(localStorage.getItem(KEY)); if (r && r.demo && r.mine) S = r; } catch (e) { /* first run */ }
const save = () => { try { localStorage.setItem(KEY, JSON.stringify(S)); } catch (e) { /* storage unavailable */ } };
const D = () => S[S.mode];

const live = () => D().entries.filter(e => !e.superseded);
const sumDed = e => (e.deductions || []).reduce((a, d) => a + d.amount, 0);
const covered = e => e.paid + sumDed(e);
const cur = v => live().find(e => e.vehicleId === v.id && e.date === day(0));
const arrears = v => live().filter(e => e.vehicleId === v.id && e.date < day(0))
  .reduce((a, e) => a + Math.max(0, v.target - covered(e)), 0);

function render() {
  const owner = S.role === 'owner', d = D();
  $('#role').textContent = owner ? 'Owner view' : 'Driver view';
  $('#role').setAttribute('aria-pressed', String(!owner));
  $('#mode').textContent = S.mode === 'demo' ? 'Demo data' : 'My data';
  $('#mode').setAttribute('aria-pressed', String(S.mode === 'demo'));
  const exp = d.vehicles.reduce((a, v) => a + v.target, 0);
  const got = d.vehicles.reduce((a, v) => { const e = cur(v); return a + (e ? covered(e) : 0); }, 0);
  const pct = exp ? Math.min(100, Math.round(got / exp * 100)) : 0;
  let h = `<p class="day">${new Date().toLocaleDateString('en-KE', { weekday: 'long', day: 'numeric', month: 'long' })}</p>`;
  if (S.mode === 'demo') h += `<p class="banner">Demo data. Switch to My data to add your own vehicles.</p>`;
  if (!owner) h += `<p class="banner">Driver view shows what each driver sees. Agree only if the record matches what happened.</p>`;
  if (!d.vehicles.length) {
    h += `<section class="empty"><h2>No vehicles yet</h2><p>Add a vehicle and its daily hesabu to start recording.</p></section>`;
  } else {
    h += `<section class="summary" aria-label="Today"><div class="sub" style="color:#cfe6d8">Today's hesabu</div>
      <div class="big">${fmt(got)} <span>of ${fmt(exp)}</span></div>
      <div class="bar" role="progressbar" aria-valuenow="${pct}" aria-valuemin="0" aria-valuemax="100"><i style="width:${pct}%"></i></div></section>
      <div class="list">${d.vehicles.map(card).join('')}</div>`;
  }
  if (owner) h += `<button class="btn fab" data-act="add" type="button">Add vehicle</button>`;
  $('#app').innerHTML = h;
}

function card(v) {
  const e = cur(v), cov = e ? covered(e) : 0, owner = S.role === 'owner';
  const st = !e ? 'none' : cov >= v.target ? 'paid' : 'short';
  const label = { none: 'Not yet', paid: 'Paid', short: 'Short' }[st];
  const ar = arrears(v);
  let h = `<article class="card ${st}"><div class="row"><div><h3>${esc(v.plate)}</h3>
    <p class="sub">${esc(v.driver)}, hesabu ${fmt(v.target)}</p></div><span class="tag s-${st}">${label}</span></div>
    <p class="big">${fmt(cov)} <span>of ${fmt(v.target)}</span></p>`;
  if (ar) h += `<p class="note warn">Arrears carried: ${fmt(ar)}</p>`;
  if (e) {
    h += `<p class="note">Paid ${fmt(e.paid)} by ${esc(e.method)}`;
    (e.deductions || []).forEach(x => { h += `<br>${esc(x.type)} deducted ${fmt(x.amount)}: ${esc(x.reason)}`; });
    h += `</p><p class="ent e-${e.status}">${{ pending: 'Waiting for driver to agree', agreed: 'Agreed by both. Locked.', disputed: 'Disputed by driver' }[e.status]}</p>`;
    if (e.note) h += `<p class="note">Driver note: ${esc(e.note)}</p>`;
  } else if (!owner) h += `<p class="note">Waiting for the owner to record today.</p>`;
  h += `<div class="acts">`;
  if (owner && (!e || e.status !== 'agreed')) h += `<button class="btn" data-act="rec" data-id="${v.id}" type="button">${e ? 'Correct record' : 'Record today'}</button>`;
  if (!owner && e && e.status === 'pending') h += `<button class="btn" data-act="agree" data-id="${e.id}" type="button">Agree</button>
    <button class="btn bad" data-act="dispute" data-id="${e.id}" type="button">Dispute</button>`;
  return h + `</div></article>`;
}

function open(html) {
  const s = $('#sheet'); s.innerHTML = `<div class="panel" role="dialog" aria-modal="true">${html}</div>`; s.hidden = false;
  const f = s.querySelector('input,select,button'); if (f) f.focus();
}
const close = () => { $('#sheet').hidden = true; $('#sheet').innerHTML = ''; };

function recordSheet(vid) {
  const v = D().vehicles.find(x => x.id === vid), old = cur(v);
  const t = v.target, opts = [t, Math.round(t * .8), Math.round(t * .5)];
  open(`<h2>${esc(v.plate)}, ${esc(v.driver)}</h2><p class="sub">Hesabu today: ${fmt(t)}</p>
  <label for="paid">Amount paid</label>
  <div class="chips">${opts.map(o => `<button class="chip" type="button" data-pay="${o}" aria-pressed="false">${o.toLocaleString('en-KE')}</button>`).join('')}</div>
  <input id="paid" type="number" min="0" inputmode="numeric" value="${old ? old.paid : ''}" placeholder="Other amount">
  <label for="method">Paid by</label><select id="method"><option>Cash</option><option>M-Pesa</option></select>
  <label for="dtype">Deduction, if any</label>
  <div class="two"><select id="dtype"><option value="">None</option><option>Repair</option><option>Fuel</option><option>Other</option></select>
  <input id="damt" type="number" min="0" inputmode="numeric" placeholder="Amount"></div>
  <label for="dreason">Reason</label><input id="dreason" maxlength="60" placeholder="What was it for?">
  <label for="dref">Receipt or M-Pesa code</label><input id="dref" maxlength="30">
  <div class="sum" aria-live="polite"><div><span>Paid to owner</span><b id="s1"></b></div><div><span>Deductions</span><b id="s2"></b></div>
  <div class="t"><span>Still owed</span><b id="s3"></b></div></div><p class="err" id="err"></p>
  <button class="btn full" data-act="save" data-id="${v.id}" type="button">Send to driver</button>
  <div class="acts"><button class="btn alt full" data-act="close" type="button">Cancel</button></div>`);
  const calc = () => {
    const p = +$('#paid').value || 0, x = $('#dtype').value ? (+$('#damt').value || 0) : 0;
    $('#s1').textContent = fmt(p); $('#s2').textContent = fmt(x); $('#s3').textContent = fmt(Math.max(0, t - p - x));
  };
  $('#sheet').oninput = calc; calc();
}

function saveRecord(vid) {
  const v = D().vehicles.find(x => x.id === vid), old = cur(v);
  const paid = Math.round(+$('#paid').value), type = $('#dtype').value, amt = Math.round(+$('#damt').value || 0);
  const err = m => { $('#err').textContent = m; };
  if (!(paid >= 0) || $('#paid').value === '') return err('Enter the amount paid. Use 0 if nothing was paid.');
  if (type && amt <= 0) return err('Enter the deduction amount, or choose None.');
  if (type && !$('#dreason').value.trim()) return err('Add a short reason so the driver can check it.');
  const e = { id: uid(), vehicleId: vid, date: day(0), paid, method: $('#method').value, status: 'pending',
    deductions: type ? [{ type, amount: amt, reason: $('#dreason').value.trim(), ref: $('#dref').value.trim() }] : [] };
  if (old) { old.superseded = true; e.replaces = old.id; }
  D().entries.push(e); save(); close(); render();
}

function setStatus(id, status, note) {
  const e = D().entries.find(x => x.id === id);
  if (!e || e.status === 'agreed') return;
  e.status = status; e.note = note || ''; e.decidedAt = new Date().toISOString(); save(); close(); render();
}

function addSheet() {
  open(`<h2>Add vehicle</h2><label for="plate">Number plate</label><input id="plate" maxlength="12" placeholder="KAB 123C" autocapitalize="characters">
  <label for="drv">Driver name</label><input id="drv" maxlength="40">
  <label for="tgt">Daily hesabu (KES)</label><input id="tgt" type="number" min="1" inputmode="numeric">
  <p class="err" id="err"></p><button class="btn full" data-act="addsave" type="button">Save vehicle</button>
  <div class="acts"><button class="btn alt full" data-act="close" type="button">Cancel</button></div>`);
}

document.addEventListener('click', ev => {
  const b = ev.target.closest('button'); if (!b) return;
  if (b.dataset.pay) { $('#paid').value = b.dataset.pay; $('#sheet').dispatchEvent(new Event('input')); return; }
  const a = b.dataset.act, id = b.dataset.id;
  if (b.id === 'role') { S.role = S.role === 'owner' ? 'driver' : 'owner'; save(); render(); }
  else if (b.id === 'mode') { S.mode = S.mode === 'demo' ? 'mine' : 'demo'; save(); render(); }
  else if (a === 'add') addSheet();
  else if (a === 'rec') recordSheet(id);
  else if (a === 'save') saveRecord(id);
  else if (a === 'agree') setStatus(id, 'agreed');
  else if (a === 'dispute') open(`<h2>Dispute this record</h2><p class="sub">Say what does not match. The owner will see your note and can correct the record.</p>
    <label for="dn">What is wrong?</label><input id="dn" maxlength="120"><p class="err" id="err"></p>
    <button class="btn bad full" data-act="dsend" data-id="${id}" type="button">Send dispute</button>
    <div class="acts"><button class="btn alt full" data-act="close" type="button">Cancel</button></div>`);
  else if (a === 'dsend') { const n = $('#dn').value.trim(); if (!n) return ($('#err').textContent = 'Add a short note so the owner knows what to check.'); setStatus(id, 'disputed', n); }
  else if (a === 'addsave') {
    const plate = $('#plate').value.trim().toUpperCase(), driver = $('#drv').value.trim(), target = Math.round(+$('#tgt').value);
    if (!plate || !driver || !(target > 0)) return ($('#err').textContent = 'Fill in the plate, the driver name and a hesabu above 0.');
    D().vehicles.push({ id: uid(), plate, driver, target }); save(); close(); render();
  } else if (a === 'close') close();
});
$('#sheet').addEventListener('click', ev => { if (ev.target.id === 'sheet') close(); });
document.addEventListener('keydown', ev => { if (ev.key === 'Escape') close(); });
render();
})();
