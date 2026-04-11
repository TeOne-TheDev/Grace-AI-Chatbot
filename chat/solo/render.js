// chat/solo/render.js - Solo chat rendering
// Depends on: core/text.js (formatBubbleContent), core/time.js (minutesToTimeStr), core/storage.js (loadIllusUrl), bots/bot_card.js (makeBotCard), ui/scroll.js (scrollToBottom)

function renderChat() {
    if (!curId) return;
    const bot = bots.find(b => b.id === curId);
    if (!bot) return;
    
    const container = document.getElementById('chat-container');
    if (!container) return;
    
    const history = bot.history || [];
    
    container.innerHTML = history.map(msg => {
        if (msg.role === 'user') {
            return `
                <div class="chat-message user-message">
                    <div class="message-bubble user-bubble">
                        ${formatBubbleContent(msg.content)}
                    </div>
                    <div class="message-time">${new Date(msg.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</div>
                </div>
            `;
        } else {
            const illustUrl = msg.illustUrl === '__stored__' ? loadIllusUrl(msg.msgId) : msg.illustUrl;
            return `
                <div class="chat-message bot-message">
                    <div class="bot-avatar" onclick="showBioPopup('${bot.id}')">
                        ${bot.avatar ? `<img src="${bot.avatar}" alt="${escapeHTML(bot.name)}">` : `<span>${escapeHTML(bot.name.charAt(0))}</span>`}
                    </div>
                    <div class="message-content">
                        <div class="message-bubble bot-bubble">
                            ${formatBubbleContent(msg.content)}
                        </div>
                        ${illustUrl ? `<img src="${illustUrl}" class="message-illustration" alt="Illustration">` : ''}
                        <div class="message-time">${new Date(msg.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</div>
                    </div>
                </div>
            `;
        }
    }).join('');
    
    scrollToBottom();
}

function showAvatarStatus(status) {
    const avatar = document.querySelector('.bot-avatar');
    if (!avatar) return;
    
    avatar.dataset.status = status;
}

function hideStatusTooltip() {
    const tooltip = document.querySelector('.status-tooltip');
    if (tooltip) tooltip.style.display = 'none';
}

function showTypingIndicator() {
    const container = document.getElementById('chat-container');
    if (!container) return;
    
    const indicator = document.createElement('div');
    indicator.className = 'typing-indicator';
    indicator.id = 'typing-indicator';
    indicator.innerHTML = '<span></span><span></span><span></span>';
    
    container.appendChild(indicator);
    scrollToBottom();
}

function hideTypingIndicator() {
    const indicator = document.getElementById('typing-indicator');
    if (indicator) indicator.remove();
}
