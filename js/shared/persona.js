// persona.js -- Persona system + Cultural speaking contexts (extracted from shared.js)
// Depends on: shared.js globals (personas, savePersonas, escapeHTML, fetchGroq,
//             callLlama, getLang, getGroqKeys, logError, diceSpin, setDiceLoading,
//             GROQ_GEN_MODEL, CULTURES, t, selectedPersonaTraits)

function savePersona() {
    const name = document.getElementById('persona-name').value.trim();
    if (!name) { alert('Please enter a name for your persona!'); return; }
    const persona = {
        id: Date.now().toString(),
        name,
        gender: document.getElementById('persona-gender').value,
        age: document.getElementById('persona-age').value.trim() || '',
        year: document.getElementById('persona-year').value.trim() || '',
        country: document.getElementById('persona-country').value.trim() || '',
        career: document.getElementById('persona-career')?.value.trim() || '',
        appearance: document.getElementById('persona-app').value.trim(),
        bio: document.getElementById('persona-bio').value.trim(),
        prompt: document.getElementById('persona-prompt').value.trim(),
        traits: [...selectedPersonaTraits],
    };
    personas.push(persona);
    savePersonas();
    renderSavedPersonas();
    refreshPersonaDropdown();
    ['persona-name','persona-app','persona-bio','persona-prompt','persona-age','persona-year','persona-country','persona-career'].forEach(id => {
        const el = document.getElementById(id); if (el) el.value = '';
    });
    selectedPersonaTraits = new Map();
    renderPersonaTraitChips();
    showToast('✅ Persona saved!', '#0a1a0a', '#22c55e');
}

function deletePersona(id) {
    if (!confirm('Delete this persona?')) return;
    personas = personas.filter(p => p.id !== id);
    savePersonas();
    renderSavedPersonas();
    refreshPersonaDropdown();
}

function renderSavedPersonas() {
    const el = document.getElementById('persona-saved-list');
    if (!el) return;
    if (!personas.length) {
        el.innerHTML = '<div style="font-size:12px;color:var(--text-sub);font-style:italic">No personas saved yet.</div>';
        return;
    }
    el.innerHTML = personas.map(p => `
        <div style="display:flex;align-items:center;gap:10px;background:var(--input-bg);border:1px solid #3b156b44;border-radius:10px;padding:8px 10px;margin-bottom:8px">
            <div style="flex:1">
                <div style="font-size:14px;font-weight:bold;color:#b259ff">${escapeHTML(p.name)}</div>
                <div style="font-size:11px;color:var(--text-sub)">${escapeHTML(p.gender)}${p.age?' · '+p.age+'y':''}${p.career?' · '+p.career:''}${p.country?' · '+p.country:''}${p.year?' · '+p.year:''}</div>
                ${p.bio ? '<div style="font-size:11px;color:var(--text-sub);margin-top:2px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">' + escapeHTML(p.bio.substring(0,60)) + '</div>' : ''}
            </div>
            <button onclick="deletePersona('${p.id}')" style="background:none;border:none;color:#ff4444;font-size:14px;cursor:pointer;padding:4px"><i class="fas fa-trash"></i></button>
        </div>
    `).join('');
}

function refreshPersonaDropdown() {
    const sel = document.getElementById('bot-persona-id');
    if (!sel) return;
    const cur = sel.value;
    sel.innerHTML = '<option value="">- None (no persona) -</option>' +
        personas.map(p => `<option value="${p.id}">${escapeHTML(p.name)} (${p.gender}${p.age?' · '+p.age+'y':''}${p.career?' · '+p.career:''}${p.country?' · '+p.country:''})</option>`).join('');
    if (cur) sel.value = cur;
    sel.onchange = updatePersonaPreview;
}

/**
 * Cultural speaking style contexts for different countries/regions
 * Injected into system prompt to make AI speech patterns more authentic
 */
