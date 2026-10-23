// Static configuration and lookup tables for the home screen.
'use strict';

const CONFIG = {
  family: 'الوكيل',
  city: 'حوطة بني تميم',
  lat: 23.49598,
  lng: 46.87801,
  tz: 3,                       // Saudi Arabia, no daylight saving
  weatherEveryMin: 20,
  matchesEveryMin: 10,         // every minute while a match is live
};

// Apps shown first, in this order, when installed. Everything else follows alphabetically.
const PREFERRED_APPS = [
  'youtube', 'thmanyah', 'ثمانية', 'shahid', 'netflix', 'osn', 'disney', 'apple.atve', 'apple tv',
  'amazon.amazonvideo', 'prime video', 'stc', 'jawwy', 'tod', 'bein', 'spotify', 'anghami',
];

// Apps that clutter the row on Google TV; still installed, just not shown.
const HIDDEN_APPS = [
  'com.android.vending', 'com.google.android.tvrecommendations', 'com.google.android.apps.tv.launcherx',
  'com.google.android.tungsten.setupwraith', 'com.android.tv.settings', 'com.google.android.katniss',
  'com.google.android.tv.remote.service', 'com.android.documentsui', 'com.google.android.apps.tv.dreamx',
];

// ESPN league slugs. "thmanyah" leagues open the Thmanyah app when a match is pressed.
const LEAGUES = [
  { slug: 'ksa.1', name: 'دوري روشن', thmanyah: true, rank: 0 },
  { slug: 'ksa.kings.cup', name: 'كأس الملك', thmanyah: true, rank: 1 },
  { slug: 'afc.champions', name: 'نخبة آسيا', rank: 2 },
  { slug: 'uefa.champions', name: 'أبطال أوروبا', rank: 3 },
  { slug: 'eng.1', name: 'الدوري الإنجليزي', rank: 4 },
  { slug: 'esp.1', name: 'الدوري الإسباني', rank: 5 },
];

// English name fragment → Arabic. Checked in order; short keys must match a whole word.
const TEAMS = [
  ['shabab al ahli', 'شباب الأهلي'], ['hilal', 'الهلال'], ['nassr', 'النصر'], ['ittihad', 'الاتحاد'],
  ['ahli', 'الأهلي'], ['qadsiah', 'القادسية'], ['qadisiya', 'القادسية'], ['taawoun', 'التعاون'], ['taawon', 'التعاون'],
  ['ettifaq', 'الاتفاق'], ['fateh', 'الفتح'], ['shabab', 'الشباب'], ['khaleej', 'الخليج'], ['fayha', 'الفيحاء'],
  ['feiha', 'الفيحاء'], ['riyadh', 'الرياض'], ['kholood', 'الخلود'], ['okhdood', 'الأخدود'], ['akhdoud', 'الأخدود'],
  ['damac', 'ضمك'], ['najma', 'النجمة'], ['hazem', 'الحزم'], ['neom', 'نيوم'], ['wehda', 'الوحدة'], ['raed', 'الرائد'],
  ['orobah', 'العروبة'], ['abha', 'أبها'], ['tai', 'الطائي'], ['jabalain', 'الجبلين'], ['batin', 'الباطن'],
  ['real madrid', 'ريال مدريد'], ['barcelona', 'برشلونة'], ['atletico', 'أتلتيكو مدريد'], ['atlético', 'أتلتيكو مدريد'],
  ['sevilla', 'إشبيلية'], ['villarreal', 'فياريال'], ['real sociedad', 'ريال سوسيداد'], ['real betis', 'ريال بيتيس'],
  ['athletic club', 'أتلتيك بلباو'], ['valencia', 'فالنسيا'], ['girona', 'جيرونا'],
  ['manchester city', 'مانشستر سيتي'], ['man city', 'مانشستر سيتي'], ['manchester united', 'مانشستر يونايتد'],
  ['man united', 'مانشستر يونايتد'], ['liverpool', 'ليفربول'], ['arsenal', 'آرسنال'], ['chelsea', 'تشيلسي'],
  ['tottenham', 'توتنهام'], ['newcastle', 'نيوكاسل'], ['aston villa', 'أستون فيلا'], ['west ham', 'وست هام'],
  ['brighton', 'برايتون'], ['everton', 'إيفرتون'],
  ['bayern', 'بايرن ميونخ'], ['dortmund', 'دورتموند'], ['leverkusen', 'ليفركوزن'], ['leipzig', 'لايبزيغ'],
  ['paris saint germain', 'باريس سان جيرمان'], ['psg', 'باريس سان جيرمان'], ['juventus', 'يوفنتوس'],
  ['inter', 'إنتر ميلان'], ['ac milan', 'ميلان'], ['napoli', 'نابولي'], ['roma', 'روما'], ['benfica', 'بنفيكا'],
  ['porto', 'بورتو'], ['sporting', 'سبورتينغ'], ['ajax', 'أياكس'], ['psv', 'آيندهوفن'], ['celtic', 'سلتيك'],
  ['al ain', 'العين'], ['sharjah', 'الشارقة'], ['al wasl', 'الوصل'], ['al sadd', 'السد'], ['al gharafa', 'الغرافة'],
  ['al duhail', 'الدحيل'], ['al rayyan', 'الريان'], ['persepolis', 'برسبوليس'], ['esteghlal', 'استقلال طهران'],
];
const SHORT_KEYS = new Set(['tai', 'inter', 'roma', 'psg', 'psv', 'ahli', 'raed', 'abha']);

