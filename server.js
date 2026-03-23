const express = require('express');
const swisseph = require('swisseph-js');
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
  res.json({ status: 'ok', message: 'Swiss Ephemeris JS API ready' });
});

// Инициализация: путь к эфемеридам (пустая строка = встроенные данные)
swisseph.swe_set_ephe_path('');

// Явно устанавливаем айанамшу Lahiri (по умолчанию она и так, но для надёжности)
swisseph.swe_set_sid_mode(swisseph.SE_SIDM_LAHIRI, 0, 0);

function toJulianDay(year, month, day, hour, minute, second) {
  const ut = hour + minute/60 + second/3600;
  return swisseph.swe_julday(year, month, day, ut, swisseph.SE_GREG_CAL);
}

function getAyanamsha(jd) {
  return swisseph.swe_get_ayanamsa_ut(jd);
}

function getPlanetLongitude(jd, planetId) {
  const flags = swisseph.SEFLG_SPEED | swisseph.SEFLG_SWIEPH;
  const result = swisseph.swe_calc_ut(jd, planetId, flags);
  return result.longitude; // тропическая долгота
}

function getRahu(jd) {
  const flags = swisseph.SEFLG_SPEED | swisseph.SEFLG_SWIEPH;
  const node = swisseph.swe_nod_aps_ut(jd, swisseph.SE_TRUE_NODE, flags);
  return node.xnasc_long; // тропическая долгота восходящего узла
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

    // Раху и Кету (используем стандартные константы SE_TRUE_NODE)
    if (planetId === 10) {
      const rahuTropical = getRahu(jd);
      let rahuSidereal = rahuTropical - ayanamsha;
      rahuSidereal = ((rahuSidereal % 360) + 360) % 360;
      rahuSidereal = Math.round(rahuSidereal * 1000) / 1000;
      return res.json({ value: rahuSidereal, ayanamsha });
    }
    if (planetId === 11) {
      const rahuTropical = getRahu(jd);
      let rahuSidereal = rahuTropical - ayanamsha;
      rahuSidereal = ((rahuSidereal % 360) + 360) % 360;
      let ketuSidereal = rahuSidereal + 180;
      ketuSidereal = ((ketuSidereal % 360) + 360) % 360;
      ketuSidereal = Math.round(ketuSidereal * 1000) / 1000;
      return res.json({ value: ketuSidereal, ayanamsha });
    }

    // Для обычных планет planetId должен соответствовать константам Swiss Ephemeris:
    // 0 = Солнце, 1 = Луна, 2 = Меркурий, 3 = Венера, 4 = Марс, 5 = Юпитер, 6 = Сатурн, 7 = Уран, 8 = Нептун, 9 = Плутон
    const tropicalLong = getPlanetLongitude(jd, planetId);
    let siderealLong = tropicalLong - ayanamsha;
    siderealLong = ((siderealLong % 360) + 360) % 360;
    siderealLong = Math.round(siderealLong * 1000) / 1000;

    return res.json({ value: siderealLong, ayanamsha });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

app.listen(port, () => {
  console.log(`Swiss Ephemeris JS API running on port ${port}`);
});
