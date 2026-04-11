// scroll.js - Scroll management
// Depends on: none

function scrollToBottom() {
    const container = document.getElementById('chat-container');
    if (container) {
        container.scrollTop = container.scrollHeight;
    }
}

function scrollToTop_chat() {
    const container = document.getElementById('chat-container');
    if (container) {
        container.scrollTop = 0;
    }
}

function initScrollBottomBtn() {
    const btn = document.getElementById('scroll-bottom-btn');
    const container = document.getElementById('chat-container');
    
    if (!btn || !container) return;
    
    container.addEventListener('scroll', () => {
        const isNearBottom = container.scrollHeight - container.scrollTop - container.clientHeight < 100;
        btn.style.display = isNearBottom ? 'none' : 'flex';
    });
    
    btn.onclick = scrollToBottom;
}
