// persona_generation.js - AI-powered persona generation
// Depends on: api/keys.js (getGroqKeys), api/groq.js (fetchGroq), core/ui_helpers.js (diceSpin, setDiceLoading, logError), core/i18n.js (t, getLang), core/constants.js (CULTURES, GROQ_GEN_MODEL)

async function rollPersonaName(btn) {
    if (!getGroqKeys().length) { alert(t('needKey')); return; }
    diceSpin(btn);
    setDiceLoading(btn, true);
    const gender = document.getElementById('persona-gender').value;
    const country = document.getElementById('persona-country').value.trim();
    const year = document.getElementById('persona-year').value.trim();
    const setting = [country, year].filter(Boolean).join(', ') || CULTURES[Math.floor(Math.random() * CULTURES.length)];
    try {
        const result = await callLlama(
            `Generate a single authentic full name for a ${gender} person from: ${setting}. Return ONLY the name - no explanation, no quotes.`,
            'Generate a name.'
        );
        document.getElementById('persona-name').value = result.replace(/["\'\.]/g, '').trim();
    } catch(e) { logError('rollPersonaName failed', e.message); }
    setDiceLoading(btn, false);
}

async function rollPersonaField(fieldId, fieldType, btn) {
    if (!getGroqKeys().length) { alert(t('needKey')); return; }
    diceSpin(btn);
    setDiceLoading(btn, true);
    const gender = document.getElementById('persona-gender').value;
    const name = document.getElementById('persona-name').value.trim() || gender + ' person';
    const age = document.getElementById('persona-age').value.trim();
    const country = document.getElementById('persona-country').value.trim();
    const year = document.getElementById('persona-year').value.trim();
    const setting = [country, year].filter(Boolean).join(', ');
    const settingHint = setting ? `Setting/origin: ${setting}.` : '';
    const ageHint = age ? `Age: ${age}.` : '';
    const lang = getLang();
    const prompts = {
        appearance: `Return ONLY a vivid physical appearance (2-3 sentences) for ${gender} named "${name}". ${ageHint} ${settingHint} Cover: hair, eyes, build, typical clothing. Write in ${lang}. No label.`,
        background: `Return ONLY a compelling personal background (2-3 sentences) for ${gender} named "${name}". ${ageHint} ${settingHint} Their past, upbringing, defining experiences. Write in ${lang}. No label.`,
        personality: `Return ONLY a personality description (2-3 sentences) for ${gender} named "${name}". ${ageHint} ${settingHint} Core traits, speaking style, quirks. Write in ${lang}. No label.`,
    };
    try {
        const result = await callLlama(prompts[fieldType] || prompts.personality, 'Generate it.');
        document.getElementById(fieldId).value = result;
    } catch(e) { logError('rollPersonaField failed', e.message); }
    setDiceLoading(btn, false);
}

async function autoGeneratePersona() {
    if (!getGroqKeys().length) { alert(t('needKey')); return; }
    const btn = document.getElementById('btn-persona-ai-gen');
    btn.disabled = true;
    const gender = document.getElementById('persona-gender').value;
    const country = document.getElementById('persona-country').value.trim();
    const year = document.getElementById('persona-year').value.trim();
    const setting = [country, year].filter(Boolean).join(', ');
    const lang = getLang();
    try {
        const data = await fetchGroq({
            model: GROQ_GEN_MODEL,
            messages: [{
                role: 'system',
                content: `You are a creative character generator. Generate a user persona (the player's identity in a roleplay).
Gender: "${gender}"
${setting ? 'Setting/Origin: "' + setting + '"' : ''}
Return ONLY a valid JSON with keys: "name" (string), "appearance" (string, 2-3 sentences), "bio" (string, 2-3 sentences), "prompt" (string, personality 2-3 sentences).
All text in ${lang}. No markdown, no extra text.`
            }, { role: 'user', content: 'Generate the persona.' }],
            response_format: { type: 'json_object' },
            temperature: 1.1
        });
        const r = JSON.parse(data.choices?.[0]?.message?.content || '{}');
        if (r.name) document.getElementById('persona-name').value = r.name;
        if (r.appearance) { document.getElementById('persona-app').value = r.appearance; autoResize(document.getElementById('persona-app')); }
        if (r.bio) { document.getElementById('persona-bio').value = r.bio; autoResize(document.getElementById('persona-bio')); }
        if (r.prompt) { document.getElementById('persona-prompt').value = r.prompt; autoResize(document.getElementById('persona-prompt')); }
    } catch(e) { logError('autoGeneratePersona failed', e.message); alert('Generation failed. Check API key.'); }
    btn.disabled = false;
}
