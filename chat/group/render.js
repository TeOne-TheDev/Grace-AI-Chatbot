// chat/group/render.js - Group chat rendering
// Depends on: core/text.js (formatBubbleContent), core/time.js (minutesToTimeStr), core/storage.js (loadIllusUrl), bots/bot_card.js (makeBotCard), ui/scroll.js (scrollToBottom)

function renderGroupChat() {
    if (!curGroupId) return;
    const grp = groups.find(g => g.id === curGroupId);
    if (!grp) return;
    
    const container = document.getElementById('grp-chat-container');
    if (!container) return;
    
    const history = grp.history || [];
    
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
            const responder = bots.find(b => b.id === msg.responderId);
            const responderName = responder ? responder.name : 'Unknown';
            const responderAvatar = responder ? responder.avatar : null;
            const grpIllustUrl = msg.grpIllustUrl === '__stored__' ? loadIllusUrl(msg.msgId) : msg.grpIllustUrl;
            
            return `
                <div class="chat-message bot-message">
                    <div class="bot-avatar" onclick="showBioPopup('${responder ? responder.id : ''}')">
                        ${responderAvatar ? `<img src="${responderAvatar}" alt="${escapeHTML(responderName)}">` : `<span>${escapeHTML(responderName.charAt(0))}</span>`}
                    </div>
                    <div class="message-content">
                        <div class="message-sender">${escapeHTML(responderName)}</div>
                        <div class="message-bubble bot-bubble">
                            ${formatBubbleContent(msg.content)}
                        </div>
                        ${grpIllustUrl ? `<img src="${grpIllustUrl}" class="message-illustration" alt="Illustration">` : ''}
                        <div class="message-time">${new Date(msg.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</div>
                    </div>
                </div>
            `;
        }
    }).join('');
    
    scrollToBottom();
}

function showGroupTypingIndicator() {
    const container = document.getElementById('grp-chat-container');
    if (!container) return;
    
    const indicator = document.createElement('div');
    indicator.className = 'typing-indicator';
    indicator.id = 'grp-typing-indicator';
    indicator.innerHTML = '<span></span><span></span><span></span>';
    
    container.appendChild(indicator);
    scrollToBottom();
}

function hideGroupTypingIndicator() {
    const indicator = document.getElementById('grp-typing-indicator');
    if (indicator) indicator.remove();
}

function updateGroupBackground() {
    if (!curGroupId) return;
    const grp = groups.find(g => g.id === curGroupId);
    if (!grp) return;
    
    const chatBg = document.getElementById('group-chat-bg');
    if (chatBg && grp.background) {
        chatBg.style.backgroundImage = `url('${grp.background}')`;
    }
}