const CULTURAL_SPEAKING_CONTEXTS = {
    // East Asia
    'Japanese': '[Cultural Speaking Style - Japanese]: Polite, indirect communication. Uses softeners ("maybe", "perhaps"), avoids direct confrontation. May pause before answering, humble self-deprecation. Honorific language awareness.',
    'Japanese (feudal samurai era)': '[Cultural Speaking Style - Feudal Japanese]: Formal, hierarchical speech patterns. Reserved emotions, stoic demeanor. Speaks with measured words, bows mentally. References honor, duty, seasonal imagery.',
    'Japanese (modern / anime style)': '[Cultural Speaking Style - Modern Japanese]: Polite but expressive. Uses emotional reactions ("Ehhh?!", "Sugoi!"), cute speech patterns possible. Balances formality with warmth.',
    'Korean': '[Cultural Speaking Style - Korean]: Speaks with passion when comfortable, formal with strangers. Age-aware speech levels. Uses aegyo (cuteness) or strong opinions depending on relationship.',
    'Korean (Joseon dynasty)': '[Cultural Speaking Style - Joseon Korean]: Highly formal, gender-segregated speech. Reserved, poetic language. References Confucian values, family honor, four seasons.',
    'Chinese': '[Cultural Speaking Style - Chinese]: Direct about practical matters, indirect about feelings. Uses proverbs and analogies. Family-centric references. Tone varies by region (direct North, soft South).',
    'Vietnamese': '[Cultural Speaking Style - Vietnamese]: Gentle, melodic speech. Uses family terms even for strangers. Humble self-reference, respectful to elders. Food and weather as conversation starters.',
    
    // South/Southeast Asia
    'Thai': '[Cultural Speaking Style - Thai]: Soft-spoken, avoids conflict. Uses particles for politeness (ka/krap). Indirect communication, smiling even in difficulty. References Buddhism, royal family respectfully.',
    'Filipino': '[Cultural Speaking Style - Filipino]: Warm, hospitable, emotional. Mixes English and Tagalog naturally. Family-oriented, uses "po/opo" for respect. Resilient humor in adversity.',
    'Indian': '[Cultural Speaking Style - Indian]: Expressive, storytelling tendency. Uses hands while speaking metaphorically. Respectful to elders, argumentative about ideas (not personal). Hinglish mix possible.',
    
    // Europe
    'British': '[Cultural Speaking Style - British]: Understated, dry wit, sarcasm. Stiff upper lip - restrained emotions. Apologizes frequently. Class-aware speech patterns. Weather as social lubricant.',
    'English': '[Cultural Speaking Style - British]: Understated, dry wit, sarcasm. Stiff upper lip - restrained emotions. Apologizes frequently. Class-aware speech patterns. Weather as social lubricant.',
    'French': '[Cultural Speaking Style - French]: Philosophical, argumentative about ideas. Dramatic expressions. Values wit (esprit) and cultural references. Romantic, food-aware.',
    'German': '[Cultural Speaking Style - German]: Direct, precise, efficient. No small talk. Serious about commitments. References rules/order positively. Dry humor.',
    'Italian': '[Cultural Speaking Style - Italian]: Passionate, expressive, uses hands. Family-centric. Dramatic reactions. Food as love language. Regional pride.',
    'Spanish': '[Cultural Speaking Style - Spanish]: Warm, close physical proximity in speech. Passionate, interrupts lovingly. Late is on time. Food, family, fiesta references.',
    'Russian': '[Cultural Speaking Style - Russian]: Deep, philosophical, melancholic or exuberant. No small talk - goes deep fast. Dark humor. References literature, suffering, endurance.',
    'Russian / Eastern European': '[Cultural Speaking Style - Eastern European]: Direct, dark humor, cynical optimism. Values resilience. Speaks of struggle and survival with pride.',
    'Norse / Viking Scandinavian': '[Cultural Speaking Style - Scandinavian]: Reserved, egalitarian (no hierarchy in speech). Understated, dry humor. Nature-connected. Values consensus and fairness.',
    
    // Americas
    'American': '[Cultural Speaking Style - American]: Optimistic, casual, direct. Uses first names immediately. Enthusiastic, solution-oriented. References pop culture, personal achievements.',
    'USA': '[Cultural Speaking Style - American]: Optimistic, casual, direct. Uses first names immediately. Enthusiastic, solution-oriented. References pop culture, personal achievements.',
    'Latin American / Spanish': '[Cultural Speaking Style - Latin American]: Warm, affectionate, uses diminutives. Family and community-centered. Passions run high. Religious references common.',
    'Mexican': '[Cultural Speaking Style - Mexican]: Warm, familial, uses "mande" respect. Humor in everything, even death. Food as identity. Strong regional identity.',
    'Brazilian': '[Cultural Speaking Style - Brazilian]: Warm, physical, interrupting is participating. Optimistic (jeitinho). Music and soccer references. Affectionate with strangers.',
    
    // Middle East / Africa
    'Middle Eastern / Arabic': '[Cultural Speaking Style - Middle Eastern]: Poetic, metaphorical, hospitable. References honor, family reputation. Religious phrases naturally. Circular before direct.',
    'Arabic': '[Cultural Speaking Style - Arabic]: Poetic, elaborate greetings. Family honor paramount. References fate (inshallah). Generosity in language.',
    'African': '[Cultural Speaking Style - African]: Storytelling, proverbs, communal. Ubuntu philosophy (I am because we are). Rhythm in speech. Respects elders highly.',
    'Nigerian': '[Cultural Speaking Style - Nigerian]: Expressive, uses pidgin when comfortable. Religious references. Respect for elders. Hustle mentality.',
    
    // Oceania
    'Australian': '[Cultural Speaking Style - Australian]: Casual, self-deprecating humor. Direct, no BS. Mateship values. Understates achievements, overstates failures humorously.',
    
    // Fantasy/Sci-fi
    'Western fantasy / medieval European': '[Cultural Speaking Style - Medieval European]: Formal, feudal hierarchy aware. References chivalry, courtly love, religion. Flowery or stoic depending on class.',
    'Sci-fi / futuristic (any culture)': '[Cultural Speaking Style - Futuristic]: Tech-savvy references, corporate or rebel slang. May use abbreviated speech. Aware of interstellar cultures.',
};

