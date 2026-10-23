// Prayer times, Umm al-Qura method (the official Saudi calendar), computed offline.
//   Fajr: sun 18.5° below the horizon.  Asr: shadow = object + noon shadow (Shafi'i/standard).
//   Isha: 90 minutes after Maghrib (120 during Ramadan).  Sunrise/Maghrib: 0.833° refraction.
(function (root) {
  'use strict';
  const D2R = Math.PI / 180, R2D = 180 / Math.PI;
  const sin = d => Math.sin(d * D2R), cos = d => Math.cos(d * D2R), tan = d => Math.tan(d * D2R);
  const asin = x => R2D * Math.asin(x), acos = x => R2D * Math.acos(x), atan2 = (y, x) => R2D * Math.atan2(y, x);
  const acot = x => R2D * Math.atan(1 / x);
  const fix = (a, b) => { a = a - b * Math.floor(a / b); return a < 0 ? a + b : a; };

  function julian(y, m, d) {
    if (m <= 2) { y -= 1; m += 12; }
    const A = Math.floor(y / 100), B = 2 - A + Math.floor(A / 4);
    return Math.floor(365.25 * (y + 4716)) + Math.floor(30.6001 * (m + 1)) + d + B - 1524.5;
  }

  function sunPosition(jd) {
    const D = jd - 2451545.0;
    const g = fix(357.529 + 0.98560028 * D, 360);
    const q = fix(280.459 + 0.98564736 * D, 360);
    const L = fix(q + 1.915 * sin(g) + 0.020 * sin(2 * g), 360);
    const e = 23.439 - 0.00000036 * D;
    const RA = fix(atan2(cos(e) * sin(L), cos(L)) / 15, 24);
    return { decl: asin(sin(e) * sin(L)), eqt: q / 15 - RA };
  }

  // Times in hours, local clock of the given UTC offset.
  function compute(date, lat, lng, tz) {
    const jd = julian(date.getFullYear(), date.getMonth() + 1, date.getDate()) - lng / (15 * 24);
    const noonAt = t => { const p = sunPosition(jd + t / 24); return fix(12 - p.eqt, 24); };
    const angleTime = (angle, t, ccw) => {
      const p = sunPosition(jd + t / 24);
      const noon = fix(12 - p.eqt, 24);
      const T = acos((-sin(angle) - sin(p.decl) * sin(lat)) / (cos(p.decl) * cos(lat))) / 15;
      return noon + (ccw ? -T : T);
    };
    const asrTime = (factor, t) => {
      const p = sunPosition(jd + t / 24);
      const angle = -acot(factor + tan(Math.abs(lat - p.decl)));
      return angleTime(angle, t, false);
    };
    // Two passes: first with rough guesses, then refined at each event's own time.
    let t = { fajr: 5, sunrise: 6, dhuhr: 12, asr: 13, maghrib: 18 };
    for (let i = 0; i < 2; i++) {
      t = {
        fajr: angleTime(18.5, t.fajr, true),
        sunrise: angleTime(0.833, t.sunrise, true),
        dhuhr: noonAt(t.dhuhr),
        asr: asrTime(1, t.asr),
        maghrib: angleTime(0.833, t.maghrib, false),
      };
    }
    const shift = tz - lng / 15;
    for (const k in t) t[k] += shift;
    t.isha = t.maghrib + (isRamadan(date) ? 2 : 1.5);
    return t;
  }

  function isRamadan(date) {
    try {
      const m = new Intl.DateTimeFormat('en-u-ca-islamic-umalqura', { month: 'numeric' }).format(date);
      return parseInt(m, 10) === 9;
    } catch (e) { return false; }
  }

  // Date objects for each prayer of the given day (rounded to the nearest minute).
  function forDay(date, lat, lng, tz) {
    const t = compute(date, lat, lng, tz);
    const out = {};
    for (const k of ['fajr', 'sunrise', 'dhuhr', 'asr', 'maghrib', 'isha']) {
      const mins = Math.round(t[k] * 60);
      const d = new Date(date.getFullYear(), date.getMonth(), date.getDate(), 0, 0, 0, 0);
      d.setMinutes(mins);
      out[k] = d;
    }
    return out;
  }

  root.Prayer = { forDay, compute, isRamadan };
  if (typeof module !== 'undefined') module.exports = root.Prayer;
})(typeof window !== 'undefined' ? window : globalThis);
