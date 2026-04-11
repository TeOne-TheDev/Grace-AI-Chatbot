// chat_ui.js - Chat-specific UI helpers
// Depends on: core/ui_helpers.js (autoResize, showToast), core/text.js (formatBubbleContent), core/time.js (minutesToTimeStr)

function openChat(botId) {
    curId = botId;
    const bot = bots.find(b => b.id === botId);
    if (!bot) return;
    
    bot.lastChatted = Date.now();
    saveBots();
    
    openScreen('sc-chat');
    renderChat();
    
    const input = document.getElementById('chat-input');
    if (input) input.focus();
}

function closeChat() {
    curId = null;
    closeScreen('sc-chat');
}

function clearChatHistory() {
    if (!curId) return;
    if (!confirm('Clear all chat history with this character?')) return;
    
    const bot = bots.find(b => b.id === curId);
    if (bot) {
        bot.history = [];
        bot.memorySummary = '';
        bot.lastSummaryAt = 0;
        saveBots();
        renderChat();
        showToast('Chat history cleared', '#0a1a0a', '#22c55e');
    }
}

function handleKey(e) {
    if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        sendMsg();
    }
}

function insertActionStar() {
    const input = document.getElementById('chat-input');
    if (input) {
        const start = input.selectionStart;
        const end = input.selectionEnd;
        const text = input.value;
        input.value = text.substring(0, start) + '*' + text.substring(start, end) + '*' + text.substring(end);
        input.selectionStart = input.selectionEnd = end + 2;
        input.focus();
    }
}

function insertThought() {
    const input = document.getElementById('chat-input');
    if (input) {
        const start = input.selectionStart;
        const end = input.selectionEnd;
        const text = input.value;
        input.value = text.substring(0, start) + '(' + text.substring(start, end) + ')' + text.substring(end);
        input.selectionStart = input.selectionEnd = end + 2;
        input.focus();
    }
}
