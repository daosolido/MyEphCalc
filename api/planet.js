export default async function handler(req, res) {
  // CORS для Google Sheets
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
  
  try {
    const { year, month, day, hour, minute, second, planetId } = req.body;
    
    // Простые приблизительные расчеты
    const dayOfYear = (Date.UTC(year, month-1, day) - Date.UTC(year, 0, 0)) / 86400000;
    
    const speeds = {
      0: 0.9856,   // Солнце
      1: 13.176,   // Луна
      2: 4.092,    // Меркурий
      3: 1.602,    // Венера
      4: 0.524,    // Марс
      5: 0.083,    // Юпитер
      6: 0.033,    // Сатурн
      7: 0.0117,   // Уран
      8: 0.006,    // Нептун
      9: 0.004     // Плутон
    };
    
    const startPositions = {
      0: 280,  // Солнце на 1 января
      1: 100,  // Луна
      2: 290,  // Меркурий
      3: 280,  // Венера
      4: 290,  // Марс
      5: 280,  // Юпитер
      6: 285,  // Сатурн
      7: 290,  // Уран
      8: 295,  // Нептун
      9: 300   // Плутон
    };
    
    let value = (startPositions[planetId] + speeds[planetId] * dayOfYear) % 360;
    value = Math.round(value * 100) / 100;
    
    return res.status(200).json({ 
      value: value,
      planet: planetId,
      date: `${year}-${month}-${day}`
    });
    
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}
