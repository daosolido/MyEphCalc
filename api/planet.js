const { load, Constants } = require('@fusionstrings/swiss-eph');

module.exports = async function handler(req, res) {
  // Разрешаем CORS для Google Sheets
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
    
    // Загружаем Swiss Ephemeris (WASM)
    const eph = await load();
    
    // Вычисляем юлианскую дату
    const jd = eph.swe_julday(
      year, month, day,
      (hour || 12) + (minute || 0) / 60 + (second || 0) / 3600,
      1 // SE_GREG_CAL = 1
    );
    
    // Рассчитываем позицию планеты
    const result = eph.swe_calc_ut(jd, planetId, 256); // 256 = SEFLG_SPEED
    const longitude = result.xx[0];
    
    // Возвращаем долготу
    return res.status(200).json({ value: longitude });
    
  } catch (error) {
    console.error('Error:', error);
    return res.status(500).json({ error: error.message });
  }
};
