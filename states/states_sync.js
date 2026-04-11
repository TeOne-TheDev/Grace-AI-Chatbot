// states_sync.js - State synchronization functions
// Depends on: states/states_data.js (ALL_STATES, MOOD_STATE_MAP, PREGNANCY_STATE_MAP, SYSTEM_STATE_MAP), bots/bot_storage.js (saveBots)

function syncMoodStates(bot) {
    if (!bot.states) bot.states = [];
    
    const currentMood = bot.states.find(s => MOOD_STATE_MAP[s]);
    if (!currentMood) return;
    
    const relatedMoods = MOOD_STATE_MAP[currentMood] || [];
    
    relatedMoods.forEach(mood => {
        if (!bot.states.includes(mood)) {
            bot.states.push(mood);
        }
    });
}

function syncPregnancyStates(bot) {
    if (!bot.states) bot.states = [];
    
    const currentPregnancyState = bot.states.find(s => PREGNANCY_STATE_MAP[s]);
    if (!currentPregnancyState) return;
    
    const relatedStates = PREGNANCY_STATE_MAP[currentPregnancyState] || [];
    
    relatedStates.forEach(state => {
        if (!bot.states.includes(state)) {
            bot.states.push(state);
        }
    });
    
    if (currentPregnancyState === 'in_labor') {
        if (!bot.states.includes('afraid')) bot.states.push('afraid');
        if (!bot.states.includes('tired')) bot.states.push('tired');
    }
}

function syncSystemStates(bot) {
    if (!bot.states) bot.states = [];
    
    const currentSystemState = bot.states.find(s => SYSTEM_STATE_MAP[s]);
    if (!currentSystemState) return;
    
    const relatedStates = SYSTEM_STATE_MAP[currentSystemState] || [];
    
    relatedStates.forEach(state => {
        if (!bot.states.includes(state)) {
            bot.states.push(state);
        }
    });
}

function rollRandomStates(bot, count = 3) {
    if (!bot.states) bot.states = [];
    
    const available = ALL_STATES.filter(s => !bot.states.includes(s));
    const shuffled = available.sort(() => Math.random() - 0.5);
    
    for (let i = 0; i < count && i < shuffled.length; i++) {
        bot.states.push(shuffled[i]);
    }
    
    syncMoodStates(bot);
    syncPregnancyStates(bot);
    syncSystemStates(bot);
    
    saveBots();
}

function getStatesContext(bot) {
    if (!bot.states || bot.states.length === 0) return '';
    
    const parts = ['[Current States]:'];
    bot.states.forEach(state => {
        parts.push(`- ${state}`);
    });
    
    return parts.join('\n');
}
