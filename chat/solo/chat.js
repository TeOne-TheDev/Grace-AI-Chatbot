// chat/solo/chat.js - Solo chat main functions
// Depends on: api/groq.js (fetchGroqChat), bots/bot_data.js (getCharContext), bots/bot_memory.js (buildHistoryForAPI, autoUpdateMemory), personas/persona_context.js (getPersonaContext), personas/persona_culture.js (getCulturalSpeakingContext), traits/traits_state.js (buildTraitContext), states/states_sync.js (getStatesContext), ui/chat_ui.js (openChat, closeChat), ui/scroll.js (scrollToBottom), core/text.js (cleanReply), core/constants.js (RECENT_MSG_KEEP)

let curId = null;
let _illustInProgress = false;
const STATUS_LIST = ['online', 'away', 'busy', 'offline'];

async function sendMsg() {
    if (!curId) return;
    const input = document.getElementById('chat-input');
    const text = input.value.trim();
    if (!text) return;
    
    const bot = bots.find(b => b.id === curId);
    if (!bot) return;
    
    input.value = '';
    autoResize(input);
    
    const userMsg = {
        role: 'user',
        content: text,
        msgId: 'msg_' + Date.now(),
        timestamp: Date.now()
    };
    
    bot.history = bot.history || [];
    bot.history.push(userMsg);
    saveBots();
    renderChat();
    
    showTypingIndicator();
    
    try {
        const context = buildChatContext(bot);
        const history = buildHistoryForAPI(bot);
        
        const data = await fetchGroqChat([
            { role: 'system', content: context },
            ...history
        ]);
        
        const reply = data.choices[0].message.content;
        const cleanedReply = cleanReply(reply);
        
        const botMsg = {
            role: 'assistant',
            content: cleanedReply,
            msgId: 'msg_' + (Date.now() + 1),
            timestamp: Date.now()
        };
        
        bot.history.push(botMsg);
        saveBots();
        renderChat();
        
        hideTypingIndicator();
        
        await autoUpdateMemory(bot);
    } catch (e) {
        hideTypingIndicator();
        logError('sendMsg failed', e.message);
        alert('Failed to get response. Check your API key.');
    }
}

function buildChatContext(bot) {
    const parts = [];
    
    parts.push(getCharContext(bot));
    parts.push(getPersonaContext(bot));
    parts.push(getCulturalSpeakingContext(bot));
    parts.push(buildTraitContext(bot));
    parts.push(getStatesContext(bot));
    
    return parts.filter(Boolean).join('\n\n');
}

function ensureNonEmptyAssistantReply(bot) {
    if (!bot.history || bot.history.length === 0) return;
    
    const lastMsg = bot.history[bot.history.length - 1];
    if (lastMsg.role === 'assistant' && (!lastMsg.content || !lastMsg.content.trim())) {
        bot.history.pop();
        saveBots();
    }
}

function resendMessage(msgId) {
    if (!curId) return;
    const bot = bots.find(b => b.id === curId);
    if (!bot) return;
    
    const msgIdx = bot.history.findIndex(m => m.msgId === msgId);
    if (msgIdx === -1) return;
    
    const msg = bot.history[msgIdx];
    if (msg.role !== 'user') return;
    
    bot.history = bot.history.slice(0, msgIdx);
    saveBots();
    renderChat();
    
    input.value = msg.content;
    sendMsg();
}

function regenerateLastReply() {
    if (!curId) return;
    const bot = bots.find(b => b.id === curId);
    if (!bot || !bot.history || bot.history.length === 0) return;
    
    const lastMsg = bot.history[bot.history.length - 1];
    if (lastMsg.role !== 'assistant') return;
    
    bot.history.pop();
    saveBots();
    renderChat();
    
    sendMsg();
}
