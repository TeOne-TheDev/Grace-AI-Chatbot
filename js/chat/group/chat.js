// chat/group/chat.js - Group chat main functions
// Depends on: api/groq.js (fetchGroqChat), bots/bot_data.js (getCharContext), bots/bot_memory.js (buildHistoryForAPI), personas/persona_context.js (getPersonaContext), personas/persona_culture.js (getCulturalSpeakingContext), traits/traits_state.js (buildTraitContext), states/states_sync.js (getStatesContext), ui/chat_ui.js (openChat, closeChat), ui/scroll.js (scrollToBottom), core/text.js (cleanReply), core/constants.js (RECENT_MSG_KEEP)

let curGroupId = null;
const PERSONA_MALE_TRAITS = ['handsome', 'tall', 'muscular', 'broad shoulders', 'sharp jawline'];

async function sendGroupMsg() {
    if (!curGroupId) return;
    const input = document.getElementById('grp-chat-input');
    const text = input.value.trim();
    if (!text) return;
    
    const grp = groups.find(g => g.id === curGroupId);
    if (!grp) return;
    
    input.value = '';
    autoResize(input);
    
    const userMsg = {
        role: 'user',
        content: text,
        msgId: 'msg_' + Date.now(),
        timestamp: Date.now()
    };
    
    grp.history = grp.history || [];
    grp.history.push(userMsg);
    saveGroups();
    renderGroupChat();
    
    showGroupTypingIndicator();
    
    try {
        const context = buildGroupChatContext(grp);
        const history = buildGroupHistoryForAPI(grp);
        
        const data = await fetchGroqChat([
            { role: 'system', content: context },
            ...history
        ]);
        
        const reply = data.choices[0].message.content;
        const cleanedReply = cleanReply(reply);
        
        const responderId = selectResponder(grp, cleanedReply);
        
        const botMsg = {
            role: 'assistant',
            content: cleanedReply,
            msgId: 'msg_' + (Date.now() + 1),
            timestamp: Date.now(),
            responderId
        };
        
        grp.history.push(botMsg);
        grp.lastChatted = Date.now();
        saveGroups();
        renderGroupChat();
        
        hideGroupTypingIndicator();
    } catch (e) {
        hideGroupTypingIndicator();
        logError('sendGroupMsg failed', e.message);
        alert('Failed to get response. Check your API key.');
    }
}

function buildGroupChatContext(grp) {
    const parts = [];
    parts.push(`[GROUP CHAT: ${grp.name}]`);
    
    grp.memberIds.forEach(id => {
        const bot = bots.find(b => b.id === id);
        if (bot) {
            parts.push(`- ${bot.name} (${bot.gender}${bot.age ? ', ' + bot.age + ' years old' : ''})`);
            parts.push(getCharContext(bot));
        }
    });
    
    return parts.join('\n\n');
}

function buildGroupHistoryForAPI(grp) {
    const history = grp.history || [];
    if (history.length <= RECENT_MSG_KEEP) return history;
    
    return history.slice(-RECENT_MSG_KEEP);
}

function selectResponder(grp, reply) {
    const members = grp.memberIds.map(id => bots.find(b => b.id === id)).filter(Boolean);
    if (members.length === 0) return null;
    
    if (reply) {
        for (const bot of members) {
            if (reply.toLowerCase().includes(bot.name.toLowerCase())) {
                return bot.id;
            }
        }
    }
    
    return members[Math.floor(Math.random() * members.length)].id;
}

function openGroupChat(groupId) {
    curGroupId = groupId;
    const grp = groups.find(g => g.id === groupId);
    if (!grp) return;
    
    grp.lastChatted = Date.now();
    saveGroups();
    
    openScreen('sc-group-chat');
    renderGroupChat();
    
    const input = document.getElementById('grp-chat-input');
    if (input) input.focus();
}

function closeGroupChat() {
    curGroupId = null;
    closeScreen('sc-group-chat');
}

function illustrateGroupScene() {
    if (!curGroupId) return;
    const grp = groups.find(g => g.id === curGroupId);
    if (!grp) return;
    
    showToast('🎨 Generating group illustration...', '#0a1a0a', '#f97316');
}

function continueGroupStory() {
    if (!curGroupId) return;
    const grp = groups.find(g => g.id === curGroupId);
    if (!grp) return;
    
    showToast('📖 Continuing group story...', '#0a1a0a', '#22c55e');
}
