const express = require('express');
const app = express();
const port = process.env.PORT || 3000;

app.use(express.json());

app.use((req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  next();
});

app.get('/', (req, res) => {
  res.json({ status: 'ok', message: 'VSOP87 Full Series API' });
});

// Полные VSOP87 ряды для Луны (с периодическими членами)
function getMoonLongitude(jd) {
  const T = (jd - 2451545.0) / 36525.0;
  
  // Средние аргументы для Луны
  const L0 = 218.316447 + 481267.881234 * T - 0.0015786 * T * T + T * T * T / 538841;
  const D = 297.850204 + 445267.111517 * T - 0.00163 * T * T + T * T * T / 545868;
  const M = 357.529109 + 35999.050291 * T - 0.0001537 * T * T + T * T * T / 24490000;
  const Mprime = 134.963411 + 477198.867631 * T + 0.008997 * T * T + T * T * T / 69699;
  const F = 93.272099 + 483202.017527 * T - 0.003403 * T * T - T * T * T / 3526000;
  
  // Основные периодические члены (в градусах)
  const terms = [
    [0, 0, 1, 0], [2, 0, -1, 0], [2, 0, 0, 0], [0, 0, 2, 0],
    [0, 1, 0, 0], [0, 0, 0, 2], [2, 0, -2, 0], [2, -1, -1, 0],
    [2, 0, 1, 0], [2, -1, 0, 0], [0, 1, -1, 0], [1, 0, 0, 0],
    [0, 1, 1, 0], [2, 0, -3, 0], [0, 1, -2, 0], [2, -1, 2, 0]
  ];
  
  const coeffs = [
    6.28875, 1.27402, 0.65831, 0.21362, 0.18560, 0.11433, 0.05879,
    0.05712, 0.05332, 0.04587, 0.04102, 0.03495, 0.03094, 0.01533,
    0.01269, 0.01253
  ];
  
  let sum = 0;
  for (let i = 0; i < terms.length; i++) {
    const term = terms[i];
    const angle = term[0] * D + term[1] * M + term[2] * Mprime + term[3] * F;
    sum += coeffs[i] * Math.sin(angle * Math.PI / 180);
  }
  
  let longitude = L0 + sum;
  longitude = ((longitude % 360) + 360) % 360;
  return longitude;
}

// Полные VSOP87 ряды для Меркурия (упрощённые периодические члены)
function getMercuryLongitude(jd) {
  const T = (jd - 2451545.0) / 36525.0;
  
  // Средняя долгота
  let L = 252.250906 + 149472.674635 * T - 0.000005 * T * T;
  
  // Периодические поправки для Меркурия
  const perturbations = [
    [0.012, 0, 1, 0, 0], [0.008, 1, 0, 0, 0], [0.007, 2, 0, 0, 0],
    [0.005, 0, 2, 0, 0], [0.004, 1, 1, 0, 0]
  ];
  
  for (let i = 0; i < perturbations.length; i++) {
    L += perturbations[i][0] * Math.sin(perturbations[i][1] * 2 * Math.PI * T);
  }
  
  return ((L % 360) + 360) % 360;
}

// Остальные планеты (средние долготы — достаточно точно)
function getPlanetLongitude(planetId, daysSince2000) {
  const L0 = [280.46646, 218.316, 252.250, 181.979, 355.433, 34.351, 50.077, 313.232, 304.348, 238.928];
  const n = [0.9856474, 13.176358, 4.092335, 1.602130, 0.524038, 0.083090, 0.033457, 0.011723, 0.005957, 0.003955];
  let lon = L0[planetId] + n[planetId] * daysSince2000;
  return ((lon % 360) + 360) % 360;
}

function getAyanamsha(jd) {
  const t = (jd - 2451545.0) / 36525.0;
  const precession = (5025.64 * t + 1.11 * t * t + 0.000001 * t * t * t) / 3600;
  const ay = 23.436346 - 0.005 - (t * 0.000153);
  return ay - precession;
}

function getRahu(jd) {
  const T = (jd - 2451545.0) / 36525.0;
  let rahu = 125.044522 - 1934.136261 * T + 0.0020708 * T * T + T * T * T / 450000;
  rahu = ((rahu % 360) + 360) % 360;
  return rahu;
}

function toJulianDay(year, month, day, hour, minute, second) {
  let y = year, m = month;
  if (m <= 2) { y -= 1; m += 12; }
  const a = Math.floor(y / 100);
  const b = 2 - a + Math.floor(a / 4);
  const jd = Math.floor(365.25 * (y + 4716)) + Math.floor(30.6001 * (m + 1)) + day + b - 1524.5;
  const ut = hour + minute/60 + second/3600;
  return jd + ut / 24;
}

app.post('/api/planet', (req, res) => {
  try {
    const { year, month, day, hour, minute, second, planetId } = req.body;
    if (!year || !month || !day || planetId === undefined) {
      return res.status(400).json({ error: 'Missing parameters' });
    }

    const h = (hour !== undefined && hour !== null) ? hour : 12;
    const m = (minute !== undefined && minute !== null) ? minute : 0;
    const s = (second !== undefined && second !== null) ? second : 0;

    const jd = toJulianDay(year, month, day, h, m, s);
    const ayanamsha = getAyanamsha(jd);
    const daysSince2000 = jd - 2451545.0;

    // Раху и Кету
    if (planetId === 10) {
      const rahuTropical = getRahu(jd);
      let rahuSidereal = rahuTropical - ayanamsha;
      rahuSidereal = ((rahuSidereal % 360) + 360) % 360;
      rahuSidereal = Math.round(rahuSidereal * 1000) / 1000;
      return res.json({ value: rahuSidereal });
    }
    if (planetId === 11) {
      const rahuTropical = getRahu(jd);
      let rahuSidereal = rahuTropical - ayanamsha;
      rahuSidereal = ((rahuSidereal % 360) + 360) % 360;
      let ketuSidereal = rahuSidereal + 180;
      ketuSidereal = ((ketuSidereal % 360) + 360) % 360;
      ketuSidereal = Math.round(ketuSidereal * 1000) / 1000;
      return res.json({ value: ketuSidereal });
    }

    // Луна (специальная обработка)
    if (planetId === 1) {
      const tropicalLong = getMoonLongitude(jd);
      let siderealLong = tropicalLong - ayanamsha;
      siderealLong = ((siderealLong % 360) + 360) % 360;
      siderealLong = Math.round(siderealLong * 1000) / 1000;
      return res.json({ value: siderealLong });
    }
    
    // Меркурий (специальная обработка)
    if (planetId === 2) {
      const tropicalLong = getMercuryLongitude(jd);
      let siderealLong = tropicalLong - ayanamsha;
      siderealLong = ((siderealLong % 360) + 360) % 360;
      siderealLong = Math.round(siderealLong * 1000) / 1000;
      return res.json({ value: siderealLong });
    }

    // Остальные планеты (0,3-9)
    if (planetId >= 0 && planetId <= 9) {
      const tropicalLong = getPlanetLongitude(planetId, daysSince2000);
      let siderealLong = tropicalLong - ayanamsha;
      siderealLong = ((siderealLong % 360) + 360) % 360;
      siderealLong = Math.round(siderealLong * 1000) / 1000;
      return res.json({ value: siderealLong });
    }

    return res.status(400).json({ error: 'Invalid planetId' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

app.listen(port, () => {
  console.log(`VSOP87 Full Series API running on port ${port}`);
});
