/* Moonbeam demo: shared helpers. Nothing typed here is saved or sent anywhere. */
(function () {
  const $ = (s, r = document) => r.querySelector(s)
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s))
  const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]))
  const money = n => '$' + (Math.round(n * 100) / 100).toFixed(n % 1 ? 2 : 0)
  const money2 = n => '$' + n.toFixed(2)
  const cfg = window.MB_CONFIG || {}

  const ICON = {
    check: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg>',
    phone: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1.9.4 1.8.7 2.7a2 2 0 0 1-.5 2.1L8 9.8a16 16 0 0 0 6 6l1.3-1.3a2 2 0 0 1 2.1-.4c.9.3 1.8.6 2.7.7a2 2 0 0 1 1.7 2z"/></svg>',
    lock: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/></svg>',
    wallet: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><rect x="3" y="6" width="18" height="13" rx="2"/><path d="M3 10h18M16 15h2"/></svg>',
    card: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><rect x="2" y="5" width="20" height="14" rx="2"/><path d="M2 10h20"/></svg>'
  }

  /* ---------- Season hours (same as the AI receptionist knowledge base) ---------- */
  const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
  // [open, close] in minutes, or null = closed. Index = day of week (0 Sun).
  const SEASONS = [
    { name: 'Ski season', from: [11, 20], to: [4, 5], week: [[450, 1080], [480, 1080], [480, 1080], [480, 1080], [480, 1080], [480, 1140], [450, 1140]] },
    { name: 'Mud season', from: [4, 6], to: [5, 15], week: [[600, 1020], [600, 1020], null, null, [600, 1020], [600, 1020], [600, 1020]] },
    { name: 'Summer', from: [5, 16], to: [9, 15], week: Array(7).fill([540, 1080]) },
    { name: 'Foliage', from: [9, 16], to: [11, 10], week: Array(7).fill([540, 1050]) },
    { name: 'Tune-up season', from: [11, 11], to: [11, 19], week: [[600, 1020], null, null, [600, 1020], [600, 1020], [600, 1020], [600, 1020]] }
  ]
  const md = d => (d.getMonth() + 1) * 100 + d.getDate()
  function seasonOf(d) {
    const x = md(d)
    return SEASONS.find(s => {
      const a = s.from[0] * 100 + s.from[1], b = s.to[0] * 100 + s.to[1]
      return a <= b ? x >= a && x <= b : x >= a || x <= b
    }) || SEASONS[0]
  }
  const t12 = m => { const h = Math.floor(m / 60), mm = m % 60; const ap = h >= 12 ? 'PM' : 'AM'; const hh = ((h + 11) % 12) + 1; return hh + (mm ? ':' + String(mm).padStart(2, '0') : '') + ' ' + ap }
  // NH time
  function nhNow() {
    try { return new Date(new Date().toLocaleString('en-US', { timeZone: 'America/New_York' })) } catch (e) { return new Date() }
  }
  function isHoliday(d) { const x = md(d); return x === 1225 || (d.getMonth() === 10 && d.getDay() === 4 && d.getDate() >= 22 && d.getDate() <= 28) }
  function status(d = nhNow()) {
    const s = seasonOf(d), h = isHoliday(d) ? null : s.week[d.getDay()], m = d.getHours() * 60 + d.getMinutes()
    if (h && m >= h[0] && m < h[1]) return { open: true, text: 'Open now', sub: 'until ' + t12(h[1]), season: s.name }
    // next opening
    for (let i = 0; i < 8; i++) {
      const n = new Date(d); n.setDate(d.getDate() + i)
      const hh = isHoliday(n) ? null : seasonOf(n).week[n.getDay()]
      if (!hh) continue
      if (i === 0 && m >= hh[0]) continue
      return { open: false, text: 'Closed now', sub: 'opens ' + (i === 0 ? '' : i === 1 ? 'tomorrow ' : DAYS[n.getDay()] + ' ') + t12(hh[0]), season: s.name }
    }
    return { open: false, text: 'Closed', sub: '', season: s.name }
  }
  function weekHours(d = nhNow()) {
    const s = seasonOf(d)
    return { season: s.name, rows: [1, 2, 3, 4, 5, 6, 0].map(i => ({ day: DAYS[i], i, h: s.week[i] ? t12(s.week[i][0]) + ' – ' + t12(s.week[i][1]) : 'Closed' })) }
  }

  /* ---------- Sheet ---------- */
  let sheetEl
  function sheet(html, { label = 'Dialog', onClose } = {}) {
    if (!sheetEl) {
      sheetEl = document.createElement('div'); sheetEl.className = 'sheet-wrap'
      sheetEl.innerHTML = '<div class="sheet-bg"></div><div class="sheet" role="dialog" aria-modal="true"><div class="grab"></div><button class="x" aria-label="Close">×</button><div class="sheet-body"></div></div>'
      document.body.appendChild(sheetEl)
      sheetEl.querySelector('.sheet-bg').onclick = () => close()
      sheetEl.querySelector('.x').onclick = () => close()
      document.addEventListener('keydown', e => { if (e.key === 'Escape' && sheetEl.classList.contains('open')) close() })
    }
    sheetEl._onClose = onClose
    sheetEl.querySelector('.sheet').setAttribute('aria-label', label)
    sheetEl.querySelector('.sheet-body').innerHTML = html
    sheetEl.classList.add('open')
    document.body.style.overflow = 'hidden'
    setTimeout(() => (sheetEl.querySelector('.sheet-body button, .sheet-body a, .sheet-body input') || sheetEl.querySelector('.x')).focus(), 60)
    return sheetEl.querySelector('.sheet-body')
  }
  function close() {
    if (!sheetEl) return
    sheetEl.classList.remove('open'); document.body.style.overflow = ''
    const f = sheetEl._onClose; sheetEl._onClose = null; if (f) f()
  }

  /* ---------- Simulated checkout (never charges) ---------- */
  function pay({ title, lines, onPaid, payee = 'Moonbeam Outfitters' }) {
    const total = lines.reduce((s, l) => s + l[1], 0)
    const body = sheet(`
      <p class="panel-title">Pay ${esc(payee)}</p>
      <h2>${esc(title)}</h2>
      ${lines.map(l => `<div class="pay-line"><span>${esc(l[0])}</span><span>${money2(l[1])}</span></div>`).join('')}
      <div class="pay-line total"><span>Total</span><span>${money2(total)}</span></div>
      <div class="pay-demo" role="note"><b>DEMO</b><span>This is a pretend checkout. Nothing is charged and no card is asked for. In the real setup this opens Apple Pay or Google Pay, or a card form.</span></div>
      <div class="stack">
        <button class="btn block wallet" data-pay>${ICON.wallet}<span>Pay with phone wallet</span></button>
        <button class="btn block ghost" data-pay>${ICON.card}<span>Pay with card</span></button>
      </div>
      <p class="nosave center">${ICON.lock.replace('<svg', '<svg style="width:14px;height:14px;display:inline;vertical-align:-2px"')} Secure checkout in the real setup</p>`, { label: 'Checkout' })
    $$('[data-pay]', body).forEach(b => b.onclick = () => {
      $$('[data-pay]', body).forEach(x => x.disabled = true)
      b.innerHTML = '<span class="spinner" aria-hidden="true"></span><span>Paying…</span>'
      setTimeout(() => { close(); onPaid && onPaid(total) }, 1100)
    })
  }

  /* ---------- Call buttons ---------- */
  function callLine(kind) {
    const n = kind === 'messages' ? (cfg.messageLine || cfg.aiLine) : cfg.aiLine
    if (n) { location.href = 'tel:' + n; return }
    sheet(`<p class="panel-title">Demo phone line</p><h2>The live demo line is being set up</h2>
      <p>On a real site this button calls the shop. Moonbeam’s demo line will let you call and hear it answer in the shop’s name.</p>
      <p class="muted">Until then, tap below to see exactly how a call goes and the email the owner gets.</p>
      <a class="btn block" href="${kind === 'messages' ? '/missed-call/' : '/ai-receptionist/'}">See how a call goes</a>`, { label: 'Demo phone line' })
  }

  /* ---------- Dates ---------- */
  function addDays(n) { const d = nhNow(); d.setHours(12, 0, 0, 0); d.setDate(d.getDate() + n); return d }
  const fmtDay = d => d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
  const fmtLong = d => d.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })
  const nowTime = () => nhNow().toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })

  /* ---------- Header status ---------- */
  function paintOpen() {
    $$('[data-open]').forEach(el => {
      const s = status(); el.classList.toggle('closed', !s.open)
      el.innerHTML = esc(s.text) + (s.sub ? '<br><span style="font-weight:400">' + esc(s.sub) + '</span>' : '')
    })
  }
  document.addEventListener('DOMContentLoaded', () => {
    paintOpen()
    if (!cfg.aiLine && !cfg.messageLine) $$('[data-needs-line]').forEach(el => el.classList.add('hidden'))
    $$('[data-call]').forEach(b => b.addEventListener('click', e => { e.preventDefault(); callLine(b.dataset.call) }))
    // forms never submit anywhere
    $$('form').forEach(f => f.addEventListener('submit', e => e.preventDefault()))
  })

  /* ---------- Step dots ---------- */
  function steps(n) { $$('.steps-dots i').forEach((el, i) => el.classList.toggle('on', i < n)) }
  function show(id) { $$('[data-screen]').forEach(s => s.classList.toggle('hidden', s.dataset.screen !== id)); window.scrollTo({ top: 0, behavior: 'smooth' }) }
  const wait = ms => new Promise(r => setTimeout(r, ms))

  /* ---------- Read aloud (browser voice; optional) ---------- */
  function say(text, who) {
    return new Promise(res => {
      const ss = window.speechSynthesis
      if (!ss || !say.on) return setTimeout(res, Math.min(4200, 900 + text.length * 28))
      const u = new SpeechSynthesisUtterance(text)
      const vs = ss.getVoices().filter(v => /^en(-|_)US/i.test(v.lang))
      const pick = who === 'line' ? vs.find(v => /Samantha|Ava|Allison|Google US English|Zira/i.test(v.name)) : vs.find(v => /Alex|Tom|Aaron|Fred|David|Guy/i.test(v.name))
      if (pick) u.voice = pick
      u.rate = 1.02; u.onend = res; u.onerror = res
      ss.speak(u)
    })
  }
  say.on = false

  window.MB = { say, $, $$, esc, money, money2, ICON, status, weekHours, sheet, close, pay, callLine, addDays, fmtDay, fmtLong, nowTime, nhNow, steps, show, wait, seasonOf }
})()
