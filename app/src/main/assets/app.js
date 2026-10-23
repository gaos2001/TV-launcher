// Home screen logic: clock, prayer times, weather, matches, apps and remote-control navigation.
'use strict';

const $ = id => document.getElementById(id);
const native = window.Android || null;          // missing when the page is opened in a desktop browser
const pad = n => String(n).padStart(2, '0');
const store = {
  get(k) { try { return JSON.parse(localStorage.getItem(k)); } catch (e) { return null; } },
  set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { } },
};

let paused = false;
let currentView = 'home';

// ---------------------------------------------------------------- stage scaling
function viewport() {
  // Inside a TV WebView the window can report 0×0 until the first layout pass.
  const w = innerWidth || document.documentElement.clientWidth || (screen && screen.width) || 1280;
  const h = innerHeight || document.documentElement.clientHeight || (screen && screen.height) || 720;
  return { w, h };
}
let lastFit = '';
function fitStage() {
  const { w, h } = viewport();
  const key = w + 'x' + h;
  if (key === lastFit) return;
  lastFit = key;
  const s = Math.min(w / 1280, h / 720);
  const st = $('stage');
  st.style.transform = `scale(${s})`;
  st.style.left = ((w - 1280 * s) / 2) + 'px';
  st.style.top = ((h - 720 * s) / 2) + 'px';
}
addEventListener('resize', fitStage);

// ---------------------------------------------------------------- time helpers
function time12(d) {
  let h = d.getHours() % 12; if (h === 0) h = 12;
  return { hm: `${h}:${pad(d.getMinutes())}`, ap: d.getHours() < 12 ? 'ص' : 'م' };
}
const timeText = d => { const t = time12(d); return `${t.hm} ${t.ap}`; };

function hijri(d, withYear) {
  try {
    const f = new Intl.DateTimeFormat('ar-SA-u-ca-islamic-umalqura-nu-latn',
      withYear ? { day: 'numeric', month: 'long', year: 'numeric' } : { day: 'numeric', month: 'long' });
    return f.format(d).replace(/\s*هـ$/, '') + (withYear ? 'هـ' : '');
  } catch (e) { return ''; }
}
const gregorian = d => `${DAYS[d.getDay()]}، ${d.getDate()} ${MONTHS[d.getMonth()]} ${d.getFullYear()}`;
const sameDay = (a, b) => a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();

function dayLabel(d) {
  const now = new Date();
  const tomorrow = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
  const yesterday = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1);
  if (sameDay(d, now)) return 'اليوم';
  if (sameDay(d, tomorrow)) return 'غدًا';
  if (sameDay(d, yesterday)) return 'أمس';
  return `${DAYS[d.getDay()]} ${d.getDate()} ${MONTHS[d.getMonth()]}`;
}

// ---------------------------------------------------------------- scene + greeting
let lastPeriod = '';
function periodOf(now, p) {
  const t = now.getTime();
  if (t < p.fajr.getTime() || t >= p.isha.getTime()) return 'night';
  if (t < p.sunrise.getTime() + 40 * 60000) return 'dawn';
  if (t < p.dhuhr.getTime() - 90 * 60000) return 'morning';
  if (t < p.asr.getTime()) return 'noon';
  if (t < p.maghrib.getTime() - 50 * 60000) return 'afternoon';
  if (t < p.maghrib.getTime() + 35 * 60000) return 'sunset';
  return 'night';
}

function sunPosition(now, p) {
  // Sun (or moon) moves along an arc from east (right) to west (left) over the dunes.
  const DAY = 86400000;
  let a, b;
  if (now >= p.sunrise && now <= p.maghrib) { a = p.sunrise; b = p.maghrib; }
  else if (now < p.sunrise) { a = new Date(p.maghrib.getTime() - DAY); b = p.sunrise; }
  else { a = p.maghrib; b = new Date(p.sunrise.getTime() + DAY); }
  const f = Math.min(1, Math.max(0, (now - a) / (b - a)));
  return { x: Math.round((0.5 - f) * 460), y: Math.round(410 - Math.sin(f * Math.PI) * 250) };
}

let lastSceneKey = '';
function renderScene(now, p) {
  const period = periodOf(now, p);
  const pos = sunPosition(now, p);
  const key = period + Math.round(pos.x / 20) + ':' + Math.round(pos.y / 20);
  if (key === lastSceneKey) return;
  lastSceneKey = key;
  lastPeriod = period;
  $('scene').innerHTML = sceneSvg(period, pos);
}

