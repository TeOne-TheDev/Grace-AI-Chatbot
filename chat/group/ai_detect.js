// chat/group/ai_detect.js - AI detection for group chat
// Depends on: api/groq.js (fetchGroq), core/constants.js (GROQ_GEN_MODEL), core/ui_helpers.js (logError)

async function detectTimeSkipAI(msg) {
    if (!getGroqKeys().length) return null;
    
    try {
        const data = await fetchGroq({
            model: GROQ_GEN_MODEL,
            messages: [{
                role: 'system',
                content: 'You are a time skip detector. Determine if the message indicates a time skip (e.g., "next morning", "hours later", "after a while"). Return the time skip description or "none" if no skip.'
            }, { role: 'user', content: msg }],
            max_tokens: 50,
            temperature: 0.5
        });
        
        const result = data.choices[0].message.content.trim().toLowerCase();
        return result === 'none' ? null : result;
    } catch (e) {
        logError('detectTimeSkipAI failed', e.message);
        return null;
    }
}

async function applyGroupTimeSkip(grpId, timeSkip) {
    const grp = groups.find(g => g.id === grpId);
    if (!grp) return;
    
    grp.history = grp.history || [];
    grp.history.push({
        role: 'system',
        content: `[Time skip: ${timeSkip}]`,
        msgId: 'skip_' + Date.now(),
        timestamp: Date.now()
    });
    
    saveGroups();
    renderGroupChat();
    
    showToast(`⏰ Time skip: ${timeSkip}`, '#0a1a0a', '#22c55e');
}

function updateGroupMemberStatuses(grpId) {
    const grp = groups.find(g => g.id === grpId);
    if (!grp) return;
    
    grp.memberIds.forEach(id => {
        const bot = bots.find(b => b.id === id);
        if (bot) {
            updateCharacterStatus(bot);
        }
    });
}
