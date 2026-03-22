const express = require('express');
const app = express();
const port = process.env.PORT || 3000;
const swisseph = require('swisseph');

// Инициализация Swiss Ephemeris
swisseph.swe_set_ephe_path('./ephe'); // путь к эфемеридным файлам

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
  res.json({ status: 'ok', message: 'Swiss Ephemeris API' });
});

// Преобразование даты в юлианскую
function getJulianDay(year, month, day, hourDecimal) {
  const a = Math.floor((14 - month) / 12);
  const y = year + 4800 - a;
  const m = month + 12 * a - 3;
  let jd = day + Math.floor((153 * m + 2) / 5) + 365 * y + Math.floor(y / 4) - Math.floor(y / 100) + Math.floor(y / 400) - 32045;
  return jd + hourDecimal / 24;
}

// Айанамша Lahiri через Swiss Ephemeris
function getAyanamsha(jd) {
  return new Promise((resolve, reject) => {
    swisseph.swe_get_ayanamsa_ut(jd, (err, ayan) => {
      if (err) reject(err);
      else resolve(ayan);
    });
  });
}

// Расчёт планеты через Swiss Ephemeris
function getPlanet(jd, planetId, ayanamsha) {
  return new Promise((resolve, reject) => {
    const iflag = swisseph.SEFLG_SIDEREAL | swisseph.SEFLG_SPEED;
    swisseph.swe_calc_ut(jd, planetId, iflag, (err, body) => {
      if (err) reject(err);
      else {
        let longitude = body.longitude - ayanamsha;
        longitude = ((longitude % 360) + 360) % 360;
        resolve(Math.round(longitude * 1000) / 1000);
      }
    });
  });
}

// Раху и Кету через Swiss Ephemeris
function getNodes(jd, ayanamsha) {
  return new Promise((resolve, reject) => {
    swisseph.swe_nod_aps_ut(jd, swisseph.SE_TRUE_NODE, swisseph.SEFLG_SIDEREAL, (err, nodes) => {
      if (err) reject(err);
      else {
        let rahu = nodes.nasc_long - ayanamsha;
        let ketu = nodes.ndsc_long - ayanamsha;
        rahu = ((rahu % 360) + 360) % 360;
        ketu = ((ketu % 360) + 360) % 360;
        resolve({ rahu: Math.round(rahu * 1000) / 1000, ketu: Math.round(ketu * 1000) / 1000 });
      }
    });
  });
}

app.post('/api/planet', async (req, res) => {
  try {
    const { year, month, day, hour, minute, second, planetId } = req.body;

    if (!year || !month || !day || planetId === undefined) {
      return res.status(400).json({ error: 'Missing parameters' });
    }

    const hourDecimal = (hour || 12) + (minute || 0) / 60 + (second || 0) / 3600;
    const jd = getJulianDay(year, month, day, hourDecimal);
    const ayanamsha = await getAyanamsha(jd);

    // Раху и Кету (10 и 11)
    if (planetId === 10 || planetId === 11) {
      const nodes = await getNodes(jd, ayanamsha);
      if (planetId === 10) return res.json({ value: nodes.rahu });
      if (planetId === 11) return res.json({ value: nodes.ketu });
    }

    // Обычные планеты (0-9)
    if (planetId >= 0 && planetId <= 9) {
      const longitude = await getPlanet(jd, planetId, ayanamsha);
      return res.json({ value: longitude });
    }

    return res.status(400).json({ error: 'Invalid planetId' });

  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: error.message });
  }
});

app.listen(port, () => {
  console.log(`Swiss Ephemeris API running on port ${port}`);
});
