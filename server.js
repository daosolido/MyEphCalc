const express = require('express');
const swisseph = require('swisseph');
const app = express();
const port = process.env.PORT || 3000;

// Путь к эфемеридным файлам (папка ephe в корне)
swisseph.swe_set_ephe_path('./ephe');

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
  res.json({ status: 'ok', message: 'Swiss Ephemeris API ready' });
});

// Юлианская дата
function toJulianDay(year, month, day, hour, min, sec) {
  let y = year;
  let m = month;
  if (m <= 2) {
    y -= 1;
    m += 12;
  }
  const a = Math.floor(y / 100);
  const b = 2 - a + Math.floor(a / 4);
  const jd = Math.floor(365.25 * (y + 4716)) + Math.floor(30.6001 * (m + 1)) + day + b - 1524.5;
  const ut = hour + min / 60 + sec / 3600;
  return jd + ut / 24;
}

// Айанамша Lahiri
function getAyanamsha(jd) {
  return new Promise((resolve, reject) => {
    swisseph.swe_get_ayanamsa_ut(jd, (err, ayan) => {
      if (err) reject(err);
      else resolve(ayan);
    });
  });
}

// Расчёт планеты или узла
function getPlanet(jd, planetId, ayanamsha, flags) {
  return new Promise((resolve, reject) => {
    if (planetId === 10 || planetId === 11) { // Раху / Кету
      swisseph.swe_nod_aps_ut(jd, swisseph.SE_TRUE_NODE, flags, (err, nodes) => {
        if (err) reject(err);
        else {
          let lon = (planetId === 10) ? nodes.nasc_long : nodes.ndsc_long;
          lon -= ayanamsha;
          lon = ((lon % 360) + 360) % 360;
          resolve(Math.round(lon * 1000) / 1000);
        }
      });
    } else { // планеты 0-9
      swisseph.swe_calc_ut(jd, planetId, flags, (err, body) => {
        if (err) reject(err);
        else {
          let lon = body.longitude - ayanamsha;
          lon = ((lon % 360) + 360) % 360;
          resolve(Math.round(lon * 1000) / 1000);
        }
      });
    }
  });
}

app.post('/api/planet', async (req, res) => {
  try {
    const { year, month, day, hour, minute, second, planetId } = req.body;

    if (!year || !month || !day || planetId === undefined) {
      return res.status(400).json({ error: 'Missing parameters' });
    }

    const h = (hour !== undefined) ? hour : 12;
    const m = (minute !== undefined) ? minute : 0;
    const s = (second !== undefined) ? second : 0;

    const jd = toJulianDay(year, month, day, h, m, s);
    const ayanamsha = await getAyanamsha(jd);
    const flags = swisseph.SEFLG_SPEED; // можно добавить SEFLG_SIDEREAL, но мы вычитаем сами

    const value = await getPlanet(jd, planetId, ayanamsha, flags);
    res.json({ value });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});
