// POST /api/scan-food
// body: { image: "data:image/jpeg;base64,...." }
// Identifica el platillo principal, hasta 3 complementos visibles, y hasta 3 alternativas
// por si la identificación principal no es correcta. Todo con estimación de calorías/macros.
const { callClaude, extractJSON } = require('./_anthropic');

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }
  try {
    const { image } = req.body || {};
    if (!image || typeof image !== 'string' || !image.startsWith('data:image')) {
      res.status(400).json({ error: 'Falta la imagen (data URL) en el cuerpo de la petición.' });
      return;
    }
    const match = image.match(/^data:(image\/[a-zA-Z]+);base64,(.+)$/);
    if (!match) {
      res.status(400).json({ error: 'Formato de imagen inválido.' });
      return;
    }
    const mediaType = match[1];
    const base64Data = match[2];

    const system = `Eres un nutriólogo que identifica alimentos en fotos para una app de conteo de calorías en español (México). Respondes SIEMPRE con JSON válido, sin texto alrededor, sin comentarios, sin backticks.`;
    const userText = `Analiza esta foto de comida. Identifica:
1. "principal": el alimento o platillo más prominente en el plato.
2. "alternativas": hasta 3 posibilidades distintas por si la identificación principal no fuera correcta (platos parecidos que podría ser).
3. "complementos": hasta 3 alimentos adicionales visibles en la foto, aparte del principal (ej. guarnición, bebida, otro elemento del plato).

Para CADA alimento (principal, cada alternativa, cada complemento) da: "nombre" (en español, claro y corto), "porcion" (ej. "1 taza", "150 g", "1 pieza mediana" — tu mejor estimación visual del tamaño servido), "kcal" (número, calorías totales de esa porción), "proteina" (gramos), "carbohidratos" (gramos), "grasas" (gramos), y "confianza" (0 a 100, qué tan seguro estás de la identificación — no de las calorías).

Si la foto no muestra comida reconocible, responde con "principal":null.

Responde SOLO este JSON:
{"principal":{"nombre":"…","porcion":"…","kcal":0,"proteina":0,"carbohidratos":0,"grasas":0,"confianza":0},"alternativas":[{"nombre":"…","porcion":"…","kcal":0,"proteina":0,"carbohidratos":0,"grasas":0,"confianza":0}],"complementos":[{"nombre":"…","porcion":"…","kcal":0,"proteina":0,"carbohidratos":0,"grasas":0,"confianza":0}]}`;

    const text = await callClaude({
      tier: 'haiku',
      maxTokens: 1000,
      system,
      messages: [
        {
          role: 'user',
          content: [
            { type: 'image', source: { type: 'base64', media_type: mediaType, data: base64Data } },
            { type: 'text', text: userText },
          ],
        },
      ],
    });
    const json = extractJSON(text);
    if (!json.principal) {
      res.status(200).json({ principal: null });
      return;
    }
    res.status(200).json(json);
  } catch (err) {
    console.error('scan-food error', err);
    res.status(err.statusCode || 500).json({ error: err.message || 'Error interno' });
  }
};
