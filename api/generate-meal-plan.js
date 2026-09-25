// POST /api/generate-meal-plan
// body: { perfil: {...}, dias: 7, preferencias: "vegetariano, no picante" }
const { callClaude, extractJSON } = require('./_anthropic');

module.exports = async (req, res) => {
  if (req.method !== 'POST') { res.status(405).json({ error: 'Method not allowed' }); return; }
  try {
    const { perfil = {}, dias = 7, preferencias = '' } = req.body || {};
    const numDias = Math.max(1, Math.min(7, +dias || 7));
    if (!perfil.goal) { res.status(400).json({ error: 'Falta el perfil nutricional del usuario.' }); return; }

    const system = `Eres un nutriólogo que arma planes de alimentación variados, realistas y sabrosos (comida mexicana e internacional accesible) en español. Respondes SIEMPRE con JSON válido, sin texto alrededor, sin backticks.`;
    const userText = `Arma un plan de alimentación de ${numDias} días para una persona con:
- Meta diaria: ${perfil.goal} kcal
- Objetivo: ${({lose:'bajar grasa',maintain:'mantener peso',gain:'ganar peso',recomp:'recomposición corporal'})[perfil.goaltype] || perfil.goaltype || 'mantener peso'}
${preferencias ? `- Preferencias/restricciones: ${preferencias}` : ''}

Cada día debe sumar aproximadamente la meta diaria de calorías (±5%), repartido en Desayuno, Comida, Cena y un Snack. Varía los platillos entre días — no repitas el mismo platillo. Usa ingredientes fáciles de conseguir.

Responde SOLO este JSON:
{"dias":[{"dia":"Día 1","comidas":[{"tipo":"Desayuno","nombre":"…","kcal":0,"proteina":0,"carbohidratos":0,"grasas":0}],"total_kcal":0}],"lista_compras":["…"]}`;

    const text = await callClaude({
      tier: 'sonnet',
      maxTokens: 4000,
      system,
      messages: [{ role: 'user', content: userText }],
    });
    res.status(200).json(extractJSON(text));
  } catch (err) {
    console.error('generate-meal-plan error', err);
    res.status(err.statusCode || 500).json({ error: err.message || 'Error interno' });
  }
};