const MOODS = {
  dawn: `نسمة فجر هادئة على ${CONFIG.city}`,
  morning: `صباح مشمس في ${CONFIG.city}`,
  noon: `شمس الظهيرة فوق ${CONFIG.city}`,
  afternoon: `عصرية لطيفة في ${CONFIG.city}`,
  sunset: `غروب ذهبي على ${CONFIG.city}`,
  night: `ليلة هادئة في ${CONFIG.city}`,
};

// ---------------------------------------------------------------- prayer
let prayers = null, prayersDay = -1, tomorrowFajr = null;
const ORDER = ['fajr', 'sunrise', 'dhuhr', 'asr', 'maghrib', 'isha'];

function ensurePrayers(now) {
  if (prayersDay === now.getDate() && prayers) return;
  prayers = Prayer.forDay(now, CONFIG.lat, CONFIG.lng, CONFIG.tz);
  const tmr = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
  tomorrowFajr = Prayer.forDay(tmr, CONFIG.lat, CONFIG.lng, CONFIG.tz).fajr;
  prayersDay = now.getDate();
  $('prayerGrid').innerHTML = ORDER.map(k => {
    const t = time12(prayers[k]);
    return `<div class="pt" id="pt-${k}"><small>${PRAYER_NAMES[k]}</small><b>${t.hm}<span>${t.ap}</span></b></div>`;
  }).join('');
  $('hijriShort').textContent = hijri(now, true);
  $('sunInfo').textContent = `الشروق ${timeText(prayers.sunrise)} · المغرب ${timeText(prayers.maghrib)}`;
}

function renderPrayer(now) {
  ensurePrayers(now);
  // Next real prayer (sunrise is shown but not counted as a prayer).
  let nextKey = null, prevTime = null;
  for (const k of ORDER) {
    if (k === 'sunrise') continue;
    if (prayers[k] > now) { nextKey = k; break; }
  }
  let nextTime;
  if (nextKey) {
    nextTime = prayers[nextKey];
    const idx = ORDER.indexOf(nextKey);
    let j = idx - 1; if (ORDER[j] === 'sunrise') j--;
    prevTime = j >= 0 ? prayers[ORDER[j]] : new Date(prayers.isha.getTime() - 86400000);
  } else {
    nextKey = 'fajr'; nextTime = tomorrowFajr; prevTime = prayers.isha;
  }
  const left = Math.max(0, Math.floor((nextTime - now) / 1000));
  $('nextName').textContent = PRAYER_NAMES[nextKey];
  $('countdown').textContent = `${Math.floor(left / 3600)}:${pad(Math.floor(left / 60) % 60)}:${pad(left % 60)}`;
  $('nextAt').textContent = `الساعة ${timeText(nextTime)}`;
  $('bar').style.width = (Math.min(1, Math.max(0, (now - prevTime) / (nextTime - prevTime))) * 100).toFixed(1) + '%';
  for (const k of ORDER) {
    const el = $('pt-' + k); if (!el) continue;
    const isNext = k === nextKey && sameDay(nextTime, now);
    el.className = 'pt' + (isNext ? ' next' : (prayers[k] <= now ? ' past' : ''));
  }
}

// ---------------------------------------------------------------- clock tick
let tickTimer = null;
function tick() {
  fitStage();
  const now = new Date();
  ensurePrayers(now);
  const t = time12(now);
  $('clock').textContent = t.hm;
  $('ampm').textContent = t.ap;
  const h = now.getHours();
  $('greeting').textContent = h >= 4 && h < 12 ? 'صباح الخير' : 'مساء الخير';
  $('date').textContent = `${gregorian(now)}  ·  ${hijri(now, true)}`;
  renderPrayer(now);
  renderScene(now, prayers);
  $('mood').textContent = MOODS[lastPeriod] || '';
  $('statusR').textContent = `${CONFIG.city} · ${t.hm} ${t.ap}`;
}
function startTicking() {
  stopTicking();
  tick();
  // Align to the next whole second.
  tickTimer = setTimeout(function loop() { tick(); tickTimer = setTimeout(loop, 1000 - (Date.now() % 1000)); }, 1000 - (Date.now() % 1000));
}
function stopTicking() { if (tickTimer) clearTimeout(tickTimer); tickTimer = null; }

