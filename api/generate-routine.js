// POST /api/generate-routine
// body: { perfil:{...}, diasPorSemana: 4, equipo: "gimnasio completo", nivel: "principiante" }
const { callClaude, extractJSON } = require('./_anthropic');

module.exports = async (req, res) => {
  if (req.method !== 'POST') { res.status(405).json({ error: 'Method not allowed' }); return; }
  try {
    const { perfil = {}, diasPorSemana = 3, equipo = 'peso corporal', nivel = 'principiante' } = req.body || {};
    const dias = Math.max(1, Math.min(7, +diasPorSemana || 3));

    const system = `Eres un entrenador personal certificado que diseña rutinas de ejercicio seguras, efectivas y progresivas en español. Respondes SIEMPRE con JSON válido, sin texto alrededor, sin backticks.`;
    const userText = `Diseña una rutina de ejercicio semanal de ${dias} días para una persona:
- Nivel: ${nivel}
- Equipo disponible: ${equipo}
- Objetivo: ${({lose:'bajar grasa / definición',maintain:'mantenimiento general',gain:'ganar músculo',recomp:'recomposición corporal'})[perfil.goaltype] || perfil.goaltype || 'salud general'}
${perfil.training ? `- Entrenamiento previo/preferido: ${perfil.training}` : ''}

Cada día de la rutina debe enfocarse en un grupo muscular o tipo de entrenamiento distinto (evita repetir el mismo grupo en días consecutivos). Incluye series, repeticiones y descanso entre series. Si el equipo es limitado (solo peso corporal), usa ejercicios calistenicos.

Responde SOLO este JSON:
{"dias":[{"dia":"Día 1","enfoque":"Pecho y tríceps","ejercicios":[{"nombre":"…","series":3,"repeticiones":"10-12","descanso_seg":60,"nota":"técnica breve o alternativa si falta equipo"}]}],"recomendacion_general":"consejo breve sobre calentamiento, progresión o descanso"}`;

    const text = await callClaude({
      tier: 'sonnet',
      maxTokens: 3000,
      system,
      messages: [{ role: 'user', content: userText }],
    });
    res.status(200).json(extractJSON(text));
  } catch (err) {
    console.error('generate-routine error', err);
    res.status(err.statusCode || 500).json({ error: err.message || 'Error interno' });
  }
};
