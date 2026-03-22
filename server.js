const express = require('express');
const app = express();
const port = process.env.PORT || 3000;

app.use(express.json());

// CORS
app.use((req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  next();
});

app.get('/', (req, res) => {
  res.json({ status: 'ok', message: 'Vedic Astrology API' });
});

// Функция юлианской даты
function getJulianDay(year, month, day, hourDecimal) {
  const a = Math.floor((14 - month) / 12);
  const y = year + 4800 - a;
  const m = month + 12 * a - 3;
  let jd = day + Math.floor((153 * m + 2) / 5) + 365 * y + Math.floor(y / 4) - Math.floor(y / 100) + Math.floor(y / 400) - 32045;
  return jd + hourDecimal / 24;
}

// Айанамша Lahiri
function getAyanamsha(jd) {
  const t = (jd - 2451545.0) / 36525.0;
  // Lahiri ayanamsha formula (стандартная)
  const ayan = 23.436346 - 0.005 - (t * 0.000153) - ((5025.64 * t + 1.11 * t * t) / 3600);
  return ayan;
}

// Раху (средний лунный узел)
function getRahu(jd) {
  const T = (jd - 2451545.0) / 36525.0;
  // Формула из Swiss Ephemeris для среднего узла
  let rahu = 125.044522 - 1934.136261 * T + 0.0020708 * T * T + T * T * T / 450000;
  rahu = ((rahu % 360) + 360) % 360;
  return rahu;
}

app.post('/api/planet', (req, res) => {
  try {
    const { year, month, day, hour, minute, second, planetId } = req.body;

    console.log('Request:', { year, month, day, hour, minute, second, planetId });

    if (!year || !month || !day || planetId === undefined) {
      return res.status(400).json({ error: 'Missing parameters' });
    }

    // Расчёт дня года
    const monthDays = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
    let dayOfYear = 0;
    for (let i = 0; i < month - 1; i++) dayOfYear += monthDays[i];
    dayOfYear += day;

    const isLeap = (year % 4 === 0 && year % 100 !== 0) || (year % 400 === 0);
    if (isLeap && month > 2) dayOfYear += 1;

    const hourDecimal = (hour || 12) + (minute || 0) / 60 + (second || 0) / 3600;
    const daysSince2000 = (year - 2000) * 365.25 + dayOfYear + hourDecimal / 24;
    const jd = getJulianDay(year, month, day, hourDecimal);
    const ayanamsha = getAyanamsha(jd);

    // Специальная обработка для Раху (10) и Кету (11)
    if (planetId === 10) {
      const rahuTropical = getRahu(jd);
      let rahuSidereal = rahuTropical - ayanamsha;
      rahuSidereal = ((rahuSidereal % 360) + 360) % 360;
      rahuSidereal = Math.round(rahuSidereal * 1000) / 1000;
      console.log('Rahu calculated:', rahuSidereal);
      return res.json({ value: rahuSidereal, planet: 'Rahu' });
    }

    if (planetId === 11) {
      const rahuTropical = getRahu(jd);
      let rahuSidereal = rahuTropical - ayanamsha;
      rahuSidereal = ((rahuSidereal % 360) + 360) % 360;
      let ketuSidereal = rahuSidereal + 180;
      ketuSidereal = ((ketuSidereal % 360) + 360) % 360;
      ketuSidereal = Math.round(ketuSidereal * 1000) / 1000;
      console.log('Ketu calculated:', ketuSidereal);
      return res.json({ value: ketuSidereal, planet: 'Ketu' });
    }

    // Обычные планеты (0-9)
    const L0 = [280.46646, 218.316, 252.250, 181.979, 355.433, 34.351, 50.077, 313.232, 304.348, 238.928];
    const n = [0.9856474, 13.176358, 4.092335, 1.602130, 0.524038, 0.083090, 0.033457, 0.011723, 0.005957, 0.003955];

    let tropicalLong = L0[planetId] + n[planetId] * daysSince2000;
    tropicalLong = ((tropicalLong % 360) + 360) % 360;
    let siderealLong = tropicalLong - ayanamsha;
    siderealLong = ((siderealLong % 360) + 360) % 360;
    siderealLong = Math.round(siderealLong * 1000) / 1000;

    return res.json({ value: siderealLong, planet: planetId });

  } catch (error) {
    console.error('Error:', error);
    return res.status(500).json({ error: error.message });
  }
});

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});
