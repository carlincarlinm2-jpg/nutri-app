// POST /api/tutor — Tutor de inglés de Fluent (la app de inglés). Vive aquí porque este servidor ya tiene la llave de la API.
// Requiere sesión (Authorization: Bearer <token de Supabase>) y tiene un límite diario por persona para cuidar el gasto.
// body: { messages:[{role:'user'|'assistant', content}], scenario?: 'texto', level?: 'A1'..'B2', unit?: 'tema' }
const { callClaude, extractJSON } = require('./_anthropic');

const SUPABASE_URL = 'https://xvncydijzordzwrilqai.supabase.co';
const SUPABASE_KEY = 'sb_publishable_tLpsLGTQfdAGX5Il611y7w_i3DIuWrx';
const DAILY_LIMIT = 40;
const ALLOWED = [/^https:\/\/hola-fluent\.vercel\.app$/, /^https:\/\/fluent-[a-z0-9-]*\.vercel\.app$/];

function cors(req, res) {
  const o = req.headers.origin;
  if (o && ALLOWED.some((r) => r.test(o))) { res.setHeader('Access-Control-Allow-Origin', o); res.setHeader('Vary', 'Origin'); }
  res.setHeader('Access-Control-Allow-Methods', 'POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Authorization, Content-Type');
  if (req.method === 'OPTIONS') { res.status(204).end(); return true; }
  return false;
}
const sbHeaders = (token) => ({ apikey: SUPABASE_KEY, Authorization: 'Bearer ' + token, 'Content-Type': 'application/json' });
function mxDay() { return new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Mexico_City' }).format(new Date()); }

module.exports = async (req, res) => {
  if (cors(req, res)) return;
  if (req.method !== 'POST') { res.status(405).json({ error: 'Method not allowed' }); return; }
  try {
    const token = String(req.headers.authorization || '').replace(/^Bearer /, '');
    if (!token) { res.status(401).json({ error: 'Inicia sesión para platicar con el tutor.' }); return; }
    const u = await fetch(SUPABASE_URL + '/auth/v1/user', { headers: sbHeaders(token) });
    if (!u.ok) { res.status(401).json({ error: 'Tu sesión expiró. Vuelve a entrar.' }); return; }
    const user = await u.json();

    // Límite diario (se cuenta con la propia sesión de la persona; la tabla solo deja ver lo suyo).
    const day = mxDay();
    const c = await fetch(`${SUPABASE_URL}/rest/v1/en_tutor_usage?select=id&day=eq.${day}`, { headers: { ...sbHeaders(token), Prefer: 'count=exact', Range: '0-0' } });
    const used = Number((c.headers.get('content-range') || '*/0').split('/')[1]) || 0;
    if (used >= DAILY_LIMIT) { res.status(429).json({ error: `Por hoy ya platicaste ${DAILY_LIMIT} veces con Kiko. Mañana seguimos.` , used, limit: DAILY_LIMIT }); return; }

    const { messages = [], scenario = '', level = 'A1', unit = '', mode = 'chat' } = req.body || {};
    const clean = messages.filter((m) => m && (m.role === 'user' || m.role === 'assistant') && typeof m.content === 'string').slice(-12)
      .map((m) => ({ role: m.role, content: m.content.slice(0, 800) }));
    if (mode === 'chat' && (!clean.length || clean[clean.length - 1].role !== 'user')) { res.status(400).json({ error: 'Escribe o di algo para empezar.' }); return; }

    if (mode === 'grade') {
      const { task = {}, answer = '', kind = 'writing' } = req.body || {};
      const sys3 = `You are a certified Cambridge English examiner. Grade a ${kind} answer from a Spanish-speaking learner (expected level ${level}) using Cambridge-style criteria (content/task completion, organisation, language range, accuracy${kind === 'speaking' ? ', fluency (the text is a speech-recognition transcript, so ignore punctuation and capitalization)' : ''}). Be fair and encouraging but honest. Respond ONLY with valid JSON, no backticks:
{"score":0-100,"cefr":"A1|A2|B1|B2|C1","feedback_es":"2-3 sentences in Mexican Spanish","criteria":[{"name_es":"Contenido","score":0-5},{"name_es":"Organización","score":0-5},{"name_es":"Vocabulario","score":0-5},{"name_es":"Gramática","score":0-5}],"corrections":[{"said":"exact fragment","better":"corrected","why_es":"short reason"}],"improved":"an improved version of the learner's answer at the target level"}
Up to 6 corrections. If the answer is empty, off-topic or not in English, score below 20.`;
      const userMsg = `TASK: ${String(task.prompt_en || '').slice(0, 900)}\nREQUIRED POINTS: ${(task.checklist || []).join(' | ').slice(0, 600)}\nWORD RANGE: ${task.min || ''}-${task.max || ''}\n\nLEARNER ANSWER:\n${String(answer).slice(0, 2500)}`;
      const t3 = await callClaude({ tier: 'haiku', maxTokens: 1200, system: sys3, messages: [{ role: 'user', content: userMsg }] });
      let d3; try { d3 = extractJSON(t3); } catch (e) { d3 = { score: null, feedback_es: 'No pude calificar esta respuesta.', corrections: [], criteria: [] }; }
      await fetch(`${SUPABASE_URL}/rest/v1/en_tutor_usage`, { method: 'POST', headers: { ...sbHeaders(token), Prefer: 'return=minimal' }, body: JSON.stringify({ user_id: user.id, day }) }).catch(() => {});
      res.status(200).json(d3); return;
    }
    if (mode === 'summary') {
      const convo = clean.map((m) => (m.role === 'user' ? 'LEARNER: ' : 'TUTOR: ') + m.content).join('\n');
      const sys2 = `You are an expert English teacher for Spanish speakers from Mexico (learner level ${level}). Analyze ONLY the learner's messages in the conversation and give feedback. Respond ONLY with valid JSON, no backticks:
{"score":0-100,"level_guess":"A1|A2|B1|B2|C1","summary_es":"2 sentences in Mexican Spanish about how they did","strengths_es":["..."],"mistakes":[{"said":"exact learner text","better":"corrected natural English","why_es":"short reason in Spanish"}],"tips_es":["concrete tip 1","tip 2","tip 3"],"useful_phrases":[{"en":"...","es":"..."}]}
Include up to 8 mistakes (most important first), 2-3 strengths, 3 tips and 4 useful phrases related to the topic.`;
      const t2 = await callClaude({ tier: 'haiku', maxTokens: 1200, system: sys2, messages: [{ role: 'user', content: convo || 'LEARNER: hello' }] });
      let d2; try { d2 = extractJSON(t2); } catch (e) { d2 = { summary_es: 'No pude analizar la plática esta vez.', mistakes: [], tips_es: [], strengths_es: [], useful_phrases: [] }; }
      await fetch(`${SUPABASE_URL}/rest/v1/en_tutor_usage`, { method: 'POST', headers: { ...sbHeaders(token), Prefer: 'return=minimal' }, body: JSON.stringify({ user_id: user.id, day }) }).catch(() => {});
      res.status(200).json(d2); return;
    }
    const system = `You are Kiko, a friendly, upbeat English conversation tutor (a cool parrot with sunglasses) inside an app for Spanish speakers from Mexico.
The learner's level is ${level} (CEFR). ${unit ? `They are studying: ${unit}.` : ''} ${scenario ? `Role-play scenario: ${scenario}. Stay in character for the scenario.` : 'Have a natural, friendly conversation about everyday life.'}
Rules:
- Reply in English adapted to the learner's level: A1–A2 use very short, simple sentences (max 2 sentences, common words); B1–B2 can use 2–3 natural sentences.
- Always end with ONE short question that keeps the conversation going.
- If the learner writes in Spanish, gently help them say it in English.
- Check the learner's LAST message for grammar, vocabulary or spelling mistakes. Ignore missing capital letters and final punctuation (it may come from voice dictation).
- Respond ONLY with valid JSON, no backticks, no extra text:
{"reply":"your English reply","reply_es":"natural Mexican Spanish translation of your reply","correction":"the learner's last message corrected in natural English, or null if it was correct","explain_es":"very short explanation in Mexican Spanish of what was wrong and why, or null","praise":"one or two words of encouragement in English when the message was correct, or null"}`;

    const text = await callClaude({ tier: 'haiku', maxTokens: 500, system, messages: clean });
    let data;
    try { data = extractJSON(text); } catch (e) { data = { reply: text.slice(0, 400), reply_es: null, correction: null, explain_es: null, praise: null }; }

    await fetch(`${SUPABASE_URL}/rest/v1/en_tutor_usage`, { method: 'POST', headers: { ...sbHeaders(token), Prefer: 'return=minimal' }, body: JSON.stringify({ user_id: user.id, day }) }).catch(() => {});
    res.status(200).json({ ...data, used: used + 1, limit: DAILY_LIMIT });
  } catch (err) {
    console.error('tutor error', err);
    res.status(err.statusCode === 429 ? 429 : 500).json({ error: 'El tutor no está disponible en este momento. Intenta en un ratito.' });
  }
};
