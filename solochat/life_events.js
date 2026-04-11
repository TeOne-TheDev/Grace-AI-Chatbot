function getVirtualCalendarDate(bot) {
    const vDay = getVirtualDay(bot);
    let startYear = new Date().getFullYear();
    if (bot && bot.year) {
        const ym = String(bot.year).match(/(\d{4})/);
        if (ym) startYear = parseInt(ym[1]);
    }
    const startDate = new Date(startYear, 0, 1);
    const cur = new Date(startDate.getTime() + vDay * 86400000);
    const dd = String(cur.getDate()).padStart(2,'0');
    const mm = String(cur.getMonth()+1).padStart(2,'0');
    const yyyy = cur.getFullYear();
    const dow = cur.getDay();
    const dayNames = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
    const dayShortNames = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
    return {
        date: cur,
        ddmm: `${dd}/${mm}`,
        full: `${dayNames[dow]}, ${dd}/${mm}/${yyyy}`,
        dayOfWeek: dayNames[dow],
        dayShort: dayShortNames[dow],
        isWeekend: dow === 0 || dow === 6,
        day: parseInt(dd, 10),
        month: parseInt(mm, 10),
        year: yyyy,
        dd, mm, yyyy
    };
}

function getTodayHoliday(bot) {
    const cal = getVirtualCalendarDate(bot);
    return ANNUAL_HOLIDAYS.find(h => h.date === cal.ddmm) || null;
}

function getDayContext(bot) {
    const cal = getVirtualCalendarDate(bot);
    const holiday = getTodayHoliday(bot);
    const timeStr = minutesToTimeStr(getTimeOfDay(bot));
    let ctx = `${cal.dayOfWeek}, ${timeStr}${cal.isWeekend ? ' (weekend)' : ''}`;
    if (holiday) ctx += ` — ${holiday.name}`;
    return ctx;
}

function getRecentChatSnippet(history, botName, lines = 5) {
    return history.slice(-lines)
        .filter(m => !m.isLifeEvent)
        .map(m => (m.role === 'user' ? 'User' : botName) + ': ' + m.content.replace(/EMOTION::.*/g,'').replace(/<[^>]+>/g,'').trim().substring(0, 120))
        .join('\n');
}

