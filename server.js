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

// Функция для установки айанамши по названию
function setAyanamshaMode(ayanamshaName) {
  const modes = {
    'lahiri': swisseph.SE_SIDM_LAHIRI,
    'raman': swisseph.SE_SIDM_RAMAN,
    'krishnamurti': swisseph.SE_SIDM_KRISHNAMURTI,
    'fagan_bradley': swisseph.SE_SIDM_FAGAN_BRADLEY,
    'deluce': swisseph.SE_SIDM_DELUCE,
    'suryasiddhanta': swisseph.SE_SIDM_SURYASIDDHANTA,
    'true_citra': swisseph.SE_SIDM_TRUE_CITRA,
    'galactic_center': swisseph.SE_SIDM_GALCENT_0SAG,
    'sayana': null  // тропический (без айанамши)
  };
  
  const mode = modes[ayanamshaName?.toLowerCase()];
  if (mode !== undefined && mode !== null) {
    swisseph.swe_set_sid_mode(mode, 0, 0);
    return true;
  }
  return false;
}

// Устанавливаем айанамшу по умолчанию (Lahiri)
swisseph.swe_set_sid_mode(swisseph.SE_SIDM_LAHIRI, 0, 0);
swisseph.swe_set_ephe_path('');

function toJulianDay(year, month, day, hour, minute, second) {
  const ut = hour + minute/60 + second/3600;
  return swisseph.swe_julday(year, month, day, ut, swisseph.SE_GREG_CAL);
}

// Основной эндпоинт для планет (работает с JD)
app.post('/api/planet', (req, res) => {
  try {
    const { jd, planetId, ayanamsha } = req.body;
    
    if (!jd || planetId === undefined) {
      return res.status(400).json({ error: 'Missing parameters: jd and planetId required' });
    }
    
    // Если передана айанамша, устанавливаем её
    if (ayanamsha && ayanamsha !== 'sayana') {
      const modes = {
        'lahiri': swisseph.SE_SIDM_LAHIRI,
        'raman': swisseph.SE_SIDM_RAMAN,
        'krishnamurti': swisseph.SE_SIDM_KRISHNAMURTI,
        'fagan_bradley': swisseph.SE_SIDM_FAGAN_BRADLEY,
        'deluce': swisseph.SE_SIDM_DELUCE
      };
      const mode = modes[ayanamsha.toLowerCase()];
      if (mode !== undefined) {
        swisseph.swe_set_sid_mode(mode, 0, 0);
      }
    }
    
    const ayanamshaValue = swisseph.swe_get_ayanamsa_ut(jd);
    const flags = swisseph.SEFLG_SPEED | swisseph.SEFLG_SWIEPH;
    
    // Раху и Кету
    if (planetId === 10) {
      const body = swisseph.swe_calc_ut(jd, swisseph.SE_MEAN_NODE, flags);
      let tropical = body.longitude;
      let sidereal = (ayanamsha === 'sayana') ? tropical : tropical - ayanamshaValue;
      sidereal = ((sidereal % 360) + 360) % 360;
      sidereal = Math.round(sidereal * 1000) / 1000;
      return res.json({ value: sidereal, ayanamsha: ayanamshaValue });
    }
    
    if (planetId === 11) {
      const body = swisseph.swe_calc_ut(jd, swisseph.SE_MEAN_NODE, flags);
      let tropical = body.longitude;
      let sidereal = (ayanamsha === 'sayana') ? tropical : tropical - ayanamshaValue;
      sidereal = ((sidereal % 360) + 360) % 360;
      let ketu = sidereal + 180;
      ketu = ((ketu % 360) + 360) % 360;
      ketu = Math.round(ketu * 1000) / 1000;
      return res.json({ value: ketu, ayanamsha: ayanamshaValue });
    }
    
    // Планеты 0-9
    const body = swisseph.swe_calc_ut(jd, planetId, flags);
    let tropical = body.longitude;
    let sidereal = (ayanamsha === 'sayana') ? tropical : tropical - ayanamshaValue;
    sidereal = ((sidereal % 360) + 360) % 360;
    sidereal = Math.round(sidereal * 1000) / 1000;
    
    res.json({ value: sidereal, ayanamsha: ayanamshaValue });
  } catch (err) {
    console.error('Error:', err);
    res.status(500).json({ error: err.message });
  }
});

