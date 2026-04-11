// bot_memory.js - Bot memory and history management
// Depends on: core/constants.js (RECENT_MSG_KEEP), core/utils.js (safeParse)

function buildHistoryForAPI(bot) {
    const history = bot.history || [];
    if (history.length <= RECENT_MSG_KEEP) return history;
    
    const recent = history.slice(-RECENT_MSG_KEEP);
    const older = history.slice(0, -RECENT_MSG_KEEP);
    
    if (!bot.memorySummary) {
        return recent;
    }
    
    const summaryMsg = {
        role: 'system',
        content: `[Memory Summary]\n${bot.memorySummary}\n\n[Recent conversation continues below]`
    };
    
    return [summaryMsg, ...recent];
}

async function autoUpdateMemory(bot) {
    if (!bot.history || bot.history.length < 4) return;
    
    const exchangeCount = bot.history.filter(m => m.role === 'assistant').length;
    const lastSummaryAt = bot.lastSummaryAt || 0;
    
    if (exchangeCount - lastSummaryAt < 5) return;
    
    const histText = bot.history.map(m =>
        (m.role === 'user' ? 'User' : bot.name) + ': ' +
        m.content.replace(/EMOTION::[^\n]*/i, '').replace(/<[^>]+>/g, '').trim()
    ).join('\n').substring(0, 4000);
    
    const prevSummary = bot.memorySummary
        ? '[Existing summary - update with new events below]\n' + bot.memorySummary + '\n\n[New events to integrate]\n'
        : '';
    
    try {
        const key = getNextGroqKey();
        const res = await fetch(GROQ_API_URL, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${key}`, 'Content-Type': 'application/json' },
            signal: AbortSignal.timeout(30000),
            body: JSON.stringify({
                model: GROQ_GEN_MODEL,
                messages: [
                    { role: 'system', content: 'You are a story continuity engine. Produce a dense factual log - events, established facts, current state - so the AI character never contradicts past events. No narrative prose, no emotional analysis.' },
                    {
                        role: 'user', content: `${prevSummary}CHARACTER: ${bot.name} (${bot.gender})

ROLEPLAY HISTORY:
${histText}

Write a bullet-point memory log. Each bullet = one fact. Be specific (names, places, objects, quoted phrases). NO full narrative sentences.

Format:
- relationship: [current dynamic / stage]
- [event]: [what happened - specific, one clause]
- [milestone]: [confession / first / conflict - what exactly]
- state: [${bot.name}'s emotional state toward user right now]
- unresolved: [open threads, promises, tensions if any]

Rules: Past tense for events, present for state. Max 6 bullets. No preamble, no headers, no prose.` }
                ],
                max_tokens: 350,
                temperature: 0.3
            })
        });
        const data = await res.json();
        const summary = data.choices?.[0]?.message?.content?.trim();
        if (summary && summary.length > 30) {
            bot.memorySummary = summary;
            bot.lastSummaryAt = exchangeCount;
            saveBots();
        }
    } catch (e) {
        logError('autoUpdateMemory failed', e.message);
    }
}
