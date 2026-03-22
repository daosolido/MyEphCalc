module.exports = async (req, res) => {
  // CORS для Google Sheets
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  // Обработка предварительного запроса OPTIONS
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  
  // Только POST
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed. Use POST.' });
  }
  
  try {
    // Получаем параметры
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
    
    // Часы в десятичном формате
    const hourDecimal = (hour || 12) + (minute || 0) / 60 + (second || 0) / 3600;
    
    // Количество дней с 2000 года
    const daysSince2000 = (year - 2000) * 365.25 + dayOfYear + hourDecimal / 24;
    
    // Точные средние долготы на 2000.0 (VSOP87)
    const L0 = [280.46646, 218.316, 252.250, 181.979, 355.433, 34.351, 50.077, 313.232, 304.348, 238.928];
    const n = [0.9856474, 13.176358, 4.092335, 1.602130, 0.524038, 0.083090, 0.033457, 0.011723, 0.005957, 0.003955];
    
    // Расчет долготы
    let longitude = L0[planetId] + n[planetId] * daysSince2000;
    longitude = ((longitude % 360) + 360) % 360;
    longitude = Math.round(longitude * 1000) / 1000;
    
    return res.status(200).json({ 
      value: longitude,
      planetId: planetId,
      date: `${year}-${month}-${day}`,
      time: hourDecimal
    });
    
  } catch (error) {
    console.error('Error:', error);
    return res.status(500).json({ error: error.message });
  }
};
