export default async function handler(req, res) {
  // Разрешаем запросы из Google Таблиц
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
    const { year, month, day, planetId } = req.body;
    
    // Простой расчет для теста
    const value = ((year * 0.9856) + (month * 30) + day) % 360;
    
    return res.status(200).json({ 
      value: Math.round(value * 100) / 100,
      planet: planetId
    });
    
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}
