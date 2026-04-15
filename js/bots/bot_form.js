// bot_form.js - Bot creation/editing form
// Depends on: core/utils.js (escapeHTML), core/storage.js (safeSetItem, safeGetItem), core/ui_helpers.js (showToast, autoResize, initAppTags, clearPersonalityTags), core/i18n.js (t)

function saveBot() {
    const name = document.getElementById('bot-name').value.trim();
    if (!name) { alert(t('needName')); return; }
    
    const gender = document.getElementById('bot-gender').value;
    const age = document.getElementById('bot-age').value.trim();
    const appearance = document.getElementById('bot-app').value.trim();
    const bio = document.getElementById('bot-bio').value.trim();
    const prompt = document.getElementById('bot-prompt').value.trim();
    const avatar = document.getElementById('bot-avatar').value.trim();
    const portraitUrl = document.getElementById('bot-portrait-url').value.trim();
    const personaId = document.getElementById('bot-persona-id').value;
    
    const traits = [];
    selectedTraits.forEach((m, name) => traits.push(name));
    const disadvantages = [];
    selectedDisadvantages.forEach((m, name) => disadvantages.push(name));
    
    const bot = {
        id: Date.now().toString(),
        name,
        gender,
        age,
        appearance,
        bio,
        prompt,
        avatar,
        portraitUrl,
        personaId,
        traits,
        disadvantages,
        history: [],
        currentStatus: null,
        cycleData: null,
        schedule: null,
        dynBio: null,
        grpDynBio: null,
        ageStartDay: Math.floor(Math.random() * 365),
        socialRelation: '',
        familyRelation: 'None',
        emotionalRelation: ''
    };
    
    bots.push(bot);
    saveFirstData(bot); // Save initial state for reset functionality
    saveBots();
    renderBotList();
    closeScreen('sc-create');
    showToast('✅ Character saved!', '#0a1a0a', '#22c55e');
    
    ['bot-name', 'bot-app', 'bot-bio', 'bot-prompt', 'bot-age', 'bot-avatar', 'bot-portrait-url'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.value = '';
    });
    document.getElementById('bot-gender').value = 'Female';
    document.getElementById('bot-persona-id').value = '';
    selectedTraits.clear();
    selectedDisadvantages.clear();
    renderTraitChips();
}

function renderBotList() {
    const container = document.getElementById('bot-list');
    if (!container) return;
    
    if (!bots.length) {
        container.innerHTML = '<div style="font-size:12px;color:var(--text-sub);font-style:italic">No characters yet. Create one!</div>';
        return;
    }
    
    container.innerHTML = bots.map(bot => makeBotCard(bot)).join('');
}

function deleteBot(id) {
    if (!confirm('Delete this character?')) return;
    bots = bots.filter(b => b.id !== id);
    saveBots();
    renderBotList();
    if (curId === id) {
        curId = null;
        closeChat();
    }
}
