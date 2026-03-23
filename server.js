const express = require('express');
const { vsop87, julian, planetposition, moonposition } = require('astronomia');

const app = express();
const port = process.env.PORT || 3000;

app.use(express.json());

// CORS
app.use((req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  next();
});

app.get('/', (req, res) => {
  res.json({ status: 'ok', message: 'Astronomia API ready' });
});

// Тропическая долгота планеты (геоцентрическая)
function getPlanetLongitude(jd, planetId) {
  // Карта planetId -> функция для получения позиции
  const planets = {
    0: planetposition.sun,
    2: planetposition.mercury,
    3: planetposition.venus,
    4: planetposition.mars,
    5: planetposition.jupiter,
    6: planetposition.saturn,
    7: planetposition.uranus,
    8: planetposition.neptune,
    9: planetposition.pluto
  };

  if (planetId === 1) {
    // Луна
    const moon = moonposition.position(jd);
    return moon.longitude;
  } else if (planets[planetId]) {
    const pos = vsop87.apparentPosition(jd, planets[planetId]);
    return pos.longitude;
  } else {
    return null;
  }
}

// Айанамша Lahiri (формула из Swiss Ephemeris)
function getAyanamsha(jd) {
  const t = (jd - 2451545.0) / 36525.0;
  const precession = (5025.64 * t + 1.11 * t * t + 0.000001 * t * t * t) / 3600;
  const ay = 23.436346 - 0.005 - (t * 0.000153);
  return ay - precession;
}

// Раху (средний лунный узел)
function getRahu(jd) {
  const T = (jd - 2451545.0) / 36525.0;
  let rahu = 125.044522 - 1934.136261 * T + 0.0020708 * T * T + T * T * T / 450000;
  rahu = ((rahu % 360) + 360) % 360;
  return rahu;
}

// Юлианская дата через astronomia
function toJulianDay(year, month, day, hour, minute, second) {
  const ut = hour + minute / 60 + second / 3600;
  return julian.CalendarGregorianToJD(year, month, day, ut);
}

// Эндпоинт для получения позиции планеты
app.post('/api/planet', (req, res) => {
  try {
    let { year, month, day, hour, minute, second, planetId } = req.body;

    // Проверка обязательных параметров
    if (!year || !month || !day || planetId === undefined) {
      return res.status(400).json({ error: 'Missing parameters: year, month, day, planetId' });
    }

    // Нормализация времени (по умолчанию 12:00)
    const h = (hour !== undefined && hour !== null) ? hour : 12;
    const m = (minute !== undefined && minute !== null) ? minute : 0;
    const s = (second !== undefined && second !== null) ? second : 0;

    const jd = toJulianDay(year, month, day, h, m, s);
    const ayanamsha = getAyanamsha(jd);

    // Раху (10) и Кету (11)
    if (planetId === 10) {
      const rahuTrop = getRahu(jd);
      let rahuSid = rahuTrop - ayanamsha;
      rahuSid = ((rahuSid % 360) + 360) % 360;
      rahuSid = Math.round(rahuSid * 1000) / 1000;
      return res.json({ value: rahuSid });
    }
    if (planetId === 11) {
      const rahuTrop = getRahu(jd);
      let rahuSid = rahuTrop - ayanamsha;
      rahuSid = ((rahuSid % 360) + 360) % 360;
      let ketuSid = rahuSid + 180;
      ketuSid = ((ketuSid % 360) + 360) % 360;
      ketuSid = Math.round(ketuSid * 1000) / 1000;
      return res.json({ value: ketuSid });
    }

    // Планеты 0–9
    if (planetId >= 0 && planetId <= 9) {
      const tropicalLong = getPlanetLongitude(jd, planetId);
      if (tropicalLong === null) {
        return res.status(400).json({ error: 'Invalid planetId' });
      }
      let siderealLong = tropicalLong - ayanamsha;
      siderealLong = ((siderealLong % 360) + 360) % 360;
      siderealLong = Math.round(siderealLong * 1000) / 1000;
      return res.json({ value: siderealLong });
    }

    return res.status(400).json({ error: 'Invalid planetId' });
  } catch (err) {
    console.error('Error:', err);
    return res.status(500).json({ error: err.message });
  }
});

// Эндпоинт для проверки юлианской даты
app.post('/api/jd', (req, res) => {
  try {
    let { year, month, day, hour, minute, second } = req.body;
    const h = (hour !== undefined && hour !== null) ? hour : 12;
    const m = (minute !== undefined && minute !== null) ? minute : 0;
    const s = (second !== undefined && second !== null) ? second : 0;
    const jd = toJulianDay(year, month, day, h, m, s);
    res.json({ jd });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});