function teamAr(name) {
  const n = String(name || '').toLowerCase().replace(/[-_.]/g, ' ');
  for (const [key, ar] of TEAMS) {
    if (SHORT_KEYS.has(key)) {
      if (new RegExp('(^|\\s)(al\\s)?' + key + '(\\s|$)').test(n)) return ar;
    } else if (n.includes(key)) {
      return ar;
    }
  }
  return name;
}

const DAYS = ['الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'];
const MONTHS = ['يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو', 'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'];
const PRAYER_NAMES = { fajr: 'الفجر', sunrise: 'الشروق', dhuhr: 'الظهر', asr: 'العصر', maghrib: 'المغرب', isha: 'العشاء' };

// Open-Meteo WMO weather codes.
function weatherInfo(code, isDay) {
  const c = Number(code);
  if (c === 0) return { t: 'صافٍ', i: isDay ? 'sun' : 'moon' };
  if (c === 1) return { t: 'صافٍ غالبًا', i: isDay ? 'sun' : 'moon' };
  if (c === 2) return { t: 'غائم جزئيًا', i: isDay ? 'partly' : 'partlyNight' };
  if (c === 3) return { t: 'غائم', i: 'cloud' };
  if (c === 45 || c === 48) return { t: 'ضباب', i: 'fog' };
  if (c >= 51 && c <= 57) return { t: 'رذاذ', i: 'rain' };
  if (c >= 61 && c <= 67) return { t: c >= 65 ? 'أمطار غزيرة' : 'أمطار', i: 'rain' };
  if (c >= 71 && c <= 77) return { t: 'ثلوج', i: 'cloud' };
  if (c >= 80 && c <= 82) return { t: 'زخات مطر', i: 'rain' };
  if (c >= 95) return { t: 'عواصف رعدية', i: 'storm' };
  return { t: 'معتدل', i: isDay ? 'sun' : 'moon' };
}

function windDir(deg) {
  const names = ['شمالية', 'شمالية شرقية', 'شرقية', 'جنوبية شرقية', 'جنوبية', 'جنوبية غربية', 'غربية', 'شمالية غربية'];
  return names[Math.round(((deg % 360) + 360) % 360 / 45) % 8];
}