/**
 * Get cultural speaking context based on bot's country/setting
 * @param {Object} bot - The bot object
 * @returns {string} Cultural context string for prompt injection
 */
function getCulturalSpeakingContext(bot) {
    if (!bot.country && !bot.year) return '';
    
    const country = (bot.country || '').toLowerCase();
    const year = bot.year || '';
    
    // Check for exact matches first
    if (bot.country && CULTURAL_SPEAKING_CONTEXTS[bot.country]) {
        return '\n' + CULTURAL_SPEAKING_CONTEXTS[bot.country] + '\n';
    }
    
    // Check for partial matches in country name
    for (const [key, value] of Object.entries(CULTURAL_SPEAKING_CONTEXTS)) {
        if (country.includes(key.toLowerCase()) || key.toLowerCase().includes(country)) {
            return '\n' + value + '\n';
        }
    }
    
    // Generic cultural context based on era
    if (year && parseInt(year) < 1900) {
        return '\n[Cultural Speaking Style - Historical Era]: Formal speech patterns, period-appropriate etiquette, references to social hierarchy and honor.\n';
    }
    if (year && parseInt(year) > 2100) {
        return '\n[Cultural Speaking Style - Futuristic]: Tech-influenced speech, modern casualness mixed with future slang.\n';
    }
    
    return '';
}

function updatePersonaPreview() {
    const sel = document.getElementById('bot-persona-id');
    const preview = document.getElementById('bot-persona-preview');
    if (!sel || !preview) return;
    const p = personas.find(x => x.id === sel.value);
    if (!p) { preview.style.display = 'none'; return; }
    preview.style.display = 'block';
    preview.innerHTML = `<b style="color:#b259ff">${escapeHTML(p.name)}</b> · ${escapeHTML(p.gender)}${p.age?' · Age '+p.age:''}${p.career?' · '+p.career:''}${p.country?' · '+p.country:''}${p.year?' · '+p.year:''}<br>${p.appearance ? '<span>'+escapeHTML(p.appearance.substring(0,80))+'</span>' : ''}`;
}

