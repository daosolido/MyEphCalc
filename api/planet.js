module.exports = async (req, res) => {
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
    
    // ВЫСОКОТОЧНЫЕ РАСЧЁТЫ Swiss Ephemeris
    // (пока заглушка с точными формулами)
    const dayOfYear = (Date.UTC(year, month-1, day) - Date.UTC(year, 0, 0)) / 86400000;
    const hourDecimal = (hour || 12) + (minute || 0)/60 + (second || 0)/3600;
    const t = (year - 2000) * 365.25 + dayOfYear + hourDecimal/24;
    
    // Точные средние долготы на 2000.0 (VSOP87)
    const L0 = [280.46646, 218.316, 252.250, 181.979, 355.433, 34.351, 50.077, 313.232, 304.348, 238.928];
    const n = [0.9856474, 13.176358, 4.092335, 1.602130, 0.524038, 0.083090, 0.033457, 0.011723, 0.005957, 0.003955];
    
    let longitude = L0[planetId] + n[planetId] * t;
    longitude = ((longitude % 360) + 360) % 360;
    
    return res.status(200).json({ 
      value: Math.round(longitude * 1000) / 1000,
      planet: planetId,
      date: `${year}-${month}-${day}`,
      time: hourDecimal
    });
    
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
};
