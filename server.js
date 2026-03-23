const express = require('express');
const app = express();
const port = process.env.PORT || 3000;

// Импорты из astronomia
const { vsop87, julian, planetposition, moonposition } = require('astronomia');

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

// Создаём объекты планет один раз при старте
const planets = {
  0: new planetposition.Planet(vsop87.sun),
  2: new planetposition.Planet(vsop87.mercury),
  3: new planetposition.Planet(vsop87.venus),
  4: new planetposition.Planet(vsop87.mars),
  5: new planetposition.Planet(vsop87.jupiter),
  6: new planetposition.Planet(vsop87.saturn),
  7: new planetposition.Planet(vsop87.uranus),
  8: new planetposition.Planet(vsop87.neptune),
  9: new planetposition.Planet(vsop87.pluto)
};

function getPlanetLongitude(jd, planetId) {
  if (planetId === 1) {
    const moon = moonposition.position(jd);
    return moon.longitude;
  }
  const planet = planets[planetId];
  if (!planet) return null;
  const pos = vsop87.apparentPosition(jd, planet);
  return pos.longitude;
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
  const ut = hour + minute/60 + second/3600;
  return julian.CalendarGregorianToJD(year, month, day, ut);
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

    // Раху и Кету
    if (planetId === 10) {
      const rahuTropical = getRahu(jd);
      let rahuSidereal = rahuTropical - ayanamsha;
      rahuSidereal = ((rahuSidereal % 360) + 360) % 360;
      rahuSidereal = Math.round(rahuSidereal * 1000) / 1000;
      return res.json({ value: rahuSidereal, jd });
    }
    if (planetId === 11) {
      const rahuTropical = getRahu(jd);
      let rahuSidereal = rahuTropical - ayanamsha;
      rahuSidereal = ((rahuSidereal % 360) + 360) % 360;
      let ketuSidereal = rahuSidereal + 180;
      ketuSidereal = ((ketuSidereal % 360) + 360) % 360;
      ketuSidereal = Math.round(ketuSidereal * 1000) / 1000;
      return res.json({ value: ketuSidereal, jd });
    }

    // Планеты 0-9
    if (planetId >= 0 && planetId <= 9) {
      const tropicalLong = getPlanetLongitude(jd, planetId);
      if (tropicalLong === null) {
        return res.status(400).json({ error: 'Invalid planetId' });
      }
      let siderealLong = tropicalLong - ayanamsha;
      siderealLong = ((siderealLong % 360) + 360) % 360;
      siderealLong = Math.round(siderealLong * 1000) / 1000;
      return res.json({ value: siderealLong, jd });
    }

    return res.status(400).json({ error: 'Invalid planetId' });
  } catch (err) {
    console.error('Unhandled error:', err);
    res.status(500).json({ error: err.message });
  }
});

app.listen(port, () => {
  console.log(`Astronomia API running on port ${port}`);
});
