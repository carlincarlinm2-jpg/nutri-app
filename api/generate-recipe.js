// POST /api/generate-recipe
// body: { ingredientes: "pollo, arroz, brócoli", restricciones: "sin lactosa", objetivo: "bajar grasa" }
const { callClaude, extractJSON } = require('./_anthropic');

module.exports = async (req, res) => {
  if (req.method !== 'POST') { res.status(405).json({ error: 'Method not allowed' }); return; }
  try {
    const { ingredientes = '', restricciones = '', objetivo = '', perfil = {} } = req.body || {};
    if (!ingredientes.trim()) { res.status(400).json({ error: 'Escribe al menos un ingrediente.' }); return; }

    const system = `Eres un chef y nutriólogo que crea recetas saludables, sabrosas y sencillas en español (México). Respondes SIEMPRE con JSON válido, sin texto alrededor, sin backticks.`;
    const userText = `Crea UNA receta usando principalmente estos ingredientes disponibles: ${ingredientes}.
${restricciones ? `Restricciones/alergias a respetar estrictamente: ${restricciones}.` : ''}
${objetivo ? `Objetivo nutricional del usuario: ${objetivo}.` : ''}
${perfil?.goal ? `Meta diaria de calorías del usuario: ${perfil.goal} kcal (esta receta es una comida, no el día completo).` : ''}

Puedes asumir despensa básica (sal, aceite, especias comunes) aunque no estén en la lista. Da una receta realista, con pasos claros y tiempos de cocción.

Responde SOLO este JSON:
{"nombre":"…","descripcion":"una frase apetitosa","porciones":2,"tiempo_min":25,"ingredientes":[{"nombre":"…","cantidad":"…"}],"pasos":["…","…"],"kcal_porcion":0,"proteina_porcion":0,"carbohidratos_porcion":0,"grasas_porcion":0,"tip":"un consejo opcional para variar o mejorar la receta"}`;

    const text = await callClaude({
      tier: 'sonnet',
      maxTokens: 1500,
      system,
      messages: [{ role: 'user', content: userText }],
    });
    res.status(200).json(extractJSON(text));
  } catch (err) {
    console.error('generate-recipe error', err);
    res.status(err.statusCode || 500).json({ error: err.message || 'Error interno' });
  }
};