// Small weather icons, drawn here so nothing is downloaded.
function icon(name) {
  const sun = '<circle cx="24" cy="24" r="9" fill="#ffc94d"/><g stroke="#ffc94d" stroke-width="3" stroke-linecap="round">' +
    [0, 45, 90, 135, 180, 225, 270, 315].map(a => {
      const r = a * Math.PI / 180, x1 = 24 + Math.cos(r) * 14, y1 = 24 + Math.sin(r) * 14, x2 = 24 + Math.cos(r) * 19, y2 = 24 + Math.sin(r) * 19;
      return `<line x1="${x1.toFixed(1)}" y1="${y1.toFixed(1)}" x2="${x2.toFixed(1)}" y2="${y2.toFixed(1)}"/>`;
    }).join('') + '</g>';
  const moon = '<path d="M30 8a15 15 0 1 0 10 26A13 13 0 0 1 30 8z" fill="#f4e3b0"/>';
  const cloud = (dx = 0, dy = 0, fill = '#e8eef2') =>
    `<path transform="translate(${dx} ${dy})" d="M14 38h22a8 8 0 0 0 0-16 11 11 0 0 0-21-2 8 8 0 0 0-1 18z" fill="${fill}"/>`;
  const drops = '<g stroke="#7cc4ff" stroke-width="2.6" stroke-linecap="round"><line x1="18" y1="41" x2="16" y2="46"/><line x1="26" y1="41" x2="24" y2="46"/><line x1="34" y1="41" x2="32" y2="46"/></g>';
  const bolt = '<path d="M26 36l-5 9h5l-3 7 9-11h-5l3-5z" fill="#ffd34d"/>';
  const fog = '<g stroke="#dfe6ea" stroke-width="3" stroke-linecap="round"><line x1="10" y1="20" x2="38" y2="20"/><line x1="6" y1="28" x2="42" y2="28"/><line x1="12" y1="36" x2="36" y2="36"/></g>';
  const body = {
    sun, moon,
    partly: `<g transform="translate(-6 -6) scale(.8)">${sun}</g>` + cloud(4, 4),
    partlyNight: `<g transform="translate(-4 -6) scale(.75)">${moon}</g>` + cloud(4, 4),
    cloud: cloud(0, 0, '#cfd8de'),
    rain: cloud(0, -4, '#cfd8de') + drops,
    storm: cloud(0, -6, '#b9c3ca') + bolt,
    fog,
  }[name] || sun;
  return `<svg viewBox="0 0 48 48">${body}</svg>`;
}

