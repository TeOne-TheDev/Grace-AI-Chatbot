// schedule_generation.js - AI-powered schedule generation
// Depends on: api/keys.js (getGroqKeys), api/groq.js (fetchGroq), core/constants.js (GROQ_SCHEDULE_MODEL, GROQ_GEN_MODEL), core/ui_helpers.js (diceSpin, setDiceLoading, logError), core/i18n.js (t, getLang), schedule/schedule_data.js (DAY_KEYS, KNOWN_VARIANT_KEYS, KNOWN_SCHED_FIELDS)

async function generateScheduleAI(botId) {
    if (!getGroqKeys().length) { alert(t('needKey')); return; }
    
    const bot = bots.find(b => b.id === botId);
    if (!bot) return;
    
    const btn = document.getElementById('btn-gen-schedule');
    if (btn) btn.disabled = true;
    
    const lang = getLang();
    const age = getCurrentAge(bot);
    
    try {
        const data = await fetchGroq({
            model: GROQ_SCHEDULE_MODEL,
            messages: [{
                role: 'system',
                content: `You are a schedule generator for roleplay characters. Generate a realistic daily schedule.
Character: ${bot.name} (${bot.gender}${age ? ', ' + age + ' years old' : ''}${bot.career ? ', ' + bot.career : ''})
${bot.bio ? 'Background: ' + bot.bio : ''}
${bot.prompt ? 'Personality: ' + bot.prompt : ''}

Return ONLY a valid JSON with keys for each day (Mon, Tue, Wed, Thu, Fri, Sat, Sun).
Each day has keys: morning, afternoon, evening, night.
Each time slot has keys: time (HH:MM format), room, activity, mood (optional), company (optional), notes (optional).
All text in ${lang}. No markdown, no extra text.`
            }, { role: 'user', content: 'Generate the schedule.' }],
            response_format: { type: 'json_object' },
            temperature: 0.9
        });
        
        const schedule = JSON.parse(data.choices?.[0]?.message?.content || '{}');
        bot.schedule = _normalizeVariants(schedule);
        saveBots();
        
        showToast('✅ Schedule generated!', '#0a1a0a', '#22c55e');
    } catch (e) {
        logError('generateScheduleAI failed', e.message);
        alert('Generation failed. Check API key.');
    }
    
    if (btn) btn.disabled = false;
}

async function generateScheduleAIGroup(groupId) {
    if (!getGroqKeys().length) { alert(t('needKey')); return; }
    
    const grp = groups.find(g => g.id === groupId);
    if (!grp) return;
    
    const btn = document.getElementById('btn-gen-grp-schedule');
    if (btn) btn.disabled = true;
    
    const lang = getLang();
    const members = grp.memberIds.map(id => bots.find(b => b.id === id)).filter(Boolean);
    const memberDesc = members.map(m => `${m.name} (${m.gender}${m.career ? ', ' + m.career : ''})`).join(', ');
    
    try {
        const data = await fetchGroq({
            model: GROQ_SCHEDULE_MODEL,
            messages: [{
                role: 'system',
                content: `You are a schedule generator for a group household. Generate a realistic daily schedule.
Group: ${grp.name}
Members: ${memberDesc}

Return ONLY a valid JSON with keys for each day (Mon, Tue, Wed, Thu, Fri, Sat, Sun).
Each day has keys: morning, afternoon, evening, night.
Each time slot has keys: time (HH:MM format), room, activity, mood (optional), company (optional), notes (optional).
Company field should specify which members are present.
All text in ${lang}. No markdown, no extra text.`
            }, { role: 'user', content: 'Generate the schedule.' }],
            response_format: { type: 'json_object' },
            temperature: 0.9
        });
        
        const schedule = JSON.parse(data.choices?.[0]?.message?.content || '{}');
        grp.schedule = _normalizeVariants(schedule);
        saveGroups();
        
        showToast('✅ Group schedule generated!', '#0a1a0a', '#22c55e');
    } catch (e) {
        logError('generateScheduleAIGroup failed', e.message);
        alert('Generation failed. Check API key.');
    }
    
    if (btn) btn.disabled = false;
}

function _normalizeVariants(schedule) {
    if (!schedule) return null;
    
    const normalized = {};
    DAY_KEYS.forEach(day => {
        if (schedule[day]) {
            normalized[day] = {};
            KNOWN_VARIANT_KEYS.forEach(variant => {
                if (schedule[day][variant]) {
                    const entry = schedule[day][variant];
                    normalized[day][variant] = {
                        time: entry.time || '09:00',
                        room: entry.room || 'living_room',
                        activity: entry.activity || 'relaxing',
                        mood: entry.mood || '',
                        company: entry.company || '',
                        notes: entry.notes || ''
                    };
                }
            });
        }
    });
    
    return normalized;
}
