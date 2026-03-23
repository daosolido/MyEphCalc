const express = require('express');
const swisseph = require('swisseph');
const { promisify } = require('util');
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
  res.json({ status: 'ok', message: 'Swiss Ephemeris API ready' });
});

swisseph.swe_set_sid_mode(swisseph.SE_SIDM_LAHIRI, 0, 0);

const swe_julday = promisify(swisseph.swe_julday);
const swe_calc_ut = promisify(swisseph.swe_calc_ut);
const swe_nod_aps_ut = promisify(swisseph.swe_nod_aps_ut);
const swe_get_ayanamsa_ut = promisify(swisseph.swe_get_ayanamsa_ut);

function toJulianDay(year, month, day, hour, minute, second) {
  const ut = hour + minute/60 + second/3600;
  return swe_julday(year, month, day, ut, swisseph.SE_GREG_CAL);
}

app.post('/api/planet', async (req, res) => {
  try {
    const { year, month, day, hour, minute, second, planetId } = req.body;
    if (!year || !month || !day || planetId === undefined) {
      return res.status(400).json({ error: 'Missing parameters' });
    }

    const h = (hour !== undefined && hour !== null) ? hour : 12;
    const m = (minute !== undefined && minute !== null) ? minute : 0;
    const s = (second !== undefined && second !== null) ? second : 0;

    const jd = await toJulianDay(year, month, day, h, m, s);
    const ayanamsha = await swe_get_ayanamsa_ut(jd);
    const flags = swisseph.SEFLG_SPEED | swisseph.SEFLG_MOSEPH;

    // Раху и Кету
    if (planetId === 10) {
      const node = await swe_nod_aps_ut(jd, swisseph.SE_TRUE_NODE, flags);
      let rahu = node.xnasc_long - ayanamsha;
      rahu = ((rahu % 360) + 360) % 360;
      return res.json({ value: Math.round(rahu * 1000) / 1000, ayanamsha });
    }
    if (planetId === 11) {
      const node = await swe_nod_aps_ut(jd, swisseph.SE_TRUE_NODE, flags);
      let rahu = node.xnasc_long - ayanamsha;
      rahu = ((rahu % 360) + 360) % 360;
      let ketu = rahu + 180;
      ketu = ((ketu % 360) + 360) % 360;
      return res.json({ value: Math.round(ketu * 1000) / 1000, ayanamsha });
    }

    // Обычные планеты
    const body = await swe_calc_ut(jd, planetId, flags);
    let tropical = body.longitude;
    let sidereal = tropical - ayanamsha;
    sidereal = ((sidereal % 360) + 360) % 360;
    sidereal = Math.round(sidereal * 1000) / 1000;

    res.json({ value: sidereal, ayanamsha });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

app.listen(port, () => {
  console.log(`Swiss Ephemeris API running on port ${port}`);
});
