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
    if (!bot) return '';
    const baseStates = bot.states || [];
    
    // Auto-inject labor state based on cycleData
    const cd = bot.cycleData;
    const autoStates = [];
    if (cd && cd.laborStarted && !cd.birthVirtualDay) {
        autoStates.push('in_labor');
    }
    
    const allStateIds = [...new Set([...baseStates, ...autoStates])];
    if (allStateIds.length === 0) return '';
    
    const parts = ['[Current States]:'];
    allStateIds.forEach(state => {
        const stateDef = typeof ALL_STATES !== 'undefined' ? ALL_STATES.find(s => s.id === state) : null;
        if (stateDef) {
            parts.push(`- ${stateDef.icon} ${stateDef.label}: ${stateDef.desc}`);
        } else {
            parts.push(`- ${state}`);
        }
    });
    
    return parts.join('\n');
}
