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
    const { 
      year, month, day, hour, minute, second,
      planetId, lat, lon, action, houseSystem 
    } = req.body;
    
    // Вычисляем день года (для упрощенных расчетов)
    const dayOfYear = (Date.UTC(year, month-1, day) - Date.UTC(year, 0, 0)) / 86400000;
    const hourDecimal = (hour || 12) + (minute || 0) / 60 + (second || 0) / 3600;
    
    // Базовые скорости планет (градусов в день)
    const speeds = {
      0: 0.9856,    // Солнце
      1: 13.176,    // Луна
      2: 4.092,     // Меркурий
      3: 1.602,     // Венера
      4: 0.524,     // Марс
      5: 0.083,     // Юпитер
      6: 0.033,     // Сатурн
      7: 0.0117,    // Уран
      8: 0.006,     // Нептун
      9: 0.004      // Плутон
    };
    
    // Начальные позиции на 1 января 2000 года
    const startPositions = {
      0: 280.5,    // Солнце
      1: 100.2,    // Луна
      2: 290.3,    // Меркурий
      3: 281.7,    // Венера
      4: 293.4,    // Марс
      5: 282.1,    // Юпитер
      6: 286.8,    // Сатурн
      7: 291.5,    // Уран
      8: 296.2,    // Нептун
      9: 301.9     // Плутон
    };
    
    // Обработка разных типов запросов
    if (action === 'getPlanet') {
      let value = (startPositions[planetId] + speeds[planetId] * (dayOfYear + (year - 2000) * 365.25)) % 360;
      value = Math.round(value * 100) / 100;
      return res.status(200).json({ value });
    }
    
    if (action === 'getAllPlanets') {
      const planets = {};
      for (let i = 0; i <= 9; i++) {
        planets[i] = Math.round((startPositions[i] + speeds[i] * (dayOfYear + (year - 2000) * 365.25)) % 360 * 100) / 100;
      }
      return res.status(200).json(planets);
    }
    
    if (action === 'getAscendant') {
      // Упрощенный расчет асцендента
      const gmt = hourDecimal;
      const siderealTime = (gmt * 1.0027379 + (lon || 0) / 15) % 24;
      const ramc = siderealTime * 15;
      
      // Формула асцендента для широты
      const latRad = ((lat || 0) * Math.PI) / 180;
      const ramcRad = (ramc * Math.PI) / 180;
      
      const tanAsc = Math.cos(ramcRad) / (-Math.sin(ramcRad) * Math.cos(latRad) + Math.tan(latRad) * Math.sin(latRad));
      let asc = Math.atan(tanAsc) * 180 / Math.PI;
      
      if (Math.cos(ramcRad) < 0) asc += 180;
      if (asc < 0) asc += 360;
      
      return res.status(200).json({ value: Math.round(asc * 100) / 100 });
    }
    
    if (action === 'getHouses') {
      const gmt = hourDecimal;
      const siderealTime = (gmt * 1.0027379 + (lon || 0) / 15) % 24;
      const ramc = siderealTime * 15;
      const latRad = ((lat || 0) * Math.PI) / 180;
      
      const houses = {};
      
      for (let i = 1; i <= 12; i++) {
        let housePos;
        const cuspAngle = ramc + (i - 1) * 30;
        const cuspRad = (cuspAngle * Math.PI) / 180;
        
        const tanCusp = Math.cos(cuspRad) / (-Math.sin(cuspRad) * Math.cos(latRad) + Math.tan(latRad) * Math.sin(latRad));
        let cusp = Math.atan(tanCusp) * 180 / Math.PI;
        
        if (Math.cos(cuspRad) < 0) cusp += 180;
        if (cusp < 0) cusp += 360;
        
        houses[i] = Math.round(cusp * 100) / 100;
      }
      
      return res.status(200).json(houses);
    }
    
    if (action === 'getPlanetHouse') {
      // Получаем позицию планеты
      let planetPos = (startPositions[planetId] + speeds[planetId] * (dayOfYear + (year - 2000) * 365.25)) % 360;
      
      // Получаем куспиды домов
      const gmt = hourDecimal;
      const siderealTime = (gmt * 1.0027379 + (lon || 0) / 15) % 24;
      const ramc = siderealTime * 15;
      const latRad = ((lat || 0) * Math.PI) / 180;
      
      let houseNum = 1;
      for (let i = 1; i <= 12; i++) {
        const cuspAngle = ramc + (i - 1) * 30;
        const cuspRad = (cuspAngle * Math.PI) / 180;
        
        const tanCusp = Math.cos(cuspRad) / (-Math.sin(cuspRad) * Math.cos(latRad) + Math.tan(latRad) * Math.sin(latRad));
        let cusp = Math.atan(tanCusp) * 180 / Math.PI;
        
        if (Math.cos(cuspRad) < 0) cusp += 180;
        if (cusp < 0) cusp += 360;
        
        if (planetPos >= cusp && (i === 12 || planetPos < (ramc + i * 30) % 360)) {
          houseNum = i;
          break;
        }
      }
      
      return res.status(200).json({ value: houseNum });
    }
    
    // Если action не указан — возвращаем позицию планеты (для обратной совместимости)
    let value = (startPositions[planetId] + speeds[planetId] * (dayOfYear + (year - 2000) * 365.25)) % 360;
    value = Math.round(value * 100) / 100;
    return res.status(200).json({ value });
    
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}
