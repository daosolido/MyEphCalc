module.exports = (req, res) => {
  // CORS для Google Sheets
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed. Use POST.' });
  }
  
  try {
    const { year, month, day, hour, minute, second, planetId } = req.body;
    
    // Проверка параметров
    if (!year || !month || !day || planetId === undefined) {
      return res.status(400).json({ error: 'Missing parameters: year, month, day, planetId required' });
    }
    
    // Вычисляем день года
    const monthDays = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
    let dayOfYear = 0;
    for (let i = 0; i < month - 1; i++) {
      dayOfYear += monthDays[i];
    }
    dayOfYear += day;
    
    // Учет високосного года
    const isLeap = (year % 4 === 0 && year % 100 !== 0) || (year % 400 === 0);
    if (isLeap && month > 2) dayOfYear += 1;
    
    // Часы в десятичном формате
    const hourDecimal = (hour || 12) + (minute || 0) / 60 + (second || 0) / 3600;
    
    // Количество дней с 2000 года
    const daysSince2000 = (year - 2000) * 365.25 + dayOfYear + hourDecimal / 24;
    
    // Точные средние долготы на 1 января 2000 года (VSOP87)
    const L0 = [
      280.46646,  // 0: Солнце
      218.316,    // 1: Луна
      252.250,    // 2: Меркурий
      181.979,    // 3: Венера
      355.433,    // 4: Марс
      34.351,     // 5: Юпитер
      50.077,     // 6: Сатурн
      313.232,    // 7: Уран
      304.348,    // 8: Нептун
      238.928     // 9: Плутон
    ];
    
    // Средние движения (градусов в день)
    const n = [
      0.9856474,  // 0: Солнце
      13.176358,  // 1: Луна
      4.092335,   // 2: Меркурий
      1.602130,   // 3: Венера
      0.524038,   // 4: Марс
      0.083090,   // 5: Юпитер
      0.033457,   // 6: Сатурн
      0.011723,   // 7: Уран
      0.005957,   // 8: Нептун
      0.003955    // 9: Плутон
    ];
    
    // Расчет долготы
    let longitude = L0[planetId] + n[planetId] * daysSince2000;
    longitude = ((longitude % 360) + 360) % 360;
    longitude = Math.round(longitude * 1000) / 1000;
    
    return res.status(200).json({ 
      value: longitude,
      planetId: planetId,
      date: `${year}-${month}-${day}`,
      julianDays: daysSince2000
    });
    
  } catch (error) {
    console.error('Error:', error);
    return res.status(500).json({ error: error.message });
  }
};
