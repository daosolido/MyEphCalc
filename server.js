const express = require('express');
const swisseph = require('swisseph');
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
  res.json({ status: 'ok', message: 'Swiss Ephemeris API ready' });
});

// Путь к эфемеридным файлам (пустая строка = встроенный Moshier)
swisseph.swe_set_ephe_path('');

// Устанавливаем айанамшу Lahiri
swisseph.swe_set_sid_mode(swisseph.SE_SIDM_LAHIRI, 0, 0);

function toJulianDay(year, month, day, hour, minute, second, callback) {
  const ut = hour + minute/60 + second/3600;
  swisseph.swe_julday(year, month, day, ut, swisseph.SE_GREG_CAL, callback);
}

function getPlanetLongitude(jd, planetId, callback) {
  const flags = swisseph.SEFLG_SPEED | swisseph.SEFLG_SWIEPH; // можно SEFLG_MOSEPH для встроенных данных
  swisseph.swe_calc_ut(jd, planetId, flags, (err, body) => {
    if (err) return callback(err);
    callback(null, body.longitude);
  });
}

function getRahu(jd, callback) {
  const flags = swisseph.SEFLG_SPEED | swisseph.SEFLG_SWIEPH;
  swisseph.swe_nod_aps_ut(jd, swisseph.SE_TRUE_NODE, flags, (err, nodes) => {
    if (err) return callback(err);
    callback(null, nodes.xnasc_long);
  });
}

function getAyanamsha(jd, callback) {
  swisseph.swe_get_ayanamsa_ut(jd, callback);
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

    toJulianDay(year, month, day, h, m, s, (err, jd) => {
      if (err) return res.status(500).json({ error: err.toString() });

      getAyanamsha(jd, (err, ayanamsha) => {
        if (err) return res.status(500).json({ error: err.toString() });

        const handleResult = (longitude) => {
          let sidereal = longitude - ayanamsha;
          sidereal = ((sidereal % 360) + 360) % 360;
          sidereal = Math.round(sidereal * 1000) / 1000;
          res.json({ value: sidereal, ayanamsha });
        };

        if (planetId === 10) {
          getRahu(jd, (err, rahu) => {
            if (err) return res.status(500).json({ error: err.toString() });
            handleResult(rahu);
          });
        } else if (planetId === 11) {
          getRahu(jd, (err, rahu) => {
            if (err) return res.status(500).json({ error: err.toString() });
            let ketu = rahu + 180;
            ketu = ((ketu % 360) + 360) % 360;
            handleResult(ketu);
          });
        } else {
          getPlanetLongitude(jd, planetId, (err, longitude) => {
            if (err) return res.status(500).json({ error: err.toString() });
            handleResult(longitude);
          });
        }
      });
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

app.listen(port, () => {
  console.log(`Swiss Ephemeris API running on port ${port}`);
});
