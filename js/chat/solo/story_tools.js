// chat/solo/story_tools.js - Story continuation tools for solo chat
// Depends on: api/groq.js (callLlama), core/ui_helpers.js (showToast, logError), core/i18n.js (t), core/constants.js (GROQ_GEN_MODEL)

const HINT_OPTIONS = [
    { label: '💬 Continue dialogue', action: 'dialogue' },
    { label: '🎬 Describe scene', action: 'scene' },
    { label: '🔍 Reveal thoughts', action: 'thoughts' },
    { label: '⏩ Skip time', action: 'timeskip' },
    { label: '🎭 Introduce twist', action: 'twist' },
];

function applyHintToInput(hint) {
    const input = document.getElementById('chat-input');
    if (input) {
        input.value = hint;
        input.focus();
    }
}

function renderHintOptions() {
    const container = document.getElementById('hint-options');
    if (!container) return;
    
    container.innerHTML = HINT_OPTIONS.map(h => `
        <button class="hint-option" onclick="applyHintToInput('${h.label}')">${h.label}</button>
    `).join('');
}

async function continueStory() {
    if (!curId) return;
    const bot = bots.find(b => b.id === curId);
    if (!bot) return;
    
    if (!getGroqKeys().length) {
        alert(t('needKey'));
        return;
    }
    
    try {
        const lastMsg = bot.history[bot.history.length - 1];
        const context = lastMsg ? lastMsg.content : 'Start the story';
        
        const result = await callLlama(
            `Continue the roleplay story. Character: ${bot.name} (${bot.gender}). Last message: "${context.substring(0, 300)}". Write the next line of dialogue or action from the character's perspective. Be in character, keep it brief (1-2 sentences).`,
            'Continue the story.'
        );
        
        const input = document.getElementById('chat-input');
        if (input) {
            input.value = result;
            input.focus();
        }
    } catch (e) {
        logError('continueStory failed', e.message);
    }
}

function showHints() {
    const panel = document.getElementById('hints-panel');
    if (!panel) return;
    
    panel.style.display = panel.style.display === 'flex' ? 'none' : 'flex';
    renderHintOptions();
}
