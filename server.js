const express = require('express');
const { getAstrologicalPositions } = require('@nrweb/astro-calc');
const app = express();
const port = process.env.PORT || 3000;

app.use(express.json());

app.use((req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  next();
});

app.get('/', (req, res) => {
  res.json({ status: 'ok', message: 'AstroCalc API ready' });
});

function planetIdToName(planetId) {
  const names = ['Sun', 'Moon', 'Mercury', 'Venus', 'Mars', 'Jupiter', 'Saturn', 'Uranus', 'Neptune', 'Pluto'];
  return names[planetId];
}

app.post('/api/planet', (req, res) => {
  try {
    const { year, month, day, hour, minute, second, planetId, lat, lon, ayanamsha } = req.body;
    if (!year || !month || !day || planetId === undefined) {
      return res.status(400).json({ error: 'Missing parameters' });
    }

    const date = new Date(Date.UTC(year, month-1, day, hour||12, minute||0, second||0));
    const latitude = lat !== undefined ? lat : 55.7558;
    const longitude = lon !== undefined ? lon : 37.6176;

    const chart = getAstrologicalPositions(date, latitude, longitude);
    const planetName = planetIdToName(planetId);
    const planet = chart.positions.find(p => p.name === planetName);

    if (!planet) return res.status(400).json({ error: 'Planet not found' });

    let longitudeDeg = planet.degrees + (planet.minutes / 60) + (planet.seconds / 3600);
    let result = longitudeDeg;

    // Если запрошена сидерическая долгота (ayanamsha = lahiri)
    if (ayanamsha === 'lahiri') {
      const ayanamshaVal = chart.ayanamsha; // библиотека возвращает айанамшу
      result = (longitudeDeg - ayanamshaVal + 360) % 360;
    }

    result = Math.round(result * 1000) / 1000;
    res.json({ value: result, planet: planetName });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});
