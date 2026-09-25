// Función compartida por todos los endpoints de /api para hablar con la API de Anthropic.
// La API key vive SOLO aquí, en el servidor (variable de entorno ANTHROPIC_API_KEY),
// nunca se manda al navegador.

const ANTHROPIC_URL = 'https://api.anthropic.com/v1/messages';
const ANTHROPIC_VERSION = '2023-06-01';

// Modelos: usamos Haiku para tareas mecánicas/rápidas (barato) y Sonnet para las que
// requieren más criterio o creatividad (recetas, planes, rutinas, análisis de progreso).
const MODELS = {
  haiku: 'claude-haiku-4-5-20251001',
  sonnet: 'claude-sonnet-4-5-20250929',
};

async function callClaude({ tier = 'sonnet', system, messages, maxTokens = 1500 }) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    const err = new Error('Falta configurar ANTHROPIC_API_KEY en el servidor.');
    err.statusCode = 500;
    throw err;
  }
  const res = await fetch(ANTHROPIC_URL, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': ANTHROPIC_VERSION,
    },
    body: JSON.stringify({
      model: MODELS[tier] || MODELS.sonnet,
      max_tokens: maxTokens,
      system,
      messages,
    }),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    const err = new Error(`Anthropic API respondió ${res.status}: ${text.slice(0, 500)}`);
    err.statusCode = res.status;
    throw err;
  }
  const data = await res.json();
  const text = (data.content || []).map((b) => (b.type === 'text' ? b.text : '')).join('');
  return text;
}

// Claude normalmente responde el JSON limpio cuando se le pide explícitamente,
// pero por si acaso viene con texto alrededor (```json ... ``` o una frase antes),
// esta función saca el primer bloque { ... } o [ ... ] válido.
function extractJSON(text) {
  const cleaned = text.trim().replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/```\s*$/i, '');
  try {
    return JSON.parse(cleaned);
  } catch (e) {
    const match = cleaned.match(/[\{\[][\s\S]*[\}\]]/);
    if (match) return JSON.parse(match[0]);
    throw new Error('La respuesta de la IA no vino en JSON válido: ' + text.slice(0, 300));
  }
}

module.exports = { callClaude, extractJSON };