// Эндпоинт для получения списка доступных айанамш
app.get('/api/ayanamsha-list', (req, res) => {
  const modes = [
    { id: 'lahiri', name: 'Lahiri (Chitra Paksha)', description: 'Наиболее распространённая в ведической астрологии' },
    { id: 'raman', name: 'Raman', description: 'Айанамша Рамана' },
    { id: 'krishnamurti', name: 'Krishnamurti', description: 'Система Кришнамурти' },
    { id: 'fagan_bradley', name: 'Fagan-Bradley', description: 'Западная сидерическая астрология' },
    { id: 'deluce', name: 'De Luce', description: 'Айанамша Де Люс' },
    { id: 'suryasiddhanta', name: 'Suryasiddhanta', description: 'По Сурья-сиддханте' },
    { id: 'true_citra', name: 'True Citra', description: 'Истинная Читра' },
    { id: 'galactic_center', name: 'Galactic Center', description: 'Центр Галактики в 0° Стрельца' },
    { id: 'sayana', name: 'Sayana (Tropical)', description: 'Тропический зодиак (без айанамши)' }
  ];
  res.json(modes);
});

app.post('/api/julian', (req, res) => {
  try {
    const { year, month, day, hour, minute, second } = req.body;
    if (!year || !month || !day) {
      return res.status(400).json({ error: 'Missing parameters' });
    }
    
    const h = (hour !== undefined && hour !== null) ? hour : 12;
    const m = (minute !== undefined && minute !== null) ? minute : 0;
    const s = (second !== undefined && second !== null) ? second : 0;
    
    const jd = toJulianDay(year, month, day, h, m, s);
    res.json({ jd: jd });
  } catch (err) {
    console.error('Error:', err);
    res.status(500).json({ error: err.message });
  }
});
// Эндпоинт для расчёта асцендента
app.post('/api/ascendant', (req, res) => {
  try {
    const { jd, latitude, longitude, ayanamsha } = req.body;
    
    if (!jd || latitude === undefined || longitude === undefined) {
      return res.status(400).json({ error: 'Missing parameters: jd, latitude, longitude required' });
    }
    
    // Если передана айанамша, устанавливаем её для сидерического расчёта
    if (ayanamsha && ayanamsha !== 'sayana') {
      const modes = {
        'lahiri': swisseph.SE_SIDM_LAHIRI,
        'raman': swisseph.SE_SIDM_RAMAN,
        'krishnamurti': swisseph.SE_SIDM_KRISHNAMURTI,
        'fagan_bradley': swisseph.SE_SIDM_FAGAN_BRADLEY,
        'deluce': swisseph.SE_SIDM_DELUCE
      };
      const mode = modes[ayanamsha.toLowerCase()];
      if (mode !== undefined) {
        swisseph.swe_set_sid_mode(mode, 0, 0);
      }
    }
    
    // Получаем айанамшу для сидерического зодиака
    const ayanamshaValue = swisseph.swe_get_ayanamsa_ut(jd);
    
    // Расчёт домов (получаем асцендент)
    const flags = swisseph.SEFLG_SPEED | swisseph.SEFLG_SWIEPH;
    const houses = swisseph.swe_houses_ex(jd, flags, latitude, longitude, 'P');
    
    let ascendant = houses.ascendant;
    
    // Если запрошен сидерический асцендент, вычитаем айанамшу
    if (ayanamsha !== 'sayana') {
      ascendant = ascendant - ayanamshaValue;
      ascendant = ((ascendant % 360) + 360) % 360;
    }
    
    ascendant = Math.round(ascendant * 1000) / 1000;
    
    res.json({ value: ascendant, ayanamsha: ayanamshaValue });
  } catch (err) {
    console.error('Error:', err);
    res.status(500).json({ error: err.message });
  }
});

app.listen(port, () => {
  console.log(`Swiss Ephemeris API running on port ${port}`);
});
