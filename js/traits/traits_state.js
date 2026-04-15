// traits_state.js - Trait state management
// Depends on: traits/traits_data.js (ALL_TRAITS), bots/bot_storage.js (saveBots)

function setBotState(bot, stateId, active) {
    if (!bot.states) bot.states = [];
    if (active) {
        if (!bot.states.includes(stateId)) bot.states.push(stateId);
    } else {
        bot.states = bot.states.filter(s => s !== stateId);
    }
}

function hasBotState(bot, stateId) {
    return !!(bot.states && bot.states.includes(stateId));
}

function buildTraitContext(bot) {
    const parts = [];
    if (bot.traits && bot.traits.length) {
        parts.push(`[Personality Traits]: ${bot.traits.join(', ')}`);
    }
    if (bot.geneticTraits && bot.geneticTraits.length) {
        const traitDescs = bot.geneticTraits.map(d => {
            const t = ALL_TRAITS.find(tr => tr.name === d);
            return t ? `${t.name} (${t.desc})` : d;
        }).join(', ');
        parts.push(`[Physical Traits]: ${traitDescs}`);
    }
    return parts.join('\n');
}