// ---------------------------------------------------------------- background scene
// An original Najdi landscape (dunes, palms, mud-brick village), redrawn for the time of day.
function sceneSvg(period, sunPos) {
  const skies = {
    dawn:      ['#2d3f63', '#8a6d86', '#f0a37a', '#f7cf97'],
    morning:   ['#3f7fae', '#6fa8c9', '#b6d3df', '#efdcb6'],
    noon:      ['#2f74b5', '#5aa0d4', '#a9d2ea', '#efe1bd'],
    afternoon: ['#3a6f9c', '#7aa6c2', '#e3c79a', '#f2b77a'],
    sunset:    ['#2b2f5a', '#7a4a6e', '#e2765a', '#f6b26b'],
    night:     ['#060b1a', '#0d1730', '#1b2a47', '#33405e'],
  };
  const sky = skies[period] || skies.noon;
  const night = period === 'night';
  const warm = period === 'sunset' || period === 'dawn';
  const sx = 640 + (sunPos.x || 0), sy = sunPos.y;
  const sunColor = night ? '#f5ecd2' : (warm ? '#ffb46a' : '#ffd890');
  let stars = '';
  if (night) {
    let seed = 7;
    const rnd = () => (seed = (seed * 9301 + 49297) % 233280) / 233280;
    for (let i = 0; i < 90; i++) {
      stars += `<circle cx="${(rnd() * 1280).toFixed(0)}" cy="${(rnd() * 330).toFixed(0)}" r="${(rnd() * 1.3 + .3).toFixed(2)}" fill="#fff" opacity="${(rnd() * .6 + .25).toFixed(2)}"/>`;
    }
  }
  const dune1 = night ? '#1b2033' : (period === 'sunset' ? '#9a5d45' : '#c9925d');
  const dune2 = night ? '#121726' : (period === 'sunset' ? '#6e3f33' : '#a87345');
  const silhouette = night ? '#05070d' : (warm ? '#1d1418' : '#2a211c');

  // A small Najdi village on the horizon (y=395), tucked under the clock where nothing overlaps it:
  // mud-brick houses with crenellated roofs, a mosque with its minaret, a water tower and palms.
  const G = 395;
  const house = (x, w, h) => {
    let teeth = '';
    for (let tx = x + 3; tx < x + w - 4; tx += 8) teeth += `<path d="M${tx} ${G - h}l2.5-5 2.5 5z"/>`;
    return `<rect x="${x}" y="${G - h}" width="${w}" height="${h}"/>${teeth}` +
      `<rect x="${x + w / 2 - 2.5}" y="${G - h + 9}" width="5" height="7" fill="${night ? '#f6c56b' : 'rgba(0,0,0,.25)'}" opacity="${night ? .85 : 1}"/>`;
  };
  const houses = [[770, 36, 26], [810, 24, 38], [838, 42, 24], [884, 28, 33], [916, 38, 21], [1040, 34, 30], [1078, 24, 22], [1106, 40, 28]]
    .map(h => house(...h)).join('');
  const mosque = `<rect x="960" y="361" width="46" height="34"/><path d="M971 361a12 12 0 0 1 24 0z"/><rect x="1012" y="338" width="9" height="57"/><path d="M1010 338l6.5-11 6.5 11z"/>`;
  const tower = `<rect x="1160" y="360" width="3" height="35"/><rect x="1178" y="360" width="3" height="35"/><path d="M1153 351h35v10h-35z"/><path d="M1157 351a14 9 0 0 1 27 0z"/>`;
  const palm = (x, s) => `<g transform="translate(${x} ${G}) scale(${s})"><path d="M-3 0q4-60 2-110h4q2 50-1 110z"/>` +
    ['M0-110q-40-10-70 10q35-20 70-6', 'M0-110q-30-30-62-30q32 10 60 34', 'M0-110q10-38 40-50q-25 20-36 52',
     'M0-110q40-18 74-2q-36-8-72 6', 'M0-110q34 4 60 34q-30-24-60-30', 'M0-110q-14 30-44 50q26-26 42-52']
      .map(d => `<path d="${d}"/>`).join('') + '</g>';

  return `<svg viewBox="0 0 1280 720" preserveAspectRatio="xMidYMid slice" xmlns="http://www.w3.org/2000/svg">
<defs>
<linearGradient id="sky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${sky[0]}"/><stop offset=".3" stop-color="${sky[1]}"/><stop offset=".48" stop-color="${sky[2]}"/><stop offset=".56" stop-color="${sky[3]}"/></linearGradient>
<radialGradient id="glow"><stop offset="0" stop-color="${sunColor}" stop-opacity=".55"/><stop offset="1" stop-color="${sunColor}" stop-opacity="0"/></radialGradient>
<radialGradient id="disc" cx=".45" cy=".4"><stop offset="0" stop-color="#fff6dc"/><stop offset=".6" stop-color="${sunColor}"/><stop offset="1" stop-color="${night ? '#d8ccb0' : '#f08b3c'}"/></radialGradient>
</defs>
<rect width="1280" height="720" fill="url(#sky)"/>${stars}
<circle cx="${sx}" cy="${sy}" r="${night ? 110 : 170}" fill="url(#glow)"/>
<circle cx="${sx}" cy="${sy}" r="${night ? 30 : 46}" fill="url(#disc)"/>
<path d="M0 372 C180 340 330 356 470 350 S760 330 900 348 1150 334 1280 350 V720 H0z" fill="${dune1}" opacity=".85"/>
<path d="M0 392 C200 374 380 386 560 380 S900 376 1080 386 1220 378 1280 382 V720 H0z" fill="${dune2}"/>
<g fill="${silhouette}">${houses}${mosque}${tower}${palm(745, .5)}${palm(950, .42)}${palm(1205, .34)}${palm(1258, .4)}
<path d="M0 ${G}h1280v${720 - G}H0z"/></g>
</svg>`;
}

// Streaming apps offered on the match page. Matched against installed apps by name/package.
const WATCH_APPS = [
  { name: 'ثمانية', keys: 'thmanyah|ثمانية', store: 'ثمانية', saudi: true },
  { name: 'TOD', keys: 'tod|bein', store: 'TOD' },
  { name: 'شاهد', keys: 'shahid|شاهد', store: 'شاهد' },
  { name: 'STC tv', keys: 'stc tv|stctv|jawwy', store: 'stc tv' },
];

const STAT_NAMES = [
  ['possessionPct', 'الاستحواذ', '%'], ['totalShots', 'التسديدات'], ['shotsOnTarget', 'على المرمى'],
  ['wonCorners', 'الركنيات'], ['foulsCommitted', 'الأخطاء'], ['offsides', 'التسلل'],
  ['yellowCards', 'البطاقات الصفراء'], ['saves', 'التصديات'],
];
