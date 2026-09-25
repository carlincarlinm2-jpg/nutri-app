// POST /api/analyze-progress
// body: { perfil:{...}, progreso:[{date,weight}], resumenCalorias:[{date,kcal}] }
const { callClaude, extractJSON } = require('./_anthropic');

module.exports = async (req, res) => {
  if (req.method !== 'POST') { res.status(405).json({ error: 'Method not allowed' }); return; }
  try {
    const { perfil = {}, progreso = [], resumenCalorias = [] } = req.body || {};
    if (!progreso.length && !resumenCalorias.length) {
      res.status(400).json({ error: 'Todavía no hay suficientes datos registrados para analizar.' });
      return;
    }

    const system = `Eres un nutriólogo que da retroalimentación breve, honesta y alentadora sobre el progreso de una persona hacia su meta. Nunca das consejos médicos definitivos, siempre recomiendas consultar a un profesional para cambios grandes. Evitas la negatividad y el lenguaje que fomente relaciones poco saludables con la comida. Respondes SIEMPRE con JSON válido, sin texto alrededor, sin backticks.`;
    const userText = `Analiza el progreso de esta persona:
- Objetivo: ${({lose:'bajar grasa',maintain:'mantener peso',gain:'ganar peso',recomp:'recomposición corporal'})[perfil.goaltype] || perfil.goaltype || 'mantener peso'}
- Meta de calorías diarias: ${perfil.goal || 'no especificada'} kcal
- Historial de peso (fecha, kg), del más viejo al más reciente: ${JSON.stringify(progreso.slice(-20))}
- Calorías registradas por día recientemente: ${JSON.stringify(resumenCalorias.slice(-14))}

Da un resumen breve de la tendencia (¿va hacia su meta, se estancó, hay mucha variación en el registro?), 2-4 observaciones concretas basadas en los números (no inventes datos que no están), y 2-3 recomendaciones prácticas y accionables. Tono cercano y motivador, sin ser condescendiente. Si los datos son muy pocos para concluir algo, dilo honestamente.

Responde SOLO este JSON:
{"tendencia":"una o dos frases resumiendo hacia dónde va","observaciones":["…","…"],"recomendaciones":["…","…"],"nota":"recordatorio breve de que esto es una estimación y no reemplaza a un profesional de la salud"}`;

    const text = await callClaude({
      tier: 'sonnet',
      maxTokens: 1200,
      system,
      messages: [{ role: 'user', content: userText }],
    });
    res.status(200).json(extractJSON(text));
  } catch (err) {
    console.error('analyze-progress error', err);
    res.status(err.statusCode || 500).json({ error: err.message || 'Error interno' });
  }
};
