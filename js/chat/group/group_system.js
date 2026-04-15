// chat/group/group_system.js - Group system functions
// Depends on: api/groq.js (fetchGroq), bots/bot_storage.js (saveBots, saveGroups), core/ui_helpers.js (showToast, logError), core/i18n.js (t), core/constants.js (GROQ_GEN_MODEL)

function triggerGroupGreeting(grpId) {
    const grp = groups.find(g => g.id === grpId);
    if (!grp) return;
    
    const members = grp.memberIds.map(id => bots.find(b => b.id === id)).filter(Boolean);
    if (members.length === 0) return;
    
    const greeter = members[Math.floor(Math.random() * members.length)];
    
    const greeting = `Hello! I'm ${greeter.name}. Welcome to ${grp.name}!`;
    
    grp.history = grp.history || [];
    grp.history.push({
        role: 'assistant',
        content: greeting,
        msgId: 'msg_' + Date.now(),
        timestamp: Date.now(),
        responderId: greeter.id
    });
    
    saveGroups();
    renderGroupChat();
}

async function resolveRespondersAI(grp, userMsg) {
    if (!getGroqKeys().length) return null;
    
    const members = grp.memberIds.map(id => bots.find(b => b.id === id)).filter(Boolean);
    if (members.length === 0) return null;
    
    const memberList = members.map(m => `${m.name} (${m.gender})`).join(', ');
    
    try {
        const data = await fetchGroq({
            model: GROQ_GEN_MODEL,
            messages: [{
                role: 'system',
                content: `You are a responder selector for a group chat. Select the most appropriate character to respond to the user's message.

Group members: ${memberList}

Return ONLY the name of the character who should respond. No explanation, no extra text.`
            }, { role: 'user', content: userMsg }],
            max_tokens: 50,
            temperature: 0.7
        });
        
        const responderName = data.choices[0].message.content.trim();
        const responder = members.find(m => m.name.toLowerCase() === responderName.toLowerCase());
        
        return responder ? responder.id : members[Math.floor(Math.random() * members.length)].id;
    } catch (e) {
        logError('resolveRespondersAI failed', e.message);
        return members[Math.floor(Math.random() * members.length)].id;
    }
}

// NOTE: Solo and Group chat are now COMPLETELY SEPARATE universes
// No automatic sync between them. grpDynBio is independent from dynBio.

// Copy solo data to group ONCE during initial group creation (user choice)
function grpCopySoloToGroupInitial(grpId, botId) {
    const grp = groups.find(g => g.id === grpId);
    const bot = bots.find(b => b.id === botId);
    if (!grp || !bot) return;
    
    if (!bot.grpDynBio) bot.grpDynBio = {};
    // Copy solo dynBio as initial state for group
    bot.grpDynBio = { ...bot.dynBio };
    saveBots();
}

// Manual sync for specific bot (user-initiated only)
function grpSyncMemberBio(grpId, botId) {
    const grp = groups.find(g => g.id === grpId);
    const bot = bots.find(b => b.id === botId);
    if (!grp || !bot) return;
    
    // Group bio now syncs from GROUP chat history only, not from solo
    // This is handled by grpFullSyncDynBio in grchat/chat.js
    console.log('[Group Bio] Manual sync requested for', bot.name, '- group chat bio is independent from solo');
}

function grpUpdateMemberPortrait(grpId, botId, portraitUrl) {
    const grp = groups.find(g => g.id === grpId);
    if (!grp) return;
    
    if (!grp.memberPortraits) grp.memberPortraits = {};
    grp.memberPortraits[botId] = portraitUrl;
    
    saveGroups();
}

function suggestRelationshipAI(botId1, botId2) {
    if (!getGroqKeys().length) return;
    
    const bot1 = bots.find(b => b.id === botId1);
    const bot2 = bots.find(b => b.id === botId2);
    if (!bot1 || !bot2) return;
    
    showToast('🤝 Generating relationship suggestion...', '#0a1a0a', '#f97316');
}
