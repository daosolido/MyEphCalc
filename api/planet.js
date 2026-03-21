module.exports = async function handler(req, res) {
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
    
    // Временные приблизительные значения для теста
    const longitudes = {
      0: (year * 0.9856 + (month-1) * 30 + day) % 360,
      1: (year * 13.176 + (month-1) * 30 + day) % 360,
      2: (year * 4.092 + (month-1) * 30 + day) % 360,
      3: (year * 1.602 + (month-1) * 30 + day) % 360,
      4: (year * 0.524 + (month-1) * 30 + day) % 360,
      5: (year * 0.083 + (month-1) * 30 + day) % 360,
      6: (year * 0.033 + (month-1) * 30 + day) % 360,
      7: (year * 0.0117 + (month-1) * 30 + day) % 360,
      8: (year * 0.006 + (month-1) * 30 + day) % 360,
      9: (year * 0.004 + (month-1) * 30 + day) % 360
    };
    
    let value = longitudes[planetId] || 0;
    value = Math.round(value * 100) / 100;
    
    return res.status(200).json({ value: value });
    
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
};