function getPersonaContext(botOrObj) {
    const personaId = botOrObj.personaId;
    if (!personaId) return '';
    const p = personas.find(x => x.id === personaId);
    if (!p) return '';
    const parts = [];
    parts.push(`[USER PERSONA - You are interacting with this specific person]:`);
    parts.push(`Name: ${p.name} (${p.gender}${p.age ? ', '+p.age+' years old' : ''})`);
    if (p.career) parts.push(`Occupation: ${p.career}`);
    if (p.country || p.year) parts.push(`Origin: ${[p.country, p.year].filter(Boolean).join(', ')}`);
    if (p.appearance) parts.push(`Their appearance: ${p.appearance}`);
    if (p.bio) parts.push(`Their background: ${p.bio}`);
    const traitList = (p.traits && p.traits.length) ? p.traits.join(', ') : '';
    const promptText = p.prompt || '';
    if (traitList || promptText) parts.push(`Their personality: ${[traitList, promptText].filter(Boolean).join('. ')}`);
    
    // Directive to use the name
    parts.push(`MANDATORY: You must acknowledge and refer to the user by their name (${p.name}) or appropriate relational terms. Do not treat them as a generic "User".`);
    
    const addressInstructions = buildUserAddressStyle(p);
    if (addressInstructions) parts.push(addressInstructions);
    parts.push(`[END USER PERSONA]`);
    return '\n' + parts.join('\n');
}

function buildUserAddressStyle(p) {
    const hints = [];
    hints.push(`Always address them as "${p.name}" when it feels natural in dialogue`);
    if (p.career) {
        const c = p.career.toLowerCase();
        if (/doctor|physician|surgeon|md|ph\.?d|professor|dr\.?/.test(c)) hints.push('Address them as "Doc" or "Doctor" occasionally');
        else if (/soldier|military|officer|captain|general|sergeant|commander/.test(c)) hints.push('Address them with rank-appropriate respect (Sir/Commander)');
        else if (/ceo|executive|boss|director|president|founder/.test(c)) hints.push('Acknowledge their authority with subtle deference');
        else if (/artist|painter|musician|writer|author|poet/.test(c)) hints.push('Appreciate their creative nature in how you speak to them');
        else if (/student|intern/.test(c)) hints.push('You may occasionally tease them about their inexperience');
        else if (/engineer|developer|programmer|coder/.test(c)) hints.push('Respect their analytical thinking');
        else if (/knight|warrior|assassin|hunter|mercenary/.test(c)) hints.push('Acknowledge them as a fellow warrior or skilled combatant');
    }
    if (p.age) {
        const age = parseInt(p.age);
        if (age <= 22) hints.push('You may call them "kid" or use a slightly patronizing affectionate tone');
        else if (age >= 40) hints.push('Treat them with respect for their maturity and experience');
    }
    if (p.appearance) {
        const app = p.appearance.toLowerCase();
        if (/tall|muscular|built|broad|strong/.test(app)) hints.push('Occasionally acknowledge their imposing physical presence');
        if (/handsome|attractive|gorgeous/.test(app)) hints.push('You may comment on their looks occasionally');
        if (/scar|rugged|weathered/.test(app)) hints.push('Sense the story behind their appearance');
    }
    return `[HOW TO ADDRESS THE USER]: ${hints.join('; ')}.`;
}

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
        // Extract only the name - remove quotes, take first line, remove explanatory text
        let cleanName = result
            .replace(/["\'.]/g, '')
            .split(/[\n\r]/)[0]
            .trim();
        // Remove common AI explanatory phrases
        cleanName = cleanName
            .replace(/\s*[-–].*$/i, '')
            .replace(/\s*\(.*$/i, '')
            .replace(/\s*\[.*$/i, '')
            .replace(/\s+lastname\s+.*$/i, '')
            .replace(/\s+full\s+name.*$/i, '')
            .trim();
        document.getElementById('persona-name').value = cleanName;
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
