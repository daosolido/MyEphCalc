const express = require('express');
const { load, Constants } = require('@fusionstrings/swiss-eph');
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

let eph = null;

async function init() {
  eph = await load();
  console.log('Swiss Ephemeris loaded');
}
init().catch(err => console.error('Failed to load:', err));

app.get('/', (req, res) => {
  res.json({ status: 'ok', message: 'Swiss Ephemeris API ready' });
});

function toJulianDay(year, month, day, hour, min, sec) {
  let y = year, m = month;
  if (m <= 2) { y--; m += 12; }
  const a = Math.floor(y / 100);
  const b = 2 - a + Math.floor(a / 4);
  const jd = Math.floor(365.25 * (y + 4716)) + Math.floor(30.6001 * (m + 1)) + day + b - 1524.5;
  const ut = hour + min/60 + sec/3600;
  return jd + ut / 24;
}

app.post('/api/planet', async (req, res) => {
  try {
    if (!eph) return res.status(503).json({ error: 'Initializing...' });
    const { year, month, day, hour, minute, second, planetId } = req.body;
    if (!year || !month || !day || planetId === undefined)
      return res.status(400).json({ error: 'Missing parameters' });

    const h = hour !== undefined ? hour : 12;
    const m = minute !== undefined ? minute : 0;
    const s = second !== undefined ? second : 0;

    const jd = toJulianDay(year, month, day, h, m, s);
    const ayanamsha = eph.swe_get_ayanamsa_ut(jd);
    const flags = Constants.SEFLG_SPEED | Constants.SEFLG_SWIEPH;

    let lon;
    if (planetId === 10) { // Раху
      const node = eph.swe_nod_aps_ut(jd, Constants.SE_TRUE_NODE, flags);
      lon = node.xnasc_long;
    } else if (planetId === 11) { // Кету
      const node = eph.swe_nod_aps_ut(jd, Constants.SE_TRUE_NODE, flags);
      lon = node.xndsc_long;
    } else {
      const planet = eph.swe_calc_ut(jd, planetId, flags);
      lon = planet.longitude;
    }

    let sidereal = lon - ayanamsha;
    sidereal = ((sidereal % 360) + 360) % 360;
    sidereal = Math.round(sidereal * 1000) / 1000;

    res.json({ value: sidereal });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

app.listen(port, () => console.log(`Server on port ${port}`));