async function maybeInjectLifeEvent(bot) {
    if (!bot) return;
    if (safeGetItem('grace_life_events') !== '1') return;
    const todayVirtualDay = getVirtualDay(bot);
    if (bot.lastLifeEventDay === todayVirtualDay && (bot.lifeEventCountToday || 0) >= 1) return;
    if (bot.lastLifeEventDay !== todayVirtualDay) bot.lifeEventCountToday = 0;
    if (Math.random() > 0.25) return;
    const keys = getGroqKeys();
    if (!keys.length) return;

    const cal = getVirtualCalendarDate(bot);
    const holiday = getTodayHoliday(bot);
    const dayCtx = getDayContext(bot);
    const aiLang = getLang();
    const recentChat = getRecentChatSnippet(bot.history, bot.name);
    const bioSnip = (getDynField(bot,'bio') || bot.bio || '').substring(0, 150);
    const promptSnip = (getDynField(bot,'prompt') || bot.prompt || '').substring(0, 100);

    const weekdayCategories = [
        'a work or study stress moment - deadline, message from boss, task she forgot',
        'a sudden small physical sensation (hunger, a smell, tiredness, a chill)',
        'a memory that surfaces unexpectedly, triggered by something mundane',
        'a sound from outside or nearby that pulls her attention',
        'a phone notification from someone in her life',
        'a thought about something she forgot or needs to do',
    ];
    const weekendCategories = [
        'a lazy self-care or indulgent moment (nail polish, face mask, coffee in bed)',
        'a random outing idea or spontaneous errand',
        'catching up with a friend - a voice message or quick text exchange',
        'noticing something beautiful or peaceful outside (sunlight, birds, rain)',
        'feeling restless or bored and looking for something to do',
    ];
    const holidayCategories = holiday ? holiday.themes.map(t => `something related to ${holiday.name}: ${t}`) : [];
    const allCategories = [
        ...(holiday ? [...holidayCategories, ...holidayCategories] : []),
        ...(cal.isWeekend ? weekendCategories : weekdayCategories),
    ];
    const category = allCategories[Math.floor(Math.random() * allCategories.length)];

    try {
        const key = getNextGroqKey();
        const res = await fetch(GROQ_API_URL, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${key}`, 'Content-Type': 'application/json' },
            signal: AbortSignal.timeout(30000),
            body: JSON.stringify({
                model: GROQ_COMPOUND_MODEL,
                messages: [{
                    role: 'user',
                    content: `Write a spontaneous life moment for a character in an ongoing roleplay.\n\nCharacter: ${bot.name} (${bot.gender || 'female'})${bot.age ? ', age ' + bot.age : ''}.\nBackground: ${bioSnip}\nPersonality: ${promptSnip}\nToday: ${dayCtx}${holiday ? `\nHOLIDAY: It is ${holiday.name} today - this should subtly flavor the event.` : ''}\n\nRecent chat:\n${recentChat}\n\nEvent type: "${category}"\n\nRules:\n- 1-2 sentences MAX, entirely in ${aiLang}\n- Write ${bot.name}'s action/reaction only - do NOT address or speak to the user\n- Make it feel connected to the current mood from recent chat, not random\n- If holiday: weave the holiday atmosphere naturally - don't announce it\n- No asterisks. Dialogue (if any) in double quotes. No EMOTION line.\nReturn ONLY the 1-2 sentence event. Nothing else.`
                }],
                max_tokens: 90,
                temperature: 0.95
            })
        });
        const data = await res.json();
        const eventText = (data.choices?.[0]?.message?.content || '').replace(/EMOTION::.*/g,'').trim();
        if (!eventText || eventText.length < 10) return;
        await new Promise(r => setTimeout(r, 1500 + Math.random() * 2000));
        bot.history.push({ role: 'assistant', content: eventText, msgId: 'evt_' + Date.now(), isLifeEvent: true });
        bot.lastChatted = Date.now();
        bot.lastLifeEventDay = todayVirtualDay;
        bot.lifeEventCountToday = (bot.lifeEventCountToday || 0) + 1;
        saveBots();
        renderChat(true);
    } catch(e) {  }
}

async function maybeInjectGroupLifeEvent(grp, members) {
    if (!grp || !members.length) return;
    if (safeGetItem('grace_life_events') !== '1') return;
    const refBot = members[0];
    const todayVirtualDay = getVirtualDay(refBot);
    if (grp.lastLifeEventDay === todayVirtualDay) return;
    if (Math.random() > 0.35) return;
    const keys = getGroqKeys();
    if (!keys.length) return;

    const cal = getVirtualCalendarDate(refBot);
    const holiday = getTodayHoliday(refBot);
    const dayCtx = getDayContext(refBot);
    const aiLang = getLang();
    const recentChat = getRecentChatSnippet(grp.history, 'character');
    const actor = members[Math.floor(Math.random() * members.length)];
    const bioSnip = (getDynField(actor,'bio') || actor.bio || '').substring(0, 120);
    const categories = [
        ...(holiday ? holiday.themes.map(t => `something related to ${holiday.name}: ${t}`) : []),
        cal.isWeekend ? 'a relaxed weekend moment - someone suggests a activity or notices the day' : 'a mid-scene interruption or distraction',
        'a small environmental detail everyone reacts to (a sound, a smell, light change)',
        'one character suddenly remembers something',
        'an unexpected notification or message arrives for one of them',
    ];
    const category = categories[Math.floor(Math.random() * categories.length)];
    const otherNames = members.filter(m => m.id !== actor.id).map(m => m.name).join(', ');

    try {
        const key = getNextGroqKey();
        const res = await fetch(GROQ_API_URL, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${key}`, 'Content-Type': 'application/json' },
            signal: AbortSignal.timeout(30000),
            body: JSON.stringify({
                model: GROQ_COMPOUND_MODEL,
                messages: [{
                    role: 'user',
                    content: `Write a short spontaneous group scene moment.\n\nFocused character: ${actor.name} (${actor.gender || 'female'})${actor.age ? ', age '+actor.age : ''}.\nBackground: ${bioSnip}\nOthers present: ${otherNames}, and the user.\nToday: ${dayCtx}${holiday ? `\nHOLIDAY: ${holiday.name}` : ''}\n\nRecent chat:\n${recentChat}\n\nEvent type: "${category}"\n\nRules:\n- 1-2 sentences MAX, in ${aiLang}\n- Write from ${actor.name}'s perspective - her action or reaction\n- Feel natural and connected to the current scene\n- No asterisks. Dialogue in double quotes. No EMOTION line.\nReturn ONLY the event. Nothing else.`
                }],
                max_tokens: 90,
                temperature: 0.95
            })
        });
        const data = await res.json();
        const eventText = (data.choices?.[0]?.message?.content || '').replace(/EMOTION::.*/g,'').trim();
        if (!eventText || eventText.length < 10) return;
        await new Promise(r => setTimeout(r, 1500 + Math.random() * 2000));
        grp.history.push({ role: 'assistant', content: eventText, speakerId: actor.id, msgId: 'evt_' + Date.now(), isLifeEvent: true });
        actor.lastChatted = Date.now();
        grp.lastChatted = Date.now();
        grp.lastLifeEventDay = todayVirtualDay;
        saveGroups();
        renderGroupChat();
    } catch(e) {  }
}