// ---------------------------------------------------------------- network
const pending = {};
let reqId = 0;
function get(url) {
  return new Promise(resolve => {
    if (native && native.httpGet) {
      const id = 'r' + (++reqId);
      pending[id] = resolve;
      native.httpGet(id, url);
      setTimeout(() => { if (pending[id]) { delete pending[id]; resolve({ status: 0, body: '' }); } }, 25000);
    } else {
      fetch(url).then(r => r.text().then(b => resolve({ status: r.status, body: b })))
        .catch(() => resolve({ status: 0, body: '' }));
    }
  });
}
window.onHttp = (id, status, body) => {
  const r = pending[id]; if (!r) return;
  delete pending[id];
  r({ status, body });
};
const getJson = async url => {
  const r = await get(url);
  if (r.status < 200 || r.status >= 300) return null;
  try { return JSON.parse(r.body); } catch (e) { return null; }
};

// ---------------------------------------------------------------- weather
let weatherTimer = null;
async function loadWeather() {
  const url = 'https://api.open-meteo.com/v1/forecast?latitude=' + CONFIG.lat + '&longitude=' + CONFIG.lng +
    '&current=temperature_2m,relative_humidity_2m,apparent_temperature,weather_code,wind_speed_10m,wind_direction_10m,is_day' +
    '&hourly=temperature_2m,weather_code,is_day&daily=temperature_2m_max,temperature_2m_min' +
    '&timezone=Asia%2FRiyadh&forecast_days=2&wind_speed_unit=kmh';
  const data = await getJson(url);
  if (data && data.current) {
    data._at = Date.now();
    store.set('weather', data);
    renderWeather(data);
  }
  clearTimeout(weatherTimer);
  weatherTimer = setTimeout(loadWeather, (data ? CONFIG.weatherEveryMin : 3) * 60000);
}

function renderWeather(d) {
  if (!d || !d.current) return;
  const c = d.current;
  const info = weatherInfo(c.weather_code, c.is_day);
  const temp = Math.round(c.temperature_2m);
  $('wxTemp').textContent = temp;
  $('wxIcon').innerHTML = icon(info.i);
  $('wxDesc').textContent = info.t;
  $('wxFeels').textContent = `الإحساس ${Math.round(c.apparent_temperature)}° · ${CONFIG.city}`;
  $('wxHum').textContent = Math.round(c.relative_humidity_2m) + '%';
  $('wxWind').textContent = `${Math.round(c.wind_speed_10m)} كم/س`;
  $('wxWindDir').textContent = 'الرياح ' + windDir(c.wind_direction_10m);
  if (d.daily) {
    $('wxMax').textContent = Math.round(d.daily.temperature_2m_max[0]) + '°';
    $('wxMin').textContent = Math.round(d.daily.temperature_2m_min[0]) + '°';
  }
  $('wxCity').textContent = CONFIG.city;
  const chip = $('wxChip');
  chip.querySelector('.ic').innerHTML = icon(info.i);
  chip.querySelector('b').textContent = temp + '°';
  chip.querySelector('.t').textContent = info.t;

  // Next hours, every 2 hours starting from the current hour.
  if (d.hourly && d.hourly.time) {
    const now = new Date();
    const cells = [];
    for (let i = 0; i < d.hourly.time.length && cells.length < 5; i++) {
      const t = new Date(d.hourly.time[i]);
      if (t < new Date(now.getTime() - 3600000)) continue;
      if (cells.length && (t.getHours() - now.getHours() + 24) % 2) continue;
      const wi = weatherInfo(d.hourly.weather_code[i], d.hourly.is_day[i]);
      const label = cells.length === 0 ? 'الآن' : time12(t).hm.split(':')[0] + ' ' + time12(t).ap;
      cells.push(`<div><span>${label}</span>${icon(wi.i)}<b>${Math.round(d.hourly.temperature_2m[i])}°</b></div>`);
    }
    $('wxHours').innerHTML = cells.join('');
  }
  if (d._at) $('statusL').textContent = `آخر تحديث للطقس ${timeText(new Date(d._at))}`;
}

// ---------------------------------------------------------------- matches
let matches = [];
let matchesTimer = null;

function ymd(d) { return `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}`; }

function parseEvents(json, league) {
  const out = [];
  if (!json || !Array.isArray(json.events)) return out;
  for (const ev of json.events) {
    try {
      const comp = ev.competitions && ev.competitions[0];
      if (!comp) continue;
      const cs = comp.competitors || [];
      const home = cs.find(x => x.homeAway === 'home') || cs[0];
      const away = cs.find(x => x.homeAway === 'away') || cs[1];
      if (!home || !away) continue;
      const st = (comp.status || ev.status || {});
      const type = st.type || {};
      out.push({
        id: ev.id,
        league,
        date: new Date(ev.date),
        state: type.state || 'pre',            // pre | in | post
        detail: type.shortDetail || '',
        clock: st.displayClock || '',
        name: type.name || '',
        home: { name: teamAr(home.team && (home.team.displayName || home.team.name)), logo: home.team && home.team.logo, score: home.score },
        away: { name: teamAr(away.team && (away.team.displayName || away.team.name)), logo: away.team && away.team.logo, score: away.score },
      });
    } catch (e) { /* skip malformed event */ }
  }
  return out;
}

