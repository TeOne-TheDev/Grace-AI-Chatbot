// chat/group/movement.js - Movement analysis for group chat
// Depends on: api/groq.js (fetchGroq), core/constants.js (GROQ_GEN_MODEL), core/ui_helpers.js (logError)

async function detectWakeUpAI(bot) {
    if (!getGroqKeys().length) return false;
    
    try {
        const data = await fetchGroq({
            model: GROQ_GEN_MODEL,
            messages: [{
                role: 'system',
                content: 'You are a wake-up detector. Determine if the user is trying to wake up the character. Return "yes" or "no" only.'
            }, { role: 'user', content: bot.history.slice(-3).map(m => m.content).join('\n') }],
            max_tokens: 10,
            temperature: 0.3
        });
        
        const result = data.choices[0].message.content.toLowerCase().trim();
        return result === 'yes';
    } catch (e) {
        logError('detectWakeUpAI failed', e.message);
        return false;
    }
}

async function callRoomManagerAI(grp, userMsg) {
    if (!getGroqKeys().length) return null;
    
    const members = grp.memberIds.map(id => bots.find(b => b.id === id)).filter(Boolean);
    const memberList = members.map(m => `${m.name} (${m.gender})`).join(', ');
    
    try {
        const data = await fetchGroq({
            model: GROQ_GEN_MODEL,
            messages: [{
                role: 'system',
                content: `You are a room manager for a group chat. Determine which room the user should be in based on their message.

Group members: ${memberList}
Available rooms: ${PRESET_ROOMS.map(r => r.name).join(', ')}

Return ONLY the room ID (e.g., "living_room", "kitchen"). No explanation.`
            }, { role: 'user', content: userMsg }],
            max_tokens: 50,
            temperature: 0.7
        });
        
        const roomId = data.choices[0].message.content.trim();
        const validRoom = PRESET_ROOMS.find(r => r.id === roomId);
        
        return validRoom ? roomId : 'living_room';
    } catch (e) {
        logError('callRoomManagerAI failed', e.message);
        return 'living_room';
    }
}

async function analyzeMovementAfterExchange(grpId) {
    const grp = groups.find(g => g.id === grpId);
    if (!grp) return;
    
    const lastMsg = grp.history[grp.history.length - 1];
    if (!lastMsg || lastMsg.role !== 'user') return;
    
    const suggestedRoom = await callRoomManagerAI(grp, lastMsg.content);
    if (suggestedRoom && suggestedRoom !== grp.userRoom) {
        moveUserToRoom(grpId, suggestedRoom);
    }
}

function resolveScheduleMoveFromUserToMsg(botId) {
    const bot = bots.find(b => b.id === botId);
    if (!bot || !bot.schedule) return null;
    
    return null;
}
