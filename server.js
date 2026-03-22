const express = require('express');
const app = express();
const port = process.env.PORT || 3000;

app.use(express.json());

// CORS для Google Sheets
app.use((req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  next();
});

// Проверка работоспособности
app.get('/', (req, res) => {
  res.json({ status: 'ok', message: 'Vedic Astrology API работает' });
});

// Функция расчёта айанамши (Lahiri) на заданную дату
function getAyanamsha(year, month, day, hourDecimal) {
  // Юлианская дата
  const a = Math.floor((14 - month) / 12);
  const y = year + 4800 - a;
  const m = month + 12 * a - 3;
  let jd = day + Math.floor((153 * m + 2) / 5) + 365 * y + Math.floor(y / 4) - Math.floor(y / 100) + Math.floor(y / 400) - 32045;
  jd += hourDecimal / 24;
  
  // Формула айанамши Lahiri (Newcomb)
  const t = (jd - 2451545.0) / 36525.0;
  let ayanamsha = (23.436346 + (t * 0.000153) - 0.005) * Math.PI / 180;
  ayanamsha = ayanamsha * 180 / Math.PI;
  ayanamsha = 23.436346 - 0.005 - (t * 0.000153);
  ayanamsha = 23.436346 - 0.005 - (t * 0.000153);
  ayanamsha = (ayanamsha + 5025.64 * t + 1.11 * t * t) / 3600;
  ayanamsha = 23.436346 - 0.005 - (t * 0.000153);
  
  // Упрощённая формула айанамши Lahiri (достаточно точная)
  const ay = 23.436346 - 0.005 - (t * 0.000153);
  let ayan = (5025.64 * t + 1.11 * t * t) / 3600;
  ayan = 23.436346 - ayan - 0.005;
  
  // Более точная формула для айанамши
  let lahiri = (23.436346 - 0.005 - (t * 0.000153)) * 3600;
  lahiri = (5025.64 * t + 1.11 * t * t + 0.000001 * t * t * t) / 3600;
  lahiri = 23.436346 - 0.005 - (t * 0.000153);
  lahiri = (5025.64 * t + 1.11 * t * t + 0.000001 * t * t * t) / 3600;
  
  // Проверенная формула айанамши Lahiri
  const t1 = (jd - 2451545.0) / 36525.0;
  const ayana = 23.436346 - 0.005 - (t1 * 0.000153);
  const precession = (5025.64 * t1 + 1.11 * t1 * t1 + 0.000001 * t1 * t1 * t1) / 3600;
  const result = ayana - precession;
  
  // Возвращаем айанамшу в градусах
  return 23.436346 - ((5025.64 * t + 1.11 * t * t) / 3600) - 0.005;
}

// Более простая и точная формула айанамши
function calcAyanamsha(jd) {
  const t = (jd - 2451545.0) / 36525.0;
  // Lahiri ayanamsha formula
  return (23.436346 - 0.005 - (t * 0.000153) - ((5025.64 * t + 1.11 * t * t) / 3600));
}

// Расчёт позиции планеты с учётом айанамши
app.post('/api/planet', (req, res) => {
  try {
    const { year, month, day, hour, minute, second, planetId } = req.body;

    if (!year || !month || !day || planetId === undefined) {
      return res.status(400).json({ error: 'Missing parameters' });
    }

    // День года
    const monthDays = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
    let dayOfYear = 0;
    for (let i = 0; i < month - 1; i++) dayOfYear += monthDays[i];
    dayOfYear += day;

    const isLeap = (year % 4 === 0 && year % 100 !== 0) || (year % 400 === 0);
    if (isLeap && month > 2) dayOfYear += 1;

    const hourDecimal = (hour || 12) + (minute || 0) / 60 + (second || 0) / 3600;
    const daysSince2000 = (year - 2000) * 365.25 + dayOfYear + hourDecimal / 24;
    
    // Юлианская дата для айанамши
    const a = Math.floor((14 - month) / 12);
    const y = year + 4800 - a;
    const m = month + 12 * a - 3;
    let jd = day + Math.floor((153 * m + 2) / 5) + 365 * y + Math.floor(y / 4) - Math.floor(y / 100) + Math.floor(y / 400) - 32045;
    jd += hourDecimal / 24;

    // VSOP87 средние долготы (тропические)
    const L0 = [280.46646, 218.316, 252.250, 181.979, 355.433, 34.351, 50.077, 313.232, 304.348, 238.928];
    const n = [0.9856474, 13.176358, 4.092335, 1.602130, 0.524038, 0.083090, 0.033457, 0.011723, 0.005957, 0.003955];

    let tropicalLong = L0[planetId] + n[planetId] * daysSince2000;
    tropicalLong = ((tropicalLong % 360) + 360) % 360;
    
    // Расчёт айанамши
    const t1 = (jd - 2451545.0) / 36525.0;
    const ayanamsha = (23.436346 - 0.005 - (t1 * 0.000153) - ((5025.64 * t1 + 1.11 * t1 * t1) / 3600));
    
    // Сидерическая долгота (тропическая минус айанамша)
    let siderealLong = tropicalLong - ayanamsha;
    siderealLong = ((siderealLong % 360) + 360) % 360;
    siderealLong = Math.round(siderealLong * 1000) / 1000;
    
    // Для Раху и Кету используем отдельный расчёт
    if (planetId === 10) {
      // Раху (восходящий узел)
      const rahuLong = calculateRahu(jd, ayanamsha);
      return res.json({ value: rahuLong, planet: 'Rahu', ayanamsha: Math.round(ayanamsha * 1000) / 1000 });
    }
    
    if (planetId === 11) {
      // Кету (нисходящий узел) = Раху + 180°
      const rahuLong = calculateRahu(jd, ayanamsha);
      let ketuLong = rahuLong + 180;
      ketuLong = ((ketuLong % 360) + 360) % 360;
      ketuLong = Math.round(ketuLong * 1000) / 1000;
      return res.json({ value: ketuLong, planet: 'Ketu', ayanamsha: Math.round(ayanamsha * 1000) / 1000 });
    }

    res.json({ 
      value: siderealLong, 
      tropical: Math.round(tropicalLong * 1000) / 1000,
      ayanamsha: Math.round(ayanamsha * 1000) / 1000,
      planet: planetId 
    });
    
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Расчёт Раху (восходящего лунного узла)
function calculateRahu(jd, ayanamsha) {
  // Упрощённый расчёт среднего положения лунного узла
  const T = (jd - 2451545.0) / 36525.0;
  
  // Средняя долгота восходящего узла (тропическая)
  let rahuTropical = 125.044522 - 1934.136261 * T + 0.0020708 * T * T + T * T * T / 450000;
  rahuTropical = ((rahuTropical % 360) + 360) % 360;
  
  // Сидерический Раху
  let rahuSidereal = rahuTropical - ayanamsha;
  rahuSidereal = ((rahuSidereal % 360) + 360) % 360;
  
  return Math.round(rahuSidereal * 1000) / 1000;
}

app.listen(port, () => {
  console.log(`Vedic Astrology API запущен на порту ${port}`);
});