async function loadLeague(league, from, to) {
  const base = `https://site.api.espn.com/apis/site/v2/sports/soccer/${league.slug}/scoreboard`;
  let json = await getJson(`${base}?dates=${ymd(from)}-${ymd(to)}&limit=100`);
  if (json && Array.isArray(json.events)) return parseEvents(json, league);
  // Fallback: the plain scoreboard (current round).
  json = await getJson(base);
  return parseEvents(json, league);
}

async function loadMatches() {
  const now = new Date();
  const from = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1);
  const to = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 6);
  const results = await Promise.all(LEAGUES.map(l => loadLeague(l, from, to).catch(() => [])));
  const all = [].concat(...results);
  const seen = new Set();
  matches = all.filter(m => !seen.has(m.league.slug + m.id) && seen.add(m.league.slug + m.id));
  if (matches.length) store.set('matches', { at: Date.now(), list: matches.map(m => ({ ...m, league: m.league.slug })) });
  renderMatches();
  const live = matches.some(m => m.state === 'in');
  clearTimeout(matchesTimer);
  matchesTimer = setTimeout(loadMatches, (live ? 2 : CONFIG.matchesEveryMin) * 60000);
}

function restoreMatches() {
  const c = store.get('matches');
  if (!c || !c.list) return;
  matches = c.list.map(m => ({ ...m, date: new Date(m.date), league: LEAGUES.find(l => l.slug === m.league) || LEAGUES[0] }));
  renderMatches();
}

function sortForStrip(list) {
  const now = Date.now();
  const live = list.filter(m => m.state === 'in').sort((a, b) => a.league.rank - b.league.rank);
  const upcoming = list.filter(m => m.state === 'pre' && m.date.getTime() > now - 3 * 3600000)
    .sort((a, b) => a.date - b.date || a.league.rank - b.league.rank);
  const recent = list.filter(m => m.state === 'post' && now - m.date.getTime() < 14 * 3600000)
    .sort((a, b) => b.date - a.date);
  return { live, upcoming, recent };
}

