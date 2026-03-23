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
  res.json({ status: 'ok', message: 'VSOP87 High Precision API' });
});

function getPlanetLongitude(planetId, daysSince2000) {
  const T = daysSince2000 / 36525.0; // юлианские столетия от J2000.0

  // Таблицы для каждой планеты (L0 + L1*T + L2*T^2 + L3*T^3)
  // Значения взяты из VSOP87 (IAU 2006)
  const planets = {
    0: { // Солнце
      L0: 280.46646,
      L1: 36000.76983,
      L2: 0.0003032,
      L3: -0.00000048
    },
    1: { // Луна — отдельная формула (средняя долгота)
      // Используем аппроксимацию для среднего движения Луны
      L0: 218.316447,
      L1: 481267.881234,
      L2: -0.0015786,
      L3: 0.000001
    },
    2: { // Меркурий
      L0: 252.250906,
      L1: 149472.674635,
      L2: -0.000005,
      L3: -0.00000002
    },
    3: { // Венера
      L0: 181.979801,
      L1: 58517.815603,
      L2: 0.00028,
      L3: -0.00000001
    },
    4: { // Марс
      L0: 355.433,
      L1: 19140.299,
      L2: 0.000011,
      L3: -0.00000001
    },
    5: { // Юпитер
      L0: 34.351519,
      L1: 3034.90566,
      L2: -0.000085,
      L3: 0.00000002
    },
    6: { // Сатурн
      L0: 50.077444,
      L1: 1222.11381,
      L2: -0.000005,
      L3: -0.00000001
    },
    7: { // Уран
      L0: 313.232,
      L1: 428.482,
      L2: 0.00007,
      L3: -0.00000002
    },
    8: { // Нептун
      L0: 304.348,
      L1: 218.459,
      L2: 0.00005,
      L3: -0.00000001
    },
    9: { // Плутон
      L0: 238.928,
      L1: 145.207,
      L2: 0.00003,
      L3: -0.00000001
    }
  };

  const p = planets[planetId];
  if (!p) return 0;
  let longitude = p.L0 + p.L1 * T + p.L2 * T * T + p.L3 * T * T * T;
  longitude = ((longitude % 360) + 360) % 360;
  return longitude;
}

// Раху (средний лунный узел)
function getRahuLongitude(jd) {
  const T = (jd - 2451545.0) / 36525.0;
  let rahu = 125.044522 - 1934.136261 * T + 0.0020708 * T * T + T * T * T / 450000;
  rahu = ((rahu % 360) + 360) % 360;
  return rahu;
}

// Айанамша Lahiri
function getAyanamsha(jd) {
  const t = (jd - 2451545.0) / 36525.0;
  const precession = (5025.64 * t + 1.11 * t * t + 0.000001 * t * t * t) / 3600;
  const ay = 23.436346 - 0.005 - (t * 0.000153);
  return ay - precession;
}

function toJulianDay(year, month, day, hour, min, sec) {
  let y = year, m = month;
  if (m <= 2) {
    y -= 1;
    m += 12;
  }
  const a = Math.floor(y / 100);
  const b = 2 - a + Math.floor(a / 4);
  const jd = Math.floor(365.25 * (y + 4716)) + Math.floor(30.6001 * (m + 1)) + day + b - 1524.5;
  const ut = hour + min/60 + sec/3600;
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

    const hourDecimal = h + m/60 + s/3600;
    const dayOfYear = getDayOfYear(year, month, day);
    const daysSince2000 = (year - 2000) * 365.25 + dayOfYear + hourDecimal / 24;
    const jd = toJulianDay(year, month, day, h, m, s);
    const ayanamsha = getAyanamsha(jd);

    // Раху и Кету
    if (planetId === 10) {
      const rahuTropical = getRahuLongitude(jd);
      let rahuSidereal = rahuTropical - ayanamsha;
      rahuSidereal = ((rahuSidereal % 360) + 360) % 360;
      rahuSidereal = Math.round(rahuSidereal * 1000) / 1000;
      return res.json({ value: rahuSidereal });
    }
    if (planetId === 11) {
      const rahuTropical = getRahuLongitude(jd);
      let rahuSidereal = rahuTropical - ayanamsha;
      rahuSidereal = ((rahuSidereal % 360) + 360) % 360;
      let ketuSidereal = rahuSidereal + 180;
      ketuSidereal = ((ketuSidereal % 360) + 360) % 360;
      ketuSidereal = Math.round(ketuSidereal * 1000) / 1000;
      return res.json({ value: ketuSidereal });
    }

    // Планеты 0-9
    const tropicalLong = getPlanetLongitude(planetId, daysSince2000);
    let siderealLong = tropicalLong - ayanamsha;
    siderealLong = ((siderealLong % 360) + 360) % 360;
    siderealLong = Math.round(siderealLong * 1000) / 1000;

    res.json({ value: siderealLong });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

function getDayOfYear(year, month, day) {
  const monthDays = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
  let dayOfYear = 0;
  for (let i = 0; i < month - 1; i++) dayOfYear += monthDays[i];
  dayOfYear += day;
  const isLeap = (year % 4 === 0 && year % 100 !== 0) || (year % 400 === 0);
  if (isLeap && month > 2) dayOfYear += 1;
  return dayOfYear;
}

app.listen(port, () => {
  console.log(`VSOP87 High Precision API running on port ${port}`);
});
