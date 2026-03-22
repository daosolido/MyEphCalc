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

// Эндпоинт для расчета планеты
app.post('/api/planet', (req, res) => {
  try {
    const { year, month, day, hour, minute, second, planetId } = req.body;
    
    if (!year || !month || !day || planetId === undefined) {
      return res.status(400).json({ error: 'Missing parameters' });
    }
    
    // Вычисляем день года
    const monthDays = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
    let dayOfYear = 0;
    for (let i = 0; i < month - 1; i++) {
      dayOfYear += monthDays[i];
    }
    dayOfYear += day;
    
    // Високосный год
    const isLeap = (year % 4 === 0 && year % 100 !== 0) || (year % 400 === 0);
    if (isLeap && month > 2) dayOfYear += 1;
    
    const hourDecimal = (hour || 12) + (minute || 0) / 60 + (second || 0) / 3600;
    const daysSince2000 = (year - 2000) * 365.25 + dayOfYear + hourDecimal / 24;
    
    // Средние долготы на 2000.0 (VSOP87)
    const L0 = [280.46646, 218.316, 252.250, 181.979, 355.433, 34.351, 50.077, 313.232, 304.348, 238.928];
    const n = [0.9856474, 13.176358, 4.092335, 1.602130, 0.524038, 0.083090, 0.033457, 0.011723, 0.005957, 0.003955];
    
    let longitude = L0[planetId] + n[planetId] * daysSince2000;
    longitude = ((longitude % 360) + 360) % 360;
    longitude = Math.round(longitude * 1000) / 1000;
    
    res.json({ value: longitude });
    
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Корневой эндпоинт для проверки
app.get('/', (req, res) => {
  res.json({ status: 'ok', message: 'API работает' });
});

// Запуск сервера
app.listen(port, () => {
  console.log(`Сервер запущен на порту ${port}`);
});
