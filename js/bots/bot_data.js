// bot_data.js - Bot data management and context
// Depends on: core/utils.js (escapeHTML), core/storage.js (safeSetItem), core/time.js (timeStrToMinutes), core/constants.js (CULTURES)

function getCurrentAge(bot) {
    if (!bot.age) return '';
    const ageNum = parseInt(bot.age);
    if (isNaN(ageNum)) return bot.age;
    const virtualDay = getVirtualDay(bot);
    if (virtualDay === 0) return bot.age;
    const addedYears = Math.floor(virtualDay / 365);
    return (ageNum + addedYears).toString();
}

function getCharContext(bot) {
    const parts = [];
    parts.push(`[CHARACTER PROFILE]`);
    parts.push(`Name: ${bot.name}`);
    if (bot.gender) parts.push(`Gender: ${bot.gender}`);
    const age = getCurrentAge(bot);
    if (age) parts.push(`Age: ${age}`);
    if (bot.country) parts.push(`Origin: ${bot.country}`);
    if (bot.year) parts.push(`Year: ${bot.year}`);
    if (bot.career) parts.push(`Occupation: ${bot.career}`);
    if (bot.appearance) parts.push(`Appearance: ${bot.appearance}`);
    if (bot.bio) parts.push(`Background: ${bot.bio}`);
    if (bot.prompt) parts.push(`Personality: ${bot.prompt}`);
    
    if (bot.traits && bot.traits.length) {
        parts.push(`Traits: ${bot.traits.join(', ')}`);
    }
    if (bot.disadvantages && bot.disadvantages.length) {
        parts.push(`Disadvantages: ${bot.disadvantages.join(', ')}`);
    }
    
    return parts.join('\n');
}

function getCultureHintFromFields(ctx) {
    const hints = [];
    if (ctx.country) hints.push(ctx.country);
    if (ctx.year) hints.push(`year ${ctx.year}`);
    if (ctx.career) hints.push(ctx.career);
    return hints.join(', ');
}

function inferCultureHint(ctx) {
    const country = ctx.country || '';
    const year = ctx.year || '';
    
    for (const c of CULTURES) {
        if (country.toLowerCase().includes(c.toLowerCase()) || c.toLowerCase().includes(country.toLowerCase())) {
            return c;
        }
    }
    
    if (year) {
        const y = parseInt(year);
        if (y < 1900) return 'Historical';
        if (y > 2100) return 'Futuristic';
    }
    
    return '';
}