function statusText(m) {
  if (m.state === 'in') {
    if (/half/i.test(m.name) || /HT/.test(m.detail)) return 'استراحة';
    return 'مباشر ' + (m.clock ? m.clock.replace(/'+$/, '') + "'" : '');
  }
  if (m.state === 'post') return /pen/i.test(m.detail) ? 'انتهت (ركلات ترجيح)' : 'انتهت';
  if (/postp|canc/i.test(m.name + m.detail)) return 'مؤجلة';
  return dayLabel(m.date);
}

function matchHtml(m) {
  const logo = t => t.logo ? `<img src="${t.logo}" alt="" loading="lazy" onerror="this.remove()">` : '';
  const center = m.state === 'pre'
    ? `<div class="score time">${timeText(m.date)}</div>`
    : `<div class="score">${m.home.score != null ? m.home.score : '-'} - ${m.away.score != null ? m.away.score : '-'}</div>`;
  return `<button class="match f${m.state === 'in' ? ' live' : ''}" data-match="${m.league.slug}|${m.id}">
    <div class="lg"><span>${m.league.name}</span><span class="st">${statusText(m)}</span></div>
    <div class="teams">
      <div class="team">${logo(m.home)}<span>${m.home.name}</span></div>
      ${center}
      <div class="team away">${logo(m.away)}<span>${m.away.name}</span></div>
    </div></button>`;
}

function renderMatches() {
  const { live, upcoming, recent } = sortForStrip(matches);
  const strip = [...live, ...upcoming, ...recent].slice(0, 14);
  $('matchStrip').innerHTML = strip.length ? strip.map(matchHtml).join('')
    : '<div class="match empty">لا توجد مباريات قريبة</div>';
  const note = live.length ? `${live.length} مباشر الآن · اضغط على مباراة سعودية لفتح ثمانية`
    : upcoming.length ? `القادمة: ${dayLabel(upcoming[0].date)} ${timeText(upcoming[0].date)}` : '';
  $('matchesNote').textContent = note;

  // Full page grouped by day.
  const byDay = new Map();
  [...matches].sort((a, b) => a.date - b.date || a.league.rank - b.league.rank).forEach(m => {
    const k = new Date(m.date.getFullYear(), m.date.getMonth(), m.date.getDate()).getTime();
    if (!byDay.has(k)) byDay.set(k, []);
    byDay.get(k).push(m);
  });
  const today = new Date(); today.setHours(0, 0, 0, 0);
  let html = '';
  for (const [k, list] of byDay) {
    if (k < today.getTime() - 86400000) continue;
    html += `<div class="day-h">${dayLabel(new Date(k))}</div><div class="day-grid">${list.map(matchHtml).join('')}</div>`;
  }
  $('matchesPage').innerHTML = html || '<div class="day-h">لا توجد مباريات في الأيام القادمة</div>';
  $('matchesNote2').textContent = live.length ? `${live.length} مباراة مباشرة الآن` : 'هذا الأسبوع';
  if (focused && !document.body.contains(focused)) focusFirst();
}

function openMatch(key) {
  const [slug, id] = key.split('|');
  const m = matches.find(x => x.league.slug === slug && String(x.id) === id);
  if (!m) return;
  if (m.league.thmanyah) {
    const pkg = native ? native.findApp('thmanyah|ثمانية') : '';
    if (pkg) { native.launch(pkg); return; }
    toast('تطبيق ثمانية غير مثبت · افتح المتجر');
    if (native) native.openStore('ثمانية');
  } else {
    toast(`${m.home.name} × ${m.away.name} · ${m.league.name}`);
  }
}

// ---------------------------------------------------------------- apps
let apps = [];
function rankApp(a) {
  const hay = (a.label + ' ' + a.pkg).toLowerCase();
  const i = PREFERRED_APPS.findIndex(k => hay.includes(k));
  return i < 0 ? 1000 : i;
}
window.onApps = list => {
  apps = (list || []).filter(a => !HIDDEN_APPS.includes(a.pkg))
    .sort((a, b) => rankApp(a) - rankApp(b) || (b.tv - a.tv) || a.label.localeCompare(b.label, 'ar'));
  const tile = a => a.banner
    ? `<button class="app f" data-pkg="${a.pkg}" aria-label="${a.label}"><img class="banner" src="${a.img}" alt=""></button>`
    : `<button class="app icon f" data-pkg="${a.pkg}"><img src="${a.img}" alt=""><span>${a.label}</span></button>`;
  $('appStrip').innerHTML = apps.map(tile).join('') || '<div class="match empty">لا توجد تطبيقات</div>';
  $('appGrid').innerHTML = apps.map(tile).join('');
  $('appsCount').textContent = `${apps.length} تطبيق`;
  if (!focused || !document.body.contains(focused)) focusFirst();
};
window.onAppsChanged = () => native && native.requestApps();

// ---------------------------------------------------------------- views
function showView(name) {
  currentView = name;
  document.querySelectorAll('.view').forEach(v => v.classList.toggle('on', v.id === 'view-' + name));
  document.querySelectorAll('.tab').forEach(t => t.classList.toggle('on', t.dataset.view === name));
}

// ---------------------------------------------------------------- remote-control focus
let focused = null;
function setFocus(el) {
  if (!el) return;
  if (focused) focused.classList.remove('focus');
  focused = el;
  el.classList.add('focus');
  // Keep the element visible inside its scrolling strip/page.
  const sc = el.closest('.strip, .page-scroll');
  if (sc) {
    const r = el.getBoundingClientRect(), p = sc.getBoundingClientRect();
    const s = currentScale();
    if (sc.classList.contains('strip')) {
      const margin = 60 * s;
      if (r.left < p.left + margin) sc.scrollLeft -= (p.left + margin - r.left) / s;
      else if (r.right > p.right - margin) sc.scrollLeft += (r.right - (p.right - margin)) / s;
    } else {
      const margin = 40 * s;
      if (r.top < p.top + margin) sc.scrollTop -= (p.top + margin - r.top) / s;
      else if (r.bottom > p.bottom - margin) sc.scrollTop += (r.bottom - (p.bottom - margin)) / s;
    }
  }
}
function currentScale() { const v = viewport(); return Math.min(v.w / 1280, v.h / 720); }

function visibleFocusables() {
  return [...document.querySelectorAll('.f')].filter(el => {
    if (el.closest('.view') && !el.closest('.view').classList.contains('on')) return false;
    const r = el.getBoundingClientRect();
    return r.width > 0 && r.height > 0;
  });
}

function focusFirst() {
  const target = currentView === 'home'
    ? document.querySelector('#appStrip .app') || document.querySelector('#matchStrip .match.f') || document.querySelector('.tab.on')
    : document.querySelector(`#view-${currentView} .f`) || document.querySelector('.tab.on');
  setFocus(target);
}

// Pick the nearest element in the pressed direction (works for rows, grids and the RTL layout).
function move(dir) {
  const els = visibleFocusables();
  if (!focused || !els.includes(focused)) { focusFirst(); return; }
  const a = focused.getBoundingClientRect();
  const ax = a.left + a.width / 2, ay = a.top + a.height / 2;
  let best = null, bestScore = Infinity;
  for (const el of els) {
    if (el === focused) continue;
    const b = el.getBoundingClientRect();
    const bx = b.left + b.width / 2, by = b.top + b.height / 2;
    const dx = bx - ax, dy = by - ay;
    let primary, secondary;
    if (dir === 'left') { if (dx >= -1) continue; primary = -dx; secondary = Math.abs(dy); }
    if (dir === 'right') { if (dx <= 1) continue; primary = dx; secondary = Math.abs(dy); }
    // Up/down: distance between the facing edges, so the next row always wins over rows further away.
    if (dir === 'up') { if (dy >= -1 || b.bottom > a.top + 4) continue; primary = a.top - b.bottom; secondary = Math.abs(dx); }
    if (dir === 'down') { if (dy <= 1 || b.top < a.bottom - 4) continue; primary = b.top - a.bottom; secondary = Math.abs(dx); }
    // Same row/column strongly preferred.
    const score = (dir === 'left' || dir === 'right')
      ? (secondary > a.height / 2 ? 100000 + secondary * 10 + primary : primary)
      : primary * 4 + secondary;
    if (score < bestScore) { bestScore = score; best = el; }
  }
  if (best) setFocus(best);
}

function activate(el) {
  if (!el) return;
  if (el.classList.contains('tab')) { showView(el.dataset.view); return; }
  if (el.id === 'btnSettings') { native ? native.openSettings() : toast('الإعدادات'); return; }
  if (el.dataset.pkg) {
    if (native) { if (!native.launch(el.dataset.pkg)) toast('تعذّر فتح التطبيق'); }
    return;
  }
  if (el.dataset.match) openMatch(el.dataset.match);
}

document.addEventListener('keydown', e => {
  const k = e.key;
  const map = { ArrowLeft: 'left', ArrowRight: 'right', ArrowUp: 'up', ArrowDown: 'down' };
  if (map[k]) { e.preventDefault(); move(map[k]); return; }
  if (k === 'Enter' || k === ' ' || e.keyCode === 23) { e.preventDefault(); activate(focused); return; }
  if (k === 'Escape' || k === 'Backspace' || k === 'GoBack') { e.preventDefault(); window.onBack(); }
});
document.addEventListener('click', e => {
  const el = e.target.closest('.f');
  if (el) { setFocus(el); activate(el); }
});

window.onBack = () => {
  if (currentView !== 'home') { showView('home'); focusFirst(); return; }
  focusFirst();
};
window.onHomeKey = () => { showView('home'); focusFirst(); };
window.onHomePause = () => { paused = true; stopTicking(); };
window.onHomeResume = () => {
  paused = false;
  startTicking();
  const w = store.get('weather');
  if (!w || Date.now() - w._at > CONFIG.weatherEveryMin * 60000) loadWeather();
  const m = store.get('matches');
  if (!m || Date.now() - m.at > 2 * 60000) loadMatches();
  if (native) native.requestApps();
};

// ---------------------------------------------------------------- toast
let toastTimer = null;
function toast(msg) {
  const t = $('toast');
  t.textContent = msg;
  t.classList.add('on');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => t.classList.remove('on'), 2600);
}

// ---------------------------------------------------------------- start
function boot() {
  fitStage();
  requestAnimationFrame(fitStage);
  setTimeout(fitStage, 300);
  $('city').textContent = CONFIG.city;
  $('wxCity').textContent = CONFIG.city;
  startTicking();
  renderWeather(store.get('weather'));
  restoreMatches();
  loadWeather();
  loadMatches();
  if (native) native.requestApps();
  else if (window.DEMO_APPS) window.onApps(window.DEMO_APPS);
  setTimeout(() => { if (!focused) focusFirst(); }, 50);
}
boot();
